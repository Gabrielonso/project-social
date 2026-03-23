import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('blocks')
@Index(['blockerId'])
@Index(['blockedId'])
@Index(['blockerId', 'blockedId'], { unique: true })
export class Block {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'blocker_id' })
  blockerId: string;

  @Column({ name: 'blocked_id' })
  blockedId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
