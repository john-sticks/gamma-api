import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsString,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { EventUpdateType } from '../entities/event-update.entity';

export class UpdateEventUpdateDto {
  @ApiPropertyOptional({
    description: 'Specific time of the update',
    example: '2026-02-15T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  updateTime?: string;

  @ApiPropertyOptional({
    description: 'Type of update',
    enum: EventUpdateType,
  })
  @IsOptional()
  @IsEnum(EventUpdateType)
  updateType?: EventUpdateType;

  @ApiPropertyOptional({
    description: 'Number of people present',
    example: 150,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  attendeeCount?: number;

  @ApiPropertyOptional({
    description: 'Police presence at the time of update',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  policePresence?: boolean;

  @ApiPropertyOptional({
    description: 'Street closure status',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  streetClosure?: boolean;

  @ApiPropertyOptional({
    description: 'Tire burning',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  tireBurning?: boolean;

  @ApiPropertyOptional({
    description: 'Specific observations',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Latitude',
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude',
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
