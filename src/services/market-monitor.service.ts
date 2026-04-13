import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BinanceApiService } from '../infrastructure/binance-api.service';
import { DATABASE_CONNECTION } from '../database/database.module';
import { topGainersLogs } from '../database/schema';
import { eq } from 'drizzle-orm';
import * as schema from '../database/schema';

@Injectable()
export class MarketMonitorService implements OnModuleInit {
  private readonly logger = new Logger(MarketMonitorService.name);

  constructor(
    private readonly binanceApiService: BinanceApiService,
    @Inject(DATABASE_CONNECTION) private readonly db: any,
  ) {}

  async onModuleInit() {
    this.logger.log('项目启动：立即执行首次涨幅榜快照抓取...');
    await this.captureTopGainers();
  }

  /**
   * Cron Schedule: Every 4 hours on the dot (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)
   */
  @Cron('0 0 0,4,8,12,16,20 * * *')
  async handleScheduledCapture() {
    this.logger.log('执行准点定时任务：正在抓取 4 小时周期涨幅榜...');
    await this.captureTopGainers();
  }

  async captureTopGainers() {
    try {
      const top10 = await this.binanceApiService.getTopGainers(10);
      
      // Calculate the observation time (Current/Previous 4h mark)
      const observationTime = this.getObservationTimeMark();
      const captureTime = new Date(); // Actual trigger time
      
      this.logger.log(`归档时刻: ${observationTime.toISOString()} | 触发时间: ${captureTime.toISOString()}`);

      // 1. Delete existing records for this observation mark
      await this.db.delete(topGainersLogs)
        .where(eq(topGainersLogs.observationTime, observationTime));

      // 2. Prepare records for database
      const records = top10.map(item => ({
        symbol: item.symbol,
        priceChangePercent: item.priceChangePercent.toString(),
        lastPrice: item.lastPrice.toString(),
        observationTime: observationTime,
        captureTime: captureTime,
      }));

      // 3. Bulk insert fresh snapshot
      await this.db.insert(topGainersLogs).values(records);
      this.logger.log(`成功归档 ${records.length} 条代币涨幅记录。`);
      
    } catch (error) {
      this.logger.error(`抓取或存档任务失败: ${error.message}`);
    }
  }

  /**
   * Calculates the start of the current 4-hour window (0, 4, 8, 12, 16, 20 UTC)
   */
  private getObservationTimeMark(): Date {
    const now = new Date();
    const hours = now.getUTCHours();
    
    // Find the closest previous 4h mark in UTC
    const markHours = Math.floor(hours / 4) * 4;
    
    const observationTime = new Date(now);
    observationTime.setUTCHours(markHours, 0, 0, 0);
    
    return observationTime;
  }
}
