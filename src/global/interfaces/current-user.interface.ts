import { User } from 'src/user/entity/user.entity';

export interface ICurrentUser
  extends Omit<
    User,
    | 'backupCodes'
    | 'bankAccounts'
    | 'mfaSecret'
    | 'passwordHash'
    | 'token'
    | 'refreshToken'
    | 'wallets'
  > {
  id: string;
}
