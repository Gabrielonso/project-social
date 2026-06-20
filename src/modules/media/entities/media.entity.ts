import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { MediaType } from '../enums/media-type.enum';
import { MediaProvider } from '../enums/media-provider.enum';
import { MediaStatus } from '../enums/media-status.enum';
import { MediaUploadFolder } from '../enums/media-upload-folder.enum';
import { ModerationStatus } from '../enums/moderation-status.enum';

@Entity('medias')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: MediaType })
  type: MediaType;

  @Column({ type: 'enum', enum: MediaProvider })
  provider: MediaProvider;

  @Index()
  @Column({ name: 'source_id_or_key' })
  sourceIdOrKey: string;

  @Index()
  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId?: string;

  @Column({
    name: 'upload_folder',
    type: 'enum',
    enum: MediaUploadFolder,
    nullable: true,
  })
  uploadFolder?: MediaUploadFolder;

  @Column({ name: 'mime_type', nullable: true })
  mimeType?: string;

  @Column({
    type: 'enum',
    enum: MediaStatus,
    default: MediaStatus.UPLOADED,
  })
  status: MediaStatus;

  @Column({
    name: 'moderation_status',
    type: 'enum',
    enum: ModerationStatus,
    nullable: true,
  })
  moderationStatus?: ModerationStatus;

  @Column({ name: 'moderation_labels', type: 'jsonb', nullable: true })
  moderationLabels?: Record<string, any>;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ name: 'moderated_at', type: 'timestamp', nullable: true })
  moderatedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  variants?: Record<string, string>;

  @Column({ name: 'original_url', nullable: true })
  originalUrl: string;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string;

  @Column({ name: 'low_url', nullable: true })
  lowUrl: string;

  @Column({ name: 'stream_url', nullable: true })
  streamUrl: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      from: (value: string) => parseFloat(value),
      to: (value: number) => value,
    },
    nullable: true,
  })
  duration: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      from: (value: string) => parseFloat(value),
      to: (value: number) => value,
    },
    nullable: true,
  })
  width: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      from: (value: string) => parseFloat(value),
      to: (value: number) => value,
    },
    nullable: true,
  })
  height: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      from: (value: string) => parseFloat(value),
      to: (value: number) => value,
    },
    nullable: true,
  })
  size: number;

  @Column({ name: 'file_name', nullable: true })
  fileName?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
