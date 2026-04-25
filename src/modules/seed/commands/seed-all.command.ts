import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { CreateSuperAdminCommand } from './create-super-admin.command';
import { SeedCitiesCommand } from './seed-cities.command';
import { SeedLocalitiesCommand } from './seed-localities.command';
import { SeedEventTitlesCommand } from './seed-event-titles.command';

@Injectable()
export class SeedAllCommand {
  constructor(
    private readonly createSuperAdminCommand: CreateSuperAdminCommand,
    private readonly seedCitiesCommand: SeedCitiesCommand,
    private readonly seedLocalitiesCommand: SeedLocalitiesCommand,
    private readonly seedEventTitlesCommand: SeedEventTitlesCommand,
  ) {}

  @Command({
    command: 'seed:all',
    describe:
      'Run all seeds in order: superadmin, cities, localities, event-titles',
  })
  async action(): Promise<void> {
    console.log('🚀 Running all seeds...\n');

    await this.createSuperAdminCommand.create();
    console.log('');

    await this.seedCitiesCommand.action();
    console.log('');

    await this.seedLocalitiesCommand.action();
    console.log('');

    await this.seedEventTitlesCommand.action();
    console.log('');

    console.log('🎉 All seeds completed!');
  }
}
