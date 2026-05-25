import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WsGateway } from 'src/realtime/gateway/ws.gateway';
import { PresenceService } from 'src/realtime/services/presence.service';
import { UserDisplayService } from 'src/modules/user/user-display.service';
import { ChatsService } from 'src/modules/chats/chats.service';
import { User } from 'src/modules/user/entity/user.entity';
import { Block } from 'src/modules/engagements/entities/block.entity';
import { InitiateCallDto } from '../dto/initiate-call.dto';
import { AcceptCallDto } from '../dto/accept-call.dto';
import { EndCallDto } from '../dto/end-call.dto';
import { CallSessionService } from './call-session.service';
import { LiveKitService } from './livekit.service';
import { CallLogService } from './call-log.service';
import { CallSessionStatus } from '../enums/call-session-status.enum';
import { CallRejectReason } from '../enums/call-reject-reason.enum';
import { CallSession } from '../entities/call-session.entity';
import { OneSignalService } from 'src/modules/notification/onesignal.service';
import { ChatMessage } from 'src/modules/chats/entities/chat-message.entity';

const RING_TIMEOUT_MS = 60_000;

@Injectable()
export class CallService {
  private readonly logger = new Logger(CallService.name);
  private readonly ringTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    @Inject(forwardRef(() => WsGateway))
    private readonly wsGateway: WsGateway,
    private readonly presenceService: PresenceService,
    private readonly userDisplayService: UserDisplayService,
    @Inject(forwardRef(() => ChatsService))
    private readonly chatsService: ChatsService,
    private readonly callSessionService: CallSessionService,
    private readonly liveKitService: LiveKitService,
    private readonly callLogService: CallLogService,
    private readonly oneSignalService: OneSignalService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Block)
    private readonly blockRepo: Repository<Block>,
    @InjectRepository(CallSession)
    private readonly callSessionRepo: Repository<CallSession>,
  ) {}

  async initiate(callerId: string, payload: InitiateCallDto): Promise<void> {
    const { calleeId, uuid, roomName, type } = payload;

    if (callerId === calleeId) {
      this.rejectToCaller(callerId, CallRejectReason.INVALID_TARGET);
      return;
    }

    const callee = await this.userRepo.findOne({
      where: { id: calleeId },
      select: ['id'],
    });
    if (!callee) {
      this.rejectToCaller(callerId, CallRejectReason.CALLEE_UNAVAILABLE);
      return;
    }

    if (await this.isBlocked(callerId, calleeId)) {
      this.rejectToCaller(callerId, CallRejectReason.BLOCKED);
      return;
    }

    if (await this.callSessionService.getUserActiveCallUuid(callerId)) {
      this.rejectToCaller(callerId, CallRejectReason.CALLER_BUSY);
      return;
    }

    if (await this.callSessionService.getUserActiveCallUuid(calleeId)) {
      this.rejectToCaller(callerId, CallRejectReason.CALLEE_BUSY);
      return;
    }

    const chat = await this.chatsService.getOrCreateOneToOneChat(
      callerId,
      calleeId,
    );

    const session = this.callSessionRepo.create({
      callUuid: uuid,
      chatId: chat.id,
      callerId,
      calleeId,
      roomName,
      type,
      status: CallSessionStatus.RINGING,
      initiatedAt: new Date(),
      durationSeconds: 0,
      durationFinal: false,
    });
    await this.callSessionRepo.save(session);

    await this.callSessionService.setActiveCall(
      uuid,
      callerId,
      calleeId,
      roomName,
      type,
      CallSessionStatus.RINGING,
    );

    const displayMap = await this.userDisplayService.getByIds([callerId]);
    const callerUsername = displayMap.get(callerId)?.username ?? 'Unknown';

    const calleeStatus = await this.presenceService.getStatus(calleeId);
    const incomingPayload = {
      uuid,
      callerId,
      callerUsername,
      type,
      roomName,
    };

    if (await this.presenceService.isReachableViaSocket(calleeId)) {
      this.wsGateway.emitToUser(calleeId, 'call.incoming', incomingPayload);
    } else {
      await this.sendOfflineIncomingCallPush({
        calleeId,
        callerId,
        callerUsername,
        uuid,
        roomName,
        type,
      });
    }

    this.scheduleRingTimeout(uuid);
  }

  async accept(calleeId: string, payload: AcceptCallDto): Promise<void> {
    const session = await this.findRingingSession(
      payload.uuid,
      payload.roomName,
    );
    if (!session || session.calleeId !== calleeId) {
      return;
    }

    this.clearRingTimeout(payload.uuid);

    session.status = CallSessionStatus.CONNECTED;
    session.answeredAt = new Date();
    await this.callSessionRepo.save(session);
    await this.callSessionService.updateStatus(
      payload.uuid,
      CallSessionStatus.CONNECTED,
    );

    const displayMap = await this.userDisplayService.getByIds([
      session.callerId,
      session.calleeId,
    ]);

    const callerToken = await this.liveKitService.createParticipantToken(
      session.callerId,
      displayMap.get(session.callerId)?.username,
      session.roomName,
    );
    const calleeToken = await this.liveKitService.createParticipantToken(
      session.calleeId,
      displayMap.get(session.calleeId)?.username,
      session.roomName,
    );

    this.wsGateway.emitToUser(session.callerId, 'call.accepted', {
      livekitToken: callerToken,
    });
    this.wsGateway.emitToUser(session.calleeId, 'call.accepted', {
      livekitToken: calleeToken,
    });
  }

  async reject(calleeId: string, uuid: string): Promise<void> {
    const session = await this.findRingingSession(uuid);
    if (!session || session.calleeId !== calleeId) {
      return;
    }

    this.clearRingTimeout(uuid);
    await this.finalizeSignalingOnly(session, CallSessionStatus.REJECTED);
    this.wsGateway.emitToUser(session.callerId, 'call.rejected', {
      reason: CallRejectReason.DECLINED,
    });
  }

  async end(userId: string, payload: EndCallDto): Promise<void> {
    const session =
      (await this.findSessionByUuid(payload.uuid)) ??
      (payload.roomName
        ? await this.findSessionByRoom(payload.roomName)
        : null);

    if (!session) {
      return;
    }

    if (session.callerId !== userId && session.calleeId !== userId) {
      return;
    }

    this.clearRingTimeout(session.callUuid);

    const otherUserId =
      session.callerId === userId ? session.calleeId : session.callerId;

    if (session.status === CallSessionStatus.RINGING) {
      const terminalStatus =
        session.callerId === userId
          ? CallSessionStatus.CANCELLED
          : CallSessionStatus.REJECTED;
      await this.finalizeSignalingOnly(session, terminalStatus);
      const reason =
        session.callerId === userId
          ? CallRejectReason.CANCELLED
          : CallRejectReason.DECLINED;
      this.wsGateway.emitToUser(otherUserId, 'call.rejected', { reason });
      return;
    }

    if (session.status === CallSessionStatus.CONNECTED) {
      session.signalingEndedAt = new Date();
      session.status = CallSessionStatus.COMPLETED;
      session.durationSeconds = this.computeSignalingDuration(session);
      session.durationFinal = false;
      await this.callSessionRepo.save(session);
      await this.callSessionService.clearActiveCall(session.callUuid);

      const message = await this.callLogService.finalize(session);
      if (message) {
        await this.emitCallLogMessage(session, message);
      }

      this.wsGateway.emitToUser(otherUserId, 'call.ended', {
        uuid: session.callUuid,
        roomName: session.roomName,
      });
    }
  }

  async handleMissedCall(uuid: string): Promise<void> {
    const session = await this.findRingingSession(uuid);
    if (!session) {
      return;
    }

    await this.finalizeSignalingOnly(session, CallSessionStatus.MISSED);
    this.wsGateway.emitToUser(session.callerId, 'call.rejected', {
      reason: CallRejectReason.MISSED,
    });
  }

  /** Emit pending incoming calls when callee reconnects. */
  async onUserConnected(userId: string): Promise<void> {
    const sessions = await this.callSessionRepo.find({
      where: { calleeId: userId, status: CallSessionStatus.RINGING },
      order: { initiatedAt: 'DESC' },
      take: 3,
    });

    for (const session of sessions) {
      const displayMap = await this.userDisplayService.getByIds([
        session.callerId,
      ]);
      this.wsGateway.emitToUser(userId, 'call.incoming', {
        uuid: session.callUuid,
        callerId: session.callerId,
        callerUsername: displayMap.get(session.callerId)?.username ?? 'Unknown',
        type: session.type,
        roomName: session.roomName,
      });
    }
  }

  async emitCallLogUpdated(
    session: CallSession,
    message: ChatMessage,
  ): Promise<void> {
    const payload = await this.buildCallMessagePayload(session, message);
    this.wsGateway.emitToUser(
      session.callerId,
      'chat.call_log_updated',
      payload,
    );
    this.wsGateway.emitToUser(
      session.calleeId,
      'chat.call_log_updated',
      payload,
    );
    this.wsGateway.emitToRoom(
      `chat:${session.chatId}`,
      'chat.call_log_updated',
      payload,
    );
  }

  private async finalizeSignalingOnly(
    session: CallSession,
    status: CallSessionStatus,
  ): Promise<void> {
    session.status = status;
    session.signalingEndedAt = new Date();
    session.endedAt = new Date();
    session.durationSeconds = 0;
    session.durationFinal = true;
    await this.callSessionRepo.save(session);
    await this.callSessionService.clearActiveCall(session.callUuid);

    const message = await this.callLogService.finalize(session);
    if (message) {
      await this.emitCallLogMessage(session, message);
    }
  }

  private async emitCallLogMessage(
    session: CallSession,
    message: ChatMessage,
  ): Promise<void> {
    const payload = await this.buildCallMessagePayload(session, message);
    this.wsGateway.emitToUser(session.callerId, 'chat.new_message', payload);
    this.wsGateway.emitToUser(session.calleeId, 'chat.new_message', payload);
    this.wsGateway.emitToRoom(
      `chat:${session.chatId}`,
      'chat.new_message',
      payload,
    );
  }

  private async buildCallMessagePayload(
    session: CallSession,
    message: ChatMessage,
  ) {
    const displayMap = await this.userDisplayService.getByIds([
      session.callerId,
      session.calleeId,
    ]);

    return {
      success: true,
      data: {
        ...message,
        participants: {
          caller: {
            id: session.callerId,
            username: displayMap.get(session.callerId)?.username ?? null,
            profilePicture:
              displayMap.get(session.callerId)?.profilePicture ?? null,
          },
          callee: {
            id: session.calleeId,
            username: displayMap.get(session.calleeId)?.username ?? null,
            profilePicture:
              displayMap.get(session.calleeId)?.profilePicture ?? null,
          },
        },
      },
    };
  }

  private async sendOfflineIncomingCallPush(params: {
    calleeId: string;
    callerId: string;
    callerUsername: string;
    uuid: string;
    roomName: string;
    type: string;
  }): Promise<void> {
    await this.oneSignalService.sendPush({
      userId: params.calleeId,
      title: 'Incoming call',
      body: `${params.callerUsername} is calling you`,
      data: {
        type: 'incoming_call',
        callUuid: params.uuid,
        roomName: params.roomName,
        callerId: params.callerId,
        callerUsername: params.callerUsername,
        callType: params.type,
      },
    });
  }

  private computeSignalingDuration(session: CallSession): number {
    if (!session.answeredAt || !session.signalingEndedAt) {
      return 0;
    }
    return Math.max(
      0,
      Math.floor(
        (session.signalingEndedAt.getTime() - session.answeredAt.getTime()) /
          1000,
      ),
    );
  }

  private async findRingingSession(
    uuid: string,
    roomName?: string,
  ): Promise<CallSession | null> {
    const session = await this.findSessionByUuid(uuid);
    if (!session || session.status !== CallSessionStatus.RINGING) {
      return null;
    }
    if (roomName && session.roomName !== roomName) {
      return null;
    }
    return session;
  }

  private findSessionByUuid(uuid: string): Promise<CallSession | null> {
    return this.callSessionRepo.findOne({ where: { callUuid: uuid } });
  }

  private findSessionByRoom(roomName: string): Promise<CallSession | null> {
    return this.callSessionRepo.findOne({ where: { roomName } });
  }

  findSessionByRoomName(roomName: string): Promise<CallSession | null> {
    return this.findSessionByRoom(roomName);
  }

  private async isBlocked(userA: string, userB: string): Promise<boolean> {
    const block = await this.blockRepo.findOne({
      where: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    });
    return !!block;
  }

  private rejectToCaller(callerId: string, reason: CallRejectReason): void {
    this.wsGateway.emitToUser(callerId, 'call.rejected', { reason });
  }

  private scheduleRingTimeout(uuid: string): void {
    this.clearRingTimeout(uuid);
    const timeout = setTimeout(() => {
      void this.handleMissedCall(uuid).catch((error) => {
        this.logger.error(`Ring timeout failed for ${uuid}`, error);
      });
    }, RING_TIMEOUT_MS);
    this.ringTimeouts.set(uuid, timeout);
  }

  private clearRingTimeout(uuid: string): void {
    const timeout = this.ringTimeouts.get(uuid);
    if (timeout) {
      clearTimeout(timeout);
      this.ringTimeouts.delete(uuid);
    }
  }
}
