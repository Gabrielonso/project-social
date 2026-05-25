import { FeedType } from 'src/modules/feeds/enums/feed-type.enum';
import { TagType } from 'src/modules/engagements/enums/tag-type.enum';

export enum NotificationEventType {
  FOLLOW = 'follow',
  POST_LIKED = 'post_liked',
  POST_COMMENTED = 'post_commented',
  COMMENT_REPLY = 'comment_reply',
  POST_TAG = 'post_tag',
  POST_MENTION = 'post_mention',
  CHAT_MESSAGE = 'chat_message',
  INCOMING_CALL = 'incoming_call',
  AD_LIKED = 'ad_liked',
  AD_COMMENTED = 'ad_commented',
}

export type NotificationMetadata = {
  actorId?: string;
  entity?: FeedType | string;
  entityId?: string;
  chatId?: string;
  messageId?: string;
  commentId?: string;
};

export type DispatchNotificationContext = {
  actorUsername?: string;
  entity?: FeedType;
  entityId?: string;
  chatId?: string;
  messageId?: string;
  commentId?: string;
  messagePreview?: string;
  tagType?: TagType;
};

export interface DispatchNotificationParams {
  event: NotificationEventType;
  recipientId: string;
  actorId?: string;
  context?: DispatchNotificationContext;
}

export type NotifyUserParams = {
  userId: string;
  title: string;
  body: string;
  type?: NotificationEventType;
  metadata?: NotificationMetadata;
  sendPush?: boolean;
};
