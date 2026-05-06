import { Chat } from 'src/modules/chats/entities/chat.entity';
import { User } from 'src/modules/user/entity/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MessageReceipt } from './message-receipt.entity';
import { MessageAttachment } from './message-attachment.entity';

@Entity('chat_messages')
export class ChatMessage {
  constructor(id: string) {
    this.id = id;
  }

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'chat_id' })
  chatId: string;

  @ManyToOne(() => Chat, (chat) => chat.chat_messages, {
    onDelete: 'CASCADE',
  })
  chat: Chat;

  @Column({ name: 'sender_id' })
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  sender: User;

  @OneToMany(() => MessageReceipt, (receipt) => receipt.message)
  receipts: MessageReceipt[];

  @Column({ type: 'text', nullable: true })
  text: string | null;

  @OneToMany(() => MessageAttachment, (pm) => pm.message, {
    cascade: true,
  })
  attachments: MessageAttachment[];

  @Column({ default: false })
  pinned: boolean;

  @Column({ default: false })
  edited: boolean;

  @Column({ default: false })
  deleted: boolean;

  @Column({ name: 'deleted_for_me', default: false, select: false })
  deletedForMe: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // reactions, attachments, etc

  @Column({ name: 'reply_to_message_id', type: 'uuid', nullable: true })
  replyToMessageId: string;

  @Column({ name: 'edited_at', type: 'timestamp', nullable: true })
  editedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', select: false })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', select: false })
  deletedAt: Date;
}
