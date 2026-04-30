import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RequirementResponse } from '../entities/requirement-response.entity';

@Injectable()
export class RequirementResponsesRepository extends Repository<RequirementResponse> {
  constructor(private dataSource: DataSource) {
    super(RequirementResponse, dataSource.createEntityManager());
  }

  async findByRequirement(
    requirementId: string,
  ): Promise<RequirementResponse[]> {
    return this.find({
      where: { requirementId },
      order: { createdAt: 'ASC' },
    });
  }

  async findUserResponse(
    requirementId: string,
    userId: string,
  ): Promise<RequirementResponse | null> {
    return this.findOne({ where: { requirementId, respondedById: userId } });
  }
}
