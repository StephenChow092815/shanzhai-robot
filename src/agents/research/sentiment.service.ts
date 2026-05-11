import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SentimentService {
  private readonly logger = new Logger(SentimentService.name);

  async analyzeSentiment(symbol: string, name: string) {
    this.logger.warn(`[DEPRECATED] SentimentService called for ${name} (${symbol}). Use TradeAnalysisService instead.`);

    return {
      tokenId: null,
      score: 0,
      buzz: 0,
      source: 'disabled',
      rawOutput: { snippets: [] },
    };
  }
}
