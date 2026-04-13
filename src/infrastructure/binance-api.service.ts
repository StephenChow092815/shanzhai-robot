import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BinanceApiService {
  private readonly logger = new Logger(BinanceApiService.name);
  private readonly baseUrl = 'https://fapi.binance.com';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Fetch top 10 gainers from Binance Perpetual Futures.
   * Filters by contractType === 'PERPETUAL' and quoteVolume to match official App rankings.
   */
  async getTopGainers(limit: number = 10) {
    this.logger.log('正在拉取币安合约元数据并筛选永续合约...');
    
    try {
      // 1. Fetch exchangeInfo to get PERPETUAL symbols
      const exInfoResponse = await axios.get(`${this.baseUrl}/fapi/v1/exchangeInfo`, {
        proxy: this.getProxyConfig(),
        timeout: 10000,
      });

      const perpetualSymbols = new Set(
        exInfoResponse.data.symbols
          .filter((s: any) => s.contractType === 'PERPETUAL' && s.status === 'TRADING')
          .map((s: any) => s.symbol)
      );

      this.logger.log(`已识别 ${perpetualSymbols.size} 个活跃永续合约。`);

      // 2. Fetch 24hr ticker data
      const tickerResponse = await axios.get(`${this.baseUrl}/fapi/v1/ticker/24hr`, {
        proxy: this.getProxyConfig(),
        timeout: 10000,
      });

      const tickers = tickerResponse.data;
      
      // 3. Filter: PERPETUAL only + USDT pair + Volume > 10M + No Alpha/Innovation noise if needed
      const FILTER_KEYWORDS = ['ALPHA', 'YALA', 'TANSSIUSDT', 'A2Z', 'BNX', 'ALPACA'];

      const filteredTickers = tickers.filter((t: any) => {
        const symbol = t.symbol.toUpperCase();
        const isPerpetual = perpetualSymbols.has(symbol);
        const isUsdt = symbol.endsWith('USDT');
        const quoteVolume = parseFloat(t.quoteVolume);
        
        // Exclude specific innovation zone noise explicitly
        const isNoise = FILTER_KEYWORDS.some(k => symbol.includes(k));
        
        // Threshold lowered to 5M (5,000,000) to match App screenshot and retain active yet lower-cap gainers
        return isPerpetual && isUsdt && quoteVolume > 5000000 && !isNoise;
      });

      // 4. Sort and Take Top N
      const sorted = filteredTickers.sort((a: any, b: any) => 
        parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent)
      );

      const topN = sorted.slice(0, limit).map((t: any) => ({
        symbol: t.symbol,
        priceChangePercent: parseFloat(t.priceChangePercent),
        lastPrice: parseFloat(t.lastPrice),
      }));

      this.logger.log(`对齐 App 永续榜单后获取前 ${limit} 名币种: ${topN.map((n: any) => n.symbol).join(', ')}`);
      return topN;
    } catch (error) {
      this.logger.error(`获取币安永续涨幅榜失败: ${error.message}`);
      throw error;
    }
  }

  private getProxyConfig() {
    const proxyUrl = process.env.HTTPS_PROXY;
    if (!proxyUrl) return undefined;

    try {
      const url = new URL(proxyUrl);
      return {
        protocol: url.protocol.replace(':', ''),
        host: url.hostname,
        port: parseInt(url.port, 10),
      };
    } catch (error) {
      this.logger.warn(`代理地址格式错误: ${proxyUrl}, 将退回直连模式`);
      return undefined;
    }
  }
}
