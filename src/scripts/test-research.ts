import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ResearchGraph } from '../agents/research/research-graph';

async function testResearch() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const researchGraph = app.get(ResearchGraph);

  const symbol = 'JOE';
  const name = 'Joe';

  try {
    console.log(`--- Starting Research for ${symbol} ---`);
    const result = await researchGraph.runResearch(symbol, name);
    console.log('--- Research Result ---');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Research failed: ${error.message}`);
  } finally {
    await app.close();
  }
}

testResearch();
