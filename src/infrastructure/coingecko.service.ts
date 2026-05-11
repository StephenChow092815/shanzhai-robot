import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CoinGeckoService {
  private readonly logger = new Logger(CoinGeckoService.name);
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';

  async getCoinData(symbol: string) {
    try {
      this.logger.log(`[CoinGecko] 正在查询代币数据: ${symbol}`);
      
      // 1. 搜索 Coin ID
      const searchRes = await axios.get(`${this.baseUrl}/search`, {
        params: { query: symbol }
      });
      
      const coins = searchRes.data.coins || [];
      const matched = coins.find((c: any) => c.symbol.toUpperCase() === symbol.toUpperCase());
      
      if (!matched) {
        this.logger.warn(`[CoinGecko] 未找到匹配的代币: ${symbol}`);
        return null;
      }

      // 2. 获取详细数据
      const detailRes = await axios.get(`${this.baseUrl}/coins/${matched.id}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
        }
      });

      const md = detailRes.data.market_data || {};
      return {
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
      };
    } catch (error) {
      this.logger.error(`[CoinGecko] 查询失败: ${error.message}`);
      return null;
    }
  }
}
