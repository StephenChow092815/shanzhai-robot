import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ExaService } from '../../infrastructure/exa.service';
import { z } from 'zod';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { HttpsProxyAgent } from 'https-proxy-agent';

const DiscoverySchema = z.array(z.object({
  name: z.string().describe('Full name of the project.'),
  symbol: z.string().describe('Symbol of the project.'),
  ecosystem: z.string().describe('Primary blockchain or ecosystem.'),
  summary: z.string().describe('Brief 1-sentence description (Chinese).'),
  recent_activity: z.string().describe('Recent events (Chinese).'),
  official_links: z.array(z.string()).optional(),
})).describe('List of potential matching projects.');

@Injectable()
export class FundamentalsService {
  private readonly logger = new Logger(FundamentalsService.name);
  private readonly model: ChatOpenAI;
  private readonly discoveryParser = StructuredOutputParser.fromZodSchema(DiscoverySchema);

  constructor(
    @Inject(ExaService) private readonly exaService: ExaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('KIMI_API_KEY');
    let proxyUrl = process.env.HTTPS_PROXY;
    if (proxyUrl && proxyUrl.includes('host.docker.internal')) {
      const isDocker = require('fs').existsSync('/.dockerenv');
      if (!isDocker) proxyUrl = proxyUrl.replace('host.docker.internal', '127.0.0.1');
    }

    this.model = new ChatOpenAI({
      modelName: 'moonshot-v1-32k',
      temperature: 0,
      apiKey: apiKey || 'missing-key',
      maxTokens: 4000,
      configuration: {
        baseURL: 'https://api.moonshot.cn/v1',
        httpAgent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined,
      } as any,
    });
  }

  private sanitizeRiskText(text: string): string {
    if (!text) return '';
    return text
      .replace(/[\d,]+\s*(USDT|USD|ETH|SOL|\$|元|奖励)/gi, '[REDACTED AMOUNT]')
      .replace(/(airdrop|rewards|bonus|giveaway|prize|winning|event|campaign|celebration|奖励|抽奖|空投)/gi, 'listing event info');
  }

