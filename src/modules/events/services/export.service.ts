import { Injectable } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventUpdatesService } from './event-updates.service';
import { QueryEventDto } from '../dto';
import { User } from '../../users/entities/user.entity';
import {
  EVENT_TYPE_LABELS,
  EVENT_STATUS_LABELS,
  EVENT_LIFECYCLE_STATUS_LABELS,
  UPDATE_TYPE_LABELS,
} from '../constants/labels';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExportService {
  constructor(
    private readonly eventsService: EventsService,
    private readonly eventUpdatesService: EventUpdatesService,
  ) {}

  async exportListToXlsx(query: QueryEventDto, user: User): Promise<Buffer> {
    // Get all events (override pagination for export)
    const result = await this.eventsService.findAll(
      { ...query, page: 1, limit: 10000 },
      user,
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Eventos');

    sheet.columns = [
      { header: 'Título', key: 'title', width: 40 },
      { header: 'Tipo', key: 'eventType', width: 18 },
      { header: 'Fecha', key: 'eventDate', width: 20 },
      { header: 'Partido', key: 'city', width: 25 },
      { header: 'Localidad', key: 'locality', width: 25 },
      { header: 'Dirección', key: 'address', width: 35 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: 'Ciclo de vida', key: 'lifecycleStatus', width: 25 },
      { header: 'Asistentes', key: 'attendeeCount', width: 12 },
      { header: 'Latitud', key: 'latitude', width: 14 },
      { header: 'Longitud', key: 'longitude', width: 14 },
      { header: 'Creado por', key: 'createdBy', width: 25 },
      { header: 'Fecha creación', key: 'createdAt', width: 20 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    for (const event of result.data) {
      sheet.addRow({
        title: event.title,
        eventType: EVENT_TYPE_LABELS[event.eventType] || event.eventType,
        eventDate: new Date(event.eventDate).toLocaleString('es-AR'),
        city: event.city?.name || '',
        locality: event.locality?.name || '',
        address: event.address,
        status: EVENT_STATUS_LABELS[event.status] || event.status,
        lifecycleStatus: event.lifecycleStatus
          ? EVENT_LIFECYCLE_STATUS_LABELS[event.lifecycleStatus] ||
            event.lifecycleStatus
          : '',
        attendeeCount: event.attendeeCount || '',
        latitude: event.latitude,
        longitude: event.longitude,
        createdBy: event.createdBy
          ? `${event.createdBy.firstName} ${event.createdBy.lastName}`
          : '',
        createdAt: new Date(event.createdAt).toLocaleString('es-AR'),
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportListToCsv(query: QueryEventDto, user: User): Promise<string> {
    const result = await this.eventsService.findAll(
      { ...query, page: 1, limit: 10000 },
      user,
    );

    const headers = [
      'Título',
      'Tipo',
      'Fecha',
      'Partido',
      'Localidad',
      'Dirección',
      'Estado',
      'Ciclo de vida',
      'Asistentes',
      'Latitud',
      'Longitud',
      'Creado por',
      'Fecha creación',
    ];

    const rows = result.data.map((event) => [
      this.escapeCsv(event.title),
      this.escapeCsv(EVENT_TYPE_LABELS[event.eventType] || event.eventType),
      this.escapeCsv(new Date(event.eventDate).toLocaleString('es-AR')),
      this.escapeCsv(event.city?.name || ''),
      this.escapeCsv(event.locality?.name || ''),
      this.escapeCsv(event.address),
      this.escapeCsv(EVENT_STATUS_LABELS[event.status] || event.status),
      this.escapeCsv(
        event.lifecycleStatus
          ? EVENT_LIFECYCLE_STATUS_LABELS[event.lifecycleStatus] ||
              event.lifecycleStatus
          : '',
      ),
      event.attendeeCount || '',
      event.latitude,
      event.longitude,
      this.escapeCsv(
        event.createdBy
          ? `${event.createdBy.firstName} ${event.createdBy.lastName}`
          : '',
      ),
      this.escapeCsv(new Date(event.createdAt).toLocaleString('es-AR')),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  async exportEventHistory(eventId: string): Promise<Buffer> {
    const event = await this.eventsService.findOne(eventId);
    const updates = await this.eventUpdatesService.findByEvent(eventId);

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Event data
    const eventSheet = workbook.addWorksheet('Datos del Evento');
    eventSheet.columns = [
      { header: 'Campo', key: 'field', width: 25 },
      { header: 'Valor', key: 'value', width: 50 },
    ];

    const headerRow = eventSheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const eventData = [
      { field: 'Título', value: event.title },
      {
        field: 'Tipo',
        value: EVENT_TYPE_LABELS[event.eventType] || event.eventType,
      },
      {
        field: 'Fecha',
        value: new Date(event.eventDate).toLocaleString('es-AR'),
      },
      { field: 'Partido', value: event.city?.name || '' },
      { field: 'Localidad', value: event.locality?.name || '' },
      { field: 'Dirección', value: event.address },
      {
        field: 'Estado',
        value: EVENT_STATUS_LABELS[event.status] || event.status,
      },
      {
        field: 'Ciclo de vida',
        value: event.lifecycleStatus
          ? EVENT_LIFECYCLE_STATUS_LABELS[event.lifecycleStatus] ||
            event.lifecycleStatus
          : '',
      },
      {
        field: 'Asistentes estimados',
        value: String(event.attendeeCount || ''),
      },
      { field: 'Latitud', value: String(event.latitude) },
      { field: 'Longitud', value: String(event.longitude) },
      {
        field: 'Creado por',
        value: event.createdBy
          ? `${event.createdBy.firstName} ${event.createdBy.lastName}`
          : '',
      },
      {
        field: 'Fecha creación',
        value: new Date(event.createdAt).toLocaleString('es-AR'),
      },
      { field: 'Descripción', value: event.description },
    ];

    for (const row of eventData) {
      eventSheet.addRow(row);
    }

    // Sheet 2: Timeline
    const timelineSheet = workbook.addWorksheet('Timeline');
    timelineSheet.columns = [
      { header: 'Fecha/Hora', key: 'updateTime', width: 20 },
      { header: 'Tipo', key: 'updateType', width: 25 },
      { header: 'Asistentes', key: 'attendeeCount', width: 12 },
      { header: 'Policía', key: 'policePresence', width: 10 },
      { header: 'Corte', key: 'streetClosure', width: 10 },
      { header: 'Notas', key: 'notes', width: 50 },
      { header: 'Registrado por', key: 'createdBy', width: 25 },
    ];

    const timelineHeader = timelineSheet.getRow(1);
    timelineHeader.font = { bold: true };
    timelineHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    for (const update of updates) {
      timelineSheet.addRow({
        updateTime: new Date(update.updateTime).toLocaleString('es-AR'),
        updateType: UPDATE_TYPE_LABELS[update.updateType] || update.updateType,
        attendeeCount: update.attendeeCount || '',
        policePresence: update.policePresence ? 'Sí' : 'No',
        streetClosure: update.streetClosure ? 'Sí' : 'No',
        notes: update.notes || '',
        createdBy: update.createdBy
          ? `${update.createdBy.firstName} ${update.createdBy.lastName}`
          : '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private escapeCsv(value: string): string {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
