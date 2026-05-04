import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { NotificationsRepository } from '../repositories/notifications.repository';
import { UsersRepository } from '../../users/repositories/users.repository';
import { EventsService } from '../../events/services/events.service';
import { EventUpdatesService } from '../../events/services/event-updates.service';
import { CreateCancellationRequestDto, QueryNotificationDto } from '../dto';
import {
  Notification,
  NotificationType,
  NotificationStatus,
} from '../entities/notification.entity';
import { EventLifecycleStatus } from '../../events/entities/event.entity';
import { EventUpdateType } from '../../events/entities/event-update.entity';
import { PaginatedResponse } from '../../common/dto';
import { UserRole } from '../../common/types/roles';
import { User } from '../../users/entities/user.entity';
import { In } from 'typeorm';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly eventsService: EventsService,
    private readonly eventUpdatesService: EventUpdatesService,
  ) {}

  async findMyNotifications(
    userId: string,
    query: QueryNotificationDto,
  ): Promise<PaginatedResponse<Notification>> {
    const { page = 1, limit = 10, status, type } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = { recipientId: userId };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [data, total] = await this.notificationsRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['sender', 'event', 'requirement'],
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

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count =
      await this.notificationsRepository.countUnreadByRecipient(userId);
    return { count };
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id, recipientId: userId },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    notification.status = NotificationStatus.READ;
    return this.notificationsRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { recipientId: userId, status: NotificationStatus.UNREAD },
      { status: NotificationStatus.READ },
    );
  }

  async createCancellationRequest(
    dto: CreateCancellationRequestDto,
    user: User,
  ): Promise<void> {
    const event = await this.eventsService.findOne(dto.eventId);

    if (event.createdById !== user.id) {
      throw new ForbiddenException(
        'Solo puedes solicitar cancelación de tus propios eventos',
      );
    }

    if (event.lifecycleStatus === EventLifecycleStatus.CANCELLED) {
      throw new BadRequestException('El evento ya está cancelado');
    }

    if (event.lifecycleStatus === EventLifecycleStatus.PENDING_CANCELLATION) {
      throw new BadRequestException(
        'Ya existe una solicitud de cancelación pendiente para este evento',
      );
    }

    // Notify all active moderators (L3) and admins (L1/L2)
    // L1, L2, L3 are global users - they don't have city restrictions
    const recipients = await this.usersRepository.find({
      where: [
        { role: UserRole.LEVEL_1, isActive: true },
        { role: UserRole.LEVEL_2, isActive: true },
        { role: UserRole.LEVEL_3, isActive: true },
      ],
    });

    if (recipients.length === 0) {
      throw new BadRequestException(
        'No hay moderadores disponibles para procesar tu solicitud',
      );
    }

    const reason = dto.reason ? ` Razón: ${dto.reason}` : '';

    const message = `${user.firstName} ${user.lastName} solicita la cancelación del evento "${event.title}".${reason}`;

    const notifications = recipients.map((recipient) =>
      this.notificationsRepository.create({
        type: NotificationType.CANCELLATION_REQUEST,
        message,
        status: NotificationStatus.UNREAD,
        actionable: true,
        senderId: user.id,
        recipientId: recipient.id,
        eventId: event.id,
      }),
    );

    await this.notificationsRepository.save(notifications);

    // Mark event as pending cancellation
    await this.eventsService.update(
      event.id,
      { lifecycleStatus: EventLifecycleStatus.PENDING_CANCELLATION },
      user.id,
      UserRole.LEVEL_3, // Use moderator role to bypass permission checks
    );
  }

  async approveCancellation(
    notificationId: string,
    moderatorId: string,
  ): Promise<void> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId },
      relations: ['sender', 'event'],
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    if (!notification.actionable) {
      throw new BadRequestException('Esta notificación no es accionable');
    }

    if (notification.type !== NotificationType.CANCELLATION_REQUEST) {
      throw new BadRequestException(
        'Esta notificación no es una solicitud de cancelación',
      );
    }

    if (
      notification.status === NotificationStatus.RESOLVED ||
      notification.status === NotificationStatus.REJECTED
    ) {
      throw new BadRequestException('Esta solicitud ya fue procesada');
    }

    // Cancel the event
    await this.eventsService.update(
      notification.eventId,
      { lifecycleStatus: EventLifecycleStatus.CANCELLED },
      moderatorId,
      UserRole.LEVEL_3,
    );

    // Mark this and all cancellation_request notifications for the same event as resolved
    await this.notificationsRepository.update(
      {
        eventId: notification.eventId,
        type: NotificationType.CANCELLATION_REQUEST,
        status: In([NotificationStatus.UNREAD, NotificationStatus.READ]),
      },
      { status: NotificationStatus.RESOLVED },
    );

    // Send approval notification to the original sender
    const approvalNotification = this.notificationsRepository.create({
      type: NotificationType.CANCELLATION_APPROVED,
      message: `Tu solicitud de cancelación para el evento "${notification.event?.title || 'eliminado'}" ha sido aprobada.`,
      status: NotificationStatus.UNREAD,
      actionable: false,
      senderId: moderatorId,
      recipientId: notification.senderId,
      eventId: notification.eventId,
    });

    await this.notificationsRepository.save(approvalNotification);
  }

  async rejectCancellation(
    notificationId: string,
    moderatorId: string,
  ): Promise<void> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId },
      relations: ['sender', 'event'],
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    if (!notification.actionable) {
      throw new BadRequestException('Esta notificación no es accionable');
    }

    if (notification.type !== NotificationType.CANCELLATION_REQUEST) {
      throw new BadRequestException(
        'Esta notificación no es una solicitud de cancelación',
      );
    }

    if (
      notification.status === NotificationStatus.RESOLVED ||
      notification.status === NotificationStatus.REJECTED
    ) {
      throw new BadRequestException('Esta solicitud ya fue procesada');
    }

    // Mark ALL cancellation_request notifications for this event as rejected
    await this.notificationsRepository.update(
      {
        eventId: notification.eventId,
        type: NotificationType.CANCELLATION_REQUEST,
        status: In([NotificationStatus.UNREAD, NotificationStatus.READ]),
      },
      { status: NotificationStatus.REJECTED },
    );

    // Revert the event lifecycle status
    if (notification.eventId) {
      const event = await this.eventsService.findOne(notification.eventId);
      if (event.lifecycleStatus === EventLifecycleStatus.PENDING_CANCELLATION) {
        // Check if the event had real updates (not just EVENT_CREATED) to determine if it was ongoing
        const updates = await this.eventUpdatesService.findByEvent(event.id);
        const hasRealUpdates = updates.some(
          (u) => u.updateType !== EventUpdateType.EVENT_CREATED,
        );

        let newStatus: EventLifecycleStatus;
        if (hasRealUpdates) {
          // Event was ongoing before cancellation request
          newStatus = EventLifecycleStatus.ONGOING;
        } else {
          const now = new Date();
          const eventDate = new Date(event.eventDate);
          newStatus =
            eventDate > now
              ? EventLifecycleStatus.PENDING
              : EventLifecycleStatus.AWAITING_START;
        }

        await this.eventsService.update(
          event.id,
          { lifecycleStatus: newStatus },
          moderatorId,
          UserRole.LEVEL_3,
        );
      }
    }

    // Send rejection notification to the original sender
    const rejectionNotification = this.notificationsRepository.create({
      type: NotificationType.CANCELLATION_REJECTED,
      message: `Tu solicitud de cancelación para el evento "${notification.event?.title || 'eliminado'}" ha sido rechazada.`,
      status: NotificationStatus.UNREAD,
      actionable: false,
      senderId: moderatorId,
      recipientId: notification.senderId,
      eventId: notification.eventId,
    });

    await this.notificationsRepository.save(rejectionNotification);
  }
}
