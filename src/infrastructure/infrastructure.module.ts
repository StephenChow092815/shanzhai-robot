import { Module } from '@nestjs/common';
import { BinanceApiService } from './binance-api.service';
import { DexScreenerService } from './dexscreener.service';
import { CoinGeckoService } from './coingecko.service';
import { OpenNewsService } from './opennews.service';
import { OpenTwitterService } from './opentwitter.service';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  providers: [
    BinanceApiService, 
    DexScreenerService,
    CoinGeckoService,
    OpenNewsService,
    OpenTwitterService,
    RealtimeGateway
  ],
  exports: [
    BinanceApiService, 
    DexScreenerService,
    CoinGeckoService,
    OpenNewsService,
    OpenTwitterService,
    RealtimeGateway
  ],
})
export class InfrastructureModule {}
