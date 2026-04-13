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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MarketMonitorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketMonitorService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const binance_api_service_1 = require("../infrastructure/binance-api.service");
const database_module_1 = require("../database/database.module");
const schema_1 = require("../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
let MarketMonitorService = MarketMonitorService_1 = class MarketMonitorService {
    constructor(binanceApiService, db) {
        this.binanceApiService = binanceApiService;
        this.db = db;
        this.logger = new common_1.Logger(MarketMonitorService_1.name);
    }
    async onModuleInit() {
        this.logger.log('项目启动：立即执行首次涨幅榜快照抓取...');
        await this.captureTopGainers();
    }
    async handleScheduledCapture() {
        this.logger.log('执行准点定时任务：正在抓取 4 小时周期涨幅榜...');
        await this.captureTopGainers();
    }
    async captureTopGainers() {
        try {
            const top10 = await this.binanceApiService.getTopGainers(10);
            const observationTime = this.getObservationTimeMark();
            const captureTime = new Date();
            this.logger.log(`归档时刻: ${observationTime.toISOString()} | 触发时间: ${captureTime.toISOString()}`);
            await this.db.delete(schema_1.topGainersLogs)
                .where((0, drizzle_orm_1.eq)(schema_1.topGainersLogs.observationTime, observationTime));
            const records = top10.map(item => ({
                symbol: item.symbol,
                priceChangePercent: item.priceChangePercent.toString(),
                lastPrice: item.lastPrice.toString(),
                observationTime: observationTime,
                captureTime: captureTime,
            }));
            await this.db.insert(schema_1.topGainersLogs).values(records);
            this.logger.log(`成功归档 ${records.length} 条代币涨幅记录。`);
        }
        catch (error) {
            this.logger.error(`抓取或存档任务失败: ${error.message}`);
        }
    }
    getObservationTimeMark() {
        const now = new Date();
        const hours = now.getUTCHours();
        const markHours = Math.floor(hours / 4) * 4;
        const observationTime = new Date(now);
        observationTime.setUTCHours(markHours, 0, 0, 0);
        return observationTime;
    }
};
exports.MarketMonitorService = MarketMonitorService;
__decorate([
    (0, schedule_1.Cron)('0 0 0,4,8,12,16,20 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MarketMonitorService.prototype, "handleScheduledCapture", null);
exports.MarketMonitorService = MarketMonitorService = MarketMonitorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(database_module_1.DATABASE_CONNECTION)),
    __metadata("design:paramtypes", [binance_api_service_1.BinanceApiService, Object])
], MarketMonitorService);
//# sourceMappingURL=market-monitor.service.js.map