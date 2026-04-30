import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { User } from 'src/modules/user/entity/user.entity';

@Entity('message_receipts')
export class MessageReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'message_id' })
  messageId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => ChatMessage, { onDelete: 'CASCADE' })
  message: ChatMessage;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ default: false })
  delivered: boolean;

  @Column({ default: false })
  read: boolean;

  @Column({ default: false })
  deleted: boolean;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
