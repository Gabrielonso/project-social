import { FeedType } from 'src/modules/feeds/enums/feed-type.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('bookmarks')
@Index(['entity', 'entityId'])
@Index(['userId', 'entity', 'entityId'], { unique: true })
export class Bookmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: FeedType, enumName: 'feed_type_enum' })
  entity: FeedType;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
