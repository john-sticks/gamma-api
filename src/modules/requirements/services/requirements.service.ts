import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { In, DataSource } from 'typeorm';
import {
  Event,
  EventLifecycleStatus,
  EventStatus,
} from '../../events/entities/event.entity';
import { RequirementsRepository } from '../repositories/requirements.repository';
import { RequirementResponsesRepository } from '../repositories/requirement-responses.repository';
import { UsersRepository } from '../../users/repositories/users.repository';
import { NotificationsRepository } from '../../notifications/repositories/notifications.repository';
import {
  CreateRequirementDto,
  CreateRequirementResponseDto,
  AmendRequirementResponseDto,
  QueryRequirementDto,
} from '../dto';
import { Requirement, RequirementStatus } from '../entities/requirement.entity';
import {
  RequirementResponse,
  RequirementResponseType,
} from '../entities/requirement-response.entity';
import {
  NotificationType,
  NotificationStatus,
} from '../../notifications/entities/notification.entity';
import { UserRole } from '../../common/types/roles';
import { User } from '../../users/entities/user.entity';
import { PaginatedResponse } from '../../common/dto';

@Injectable()
export class RequirementsService {
  constructor(
    private readonly requirementsRepository: RequirementsRepository,
    private readonly responsesRepository: RequirementResponsesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateRequirementDto, creator: User): Promise<Requirement> {
    const requirement = this.requirementsRepository.create({
      title: dto.title,
      description: dto.description,
      deadline: new Date(dto.deadline),
      targetAll: dto.targetAll ?? false,
      createdById: creator.id,
    });

    const savedRequirement =
      await this.requirementsRepository.save(requirement);

    // Find target L4 users
    let targetUsers: User[];
    if (dto.targetAll) {
      targetUsers = await this.usersRepository.find({
        where: { role: UserRole.LEVEL_4, isActive: true },
      });
    } else {
      targetUsers = await this.usersRepository.find({
        where: {
          id: In(dto.targetUserIds!),
          role: UserRole.LEVEL_4,
          isActive: true,
        },
      });
    }

    // Assign targetUsers relation
    savedRequirement.targetUsers = targetUsers;
    await this.requirementsRepository.save(savedRequirement);

    // Send notification to each target user
    if (targetUsers.length > 0) {
      const deadline = new Date(dto.deadline).toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const message = `Nuevo requerimiento: "${dto.title}". Plazo de respuesta: ${deadline}.`;
      const notifications = targetUsers.map((user) =>
        this.notificationsRepository.create({
          type: NotificationType.REQUIREMENT_CREATED,
          message,
          status: NotificationStatus.UNREAD,
          actionable: false,
          senderId: creator.id,
          recipientId: user.id,
          requirementId: savedRequirement.id,
        }),
      );
      await this.notificationsRepository.save(notifications);
    }

    return this.findOne(savedRequirement.id);
  }

