import { Controller, Post, Body, Get, Logger, Inject, Query } from '@nestjs/common';
import { ResearchGraph } from '../agents/research/research-graph';
import { DexScreenerService } from '../infrastructure/dexscreener.service';
import { DATABASE_CONNECTION } from '../database/database.module';
import { topGainersLogs } from '../database/schema';
import { desc, eq, and, gte, lte, count } from 'drizzle-orm';
import { MarketMonitorService } from '../services/market-monitor.service';

@Controller('api/admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly researchGraph: ResearchGraph,
    private readonly dexService: DexScreenerService,
    private readonly marketMonitor: MarketMonitorService,
    @Inject(DATABASE_CONNECTION) private readonly db: any,
  ) {}

  @Get('gainers/latest')
  async getLatestGainers(@Query('time') time?: string) {
    this.logger.log(`[API] 正在检索涨幅快照 (时刻: ${time || 'latest'})...`);
    try {
      let targetTime = time;
      
      if (!targetTime) {
        // Find latest observation time
        const latestLog = await this.db.select()
          .from(topGainersLogs)
          .orderBy(desc(topGainersLogs.observationTime))
          .limit(1);

        if (!latestLog.length) return { success: true, data: [] };
        targetTime = latestLog[0].observationTime;
      }

      const results = await this.db.select()
        .from(topGainersLogs)
        .where(eq(topGainersLogs.observationTime, new Date(targetTime)))
        .orderBy(desc(topGainersLogs.priceChangePercent));

      return { 
        success: true, 
        data: results, 
        snapshotTime: targetTime,
        captureTime: results[0]?.captureTime
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Get('gainers/history-marks')
  async getHistoryMarks() {
    try {
      // Use SQL to select distinct observationTime
      const results = await this.db.select({
        time: topGainersLogs.observationTime
      })
      .from(topGainersLogs)
      .groupBy(topGainersLogs.observationTime)
      .orderBy(desc(topGainersLogs.observationTime))
      .limit(100);

      return { success: true, data: results.map((r: any) => r.time) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Get('gainers/historical-list')
  async getHistoricalList(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('date') date?: string,
  ) {
    this.logger.log(`[API] 正在检索历史流水分页 (页码: ${page}, 大小: ${pageSize}, 日期: ${date || 'all'})...`);
    try {
      const p = Math.max(1, parseInt(page));
      const ps = Math.max(1, parseInt(pageSize));
      const offset = (p - 1) * ps;

      let conditions = [];
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);
        conditions.push(gte(topGainersLogs.observationTime, startOfDay));
        conditions.push(lte(topGainersLogs.observationTime, endOfDay));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // 1. Get total count
      const totalRes = await this.db.select({ value: count() })
        .from(topGainersLogs)
        .where(whereClause);
      const total = totalRes[0].value;

      // 2. Get paginated data
      const items = await this.db.select()
        .from(topGainersLogs)
        .where(whereClause)
        .orderBy(desc(topGainersLogs.observationTime), desc(topGainersLogs.priceChangePercent))
        .limit(ps)
        .offset(offset);

      return {
        success: true,
        data: items,
        total,
        page: p,
        pageSize: ps,
        totalPages: Math.ceil(total / ps)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Post('gainers/refresh')
  async refreshGainers() {
    this.logger.log(`[API] 收到手动刷新请求，正在触发快照任务...`);
    try {
      await this.marketMonitor.captureTopGainers();
      return this.getLatestGainers(); // Return the fresh batch
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Post('research')
  async runResearch(@Body() body: { symbol: string; name: string }) {
    this.logger.log(`[API] 收到调研请求: ${body.symbol} (${body.name})`);
    try {
      const result = await this.researchGraph.runResearch(body.symbol, body.name);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Post('discovery')
  async runDiscovery(@Body() body: { query: string }) {
    this.logger.log(`[API] 收到全链检索请求: ${body.query}`);
    try {
      const result = await this.dexService.findMasterChain(body.query);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
