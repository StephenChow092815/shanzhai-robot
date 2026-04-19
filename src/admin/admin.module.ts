import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ResearchModule } from '../agents/research/research.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { MarketModule } from '../services/market.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    ResearchModule, 
    InfrastructureModule, 
    MarketModule,
    DatabaseModule
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService]
})
export class AdminModule {}
