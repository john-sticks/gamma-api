import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequirementResponseType } from '../entities/requirement-response.entity';

export class CreateRequirementResponseDto {
  @ApiProperty({
    enum: RequirementResponseType,
    description:
      'Tipo de respuesta: positive (hay concentraciones) o negative (no hay)',
  })
  @IsEnum(RequirementResponseType)
  type: RequirementResponseType;

  @ApiPropertyOptional({
    description: 'Notas adicionales de la respuesta',
    example: 'Se detectaron concentraciones en dos puntos de la ciudad',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AmendRequirementResponseDto {
  @ApiPropertyOptional({
    description: 'Notas sobre la ampliación de respuesta',
    example:
      'Se tomó conocimiento de la concentración con posterioridad al plazo',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
