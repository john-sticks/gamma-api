import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Not } from 'typeorm';
import { EventUpdatesRepository } from '../repositories/event-updates.repository';
import { EventsRepository } from '../repositories/events.repository';
import { CreateEventUpdateDto, UpdateEventUpdateDto } from '../dto';
import {
  EventUpdate,
  EventUpdateType,
  EventUpdateStatus,
} from '../entities/event-update.entity';
import { EventLifecycleStatus } from '../entities/event.entity';
import { UserRole } from '../../common/types/roles';

@Injectable()
export class EventUpdatesService {
  constructor(
    private readonly eventUpdatesRepository: EventUpdatesRepository,
    @Inject(forwardRef(() => EventsRepository))
    private readonly eventsRepository: EventsRepository,
  ) {}

  async create(
    eventId: string,
    createEventUpdateDto: CreateEventUpdateDto,
    userId: string,
    userRole?: UserRole,
  ): Promise<EventUpdate> {
    // Verify that the event exists
    const event = await this.eventsRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (
      createEventUpdateDto.updateType !== EventUpdateType.EVENT_CREATED &&
      (event.lifecycleStatus === EventLifecycleStatus.COMPLETED ||
        event.lifecycleStatus === EventLifecycleStatus.CANCELLED)
    ) {
      throw new BadRequestException(
        'No se pueden agregar actualizaciones a un evento finalizado o cancelado.',
      );
    }

    // Use the specific time provided (now required)
    const updateTime = new Date(createEventUpdateDto.updateTime);

    // Validate that the new update time is after the latest existing update
    // Skip validation for EVENT_CREATED, and ignore EVENT_CREATED entries when comparing
    // (the first panorama can be before the scheduled event time since people may gather early)
    if (createEventUpdateDto.updateType !== EventUpdateType.EVENT_CREATED) {
      const latestUpdate = await this.eventUpdatesRepository.findOne({
        where: {
          eventId,
          updateType: Not(EventUpdateType.EVENT_CREATED),
        },
        order: { updateTime: 'DESC' },
      });

      if (latestUpdate && updateTime <= latestUpdate.updateTime) {
        throw new BadRequestException(
          'La fecha y hora de la actualización debe ser posterior a la última actualización registrada',
        );
      }
    }

    // Determine status: Level_4 users need approval, others are auto-approved
    // EVENT_CREATED updates (from event creation) are always approved
    const isAutoApproved =
      createEventUpdateDto.updateType === EventUpdateType.EVENT_CREATED ||
      !userRole ||
      [UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3].includes(userRole);

    const status = isAutoApproved
      ? EventUpdateStatus.APPROVED
      : EventUpdateStatus.PENDING;

    const eventUpdate = this.eventUpdatesRepository.create({
      ...createEventUpdateDto,
      updateTime,
      eventId,
      createdById: userId,
      status,
    });

    const savedUpdate = await this.eventUpdatesRepository.save(eventUpdate);

    // Only update event lifecycleStatus if the update is approved
    if (status === EventUpdateStatus.APPROVED) {
      await this.applyLifecycleChanges(event, createEventUpdateDto.updateType);
    }

    return savedUpdate;
  }

  /**
   * Apply lifecycle status changes to the event based on the update type.
   * Extracted to reuse when approving a pending update.
   */
  private async applyLifecycleChanges(
    event: { id: string; lifecycleStatus: EventLifecycleStatus },
    updateType: EventUpdateType,
  ): Promise<void> {
    if (
      updateType !== EventUpdateType.EVENT_CREATED &&
      (event.lifecycleStatus === EventLifecycleStatus.AWAITING_START ||
        event.lifecycleStatus === EventLifecycleStatus.PENDING)
    ) {
      event.lifecycleStatus = EventLifecycleStatus.ONGOING;
      await this.eventsRepository.save(event as any);
    }

    if (updateType === EventUpdateType.EVENT_END) {
      event.lifecycleStatus = EventLifecycleStatus.COMPLETED;
      await this.eventsRepository.save(event as any);
    }
  }

  async findByEvent(eventId: string): Promise<EventUpdate[]> {
    return this.eventUpdatesRepository.find({
      where: { eventId },
      order: { updateTime: 'DESC' },
      relations: ['createdBy'],
    });
  }

  async findOne(id: string): Promise<EventUpdate> {
    const eventUpdate = await this.eventUpdatesRepository.findOne({
      where: { id },
      relations: ['event', 'createdBy'],
    });

    if (!eventUpdate) {
      throw new NotFoundException(`Update with ID ${id} not found`);
    }

    return eventUpdate;
  }

