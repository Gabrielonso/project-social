export enum UserStatusEnum {
  ACTIVATED = 'activated',
  SUSPENDED = 'suspended',
  DEACTIVED = 'deactivated',
}

export enum AccountDeletedByEnum {
  ADMIN = 'admin',
  USER = 'user',
}

export enum UserBonusType {
  FIRST_TIME_5K_TOP_UP = 'FIRST_TIME_5K_TOP_UP',
}

export enum UserFilterByEnum {
  dob = 'dob',
  verified = 'verified',
}

export enum UserCreateOptions {
  EMAIL_AND_PASSWORD = 'email_and_password',
  GOOGLE = 'google',
  TIKTOK = 'tiktok',
}
