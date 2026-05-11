import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { OpenNewsService } from '../../infrastructure/opennews.service';
import { OpenTwitterService } from '../../infrastructure/opentwitter.service';
import { BinanceApiService } from '../../infrastructure/binance-api.service';
import { DexScreenerService } from '../../infrastructure/dexscreener.service';

@Injectable()
export class TradeAnalysisService {
  private readonly logger = new Logger(TradeAnalysisService.name);
  private readonly model: ChatOpenAI;

  constructor(
    @Inject(OpenNewsService) private readonly openNewsService: OpenNewsService,
    @Inject(OpenTwitterService) private readonly openTwitterService: OpenTwitterService,
    @Inject(BinanceApiService) private readonly binanceApiService: BinanceApiService,
    @Inject(DexScreenerService) private readonly dexScreenerService: DexScreenerService,
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
      maxTokens: 3000,
      configuration: {
        baseURL: 'https://api.moonshot.cn/v1',
        httpAgent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined,
      } as any,
    });
  }

  async analyze(symbol: string) {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const baseSymbol = normalizedSymbol.replace(/USDT$/, '');
    this.logger.log(`[TradeAnalysis] 启动交易分析: ${normalizedSymbol}`);

    const [news, twitter, cex, dex] = await Promise.all([
      this.openNewsService.searchByCoin(baseSymbol, 12),
      this.openTwitterService.searchByCoin(baseSymbol, 20),
      this.binanceApiService.getTradingSnapshot(normalizedSymbol).catch((error) => ({ error: error.message })),
      this.dexScreenerService.findMasterChain(baseSymbol),
    ]);

    const prompt = new PromptTemplate({
      template: `
你是一个加密货币短线交易分析员。基于 CEX、DEX、新闻、推特情绪四类证据，判断 {symbol} 当前更适合：
LONG（做多）、SHORT（做空）、WAIT（继续等待）。

要求：
1. 输出必须是 JSON，不要 Markdown。
2. 只给分析建议，不要宣称确定收益，不要引导重仓。
3. 必须同时考虑：
   - CEX：当前价格、24h 涨跌、15m/1h/4h/1d 动量是否一致，是否过热。
   - 衍生品/订单流：OI 是否上升、OI 与价格是否同向；CVD 是否为正；Taker 买卖比是否偏多/偏空；资金费率是否过热。
   - DEX：流动性、24h 成交量、主链置信度，判断链上流动性是否支撑行情。
   - OpenNews：是否出现交易所操纵、清算、上所、诈骗、重大利好/利空。
   - OpenTwitter：KOL 情绪、FUD/风险提醒、散户追涨、meme 热度。
4. 决策倾向：
   - 短周期和中周期同向上行、OI 增加且 CVD 为正、Taker 买盘占优、新闻/推特无明显风险、DEX 有流动性支撑 => LONG。
   - 价格上涨但 CVD 为负或 OI 快速上升且资金费率过热，推特/新闻出现操纵/诈骗/清算风险，DEX 支撑弱 => SHORT 或 WAIT。
   - 价格下跌且 OI 增加、CVD 为负、主动卖盘占优 => SHORT。
   - 证据冲突、数据缺失、已暴涨但方向未确认 => WAIT。
5. JSON 字段：
{{
  "symbol": "{symbol}",
  "decision": "LONG|SHORT|WAIT",
  "confidence": 0-100,
  "summary": "一句中文结论",
  "long_thesis": ["支持做多的要点"],
  "short_thesis": ["支持做空的要点"],
  "wait_conditions": ["需要等待的条件"],
  "risk_flags": ["主要风险"],
  "trade_plan": {{
    "bias": "做多|做空|等待",
    "entry": "入场观察条件",
    "invalidated_if": "失效条件",
    "risk_note": "仓位和风控提醒"
  }}
}}

CEX_DATA:
{cex}

DEX_DATA:
{dex}

OPENNEWS:
{news}

OPENTWITTER:
{twitter}
      `,
      inputVariables: ['symbol', 'cex', 'dex', 'news', 'twitter'],
    });

    const res = await this.model.invoke(await prompt.format({
      symbol: normalizedSymbol,
      cex: JSON.stringify(cex, null, 2).substring(0, 6000),
      dex: JSON.stringify(dex, null, 2).substring(0, 4000),
      news: JSON.stringify(news.items, null, 2).substring(0, 10000),
      twitter: JSON.stringify(twitter.items, null, 2).substring(0, 10000),
    }));

    return {
      analysis: this.extractJson(res.content as string),
      sources: {
        cex,
        dex,
        openNews: news,
        openTwitter: twitter,
      },
    };
  }

  private extractJson(content: string) {
    try {
      const jsonBlock = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const rawJson = jsonBlock ? jsonBlock[1].trim() : content.trim();
      const start = rawJson.indexOf('{');
      const end = rawJson.lastIndexOf('}');
      return JSON.parse(rawJson.substring(start, end + 1));
    } catch (error) {
      this.logger.error(`[TradeAnalysis] JSON 解析失败: ${error.message}`);
      return {
        decision: 'WAIT',
        confidence: 0,
        summary: '模型输出解析失败，建议继续等待。',
        risk_flags: ['analysis_parse_failed'],
      };
    }
  }
}
