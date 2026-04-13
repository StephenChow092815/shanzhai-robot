"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../app.module");
const dexscreener_service_1 = require("../infrastructure/dexscreener.service");
const dotenv = require("dotenv");
dotenv.config();
process.env.HTTPS_PROXY = 'http://127.0.0.1:6666';
process.env.HTTP_PROXY = 'http://127.0.0.1:6666';
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const dexService = app.get(dexscreener_service_1.DexScreenerService);
    const tokensToTest = ['PENDLE', 'JOE', 'BASED', '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'];
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
        }
        else {
            console.log('未能匹配到主链数据。');
        }
    }
    await app.close();
}
bootstrap().catch((err) => {
    console.error('测试运行失败:', err);
    process.exit(1);
});
//# sourceMappingURL=test-chain-discovery.js.map