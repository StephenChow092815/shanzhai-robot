import { 
  Controller, 
  Get, 
  Post, 
  Delete,
  Param,
  Body, 
  Logger, 
  Query, 
  Inject,
  BadRequestException
} from '@nestjs/common';
import { MarketMonitorService } from '../services/market-monitor.service';
import { AdminService } from './admin.service';
import { FundamentalsService } from '../agents/research/fundamentals.service';
import { ResearchGraph } from '../agents/research/research-graph';
import { DATABASE_CONNECTION } from '../database/database.module';
import { watchlist, volatilityAlerts } from '../database/schema';
import { desc, eq, and, gte, lt, sql } from 'drizzle-orm';
import { BinanceApiService } from '../infrastructure/binance-api.service';

@Controller('api/admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly marketMonitor: MarketMonitorService,
    private readonly adminService: AdminService,
    private readonly binanceApiService: BinanceApiService,
    @Inject(FundamentalsService) private readonly fundamentalsService: FundamentalsService,
    @Inject(ResearchGraph) private readonly researchGraph: ResearchGraph,
    @Inject(DATABASE_CONNECTION) private readonly db: any,
  ) {
    this.logger.warn('>>> [SYSTEM] AdminController V13 (Realtime-Pulse) 已装载 <<<');
  }

  @Get('gainers/latest')
  async getLatestGainers() {
    try {
      const list = await this.adminService.getLatestList();
      // V13: Enhance gainer list with real-time volatility metrics for cards
      const enhancedList = await Promise.all(list.map(async (coin: any) => {
        const volatility = await this.binanceApiService.getMultiIntervalVolatility(coin.symbol);
        return { ...coin, volatility };
      }));

      return {
        success: true,
        data: enhancedList,
        snapshotTime: list.length > 0 ? list[0].observationTime : null
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * V13: Watchlist Management
   */
  @Get('watchlist')
  async getWatchlist() {
    const list = await this.db.select().from(watchlist).orderBy(desc(watchlist.createdAt));
    return { success: true, data: list };
  }

  @Post('watchlist')
  async addToWatchlist(@Body() body: { symbol: string }) {
    if (!body.symbol) throw new BadRequestException('Symbol is required');
    const symbol = body.symbol.toUpperCase();
    try {
      await this.db.insert(watchlist).values({
        symbol,
        source: 'manual',
      }).onConflictDoNothing();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Delete('watchlist/:symbol')
  async removeFromWatchlist(@Param('symbol') symbol: string) {
    try {
      await this.db.delete(watchlist).where(eq(watchlist.symbol, symbol.toUpperCase()));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * V13: Volatility Alert History
   */
  @Get('volatility/alerts')
  async getVolatilityAlerts(
    @Query('date') date?: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20'
  ) {
    const p = parseInt(page);
    const ps = parseInt(pageSize);
    
    let whereClause = undefined;
    if (date) {
      const start = new Date(date);
      start.setHours(0,0,0,0);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      whereClause = and(
        gte(volatilityAlerts.timestamp, start),
        lt(volatilityAlerts.timestamp, end)
      );
    }

    const totalResult = await this.db
      .select({ count: sql`count(*)` })
      .from(volatilityAlerts)
      .where(whereClause);
    const total = parseInt(totalResult[0].count);

    const entries = await this.db
      .select()
      .from(volatilityAlerts)
      .where(whereClause)
      .orderBy(desc(volatilityAlerts.timestamp))
      .limit(ps)
      .offset((p - 1) * ps);

    return { 
      success: true, 
      data: entries,
      total,
      page: p,
      pageSize: ps,
      totalPages: Math.ceil(total / ps)
    };
  }

  @Get('gainers/historical-list')
  async getHistoricalList(
    @Query('date') date?: string,
    @Query('time') time?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    try {
      const p = parseInt(page || '1');
      const ps = parseInt(pageSize || '10');
      const { data, total } = await this.adminService.getHistoricalList(date, time, p, ps);
      return { success: true, data, page: p, pageSize: ps, totalPages: Math.ceil(total / ps), total };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Post('research/discover')
  async discoverNew(@Body() body: { symbol: string }) {
    if (!body.symbol) throw new BadRequestException('Symbol is required');
    try {
      const candidates = await this.fundamentalsService.discoverCandidates(body.symbol);
      return { success: true, data: candidates };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Post('research/analyze')
  async analyzeProject(@Body() body: { symbol: string; name: string; anchor?: string }) {
    if (!body.symbol || !body.name) throw new BadRequestException('Symbol and name are required');
    try {
      const result = await this.researchGraph.runResearch(body.symbol, body.name, body.anchor);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
