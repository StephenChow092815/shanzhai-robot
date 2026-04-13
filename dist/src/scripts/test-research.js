"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../app.module");
const research_graph_1 = require("../agents/research/research-graph");
async function testResearch() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const researchGraph = app.get(research_graph_1.ResearchGraph);
    const symbol = 'JOE';
    const name = 'Joe';
    try {
        console.log(`--- Starting Research for ${symbol} ---`);
        const result = await researchGraph.runResearch(symbol, name);
        console.log('--- Research Result ---');
        console.log(JSON.stringify(result, null, 2));
    }
    catch (error) {
        console.error(`Research failed: ${error.message}`);
    }
    finally {
        await app.close();
    }
}
testResearch();
//# sourceMappingURL=test-research.js.map