import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Locality } from '../entities/locality.entity';

@Injectable()
export class LocalitiesRepository extends Repository<Locality> {
  constructor(private dataSource: DataSource) {
    super(Locality, dataSource.createEntityManager());
  }
}
