import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Event } from '../entities/event.entity';

@Injectable()
export class EventsRepository extends Repository<Event> {
  constructor(private dataSource: DataSource) {
    super(Event, dataSource.createEntityManager());
  }
}
