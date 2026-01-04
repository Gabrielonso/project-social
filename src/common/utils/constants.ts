import { config } from 'dotenv';

config();

enum PlanDurationTypes {
  MONTHLY = 'monthly',
  ANNUALLY = 'annually',
  BI_ANNUALLY = 'bi-annually',
  TRI_ANNUALLY = 'tri-annually',
  FIRST_TIME_TRIAL = 'first_time_trial',
  CUSTOM = 'custom',
}
export const API_KEYS = {
  web: process.env.WEB_API_KEY,
  mobile: process.env.MOBILE_API_KEY,
};

export const DEFAULT_LIMIT = 100;
export const DEFAULT_BATCH_SIZE = 50;
export const DEFAULT_BATCH_INTERVAL = 10; //Ten seconds
export const DATE_TIME_OFFSET = 90000;
export const jwt_expire_time = process.env.JWT_DURATION;
export const affilate_jwt_expire_time =
  process.env.AFFILATE_JWT_DURATION || 3600;
export const emailRegex =
  // eslint-disable-next-line no-control-regex
  /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
export const naira = '₦';
export const dollar = '$';
export const tokenSize = 6;
export const COUPON_PREFIX = 'B-';
export const WS_PORT = process.env.WS_PORT || undefined;
export const WS_OPTIONS = {
  transport: ['websocket', 'polling'],
  cors: {
    origin: '*:*',
    methods: ['GET', 'POST'],
  },
};

export const MESSAGES = {
  PROCESSING_ERROR: 'Request Processing error',
  OPS_SUCCESSFUL: 'Operation successful',
  BENEFICIARY_NOT_FOUND: 'Beneficiary not found',
  NOT_FOUND: 'not found',
  INVALID_BANK_ACCOUNT: 'Invalid bank account',
  INVALID_WALLET: 'ERROR: you do not own this wallet',
  BILL_PAY_ERROR: 'ERROR: gateway was unable to complete bills payment',
  TAX_VALUE_EXISTS: 'Tax value already has been set on this business',
  UNABLE_TO_VERIFY_BVN:
    'There was an error verifying your BVN. Please try again later.',
  UNABLE_TO_VALIDATE_BANK_ACCOUNT:
    'Error encountered while validating bank account number',
};

export const subscriptionTypeToDuration = {
  monthly: PlanDurationTypes.MONTHLY,
  annually: PlanDurationTypes.ANNUALLY,
  biAnnualPrice: PlanDurationTypes.BI_ANNUALLY,
  triAnnualPrice: PlanDurationTypes.TRI_ANNUALLY,
};

export const DayStringToNumber = {
  ['sunday']: 0,
  ['monday']: 1,
  ['tuesday']: 2,
  ['wednesday']: 3,
  ['thursday']: 4,
  ['friday']: 5,
  ['saturday']: 6,
};

export const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
export const MONTH_IN_MILLISECONDS = DAY_IN_MILLISECONDS * 30;
export const ANNUAL_IN_MILLISECONDS = DAY_IN_MILLISECONDS * 366;
export const BI_ANNUAL_IN_MILLISECONDS = MONTH_IN_MILLISECONDS * 6;
export const TRI_ANNUAL_IN_MILLISECONDS = MONTH_IN_MILLISECONDS * 4;

export const OTP_EXPIRY_DURATION = 3 * 60 * 1000;

export function getDurationInMilliSeconds(
  duration?: PlanDurationTypes,
): number {
  switch (duration) {
    case PlanDurationTypes.ANNUALLY:
      return ANNUAL_IN_MILLISECONDS;

    case PlanDurationTypes.MONTHLY:
      return MONTH_IN_MILLISECONDS;

    default:
      return 0;
  }
}

export const MAXIMUM_FORGET_PASSWORD_TRIAL_COUNT = 4;
export const MAXIMUM_TX_PIN_TRIAL_COUNT = 3;
