import { Opportunity } from 'src/opportunity/entity/opportunity.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Opportunity, (opportunity) => opportunity.skills)
  opportunities?: Opportunity[];
}
