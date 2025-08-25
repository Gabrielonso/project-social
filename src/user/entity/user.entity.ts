import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { randomInt } from 'crypto';
import {
  UserCreateOptions,
  UserStatusEnum,
} from '../interfaces/user.interfaces';
import Wallet from 'src/wallet/entity/wallet.entity';
import { Submission } from 'src/submission/entity/submission.entity';
import { UserRoles } from '@global/enums/user-roles.constants';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function generateRefId(length = 7): string {
  let id = '';
  for (let i = 0; i < length; i++) {
    id += ALPHABET[randomInt(ALPHABET.length)];
  }
  return id;
}

@Entity('user')
export class User {
  constructor(id: string) {
    this.id = id;
    this.userRefId = generateRefId(7);
  }

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', type: 'varchar', nullable: true, length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', nullable: true, length: 100 })
  lastName: string;

  @Column({ name: 'profile_picture', type: 'varchar', nullable: true })
  profilePicture: string;

  @Column({ type: 'varchar', unique: true, nullable: false, length: 255 })
  email: string;

  @Column({
    type: 'enum',
    enum: UserRoles,
    nullable: true,
    default: UserRoles.USER,
  })
  role: UserRoles;

  @Column({ name: 'phone_code', type: 'varchar', nullable: true, length: 5 })
  phoneCode: string;

  @Column({ name: 'phone_number', type: 'varchar', nullable: true, length: 15 })
  phoneNumber: string;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({
    type: 'enum',
    nullable: true,
    default: UserStatusEnum.ACTIVATED,
    enum: UserStatusEnum,
  })
  status: UserStatusEnum;

  @Column({ type: 'varchar', nullable: true, select: false, length: 50 })
  otp: string;

  @Column({
    name: 'otp_expires_at',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  otpExpiresAt: Date;

  @Column({
    name: 'reset_otp',
    type: 'varchar',
    nullable: true,
    select: false,
    length: 50,
  })
  resetOtp: string;

  @Column({
    name: 'reset_otp_expires_at',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  resetOtpExpiresAt: Date;

  @Column({
    name: 'created_with',
    type: 'enum',
    enum: UserCreateOptions,
    nullable: true,
    select: false,
    default: UserCreateOptions.EMAIL_AND_PASSWORD,
  })
  createdWith: UserCreateOptions;

  @Column({
    name: 'user_ref_id',
    type: 'varchar',
    unique: true,
    nullable: true,
    length: 10,
  })
  userRefId: string;

  @Column({ type: 'timestamp', nullable: true })
  dob: Date;

  @Column({ type: 'varchar', nullable: true, select: false, length: 255 })
  password: string;

  @Column({
    name: 'txn_pin',
    type: 'varchar',
    nullable: true,
    default: null,
    length: 255,
    select: false,
  })
  txnPin?: string;

  @Column({
    name: 'txn_pin_reset_otp',
    type: 'varchar',
    nullable: true,
    select: false,
    length: 250,
  })
  txnPinResetOtp: string;

  @Column({
    name: 'txn_pin_expires_at',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  txnPinOtpExpiresAt: Date;

  /*** Relationships ***/
  @OneToOne(() => Wallet, (wallet) => wallet.user, { cascade: true })
  @JoinColumn({ name: 'wallet_id' })
  wallet?: Wallet;

  @OneToMany(() => Submission, (submission) => submission.applicant, {
    cascade: true,
  })
  submissions: Submission[];

  /*** Date Related ***/
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', select: false })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', select: false })
  deletedAt: Date | null;
}