  async findAll(query: QueryRequirementDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const qb = this.requirementsRepository
      .createQueryBuilder('req')
      .leftJoinAndSelect('req.createdBy', 'createdBy')
      .leftJoinAndSelect('req.targetUsers', 'targetUsers')
      .skip(skip)
      .take(limit)
      .addSelect(
        `CASE req.status
          WHEN 'active' THEN 1
          ELSE 2
        END`,
        'status_order',
      )
      .orderBy('status_order', 'ASC')
      .addOrderBy('req.createdAt', 'DESC');

    if (status) {
      qb.andWhere('req.status = :status', { status });
    }

    const [data, total] = await qb.getManyAndCount();

    // Enrich with notification read summary
    const requirementIds = data.map((r) => r.id);
    const notifications =
      requirementIds.length > 0
        ? await this.notificationsRepository.find({
            where: {
              requirementId: In(requirementIds),
              type: NotificationType.REQUIREMENT_CREATED,
            },
            select: ['requirementId', 'recipientId', 'status'],
          })
        : [];

    const readSummaryMap = new Map<string, { seen: number; total: number }>();
    for (const n of notifications) {
      const entry = readSummaryMap.get(n.requirementId) ?? {
        seen: 0,
        total: 0,
      };
      entry.total += 1;
      if (n.status !== NotificationStatus.UNREAD) entry.seen += 1;
      readSummaryMap.set(n.requirementId, entry);
    }

    const enriched = data.map((r) => ({
      ...r,
      readSummary: readSummaryMap.get(r.id) ?? { seen: 0, total: 0 },
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data: enriched,
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

  async findNotificationReads(
    requirementId: string,
  ): Promise<
    { userId: string; firstName: string; lastName: string; seen: boolean }[]
  > {
    await this.findOne(requirementId);
    const notifications = await this.notificationsRepository.find({
      where: { requirementId, type: NotificationType.REQUIREMENT_CREATED },
      relations: ['recipient'],
    });
    return notifications.map((n) => {
      const recipient = n.recipient as User | undefined;
      return {
        userId: n.recipientId,
        firstName: recipient?.firstName ?? '',
        lastName: recipient?.lastName ?? '',
        seen: n.status !== NotificationStatus.UNREAD,
      };
    });
  }

  async findMy(
    user: User,
    query: QueryRequirementDto,
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const qb = this.requirementsRepository
      .createQueryBuilder('req')
      .leftJoinAndSelect('req.createdBy', 'createdBy')
      .leftJoinAndSelect('req.targetUsers', 'targetUsers')
      .where('(req.targetAll = true OR targetUsers.id = :userId)', {
        userId: user.id,
      })
      .skip(skip)
      .take(limit)
      .addSelect(
        `CASE req.status
          WHEN 'active' THEN 1
          ELSE 2
        END`,
        'status_order',
      )
      .orderBy('status_order', 'ASC')
      .addOrderBy('req.deadline', 'ASC');

    if (status) {
      qb.andWhere('req.status = :status', { status });
    }

    const [requirements, total] = await qb.getManyAndCount();

    // Enrich with user's own response
    const requirementIds = requirements.map((r) => r.id);
    const myResponses =
      requirementIds.length > 0
        ? await this.responsesRepository.find({
            where: {
              requirementId: In(requirementIds),
              respondedById: user.id,
            },
          })
        : [];

    const responseMap = new Map(myResponses.map((r) => [r.requirementId, r]));

    const enriched = requirements.map((req) => ({
      ...req,
      myResponse: responseMap.get(req.id) ?? null,
    }));

    const totalPages = Math.ceil(total / limit);
    return {
      data: enriched,
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

  async findMyPendingCount(user: User): Promise<{ count: number }> {
    const activeRequirements = await this.requirementsRepository
      .createQueryBuilder('req')
      .leftJoin('req.targetUsers', 'targetUsers')
      .select('req.id')
      .where('req.status = :status', { status: RequirementStatus.ACTIVE })
      .andWhere('(req.targetAll = true OR targetUsers.id = :userId)', {
        userId: user.id,
      })
      .getMany();

    if (activeRequirements.length === 0) return { count: 0 };

    const requirementIds = activeRequirements.map((r) => r.id);
    const respondedCount = await this.responsesRepository.count({
      where: { requirementId: In(requirementIds), respondedById: user.id },
    });

    return { count: requirementIds.length - respondedCount };
  }

  async findOne(id: string): Promise<Requirement> {
    const requirement = await this.requirementsRepository
      .createQueryBuilder('req')
      .leftJoinAndSelect('req.createdBy', 'createdBy')
      .leftJoinAndSelect('req.targetUsers', 'targetUsers')
      .where('req.id = :id', { id })
      .getOne();

    if (!requirement) {
      throw new NotFoundException(`Requerimiento con ID ${id} no encontrado`);
    }

    return requirement;
  }

  async findResponses(requirementId: string): Promise<RequirementResponse[]> {
    await this.findOne(requirementId);
    return this.responsesRepository.findByRequirement(requirementId);
  }

  async respond(
    requirementId: string,
    dto: CreateRequirementResponseDto,
    user: User,
  ): Promise<RequirementResponse> {
    const requirement = await this.findOne(requirementId);

    if (requirement.status !== RequirementStatus.ACTIVE) {
      throw new BadRequestException('Este requerimiento ya no está activo');
    }

    if (new Date() > new Date(requirement.deadline)) {
      throw new BadRequestException('El plazo de respuesta ha vencido');
    }

    // Check user is a target
    if (!requirement.targetAll) {
      const isTarget = requirement.targetUsers.some((u) => u.id === user.id);
      if (!isTarget) {
        throw new ForbiddenException(
          'No tenés permiso para responder a este requerimiento',
        );
      }
    }

    const existing = await this.responsesRepository.findUserResponse(
      requirementId,
      user.id,
    );
    if (existing) {
      throw new ConflictException('Ya respondiste a este requerimiento');
    }

    const response = this.responsesRepository.create({
      requirementId,
      respondedById: user.id,
      type: dto.type,
      notes: dto.notes ?? null,
    });

    const saved = await this.responsesRepository.save(response);

    return saved;
  }

  async amend(
    requirementId: string,
    dto: AmendRequirementResponseDto,
    user: User,
  ): Promise<RequirementResponse> {
    const requirement = await this.findOne(requirementId);

    const isOverdue = new Date() > new Date(requirement.deadline);
    const canAmend =
      requirement.status === RequirementStatus.EXPIRED ||
      (requirement.status === RequirementStatus.ACTIVE && isOverdue);

    if (!canAmend) {
      throw new BadRequestException(
        'Solo se puede ampliar la respuesta en requerimientos vencidos',
      );
    }

    const existing = await this.responsesRepository.findUserResponse(
      requirementId,
      user.id,
    );

    if (!existing) {
      // No prior response — create a positive one directly
      const response = this.responsesRepository.create({
        requirementId,
        respondedById: user.id,
        type: RequirementResponseType.POSITIVE,
        notes: dto.notes ?? null,
      });
      return this.responsesRepository.save(response);
    }

    if (existing.type === RequirementResponseType.POSITIVE) {
      throw new BadRequestException('Tu respuesta ya es positiva');
    }

    existing.type = RequirementResponseType.POSITIVE;
    existing.notes = dto.notes ?? existing.notes;
    return this.responsesRepository.save(existing);
  }

  async close(id: string): Promise<Requirement> {
    const requirement = await this.findOne(id);

    if (requirement.status === RequirementStatus.CLOSED) {
      throw new BadRequestException('El requerimiento ya está cerrado');
    }

    requirement.status = RequirementStatus.CLOSED;
    return this.requirementsRepository.save(requirement);
  }

  async void(id: string, user: User): Promise<Requirement> {
    const requirement = await this.findOne(id);

    if (requirement.status === RequirementStatus.VOIDED) {
      throw new BadRequestException(
        'El requerimiento ya fue dejado sin efecto',
      );
    }

    requirement.status = RequirementStatus.VOIDED;
    const saved = await this.requirementsRepository.save(requirement);

    // Cancel all approved events linked to this requirement
    await this.dataSource
      .createQueryBuilder()
      .update(Event)
      .set({ lifecycleStatus: EventLifecycleStatus.CANCELLED })
      .where('requirementId = :requirementId', {
        requirementId: requirement.id,
      })
      .andWhere('status = :status', { status: EventStatus.APPROVED })
      .andWhere('lifecycleStatus NOT IN (:...excluded)', {
        excluded: [
          EventLifecycleStatus.CANCELLED,
          EventLifecycleStatus.COMPLETED,
        ],
      })
      .execute();

    // Notify all target users
    const targetUsers = requirement.targetAll
      ? await this.usersRepository.find({
          where: { role: UserRole.LEVEL_4, isActive: true },
        })
      : requirement.targetUsers;

    if (targetUsers.length > 0) {
      const message = `El requerimiento "${requirement.title}" fue dejado sin efecto.`;
      const notifications = targetUsers.map((target) =>
        this.notificationsRepository.create({
          type: NotificationType.REQUIREMENT_VOIDED,
          message,
          status: NotificationStatus.UNREAD,
          actionable: false,
          senderId: user.id,
          recipientId: target.id,
          requirementId: requirement.id,
        }),
      );
      await this.notificationsRepository.save(notifications);
    }

    return saved;
  }

  async expireOverdue(): Promise<void> {
    const now = new Date();
    await this.requirementsRepository
      .createQueryBuilder()
      .update(Requirement)
      .set({ status: RequirementStatus.EXPIRED })
      .where('status = :status', { status: RequirementStatus.ACTIVE })
      .andWhere('deadline < :now', { now })
      .execute();
  }
}
