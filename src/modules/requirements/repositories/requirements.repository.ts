import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Requirement } from '../entities/requirement.entity';

@Injectable()
export class RequirementsRepository extends Repository<Requirement> {
  constructor(private dataSource: DataSource) {
    super(Requirement, dataSource.createEntityManager());
  }
}
