import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EventUpdateStatus } from '../entities/event-update.entity';

export class UpdateEventUpdateStatusDto {
  @ApiProperty({
    enum: [EventUpdateStatus.APPROVED, EventUpdateStatus.REJECTED],
    description: 'New status for the event update',
  })
  @IsEnum(EventUpdateStatus)
  status: EventUpdateStatus;
}
