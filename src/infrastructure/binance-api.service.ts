import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BinanceApiService {
  private readonly logger = new Logger(BinanceApiService.name);
  private readonly baseUrls = [
    'https://api.binance.com',
    'https://api1.binance.com',
    'https://api2.binance.com',
    'https://api3.binance.com'
  ];
  private readonly fapiUrl = 'https://fapi.binance.com';

  constructor(private readonly configService: ConfigService) {}

  private getBaseUrl() {
    // Return a random one or use index 0. For now, we'll keep it simple.
    return this.baseUrls[0];
  }

  /**
   * Fetch top 10 gainers from Binance Perpetual Futures.
   */
  async getTopGainers(limit: number = 10) {
    this.logger.log('正在拉取币安涨幅榜 (优先尝试合约，失败则回退现货)...');
    try {
      // Try Futures first
      return await this.getFuturesTopGainers(limit);
    } catch (error) {
      if (error.response?.status === 451) {
        this.logger.warn('币安合约 API 返回 451 (法律限制)，正在切换至现货 API...');
        return await this.getSpotTopGainers(limit);
      }
      this.logger.error(`获取币安涨幅榜失败: ${error.message}`);
      throw error;
    }
  }

  private async getFuturesTopGainers(limit: number) {
    const exInfoResponse = await axios.get(`${this.fapiUrl}/fapi/v1/exchangeInfo`, {
      proxy: this.getProxyConfig(),
      timeout: 10000,
    });

    const perpetualSymbols = new Set(
      exInfoResponse.data.symbols
        .filter((s: any) => s.contractType === 'PERPETUAL' && s.status === 'TRADING')
        .map((s: any) => s.symbol)
    );

    const tickerResponse = await axios.get(`${this.fapiUrl}/fapi/v1/ticker/24hr`, {
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
  }

  private async getSpotTopGainers(limit: number) {
    const tickerResponse = await axios.get(`${this.getBaseUrl()}/api/v3/ticker/24hr`, {
      proxy: this.getProxyConfig(),
      timeout: 10000,
    });

    const filtered = tickerResponse.data.filter((t: any) => 
      t.symbol.endsWith('USDT') && parseFloat(t.quoteVolume) > 1000000
    );

    const sorted = filtered.sort((a: any, b: any) => 
      parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent)
    );

    return sorted.slice(0, limit).map((t: any) => ({
      symbol: t.symbol,
      priceChangePercent: parseFloat(t.priceChangePercent),
      lastPrice: parseFloat(t.lastPrice),
    }));
  }

  /**
   * V13: Fetch K-line data for specific intervals
   */
  async getKlines(symbol: string, interval: string, limit: number = 1) {
    // Try Spot first, if fails or looks like a futures symbol, try Futures
    try {
      return await this.getSpotKlines(symbol, interval, limit);
    } catch (error) {
      return await this.getFuturesKlines(symbol, interval, limit);
    }
  }

  private async getSpotKlines(symbol: string, interval: string, limit: number) {
    const response = await axios.get(`${this.getBaseUrl()}/api/v3/klines`, {
      params: { symbol, interval, limit },
      proxy: this.getProxyConfig(),
      timeout: 5000,
    });
    return response.data;
  }

  private async getFuturesKlines(symbol: string, interval: string, limit: number) {
    try {
      const response = await axios.get(`${this.fapiUrl}/fapi/v1/klines`, {
        params: { symbol, interval, limit },
        proxy: this.getProxyConfig(),
        timeout: 5000,
      });
      return response.data;
    } catch (e) {
      this.logger.error(`获取 K 线数据失败 (${symbol}, ${interval}): ${e.message}`);
      return null;
    }
  }

  async getCurrentPrice(symbol: string) {
    try {
      const ticker = await axios.get(`${this.getBaseUrl()}/api/v3/ticker/price`, {
        params: { symbol },
        proxy: this.getProxyConfig(),
        timeout: 5000,
      });
      return parseFloat(ticker.data.price);
    } catch (error) {
      const ticker = await axios.get(`${this.fapiUrl}/fapi/v1/ticker/price`, {
        params: { symbol },
        proxy: this.getProxyConfig(),
        timeout: 5000,
      });
      return parseFloat(ticker.data.price);
    }
  }

  async getTradingSnapshot(symbol: string) {
    try {
      const ticker = await axios.get(`${this.fapiUrl}/fapi/v1/ticker/24hr`, {
        params: { symbol },
        proxy: this.getProxyConfig(),
        timeout: 8000,
      });
      const [volatility, derivatives] = await Promise.all([
        this.getMultiIntervalVolatility(symbol),
        this.getDerivativesMetrics(symbol),
      ]);
      return {
        venue: 'binance_futures',
        symbol,
        lastPrice: parseFloat(ticker.data.lastPrice),
        priceChangePercent24h: parseFloat(ticker.data.priceChangePercent),
        quoteVolume24h: parseFloat(ticker.data.quoteVolume),
        highPrice24h: parseFloat(ticker.data.highPrice),
        lowPrice24h: parseFloat(ticker.data.lowPrice),
        currentPrice: volatility.currentPrice,
        intervalChanges: volatility.changes,
        derivatives,
      };
    } catch (error) {
      const ticker = await axios.get(`${this.getBaseUrl()}/api/v3/ticker/24hr`, {
        params: { symbol },
        proxy: this.getProxyConfig(),
        timeout: 8000,
      });
      const volatility = await this.getMultiIntervalVolatility(symbol);
      return {
        venue: 'binance_spot',
        symbol,
        lastPrice: parseFloat(ticker.data.lastPrice),
        priceChangePercent24h: parseFloat(ticker.data.priceChangePercent),
        quoteVolume24h: parseFloat(ticker.data.quoteVolume),
        highPrice24h: parseFloat(ticker.data.highPrice),
        lowPrice24h: parseFloat(ticker.data.lowPrice),
        currentPrice: volatility.currentPrice,
        intervalChanges: volatility.changes,
        derivatives: null,
      };
    }
  }

  async getDerivativesMetrics(symbol: string) {
    try {
      const [openInterest, premiumIndex, oiHistory, takerRatio, minuteKlines] = await Promise.all([
        axios.get(`${this.fapiUrl}/fapi/v1/openInterest`, {
          params: { symbol },
          proxy: this.getProxyConfig(),
          timeout: 8000,
        }).then((res) => res.data).catch(() => null),
        axios.get(`${this.fapiUrl}/fapi/v1/premiumIndex`, {
          params: { symbol },
          proxy: this.getProxyConfig(),
          timeout: 8000,
        }).then((res) => res.data).catch(() => null),
        axios.get(`${this.fapiUrl}/futures/data/openInterestHist`, {
          params: { symbol, period: '5m', limit: 12 },
          proxy: this.getProxyConfig(),
          timeout: 8000,
        }).then((res) => res.data).catch(() => []),
        axios.get(`${this.fapiUrl}/futures/data/takerlongshortRatio`, {
          params: { symbol, period: '5m', limit: 12 },
          proxy: this.getProxyConfig(),
          timeout: 8000,
        }).then((res) => res.data).catch(() => []),
        this.getFuturesKlines(symbol, '1m', 61).catch(() => null),
      ]);

      const oiNow = openInterest?.openInterest ? parseFloat(openInterest.openInterest) : null;
      const oiHistoryChange = this.calculateOpenInterestChange(oiHistory);
      const cvd = this.calculateCvd(minuteKlines);
      const taker = this.summarizeTakerRatio(takerRatio);

      return {
        openInterest: oiNow,
        openInterestChange1hPercent: oiHistoryChange,
        fundingRate: premiumIndex?.lastFundingRate ? parseFloat(premiumIndex.lastFundingRate) : null,
        markPrice: premiumIndex?.markPrice ? parseFloat(premiumIndex.markPrice) : null,
        nextFundingTime: premiumIndex?.nextFundingTime ? new Date(Number(premiumIndex.nextFundingTime)).toISOString() : null,
        takerBuySellRatio1h: taker.buySellRatio,
        takerBuyVolume1h: taker.buyVolume,
        takerSellVolume1h: taker.sellVolume,
        cvdQuote15m: cvd.quote15m,
        cvdQuote1h: cvd.quote1h,
        cvdBase15m: cvd.base15m,
        cvdBase1h: cvd.base1h,
        cvdBuyRatio15m: cvd.buyRatio15m,
        cvdBuyRatio1h: cvd.buyRatio1h,
      };
    } catch (error) {
      this.logger.warn(`衍生品指标获取失败 (${symbol}): ${error.message}`);
      return null;
    }
  }

  async getOpenInterestTimeframes(symbol: string) {
    const futuresSymbol = this.toUsdtFuturesSymbol(symbol);
    try {
      const current = await axios.get(`${this.fapiUrl}/fapi/v1/openInterest`, {
        params: { symbol: futuresSymbol },
        proxy: this.getProxyConfig(),
        timeout: 8000,
      }).then((res) => res.data).catch((error) => {
        this.logger.warn(`获取当前 OI 失败 (${futuresSymbol}): status=${error?.response?.status || 'NO_STATUS'} message=${error.message}`);
        return null;
      });

      const [m15, h1, h4, d1] = await Promise.all([
        this.getOpenInterestWindow(futuresSymbol, '5m', 4),
        this.getOpenInterestWindow(futuresSymbol, '5m', 12),
        this.getOpenInterestWindow(futuresSymbol, '15m', 16),
        this.getOpenInterestWindow(futuresSymbol, '1h', 24),
      ]);

      const openInterest = current?.openInterest ? parseFloat(current.openInterest) : null;
      const hasData = openInterest !== null || [m15, h1, h4, d1].some((item) => item?.openInterest !== null);
      if (!hasData) {
        this.logger.warn(`Binance OI 无数据: input=${symbol} futuresSymbol=${futuresSymbol}，可能未上线 Binance U 本位合约。`);
      }

      return {
        venue: 'binance_futures',
        inputSymbol: symbol,
        symbol: futuresSymbol,
        openInterest,
        available: hasData,
        reason: hasData ? null : 'no_binance_futures_oi',
        timeframes: {
          '15m': m15,
          '1h': h1,
          '4h': h4,
          '1d': d1,
        },
      };
    } catch (error) {
      this.logger.warn(`获取 OI 分周期失败 (${futuresSymbol}): ${error.message}`);
      return {
        venue: 'binance_futures',
        inputSymbol: symbol,
        symbol: futuresSymbol,
        openInterest: null,
        available: false,
        reason: 'request_failed',
        timeframes: {
          '15m': null,
          '1h': null,
          '4h': null,
          '1d': null,
        },
        error: error.message,
      };
    }
  }

  private async getOpenInterestWindow(symbol: string, period: string, limit: number) {
    const rows = await axios.get(`${this.fapiUrl}/futures/data/openInterestHist`, {
      params: { symbol, period, limit },
      proxy: this.getProxyConfig(),
      timeout: 8000,
    }).then((res) => res.data).catch((error) => {
      this.logger.warn(`获取 OI 历史失败 (${symbol}, ${period}, limit=${limit}): status=${error?.response?.status || 'NO_STATUS'} message=${error.message}`);
      return [];
    });

    if (!Array.isArray(rows) || rows.length === 0) {
      return { period, openInterest: null, openInterestValue: null, changePercent: null, reason: 'empty_history' };
    }

    const first = rows[0];
    const last = rows[rows.length - 1];
    const firstOi = parseFloat(first?.sumOpenInterest || '0');
    const lastOi = parseFloat(last?.sumOpenInterest || '0');
    const lastValue = parseFloat(last?.sumOpenInterestValue || '0');
    const changePercent = firstOi > 0 && !Number.isNaN(lastOi)
      ? parseFloat((((lastOi - firstOi) / firstOi) * 100).toFixed(2))
      : null;

    return {
      period,
      openInterest: Number.isNaN(lastOi) ? null : lastOi,
      openInterestValue: Number.isNaN(lastValue) ? null : lastValue,
      changePercent,
      timestamp: last?.timestamp ? new Date(Number(last.timestamp)).toISOString() : null,
    };
  }

  private toUsdtFuturesSymbol(symbol: string) {
    const normalized = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalized.endsWith('USDT')) return normalized;
    if (normalized.endsWith('USD')) return `${normalized}T`;
    return `${normalized}USDT`;
  }

  /**
   * V13: Aggregate volatility across multiple timeframes
   */
  async getMultiIntervalVolatility(symbol: string) {
    const results: Record<string, number | null> = {};

    try {
      const currentPrice = await this.getCurrentPrice(symbol);
      const [minuteKlines, hourlyKlines] = await Promise.all([
        this.getKlines(symbol, '1m', 61),
        this.getKlines(symbol, '1h', 25),
      ]);

      results['15m'] = this.calculateRollingChange(currentPrice, minuteKlines, 15);
      results['1h'] = this.calculateRollingChange(currentPrice, minuteKlines, 60);
      results['4h'] = this.calculateRollingChange(currentPrice, hourlyKlines, 4);
      results['1d'] = this.calculateRollingChange(currentPrice, hourlyKlines, 24);

      return {
        currentPrice,
        changes: results,
      };
    } catch (error) {
      return {
        currentPrice: null,
        changes: { '15m': null, '1h': null, '4h': null, '1d': null },
      };
    }
  }

  private calculateRollingChange(currentPrice: number, klines: any[] | null, lookback: number) {
    if (!klines || klines.length <= lookback) return null;

    const anchor = klines[klines.length - lookback - 1];
    const anchorClose = parseFloat(anchor[4]);
    if (!anchorClose || Number.isNaN(anchorClose)) return null;

    const change = ((currentPrice - anchorClose) / anchorClose) * 100;
    return parseFloat(change.toFixed(2));
  }

  private calculateOpenInterestChange(history: any[]) {
    if (!Array.isArray(history) || history.length < 2) return null;
    const first = parseFloat(history[0]?.sumOpenInterest || history[0]?.sumOpenInterestValue || '0');
    const last = parseFloat(history[history.length - 1]?.sumOpenInterest || history[history.length - 1]?.sumOpenInterestValue || '0');
    if (!first || Number.isNaN(first) || Number.isNaN(last)) return null;
    return parseFloat((((last - first) / first) * 100).toFixed(2));
  }

  private summarizeTakerRatio(items: any[]) {
    if (!Array.isArray(items) || items.length === 0) {
      return { buySellRatio: null, buyVolume: null, sellVolume: null };
    }

    const totals = items.reduce((acc, item) => {
      acc.buyVolume += parseFloat(item.buyVol || item.buyVolume || '0');
      acc.sellVolume += parseFloat(item.sellVol || item.sellVolume || '0');
      return acc;
    }, { buyVolume: 0, sellVolume: 0 });

    const buySellRatio = totals.sellVolume > 0 ? totals.buyVolume / totals.sellVolume : null;
    return {
      buySellRatio: buySellRatio === null ? null : parseFloat(buySellRatio.toFixed(4)),
      buyVolume: parseFloat(totals.buyVolume.toFixed(4)),
      sellVolume: parseFloat(totals.sellVolume.toFixed(4)),
    };
  }

  private calculateCvd(klines: any[] | null) {
    const empty = {
      quote15m: null,
      quote1h: null,
      base15m: null,
      base1h: null,
      buyRatio15m: null,
      buyRatio1h: null,
    };
    if (!klines || klines.length < 2) return empty;

    const summarize = (lookback: number) => {
      const slice = klines.slice(-lookback);
      if (slice.length === 0) return { quote: null, base: null, buyRatio: null };

      const totals = slice.reduce((acc, kline) => {
        const baseVolume = parseFloat(kline[5] || '0');
        const quoteVolume = parseFloat(kline[7] || '0');
        const takerBuyBase = parseFloat(kline[9] || '0');
        const takerBuyQuote = parseFloat(kline[10] || '0');

        acc.baseDelta += takerBuyBase - (baseVolume - takerBuyBase);
        acc.quoteDelta += takerBuyQuote - (quoteVolume - takerBuyQuote);
        acc.quoteVolume += quoteVolume;
        acc.takerBuyQuote += takerBuyQuote;
        return acc;
      }, { baseDelta: 0, quoteDelta: 0, quoteVolume: 0, takerBuyQuote: 0 });

      return {
        quote: parseFloat(totals.quoteDelta.toFixed(2)),
        base: parseFloat(totals.baseDelta.toFixed(4)),
        buyRatio: totals.quoteVolume > 0 ? parseFloat((totals.takerBuyQuote / totals.quoteVolume).toFixed(4)) : null,
      };
    };

    const m15 = summarize(Math.min(15, klines.length));
    const h1 = summarize(Math.min(60, klines.length));

    return {
      quote15m: m15.quote,
      quote1h: h1.quote,
      base15m: m15.base,
      base1h: h1.base,
      buyRatio15m: m15.buyRatio,
      buyRatio1h: h1.buyRatio,
    };
  }

  /**
   * Fetch official Binance announcements (Listing, Activities, News)
   * Catalog IDs: 48 (New Listing), 161 (Latest Activities), 93 (Latest News)
   */
  async getAnnouncements(catalogId: number = 48, pageNo: number = 1, pageSize: number = 10) {
    this.logger.log(`正在拉取币安官方公告 (Catalog: ${catalogId})...`);
    try {
      const response = await axios.get('https://www.binance.com/bapi/composite/v1/public/cms/article/list/query', {
        params: {
          catalogId: catalogId, // Typically 48
          pageNo: 1,
          pageSize: pageSize,
          type: 1,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        proxy: this.getProxyConfig(),
        timeout: 10000,
      });

      const allArticles: any[] = [];
      const catalogs = response.data?.data?.catalogs || [];
      
      for (const catalog of catalogs) {
        const articles = catalog.articles || [];
        for (const a of articles) {
          allArticles.push({
            title: a.title,
            code: a.code,
            releaseDate: new Date(a.releaseDate).toISOString(),
          });
        }
      }

      this.logger.log(`[API-Match] 成功拉取并解析 ${allArticles.length} 条币安公告。`);
      return allArticles;
    } catch (error) {
      this.logger.error(`获取币安公告失败: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch specific announcement detail to extract links
   */
  async getAnnouncementDetail(code: string) {
    try {
      const response = await axios.get('https://www.binance.com/bapi/composite/v1/public/cms/article/detail/query', {
        params: { articleCode: code },
        proxy: this.getProxyConfig(),
      });
      if (response.data && response.data.code === '000000') {
        return response.data.data.content; // HTML content
      }
      return null;
    } catch (error) {
      return null;
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
