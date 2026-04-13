import { OnModuleInit } from '@nestjs/common';
import { BinanceApiService } from '../infrastructure/binance-api.service';
export declare class MarketMonitorService implements OnModuleInit {
    private readonly binanceApiService;
    private readonly db;
    private readonly logger;
    constructor(binanceApiService: BinanceApiService, db: any);
    onModuleInit(): Promise<void>;
    handleScheduledCapture(): Promise<void>;
    captureTopGainers(): Promise<void>;
    private getObservationTimeMark;
}
