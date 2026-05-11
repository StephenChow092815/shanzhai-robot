import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class OpenTwitterService {
  private readonly logger = new Logger(OpenTwitterService.name);
  private readonly baseUrl = 'https://ai.6551.io';

  constructor(private readonly configService: ConfigService) {}

  async searchByCoin(symbol: string, limit: number = 20) {
    const token = this.getValidToken();
    if (!token) {
      return { items: [], raw: null };
    }

    const normalizedSymbol = symbol.trim().toUpperCase().replace(/USDT$/, '');
    try {
      this.logger.log(`[OpenTwitter] 正在查询推特情绪: ${normalizedSymbol}`);
      const response = await axios.post(
        `${this.baseUrl}/open/twitter_search`,
        {
          q: `$${normalizedSymbol} OR ${normalizedSymbol}`,
          coins: [normalizedSymbol],
          limit,
          page: 1,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      return {
        items: this.normalizeItems(response.data).slice(0, limit),
        raw: response.data,
      };
    } catch (error) {
      this.logger.error(`[OpenTwitter] 查询失败: ${error.message}`);
      return { items: [], raw: null };
    }
  }

  private normalizeItems(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    if (Array.isArray(payload?.data?.tweets)) return payload.data.tweets;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.tweets)) return payload.tweets;
    if (Array.isArray(payload?.result)) return payload.result;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  }

  private getValidToken() {
    const token = this.configService.get<string>('TWITTER_TOKEN') || process.env.TWITTER_TOKEN;
    if (!token) {
      this.logger.warn('TWITTER_TOKEN 未定义，跳过 6551 OpenTwitter 情绪源');
      return null;
    }

    if (!/^[\x20-\x7E]+$/.test(token)) {
      this.logger.warn('TWITTER_TOKEN 含有非 ASCII 字符，已跳过 6551 OpenTwitter 情绪源。请检查 .env 是否填了中文占位文本。');
      return null;
    }

    return token.trim();
  }
}
