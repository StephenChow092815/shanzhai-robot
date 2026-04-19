import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { topGainersLogs } from '../database/schema';
import { desc, eq, and, sql } from 'drizzle-orm';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: any,
  ) {}

  /**
   * V10.3: Numerical sorting improvement
   */
  async getLatestList() {
    const latestMark = await this.db
      .select({ time: topGainersLogs.observationTime })
      .from(topGainersLogs)
      .orderBy(desc(topGainersLogs.observationTime))
      .limit(1);

    if (!latestMark.length) return [];

    const results = await this.db
      .select()
      .from(topGainersLogs)
      .where(eq(topGainersLogs.observationTime, latestMark[0].time));

    // Client-side sort to be dialect-agnostic for percent strings
    return results.sort((a: any, b: any) => 
      parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent)
    );
  }

  /**
   * V10.3 FIXED: Returns a flat array of ISO strings for the frontend pipe
   */
  async getHistoryMarkers() {
    const records = await this.db
      .select({ 
        observationTime: topGainersLogs.observationTime 
      })
      .from(topGainersLogs)
      .groupBy(topGainersLogs.observationTime)
      .orderBy(desc(topGainersLogs.observationTime));

    // V10.3 Mapping: object[] -> string[]
    return records.map((r: any) => r.observationTime.toISOString());
  }

  /**
   * Paginated historical data retrieval
   */
  async getHistoricalList(date?: string, time?: string, page: number = 1, pageSize: number = 10) {
    let whereClause = undefined;
    
    if (date && time) {
      const dateTime = new Date(`${date}T${time}`);
      whereClause = eq(topGainersLogs.observationTime, dateTime);
    }

    const offset = (page - 1) * pageSize;

    const data = await this.db
      .select()
      .from(topGainersLogs)
      .where(whereClause)
      .orderBy(desc(topGainersLogs.observationTime))
      .limit(pageSize)
      .offset(offset);

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(topGainersLogs)
      .where(whereClause);

    return {
      data,
      total: Number(countResult[0]?.count || 0)
    };
  }
}
