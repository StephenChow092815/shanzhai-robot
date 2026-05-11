import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { CoinGeckoService } from '../../infrastructure/coingecko.service';

const DiscoverySchema = z.array(z.object({
  name: z.string().describe('Full name of the project.'),
  symbol: z.string().describe('Symbol of the project.'),
  ecosystem: z.string().describe('Primary blockchain or ecosystem.'),
  summary: z.string().describe('Brief 1-sentence description (Chinese).'),
  market_cap: z.string().optional().describe('Market cap from CoinGecko.'),
  circulating_supply: z.string().optional().describe('Circulating supply details.'),
  fdv: z.string().optional().describe('Fully Diluted Valuation.'),
  vcs: z.array(z.string()).optional().describe('VC backers.'),
  official_links: z.array(z.string()).optional(),
})).describe('Token discovery details');

@Injectable()
export class FundamentalsService {
  private readonly logger = new Logger(FundamentalsService.name);
  private readonly model: ChatOpenAI;
  private readonly discoveryParser = StructuredOutputParser.fromZodSchema(DiscoverySchema);

  constructor(
    @Inject(CoinGeckoService) private readonly cgService: CoinGeckoService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const apiKey = this.getAsciiEnv('KIMI_API_KEY') || 'missing-key';
    let proxyUrl = process.env.HTTPS_PROXY;
    if (proxyUrl && proxyUrl.includes('host.docker.internal')) {
      const isDocker = require('fs').existsSync('/.dockerenv');
      if (!isDocker) proxyUrl = proxyUrl.replace('host.docker.internal', '127.0.0.1');
    }

    this.model = new ChatOpenAI({
      modelName: 'moonshot-v1-32k',
      temperature: 0,
      apiKey,
      maxTokens: 4000,
      configuration: {
        baseURL: 'https://api.moonshot.cn/v1',
        httpAgent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined,
      } as any,
    });
  }

  private getAsciiEnv(name: string) {
    const value = this.configService.get<string>(name) || process.env[name];
    if (!value) return null;
    if (!/^[\x20-\x7E]+$/.test(value)) {
      this.logger.warn(`${name} 含有非 ASCII 字符，请检查 .env 是否填了中文占位文本。`);
      return null;
    }
    return value.trim();
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

  async discoverCandidates(symbol: string) {
    this.logger.log(`[Discover] 启动轻量代币候选发现，不调用 MCP: ${symbol}...`);

    let officialWebsite = null;
    const normalizedSymbol = symbol.trim().toUpperCase();

    const cgData = await this.cgService.getCoinData(normalizedSymbol.replace(/USDT$/, ''));

    let financialContext = '';
    if (cgData) {
      this.logger.log(`[V14-Context] CoinGecko 匹配成功: ${cgData.name}`);
      officialWebsite = cgData.platforms?.website || '';

      financialContext = `
[COINGECKO FINANCIAL DATA]
Project Name: ${cgData.name}
Symbol: ${cgData.symbol}
Circulating Supply: ${cgData.circulating_supply || 'Unknown'}
Total Supply: ${cgData.total_supply || 'Unknown'}
Market Cap: $${cgData.mcap || 'Unknown'}
FDV: $${cgData.fdv || 'Unknown'}
Categories: ${cgData.categories.join(', ')}
Description: ${cgData.description}
      `;
    }

    const context = [
      financialContext,
      officialWebsite ? `Official Website: ${officialWebsite}` : '',
    ].filter(Boolean).join('\n\n---\n\n');

    if (!context) {
      this.logger.warn(`未找到关于 ${normalizedSymbol} 的 CoinGecko 信息`);
      return [];
    }

    const promptTemplate = new PromptTemplate({
      template: `
        Task: Extract project details for "${symbol}". 
        Priority: Use CoinGecko for project identity and financial numbers. Do not infer news or sentiment.
        
        Rules:
        1. "name": Extract the full project name.
        2. "summary": One concise Chinese sentence.
        3. "market_cap", "circulating_supply", "fdv": Must include if present in context.
        4. "vcs": Extract investors as a list.
        5. "official_links": Include official website from context.
        6. Do not invent facts. If a field is unknown, omit it or use "Unknown".
        
        {format_instructions}
        
        Context:
        {context}
      `,
      inputVariables: ['symbol', 'context'],
      partialVariables: { format_instructions: this.discoveryParser.getFormatInstructions() },
    });

    const res = await this.model.invoke(await promptTemplate.format({ symbol: normalizedSymbol, context: context.substring(0, 30000) }));
    const result = this.extractJson(res.content as string);

    return {
      candidates: Array.isArray(result) ? result : [result].filter(Boolean),
      sources: {
        coinGecko: cgData,
      },
    };
  }

  // analyze 接口已废弃，直接返回空或报错，防止被误调用
  async research(symbol: string, name: string, anchor?: string) {
    this.logger.warn(`[DEPRECATED] Research method called for ${symbol}. Please use discoverCandidates.`);
    return null;
  }
}
