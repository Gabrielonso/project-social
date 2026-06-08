import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Post } from './post.entity';
import { User } from 'src/modules/user/entity/user.entity';

@Entity('post_views')
@Unique(['postId', 'viewerId'])
@Index(['postId'])
@Index(['viewerId'])
export class PostView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'post_id', type: 'uuid' })
  postId: string;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @Column({ name: 'viewer_id', type: 'uuid', nullable: true })
  viewerId: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'viewer_id' })
  viewer?: User;

  @CreateDateColumn({ name: 'viewed_at', type: 'timestamp' })
  viewedAt: Date;
}
