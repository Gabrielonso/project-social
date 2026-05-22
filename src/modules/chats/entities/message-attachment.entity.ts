import { Entity, ManyToOne, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Media } from '../../media/entities/media.entity';
import { ChatMessage } from './chat-message.entity';

@Entity('message_attachments')
export class MessageAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChatMessage, (message) => message.attachments, {
    onDelete: 'CASCADE',
  })
  message: ChatMessage;

  @Column({ name: 'message_id', type: 'uuid' })
  messageId: string;

  @ManyToOne(() => Media, {
    cascade: true,
    eager: true,
  })
  attachment: Media;

  @Column({ default: 0, type: 'integer' })
  position: number;
}
