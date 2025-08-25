import { Opportunity } from 'src/opportunity/entity/opportunity.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  email?: string;

  @Column({ type: 'varchar', nullable: true })
  website?: string;

  @Column({ type: 'varchar', nullable: true })
  instagram?: string;

  @Column({ type: 'varchar', nullable: true })
  tiktok?: string;

  @Column({ name: 'x_handle', type: 'varchar', nullable: true })
  xHandle?: string;

  @Column({ type: 'varchar', nullable: true })
  about?: string;

  @Column({ name: 'phone_code', type: 'varchar', nullable: true, length: 5 })
  phoneCode: string;

  @Column({ name: 'phone_number', type: 'varchar', nullable: true, length: 15 })
  phoneNumber: string;

  @Column({ type: 'varchar', nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  state?: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  country?: string;

  /** Relationships */
  @OneToMany(() => Opportunity, (opportunity) => opportunity.client)
  opportunities: Opportunity[];

  /*** Date Related ***/
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', select: false })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', select: false })
  deletedAt: Date | null;
}
