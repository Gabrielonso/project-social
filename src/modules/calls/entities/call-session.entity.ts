import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CallType } from '../enums/call-type.enum';
import { CallSessionStatus } from '../enums/call-session-status.enum';

@Entity('call_sessions')
@Index(['callUuid'], { unique: true })
@Index(['roomName'])
@Index(['callerId'])
@Index(['calleeId'])
export class CallSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'call_uuid', type: 'text' })
  callUuid: string;

  @Column({ name: 'chat_id', type: 'uuid' })
  chatId: string;

  @Column({ name: 'caller_id', type: 'uuid' })
  callerId: string;

  @Column({ name: 'callee_id', type: 'uuid' })
  calleeId: string;

  @Column({ name: 'room_name', type: 'text' })
  roomName: string;

  @Column({ type: 'enum', enum: CallType })
  type: CallType;

  @Column({ type: 'enum', enum: CallSessionStatus })
  status: CallSessionStatus;

  @Column({ name: 'initiated_at', type: 'timestamp' })
  initiatedAt: Date;

  @Column({ name: 'answered_at', type: 'timestamp', nullable: true })
  answeredAt: Date | null;

  @Column({ name: 'caller_joined_at', type: 'timestamp', nullable: true })
  callerJoinedAt: Date | null;

  @Column({ name: 'callee_joined_at', type: 'timestamp', nullable: true })
  calleeJoinedAt: Date | null;

  @Column({ name: 'caller_left_at', type: 'timestamp', nullable: true })
  callerLeftAt: Date | null;

  @Column({ name: 'callee_left_at', type: 'timestamp', nullable: true })
  calleeLeftAt: Date | null;

  @Column({ name: 'signaling_ended_at', type: 'timestamp', nullable: true })
  signalingEndedAt: Date | null;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @Column({ name: 'media_duration_seconds', type: 'int', nullable: true })
  mediaDurationSeconds: number | null;

  @Column({ name: 'duration_seconds', type: 'int', default: 0 })
  durationSeconds: number;

  @Column({ name: 'duration_final', type: 'boolean', default: false })
  durationFinal: boolean;

  @Column({ name: 'finalized_at', type: 'timestamp', nullable: true })
  finalizedAt: Date | null;

  @Column({ name: 'chat_message_id', type: 'uuid', nullable: true })
  chatMessageId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
