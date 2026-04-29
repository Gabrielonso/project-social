import { ChatMessage } from 'src/modules/chats/entities/chat-message.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChatParticipant } from './chat-participant.entity';

@Entity('chats')
export class Chat {
  constructor(id: string) {
    this.id = id;
  }

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'last_message_id', type: 'uuid', nullable: true })
  lastMessageId: string;
  //>>>>>>>>Relations >>>>>>>>>>
  // @OneToOne(() => ChatMessage, {
  //   onDelete: 'SET NULL',
  // })
  // lastMessage: ChatMessage;
  @Column({ name: 'is_group', type: 'boolean', default: false })
  isGroup: boolean;

  @Column({ type: 'text', nullable: true })
  name?: string; // for group chats

  @OneToMany(() => ChatParticipant, (p) => p.chat)
  participants: ChatParticipant[];

  @OneToMany(() => ChatMessage, (m) => m.chat)
  chat_messages: ChatMessage[];

  @Column({ name: 'chat_key', unique: true, nullable: true })
  chatKey: string;

  //>>>>>>Date related>>>>>>>>>
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', select: false })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', select: false })
  deletedAt: Date;
}
