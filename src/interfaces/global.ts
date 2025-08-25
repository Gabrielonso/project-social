import { HttpStatus } from '@nestjs/common';

export interface ILocalProcessEnv {
  DB_PORT: number;
  DB_HOST: string;
  DB_NAME: string;
  DB_PASSWORD: string;
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_PASSWORD?: string;
  REDIS_REJECT_UNAUTHORIZED?: string;
  REDIS_USERNAME?: string;
}

export interface BatchReturn {
  errors?: string[];
  message?: string[];
}

export interface BatchInfo {
  batchStart: number;
  batchSize: number;
}

export enum QueueStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export interface TransactionAlertData {
  senderName: string;
  amount: string | number;
  recipientName: string;
  id: number | string;
  balance: number | string;
  walletId?: number | string;
  businessName?: number | string;
}

export enum CountryCode {
  NIGERIA = '234',
  KENYA = '254',
  ZIMBABWE = '263',
  GHANA = '233',
}

export enum WalletOwnerTypes {
  BUSINESS = 'BUSINESS',
  AFFILIATE = 'AFFILIATE',
}

export type SortOrder = 'ASC' | 'DESC';

export interface PAYSTACK_EVENT_DATA {
  event:
    | 'charge.success'
    | 'transfer.success'
    | 'transfer.failed'
    | 'transfer.reversed'
    | 'charge.dispute.create'
    | 'charge.dispute.remind'
    | 'charge.dispute.resolve'
    | 'customeridentification.failed'
    | 'customeridentification.success'
    | 'paymentrequest.pending'
    | 'paymentrequest.success'
    | 'subscription.create'
    | 'subscription.disable'
    | 'subscription.expiring_cards'
    | 'subscription.not_renew';
  data: {
    id: number;
    domain?: string;
    status: string;
    reference: string;
    amount: number;
    message: string;
    gateway_response: string;
    transfer_code: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: number;
    log?: {
      time_spent: number;
      attempts: number;
      authentication: string;
      errors: number;
      success: boolean;
      mobile: boolean;
      input: Array<any>;
      channel: string;
      history: Array<{
        type: string;
        message: string;
        time: number;
      }>;
    };
    fees?: number;
    customer?: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
      metadata: any;
      risk_action: string;
    };
    authorization?: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      account_name: string;
      channel?: string;
      receiver_bank_account_number?: string;
      sender_bank_account_number?: string;
      sender_name?: string;
      narration?: string;
      sender_bank?: string;
    };
  };
}

export interface SaveHavenEventData {
  type: 'transfer' | 'transaction' | 'fund' | 'reversal';
  data: {
    _id: string;
    client: string;
    account: string;
    type: string;
    sessionId: string;
    nameEnquiryReference: string;
    paymentReference: string;
    mandateReference: null;
    isReversed: boolean;
    reversalReference: null;
    provider: string;
    providerChannel: string;
    providerChannelCode: string;
    destinationInstitutionCode: string;
    creditAccountName: string;
    creditAccountNumber: string;
    creditBankVerificationNumber: null;
    creditKYCLevel: string;
    debitAccountName: string;
    debitAccountNumber: string;
    debitBankVerificationNumber: null;
    debitKYCLevel: string;
    transactionLocation: string;
    narration: string;
    amount: number;
    fees: number;
    vat: number;
    stampDuty: number;
    responseCode: string;
    responseMessage: string;
    status: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    __v: number;
    approvedAt: string;
  };
}

export interface WalletFeesResponse {
  paymentGatewayFee: number;
  totalFee: number;
  platformFee: number;
}

export enum TransactionGateWayProvider {
  SAFE_HAVEN = 'safeHaven',
  PAYSTACK = 'paystack',
  RELOADLY = 'reloadly',
  CORAL_PAY = 'coralPay',
  SUREST_PAY = 'surestPay',
  MONNIFY = 'monnify',
}

export enum PaymentGateWayProvider {
  PAYSTACK = 'paystack',
  SAFE_HAVEN = 'safeHaven',
  FLUTTER_WAVE = 'flutterWave',
  STRIPE = 'stripe',
  MONNIFY = 'monnify',
}

export enum GatewayProvider {
  STRIPE = 'stripe',
  PAYSTACK = 'paystack',
  SAFE_HAVEN = 'safeHaven',
  FlutterWave = 'flutterWave',
  MONNIFY = 'monnify',
}

export type TransactionDirectionTypes = 'credit' | 'debit';

