import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { randomInt } from 'crypto';
import {
  UserCreateOptions,
  UserStatusEnum,
} from '../interfaces/user.interfaces';
import { UserRoles } from 'src/common/enums/user-roles.constants';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function generateRefId(length = 7): string {
  let id = '';
  for (let i = 0; i < length; i++) {
    id += ALPHABET[randomInt(ALPHABET.length)];
  }
  return id;
}

@Entity('users')
export class User {
  constructor(id: string) {
    this.id = id;
    this.userRefId = generateRefId(7);
  }

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', type: 'text', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', type: 'text', nullable: true })
  lastName: string;

  @Column({ type: 'text', unique: true, nullable: true })
  username: string;

  @Column({ name: 'bio', type: 'text', nullable: true })
  bio: string;

  @Column({ name: 'country_code', type: 'text', nullable: true })
  countryCode: string;

  @Column({ name: 'profile_picture', type: 'text', nullable: true })
  profilePicture: string;

  @Column({ type: 'text', unique: true, nullable: false })
  email: string;

  @Column({
    type: 'enum',
    enum: UserRoles,
    nullable: true,
    default: UserRoles.USER,
  })
  role: UserRoles;

  @Column({ name: 'phone_code', type: 'text', nullable: true })
  phoneCode: string;

  @Column({ name: 'phone_number', type: 'text', nullable: true })
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

  @Column({ type: 'text', nullable: true, select: false })
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
    type: 'text',
    nullable: true,
    select: false,
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
    type: 'text',
    unique: true,
    nullable: true,
  })
  userRefId: string;

  @Column({ type: 'timestamp', nullable: true })
  dob: Date;

  @Column({ type: 'text', nullable: true, select: false })
  password: string;

  /*** Relationships ***/

  /*** Date Related ***/
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', select: false })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', select: false })
  deletedAt: Date | null;
}
