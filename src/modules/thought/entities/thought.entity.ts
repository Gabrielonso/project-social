import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('thoughts')
@Index(['ownerId'])
export class Thought {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  // 🔹 NEW — ownership reference
  @Column({ name: 'owner_id', nullable: true })
  ownerId: string;

  // 🔹 NEW — snapshot fields for feed
  @Column({ name: 'owner_username', nullable: true })
  ownerUsername: string;

  @Column({ name: 'owner_avatar', nullable: true })
  ownerAvatar?: string;

  @Column({ name: 'is_public', default: true })
  isPublic: boolean;

  /*** Date Related ***/
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
