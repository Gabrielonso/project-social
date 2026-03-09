import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/modules/user/entity/user.entity';
import { AdMedia } from './ads-media.entity';
import { Gender } from 'src/common/enums/gender.enum';
import { Media } from 'src/modules/media/entities/media.entity';

@Entity('ads')
export class Ad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  topic?: string;

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

  @Column({ name: 'target_country', type: 'text' })
  targetCountry: string;

  @Column({ name: 'target_gender', type: 'enum', nullable: true, enum: Gender })
  targetGender?: Gender;

  @Column({ name: 'min_age', type: 'int', nullable: true })
  minAge?: number;

  @Column({ name: 'max_age', type: 'int', nullable: true })
  maxAge?: number;

  @Column({ name: 'daily_reach_limit', type: 'int', nullable: true })
  dailyReachLimit: number;

  @Column({ name: 'daily_reach_used', type: 'int', default: 0 })
  dailyReachUsed: number;

  @Column({ default: 'active' })
  status: 'active' | 'paused' | 'ended';

  @Column({ name: 'like_count', default: 0 })
  likeCount: number;

  @Column({ name: 'comment_count', default: 0 })
  commentCount: number;

  @Column({ name: 'share_count', default: 0 })
  shareCount: number;

  @Column({ name: 'bookmark_count', default: 0 })
  bookmarkCount: number;

  /** Relationship */
  @OneToMany(() => AdMedia, (pm) => pm.ad, {
    cascade: true,
  })
  medias: AdMedia[];

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
