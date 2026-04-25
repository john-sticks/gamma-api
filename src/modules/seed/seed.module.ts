import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { CreateSuperAdminCommand } from './commands/create-super-admin.command';
import { SeedCitiesCommand } from './commands/seed-cities.command';
import { SeedEventTitlesCommand } from './commands/seed-event-titles.command';
import { SeedLocalitiesCommand } from './commands/seed-localities.command';
import { SeedAllCommand } from './commands/seed-all.command';
import { UsersModule } from '../users/users.module';
import { CitiesModule } from '../cities/cities.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [CommandModule, UsersModule, CitiesModule, EventsModule],
  providers: [
    CreateSuperAdminCommand,
    SeedCitiesCommand,
    SeedEventTitlesCommand,
    SeedLocalitiesCommand,
    SeedAllCommand,
  ],
})
export class SeedModule {}
