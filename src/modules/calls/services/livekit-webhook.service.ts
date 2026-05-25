import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { WebhookReceiver } from 'livekit-server-sdk';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { REDIS_CLIENT } from 'src/common/redis/redis.constants';
import { CallSession } from '../entities/call-session.entity';
import { CallSessionStatus } from '../enums/call-session-status.enum';
import { CallLogService } from './call-log.service';
import { CallService } from './call.service';
import { ChatMessage } from 'src/modules/chats/entities/chat-message.entity';

@Injectable()
export class LiveKitWebhookService {
  private readonly logger = new Logger(LiveKitWebhookService.name);
  private readonly webhookDedupeTtlSeconds = 86_400;

  constructor(
    private readonly configService: ConfigService,
    private readonly callLogService: CallLogService,
    private readonly callService: CallService,
    @InjectRepository(CallSession)
    private readonly callSessionRepo: Repository<CallSession>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepo: Repository<ChatMessage>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private createReceiver(): WebhookReceiver {
    const apiKey = this.configService.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET');
    if (!apiKey || !apiSecret) {
      throw new Error('LiveKit webhook credentials are not configured');
    }
    return new WebhookReceiver(apiKey, apiSecret);
  }

  async handleWebhook(rawBody: string, authHeader?: string): Promise<void> {
    const receiver = this.createReceiver();
    const event = await receiver.receive(rawBody, authHeader);

    if (event.id && (await this.isDuplicateWebhook(event.id))) {
      return;
    }

    const roomName = event.room?.name;
    if (!roomName) {
      return;
    }

    const session = await this.callSessionRepo.findOne({
      where: { roomName },
    });
    if (!session) {
      return;
    }

    switch (event.event) {
      case 'participant_joined': {
        const identity = event.participant?.identity;
        if (!identity) break;
        const updated = this.callLogService.recordParticipantJoined(
          session,
          identity,
        );
        await this.callSessionRepo.save(updated);
        break;
      }
      case 'participant_left': {
        const identity = event.participant?.identity;
        if (!identity) break;
        const updated = this.callLogService.recordParticipantLeft(
          session,
          identity,
        );
        await this.callSessionRepo.save(updated);
        break;
      }
      case 'room_finished': {
        await this.callLogService.patchDuration(session.id);
        const refreshed = await this.callSessionRepo.findOne({
          where: { id: session.id },
        });
        if (!refreshed?.chatMessageId) break;
        const message = await this.chatMessageRepo.findOne({
          where: { id: refreshed.chatMessageId },
        });
        if (message) {
          await this.callService.emitCallLogUpdated(refreshed, message);
        }
        break;
      }
      default:
        break;
    }
  }

  private async isDuplicateWebhook(eventId: string): Promise<boolean> {
    const key = `livekit:webhook:${eventId}`;
    const result = await this.redis.set(
      key,
      '1',
      'EX',
      this.webhookDedupeTtlSeconds,
      'NX',
    );
    return result === null;
  }
}
