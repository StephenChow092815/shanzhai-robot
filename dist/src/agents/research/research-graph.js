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
var ResearchGraph_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResearchGraph = void 0;
const langgraph_1 = require("@langchain/langgraph");
const fundamentals_service_1 = require("./fundamentals.service");
const sentiment_service_1 = require("./sentiment.service");
const common_1 = require("@nestjs/common");
const ResearchStateAnnotation = langgraph_1.Annotation.Root({
    symbol: (0, langgraph_1.Annotation)(),
    name: (0, langgraph_1.Annotation)(),
    fundamentals: (0, langgraph_1.Annotation)(),
    sentiment: (0, langgraph_1.Annotation)(),
    status: (0, langgraph_1.Annotation)(),
});
let ResearchGraph = ResearchGraph_1 = class ResearchGraph {
    constructor(fundamentalsService, sentimentService) {
        this.logger = new common_1.Logger(ResearchGraph_1.name);
        console.log('[DEBUG] ResearchGraph Constructor:', {
            fundamentalsService: !!fundamentalsService,
            sentimentService: !!sentimentService
        });
        this.fundamentalsService = fundamentalsService;
        this.sentimentService = sentimentService;
    }
    createGraph() {
        const fundamentalsService = this.fundamentalsService;
        const sentimentService = this.sentimentService;
        const logger = this.logger;
        const workflow = new langgraph_1.StateGraph(ResearchStateAnnotation)
            .addNode('fundamentalsNode', async (state) => {
            logger.log(`[执行节点] 正在调研代币基本面: ${state.symbol}`);
            const result = await fundamentalsService.research(state.symbol, state.name);
            return { fundamentals: result };
        })
            .addNode('sentimentNode', async (state) => {
            logger.log(`[执行节点] 正在分析市场情绪: ${state.symbol}`);
            const result = await sentimentService.analyzeSentiment(state.symbol, state.name);
            return { sentiment: result, status: 'completed' };
        })
            .addEdge('__start__', 'fundamentalsNode')
            .addEdge('fundamentalsNode', 'sentimentNode')
            .addEdge('sentimentNode', '__end__');
        return workflow.compile();
    }
    async runResearch(symbol, name) {
        const graph = this.createGraph();
        const initialState = {
            symbol,
            name,
            status: 'pending',
        };
        try {
            this.logger.log(`正在执行调研工作流: ${symbol}...`);
            const finalState = await graph.invoke(initialState);
            return finalState;
        }
        catch (error) {
            this.logger.error(`调研工作流执行失败: ${error.message}`);
            throw error;
        }
    }
};
exports.ResearchGraph = ResearchGraph;
exports.ResearchGraph = ResearchGraph = ResearchGraph_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(fundamentals_service_1.FundamentalsService)),
    __param(1, (0, common_1.Inject)(sentiment_service_1.SentimentService)),
    __metadata("design:paramtypes", [fundamentals_service_1.FundamentalsService,
        sentiment_service_1.SentimentService])
], ResearchGraph);
//# sourceMappingURL=research-graph.js.map