import { User } from 'src/user/entity/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';

export enum SubmissionStatus {
  INTERESTED = 'interested', // just bookmarked / clicked "I'm interested"
  SUBMITTED = 'submitted', // full application / entry submitted
  APPROVED = 'approved', // selected / winner / accepted
  REJECTED = 'rejected', // not selected
  WITHDRAWN = 'withdrawn', // applicant withdrew
}

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  //   @ManyToOne(() => Opportunity, (opportunity) => opportunity.submissions, {
  //     onDelete: 'CASCADE',
  //   })
  //   @JoinColumn({ name: 'opportunity_id' })
  //   opportunity: Opportunity;

  @ManyToOne(() => User, (user) => user.submissions, { nullable: true })
  @JoinColumn({ name: 'applicant_id' })
  applicant?: User;

  //   @Column({
  //     type: 'enum',
  //     enum: SubmissionStatus,
  //     default: SubmissionStatus.INTERESTED,
  //   })
  //   status: SubmissionStatus;

  //   @Column({ type: 'jsonb', nullable: true })
  //   content?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
