import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsString,
  Min,
  Max,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { EventUpdateType } from '../entities/event-update.entity';

export class CreateEventUpdateDto {
  @ApiProperty({
    description:
      'Specific time of the update (format: YYYY-MM-DDTHH:mm:ss.sssZ)',
    example: '2026-02-15T10:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  updateTime: string;

  @ApiProperty({
    description: 'Type of update',
    enum: EventUpdateType,
    example: EventUpdateType.ATTENDANCE_UPDATE,
  })
  @IsEnum(EventUpdateType)
  updateType: EventUpdateType;

  @ApiProperty({
    description: 'Number of people present (REQUIRED for temporal tracking)',
    example: 150,
    minimum: 0,
  })
  @ValidateIf(
    (o: CreateEventUpdateDto) =>
      o.updateType === EventUpdateType.ATTENDANCE_UPDATE ||
      o.updateType === EventUpdateType.GENERAL_UPDATE,
  )
  @IsNotEmpty({ message: 'Attendee count is required for tracking updates' })
  @IsNumber()
  @Min(0)
  attendeeCount: number;

  @ApiProperty({
    description: 'Police presence at the time of update',
    example: false,
    default: false,
  })
  @IsBoolean()
  policePresence: boolean;

  @ApiProperty({
    description: 'Street closure status at this moment',
    example: false,
    default: false,
  })
  @IsBoolean()
  streetClosure: boolean;

  @ApiPropertyOptional({
    description:
      'Specific observations at this moment (weather, incidents, etc.)',
    example: '10:00 AM - Event starting, clear weather, organized gathering',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Specific latitude at this moment (if event is moving)',
    example: -34.6037,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Specific longitude at this moment (if event is moving)',
    example: -58.3816,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
