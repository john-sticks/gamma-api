import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequirementsController } from './controllers/requirements.controller';
import { RequirementsService } from './services/requirements.service';
import { RequirementsLifecycleSchedulerService } from './services/requirements-lifecycle-scheduler.service';
import { RequirementsRepository } from './repositories/requirements.repository';
import { RequirementResponsesRepository } from './repositories/requirement-responses.repository';
import { Requirement } from './entities/requirement.entity';
import { RequirementResponse } from './entities/requirement-response.entity';
import { UsersModule } from '../users/users.module';
import { NotificationsRepository } from '../notifications/repositories/notifications.repository';
import { Notification } from '../notifications/entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Requirement, RequirementResponse, Notification]),
    UsersModule,
  ],
  controllers: [RequirementsController],
  providers: [
    RequirementsService,
    RequirementsLifecycleSchedulerService,
    RequirementsRepository,
    RequirementResponsesRepository,
    NotificationsRepository,
  ],
  exports: [RequirementsService],
})
export class RequirementsModule {}
