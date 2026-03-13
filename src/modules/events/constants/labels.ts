import {
  EventType,
  EventStatus,
  EventLifecycleStatus,
} from '../entities/event.entity';
import { EventUpdateType } from '../entities/event-update.entity';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  [EventType.MANIFESTACION]: 'Manifestación',
  [EventType.MARCHA]: 'Marcha',
  [EventType.CONCENTRACION]: 'Concentración',
  [EventType.ASAMBLEA]: 'Asamblea',
  [EventType.OTRO]: 'Otro',
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  [EventStatus.PENDING]: 'Pendiente',
  [EventStatus.APPROVED]: 'Aprobado',
  [EventStatus.REJECTED]: 'Rechazado',
};

export const EVENT_LIFECYCLE_STATUS_LABELS: Record<
  EventLifecycleStatus,
  string
> = {
  [EventLifecycleStatus.PENDING]: 'Próximo',
  [EventLifecycleStatus.AWAITING_START]: 'Esperando primer panorama',
  [EventLifecycleStatus.ONGOING]: 'En curso',
  [EventLifecycleStatus.COMPLETED]: 'Finalizado',
  [EventLifecycleStatus.CANCELLED]: 'Cancelado',
  [EventLifecycleStatus.PENDING_CANCELLATION]: 'Pendiente de cancelación',
};

export const UPDATE_TYPE_LABELS: Record<EventUpdateType, string> = {
  [EventUpdateType.ATTENDANCE_UPDATE]: 'Actualización de asistencia',
  [EventUpdateType.POLICE_ARRIVAL]: 'Llegada de policía',
  [EventUpdateType.POLICE_DEPARTURE]: 'Retirada de policía',
  [EventUpdateType.STREET_CLOSURE]: 'Corte de calle',
  [EventUpdateType.STREET_REOPENED]: 'Apertura de calle',
  [EventUpdateType.GENERAL_UPDATE]: 'Actualización general',
  [EventUpdateType.INCIDENT]: 'Incidente',
  [EventUpdateType.EVENT_START]: 'Inicio del evento',
  [EventUpdateType.EVENT_END]: 'Fin del evento',
  [EventUpdateType.EVENT_CREATED]: 'Evento creado',
};