  private extractJson(content: string): any {
    try {
      const jsonBlock = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const rawJson = jsonBlock ? jsonBlock[1].trim() : content.trim();
      const firstBracketMatch = rawJson.match(/[\[\{]/);
      if (!firstBracketMatch) return JSON.parse(rawJson);
      const startChar = firstBracketMatch[0];
      const endChar = startChar === '[' ? ']' : '}';
      const start = rawJson.indexOf(startChar);
      const end = rawJson.lastIndexOf(endChar);
      if (start !== -1 && end !== -1) return JSON.parse(rawJson.substring(start, end + 1));
      return JSON.parse(rawJson);
    } catch (e) {
      this.logger.error(`[V12-Parser] 解析失败: ${e.message}`);
      return null;
    }
  }

  private chunkContext(context: string, maxSize: number = 8000): string[] {
    const chunks: string[] = [];
    let currentPos = 0;
    while (currentPos < context.length) {
      let endPos = currentPos + maxSize;
      if (endPos >= context.length) {
        chunks.push(context.substring(currentPos));
        break;
      }
      const sentenceEndRegex = /[。\.!\?]/g;
      let lastSentenceEnd = -1;
      const searchWindow = context.substring(currentPos, endPos + 500);
      let match;
      while ((match = sentenceEndRegex.exec(searchWindow)) !== null) {
        if (match.index <= maxSize + 200) lastSentenceEnd = match.index;
        else break;
      }
      if (lastSentenceEnd !== -1) endPos = currentPos + lastSentenceEnd + 1;
      chunks.push(context.substring(currentPos, endPos).trim());
      currentPos = endPos;
    }
    return chunks;
  }

  async discoverCandidates(symbol: string) {
    this.logger.log(`[V11-Discover] 启动强力召回复活 ${symbol}...`);
    const results = await Promise.all([
      this.exaService.searchProjectInfo(`Official website and whitepaper for cryptocurrency project with ticker "$${symbol}"`, 5),
      this.exaService.searchProjectInfo(`"${symbol}" Binance Alpha listing result and announcements April 2026`, 8),
      this.exaService.searchProjectInfo(`"${symbol}" token MEXC Airdrop+ vs Genius Foundation Foundation listing`, 8),
      this.exaService.searchProjectInfo(`exact name of the project with symbol "${symbol}" launching in April 2026`, 5)
    ]);
    const allResults = results.flat();
    const prioritiedUnique = Array.from(new Map(allResults.map(r => [r.url, r])).values()).sort((a, b) => {
      const auth = ['binance.com', 'mexc.com', 'gitbook.io', 'docs.', 'rootdata.com'];
      return (auth.some(d => b.url.includes(d)) ? 1 : 0) - (auth.some(d => a.url.includes(d)) ? 1 : 0);
    });
    const context = prioritiedUnique.map((r, i) => `Source [${i+1}]: ${r.title}\nURL: ${r.url}\nContent: ${r.text}`).join('\n\n---\n\n');
    const promptTemplate = new PromptTemplate({
      template: `Identify and separate projects with symbol "{symbol}". Find "Genius Foundation" (2026 Binance Alpha). {format_instructions}\nContext:\n{context}`,
      inputVariables: ['symbol', 'context'],
      partialVariables: { format_instructions: this.discoveryParser.getFormatInstructions() },
    });
    const res = await this.model.invoke(await promptTemplate.format({ symbol, context: context.substring(0, 25000) }));
    return this.extractJson(res.content as string);
  }

  async research(symbol: string, name: string, anchor?: string) {
    this.logger.log(`[V12-Research] 标准化调研启动: ${name} (${symbol})`);
    const safeAnchor = this.sanitizeRiskText(anchor || '');
    try {
      const searches = await Promise.all([
        this.exaService.findOfficialLinks(symbol, name, safeAnchor),
        this.exaService.findTechnicalDocs(symbol, name, safeAnchor),
        this.exaService.findTokenomicsDocs(symbol, name, safeAnchor),
        this.exaService.findListingAnnouncements(symbol, name, safeAnchor),
        this.exaService.findTgeSpecificDocs(symbol, name, safeAnchor),
      ]);
      const uniqueResults = Array.from(new Map(searches.flat().map(r => [r.url, r])).values());
      const prioritied = uniqueResults.sort((a, b) => {
        const auth = ['binance.com', 'mexc.com', 'gitbook.io', 'docs.'];
        return (auth.some(d => b.url.includes(d)) ? 1 : 0) - (auth.some(d => a.url.includes(d)) ? 1 : 0);
      });
      const rawContext = prioritied.map((r, i) => `[Source ${i+1}]\n${r.text}`).join('\n\n---\n\n');
      const safeContext = this.sanitizeRiskText(rawContext);
      const chunks = this.chunkContext(safeContext, 8000);
      const factMapResults = await Promise.all(chunks.map(async (chunk, i) => {
        try {
          const res = await this.model.invoke(`Extract financial facts for ${name} (${symbol}): TGE, Supply, Allocation. Snippet:\n${chunk}`);
          return `[Fragment ${i+1}]: ${res.content}`;
        } catch (e) {
          return `[Fragment ${i+1}]: Safety rejection.`;
        }
      }));
      const consolidatedFacts = factMapResults.join('\n\n');

      const reducePrompt = `
        Create a flat financial JSON for {name} ({symbol}).
        
        CRITICAL V12 RULES:
        1. DO NOT nest data under a "fundamentals" key. Return data fields directly.
        2. The "allocation" array MUST use this exact format: {{"category": "Name", "percentage": number, "description": "..."}}. 
           NEVER use category names as keys (e.g., NEVER do: {{"ispo": {{...}}}}).
        
        TGE: April 13, 2026.
        FACTS:
        {facts}

        EXPECTED FLAT JSON:
        {{
          "name": "{name}",
          "project_info": {{ "summary": "...", "official_website": "...", "whitepaper": "..." }},
          "tokenomics": {{
            "tge_date": "...",
            "total_supply": "...",
            "allocation": [
              {{ "category": "Team", "percentage": 15, "description": "..." }},
              {{ "category": "ISPO", "percentage": 25, "description": "..." }}
            ]
          }},
          "listing_timeline": [],
          "risk_assessment": {{}}
        }}
        OUTPUT ONLY JSON.
      `;

      const finalRes = await this.model.invoke(await new PromptTemplate({
        template: reducePrompt, inputVariables: ['facts', 'name', 'symbol']
      }).format({ facts: consolidatedFacts, name, symbol }));

      return this.extractJson(finalRes.content as string);
    } catch (error) {
      return { name, symbol, status: 'failed', error: error.message };
    }
  }
}
