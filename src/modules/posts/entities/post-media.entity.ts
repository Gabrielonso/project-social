import { Entity, ManyToOne, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Media } from '../../media/entities/media.entity';
import { Post } from './post.entity';

@Entity('post_medias')
export class PostMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Post, (post) => post.medias, {
    onDelete: 'CASCADE',
  })
  post: Post;

  @ManyToOne(() => Media, {
    cascade: true,
    eager: true,
  })
  media: Media;

  @Column({ default: 0, type: 'integer' })
  position: number; // media order in carousel posts
}
