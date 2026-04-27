import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { EventsService } from '../services/events.service';
import { EventUpdatesService } from '../services/event-updates.service';
import { ExportService } from '../services/export.service';
import {
  CreateEventDto,
  UpdateEventDto,
  QueryEventDto,
  CreateEventUpdateDto,
  UpdateEventUpdateDto,
  UpdateEventUpdateStatusDto,
} from '../dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';

@ApiTags('Events')
@ApiBearerAuth('JWT-auth')
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly eventUpdatesService: EventUpdatesService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3, UserRole.LEVEL_4)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new event',
    description:
      'Any authenticated user can create events. Level 4 users need approval.',
  })
  @ApiResponse({
    status: 201,
    description: 'Event successfully created',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createEventDto: CreateEventDto, @CurrentUser() user: User) {
    return this.eventsService.create(createEventDto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all events with pagination and filters',
    description: 'Get paginated list of events with optional filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of events',
  })
  findAll(@Query() query: QueryEventDto, @CurrentUser() user: User) {
    return this.eventsService.findAll(query, user);
  }

  @Get('map')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3, UserRole.LEVEL_5)
  @ApiOperation({
    summary: 'Get all approved events for map display',
    description: 'Only approved events without pagination for map markers',
  })
  @ApiResponse({
    status: 200,
    description: 'List of approved events',
  })
  findForMap() {
    return this.eventsService.findApprovedForMap();
  }

  @Get('pending')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @ApiOperation({
    summary: 'Get pending events for moderation',
    description: 'Only moderators and admins can see pending events',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of pending events',
  })
  findPending(@Query() query: QueryEventDto) {
    return this.eventsService.findPending(query);
  }

  @Get('pending-count')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @ApiOperation({
    summary: 'Get pending events count',
    description: 'Returns the count of events awaiting approval',
  })
  @ApiResponse({ status: 200, description: 'Pending events count' })
  getPendingCount() {
    return this.eventsService.getPendingCount();
  }

  @Get('summary')
  @Roles(
    UserRole.LEVEL_1,
    UserRole.LEVEL_2,
    UserRole.LEVEL_3,
    UserRole.LEVEL_4,
    UserRole.LEVEL_5,
  )
  @ApiOperation({
    summary: 'Get events with latest update info',
    description:
      'Returns paginated events enriched with their latest update data (attendee count, update time)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of events with latest update',
  })
  findAllWithLatestUpdate(
    @Query() query: QueryEventDto,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.findAllWithLatestUpdate(query, user);
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'Get event metrics by lifecycle status',
    description: 'Returns count of approved events grouped by lifecycle status',
  })
  @ApiResponse({
    status: 200,
    description: 'Event metrics',
  })
  getMetrics() {
    return this.eventsService.getMetrics();
  }

  @Get('export/xlsx')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @ApiOperation({ summary: 'Export events to Excel' })
  @ApiResponse({ status: 200, description: 'Excel file' })
  async exportXlsx(
    @Query() query: QueryEventDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const buffer = await this.exportService.exportListToXlsx(query, user);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="eventos-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    });
    res.send(buffer);
  }

  @Get('export/csv')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @ApiOperation({ summary: 'Export events to CSV' })
  @ApiResponse({ status: 200, description: 'CSV file' })
  async exportCsv(
    @Query() query: QueryEventDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const csv = await this.exportService.exportListToCsv(query, user);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="eventos-${new Date().toISOString().slice(0, 10)}.csv"`,
    });
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
  }

  @Get('export/pdf')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @ApiOperation({ summary: 'Export events to PDF' })
  @ApiResponse({ status: 200, description: 'PDF file' })
  async exportPdf(
    @Query() query: QueryEventDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const buffer = await this.exportService.exportListToPdf(query, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="eventos-${new Date().toISOString().slice(0, 10)}.pdf"`,
    });
    res.send(buffer);
  }

  // Event Updates approval routes (BEFORE :id to avoid routing conflicts)
  @Get('updates/pending')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @ApiOperation({
    summary: 'Get pending event updates for moderation',
    description: 'Only moderators and admins can see pending updates',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of pending updates',
  })
  findPendingUpdates(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('city') city?: string,
    @Query('locality') locality?: string,
    @Query('updateType') updateType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.eventUpdatesService.findPendingUpdates({
      page,
      limit,
      search,
      city,
      locality,
      updateType,
      dateFrom,
      dateTo,
    });
  }

  @Get('updates/pending-count')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @ApiOperation({
    summary: 'Get pending event updates count',
    description: 'Returns the count of event updates awaiting approval',
  })
  @ApiResponse({ status: 200, description: 'Pending updates count' })
  getPendingUpdatesCount() {
    return this.eventUpdatesService.getPendingUpdatesCount();
  }

  @Patch('updates/:updateId/status')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @ApiOperation({
    summary: 'Approve or reject an event update',
    description: 'Only moderators and admins can change update status',
  })
  @ApiParam({ name: 'updateId', description: 'Update UUID' })
  @ApiResponse({ status: 200, description: 'Update status changed' })
  @ApiResponse({ status: 404, description: 'Update not found' })
  updateUpdateStatus(
    @Param('updateId') updateId: string,
    @Body() dto: UpdateEventUpdateStatusDto,
  ) {
    return this.eventUpdatesService.updateStatus(updateId, dto.status);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get event by ID',
    description: 'Get detailed information about a specific event',
  })
  @ApiParam({
    name: 'id',
    description: 'Event UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Event found',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3, UserRole.LEVEL_4)
  @ApiOperation({
    summary: 'Update event',
    description: 'Update event. Only owner or moderator+ can edit.',
  })
  @ApiParam({
    name: 'id',
    description: 'Event UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Event successfully updated',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.update(id, updateEventDto, user.id, user.role);
  }

  @Delete(':id')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3, UserRole.LEVEL_4)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete event',
    description: 'Delete event. Only owner or admin can delete.',
  })
  @ApiParam({
    name: 'id',
    description: 'Event UUID',
  })
  @ApiResponse({ status: 204, description: 'Event successfully deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.eventsService.remove(id, user.id, user.role);
  }

  @Get(':id/export')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @ApiOperation({ summary: 'Export event history to Excel' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Excel file with event history' })
  async exportEventHistory(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.exportService.exportEventHistory(id);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="evento-historial-${id.slice(0, 8)}.xlsx"`,
    });
    res.send(buffer);
  }

  // Event Updates routes
  @Post(':id/updates')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3, UserRole.LEVEL_4)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add update to an event',
    description: 'Register a new event tracking entry with real-time data',
  })
  @ApiParam({
    name: 'id',
    description: 'Event UUID',
  })
  @ApiResponse({
    status: 201,
    description: 'Update registered successfully',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  createUpdate(
    @Param('id') eventId: string,
    @Body() createEventUpdateDto: CreateEventUpdateDto,
    @CurrentUser() user: User,
  ) {
    return this.eventUpdatesService.create(
      eventId,
      createEventUpdateDto,
      user.id,
      user.role,
    );
  }

  @Get(':id/updates/chart')
  @ApiOperation({
    summary: 'Get timeline data optimized for charts',
    description:
      'Returns timeline data in format optimized for creating temporal charts',
  })
  @ApiParam({
    name: 'id',
    description: 'Event UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Data for temporal charts',
  })
  getTimelineChart(@Param('id') eventId: string) {
    return this.eventUpdatesService.getTimelineForChart(eventId);
  }

  @Get(':id/updates/stats')
  @ApiOperation({
    summary: 'Get event timeline statistics',
    description:
      'View summarized timeline statistics: attendance peaks, duration, etc.',
  })
  @ApiParam({
    name: 'id',
    description: 'Event UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Timeline statistics',
  })
  getUpdateStats(@Param('id') eventId: string) {
    return this.eventUpdatesService.getEventStats(eventId);
  }

  @Get(':id/updates')
  @ApiOperation({
    summary: 'Get event update history',
    description: 'View all registered updates for a specific event',
  })
  @ApiParam({
    name: 'id',
    description: 'Event UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Update history',
  })
  getUpdates(@Param('id') eventId: string) {
    return this.eventUpdatesService.findByEvent(eventId);
  }

  @Patch(':eventId/updates/:updateId')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3, UserRole.LEVEL_4)
  @ApiOperation({
    summary: 'Update an event update',
    description:
      'Only the creator can edit their update, within 15 minutes of creation',
  })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiParam({ name: 'updateId', description: 'Update UUID' })
  @ApiResponse({ status: 200, description: 'Update edited successfully' })
  @ApiResponse({
    status: 403,
    description: 'No permissions or edit window expired',
  })
  @ApiResponse({ status: 404, description: 'Update not found' })
  updateEventUpdate(
    @Param('updateId') updateId: string,
    @Body() updateEventUpdateDto: UpdateEventUpdateDto,
    @CurrentUser() user: User,
  ) {
    return this.eventUpdatesService.update(
      updateId,
      updateEventUpdateDto,
      user.id,
      user.role,
    );
  }

  @Delete(':eventId/updates/:updateId')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3, UserRole.LEVEL_4)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an update',
    description: 'Only the creator can delete their update',
  })
  @ApiParam({
    name: 'eventId',
    description: 'Event UUID',
  })
  @ApiParam({
    name: 'updateId',
    description: 'Update UUID',
  })
  @ApiResponse({ status: 204, description: 'Update deleted' })
  @ApiResponse({ status: 403, description: 'No permissions' })
  @ApiResponse({ status: 404, description: 'Update not found' })
  removeUpdate(@Param('updateId') updateId: string, @CurrentUser() user: User) {
    return this.eventUpdatesService.remove(updateId, user.id);
  }
}