  async update(
    id: string,
    updateDto: UpdateEventUpdateDto,
    userId: string,
    userRole?: UserRole,
  ): Promise<EventUpdate> {
    const eventUpdate = await this.findOne(id);

    const isModerator =
      userRole &&
      [UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3].includes(userRole);

    // Moderators can edit any update; regular users only their own within 15 min
    if (!isModerator) {
      if (eventUpdate.createdById !== userId) {
        throw new ForbiddenException(
          'Solo puedes editar tus propias actualizaciones',
        );
      }

      // 15-minute edit window
      const now = new Date();
      const createdAt = new Date(eventUpdate.createdAt);
      const minutesSinceCreation =
        (now.getTime() - createdAt.getTime()) / (1000 * 60);

      if (minutesSinceCreation > 15) {
        throw new ForbiddenException(
          'Solo puedes editar una actualización dentro de los primeros 15 minutos',
        );
      }
    }

    if (updateDto.updateTime) {
      eventUpdate.updateTime = new Date(updateDto.updateTime);
    }

    Object.assign(eventUpdate, {
      ...updateDto,
      ...(updateDto.updateTime
        ? { updateTime: new Date(updateDto.updateTime) }
        : {}),
    });

    return this.eventUpdatesRepository.save(eventUpdate);
  }

  async remove(id: string, userId: string): Promise<void> {
    const eventUpdate = await this.findOne(id);

    // Only the creator can delete
    if (eventUpdate.createdById !== userId) {
      throw new ForbiddenException('You can only delete your own updates');
    }

    await this.eventUpdatesRepository.remove(eventUpdate);
  }

  async updateStatus(
    updateId: string,
    status: EventUpdateStatus,
  ): Promise<EventUpdate> {
    const eventUpdate = await this.findOne(updateId);

    eventUpdate.status = status;
    const savedUpdate = await this.eventUpdatesRepository.save(eventUpdate);

    // If approving, apply the lifecycle changes that were skipped at creation
    if (status === EventUpdateStatus.APPROVED) {
      const event = await this.eventsRepository.findOne({
        where: { id: eventUpdate.eventId },
      });
      if (event) {
        await this.applyLifecycleChanges(event, eventUpdate.updateType);
      }
    }

    return savedUpdate;
  }

