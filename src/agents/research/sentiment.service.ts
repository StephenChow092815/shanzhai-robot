import { Injectable, Logger, Inject } from '@nestjs/common';
import { ExaService } from '../../infrastructure/exa.service';

@Injectable()
export class SentimentService {
  private readonly logger = new Logger(SentimentService.name);

  constructor(@Inject(ExaService) private readonly exaService: ExaService) {}

  /**
   * Analyze market sentiment for a token.
   * Currently uses Exa to search for recent social sentiment & news.
   */
  async analyzeSentiment(symbol: string, name: string) {
    this.logger.log(`正在分析 ${name} (${symbol}) 的市场情绪...`);

    // 1. Search for recent sentiment snippets
    const query = `current market sentiment and recent social media buzz for ${name} (${symbol}) crypto`;
    const searchResults = await this.exaService.searchProjectInfo(query, 3);

    // 2. Simplified scoring (initial version)
    // Note: Future versions will integrate LunarCrush for precise scoring
    let combinedText = searchResults.map(r => r.text).join(' ');
    
    // Placeholder for LLM-based sentiment scoring
    // For now, we'll return a placeholder score 
    // to be refined in the LangGraph integration phase.

    return {
      tokenId: null, // to be filled
      score: 0.5, // 1.0 (very bullish) to -1.0 (very bearish)
      buzz: searchResults.length,
      source: 'exa_ai',
      rawOutput: { 
        snippets: searchResults.map(r => ({ title: r.title, url: r.url })) 
      },
    };
  }
}
