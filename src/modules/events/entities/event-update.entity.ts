import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { User } from '../../users/entities/user.entity';

export enum EventUpdateStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum EventUpdateType {
  ATTENDANCE_UPDATE = 'attendance_update',
  POLICE_ARRIVAL = 'police_arrival',
  POLICE_DEPARTURE = 'police_departure',
  STREET_CLOSURE = 'street_closure',
  STREET_REOPENED = 'street_reopened',
  GENERAL_UPDATE = 'general_update',
  INCIDENT = 'incident',
  EVENT_START = 'event_start',
  EVENT_END = 'event_end',
  EVENT_CREATED = 'event_created',
}

@Entity('event_updates')
export class EventUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Event, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  eventId: string;

  @Column({ type: 'timestamp' })
  updateTime: Date;

  @Column({
    type: 'enum',
    enum: EventUpdateType,
    default: EventUpdateType.GENERAL_UPDATE,
  })
  updateType: EventUpdateType;

  @Column({ type: 'int', nullable: true })
  attendeeCount: number;

  @Column({ type: 'boolean', default: false })
  policePresence: boolean;

  @Column({ type: 'boolean', default: false })
  streetClosure: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column()
  createdById: string;

  @Column({
    type: 'enum',
    enum: EventUpdateStatus,
    default: EventUpdateStatus.APPROVED,
  })
  status: EventUpdateStatus;

  @CreateDateColumn()
  createdAt: Date;
}
