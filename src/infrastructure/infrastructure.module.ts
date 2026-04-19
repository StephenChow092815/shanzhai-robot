import { Module } from '@nestjs/common';
import { BinanceApiService } from './binance-api.service';
import { ExaService } from './exa.service';
import { DexScreenerService } from './dexscreener.service';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  providers: [
    BinanceApiService, 
    ExaService, 
    DexScreenerService,
    RealtimeGateway
  ],
  exports: [
    BinanceApiService, 
    ExaService, 
    DexScreenerService,
    RealtimeGateway
  ],
})
export class InfrastructureModule {}
