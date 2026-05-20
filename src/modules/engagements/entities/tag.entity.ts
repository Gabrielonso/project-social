import { FeedType } from 'src/modules/feeds/enums/feed-type.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TagType } from '../enums/tag-type.enum';

@Entity('tags')
@Index(['entity', 'entityId'])
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity', type: 'enum', enum: FeedType })
  entity: FeedType;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', default: TagType.TAG, enum: TagType })
  type: TagType;

  @Column({ name: 'start_index', nullable: true })
  startIndex?: number; // for inline mention

  @Column({ name: 'end_index', nullable: true })
  endIndex?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
