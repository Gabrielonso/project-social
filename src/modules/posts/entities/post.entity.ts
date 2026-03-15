import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { PostMedia } from './post-media.entity';
import { Media } from 'src/modules/media/entities/media.entity';

@Entity('posts')
@Index(['ownerId'])
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ type: 'text', array: true, nullable: true })
  hashtags?: string[];

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

  @Column({ name: 'allow_comments', default: true })
  allowComments: boolean;

  @Column({ name: 'is_public', default: true })
  isPublic: boolean;

  @Column({ name: 'location', nullable: true })
  location?: string;

  /** Relationship */

  @OneToMany(() => PostMedia, (pm) => pm.post, {
    cascade: true,
  })
  medias: PostMedia[];

  @ManyToOne(() => Media, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'sound_media_id' })
  sound?: Media;

  /*** Date Related ***/
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
