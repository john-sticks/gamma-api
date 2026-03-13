import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import {
  CreateUserDto,
  UpdateUserDto,
  QueryUserDto,
  PaginatedResponse,
} from '../dto';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Like, Not, FindOptionsWhere } from 'typeorm';
import { UserRole } from '../../common/types/roles';
import { CitiesService } from '../../cities/services/cities.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly citiesService: CitiesService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findByUsername(
      createUserDto.username,
    );

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Prepare user data
    const { assignedCityIds, ...userData } = createUserDto;

    const user = this.usersRepository.create({
      ...userData,
      password: hashedPassword,
    });

    // Assign cities if provided
    if (assignedCityIds && assignedCityIds.length > 0) {
      user.assignedCities = await this.citiesService.findByIds(assignedCityIds);
    }

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findAllPaginated(
    queryUserDto: QueryUserDto,
  ): Promise<PaginatedResponse<User>> {
    const { page = 1, limit = 10, search, role } = queryUserDto;
    const skip = (page - 1) * limit;

    // Build where clause for search and exclude level_1 users
    const baseWhere: FindOptionsWhere<User> = { role: Not(UserRole.LEVEL_1) };

    // Add role filter if provided
    if (role) {
      baseWhere.role = role;
    }

    const where: FindOptionsWhere<User> | FindOptionsWhere<User>[] = search
      ? [
          { ...baseWhere, username: Like(`%${search}%`) },
          { ...baseWhere, firstName: Like(`%${search}%`) },
          { ...baseWhere, lastName: Like(`%${search}%`) },
        ]
      : baseWhere;

    // Get total count
    const total = await this.usersRepository.count({
      where: Array.isArray(where) ? where : where,
    });

    // Get paginated users
    const data = await this.usersRepository.find({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findByUsername(username);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const { assignedCityIds, ...userData } = updateUserDto;

    Object.assign(user, userData);

    // Update assigned cities if provided
    if (assignedCityIds !== undefined) {
      if (assignedCityIds && assignedCityIds.length > 0) {
        user.assignedCities =
          await this.citiesService.findByIds(assignedCityIds);
      } else {
        user.assignedCities = [];
      }
    }

    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
