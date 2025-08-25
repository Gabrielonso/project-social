import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OpportunityAmountType } from '../enums/oppurtunity-amount-type.enum';
import { CurrencyTypes } from '@global/interfaces/currency.interface';
import { Faq } from 'src/faq/entity/faq.entity';
import { Client } from 'src/client/entity/client.entity';
import { Skill } from 'src/skills/entity/skill.entity';

@Entity('opportunities')
export class Opportunity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({
    name: 'amount_type',
    type: 'enum',
    enum: OpportunityAmountType,
  })
  amountType: OpportunityAmountType;

  @Column({
    name: 'min_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      from: (value: string) => parseFloat(value),
      to: (value: number) => value,
    },
  })
  minAmount: number;

  @Column({
    name: 'max_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      from: (value: string) => parseFloat(value),
      to: (value: number) => value,
    },
  })
  maxAmount: number;

  @Column({ type: 'enum', enum: CurrencyTypes, default: CurrencyTypes.NAIRA })
  currency?: string;

  /** Relationship */
  @ManyToOne(() => Client, (client) => client.opportunities, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn({ name: 'client_id' })
  client?: Client;

  @OneToMany(() => Faq, (faq) => faq.opportunity, { cascade: true })
  faqs: Faq[];

  // @OneToMany(() => Submission, (submission) => submission.opportunity, {
  //   cascade: true,
  // })
  // submissions: Submission[];

  @ManyToMany(() => Skill, (skill) => skill.opportunities, {
    cascade: true,
  })
  @JoinTable({ name: 'opportunity_skills' })
  skills: Skill[];

  /*** Date Related ***/

  @Column({ name: 'start_date_time', type: 'timestamp' })
  startDateTime: Date;

  @Column({ name: 'end_date_time', type: 'timestamp' })
  endDateTime: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', select: false })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', select: false })
  deletedAt: Date | null;
}
