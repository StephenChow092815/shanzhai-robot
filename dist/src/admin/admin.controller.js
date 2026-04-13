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
var AdminController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const research_graph_1 = require("../agents/research/research-graph");
const dexscreener_service_1 = require("../infrastructure/dexscreener.service");
const database_module_1 = require("../database/database.module");
const schema_1 = require("../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
const market_monitor_service_1 = require("../services/market-monitor.service");
let AdminController = AdminController_1 = class AdminController {
    constructor(researchGraph, dexService, marketMonitor, db) {
        this.researchGraph = researchGraph;
        this.dexService = dexService;
        this.marketMonitor = marketMonitor;
        this.db = db;
        this.logger = new common_1.Logger(AdminController_1.name);
    }
    async getLatestGainers(time) {
        this.logger.log(`[API] 正在检索涨幅快照 (时刻: ${time || 'latest'})...`);
        try {
            let targetTime = time;
            if (!targetTime) {
                const latestLog = await this.db.select()
                    .from(schema_1.topGainersLogs)
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.topGainersLogs.observationTime))
                    .limit(1);
                if (!latestLog.length)
                    return { success: true, data: [] };
                targetTime = latestLog[0].observationTime;
            }
            const results = await this.db.select()
                .from(schema_1.topGainersLogs)
                .where((0, drizzle_orm_1.eq)(schema_1.topGainersLogs.observationTime, new Date(targetTime)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.topGainersLogs.priceChangePercent));
            return {
                success: true,
                data: results,
                snapshotTime: targetTime,
                captureTime: results[0]?.captureTime
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async getHistoryMarks() {
        try {
            const results = await this.db.select({
                time: schema_1.topGainersLogs.observationTime
            })
                .from(schema_1.topGainersLogs)
                .groupBy(schema_1.topGainersLogs.observationTime)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.topGainersLogs.observationTime))
                .limit(100);
            return { success: true, data: results.map((r) => r.time) };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async getHistoricalList(page = '1', pageSize = '10', date) {
        this.logger.log(`[API] 正在检索历史流水分页 (页码: ${page}, 大小: ${pageSize}, 日期: ${date || 'all'})...`);
        try {
            const p = Math.max(1, parseInt(page));
            const ps = Math.max(1, parseInt(pageSize));
            const offset = (p - 1) * ps;
            let conditions = [];
            if (date) {
                const startOfDay = new Date(date);
                startOfDay.setUTCHours(0, 0, 0, 0);
                const endOfDay = new Date(date);
                endOfDay.setUTCHours(23, 59, 59, 999);
                conditions.push((0, drizzle_orm_1.gte)(schema_1.topGainersLogs.observationTime, startOfDay));
                conditions.push((0, drizzle_orm_1.lte)(schema_1.topGainersLogs.observationTime, endOfDay));
            }
            const whereClause = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
            const totalRes = await this.db.select({ value: (0, drizzle_orm_1.count)() })
                .from(schema_1.topGainersLogs)
                .where(whereClause);
            const total = totalRes[0].value;
            const items = await this.db.select()
                .from(schema_1.topGainersLogs)
                .where(whereClause)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.topGainersLogs.observationTime), (0, drizzle_orm_1.desc)(schema_1.topGainersLogs.priceChangePercent))
                .limit(ps)
                .offset(offset);
            return {
                success: true,
                data: items,
                total,
                page: p,
                pageSize: ps,
                totalPages: Math.ceil(total / ps)
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async refreshGainers() {
        this.logger.log(`[API] 收到手动刷新请求，正在触发快照任务...`);
        try {
            await this.marketMonitor.captureTopGainers();
            return this.getLatestGainers();
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    healthCheck() {
        return { status: 'ok', timestamp: new Date().toISOString() };
    }
    async runResearch(body) {
        this.logger.log(`[API] 收到调研请求: ${body.symbol} (${body.name})`);
        try {
            const result = await this.researchGraph.runResearch(body.symbol, body.name);
            return { success: true, data: result };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async runDiscovery(body) {
        this.logger.log(`[API] 收到全链检索请求: ${body.query}`);
        try {
            const result = await this.dexService.findMasterChain(body.query);
            return { success: true, data: result };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('gainers/latest'),
    __param(0, (0, common_1.Query)('time')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getLatestGainers", null);
__decorate([
    (0, common_1.Get)('gainers/history-marks'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getHistoryMarks", null);
__decorate([
    (0, common_1.Get)('gainers/historical-list'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('pageSize')),
    __param(2, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getHistoricalList", null);
__decorate([
    (0, common_1.Post)('gainers/refresh'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "refreshGainers", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "healthCheck", null);
__decorate([
    (0, common_1.Post)('research'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "runResearch", null);
__decorate([
    (0, common_1.Post)('discovery'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "runDiscovery", null);
exports.AdminController = AdminController = AdminController_1 = __decorate([
    (0, common_1.Controller)('api/admin'),
    __param(3, (0, common_1.Inject)(database_module_1.DATABASE_CONNECTION)),
    __metadata("design:paramtypes", [research_graph_1.ResearchGraph,
        dexscreener_service_1.DexScreenerService,
        market_monitor_service_1.MarketMonitorService, Object])
], AdminController);
//# sourceMappingURL=admin.controller.js.map