"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResearchModule = void 0;
const common_1 = require("@nestjs/common");
const fundamentals_service_1 = require("./fundamentals.service");
const sentiment_service_1 = require("./sentiment.service");
const research_graph_1 = require("./research-graph");
let ResearchModule = class ResearchModule {
};
exports.ResearchModule = ResearchModule;
exports.ResearchModule = ResearchModule = __decorate([
    (0, common_1.Module)({
        providers: [fundamentals_service_1.FundamentalsService, sentiment_service_1.SentimentService, research_graph_1.ResearchGraph],
        exports: [fundamentals_service_1.FundamentalsService, sentiment_service_1.SentimentService, research_graph_1.ResearchGraph],
    })
], ResearchModule);
//# sourceMappingURL=research.module.js.map