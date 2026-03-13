import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from '../services/notifications.service';
import { CreateCancellationRequestDto, QueryNotificationDto } from '../dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get my notifications',
    description: 'Get paginated list of notifications for the current user',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of notifications' })
  findAll(@Query() query: QueryNotificationDto, @CurrentUser() user: User) {
    return this.notificationsService.findMyNotifications(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notifications count',
    description: 'Returns the count of unread notifications',
  })
  @ApiResponse({ status: 200, description: 'Unread count' })
  getUnreadCount(@CurrentUser() user: User) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Post('cancellation-request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Request event cancellation',
    description: 'Send a cancellation request to moderators',
  })
  @ApiResponse({ status: 201, description: 'Cancellation request sent' })
  createCancellationRequest(
    @Body() dto: CreateCancellationRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.createCancellationRequest(dto, user);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Mark a single notification as read',
  })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Patch('read-all')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Mark all unread notifications as read',
  })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllAsRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Post(':id/approve')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve cancellation request',
    description: 'Approve a cancellation request and cancel the event',
  })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Cancellation approved' })
  approveCancellation(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.approveCancellation(id, user.id);
  }

  @Post(':id/reject')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject cancellation request',
    description: 'Reject a cancellation request',
  })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Cancellation rejected' })
  rejectCancellation(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.rejectCancellation(id, user.id);
  }
}
