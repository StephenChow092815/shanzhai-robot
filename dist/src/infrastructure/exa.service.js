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
var ExaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExaService = void 0;
const common_1 = require("@nestjs/common");
const exa_js_1 = require("exa-js");
let ExaService = ExaService_1 = class ExaService {
    constructor() {
        this.logger = new common_1.Logger(ExaService_1.name);
        const apiKey = process.env.EXA_API_KEY;
        if (!apiKey) {
            this.logger.error('CRITICAL: EXA_API_KEY 未定义！安全要求：请先执行 `export EXA_API_KEY=your_key` 后再启动。');
        }
        this.exa = new exa_js_1.default(apiKey || 'missing-key');
    }
    async searchProjectInfo(query, numResults = 5) {
        try {
            this.logger.log(`[Exa] 正在搜索: ${query}`);
            const result = await this.exa.searchAndContents(query, {
                numResults,
                useAutoprompt: true,
                text: true,
                highlights: true,
            });
            return result.results;
        }
        catch (error) {
            this.logger.error(`[Exa] 搜索失败: ${error.message}`);
            throw error;
        }
    }
    async findTechnicalDocs(symbol, name) {
        const query = `official whitepaper or technical documentation for ${name} (${symbol}) crypto project`;
        return this.searchProjectInfo(query, 3);
    }
    async findTokenomicsDocs(symbol, name) {
        const query = `tokenomics, TGE date, exchange listing history, market makers, initial circulating supply, vesting schedule, and token unlock events for ${name} (${symbol}) crypto project`;
        return this.searchProjectInfo(query, 5);
    }
};
exports.ExaService = ExaService;
exports.ExaService = ExaService = ExaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ExaService);
//# sourceMappingURL=exa.service.js.map