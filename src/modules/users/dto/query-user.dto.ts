import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto';
import { UserRole } from '../../common/types/roles';

export class QueryUserDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by user role',
    enum: UserRole,
    example: UserRole.LEVEL_4,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
