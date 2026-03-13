import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { City } from '../entities/city.entity';

@Injectable()
export class CitiesRepository extends Repository<City> {
  constructor(private dataSource: DataSource) {
    super(City, dataSource.createEntityManager());
  }
}
