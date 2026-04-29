import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { EventType } from '../entities/event.entity';

export class CreateEventDto {
  @ApiProperty({
    description: 'Título del evento',
    example: 'Manifestación por mejores condiciones laborales',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Descripción detallada del evento',
    example: 'Se convoca a una manifestación pacífica para...',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Tipo de evento',
    enum: EventType,
    example: EventType.MANIFESTACION,
  })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({
    description: 'Fecha y hora del evento',
    example: '2026-02-15T18:00:00.000Z',
  })
  @IsDateString()
  eventDate: string;

  @ApiProperty({
    description: 'Dirección completa del evento',
    example: 'Av. de Mayo 1370, Buenos Aires',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address: string;

  @ApiProperty({
    description: 'ID de la ciudad (partido) de la Provincia de Buenos Aires',
    example: 'uuid-ciudad',
  })
  @IsUUID('4')
  cityId: string;

  @ApiProperty({
    description: 'Latitud de la ubicación',
    example: -34.6037,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitud de la ubicación',
    example: -58.3816,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({
    description: 'ID de la localidad dentro del partido',
    example: 'uuid-locality',
  })
  @IsOptional()
  @IsUUID('4')
  localityId?: string;

  @ApiPropertyOptional({
    description: 'ID del título predefinido del evento',
    example: 'uuid-event-title',
  })
  @IsOptional()
  @IsUUID('4')
  eventTitleId?: string;

  @ApiPropertyOptional({
    description:
      'Indica si el título es personalizado (true) o predefinido (false)',
    example: true,
  })
  @IsOptional()
  isCustomTitle?: boolean;

  @ApiPropertyOptional({
    description: 'Extracto del hecho que motivó este evento',
    example: 'El día 15 de abril ocurrió un homicidio en la localidad de...',
  })
  @IsOptional()
  @IsString()
  relatedIncidentExcerpt?: string;

  @ApiPropertyOptional({
    description:
      'Dependencia policial más cercana al lugar del evento (requerido para reclamos de justicia o seguridad)',
    example: 'Comisaría 1ra de La Plata',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  nearestPoliceStation?: string;
}
