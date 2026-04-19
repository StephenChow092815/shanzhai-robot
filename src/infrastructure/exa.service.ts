import { Injectable, Logger } from '@nestjs/common';
import Exa from 'exa-js';

@Injectable()
export class ExaService {
  private readonly logger = new Logger(ExaService.name);
  private readonly exa: Exa;

  constructor() {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      this.logger.error('CRITICAL: EXA_API_KEY 未定义！');
    }
    this.exa = new Exa(apiKey || 'missing-key');
  }

  /**
   * V11: Sanitize anchor to avoid high-risk promotional triggers
   */
  private sanitize(text?: string): string {
    if (!text) return '';
    // 1. Strip suspicious amounts (e.g., 45,000, 1M, $100)
    let clean = text.replace(/[\d,]+\s*(USDT|USD|ETH|SOL|\$|coins|tokens)/gi, 'some amount');
    // 2. Remove hype words
    clean = clean.replace(/(airdrop|rewards|bonus|giveaway|prize|winning|event|campaign|celebration)/gi, 'listing info');
    // 3. Keep it short (max 100 chars for anchor)
    return clean.substring(0, 100);
  }

  async searchProjectInfo(query: string, numResults: number = 5) {
    try {
      this.logger.log(`[Exa] 正在执行精准搜索: ${query}`);
      const result = await this.exa.searchAndContents(query, {
        numResults,
        useAutoprompt: false,
        text: { maxCharacters: 15000 },
      });
      return result.results;
    } catch (error) {
      this.logger.error(`[Exa] 搜索失败: ${error.message}`);
      throw error;
    }
  }

  async findOfficialLinks(symbol: string, name: string, anchor?: string) {
    const cleanAnchor = this.sanitize(anchor);
    const query = `official website and twitter for "${name}" (${symbol}) ${cleanAnchor} crypto -Cardano -Yield`;
    return this.searchProjectInfo(query, 3);
  }

  async findTechnicalDocs(symbol: string, name: string, anchor?: string) {
    const cleanAnchor = this.sanitize(anchor);
    const query = `"${name}" (${symbol}) ${cleanAnchor} original whitepaper tokenomics technical site:gitbook.io OR site:docs.*`;
    return this.searchProjectInfo(query, 5);
  }

  async findListingAnnouncements(symbol: string, name: string, anchor?: string) {
    const cleanAnchor = this.sanitize(anchor);
    const query = `"${name}" ("${symbol}") ${cleanAnchor} Binance Alpha listing announcement news`;
    return this.exa.searchAndContents(query, {
      numResults: 10,
      useAutoprompt: false,
      includeDomains: ['binance.com', 'mexc.com', 'bitget.com', 'bingx.com', 'cryptorank.io', 'rootdata.com'],
      text: { maxCharacters: 15000 },
    }).then(res => res.results);
  }

  async findTgeSpecificDocs(symbol: string, name: string, anchor?: string) {
    const cleanAnchor = this.sanitize(anchor);
    const query = `"${name}" "${symbol}" ${cleanAnchor} TGE date launchpad allocation`;
    return this.exa.searchAndContents(query, {
      numResults: 5,
      useAutoprompt: false,
      includeDomains: ['binance.com', 'mexc.com', 'twitter.com', 'medium.com'],
      text: { maxCharacters: 15000 },
    }).then(res => res.results);
  }

  async findTokenomicsDocs(symbol: string, name: string, anchor?: string) {
    const cleanAnchor = this.sanitize(anchor);
    const query = `"${name}" "${symbol}" ${cleanAnchor} total supply allocation vesting unlock schedule`;
    return this.exa.searchAndContents(query, {
      numResults: 8,
      useAutoprompt: false,
      includeDomains: ['tokenomist.ai', 'gitbook.io', 'binance.com'],
      text: { maxCharacters: 15000 },
    }).then(res => res.results);
  }
}
