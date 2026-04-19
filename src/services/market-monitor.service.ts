import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BinanceApiService } from '../infrastructure/binance-api.service';
import { DATABASE_CONNECTION } from '../database/database.module';
import { topGainersLogs, watchlist, volatilityAlerts } from '../database/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { RealtimeGateway } from '../infrastructure/realtime.gateway';

@Injectable()
export class MarketMonitorService implements OnModuleInit {
  private readonly logger = new Logger(MarketMonitorService.name);

  constructor(
    private readonly binanceApiService: BinanceApiService,
    @Inject(DATABASE_CONNECTION) private readonly db: any,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async onModuleInit() {
    this.logger.log('项目启动：执行 V13 观测池初始检查...');
    await this.captureTopGainers();
    await this.initializeWatchlist();
  }

  /**
   * V13: Initialize watchlist with current Top 10 if empty
   */
  private async initializeWatchlist() {
    const existing = await this.db.select().from(watchlist).limit(1);
    if (existing.length === 0) {
      this.logger.log('观测池为空，正在执行首次自动同步...');
      await this.handleDailyWatchlistReset();
    }
  }

  /**
   * Cron Schedule: Every 4 hours for static gainer snapshots
   */
  @Cron('0 0 0,4,8,12,16,20 * * *')
  async handleScheduledCapture() {
    this.logger.log('执行准点定时任务：正在抓取 4 小时周期涨幅榜...');
    await this.captureTopGainers();
  }

  /**
   * V13: CRITICAL - Run every 1 minute to detect ±5% volatility
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async monitorAnomalyVolatility() {
    const list = await this.db.select().from(watchlist);
    if (list.length === 0) return;

    this.logger.debug(`[V13-Scout] 开始每分钟波动嗅探: 正在观测 ${list.length} 个币种...`);

    for (const item of list) {
      try {
        const ticker = await this.binanceApiService.getKlines(item.symbol, '1m', 1);
        if (!ticker || ticker.length === 0) continue;

        const currentPrice = parseFloat(ticker[0][4]); // Close price of last 1m
        
        if (item.lastPrice) {
          const lastPrice = parseFloat(item.lastPrice);
          const diff = ((currentPrice - lastPrice) / lastPrice) * 100;
          
          if (Math.abs(diff) >= 5) {
            this.logger.warn(`[脉冲预警] 检测到剧烈波动: ${item.symbol} ${diff.toFixed(2)}% | 价格: ${currentPrice}`);
            
            // 1. Persist Alert
            await this.db.insert(volatilityAlerts).values({
              symbol: item.symbol,
              changePercent: diff.toFixed(2),
              priceAtAlert: currentPrice.toString(),
              direction: diff > 0 ? 'up' : 'down',
            });

            // 2. Broadcast via Socket.io
            this.realtimeGateway.broadcastVolatility({
              symbol: item.symbol,
              change: parseFloat(diff.toFixed(2)),
              price: currentPrice,
              direction: diff > 0 ? 'up' : 'down',
              timestamp: new Date().toISOString()
            });
          }
        }

        // Always update lastPrice for next comparison
        await this.db.update(watchlist)
          .set({ lastPrice: currentPrice.toString() })
          .where(eq(watchlist.id, item.id));

      } catch (error) {
        this.logger.error(`[Scout-Error] 观测 ${item.symbol} 价格失败: ${error.message}`);
      }
    }
  }

  /**
   * V13: Daily reset of 'auto' watchlist entries at 00:00 UTC
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyWatchlistReset() {
    this.logger.log('执行零点任务：正在清理并同步观测列表...');
    
    // 1. Remove all auto-added entries
    await this.db.delete(watchlist).where(eq(watchlist.source, 'auto'));

    // 2. Get current Top 10 gainers
    const top10 = await this.binanceApiService.getTopGainers(10);
    
    // 3. Insert into watchlist
    for (const coin of top10) {
      try {
        await this.db.insert(watchlist).values({
          symbol: coin.symbol,
          source: 'auto',
          lastPrice: coin.lastPrice.toString()
        }).onConflictDoNothing();
      } catch (e) {
        this.logger.error(`同步观测币种 ${coin.symbol} 失败: ${e.message}`);
      }
    }
    
    this.logger.log(`零点同步完成。观测池已就绪，当前共 ${top10.length} 个自动观测币种。`);
  }

  async captureTopGainers() {
    try {
      const top10 = await this.binanceApiService.getTopGainers(10);
      const observationTime = this.getObservationTimeMark();
      const captureTime = new Date();
      
      await this.db.delete(topGainersLogs).where(eq(topGainersLogs.observationTime, observationTime));

      const records = top10.map(item => ({
        symbol: item.symbol,
        priceChangePercent: item.priceChangePercent.toString(),
        lastPrice: item.lastPrice.toString(),
        observationTime: observationTime,
        captureTime: captureTime,
      }));

      await this.db.insert(topGainersLogs).values(records);
      this.logger.log(`成功归档 ${records.length} 条代币涨幅记录。`);
    } catch (error) {
      this.logger.error(`涨幅抓取失败: ${error.message}`);
    }
  }

  private getObservationTimeMark(): Date {
    const now = new Date();
    const hours = now.getUTCHours();
    const markHours = Math.floor(hours / 4) * 4;
    const observationTime = new Date(now);
    observationTime.setUTCHours(markHours, 0, 0, 0);
    return observationTime;
  }
}