  async findPendingUpdates(query: {
    page?: number;
    limit?: number;
    search?: string;
    city?: string;
    locality?: string;
    updateType?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<any> {
    const {
      page = 1,
      limit = 10,
      search,
      city,
      locality,
      updateType,
      dateFrom,
      dateTo,
    } = query;
    const skip = (page - 1) * limit;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const qb = this.eventUpdatesRepository
      .createQueryBuilder('eu')
      .leftJoinAndSelect('eu.event', 'event')
      .leftJoinAndSelect('event.city', 'city')
      .leftJoinAndSelect('event.locality', 'locality')
      .leftJoinAndSelect('eu.createdBy', 'createdBy')
      .where(
        '(eu.status = :pending OR (eu.status IN (:...resolved) AND eu.createdAt >= :startOfToday))',
        {
          pending: EventUpdateStatus.PENDING,
          resolved: [EventUpdateStatus.APPROVED, EventUpdateStatus.REJECTED],
          startOfToday,
        },
      );

    if (search) {
      qb.andWhere('(event.title LIKE :search OR eu.notes LIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (city) {
      const cityIds = city.includes(',')
        ? city.split(',').map((c) => c.trim())
        : [city];
      qb.andWhere('event.cityId IN (:...cityIds)', { cityIds });
    }
    if (locality) {
      qb.andWhere('event.localityId = :locality', { locality });
    }
    if (updateType) {
      qb.andWhere('eu.updateType = :updateType', { updateType });
    }
    if (dateFrom && dateTo) {
      qb.andWhere('event.eventDate BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
      });
    } else if (dateFrom) {
      qb.andWhere('event.eventDate >= :dateFrom', {
        dateFrom: new Date(dateFrom),
      });
    } else if (dateTo) {
      qb.andWhere('event.eventDate <= :dateTo', { dateTo: new Date(dateTo) });
    }

    qb.addSelect(
      "CASE WHEN eu.status = 'pending' THEN 0 ELSE 1 END",
      'status_order',
    )
      .orderBy('status_order', 'ASC')
      .addOrderBy('eu.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    const pendingCount = await this.eventUpdatesRepository.count({
      where: { status: EventUpdateStatus.PENDING },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        pendingCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getPendingUpdatesCount(): Promise<{ count: number }> {
    const count = await this.eventUpdatesRepository.count({
      where: { status: EventUpdateStatus.PENDING },
    });
    return { count };
  }

  async getEventStats(eventId: string): Promise<any> {
    const updates = await this.eventUpdatesRepository.find({
      where: { eventId, status: EventUpdateStatus.APPROVED },
      order: { updateTime: 'DESC' },
      relations: ['createdBy'],
    });

    if (updates.length === 0) {
      return {
        totalUpdates: 0,
        maxAttendees: 0,
        minAttendees: 0,
        avgAttendees: 0,
        policePresenceDuration: 0,
        streetClosureDuration: 0,
        timeline: [],
      };
    }

    const attendeeCounts = updates
      .filter((u) => u.attendeeCount !== null && u.attendeeCount !== undefined)
      .map((u) => u.attendeeCount);

    const policeEvents = updates.filter((u) => u.policePresence);
    const streetClosureEvents = updates.filter((u) => u.streetClosure);

    return {
      totalUpdates: updates.length,
      maxAttendees: attendeeCounts.length > 0 ? Math.max(...attendeeCounts) : 0,
      minAttendees: attendeeCounts.length > 0 ? Math.min(...attendeeCounts) : 0,
      avgAttendees:
        attendeeCounts.length > 0
          ? Math.round(
              attendeeCounts.reduce((a, b) => a + b, 0) / attendeeCounts.length,
            )
          : 0,
      policePresenceOccurrences: policeEvents.length,
      streetClosureOccurrences: streetClosureEvents.length,
      firstUpdate: updates[updates.length - 1]?.updateTime,
      lastUpdate: updates[0]?.updateTime,
      timeline: updates.map((u) => ({
        time: u.updateTime,
        type: u.updateType,
        attendees: u.attendeeCount,
        notes: u.notes,
        policePresence: u.policePresence,
        streetClosure: u.streetClosure,
      })),
    };
  }

  async getLatestUpdatesForEvents(
    eventIds: string[],
  ): Promise<Record<string, EventUpdate>> {
    if (eventIds.length === 0) return {};

    const latestUpdates = await this.eventUpdatesRepository
      .createQueryBuilder('eu')
      .leftJoinAndSelect('eu.createdBy', 'createdBy')
      .where('eu.eventId IN (:...eventIds)', { eventIds })
      .andWhere('eu.status = :status', { status: EventUpdateStatus.APPROVED })
      .andWhere(
        'eu.id = (' +
          'SELECT eu2.id FROM event_updates eu2 ' +
          'WHERE eu2.`eventId` = eu.`eventId` ' +
          "AND eu2.status = 'approved' " +
          'ORDER BY eu2.`updateTime` DESC LIMIT 1' +
          ')',
      )
      .getMany();

    const result: Record<string, EventUpdate> = {};
    for (const update of latestUpdates) {
      result[update.eventId] = update;
    }
    return result;
  }

  async getTimelineForChart(eventId: string): Promise<any> {
    const updates = await this.eventUpdatesRepository.find({
      where: {
        eventId,
        updateType: Not(EventUpdateType.EVENT_CREATED),
        status: EventUpdateStatus.APPROVED,
      },
      order: { updateTime: 'ASC' },
      select: [
        'id',
        'updateTime',
        'attendeeCount',
        'policePresence',
        'streetClosure',
        'tireBurning',
        'notes',
        'updateType',
      ],
    });

    return {
      eventId,
      dataPoints: updates.map((update) => ({
        timestamp: update.updateTime,
        time: update.updateTime.toISOString(),
        attendees: update.attendeeCount ?? 0,
        policePresence: update.policePresence,
        streetClosure: update.streetClosure,
        tireBurning: update.tireBurning,
        type: update.updateType,
        notes: update.notes || '',
      })),
      totalDataPoints: updates.length,
      duration:
        updates.length > 1
          ? {
              start: updates[0].updateTime,
              end: updates[updates.length - 1].updateTime,
              durationMinutes: Math.round(
                (updates[updates.length - 1].updateTime.getTime() -
                  updates[0].updateTime.getTime()) /
                  (1000 * 60),
              ),
            }
          : null,
    };
  }
}
