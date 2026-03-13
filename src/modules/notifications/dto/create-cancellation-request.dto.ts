import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateCancellationRequestDto {
  @ApiProperty({
    description: 'ID del evento a cancelar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  eventId: string;

  @ApiPropertyOptional({
    description: 'Razón de la solicitud de cancelación',
    example: 'El evento ya no se realizará por cambio de planes',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
