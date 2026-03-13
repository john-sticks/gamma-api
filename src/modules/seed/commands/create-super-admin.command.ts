import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/services/users.service';
import { UserRole } from '../../common/types/roles';

@Injectable()
export class CreateSuperAdminCommand {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Command({
    command: 'create:superadmin',
    describe: 'Create the initial super admin user',
  })
  async create() {
    const username = this.configService.get<string>('SUPER_ADMIN_USERNAME');
    const password = this.configService.get<string>('SUPER_ADMIN_PASSWORD');
    const firstName = this.configService.get<string>('SUPER_ADMIN_FIRST_NAME');
    const lastName = this.configService.get<string>('SUPER_ADMIN_LAST_NAME');

    if (!username || !password || !firstName || !lastName) {
      console.error('❌ Error: Missing super admin environment variables');
      console.error('Please set the following in your .env file:');
      console.error('- SUPER_ADMIN_USERNAME');
      console.error('- SUPER_ADMIN_PASSWORD');
      console.error('- SUPER_ADMIN_FIRST_NAME');
      console.error('- SUPER_ADMIN_LAST_NAME');
      return;
    }

    try {
      // Check if super admin already exists
      const existingUser = await this.usersService.findByUsername(username);

      if (existingUser) {
        console.log('⚠️  Super admin user already exists');
        console.log(`Username: ${username}`);
        console.log(`Role: ${existingUser.role}`);
        console.log(`Active: ${existingUser.isActive}`);
        return;
      }

      // Create super admin
      const superAdmin = await this.usersService.create({
        username,
        password,
        firstName,
        lastName,
        role: UserRole.LEVEL_1,
      });

      console.log('✅ Super admin created successfully!');
      console.log(`ID: ${superAdmin.id}`);
      console.log(`Username: ${superAdmin.username}`);
      console.log(`Name: ${superAdmin.firstName} ${superAdmin.lastName}`);
      console.log(`Role: ${superAdmin.role}`);
      console.log('\n🔐 You can now login with these credentials');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error creating super admin:', message);
    }
  }
}
