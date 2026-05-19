import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

type AveTokenCandidate = {
  tokenId: string;
  chain: string | null;
  address: string | null;
  symbol: string | null;
  name: string | null;
  holders: number | null;
  logoUrl: string | null;
  priceUsd: number | null;
  marketCap: number | null;
  fdv: number | null;
  volume24hUsd: number | null;
  liquidityUsd: number | null;
  raw: any;
};

@Injectable()
export class AveApiService {
  private readonly logger = new Logger(AveApiService.name);
  private readonly baseUrl = 'https://prod.ave-api.com';
  private readonly cacheTtlMs = 60 * 1000;
  private readonly cache = new Map<string, { expiresAt: number; data: any }>();

  constructor(private readonly configService: ConfigService) {}

  async researchToken(symbolOrAddress: string, preferredChain?: string) {
    const apiKey = this.getValidApiKey();
    if (!apiKey) {
      return { available: false, reason: 'missing_api_key' };
    }

    const query = symbolOrAddress.trim();
    const cacheKey = `${query.toUpperCase()}:${preferredChain || 'any'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const candidates = await this.searchTokens(query, preferredChain);
    const token = this.pickBestToken(candidates, query, preferredChain);
    if (!token) {
      this.logger.warn(`[Ave] token_not_found query=${query} candidates=${candidates.length}`);
      return { available: true, token: null, reason: 'token_not_found', candidates };
    }
    this.logger.log(`[Ave] selected_token query=${query} tokenId=${token.tokenId} chain=${token.chain} symbol=${token.symbol} name=${token.name}`);

    const [detail, risk, holders, klines] = await Promise.all([
      this.getTokenDetail(token.tokenId),
      this.getContractRisk(token.tokenId),
      this.getTopHolders(token.tokenId, 100),
      this.getMultiIntervalKlines(token.tokenId),
    ]);

    const data = {
      available: true,
      token,
      detail,
      risk,
      holders,
      klines,
      summary: {
        tokenId: token.tokenId,
        chain: token.chain,
        address: token.address,
        symbol: detail?.symbol || token.symbol,
        name: detail?.name || token.name,
        holders: detail?.holders ?? token.holders,
        logoUrl: detail?.logoUrl || token.logoUrl,
        priceUsd: detail?.priceUsd ?? token.priceUsd,
        liquidityUsd: detail?.liquidityUsd ?? token.liquidityUsd,
        volume24hUsd: detail?.volume24hUsd ?? token.volume24hUsd,
        marketCap: detail?.marketCap ?? token.marketCap,
        fdv: detail?.fdv ?? token.fdv,
        holderConcentration: holders?.concentration || null,
        intervalChanges: klines?.intervalChanges || {},
      },
    };

    this.cache.set(cacheKey, { data, expiresAt: Date.now() + this.cacheTtlMs });
    return data;
  }

  private async searchTokens(keyword: string, chain?: string): Promise<AveTokenCandidate[]> {
    const params: Record<string, any> = { keyword };
    if (chain) params.chain = chain;

    const data = await this.request('search', '/v2/tokens', params);
    this.logPayloadShape('search', data);
    const items = this.extractSearchItems(data);
    this.logger.log(`[Ave] search_items keyword=${keyword} count=${items.length} sample=${JSON.stringify(items.slice(0, 2)).substring(0, 2000)}`);
    const candidates = items.map((item: any) => this.normalizeTokenCandidate(item)).filter((item: AveTokenCandidate) => item.tokenId);
    this.logger.log(`[Ave] search keyword=${keyword} chain=${chain || 'any'} candidates=${candidates.length} normalized=${JSON.stringify(candidates.slice(0, 5).map((item) => ({
      tokenId: item.tokenId,
      chain: item.chain,
      address: item.address,
      symbol: item.symbol,
      name: item.name,
      holders: item.holders,
      logoUrl: item.logoUrl,
      liquidityUsd: item.liquidityUsd,
      volume24hUsd: item.volume24hUsd,
      marketCap: item.marketCap,
    })))}`);
    return candidates;
  }

  private async getTokenDetail(tokenId: string) {
    const data = await this.request('token_detail', `/v2/tokens/${tokenId}`);
    this.logPayloadShape('token_detail', data);
    const raw = data?.data || data?.token || data;
    const pairs = this.asArray(raw?.pairs || raw?.top_pairs || raw?.top5_pairs || raw?.pair || raw?.data?.pairs);
    const candidate = this.normalizeTokenCandidate({ ...raw, token: raw?.token || raw, token_id: tokenId });
    return {
      ...candidate,
      pairs: pairs.slice(0, 5),
      raw,
    };
  }

  private async getContractRisk(tokenId: string) {
    const data = await this.request('contract_risk', `/v2/contracts/${tokenId}`);
    this.logPayloadShape('contract_risk', data);
    const raw = data?.data || data?.contract || data;
    return {
      score: this.firstNumber(raw, ['risk_score', 'score', 'riskScore']),
      level: this.firstString(raw, ['risk_level', 'level', 'riskLevel']),
      flags: this.extractRiskFlags(raw),
      raw,
    };
  }

  private async getTopHolders(tokenId: string, limit = 100) {
    const data = await this.request('top_holders', `/v2/tokens/top100/${tokenId}`, { limit });
    this.logPayloadShape('top_holders', data);
    const rawItems = this.asArray(data?.data?.holders || data?.data || data?.holders || data);
    const holders = rawItems.map((item: any) => ({
      address: this.firstString(item, ['address', 'holder', 'wallet_address']),
      balanceRatio: this.normalizeRatio(this.firstNumber(item, ['balance_ratio', 'ratio', 'percentage', 'percent'])),
      balanceUsd: this.firstNumber(item, ['balance_usd', 'usd', 'value_usd']),
      amount: this.firstNumber(item, ['amount_cur', 'amount', 'balance']),
      mainCoinBalance: this.firstNumber(item, ['main_coin_balance', 'native_balance']),
      raw: item,
    })).filter((item) => item.address || item.amount !== null);

    const sum = (count: number) => holders.slice(0, count).reduce((acc, item) => acc + (item.balanceRatio || 0), 0);
    return {
      holders,
      concentration: {
        top1: sum(1),
        top5: sum(5),
        top10: sum(10),
        top20: sum(20),
        top100: sum(100),
      },
      raw: data,
    };
  }

  private async getMultiIntervalKlines(tokenId: string) {
    const intervals = [
      { key: '15m', interval: 15 },
      { key: '1h', interval: 60 },
      { key: '4h', interval: 240 },
      { key: '1d', interval: 1440 },
    ];

    const results = await Promise.all(intervals.map(async ({ key, interval }) => {
      try {
        const data = await this.request(`kline_${key}`, `/v2/klines/token/${tokenId}`, { interval, limit: 2 });
        this.logPayloadShape(`kline_${key}`, data);
        const rows = this.asArray(data?.data?.points || data?.data?.klines || data?.data || data?.klines || data);
        return [key, this.calculateKlineChange(rows)] as const;
      } catch (error) {
        this.logger.warn(`[Ave] kline ${key} failed tokenId=${tokenId} message=${error.message}`);
        return [key, null] as const;
      }
    }));

    return {
      intervalChanges: Object.fromEntries(results),
    };
  }

  private async request(step: string, path: string, params?: Record<string, any>) {
    const apiKey = this.getValidApiKey();
    if (!apiKey) throw new Error('AVE_API_KEY is missing');

    try {
      this.logger.log(`[Ave] request_start step=${step} path=${path}`);
      if (params) this.logger.log(`[Ave] request_params step=${step} params=${JSON.stringify(params)}`);
      const response = await axios.get(`${this.baseUrl}${path}`, {
        params,
        headers: {
          'X-API-KEY': apiKey,
          accept: 'application/json',
        },
        timeout: 12000,
      });
      this.logger.log(`[Ave] request_ok step=${step} status=${response.status} contentType=${response.headers?.['content-type'] || ''}`);
      return response.data;
    } catch (error) {
      const status = error?.response?.status || 'NO_STATUS';
      const body = error?.response?.data ? JSON.stringify(error.response.data).substring(0, 1000) : '';
      this.logger.warn(`[Ave] request_failed step=${step} status=${status} message=${error.message} body=${body}`);
      return null;
    }
  }

  private pickBestToken(candidates: AveTokenCandidate[], query: string, preferredChain?: string) {
    const normalizedQuery = query.toLowerCase();
    return candidates
      .map((item) => {
        const exactSymbol = item.symbol?.toLowerCase() === normalizedQuery ? 100 : 0;
        const exactAddress = item.address?.toLowerCase() === normalizedQuery ? 200 : 0;
        const chainBoost = preferredChain && item.chain?.toLowerCase() === preferredChain.toLowerCase() ? 30 : 0;
        const volume = Math.log10((item.volume24hUsd || 0) + 1);
        const liquidity = Math.log10((item.liquidityUsd || 0) + 1);
        const marketCap = Math.log10((item.marketCap || item.fdv || 0) + 1);
        return { item, score: exactAddress + exactSymbol + chainBoost + volume * 3 + liquidity * 2 + marketCap };
      })
      .sort((a, b) => b.score - a.score)[0]?.item || null;
  }

  private normalizeTokenCandidate(item: any): AveTokenCandidate {
    const token = item?.token && typeof item.token === 'object' ? item.token : item;
    const tokenId = this.firstString(token, ['token_id', 'tokenId', 'id']) || this.buildTokenId(token);
    return {
      tokenId,
      chain: this.firstString(token, ['chain', 'chain_id', 'chainId', 'network']),
      address: this.firstString(token, ['address', 'token_address', 'contract_address', 'contractAddress', 'token']),
      symbol: this.firstString(token, ['symbol', 'token_symbol']),
      name: this.firstString(token, ['name', 'token_name']),
      holders: this.firstNumber(token, ['holders', 'holder_count', 'holders_count']),
      logoUrl: this.firstString(token, ['logo_url', 'logoUrl', 'logo']),
      priceUsd: this.firstNumber(token, ['current_price_usd', 'price_usd', 'price', 'token_price_usd']),
      marketCap: this.firstNumber(token, ['market_cap', 'market_cap_usd', 'mcap']),
      fdv: this.firstNumber(token, ['fdv', 'fully_diluted_valuation']),
      volume24hUsd: this.firstNumber(token, ['tx_volume_u_24h', 'volume_u_24h', 'volume_24h_usd', 'volume24h']),
      liquidityUsd: this.firstNumber(token, ['main_pair_tvl', 'liquidity_usd', 'tvl', 'pair_tvl']),
      raw: item,
    };
  }

  private buildTokenId(item: any) {
    const address = this.firstString(item, ['address', 'token_address', 'contract_address', 'contractAddress', 'token']);
    const chain = this.firstString(item, ['chain', 'chain_id', 'chainId', 'network']);
    return address && chain ? `${address}-${chain}` : null;
  }

  private extractSearchItems(data: any) {
    const candidates = [
      data?.data?.tokens,
      data?.data?.list,
      data?.data?.items,
      data?.data?.result,
      data?.data?.records,
      data?.data,
      data?.tokens,
      data?.list,
      data?.items,
      data?.result,
      data?.records,
      data,
    ];

    for (const value of candidates) {
      const rows = this.asArray(value);
      if (rows.length > 0) return rows;
    }
    return [];
  }

  private logPayloadShape(step: string, data: any) {
    if (!data) {
      this.logger.warn(`[Ave] payload_shape step=${step} empty`);
      return;
    }
    const topKeys = typeof data === 'object' ? Object.keys(data).slice(0, 20) : [];
    const dataKeys = data?.data && typeof data.data === 'object' ? Object.keys(data.data).slice(0, 20) : [];
    const sample = JSON.stringify(data).substring(0, 1200);
    this.logger.log(`[Ave] payload_shape step=${step} topKeys=${JSON.stringify(topKeys)} dataKeys=${JSON.stringify(dataKeys)} sample=${sample}`);
  }

  private calculateKlineChange(rows: any[]) {
    if (rows.length < 2) return null;
    const first = this.extractClose(rows[0]);
    const last = this.extractClose(rows[rows.length - 1]);
    if (!first || !last) return null;
    return ((last - first) / first) * 100;
  }

  private extractClose(row: any) {
    if (Array.isArray(row)) return Number(row[4] ?? row[row.length - 1]);
    return this.firstNumber(row, ['close', 'c', 'price', 'price_usd']);
  }

  private extractRiskFlags(raw: any) {
    if (!raw || typeof raw !== 'object') return [];
    const flags: string[] = [];
    for (const [key, value] of Object.entries(raw)) {
      if (value === true || value === '1' || value === 1 || String(value).toLowerCase() === 'true') flags.push(key);
    }
    return flags.slice(0, 30);
  }

  private firstString(obj: any, keys: string[]) {
    for (const key of keys) {
      const value = obj?.[key];
      if (value !== undefined && value !== null && value !== '') return String(value);
    }
    return null;
  }

  private firstNumber(obj: any, keys: string[]) {
    for (const key of keys) {
      const value = obj?.[key];
      const number = Number(value);
      if (value !== undefined && value !== null && value !== '' && !Number.isNaN(number)) return number;
    }
    return null;
  }

  private normalizeRatio(value: number | null) {
    if (value === null) return null;
    return value > 1 ? value / 100 : value;
  }

  private asArray(value: any): any[] {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return Object.values(value);
    return [];
  }

  private getValidApiKey() {
    const value = this.configService.get<string>('AVE_API_KEY') || process.env.AVE_API_KEY;
    if (!value) {
      this.logger.warn('AVE_API_KEY 未定义，跳过 Ave 链上调研源');
      return null;
    }
    if (!/^[\x20-\x7E]+$/.test(value)) {
      this.logger.warn('AVE_API_KEY 含有非 ASCII 字符，请检查环境变量。');
      return null;
    }
    return value.trim();
  }
}
