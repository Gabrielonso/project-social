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
  sourceIdOrKey: string; // S3 object key

  @Column({
    type: 'enum',
    enum: MediaStatus,
    default: MediaStatus.UPLOADED,
  })
  status: MediaStatus;

  @Column({ name: 'original_url', nullable: true })
  originalUrl: string; // Original uploaded file

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string; // For images/videos

  @Column({ name: 'low_url', nullable: true })
  lowUrl: string; // Optimized version

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
  size: number; // File size in bytes

  //   @Index()
  //   @ManyToOne(() => User, (user) => user.media, {
  //     onDelete: 'SET NULL',
  //     nullable: true,
  //   })
  //   uploadedBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
