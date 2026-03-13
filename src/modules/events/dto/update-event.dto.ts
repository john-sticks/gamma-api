import { PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus, EventLifecycleStatus } from '../entities/event.entity';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @ApiPropertyOptional({
    description:
      'Estado de aprobación del evento (solo admin/moderador pueden cambiar)',
    enum: EventStatus,
    example: EventStatus.APPROVED,
  })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({
    description: 'Estado del ciclo de vida del evento',
    enum: EventLifecycleStatus,
    example: EventLifecycleStatus.ONGOING,
  })
  @IsOptional()
  @IsEnum(EventLifecycleStatus)
  lifecycleStatus?: EventLifecycleStatus;
}
