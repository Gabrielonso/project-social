import { Opportunity } from 'src/opportunity/entity/opportunity.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity('faqs')
export class Faq {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  question: string;

  @Column({ type: 'varchar' })
  answer: string;

  @ManyToOne(() => Opportunity, (opportunity) => opportunity.faqs, {
    onDelete: 'CASCADE',
  })
  opportunity: Opportunity;
}
