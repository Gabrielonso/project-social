export enum JobType {
  FUND_BETTING = 'fund-betting',
  UTILITY_PURCHASE = 'utility-purchase',
  SEND_PUSH_NOTIFICATION = 'send-push-notification',
  SEND_EMAIL = 'send-email',
  SEND_EMAIL_ZEPTO = 'send-email-zepto',
  PURCHASE_MTN = 'purchase-mtn',
  DISTRIBUTE_EVENT_TICKET = 'distribute-event-ticket',
  CREATE_INTERCOM_CONTACT = 'create-intercom-contact',
  PURCHASE_PRODUCT = 'purchase-product',
}

export enum JobQueue {
  NOTIFICATIONS = 'notifications',
  WALLETS = 'wallets',
  BILLS_AND_SERVICES = 'bills-and-services',
  EMAILS = 'emails',
  TRANSACTIONS = 'transactions',
  EVENT_TICKET = 'event-ticket',
  INTERCOM = 'intercom',
  PRODUCTS = 'products',
}

export interface SendEmailJob {
  to: string;
  subject: string;
  body?: string;
  html?: string;
}

export interface SendPushJob {
  userId: string;
  title: string;
  body: string;
}
