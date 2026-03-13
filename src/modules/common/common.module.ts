import { Module } from '@nestjs/common';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [],
  providers: [RolesGuard],
  exports: [RolesGuard],
})
export class CommonModule {}
