import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsArray,
  IsUUID,
  ArrayMinSize,
  MaxLength,
  IsBoolean,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRequirementDto {
  @ApiProperty({
    description: 'Título del requerimiento',
    example: 'Informe sobre posibles exteriorizaciones',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Descripción detallada del requerimiento',
    example:
      'Informar antes de las 16 hs del día 25 de mayo de 2026 sobre posibles exteriorizaciones a raíz de hecho...',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Fecha y hora límite de respuesta (ISO 8601)',
    example: '2026-05-25T16:00:00.000Z',
  })
  @IsDateString()
  deadline: string;

  @ApiPropertyOptional({
    description:
      'Enviar a todas las delegaciones activas (level_4). Si es true, targetCityIds se ignora.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  targetAll?: boolean;

  @ApiPropertyOptional({
    description:
      'IDs de usuarios level_4 (delegaciones) destinatarios. Requerido si targetAll es false.',
    type: [String],
  })
  @ValidateIf((o: CreateRequirementDto) => !o.targetAll)
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  targetUserIds?: string[];
}
