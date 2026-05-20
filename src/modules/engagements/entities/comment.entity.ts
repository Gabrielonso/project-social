import { FeedType } from 'src/modules/feeds/enums/feed-type.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('comments')
@Index(['entity', 'entityId'])
@Index(['parentId'])
@Index(['userId'])
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: FeedType })
  entity: FeedType;

  @Column({ name: 'target_id' })
  entityId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true, name: 'parent_id' })
  parentId?: string;

  @Column({ name: 'reply_to_user_id', nullable: true })
  replyToUserId?: string;

  @Column({ name: 'reply_to_comment_id', nullable: true })
  replyToCommentId?: string;

  @Column({ name: 'reply_count', default: 0 })
  replyCount: number;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'deleted_by', nullable: true })
  deletedBy?: string; // admin or userId

  @CreateDateColumn({ name: 'create_at' })
  createdAt: Date;
}
