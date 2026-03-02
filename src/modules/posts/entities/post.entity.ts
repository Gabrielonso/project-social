import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { PostMedia } from './post-media.entity';

@Entity('posts')
@Index(['ownerId'])
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  // 🔹 NEW — ownership reference
  @Column({ name: 'owner_id', nullable: true })
  ownerId: string;

  // 🔹 NEW — snapshot fields for feed
  @Column({ name: 'owner_username', nullable: true })
  ownerUsername: string;

  @Column({ name: 'owner_avatar', nullable: true })
  ownerAvatar?: string;

  @Column({ name: 'like_count', default: 0 })
  likeCount: number;

  @Column({ name: 'comment_count', default: 0 })
  commentCount: number;

  @Column({ name: 'share_count', default: 0 })
  shareCount: number;

  @Column({ name: 'bookmark_count', default: 0 })
  bookmarkCount: number;

  /** Relationship */

  @OneToMany(() => PostMedia, (pm) => pm.post, {
    cascade: true,
  })
  medias: PostMedia[];

  /*** Date Related ***/
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
