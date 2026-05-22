import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Media } from 'src/modules/media/entities/media.entity';
import { StatusType } from '../enums/status-type.enum';

@Entity('statuses')
@Index(['ownerId'])
@Index(['expiresAt'])
export class Status {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ type: 'enum', enum: StatusType, default: StatusType.MEDIA })
  type: StatusType;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @ManyToOne(() => Media, {
    onDelete: 'SET NULL',
    nullable: true,
    eager: true,
  })
  media?: Media | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', select: false })
  deletedAt: Date | null;
}
