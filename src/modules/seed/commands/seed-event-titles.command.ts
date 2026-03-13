import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { EventTitlesRepository } from '../../events/repositories/event-titles.repository';

@Injectable()
export class SeedEventTitlesCommand {
  constructor(private readonly eventTitlesRepository: EventTitlesRepository) {}

  @Command({
    command: 'seed:event-titles',
    describe: 'Seed predefined event titles',
  })
  async action(): Promise<void> {
    console.log('🌱 Seeding event titles...');

    const existing = await this.eventTitlesRepository.find();
    if (existing.length > 0) {
      console.log(
        `⚠️  Event titles already seeded (${existing.length} found). Skipping...`,
      );
      return;
    }

    const titles = [
      'Manifestación por reclamo salarial',
      'Manifestación por reclamo de justicia',
      'Manifestación por reclamo de vivienda',
      'Manifestación por reclamo de servicios públicos',
      'Manifestación por reclamo de seguridad',
      'Marcha por derechos humanos',
      'Marcha por derechos laborales',
      'Marcha sindical',
      'Marcha estudiantil',
      'Marcha ambiental',
      'Concentración gremial',
      'Concentración política',
      'Concentración vecinal',
      'Asamblea vecinal',
      'Asamblea gremial',
      'Asamblea estudiantil',
      'Corte de ruta',
      'Corte de calle',
      'Piquete',
      'Acampe',
      'Vigilia',
      'Abrazo simbólico',
      'Olla popular',
      'Tractorazo',
      'Bocinazo',
      'Banderazo',
      'Cacerolazo',
    ];

    const entities = titles.map((name, index) =>
      this.eventTitlesRepository.create({ name, sortOrder: index }),
    );
    await this.eventTitlesRepository.save(entities);

    console.log(`✅ Successfully seeded ${entities.length} event titles`);
  }
}
