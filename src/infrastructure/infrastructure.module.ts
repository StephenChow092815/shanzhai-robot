import { Global, Module } from '@nestjs/common';
import { ExaService } from './exa.service';
import { DexScreenerService } from './dexscreener.service';
import { BinanceApiService } from './binance-api.service';

@Global()
@Module({
  providers: [ExaService, DexScreenerService, BinanceApiService],
  exports: [ExaService, DexScreenerService, BinanceApiService],
})
export class InfrastructureModule {}
