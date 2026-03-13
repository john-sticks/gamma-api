import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City } from './entities/city.entity';
import { Locality } from './entities/locality.entity';
import { CitiesRepository } from './repositories/cities.repository';
import { LocalitiesRepository } from './repositories/localities.repository';
import { CitiesService } from './services/cities.service';
import { CitiesController } from './controllers/cities.controller';

@Module({
  imports: [TypeOrmModule.forFeature([City, Locality])],
  controllers: [CitiesController],
  providers: [CitiesRepository, LocalitiesRepository, CitiesService],
  exports: [CitiesService, CitiesRepository, LocalitiesRepository],
})
export class CitiesModule {}
