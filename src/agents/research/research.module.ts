import { Module } from '@nestjs/common';
import { FundamentalsService } from './fundamentals.service';
import { SentimentService } from './sentiment.service';
import { ResearchGraph } from './research-graph';
import { TradeAnalysisService } from './trade-analysis.service';
import { InfrastructureModule } from '../../infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  providers: [FundamentalsService, SentimentService, ResearchGraph, TradeAnalysisService],
  exports: [FundamentalsService, SentimentService, ResearchGraph, TradeAnalysisService],
})
export class ResearchModule {}
