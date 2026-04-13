import { Module } from '@nestjs/common';
import { FundamentalsService } from './fundamentals.service';
import { SentimentService } from './sentiment.service';
import { ResearchGraph } from './research-graph';

@Module({
  providers: [FundamentalsService, SentimentService, ResearchGraph],
  exports: [FundamentalsService, SentimentService, ResearchGraph],
})
export class ResearchModule {}
