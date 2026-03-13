import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { CitiesRepository } from '../../cities/repositories/cities.repository';
import { LocalitiesRepository } from '../../cities/repositories/localities.repository';
import * as localitiesData from '../data/localities.json';

@Injectable()
export class SeedLocalitiesCommand {
  constructor(
    private readonly citiesRepository: CitiesRepository,
    private readonly localitiesRepository: LocalitiesRepository,
  ) {}

  @Command({
    command: 'seed:localities',
    describe: 'Seed localities data for all partidos',
  })
  async action(): Promise<void> {
    console.log('🌱 Seeding localities...');

    const existing = await this.localitiesRepository.count();
    if (existing > 0) {
      console.log(
        `⚠️  Localities already seeded (${existing} found). Skipping...`,
      );
      return;
    }

    const cities = await this.citiesRepository.find();
    if (cities.length === 0) {
      console.log('❌ No cities found. Run seed:cities first.');
      return;
    }

    const cityBySlug = new Map(cities.map((c) => [c.slug, c]));
    let totalCreated = 0;

    const data = localitiesData as Record<string, string[]>;

    for (const [slug, localityNames] of Object.entries(data)) {
      const city = cityBySlug.get(slug);
      if (!city) {
        console.log(`⚠️  City with slug "${slug}" not found, skipping...`);
        continue;
      }

      const localities = localityNames.map((name) =>
        this.localitiesRepository.create({
          name,
          slug: name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, ''),
          cityId: city.id,
        }),
      );

      await this.localitiesRepository.save(localities);
      totalCreated += localities.length;
    }

    console.log(`✅ Successfully seeded ${totalCreated} localities`);
  }
}
