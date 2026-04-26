import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { EventsRepository } from '../repositories/events.repository';
import { CreateEventDto, UpdateEventDto, QueryEventDto } from '../dto';
import {
  Event,
  EventStatus,
  EventLifecycleStatus,
} from '../entities/event.entity';
import { PaginatedResponse } from '../../common/dto';
import { Between, Like, In } from 'typeorm';
import { UserRole } from '../../common/types/roles';
import { User } from '../../users/entities/user.entity';
import { EventUpdatesService } from './event-updates.service';
import { EventUpdateType } from '../entities/event-update.entity';
import { GeoValidationService } from './geo-validation.service';
import { CitiesService } from '../../cities/services/cities.service';
import { EventTitlesService } from './event-titles.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    @Inject(forwardRef(() => EventUpdatesService))
    private readonly eventUpdatesService: EventUpdatesService,
    private readonly geoValidationService: GeoValidationService,
    private readonly citiesService: CitiesService,
    private readonly eventTitlesService: EventTitlesService,
  ) {}

  /**
   * Determina el lifecycleStatus basado en la fecha del evento
   * IMPORTANTE: El timezone está configurado globalmente en main.ts como America/Argentina/Buenos_Aires
   * Por lo tanto, todas las comparaciones de fechas usan automáticamente el horario de Buenos Aires
   */
  private determineLifecycleStatus(eventDate: Date): EventLifecycleStatus {
    const now = new Date();
    const eventDateTime = new Date(eventDate);

    // Si la fecha del evento es futura (usando timezone de Buenos Aires)
    if (eventDateTime > now) {
      return EventLifecycleStatus.PENDING;
    }

    // Si la fecha del evento ya pasó, está esperando primer panorama
    return EventLifecycleStatus.AWAITING_START;
  }

  async create(createEventDto: CreateEventDto, user: User): Promise<Event> {
    if (user.role === UserRole.LEVEL_4) {
      if (!user.assignedCities || user.assignedCities.length === 0) {
        throw new ForbiddenException(
          'No tienes ciudades asignadas. Contacta al administrador.',
        );
      }

      const cityIds = user.assignedCities.map((city) => city.id);
      if (!cityIds.includes(createEventDto.cityId)) {
        throw new ForbiddenException(
          'No tienes permisos para crear eventos en esta ciudad. Solo puedes crear eventos en: ' +
            user.assignedCities.map((c) => c.name).join(', '),
        );
      }
    }

    // Validate eventTitleId if provided and not custom
    if (createEventDto.eventTitleId && !createEventDto.isCustomTitle) {
      await this.eventTitlesService.findOne(createEventDto.eventTitleId);
    }

    // Validate locality belongs to the selected city
    if (createEventDto.localityId) {
      const locality = await this.citiesService.findLocality(
        createEventDto.localityId,
      );
      if (locality.cityId !== createEventDto.cityId) {
        throw new BadRequestException(
          'La localidad seleccionada no pertenece al partido indicado.',
        );
      }
    }

    // Validate coordinates fall within the selected partido
    const city = await this.citiesService.findOne(createEventDto.cityId);
    const isInside = this.geoValidationService.isPointInPartido(
      city.name,
      createEventDto.latitude,
      createEventDto.longitude,
    );
    if (!isInside) {
      throw new BadRequestException(
        `Las coordenadas (${createEventDto.latitude}, ${createEventDto.longitude}) no corresponden al partido "${city.name}". Verificá que las coordenadas sean correctas.`,
      );
    }

    const status =
      user.role === UserRole.LEVEL_4
        ? EventStatus.PENDING
        : EventStatus.APPROVED;

    // Determinar lifecycleStatus solo si el evento es aprobado
    const lifecycleStatus =
      status === EventStatus.APPROVED
        ? this.determineLifecycleStatus(new Date(createEventDto.eventDate))
        : undefined;

    const event = this.eventsRepository.create({
      ...createEventDto,
      createdById: user.id,
      status,
      lifecycleStatus,
    });

    const savedEvent = await this.eventsRepository.save(event);

    // Create initial entry in event timeline
    await this.eventUpdatesService.create(
      savedEvent.id,
      {
        updateTime: createEventDto.eventDate,
        updateType: EventUpdateType.EVENT_CREATED,
        attendeeCount: 0,
        policePresence: false,
        streetClosure: false,
        notes: 'Evento creado - Estado inicial',
        latitude: createEventDto.latitude,
        longitude: createEventDto.longitude,
      },
      user.id,
      user.role,
    );

    // Reload the event with all relations to ensure proper serialization
    return this.findOne(savedEvent.id);
  }

  async findAll(
    queryDto: QueryEventDto,
    user: User,
  ): Promise<PaginatedResponse<Event>> {
    const {
      page = 1,
      limit = 10,
      search,
      eventType,
      status,
      lifecycleStatus,
      city,
      locality,
      dateFrom,
      dateTo,
    } = queryDto;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, any> = {};

    // Level 4 users see all events in their assigned cities (jurisdiction)
    if (user.role === UserRole.LEVEL_4) {
      const assignedCityIds = (user.assignedCities || []).map((c) => c.id);
      if (assignedCityIds.length > 0) {
        where.cityId = In(assignedCityIds);
      } else {
        // No assigned cities = no events visible
        where.cityId = In([]);
      }
    }

    if (search) {
      where.title = Like(`%${search}%`);
    }

    if (eventType) {
      where.eventType = eventType;
    }

    if (status) {
      where.status = status;
    }

    if (lifecycleStatus) {
      where.lifecycleStatus = lifecycleStatus;
    }

    if (city && city.length > 0) {
      if (user.role === UserRole.LEVEL_4) {
        // Intersect query filter with assigned cities
        const assignedCityIds = (user.assignedCities || []).map((c) => c.id);
        const allowed = city.filter((id) => assignedCityIds.includes(id));
        where.cityId = In(allowed.length > 0 ? allowed : []);
      } else {
        where.cityId = In(city);
      }
    }

    if (locality) {
      where.localityId = locality;
    }

    if (dateFrom && dateTo) {
      where.eventDate = Between(new Date(dateFrom), new Date(dateTo));
    } else if (dateFrom) {
      where.eventDate = Between(new Date(dateFrom), new Date('2099-12-31'));
    } else if (dateTo) {
      where.eventDate = Between(new Date('2000-01-01'), new Date(dateTo));
    }

    const [data, total] = await this.eventsRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { eventDate: 'ASC', createdAt: 'DESC' },
      relations: ['createdBy'],
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findAllWithLatestUpdate(
    queryDto: QueryEventDto,
    user: User,
  ): Promise<PaginatedResponse<any>> {
    const result = await this.findAll(queryDto, user);

    const eventIds = result.data.map((e) => e.id);
    const latestUpdates =
      await this.eventUpdatesService.getLatestUpdatesForEvents(eventIds);

    const enrichedData = result.data.map((event) => {
      const latestUpdate = latestUpdates[event.id];
      return {
        ...event,
        latestUpdate: latestUpdate
          ? {
              id: latestUpdate.id,
              updateTime: latestUpdate.updateTime,
              updateType: latestUpdate.updateType,
              attendeeCount: latestUpdate.attendeeCount,
              policePresence: latestUpdate.policePresence,
              streetClosure: latestUpdate.streetClosure,
              notes: latestUpdate.notes,
              createdBy: latestUpdate.createdBy
                ? {
                    id: latestUpdate.createdBy.id,
                    firstName: latestUpdate.createdBy.firstName,
                    lastName: latestUpdate.createdBy.lastName,
                    username: latestUpdate.createdBy.username,
                  }
                : null,
            }
          : null,
      };
    });

    return {
      data: enrichedData,
      meta: result.meta,
    };
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async update(
    id: string,
    updateEventDto: UpdateEventDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Event> {
    const event = await this.findOne(id);

    const isOwner = event.createdById === userId;
    const isModerator = [
      UserRole.LEVEL_1,
      UserRole.LEVEL_2,
      UserRole.LEVEL_3,
    ].includes(userRole);

    if (!isOwner && !isModerator) {
      throw new ForbiddenException('You can only edit your own events');
    }

    if (updateEventDto.status && !isModerator) {
      throw new ForbiddenException('Only moderators can change event status');
    }

    // Validate coordinates if they or the city changed
    const coordsChanged =
      updateEventDto.latitude !== undefined ||
      updateEventDto.longitude !== undefined;
    const cityChanged = updateEventDto.cityId !== undefined;
    if (coordsChanged || cityChanged) {
      const cityId = updateEventDto.cityId || event.cityId;
      const lat = updateEventDto.latitude ?? event.latitude;
      const lng = updateEventDto.longitude ?? event.longitude;
      const city = await this.citiesService.findOne(cityId);
      const isInside = this.geoValidationService.isPointInPartido(
        city.name,
        lat,
        lng,
      );
      if (!isInside) {
        throw new BadRequestException(
          `Las coordenadas (${lat}, ${lng}) no corresponden al partido "${city.name}". Verificá que las coordenadas sean correctas.`,
        );
      }
    }

    // Si se está aprobando el evento, establecer lifecycleStatus
    if (
      updateEventDto.status === EventStatus.APPROVED &&
      event.status !== EventStatus.APPROVED
    ) {
      updateEventDto.lifecycleStatus = this.determineLifecycleStatus(
        event.eventDate,
      );
    }

    Object.assign(event, updateEventDto);

    return this.eventsRepository.save(event);
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const event = await this.findOne(id);

    const isOwner = event.createdById === userId;
    const canDelete = [
      UserRole.LEVEL_1,
      UserRole.LEVEL_2,
      UserRole.LEVEL_3,
    ].includes(userRole);

    if (!isOwner && !canDelete) {
      throw new ForbiddenException(
        'No tienes permisos para eliminar este evento',
      );
    }

    // LEVEL_4 solo puede eliminar dentro de los primeros 30 minutos
    if (userRole === UserRole.LEVEL_4 && isOwner) {
      const now = new Date();
      const createdAt = new Date(event.createdAt);
      const minutesSinceCreation =
        (now.getTime() - createdAt.getTime()) / (1000 * 60);

      if (minutesSinceCreation > 30) {
        throw new ForbiddenException({
          message:
            'Han pasado más de 30 minutos desde la creación del evento. Debes solicitar la cancelación a un moderador.',
          canRequestCancellation: true,
          eventId: event.id,
        });
      }
    }

    await this.eventsRepository.remove(event);
  }

  async findApprovedForMap(): Promise<any[]> {
    const events = await this.eventsRepository.find({
      where: { status: EventStatus.APPROVED },
      order: { eventDate: 'ASC' },
      relations: ['createdBy'],
    });

    const eventIds = events.map((e) => e.id);
    const latestUpdates =
      await this.eventUpdatesService.getLatestUpdatesForEvents(eventIds);

    return events.map((event) => {
      const latestUpdate = latestUpdates[event.id];
      return {
        ...event,
        latestUpdate: latestUpdate
          ? {
              attendeeCount: latestUpdate.attendeeCount,
              policePresence: latestUpdate.policePresence,
              streetClosure: latestUpdate.streetClosure,
              updateTime: latestUpdate.updateTime,
            }
          : null,
      };
    });
  }

  async findPending(
    queryDto: QueryEventDto,
    user: User,
  ): Promise<PaginatedResponse<Event>> {
    const result = await this.findAll(
      { ...queryDto, status: EventStatus.PENDING },
      user,
    );

    // Exclude cancelled and pending_cancellation events from pending list
    result.data = result.data.filter(
      (e) =>
        e.lifecycleStatus !== EventLifecycleStatus.CANCELLED &&
        e.lifecycleStatus !== EventLifecycleStatus.PENDING_CANCELLATION,
    );
    result.meta.total = result.data.length;

    return result;
  }

  async getPendingCount(): Promise<{ count: number }> {
    const count = await this.eventsRepository.count({
      where: { status: EventStatus.PENDING },
    });
    return { count };
  }

  async getMetrics(): Promise<{
    ongoing: number;
    awaitingStart: number;
    pending: number;
    completed: number;
    cancelled: number;
  }> {
    const approvedEvents = await this.eventsRepository.find({
      where: { status: EventStatus.APPROVED },
      select: ['id', 'lifecycleStatus'],
    });

    return {
      ongoing: approvedEvents.filter(
        (e) => e.lifecycleStatus === EventLifecycleStatus.ONGOING,
      ).length,
      awaitingStart: approvedEvents.filter(
        (e) => e.lifecycleStatus === EventLifecycleStatus.AWAITING_START,
      ).length,
      pending: approvedEvents.filter(
        (e) => e.lifecycleStatus === EventLifecycleStatus.PENDING,
      ).length,
      completed: approvedEvents.filter(
        (e) => e.lifecycleStatus === EventLifecycleStatus.COMPLETED,
      ).length,
      cancelled: approvedEvents.filter(
        (e) => e.lifecycleStatus === EventLifecycleStatus.CANCELLED,
      ).length,
    };
  }
}
