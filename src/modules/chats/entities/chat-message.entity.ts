import { Chat } from 'src/modules/chats/entities/chat.entity';
import { User } from 'src/modules/user/entity/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @Column({ type: 'text', nullable: true })
  text: string;

  @Column({ type: 'text', nullable: true })
  media: string;

  @Column({ default: false })
  pinned: boolean;

  @Column({ default: false })
  edited: boolean;

  @Column({ name: 'deleted_for_everyone', default: false })
  deletedForEveryone: boolean;

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
