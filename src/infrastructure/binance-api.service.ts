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
   */
  async getTopGainers(limit: number = 10) {
    this.logger.log('正在拉取币安合约元数据并筛选永续合约...');
    try {
      const exInfoResponse = await axios.get(`${this.baseUrl}/fapi/v1/exchangeInfo`, {
        proxy: this.getProxyConfig(),
        timeout: 10000,
      });

      const perpetualSymbols = new Set(
        exInfoResponse.data.symbols
          .filter((s: any) => s.contractType === 'PERPETUAL' && s.status === 'TRADING')
          .map((s: any) => s.symbol)
      );

      const tickerResponse = await axios.get(`${this.baseUrl}/fapi/v1/ticker/24hr`, {
        proxy: this.getProxyConfig(),
        timeout: 10000,
      });

      const filteredTickers = tickerResponse.data.filter((t: any) => {
        const symbol = t.symbol.toUpperCase();
        return perpetualSymbols.has(symbol) && symbol.endsWith('USDT') && parseFloat(t.quoteVolume) > 10000000;
      });

      const sorted = filteredTickers.sort((a: any, b: any) => 
        parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent)
      );

      return sorted.slice(0, limit).map((t: any) => ({
        symbol: t.symbol,
        priceChangePercent: parseFloat(t.priceChangePercent),
        lastPrice: parseFloat(t.lastPrice),
      }));
    } catch (error) {
      this.logger.error(`获取币安永续涨幅榜失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * V13: Fetch K-line data for specific intervals
   */
  async getKlines(symbol: string, interval: string, limit: number = 1) {
    try {
      const response = await axios.get(`${this.baseUrl}/fapi/v1/klines`, {
        params: { symbol, interval, limit },
        proxy: this.getProxyConfig(),
        timeout: 5000,
      });
      return response.data; // [[OpenTime, Open, High, Low, Close, Volume, ...]]
    } catch (error) {
      this.logger.error(`获取 K 线数据失败 (${symbol}, ${interval}): ${error.message}`);
      return null;
    }
  }

  /**
   * V13: Aggregate volatility across multiple timeframes
   */
  async getMultiIntervalVolatility(symbol: string) {
    const intervals = ['5m', '15m', '1h', '4h'];
    const results: Record<string, number> = {};

    try {
      // 1. Get current ticker price
      const ticker = await axios.get(`${this.baseUrl}/fapi/v1/ticker/price`, {
        params: { symbol },
        proxy: this.getProxyConfig(),
      });
      const currentPrice = parseFloat(ticker.data.price);

      // 2. Fetch all intervals in parallel
      await Promise.all(intervals.map(async (inv) => {
        const kline = await this.getKlines(symbol, inv, 1);
        if (kline && kline.length > 0) {
          const openPrice = parseFloat(kline[0][1]);
          const change = ((currentPrice - openPrice) / openPrice) * 100;
          results[inv] = parseFloat(change.toFixed(2));
        } else {
          results[inv] = 0;
        }
      }));

      return results;
    } catch (error) {
      return { '5m': 0, '15m': 0, '1h': 0, '4h': 0 };
    }
  }

  private getProxyConfig() {
    const proxyUrl = process.env.HTTPS_PROXY;
    if (!proxyUrl) return undefined;
    try {
      const url = new URL(proxyUrl);
      let host = url.hostname;
      if (host === 'host.docker.internal' && !require('fs').existsSync('/.dockerenv')) {
        host = '127.0.0.1';
      }
      return { protocol: url.protocol.replace(':', ''), host, port: parseInt(url.port, 10) };
    } catch (error) {
      return undefined;
    }
  }
}
