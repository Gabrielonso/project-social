import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CallSession } from '../entities/call-session.entity';
import { CallSessionStatus } from '../enums/call-session-status.enum';
import { ChatMessage } from 'src/modules/chats/entities/chat-message.entity';
import { MessageKind } from 'src/modules/chats/enums/message-kind.enum';
import { Chat } from 'src/modules/chats/entities/chat.entity';
import { MessageReceipt } from 'src/modules/chats/entities/message-receipt.entity';

@Injectable()
export class CallLogService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CallSession)
    private readonly callSessionRepo: Repository<CallSession>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepo: Repository<ChatMessage>,
  ) {}

  async finalize(session: CallSession): Promise<ChatMessage | null> {
    if (session.finalizedAt && session.chatMessageId) {
      return this.chatMessageRepo.findOne({
        where: { id: session.chatMessageId },
      });
    }

    return this.dataSource.transaction(async (manager) => {
      const callSessionRepo = manager.getRepository(CallSession);
      const chatMessageRepo = manager.getRepository(ChatMessage);
      const chatRepo = manager.getRepository(Chat);
      const messageReceiptRepo = manager.getRepository(MessageReceipt);

      const locked = await callSessionRepo.findOne({
        where: { id: session.id },
      });
      if (!locked) return null;
      if (locked.finalizedAt && locked.chatMessageId) {
        return chatMessageRepo.findOne({ where: { id: locked.chatMessageId } });
      }

      locked.endedAt = locked.endedAt ?? new Date();
      await callSessionRepo.save(locked);

      const message = chatMessageRepo.create({
        chatId: locked.chatId,
        senderId: locked.callerId,
        text: null,
        kind: MessageKind.CALL,
        metadata: {
          callSessionId: locked.id,
          callUuid: locked.callUuid,
          type: locked.type,
          status: locked.status,
          durationSeconds: locked.durationSeconds,
          durationFinal: locked.durationFinal,
          callerId: locked.callerId,
          calleeId: locked.calleeId,
        },
      });
      await chatMessageRepo.save(message);

      await messageReceiptRepo.save([
        messageReceiptRepo.create({
          messageId: message.id,
          userId: locked.callerId,
          delivered: true,
          deliveredAt: new Date(),
        }),
        messageReceiptRepo.create({
          messageId: message.id,
          userId: locked.calleeId,
          delivered: true,
          deliveredAt: new Date(),
        }),
      ]);

      await chatRepo.update(
        { id: locked.chatId },
        { lastMessageId: message.id },
      );

      locked.chatMessageId = message.id;
      locked.finalizedAt = new Date();
      await callSessionRepo.save(locked);

      return message;
    });
  }

  async patchDuration(sessionId: string): Promise<{
    session: CallSession;
    message: ChatMessage;
  } | null> {
    const session = await this.callSessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session || session.status !== CallSessionStatus.COMPLETED) {
      return null;
    }
    if (!session.chatMessageId) {
      return null;
    }

    const mediaDuration = this.computeMediaDuration(session);
    session.mediaDurationSeconds = mediaDuration;
    if (mediaDuration !== null) {
      session.durationSeconds = mediaDuration;
    }
    session.durationFinal = true;
    await this.callSessionRepo.save(session);

    const message = await this.chatMessageRepo.findOne({
      where: { id: session.chatMessageId },
    });
    if (!message) return null;

    message.metadata = {
      ...message.metadata,
      durationSeconds: session.durationSeconds,
      durationFinal: true,
    };
    await this.chatMessageRepo.save(message);

    return { session, message };
  }

  recordParticipantJoined(session: CallSession, userId: string): CallSession {
    const now = new Date();
    if (userId === session.callerId && !session.callerJoinedAt) {
      session.callerJoinedAt = now;
    }
    if (userId === session.calleeId && !session.calleeJoinedAt) {
      session.calleeJoinedAt = now;
    }
    return session;
  }

  recordParticipantLeft(session: CallSession, userId: string): CallSession {
    const now = new Date();
    if (userId === session.callerId) {
      session.callerLeftAt = now;
    }
    if (userId === session.calleeId) {
      session.calleeLeftAt = now;
    }
    return session;
  }

  private computeMediaDuration(session: CallSession): number | null {
    const joinTimes = [session.callerJoinedAt, session.calleeJoinedAt]
      .filter(Boolean)
      .map((d) => (d as Date).getTime());
    const leftTimes = [session.callerLeftAt, session.calleeLeftAt]
      .filter(Boolean)
      .map((d) => (d as Date).getTime());

    if (!joinTimes.length) {
      return 0;
    }

    const started = Math.min(...joinTimes);
    const ended =
      leftTimes.length > 0
        ? Math.max(...leftTimes)
        : session.signalingEndedAt?.getTime() ?? Date.now();

    return Math.max(0, Math.floor((ended - started) / 1000));
  }
}
