import { StateGraph, Annotation } from '@langchain/langgraph';
import { FundamentalsService } from './fundamentals.service';
import { SentimentService } from './sentiment.service';
import { Injectable, Logger, Inject } from '@nestjs/common';

/**
 * Define the state for the Research workflow.
 */
const ResearchStateAnnotation = Annotation.Root({
  symbol: Annotation<string>(),
  name: Annotation<string>(),
  fundamentals: Annotation<any>(),
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
    console.log('[DEBUG] ResearchGraph Constructor:', { 
      fundamentalsService: !!fundamentalsService, 
      sentimentService: !!sentimentService 
    });
    this.fundamentalsService = fundamentalsService;
    this.sentimentService = sentimentService;
  }

  /**
   * Create the Research Team workflow graph.
   */
  createGraph() {
    const fundamentalsService = this.fundamentalsService;
    const sentimentService = this.sentimentService;
    const logger = this.logger;

    const workflow = new StateGraph(ResearchStateAnnotation)
      // 1. Fundamentals Node
      .addNode('fundamentalsNode', async (state) => {
        logger.log(`[执行节点] 正在调研代币基本面: ${state.symbol}`);
        const result = await fundamentalsService.research(state.symbol, state.name);
        return { fundamentals: result };
      })
      // 2. Sentiment Node
      .addNode('sentimentNode', async (state) => {
        logger.log(`[执行节点] 正在分析市场情绪: ${state.symbol}`);
        const result = await sentimentService.analyzeSentiment(state.symbol, state.name);
        return { sentiment: result, status: 'completed' };
      })
      // 3. Define Flow
      .addEdge('__start__', 'fundamentalsNode')
      .addEdge('fundamentalsNode', 'sentimentNode')
      .addEdge('sentimentNode', '__end__');

    return workflow.compile();
  }

  /**
   * Execute the research workflow for a specific token.
   */
  async runResearch(symbol: string, name: string) {
    const graph = this.createGraph();
    const initialState = {
      symbol,
      name,
      status: 'pending' as const,
    };

    try {
      this.logger.log(`正在执行调研工作流: ${symbol}...`);
      const finalState = await graph.invoke(initialState);
      return finalState;
    } catch (error) {
      this.logger.error(`调研工作流执行失败: ${error.message}`);
      throw error;
    }
  }
}
