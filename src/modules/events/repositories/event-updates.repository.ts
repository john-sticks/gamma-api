import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EventUpdate } from '../entities/event-update.entity';

@Injectable()
export class EventUpdatesRepository extends Repository<EventUpdate> {
  constructor(private dataSource: DataSource) {
    super(EventUpdate, dataSource.createEntityManager());
  }
}
