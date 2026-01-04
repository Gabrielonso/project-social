import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Media } from '../../media/entities/media.entity';

@Entity('stories')
export class Story {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Media, {
    onDelete: 'CASCADE',
  })
  media: Media;

  @Column({ default: 24 }) // auto delete after 24 hours
  expiresInHours: number;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
