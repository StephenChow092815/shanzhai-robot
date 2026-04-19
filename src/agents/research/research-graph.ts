import { StateGraph, Annotation } from '@langchain/langgraph';
import { FundamentalsService } from './fundamentals.service';
import { SentimentService } from './sentiment.service';
import { Injectable, Logger, Inject } from '@nestjs/common';

/**
 * V12: Strictly flattened Research State
 */
const ResearchStateAnnotation = Annotation.Root({
  symbol: Annotation<string>(),
  name: Annotation<string>(),
  anchor: Annotation<string | undefined>(),
  // Flattened data fields
  project_info: Annotation<any>(),
  tokenomics: Annotation<any>(),
  listing_timeline: Annotation<any>(),
  risk_assessment: Annotation<any>(),
  sentiment: Annotation<any>(),
  status: Annotation<'pending' | 'completed' | 'failed'>(),
});

@Injectable()
export class ResearchGraph {
  private readonly logger = new Logger(ResearchGraph.name);
  private readonly fundamentalsService: FundamentalsService;
  private readonly sentimentService: SentimentService;

  constructor(
    @Inject(FundamentalsService) fundamentalsService: FundamentalsService,
    @Inject(SentimentService) sentimentService: SentimentService,
  ) {
    this.fundamentalsService = fundamentalsService;
    this.sentimentService = sentimentService;
  }

  createGraph() {
    const fundamentalsService = this.fundamentalsService;
    const sentimentService = this.sentimentService;
    const logger = this.logger;

    const workflow = new StateGraph(ResearchStateAnnotation)
      .addNode('sentimentNode', async (state) => {
        logger.log(`[节点] 情绪分析: ${state.symbol}`);
        const result = await sentimentService.analyzeSentiment(state.symbol, state.name);
        return { sentiment: result };
      })
      .addNode('fundamentalsNode', async (state) => {
        logger.log(`[节点] 结构化调研: ${state.name}`);
        const newsContext = state.sentiment?.rawOutput?.snippets?.map((s: any) => `Fact: ${s.title}`).join('\n');
        const combinedAnchor = `${state.anchor || ''}\n${newsContext || ''}`.trim();

        const result = await fundamentalsService.research(state.symbol, state.name, combinedAnchor);
        
        // V12-FIX: Spread result directly into root to ensure data is flattened for UI
        return { ...result, status: 'completed' };
      })
      .addEdge('__start__', 'sentimentNode')
      .addEdge('sentimentNode', 'fundamentalsNode')
      .addEdge('fundamentalsNode', '__end__');

    return workflow.compile();
  }

  async runResearch(symbol: string, name: string, anchor?: string) {
    const graph = this.createGraph();
    const initialState = {
      symbol,
      name,
      anchor,
      status: 'pending' as const,
    };

    try {
      this.logger.log(`[V12-Graph] 启动协议标准化工作流: ${name}`);
      const finalState = await graph.invoke(initialState);
      return finalState;
    } catch (error) {
      this.logger.error(`调研失败: ${error.message}`);
      throw error;
    }
  }
}
