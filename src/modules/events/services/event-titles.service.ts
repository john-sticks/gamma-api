import { Injectable, NotFoundException } from '@nestjs/common';
import { EventTitlesRepository } from '../repositories/event-titles.repository';
import { EventTitle } from '../entities/event-title.entity';

@Injectable()
export class EventTitlesService {
  constructor(private readonly eventTitlesRepository: EventTitlesRepository) {}

  async findAll(): Promise<EventTitle[]> {
    return this.eventTitlesRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<EventTitle> {
    const title = await this.eventTitlesRepository.findOne({ where: { id } });
    if (!title) {
      throw new NotFoundException(`EventTitle with ID ${id} not found`);
    }
    return title;
  }

  async create(data: {
    name: string;
    sortOrder?: number;
  }): Promise<EventTitle> {
    const title = this.eventTitlesRepository.create(data);
    return this.eventTitlesRepository.save(title);
  }

  async update(
    id: string,
    data: { name?: string; isActive?: boolean; sortOrder?: number },
  ): Promise<EventTitle> {
    const title = await this.findOne(id);
    Object.assign(title, data);
    return this.eventTitlesRepository.save(title);
  }

  async remove(id: string): Promise<void> {
    const title = await this.findOne(id);
    await this.eventTitlesRepository.remove(title);
  }
}
