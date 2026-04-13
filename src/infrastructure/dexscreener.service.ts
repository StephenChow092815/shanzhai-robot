import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface ChainDiscoveryResult {
  symbol: string;
  name: string;
  masterChainId: string;
  mainPairAddress: string;
  priceUsd: string;
  liquidityUsd: number;
  volume24hUsd: number;
  confidenceScore: number;
}

@Injectable()
export class DexScreenerService {
  private readonly logger = new Logger(DexScreenerService.name);
  private readonly BASE_URL = 'https://api.dexscreener.com/latest/dex/search';

  /**
   * Identifies the primary chain and pair for a given token query.
   * Uses weighted scoring of liquidity (40%) and 24h volume (60%).
   */
  async findMasterChain(query: string): Promise<ChainDiscoveryResult | null> {
    try {
      this.logger.log(`正在从 DexScreener 检索 ${query} 的全链交易分布...`);
      
      const axiosConfig: any = {};
      const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
      
      if (proxyUrl) {
        try {
          const url = new URL(proxyUrl);
          axiosConfig.proxy = {
            host: url.hostname,
            port: parseInt(url.port),
            protocol: url.protocol.replace(':', '')
          };
        } catch (e) {
          this.logger.warn(`代理解析失败: ${proxyUrl}, 将不使用代理。`);
        }
      }

      const response = await axios.get(`${this.BASE_URL}?q=${query}`, axiosConfig);
      const pairs = response.data.pairs;

      if (!pairs || pairs.length === 0) {
        this.logger.warn(`未找到关于 ${query} 的任何交易记录。`);
        return null;
      }

      // Group and aggregate data by chainId
      const chainAggregates: Record<string, any> = {};

      pairs.forEach((pair: any) => {
        const cid = pair.chainId;
        if (!chainAggregates[cid]) {
          chainAggregates[cid] = {
            chainId: cid,
            symbol: pair.baseToken.symbol,
            name: pair.baseToken.name,
            totalLiquidity: 0,
            totalVolume24h: 0,
            bestPair: pair,
          };
        }

        const liq = parseFloat(pair.liquidity?.usd || '0');
        const vol = parseFloat(pair.volume?.h24 || '0');

        chainAggregates[cid].totalLiquidity += liq;
        chainAggregates[cid].totalVolume24h += vol;

        // Keep the most liquid pair as the reference pair for this chain
        const currentBestLiq = parseFloat(chainAggregates[cid].bestPair.liquidity?.usd || '0');
        if (liq > currentBestLiq) {
          chainAggregates[cid].bestPair = pair;
        }
      });

      // Calculate Scores and Rank Chains
      const rankedChains = Object.values(chainAggregates).sort((a, b) => {
        const scoreA = a.totalLiquidity * 0.4 + a.totalVolume24h * 0.6;
        const scoreB = b.totalLiquidity * 0.4 + b.totalVolume24h * 0.6;
        return scoreB - scoreA;
      });

      const winner = rankedChains[0];
      
      // Calculate Confidence (Winner's Score vs Total Score across all chains)
      const totalScoreSum = Object.values(chainAggregates).reduce((sum, c) => 
        sum + (c.totalLiquidity * 0.4 + c.totalVolume24h * 0.6), 0
      );
      
      const winnerScore = (winner.totalLiquidity * 0.4 + winner.totalVolume24h * 0.6);
      const confidence = totalScoreSum > 0 ? winnerScore / totalScoreSum : 0;

      this.logger.log(`[主链发现] 胜出者: ${winner.chainId} | 24h交易量: $${winner.totalVolume24h.toLocaleString()} | 置信度: ${Math.round(confidence * 100)}%`);

      return {
        symbol: winner.symbol,
        name: winner.name,
        masterChainId: winner.chainId,
        mainPairAddress: winner.bestPair.pairAddress,
        priceUsd: winner.bestPair.priceUsd,
        liquidityUsd: winner.totalLiquidity,
        volume24hUsd: winner.totalVolume24h,
        confidenceScore: confidence,
      };
    } catch (error) {
      this.logger.error(`检索主链信息失败: ${error.message}`);
      return null;
    }
  }
}
