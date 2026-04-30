import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Event } from '../../events/entities/event.entity';
import { Requirement } from '../../requirements/entities/requirement.entity';

export enum NotificationType {
  CANCELLATION_REQUEST = 'cancellation_request',
  CANCELLATION_APPROVED = 'cancellation_approved',
  CANCELLATION_REJECTED = 'cancellation_rejected',
  REQUIREMENT_CREATED = 'requirement_created',
  REQUIREMENT_RESPONDED = 'requirement_responded',
  REQUIREMENT_VOIDED = 'requirement_voided',
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.UNREAD,
  })
  status: NotificationStatus;

  @Column({ type: 'boolean', default: false })
  actionable: boolean;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column()
  senderId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column()
  recipientId: string;

  @ManyToOne(() => Event, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ nullable: true })
  eventId: string;

  @ManyToOne(() => Requirement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requirementId' })
  requirement: Requirement;

  @Column({ type: 'varchar', nullable: true })
  requirementId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
