import { FeedType } from 'src/modules/feeds/enums/feed-type.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('shares')
@Index(['entity', 'entityId'])
export class Share {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'target_type', type: 'enum', enum: FeedType })
  entity: FeedType;

  @Column({ name: 'target_id' })
  entityId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'share_type', default: 'internal' })
  shareType: 'internal' | 'external';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
