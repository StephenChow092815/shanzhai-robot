import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DexScreenerService } from '../infrastructure/dexscreener.service';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

// 显式设置代理配置，避免每次在命令行输入
process.env.HTTPS_PROXY = 'http://127.0.0.1:6666';
process.env.HTTP_PROXY = 'http://127.0.0.1:6666';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dexService = app.get(DexScreenerService);

  const query = 'JOE';
  console.log(`\n🔍 正在深度扫描 [${query}] 代币的全球布局...`);

  // 直接获取原始搜索数据进行详细对比显示
  const response = await axios.get(`https://api.dexscreener.com/latest/dex/search?q=${query}`, {
    proxy: { host: '127.0.0.1', port: 6666, protocol: 'http' }
  });
  
  const pairs = response.data.pairs || [];
  const chains: Record<string, any> = {};

  pairs.forEach(p => {
    if (!chains[p.chainId]) chains[p.chainId] = { liq: 0, vol: 0, pairCount: 0 };
    chains[p.chainId].liq += parseFloat(p.liquidity?.usd || 0);
    chains[p.chainId].vol += parseFloat(p.volume?.h24 || 0);
    chains[p.chainId].pairCount++;
  });

  console.log('\n--- 📊 全链分布明细 ---');
  Object.entries(chains).forEach(([cid, data]: [string, any]) => {
    console.log(`[链: ${cid.padEnd(10)}] | 流动性: $${data.liq.toLocaleString().padEnd(12)} | 24h交易量: $${data.vol.toLocaleString().padEnd(12)} | 交易对数量: ${data.pairCount}`);
  });

  console.log('\n--- 🎯 决策结果 ---');
  const result = await dexService.findMasterChain(query);
  if (result) {
    console.log(`系统判定的主链: 【${result.masterChainId.toUpperCase()}】`);
    console.log(`主链置信度: ${Math.round(result.confidenceScore * 100)}%`);
    console.log(`建议监听地址: ${result.mainPairAddress}`);
  }

  await app.close();
}

bootstrap().catch(err => console.error('运行失败:', err));
