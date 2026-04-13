import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ExaService } from '../../infrastructure/exa.service';
import { z } from 'zod';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { HttpsProxyAgent } from 'https-proxy-agent';

const ResearchSchema = z.object({
  summary: z.string().describe('A brief summary of the project and its core value proposition.'),
  tokenomics: z.object({
    total_supply: z.string().optional().describe('Token total supply details (Chinese).'),
    tge_date: z.string().optional().describe('Token Generation Event (TGE) date (Chinese).'),
    initial_circulating_supply: z.string().optional().describe('Initial circulating supply and market cap at launch (Chinese).'),
    allocation: z.string().optional().describe('Detailed token allocation to team, investors, and community (Chinese).'),
    vesting_schedule: z.string().optional().describe('General vesting terms (Chinese).'),
    unlock_schedule: z.array(z.object({
      date: z.string().describe('Date of the unlock event.'),
      amount: z.string().describe('Amount or percentage of tokens being unlocked.'),
      description: z.string().describe('Who is receiving the tokens (e.g., Team, VC, Ecosystem).'),
    })).optional().describe('Detailed chronolocal list of future token unlock events.'),
    airdrop_details: z.string().optional().describe('Information regarding airdrops, eligibility, and distribution (Chinese).'),
    exchanges: z.array(z.object({
      name: z.string().describe('Exchange name.'),
      date: z.string().optional().describe('Listing date.'),
    })).optional().describe('List of exchanges where the token is listed, including listing dates if available.'),
    market_makers: z.array(z.string()).optional().describe('List of market makers associated with the project (e.g., Wintermute, GSR).'),
    utility: z.string().optional().describe('Token utility and governance functions (Chinese).'),
  }).describe('Comprehensive details about the token economy.'),
  roadmap: z.string().describe('Key milestones and future plans (Chinese).'),
  team: z.string().describe('Information about founders, core team, and institutional backers (Chinese).'),
  risks: z.array(z.string()).describe('Potential risks or red flags identified (Chinese).'),
  audit_status: z.string().describe('Status of security audits (Chinese).'),
});

@Injectable()
export class FundamentalsService {
  private readonly logger = new Logger(FundamentalsService.name);
  private readonly model: ChatOpenAI;
  private readonly parser = StructuredOutputParser.fromZodSchema(ResearchSchema);

  constructor(
    @Inject(ExaService) private readonly exaService: ExaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('KIMI_API_KEY');
    if (!apiKey) {
      this.logger.error('CRITICAL: KIMI_API_KEY 未定义！安全要求：请先执行 `export KIMI_API_KEY=your_key` 后再启动。');
    }
    this.model = new ChatOpenAI({
      modelName: 'moonshot-v1-32k',
      temperature: 0,
      apiKey: apiKey || 'missing-key', // Ensure it doesn't crash initialization but fails on first call
      maxTokens: 4000,
      configuration: {
        baseURL: 'https://api.moonshot.cn/v1',
        httpAgent: process.env.HTTPS_PROXY ? new HttpsProxyAgent(process.env.HTTPS_PROXY) : undefined,
      } as any,
    });
  }

  /**
   * Conduct deep research on a project.
   */
  async research(symbol: string, name: string) {
    this.logger.log(`开始对项目 ${name} (${symbol}) 进行深度调研与经济模型挖掘...`);

    // 1. Parallel search for data using Exa
    const [techDocs, tokenomicsDocs] = await Promise.all([
      this.exaService.findTechnicalDocs(symbol, name),
      this.exaService.findTokenomicsDocs(symbol, name),
    ]);

    const allResults = [...techDocs, ...tokenomicsDocs];
    
    // Deduplicate by URL
    const uniqueResults = Array.from(new Map(allResults.map(r => [r.url, r])).values());

    const context = uniqueResults
      .map((r, i) => `Source [${i + 1}]: ${r.title}\nURL: ${r.url}\nContent: ${r.text}`)
      .join('\n\n---\n\n');

    // 2. Prepare prompt
    const promptTemplate = new PromptTemplate({
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
      context: context.substring(0, 15000), // Reduce context to allow more room for output
    });

    // 3. Invoke LLM and parse
    try {
      const response = await this.model.invoke(input);
      let content = response.content as string;
      
      // Clean up markdown code blocks if present
      if (content.includes('```json')) {
        content = content.split('```json')[1].split('```')[0].trim();
      } else if (content.includes('```')) {
        content = content.split('```')[1].split('```')[0].trim();
      }

      const parsed = await this.parser.parse(content);
      return parsed;
    } catch (error) {
      this.logger.error(`项目 ${symbol} 深度调研失败: ${error.message}`);
      throw error;
    }
  }
}
