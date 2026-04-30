import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Requirement } from './requirement.entity';

export enum RequirementResponseType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
}

@Entity('requirement_responses')
@Unique(['requirementId', 'respondedById'])
export class RequirementResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Requirement, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requirementId' })
  requirement: Requirement;

  @Column()
  requirementId: string;

  @ManyToOne(() => User, { eager: true, nullable: false })
  @JoinColumn({ name: 'respondedById' })
  respondedBy: User;

  @Column()
  respondedById: string;

  @Column({
    type: 'enum',
    enum: RequirementResponseType,
  })
  type: RequirementResponseType;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
