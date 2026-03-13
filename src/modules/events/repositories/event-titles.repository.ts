import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EventTitle } from '../entities/event-title.entity';

@Injectable()
export class EventTitlesRepository extends Repository<EventTitle> {
  constructor(private dataSource: DataSource) {
    super(EventTitle, dataSource.createEntityManager());
  }
}
