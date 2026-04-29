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
import { City } from '../../cities/entities/city.entity';
import { Locality } from '../../cities/entities/locality.entity';
import { EventTitle } from './event-title.entity';

export enum EventType {
  MANIFESTACION = 'manifestacion',
  MARCHA = 'marcha',
  CONCENTRACION = 'concentracion',
  ASAMBLEA = 'asamblea',
  OTRO = 'otro',
}

export enum EventStatus {
  PENDING = 'pending', // Esperando aprobación
  APPROVED = 'approved', // Aprobado
  REJECTED = 'rejected', // Rechazado
}

export enum EventLifecycleStatus {
  PENDING = 'pending', // Aprobado pero fecha futura
  AWAITING_START = 'awaiting_start', // Fecha llegó, esperando primer panorama
  ONGOING = 'ongoing', // En curso (tiene primer panorama)
  COMPLETED = 'completed', // Finalizado
  CANCELLED = 'cancelled', // Cancelado
  PENDING_CANCELLATION = 'pending_cancellation', // Solicitud de cancelación enviada
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ManyToOne(() => EventTitle, { eager: true, nullable: true })
  @JoinColumn({ name: 'eventTitleId' })
  eventTitle: EventTitle;

  @Column({ nullable: true })
  eventTitleId: string;

  @Column({ type: 'boolean', default: true })
  isCustomTitle: boolean;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.OTRO,
  })
  eventType: EventType;

  @Column({ type: 'timestamp' })
  eventDate: Date;

  @Column({ type: 'varchar', length: 500 })
  address: string;

  @ManyToOne(() => City, { eager: true, nullable: false })
  @JoinColumn({ name: 'cityId' })
  city: City;

  @Column()
  cityId: string;

  @ManyToOne(() => Locality, { eager: true, nullable: true })
  @JoinColumn({ name: 'localityId' })
  locality: Locality;

  @Column({ nullable: true })
  localityId: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.PENDING,
  })
  status: EventStatus;

  @Column({
    type: 'enum',
    enum: EventLifecycleStatus,
    nullable: true,
  })
  lifecycleStatus: EventLifecycleStatus;

  @Column({ type: 'text', nullable: true })
  relatedIncidentExcerpt: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  nearestPoliceStation: string | null;

  @Column({ type: 'int', nullable: true })
  attendeeCount: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column()
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
