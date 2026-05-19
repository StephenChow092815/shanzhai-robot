import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { OpenNewsService } from '../../infrastructure/opennews.service';
import { OpenTwitterService } from '../../infrastructure/opentwitter.service';
import { BinanceApiService } from '../../infrastructure/binance-api.service';
import { CoinGeckoService } from '../../infrastructure/coingecko.service';
import { AveApiService } from '../../infrastructure/ave-api.service';

@Injectable()
export class TradeAnalysisService {
  private readonly logger = new Logger(TradeAnalysisService.name);
  private readonly model: ChatOpenAI;

  constructor(
    @Inject(OpenNewsService) private readonly openNewsService: OpenNewsService,
    @Inject(OpenTwitterService) private readonly openTwitterService: OpenTwitterService,
    @Inject(BinanceApiService) private readonly binanceApiService: BinanceApiService,
    @Inject(CoinGeckoService) private readonly coinGeckoService: CoinGeckoService,
    @Inject(AveApiService) private readonly aveApiService: AveApiService,
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
      maxTokens: 3000,
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

  async analyze(symbol: string) {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const baseSymbol = normalizedSymbol.replace(/USDT$/, '');
    this.logger.log(`[TradeAnalysis] 启动交易分析: ${normalizedSymbol}`);

    const [news, twitter, binanceOi, coinGecko, ave] = await Promise.all([
      this.openNewsService.searchByCoin(baseSymbol, 12),
      this.openTwitterService.searchByCoin(baseSymbol, 20),
      this.binanceApiService.getOpenInterestTimeframes(normalizedSymbol).catch((error) => ({ error: error.message })),
      this.coinGeckoService.getCoinData(baseSymbol),
      this.aveApiService.researchToken(baseSymbol),
    ]);

    const prompt = new PromptTemplate({
      template: `
你是一个加密货币短线交易分析员。基于 CoinGecko 项目资料、Ave 链上数据、Binance OI、新闻、推特情绪五类证据，判断 {symbol} 当前更适合：
LONG（做多）、SHORT（做空）、WAIT（继续等待）。

要求：
1. 输出必须是 JSON，不要 Markdown。
2. 只给分析建议，不要宣称确定收益，不要引导重仓。
3. 必须同时考虑：
   - CoinGecko：项目身份、官网、官方 Twitter/X、供应数据。项目方社媒只用于识别官方渠道，不等同于市场情绪。
   - Ave：链上主交易对、价格、流动性、成交额、合约风险、持仓集中度、15m/1h/4h/1d 链上 K 线动量。合约风险和集中度高时必须进入 risk_flags。
   - Binance OI：15m/1h/4h/1d OI 当前值和变化。价格上涨且 OI 快速上升代表杠杆追涨，需警惕拥挤；价格和 OI 同向且 Ave 链上量价健康才加分。
   - OpenNews：是否出现交易所操纵、清算、上所、诈骗、重大利好/利空。
   - OpenTwitter：KOL 情绪、FUD/风险提醒、散户追涨、meme 热度。
4. 决策倾向：
   - Ave 短周期和中周期同向上行、流动性和成交额能支撑、Binance OI 温和增加、新闻/推特无明显风险 => LONG。
   - 价格上涨但 OI 快速上升、Ave 持仓集中度/合约风险偏高，推特/新闻出现操纵/诈骗/清算风险 => SHORT 或 WAIT。
   - Ave 价格下跌且 OI 增加，说明空头或高杠杆分歧扩大 => SHORT 或 WAIT。
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

COINGECKO_PROJECT:
{coinGecko}

AVE_ONCHAIN:
{ave}

BINANCE_OI:
{binanceOi}

OPENNEWS:
{news}

OPENTWITTER:
{twitter}
      `,
      inputVariables: ['symbol', 'coinGecko', 'ave', 'binanceOi', 'news', 'twitter'],
    });

    const res = await this.model.invoke(await prompt.format({
      symbol: normalizedSymbol,
      coinGecko: JSON.stringify(coinGecko, null, 2).substring(0, 4000),
      ave: JSON.stringify(ave, null, 2).substring(0, 8000),
      binanceOi: JSON.stringify(binanceOi, null, 2).substring(0, 4000),
      news: JSON.stringify(news.items, null, 2).substring(0, 10000),
      twitter: JSON.stringify(twitter.items, null, 2).substring(0, 10000),
    }));

    return {
      analysis: this.extractJson(res.content as string),
      sources: {
        binanceOi,
        coinGecko,
        ave,
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
