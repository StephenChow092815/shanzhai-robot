import { ResearchGraph } from '../agents/research/research-graph';
import { DexScreenerService } from '../infrastructure/dexscreener.service';
import { MarketMonitorService } from '../services/market-monitor.service';
export declare class AdminController {
    private readonly researchGraph;
    private readonly dexService;
    private readonly marketMonitor;
    private readonly db;
    private readonly logger;
    constructor(researchGraph: ResearchGraph, dexService: DexScreenerService, marketMonitor: MarketMonitorService, db: any);
    getLatestGainers(time?: string): Promise<{
        success: boolean;
        data: any[];
        snapshotTime?: undefined;
        captureTime?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        data: any;
        snapshotTime: string;
        captureTime: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
        snapshotTime?: undefined;
        captureTime?: undefined;
    }>;
    getHistoryMarks(): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    getHistoricalList(page?: string, pageSize?: string, date?: string): Promise<{
        success: boolean;
        data: any;
        total: any;
        page: number;
        pageSize: number;
        totalPages: number;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
        total?: undefined;
        page?: undefined;
        pageSize?: undefined;
        totalPages?: undefined;
    }>;
    refreshGainers(): Promise<{
        success: boolean;
        data: any[];
        snapshotTime?: undefined;
        captureTime?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        data: any;
        snapshotTime: string;
        captureTime: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
        snapshotTime?: undefined;
        captureTime?: undefined;
    }>;
    healthCheck(): {
        status: string;
        timestamp: string;
    };
    runResearch(body: {
        symbol: string;
        name: string;
    }): Promise<{
        success: boolean;
        data: import("@langchain/langgraph").StateType<{
            symbol: import("@langchain/langgraph").LastValue<string>;
            name: import("@langchain/langgraph").LastValue<string>;
            fundamentals: import("@langchain/langgraph").LastValue<any>;
            sentiment: import("@langchain/langgraph").LastValue<any>;
            status: import("@langchain/langgraph").LastValue<"pending" | "completed" | "failed">;
        }>;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    runDiscovery(body: {
        query: string;
    }): Promise<{
        success: boolean;
        data: import("../infrastructure/dexscreener.service").ChainDiscoveryResult;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
}
