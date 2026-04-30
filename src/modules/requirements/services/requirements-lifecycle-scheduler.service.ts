import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RequirementsService } from './requirements.service';

@Injectable()
export class RequirementsLifecycleSchedulerService {
  private readonly logger = new Logger(
    RequirementsLifecycleSchedulerService.name,
  );

  constructor(private readonly requirementsService: RequirementsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireOverdue(): Promise<void> {
    await this.requirementsService.expireOverdue();
    this.logger.log('Requerimientos vencidos actualizados a expired');
  }
}
