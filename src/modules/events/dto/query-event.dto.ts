import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
  IsString,
} from 'class-validator';
import {
  EventType,
  EventStatus,
  EventLifecycleStatus,
} from '../entities/event.entity';
import { PaginationQueryDto } from '../../common/dto';
import { Transform } from 'class-transformer';
import { Partido } from '../enums';

export class QueryEventDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por tipo de evento',
    enum: EventType,
  })
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @ApiPropertyOptional({
    description: 'Filtrar por estado de aprobación',
    enum: EventStatus,
  })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por estado del ciclo de vida',
    enum: EventLifecycleStatus,
  })
  @IsOptional()
  @IsEnum(EventLifecycleStatus)
  lifecycleStatus?: EventLifecycleStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por una o más ciudades',
    example: 'uuid-1,uuid-2',
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }): string[] => {
    if (Array.isArray(value)) {
      return value as string[];
    }
    if (typeof value === 'string') {
      return value.includes(',')
        ? value.split(',').map((v) => v.trim())
        : [value];
    }
    return [];
  })
  @IsArray()
  @IsString({ each: true })
  city?: Partido[];

  @ApiPropertyOptional({
    description: 'Filtrar por localidad',
    example: 'uuid-locality',
  })
  @IsOptional()
  @IsString()
  locality?: string;

  @ApiPropertyOptional({
    description: 'Filtrar eventos desde esta fecha',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filtrar eventos hasta esta fecha',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
