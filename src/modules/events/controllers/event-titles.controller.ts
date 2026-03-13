import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EventTitlesService } from '../services/event-titles.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/roles';

@ApiTags('Event Titles')
@ApiBearerAuth('JWT-auth')
@Controller('event-titles')
export class EventTitlesController {
  constructor(private readonly eventTitlesService: EventTitlesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active event titles' })
  @ApiResponse({ status: 200, description: 'List of event titles' })
  findAll() {
    return this.eventTitlesService.findAll();
  }

  @Post()
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new event title' })
  @ApiResponse({ status: 201, description: 'Event title created' })
  create(@Body() body: { name: string; sortOrder?: number }) {
    return this.eventTitlesService.create(body);
  }

  @Patch(':id')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2)
  @ApiOperation({ summary: 'Update an event title' })
  @ApiResponse({ status: 200, description: 'Event title updated' })
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean; sortOrder?: number },
  ) {
    return this.eventTitlesService.update(id, body);
  }

  @Delete(':id')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an event title' })
  @ApiResponse({ status: 204, description: 'Event title deleted' })
  remove(@Param('id') id: string) {
    return this.eventTitlesService.remove(id);
  }
}
