"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DexScreenerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DexScreenerService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
let DexScreenerService = DexScreenerService_1 = class DexScreenerService {
    constructor() {
        this.logger = new common_1.Logger(DexScreenerService_1.name);
        this.BASE_URL = 'https://api.dexscreener.com/latest/dex/search';
    }
    async findMasterChain(query) {
        try {
            this.logger.log(`正在从 DexScreener 检索 ${query} 的全链交易分布...`);
            const axiosConfig = {};
            const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
            if (proxyUrl) {
                try {
                    const url = new URL(proxyUrl);
                    axiosConfig.proxy = {
                        host: url.hostname,
                        port: parseInt(url.port),
                        protocol: url.protocol.replace(':', '')
                    };
                }
                catch (e) {
                    this.logger.warn(`代理解析失败: ${proxyUrl}, 将不使用代理。`);
                }
            }
            const response = await axios_1.default.get(`${this.BASE_URL}?q=${query}`, axiosConfig);
            const pairs = response.data.pairs;
            if (!pairs || pairs.length === 0) {
                this.logger.warn(`未找到关于 ${query} 的任何交易记录。`);
                return null;
            }
            const chainAggregates = {};
            pairs.forEach((pair) => {
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
                const currentBestLiq = parseFloat(chainAggregates[cid].bestPair.liquidity?.usd || '0');
                if (liq > currentBestLiq) {
                    chainAggregates[cid].bestPair = pair;
                }
            });
            const rankedChains = Object.values(chainAggregates).sort((a, b) => {
                const scoreA = a.totalLiquidity * 0.4 + a.totalVolume24h * 0.6;
                const scoreB = b.totalLiquidity * 0.4 + b.totalVolume24h * 0.6;
                return scoreB - scoreA;
            });
            const winner = rankedChains[0];
            const totalScoreSum = Object.values(chainAggregates).reduce((sum, c) => sum + (c.totalLiquidity * 0.4 + c.totalVolume24h * 0.6), 0);
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
        }
        catch (error) {
            this.logger.error(`检索主链信息失败: ${error.message}`);
            return null;
        }
    }
};
exports.DexScreenerService = DexScreenerService;
exports.DexScreenerService = DexScreenerService = DexScreenerService_1 = __decorate([
    (0, common_1.Injectable)()
], DexScreenerService);
//# sourceMappingURL=dexscreener.service.js.map