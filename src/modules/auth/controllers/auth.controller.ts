import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LoginDto, RegisterDto } from '../dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { Public } from 'src/modules/common/decorators';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/roles';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.LEVEL_1)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Only SUPER ADMIN (level_1) can register new users',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'johndoe',
          firstName: 'John',
          lastName: 'Doe',
          role: 'level_4',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only SUPER ADMIN can register users',
  })
  @ApiResponse({
    status: 409,
    description: 'Username already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with username and password' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'johndoe',
          firstName: 'John',
          lastName: 'Doe',
          role: 'level_4',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or user account is inactive',
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        role: 'level_4',
        isActive: true,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      assignedCities: user.assignedCities || [],
    };
  }
}
