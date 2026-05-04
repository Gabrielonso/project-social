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
import { Chat } from './chat.entity';

@Entity('chat_participants')
export class ChatParticipant {
  constructor(id: string) {
    this.id = id;
  }

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_favorite', default: false })
  isFavorite: boolean;

  @Column({ name: 'is_muted', default: false })
  isMuted: boolean;

  @Column({ name: 'is_blocked', default: false })
  isBlocked: boolean;

  @Column({ name: 'is_admin', default: false })
  isAdmin: boolean;

  // @Column({ name: 'unread_count', default: 0 })
  // unreadCount: number;

  @Column({ name: 'last_seen_message_id', nullable: true })
  lastSeenMessageId: string;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'chat_id' })
  chatId: string;

  //>>>>>>>>Relations >>>>>>>>>>
  @ManyToOne(() => User, (user) => user.chatParticipants, {
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Chat, { onDelete: 'CASCADE' })
  chat: Chat;

  //>>>>>>Date related>>>>>>>>>
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', select: false })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', select: false })
  deletedAt: Date;
}
