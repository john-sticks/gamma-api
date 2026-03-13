import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto';
import {
  NotificationType,
  NotificationStatus,
} from '../entities/notification.entity';

export class QueryNotificationDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por estado de notificación',
    enum: NotificationStatus,
  })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de notificación',
    enum: NotificationType,
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}
