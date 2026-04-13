import { Module } from '@nestjs/common';
import { MarketMonitorService } from './market-monitor.service';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  providers: [MarketMonitorService],
  exports: [MarketMonitorService],
})
export class MarketModule {}
