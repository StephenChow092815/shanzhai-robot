"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BinanceApiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinanceApiService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const config_1 = require("@nestjs/config");
let BinanceApiService = BinanceApiService_1 = class BinanceApiService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(BinanceApiService_1.name);
        this.baseUrl = 'https://fapi.binance.com';
    }
    async getTopGainers(limit = 10) {
        this.logger.log('正在拉取币安合约元数据并筛选永续合约...');
        try {
            const exInfoResponse = await axios_1.default.get(`${this.baseUrl}/fapi/v1/exchangeInfo`, {
                proxy: this.getProxyConfig(),
                timeout: 10000,
            });
            const perpetualSymbols = new Set(exInfoResponse.data.symbols
                .filter((s) => s.contractType === 'PERPETUAL' && s.status === 'TRADING')
                .map((s) => s.symbol));
            this.logger.log(`已识别 ${perpetualSymbols.size} 个活跃永续合约。`);
            const tickerResponse = await axios_1.default.get(`${this.baseUrl}/fapi/v1/ticker/24hr`, {
                proxy: this.getProxyConfig(),
                timeout: 10000,
            });
            const tickers = tickerResponse.data;
            const FILTER_KEYWORDS = ['ALPHA', 'YALA', 'TANSSIUSDT', 'A2Z', 'BNX', 'ALPACA'];
            const filteredTickers = tickers.filter((t) => {
                const symbol = t.symbol.toUpperCase();
                const isPerpetual = perpetualSymbols.has(symbol);
                const isUsdt = symbol.endsWith('USDT');
                const quoteVolume = parseFloat(t.quoteVolume);
                const isNoise = FILTER_KEYWORDS.some(k => symbol.includes(k));
                return isPerpetual && isUsdt && quoteVolume > 5000000 && !isNoise;
            });
            const sorted = filteredTickers.sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent));
            const topN = sorted.slice(0, limit).map((t) => ({
                symbol: t.symbol,
                priceChangePercent: parseFloat(t.priceChangePercent),
                lastPrice: parseFloat(t.lastPrice),
            }));
            this.logger.log(`对齐 App 永续榜单后获取前 ${limit} 名币种: ${topN.map((n) => n.symbol).join(', ')}`);
            return topN;
        }
        catch (error) {
            this.logger.error(`获取币安永续涨幅榜失败: ${error.message}`);
            throw error;
        }
    }
    getProxyConfig() {
        const proxyUrl = process.env.HTTPS_PROXY || 'http://127.0.0.1:6666';
        if (!proxyUrl)
            return undefined;
        try {
            const url = new URL(proxyUrl);
            return {
                protocol: url.protocol.replace(':', ''),
                host: url.hostname,
                port: parseInt(url.port, 10),
            };
        }
        catch {
            return undefined;
        }
    }
};
exports.BinanceApiService = BinanceApiService;
exports.BinanceApiService = BinanceApiService = BinanceApiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], BinanceApiService);
//# sourceMappingURL=binance-api.service.js.map