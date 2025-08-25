import { CurrencyTypes } from '@global/interfaces/currency.interface';
import { User } from 'src/user/entity/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum NubanProvider {}

@Entity()
class Wallet {
  constructor(id: string) {
    this.id = id;
  }

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      from: (value: string) => parseFloat(value),
      to: (value: number) => value,
    },
  })
  balance: number;

  @Column({
    name: 'book_balance',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      from: (value: string) => parseFloat(value),
      to: (value: number) => value,
    },
  })
  bookBalance: number;

  @Column({
    name: 'account_name',
    type: 'varchar',
    default: null,
    nullable: true,
  })
  accountName?: string;

  @Column({ name: 'bank_name', type: 'varchar', default: null, nullable: true })
  bankName?: string;

  @Column({ name: 'bank_code', type: 'varchar', default: null, nullable: true })
  bankCode?: string;

  @Column({
    name: 'account_number',
    type: 'varchar',
    default: null,
    nullable: true,
  })
  accountNumber?: string;

  @Column({ type: 'varchar', default: null, nullable: true, select: false })
  bvn: string;

  @Column({ type: 'enum', enum: CurrencyTypes, default: CurrencyTypes.NAIRA })
  currency?: string;

  @Column({
    name: 'nuban_provider',
    type: 'enum',
    enum: NubanProvider,
    nullable: true,
    default: null,
  })
  nubanProvider?: NubanProvider;

  @OneToOne(() => User, (user) => user.wallet, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  /*** Date Related ***/
  @Column({
    name: 'nuban_created_date',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  nubanCreatedDate: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', select: false })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', select: false })
  deletedAt: Date;
}

export default Wallet;
