import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventsService } from './services/events.service';
import { EventUpdatesService } from './services/event-updates.service';
import { GeoValidationService } from './services/geo-validation.service';
import { EventTitlesService } from './services/event-titles.service';
import { ExportService } from './services/export.service';
import { LifecycleSchedulerService } from './services/lifecycle-scheduler.service';
import { EventsController } from './controllers/events.controller';
import { EventTitlesController } from './controllers/event-titles.controller';
import { EventsRepository } from './repositories/events.repository';
import { EventUpdatesRepository } from './repositories/event-updates.repository';
import { EventTitlesRepository } from './repositories/event-titles.repository';
import { Event } from './entities/event.entity';
import { EventUpdate } from './entities/event-update.entity';
import { EventTitle } from './entities/event-title.entity';
import { CitiesModule } from '../cities/cities.module';
import { RequirementsModule } from '../requirements/requirements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventUpdate, EventTitle]),
    CitiesModule,
    RequirementsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [EventsController, EventTitlesController],
  providers: [
    EventsService,
    EventUpdatesService,
    GeoValidationService,
    EventTitlesService,
    ExportService,
    LifecycleSchedulerService,
    EventsRepository,
    EventUpdatesRepository,
    EventTitlesRepository,
  ],
  exports: [
    EventsService,
    EventUpdatesService,
    EventTitlesService,
    EventTitlesRepository,
  ],
})
export class EventsModule {}
