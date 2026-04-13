import { Injectable, Logger } from '@nestjs/common';
import Exa from 'exa-js';

@Injectable()
export class ExaService {
  private readonly logger = new Logger(ExaService.name);
  private readonly exa: Exa;

  constructor() {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      this.logger.error('CRITICAL: EXA_API_KEY 未定义！安全要求：请先执行 `export EXA_API_KEY=your_key` 后再启动。');
    }
    this.exa = new Exa(apiKey || 'missing-key');
  }

  /**
   * Search for project information and return contents.
   * @param query The search query.
   * @param numResults Number of results to return.
   */
  async searchProjectInfo(query: string, numResults: number = 5) {
    try {
      this.logger.log(`[Exa] 正在搜索: ${query}`);
      const result = await this.exa.searchAndContents(query, {
        numResults,
        useAutoprompt: true,
        text: true, // Get full text content
        highlights: true,
      });
      return result.results;
    } catch (error) {
      this.logger.error(`[Exa] 搜索失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * Specific search for whitepapers or technical docs.
   */
  async findTechnicalDocs(symbol: string, name: string) {
    const query = `official whitepaper or technical documentation for ${name} (${symbol}) crypto project`;
    return this.searchProjectInfo(query, 3);
  }

  /**
   * Specific search for tokenomics, vesting, and unlock schedules.
   */
  async findTokenomicsDocs(symbol: string, name: string) {
    const query = `tokenomics, TGE date, exchange listing history, market makers, initial circulating supply, vesting schedule, and token unlock events for ${name} (${symbol}) crypto project`;
    return this.searchProjectInfo(query, 5); // Request more results for tokenomics
  }
}
