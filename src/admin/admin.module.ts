import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ResearchModule } from '../agents/research/research.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { MarketModule } from '../services/market.module';

@Module({
  imports: [ResearchModule, InfrastructureModule, MarketModule],
  controllers: [AdminController],
})
export class AdminModule {}
