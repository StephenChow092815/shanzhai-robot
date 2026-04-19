import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ExaService } from '../infrastructure/exa.service';

async function testExaGenius() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const exaService = app.get(ExaService);

  const symbol = 'GENIUS';
  const name = 'GENIUS';

  console.log(`\n=== Testing Search for ${symbol} ===\n`);

  const queries = [
    `"${symbol}" token exchange listing announcement April 2026`,
    `"${symbol}" crypto BingX Bitget MEXC listing date`,
    `official announcement for ${name} (${symbol}) on major exchanges`,
    `site:binance.com OR site:bitget.com OR site:mexc.com "${symbol}" listing`
  ];

  for (const query of queries) {
    console.log(`\n--- QUERY: ${query} ---`);
    try {
      const results = await (exaService as any).exa.searchAndContents(query, {
        numResults: 5,
        useAutoprompt: true,
        text: { maxCharacters: 1000 }
      });
      
      results.results.forEach((r: any, i: number) => {
        console.log(`[${i+1}] ${r.title}\n    URL: ${r.url}\n    Text: ${r.text?.substring(0, 200)}...\n`);
      });
    } catch (e) {
      console.error(`Query failed: ${e.message}`);
    }
  }

  await app.close();
}

testExaGenius();
