import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { REDIS_CLIENT } from 'src/common/redis/redis.constants';
import { FeedType } from 'src/modules/feeds/enums/feed-type.enum';
import { TagType } from 'src/modules/engagements/enums/tag-type.enum';
import { User } from '../user/entity/user.entity';
import { NotificationService } from './notification.service';
import { NotificationTemplates } from './notification.templates';
import {
  DispatchNotificationContext,
  DispatchNotificationParams,
  NotificationEventType,
  NotificationMetadata,
} from './interfaces/notification-event.types';

const DEDUPE_TTL_SECONDS = 60;

@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);

  constructor(
    private readonly notificationService: NotificationService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async notify(params: DispatchNotificationParams): Promise<void> {
    const { event, recipientId, actorId, context = {} } = params;

    if (!recipientId) return;
    if (actorId && recipientId === actorId) return;

    const user = await this.userRepo.findOne({
      where: { id: recipientId },
      select: ['id', 'notificationEnabled'],
    });
    if (!user) return;

    const metadata = this.buildMetadata(event, actorId, context);
    const dedupeKey = this.buildDedupeKey(recipientId, event, metadata);
    if (dedupeKey && (await this.isDuplicate(dedupeKey))) {
      return;
    }

    const { title, body } = this.resolveTemplate(event, context);
    const sendPush = user.notificationEnabled !== false;

    await this.notificationService.notifyUser({
      userId: recipientId,
      title,
      body,
      type: event,
      metadata,
      sendPush,
    });

    if (dedupeKey) {
      await this.redis.set(dedupeKey, '1', 'EX', DEDUPE_TTL_SECONDS);
    }
  }

  private resolveTemplate(
    event: NotificationEventType,
    context: DispatchNotificationContext,
  ): { title: string; body: string } {
    const username = context.actorUsername;
    switch (event) {
      case NotificationEventType.FOLLOW:
        return NotificationTemplates.followed({ followerUsername: username });
      case NotificationEventType.POST_LIKED:
        return NotificationTemplates.postLiked({ likerUsername: username });
      case NotificationEventType.POST_COMMENTED:
        return NotificationTemplates.postCommented({
          commenterUsername: username,
        });
      case NotificationEventType.COMMENT_REPLY:
        return NotificationTemplates.commentReply({ replierUsername: username });
      case NotificationEventType.POST_TAG:
        return NotificationTemplates.taggedInPost({ taggerUsername: username });
      case NotificationEventType.POST_MENTION:
        return NotificationTemplates.mentionedInPost({
          taggerUsername: username,
        });
      case NotificationEventType.AD_LIKED:
        return NotificationTemplates.adLiked({ likerUsername: username });
      case NotificationEventType.AD_COMMENTED:
        return NotificationTemplates.adCommented({
          commenterUsername: username,
        });
      case NotificationEventType.CHAT_MESSAGE:
        return NotificationTemplates.chatMessage({
          senderUsername: username,
          messagePreview: context.messagePreview,
        });
      case NotificationEventType.INCOMING_CALL:
        return NotificationTemplates.incomingCall({
          callerUsername: username,
          callType: context.messagePreview,
        });
      default:
        return { title: 'Notification', body: 'You have a new notification' };
    }
  }

  private buildMetadata(
    event: NotificationEventType,
    actorId: string | undefined,
    context: DispatchNotificationContext,
  ): NotificationMetadata {
    const metadata: NotificationMetadata = {};
    if (actorId) metadata.actorId = actorId;
    if (context.entity) metadata.entity = context.entity;
    if (context.entityId) metadata.entityId = context.entityId;
    if (context.chatId) metadata.chatId = context.chatId;
    if (context.messageId) metadata.messageId = context.messageId;
    if (context.commentId) metadata.commentId = context.commentId;
    return metadata;
  }

  private buildDedupeKey(
    recipientId: string,
    event: NotificationEventType,
    metadata: NotificationMetadata,
  ): string | null {
    const entityId =
      metadata.entityId || metadata.chatId || metadata.commentId;
    if (!entityId) return null;
    return `notify:dedupe:${recipientId}:${event}:${entityId}`;
  }

  private async isDuplicate(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.warn(`Dedupe check failed for ${key}`, error);
      return false;
    }
  }

  eventForFeedLike(entity: FeedType): NotificationEventType | null {
    if (entity === FeedType.POST) return NotificationEventType.POST_LIKED;
    if (entity === FeedType.AD) return NotificationEventType.AD_LIKED;
    return null;
  }

  eventForFeedComment(entity: FeedType): NotificationEventType | null {
    if (entity === FeedType.POST) return NotificationEventType.POST_COMMENTED;
    if (entity === FeedType.AD) return NotificationEventType.AD_COMMENTED;
    return null;
  }

  eventForTagType(tagType: TagType): NotificationEventType {
    return tagType === TagType.MENTION
      ? NotificationEventType.POST_MENTION
      : NotificationEventType.POST_TAG;
  }
}
