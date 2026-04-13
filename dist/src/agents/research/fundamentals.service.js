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
var FundamentalsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FundamentalsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = require("@langchain/openai");
const exa_service_1 = require("../../infrastructure/exa.service");
const zod_1 = require("zod");
const output_parsers_1 = require("@langchain/core/output_parsers");
const prompts_1 = require("@langchain/core/prompts");
const ResearchSchema = zod_1.z.object({
    summary: zod_1.z.string().describe('A brief summary of the project and its core value proposition.'),
    tokenomics: zod_1.z.object({
        total_supply: zod_1.z.string().optional().describe('Token total supply details (Chinese).'),
        tge_date: zod_1.z.string().optional().describe('Token Generation Event (TGE) date (Chinese).'),
        initial_circulating_supply: zod_1.z.string().optional().describe('Initial circulating supply and market cap at launch (Chinese).'),
        allocation: zod_1.z.string().optional().describe('Detailed token allocation to team, investors, and community (Chinese).'),
        vesting_schedule: zod_1.z.string().optional().describe('General vesting terms (Chinese).'),
        unlock_schedule: zod_1.z.array(zod_1.z.object({
            date: zod_1.z.string().describe('Date of the unlock event.'),
            amount: zod_1.z.string().describe('Amount or percentage of tokens being unlocked.'),
            description: zod_1.z.string().describe('Who is receiving the tokens (e.g., Team, VC, Ecosystem).'),
        })).optional().describe('Detailed chronolocal list of future token unlock events.'),
        airdrop_details: zod_1.z.string().optional().describe('Information regarding airdrops, eligibility, and distribution (Chinese).'),
        exchanges: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string().describe('Exchange name.'),
            date: zod_1.z.string().optional().describe('Listing date.'),
        })).optional().describe('List of exchanges where the token is listed, including listing dates if available.'),
        market_makers: zod_1.z.array(zod_1.z.string()).optional().describe('List of market makers associated with the project (e.g., Wintermute, GSR).'),
        utility: zod_1.z.string().optional().describe('Token utility and governance functions (Chinese).'),
    }).describe('Comprehensive details about the token economy.'),
    roadmap: zod_1.z.string().describe('Key milestones and future plans (Chinese).'),
    team: zod_1.z.string().describe('Information about founders, core team, and institutional backers (Chinese).'),
    risks: zod_1.z.array(zod_1.z.string()).describe('Potential risks or red flags identified (Chinese).'),
    audit_status: zod_1.z.string().describe('Status of security audits (Chinese).'),
});
let FundamentalsService = FundamentalsService_1 = class FundamentalsService {
    constructor(exaService, configService) {
        this.exaService = exaService;
        this.configService = configService;
        this.logger = new common_1.Logger(FundamentalsService_1.name);
        this.parser = output_parsers_1.StructuredOutputParser.fromZodSchema(ResearchSchema);
        const apiKey = this.configService.get('KIMI_API_KEY');
        if (!apiKey) {
            this.logger.error('CRITICAL: KIMI_API_KEY 未定义！安全要求：请先执行 `export KIMI_API_KEY=your_key` 后再启动。');
        }
        this.model = new openai_1.ChatOpenAI({
            modelName: 'moonshot-v1-32k',
            temperature: 0,
            apiKey: apiKey || 'missing-key',
            maxTokens: 4000,
            configuration: {
                baseURL: 'https://api.moonshot.cn/v1',
            },
        });
    }
    async research(symbol, name) {
        this.logger.log(`开始对项目 ${name} (${symbol}) 进行深度调研与经济模型挖掘...`);
        const [techDocs, tokenomicsDocs] = await Promise.all([
            this.exaService.findTechnicalDocs(symbol, name),
            this.exaService.findTokenomicsDocs(symbol, name),
        ]);
        const allResults = [...techDocs, ...tokenomicsDocs];
        const uniqueResults = Array.from(new Map(allResults.map(r => [r.url, r])).values());
        const context = uniqueResults
            .map((r, i) => `Source [${i + 1}]: ${r.title}\nURL: ${r.url}\nContent: ${r.text}`)
            .join('\n\n---\n\n');
        const promptTemplate = new prompts_1.PromptTemplate({
            template: `
        You are a senior crypto investment analyst and tokenomics expert. Your task is to perform an 
        extremely detailed fundamental analysis and economic audit of the project based on the provided 
        search results. 

        Focus on granular data: 
        - Exact TGE (Token Generation Event) date.
        - Detailed list of exchange listings with specific listing dates.
        - Names of market makers (e.g., Wintermute, GSR, Amber Group) associated with the project.
        - Exact dates for unlocks and percentages for allocation.
        - Initial circulation metrics and launch market cap.

        IMPORTANT: Please provide all analysis, summaries, and descriptions in Chinese (中文).

        Project: {name} ({symbol})
        
        Search Results:
        {context}

        {format_instructions}
      `,
            inputVariables: ['name', 'symbol', 'context'],
            partialVariables: { format_instructions: this.parser.getFormatInstructions() },
        });
        const input = await promptTemplate.format({
            name,
            symbol,
            context: context.substring(0, 15000),
        });
        try {
            const response = await this.model.invoke(input);
            let content = response.content;
            if (content.includes('```json')) {
                content = content.split('```json')[1].split('```')[0].trim();
            }
            else if (content.includes('```')) {
                content = content.split('```')[1].split('```')[0].trim();
            }
            const parsed = await this.parser.parse(content);
            return parsed;
        }
        catch (error) {
            this.logger.error(`项目 ${symbol} 深度调研失败: ${error.message}`);
            throw error;
        }
    }
};
exports.FundamentalsService = FundamentalsService;
exports.FundamentalsService = FundamentalsService = FundamentalsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(exa_service_1.ExaService)),
    __param(1, (0, common_1.Inject)(config_1.ConfigService)),
    __metadata("design:paramtypes", [exa_service_1.ExaService,
        config_1.ConfigService])
], FundamentalsService);
//# sourceMappingURL=fundamentals.service.js.map