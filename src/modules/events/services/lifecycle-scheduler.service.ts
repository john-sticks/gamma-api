import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventsRepository } from '../repositories/events.repository';
import { EventStatus, EventLifecycleStatus } from '../entities/event.entity';
import { LessThanOrEqual, In } from 'typeorm';

@Injectable()
export class LifecycleSchedulerService {
  private readonly logger = new Logger(LifecycleSchedulerService.name);

  constructor(private readonly eventsRepository: EventsRepository) {}

  /**
   * Corre cada minuto.
   * Transiciona eventos aprobados cuya fecha ya pasó de 'pending' → 'awaiting_start'.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async transitionPendingToAwaitingStart(): Promise<void> {
    const now = new Date();

    const events = await this.eventsRepository.find({
      where: {
        status: EventStatus.APPROVED,
        lifecycleStatus: EventLifecycleStatus.PENDING,
        eventDate: LessThanOrEqual(now),
      },
    });

    if (events.length === 0) return;

    for (const event of events) {
      event.lifecycleStatus = EventLifecycleStatus.AWAITING_START;
    }

    await this.eventsRepository.save(events);
    this.logger.log(
      `Transicionados ${events.length} evento(s) de pending → awaiting_start`,
    );
  }
}
