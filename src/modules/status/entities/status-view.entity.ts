import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Status } from './status.entity';
import { User } from 'src/modules/user/entity/user.entity';

@Entity('status_views')
@Unique(['statusId', 'viewerId'])
@Index(['statusId'])
@Index(['viewerId'])
export class StatusView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'status_id' })
  statusId: string;

  @ManyToOne(() => Status, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'status_id' })
  status: Status;

  @Column({ name: 'viewer_id' })
  viewerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'viewer_id' })
  viewer: User;

  @CreateDateColumn({ name: 'viewed_at', type: 'timestamp' })
  viewedAt: Date;
}