export enum Interval {
  DAILY = 'daily',
  THREE_DAYS = '3days',
  WEEKLY = 'weekly',
  BI_WEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

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

export enum PeriodicIntervals {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum ServiceTypes {
  AIRTIME = 'AIRTIME',
  DATA = 'DATA',
  ELECTRICITY = 'ELECTRICITY',
  CABLE = 'CABLE',
  GIFT_CARD = 'GIFT_CARD',
  BETTING_AND_LOTTERY = 'BETTING_AND_LOTTERY',
  EVENT_TICKET = 'EVENT_TICKET',
}

export enum DaysOfTheWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export enum Months {
  JANUARY = 'JANUARY',
  FEBUARY = 'FEBUARY',
  MARCH = 'MARCH',
  APRIL = 'APRIL',
  MAY = 'MAY',
  JUNE = 'JUNE',
  JULY = 'JULY',
  AUGUST = 'AUGUST',
  SEPTEMBER = 'SEPTEMBER',
  OCTOBER = 'OCTOBER',
  NOVEMBER = 'NOVEMBER',
  DECEMBER = 'DECEMBER',
}
export enum ServiceProviders {
  MTN = 'MTN',
  GLO = 'GLO',
  AIRTIME = 'AIRTEL',
  '9MOBILE' = '9MOBILE',
  ETISALAT = 'ETISALAT',
  SMILE = 'SMILE',
  IPNX = 'IPNX',
  SWIFT = 'SWIFT',
  BET9JA = 'BET9JA',
  ZOOMLIFESTYLE = 'ZOOMLIFESTYLE',
  MLOTTO = 'MLOTTO',
  WESTERN_LOTTO = 'WESTERN_LOTTO',
  WINNERS_GOLDEN_CHANCE = 'WINNERS_GOLDEN_CHANCE',
  WINNERS_GOLDEN_BET = 'WINNERS_GOLDEN_BET',
  BANGBET = 'BANGBET',
  NAIRABET = 'NAIRABET',
  SUPABET = 'SUPABET',
  BETKING = 'BETKING',
  BETWAY = 'BETWAY',
  NAIJABET = 'NAIJABET',
  '1XBET' = '1XBET',
  MERRYBET = 'MERRYBET',
  BETLAND = 'BETLAND',
  CLOUDBET = 'CLOUDBET',
  GREENLOTTO = 'GREENLOTTO',
  ELIESTLOTTO = 'ELIESTLOTTO',
  SPORTYBET = 'SPORTYBET',
  BETBABA = 'BETBABA',
  ACCESSBET = 'ACCESSBET',
  MSPORT = 'MSPORT',
  '25LOTTO' = '25LOTTO',
  MEGAMILLIONS_NAIJA = 'MEGAMILLIONS_NAIJA',
  GINJABET = 'GINJABET',
  DSTV = 'DSTV',
  GOTV = 'GOTV',
  STARTIMES = 'STARTIMES',
  SHOWMAX = 'SHOWMAX',
  EKEDC = 'EKEDC',
  EEDC = 'EEDC',
  PHEDC = 'PHEDC',
  AEDC = 'AEDC',
  KEDCO = 'KEDCO',
  IKEDC = 'IKEDC',
  KAEDCO = 'KAEDCO',
  JEDC = 'JEDC',
  IBEDC = 'IBEDC',
  LUMOS = 'LUMOS',
  PRIVIDA = 'PRIVIDA',
  APLE = 'APLE',
  HUSK_POWER = 'HUSK_POWER',
  BEDC = 'BEDC',
  ASOLAR = 'ASOLAR',
  SWITCH_SOLAR = 'SWITCH_SOLAR',
  WAVE_LENGTH = 'WAVE_LENGTH',
  A1_POWER = 'A1_POWER',
  A4_T_POWER = 'A4_T_POWER',
  SMARTER_GRID = 'SMARTER_GRID',
  CLOUD_ENERGY = 'CLOUD_ENERGY',
  OOLU_SOLAR = 'OOLU_SOLAR',
  ASOLAR_DEVICES = 'ASOLAR_DEVICES',
  GREENLIGHT_PLANET = 'GREENLIGHT_PLANET',
  PRIVIDA_SPARKMETER = 'PRIVIDA_SPARKMETER',
  PRIVIDA_STEAMACO = 'PRIVIDA_STEAMACO',
  YEDC = 'YEDC',
  APLE_KAYZ = 'APLE_KAYZ',
  SUREBET = 'SUREBET',
}

export enum ProductProviderSource {
  SAFE_HAVEN = 'safeHaven',
  CORAL_PAY = 'coralPay',
  SUREST_PAY = 'surestPay',
}

export enum ProductOrderByEnums {
  NAME = 'name',
  PRICE = 'price',
}

export enum OrderDirections {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface ProductCustomerData {
  name: string;
  address?: string;
  customerId: string;
  type?: string;
  minAmount?: number;
  maxAmount?: number;
}
export interface VerifyProductCustomerResponse {
  statusCode: HttpStatus;
  message: string;
  data: ProductCustomerData;
}
