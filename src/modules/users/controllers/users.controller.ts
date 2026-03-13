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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from '../dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/roles';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2)
  @ApiOperation({
    summary: 'Create a new user',
    description:
      'Only SUPER ADMIN (level_1) and ADMIN (level_2) can create users',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully created',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        role: 'level_4',
        isActive: true,
        createdAt: '2024-01-31T00:00:00.000Z',
        updatedAt: '2024-01-31T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 409, description: 'Username already exists' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2, UserRole.LEVEL_3)
  @ApiOperation({
    summary: 'Get all users with pagination',
    description:
      'Only SUPER ADMIN, ADMIN and MODERATOR can list all users. Supports pagination and search.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (starts at 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page (max 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description:
      'Search term to filter users by username, firstName, or lastName',
    example: 'john',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'Filter users by role',
    enum: UserRole,
    example: 'level_4',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
    schema: {
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            username: 'johndoe',
            firstName: 'John',
            lastName: 'Doe',
            role: 'level_4',
            isActive: true,
            createdAt: '2024-01-31T00:00:00.000Z',
            updatedAt: '2024-01-31T00:00:00.000Z',
          },
        ],
        meta: {
          total: 100,
          page: 1,
          limit: 10,
          totalPages: 10,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  findAll(@Query() queryUserDto: QueryUserDto) {
    return this.usersService.findAllPaginated(queryUserDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Any authenticated user can view user details',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'User found',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        role: 'level_4',
        isActive: true,
        createdAt: '2024-01-31T00:00:00.000Z',
        updatedAt: '2024-01-31T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.LEVEL_1, UserRole.LEVEL_2)
  @ApiOperation({
    summary: 'Update user',
    description: 'Only SUPER ADMIN and ADMIN can update users',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully updated',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        role: 'level_4',
        isActive: true,
        createdAt: '2024-01-31T00:00:00.000Z',
        updatedAt: '2024-01-31T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.LEVEL_1)
  @ApiOperation({
    summary: 'Delete user',
    description: 'Only SUPER ADMIN (level_1) can delete users',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 204, description: 'User successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
