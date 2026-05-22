export enum JobType {
  SEND_PUSH_NOTIFICATION = 'send-push-notification',
  SEND_PUSH_NOTIFICATION_BATCH = 'send-push-notification-batch',
  SEND_EMAIL = 'send-email',
  SEND_EMAIL_ZEPTO = 'send-email-zepto',
}

export enum JobQueue {
  NOTIFICATIONS = 'notifications',
  WALLETS = 'wallets',
  EMAILS = 'emails',
  TRANSACTIONS = 'transactions',
}

export interface SendEmailJob {
  to: string;
  subject: string;
  body?: string;
  html?: string;
}

export type PushNotificationData = Record<string, string>;

export interface SendPushJob {
  userId: string;
  title: string;
  body: string;
  data?: PushNotificationData;
}

export interface SendPushBatchJob {
  userIds: string[];
  title: string;
  body: string;
  data?: PushNotificationData;
}
