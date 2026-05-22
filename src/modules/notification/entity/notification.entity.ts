import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationEventType } from '../interfaces/notification-event.types';
import type { NotificationMetadata } from '../interfaces/notification-event.types';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  type: NotificationEventType | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: NotificationMetadata | null;

  @Column({ type: 'text', nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ type: 'boolean', nullable: true, default: false, select: false })
  read: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
