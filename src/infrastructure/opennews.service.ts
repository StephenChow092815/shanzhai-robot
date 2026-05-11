import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface OpenNewsItem {
  title?: string;
  summary?: string;
  content?: string;
  url?: string;
  source?: string;
  published_at?: string;
  publishedAt?: string;
  coins?: string[];
  [key: string]: any;
}

export interface OpenNewsSearchResult {
  items: OpenNewsItem[];
  raw: any;
}

@Injectable()
export class OpenNewsService {
  private readonly logger = new Logger(OpenNewsService.name);
  private readonly baseUrl = 'https://ai.6551.io';

  constructor(private readonly configService: ConfigService) {}

  async searchByCoin(symbol: string, limit: number = 12): Promise<OpenNewsSearchResult> {
    const token = this.configService.get<string>('OPENNEWS_TOKEN') || process.env.OPENNEWS_TOKEN;
    if (!token) {
      this.logger.warn('OPENNEWS_TOKEN 未定义，跳过 6551 OpenNews 调研源');
      return { items: [], raw: null };
    }

    const normalizedSymbol = symbol.trim().toUpperCase();
    try {
      this.logger.log(`[OpenNews] 正在按代币查询 6551 新闻: ${normalizedSymbol}`);
      const response = await axios.post(
        `${this.baseUrl}/open/news_search`,
        {
          coins: [normalizedSymbol],
          q: normalizedSymbol,
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
      this.logger.error(`[OpenNews] 查询失败: ${error.message}`);
      return { items: [], raw: null };
    }
  }

  private normalizeItems(payload: any): OpenNewsItem[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    if (Array.isArray(payload?.data?.news)) return payload.data.news;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.news)) return payload.news;
    if (Array.isArray(payload?.result)) return payload.result;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  }
}
