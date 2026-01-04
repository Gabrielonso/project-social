import { Entity, ManyToOne, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Media } from '../../media/entities/media.entity';
import { Ad } from './ads.entity';

@Entity('ad_medias')
export class AdMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ad, (ad) => ad.medias, {
    onDelete: 'CASCADE',
  })
  ad: Ad;

  @ManyToOne(() => Media, {
    onDelete: 'CASCADE',
    cascade: true,
    eager: true,
  })
  media: Media;

  @Column({ default: 0, type: 'integer' })
  position: number; // media order in carousel posts
}
