import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class CoinGeckoService {
  private readonly logger = new Logger(CoinGeckoService.name);
  private readonly cacheTtlMs = 30 * 60 * 1000;
  private readonly cache = new Map<string, { expiresAt: number; data: any }>();

  constructor(private readonly configService: ConfigService) {}

  private getApiConfig() {
    const proKey = this.getAsciiEnv('COINGECKO_PRO_API_KEY');
    const demoKey = this.getAsciiEnv('COINGECKO_DEMO_API_KEY') || this.getAsciiEnv('COINGECKO_API_KEY');

    if (proKey) {
      return {
        baseUrl: 'https://pro-api.coingecko.com/api/v3',
        headers: { 'x-cg-pro-api-key': proKey },
        keyType: 'pro',
      };
    }

    return {
      baseUrl: 'https://api.coingecko.com/api/v3',
      headers: demoKey ? { 'x-cg-demo-api-key': demoKey } : {},
      keyType: demoKey ? 'demo' : 'none',
    };
  }

  private logAxiosError(step: string, error: any) {
    const status = error?.response?.status;
    const headers = error?.response?.headers || {};
    const rateHeaders = {
      retryAfter: headers['retry-after'],
      remaining: headers['x-ratelimit-remaining'],
      limit: headers['x-ratelimit-limit'],
      reset: headers['x-ratelimit-reset'],
    };

    this.logger.warn(`[CoinGecko] ${step} 请求失败 status=${status || 'NO_STATUS'} rate=${JSON.stringify(rateHeaders)}`);
  }

  private decodeHtml(value: string) {
    return value
      .replace(/\\\//g, '/')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x2F;/g, '/')
      .replace(/&#39;/g, "'");
  }

  private cleanSocialUrl(url: string) {
    return this.decodeHtml(url)
      .replace(/\\u0026/g, '&')
      .replace(/[)"'<>\]\s]+$/g, '');
  }

  private extractTwitterScreenName(url: string) {
    const match = url.match(/(?:twitter\.com|x\.com)\/([^/?#"'<>]+)/i);
    const screenName = match?.[1]?.replace(/^@/, '');
    if (!screenName || ['intent', 'share', 'search', 'home', 'i'].includes(screenName.toLowerCase())) return null;
    return screenName;
  }

  private async fetchPageLinks(id: string) {
    try {
      const url = `https://www.coingecko.com/en/coins/${id}`;
      const res = await axios.get(url, {
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
        },
        timeout: 10000,
      });

      const html = String(res.data || '');
      const urls = Array.from(html.matchAll(/https?:\\?\/\\?\/(?:www\.)?(?:twitter\.com|x\.com|t\.me|telegram\.me|reddit\.com)\\?\/[^"'<>\s)]+/gi))
        .map((match) => this.cleanSocialUrl(match[0]));
      const twitterUrl = urls.find((item) => this.extractTwitterScreenName(item)) || null;
      const twitterScreenName = twitterUrl ? this.extractTwitterScreenName(twitterUrl) : null;
      const telegramUrl = urls.find((item) => /(?:t\.me|telegram\.me)\//i.test(item)) || null;
      const subredditUrl = urls.find((item) => /reddit\.com/i.test(item)) || null;

      const links = {
        homepage: null,
        twitter_screen_name: twitterScreenName,
        twitter_url: twitterUrl,
        telegram_channel_identifier: telegramUrl?.match(/(?:t\.me|telegram\.me)\/([^/?#"'<>]+)/i)?.[1] || null,
        telegram_url: telegramUrl,
        subreddit_url: subredditUrl,
        repos_url: {},
      };

      return links;
    } catch (error) {
      this.logAxiosError('webpage', error);
      return null;
    }
  }

  private getAsciiEnv(name: string) {
    const value = this.configService.get<string>(name) || process.env[name];
    if (!value) return null;
    if (!/^[\x20-\x7E]+$/.test(value)) {
      this.logger.warn(`${name} 含有非 ASCII 字符，请检查 .env 是否填了中文占位文本。`);
      return null;
    }
    return value.trim();
  }

  async getCoinData(symbol: string) {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const cached = this.cache.get(normalizedSymbol);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    try {
      const { baseUrl, headers, keyType } = this.getApiConfig();
      this.logger.log(`[CoinGecko] 查询代币资料: ${normalizedSymbol} keyType=${keyType}`);
      
      // 1. 搜索 Coin ID
      let searchRes;
      try {
        searchRes = await axios.get(`${baseUrl}/search`, {
          headers,
          params: { query: normalizedSymbol },
          timeout: 10000,
        });
      } catch (error) {
        this.logAxiosError('search', error);
        throw error;
      }
      
      const coins = searchRes.data.coins || [];
      const matched = coins.find((c: any) => c.symbol.toUpperCase() === normalizedSymbol);
      
      if (!matched) {
        this.logger.warn(`[CoinGecko] 未找到匹配的代币: ${normalizedSymbol}`);
        return null;
      }

      // 2. 获取详细数据
      let detailRes;
      try {
        detailRes = await axios.get(`${baseUrl}/coins/${matched.id}`, {
          headers,
          params: {
            localization: false,
            tickers: false,
            market_data: true,
            community_data: false,
            developer_data: false,
          },
          timeout: 10000,
        });
      } catch (error) {
        this.logAxiosError('detail', error);
        const webpageLinks = await this.fetchPageLinks(matched.id);
        const fallback = {
          id: matched.id,
          name: matched.name,
          symbol: matched.symbol?.toUpperCase(),
          price: null,
          mcap: null,
          fdv: null,
          total_supply: null,
          max_supply: null,
          circulating_supply: null,
          description: null,
          categories: [],
          platforms: {},
          links: webpageLinks || {
            homepage: null,
            twitter_screen_name: matched.twitter_screen_name || null,
            twitter_url: matched.twitter_screen_name ? `https://x.com/${matched.twitter_screen_name}` : null,
            telegram_channel_identifier: null,
            telegram_url: null,
            subreddit_url: null,
            repos_url: {},
          },
          search: matched,
          partial: true,
          partial_reason: error?.response?.status === 429 ? 'detail_rate_limited' : 'detail_failed',
        };
        this.cache.set(normalizedSymbol, { data: fallback, expiresAt: Date.now() + 60 * 1000 });
        return fallback;
      }

      const md = detailRes.data.market_data || {};
      const links = detailRes.data.links || {};
      const twitterScreenName = links.twitter_screen_name || null;
      const homepage = (links.homepage || []).find(Boolean) || null;
      const telegramChannel = links.telegram_channel_identifier || null;

      const data = {
        id: matched.id,
        name: detailRes.data.name,
        symbol: detailRes.data.symbol.toUpperCase(),
        price: md.current_price?.usd,
        mcap: md.market_cap?.usd,
        fdv: md.fully_diluted_valuation?.usd,
        total_supply: md.total_supply,
        max_supply: md.max_supply,
        circulating_supply: md.circulating_supply,
        description: detailRes.data.description?.en?.substring(0, 500),
        categories: detailRes.data.categories || [],
        platforms: detailRes.data.platforms || {},
        links: {
          homepage,
          twitter_screen_name: twitterScreenName,
          twitter_url: twitterScreenName ? `https://x.com/${twitterScreenName}` : null,
          telegram_channel_identifier: telegramChannel,
          telegram_url: telegramChannel ? `https://t.me/${telegramChannel}` : null,
          subreddit_url: links.subreddit_url || null,
          repos_url: links.repos_url || {},
        },
      };
      this.cache.set(normalizedSymbol, { data, expiresAt: Date.now() + this.cacheTtlMs });
      return data;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 429) {
        this.logger.warn('[CoinGecko] 请求被限流 429，已跳过 CoinGecko 项目资料。配置 COINGECKO_DEMO_API_KEY 或 COINGECKO_PRO_API_KEY 可提高额度。');
      } else {
        this.logger.error(`[CoinGecko] 查询失败: ${error.message}`);
      }
      return null;
    }
  }
}
