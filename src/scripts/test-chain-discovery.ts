import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DexScreenerService } from '../infrastructure/dexscreener.service';
import * as dotenv from 'dotenv';

dotenv.config();

// 显式设置代理配置，避免每次在命令行输入
process.env.HTTPS_PROXY = 'http://127.0.0.1:6666';
process.env.HTTP_PROXY = 'http://127.0.0.1:6666';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dexService = app.get(DexScreenerService);

  const tokensToTest = ['PENDLE', 'JOE', 'BASED', '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599']; // last one is WBTC

  console.log('--- 正在启动主链识别测试 ---');

  for (const query of tokensToTest) {
    console.log(`\n测试关键词: [${query}]`);
    const result = await dexService.findMasterChain(query);

    if (result) {
      console.log('--- 识别结果 ---');
      console.log(`币种: ${result.name} (${result.symbol})`);
      console.log(`主链 ID: ${result.masterChainId}`);
      console.log(`主池地址: ${result.mainPairAddress}`);
      console.log(`价格: $${result.priceUsd}`);
      console.log(`总流动性: $${result.liquidityUsd.toLocaleString()}`);
      console.log(`24h 交易量: $${result.volume24hUsd.toLocaleString()}`);
      console.log(`置信度得分: ${Math.round(result.confidenceScore * 100)}%`);
    } else {
      console.log('未能匹配到主链数据。');
    }
  }

  await app.close();
}

bootstrap().catch((err) => {
  console.error('测试运行失败:', err);
  process.exit(1);
});
