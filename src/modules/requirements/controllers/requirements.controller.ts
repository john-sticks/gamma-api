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
import { RequirementsService } from '../services/requirements.service';
import {
  CreateRequirementDto,
  CreateRequirementResponseDto,
  AmendRequirementResponseDto,
  QueryRequirementDto,
} from '../dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';

@ApiTags('Requirements')
@ApiBearerAuth('JWT-auth')
@Controller('requirements')
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Post()
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un nuevo requerimiento y notificar a las delegaciones',
  })
  @ApiResponse({ status: 201, description: 'Requerimiento creado' })
  create(@Body() dto: CreateRequirementDto, @CurrentUser() user: User) {
    return this.requirementsService.create(dto, user);
  }

  @Get()
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @ApiOperation({
    summary: 'Listar todos los requerimientos (para moderadores y admins)',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de requerimientos' })
  findAll(@Query() query: QueryRequirementDto) {
    return this.requirementsService.findAll(query);
  }

  @Get('my')
  @Roles(UserRole.LEVEL_4)
  @ApiOperation({
    summary: 'Listar requerimientos dirigidos a la delegación actual',
  })
  @ApiResponse({
    status: 200,
    description: 'Requerimientos de la delegación con estado de respuesta',
  })
  findMy(@CurrentUser() user: User, @Query() query: QueryRequirementDto) {
    return this.requirementsService.findMy(user, query);
  }

  @Get('my/pending-count')
  @Roles(UserRole.LEVEL_4)
  @ApiOperation({
    summary: 'Cantidad de requerimientos pendientes de respuesta',
  })
  @ApiResponse({
    status: 200,
    description: 'Conteo de requerimientos sin responder',
  })
  findMyPendingCount(@CurrentUser() user: User) {
    return this.requirementsService.findMyPendingCount(user);
  }

  @Get(':id')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3, UserRole.LEVEL_4)
  @ApiOperation({ summary: 'Ver detalle de un requerimiento' })
  @ApiParam({ name: 'id', description: 'Requirement UUID' })
  @ApiResponse({ status: 200, description: 'Detalle del requerimiento' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  findOne(@Param('id') id: string) {
    return this.requirementsService.findOne(id);
  }

  @Get(':id/responses')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @ApiOperation({ summary: 'Ver todas las respuestas de un requerimiento' })
  @ApiParam({ name: 'id', description: 'Requirement UUID' })
  @ApiResponse({ status: 200, description: 'Lista de respuestas' })
  findResponses(@Param('id') id: string) {
    return this.requirementsService.findResponses(id);
  }

  @Get(':id/reads')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @ApiOperation({
    summary: 'Ver qué delegaciones abrieron la notificación del requerimiento',
  })
  @ApiParam({ name: 'id', description: 'Requirement UUID' })
  @ApiResponse({
    status: 200,
    description: 'Lista de delegaciones con estado de lectura',
  })
  findNotificationReads(@Param('id') id: string) {
    return this.requirementsService.findNotificationReads(id);
  }

  @Post(':id/respond')
  @Roles(UserRole.LEVEL_4)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Responder a un requerimiento (positivo o negativo)',
  })
  @ApiParam({ name: 'id', description: 'Requirement UUID' })
  @ApiResponse({ status: 201, description: 'Respuesta registrada' })
  @ApiResponse({
    status: 409,
    description: 'Ya respondiste a este requerimiento',
  })
  respond(
    @Param('id') id: string,
    @Body() dto: CreateRequirementResponseDto,
    @CurrentUser() user: User,
  ) {
    return this.requirementsService.respond(id, dto, user);
  }

  @Patch(':id/respond')
  @Roles(UserRole.LEVEL_4)
  @ApiOperation({
    summary:
      'Ampliar respuesta negativa a positiva en un requerimiento vencido',
  })
  @ApiParam({ name: 'id', description: 'Requirement UUID' })
  @ApiResponse({ status: 200, description: 'Respuesta ampliada a positivo' })
  @ApiResponse({
    status: 400,
    description:
      'El requerimiento no está vencido o la respuesta ya es positiva',
  })
  amend(
    @Param('id') id: string,
    @Body() dto: AmendRequirementResponseDto,
    @CurrentUser() user: User,
  ) {
    return this.requirementsService.amend(id, dto, user);
  }

  @Patch(':id/close')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @ApiOperation({ summary: 'Cerrar un requerimiento' })
  @ApiParam({ name: 'id', description: 'Requirement UUID' })
  @ApiResponse({ status: 200, description: 'Requerimiento cerrado' })
  close(@Param('id') id: string) {
    return this.requirementsService.close(id);
  }

  @Patch(':id/void')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @ApiOperation({
    summary: 'Dejar sin efecto un requerimiento y notificar a las delegaciones',
  })
  @ApiParam({ name: 'id', description: 'Requirement UUID' })
  @ApiResponse({ status: 200, description: 'Requerimiento dejado sin efecto' })
  @ApiResponse({
    status: 400,
    description: 'El requerimiento ya fue dejado sin efecto',
  })
  void(@Param('id') id: string, @CurrentUser() user: User) {
    return this.requirementsService.void(id, user);
  }
}
