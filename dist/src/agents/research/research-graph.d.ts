import { FundamentalsService } from './fundamentals.service';
import { SentimentService } from './sentiment.service';
export declare class ResearchGraph {
    private readonly logger;
    private readonly fundamentalsService;
    private readonly sentimentService;
    constructor(fundamentalsService: FundamentalsService, sentimentService: SentimentService);
    createGraph(): import("@langchain/langgraph").CompiledStateGraph<{
        symbol: string;
        name: string;
        fundamentals: any;
        sentiment: any;
        status: "pending" | "completed" | "failed";
    }, {
        symbol?: string;
        name?: string;
        fundamentals?: any;
        sentiment?: any;
        status?: "pending" | "completed" | "failed";
    }, "__start__" | "fundamentalsNode" | "sentimentNode", {
        symbol: import("@langchain/langgraph").LastValue<string>;
        name: import("@langchain/langgraph").LastValue<string>;
        fundamentals: import("@langchain/langgraph").LastValue<any>;
        sentiment: import("@langchain/langgraph").LastValue<any>;
        status: import("@langchain/langgraph").LastValue<"pending" | "completed" | "failed">;
    }, {
        symbol: import("@langchain/langgraph").LastValue<string>;
        name: import("@langchain/langgraph").LastValue<string>;
        fundamentals: import("@langchain/langgraph").LastValue<any>;
        sentiment: import("@langchain/langgraph").LastValue<any>;
        status: import("@langchain/langgraph").LastValue<"pending" | "completed" | "failed">;
    }, import("@langchain/langgraph").StateDefinition, {
        fundamentalsNode: {
            fundamentals: {
                summary?: string;
                tokenomics?: {
                    total_supply?: string;
                    tge_date?: string;
                    initial_circulating_supply?: string;
                    allocation?: string;
                    vesting_schedule?: string;
                    unlock_schedule?: {
                        date?: string;
                        amount?: string;
                        description?: string;
                    }[];
                    airdrop_details?: string;
                    exchanges?: {
                        date?: string;
                        name?: string;
                    }[];
                    market_makers?: string[];
                    utility?: string;
                };
                roadmap?: string;
                team?: string;
                risks?: string[];
                audit_status?: string;
            };
        };
        sentimentNode: {
            sentiment: {
                tokenId: any;
                score: number;
                buzz: number;
                source: string;
                rawOutput: {
                    snippets: {
                        title: string;
                        url: string;
                    }[];
                };
            };
            status: "completed";
        };
    }, unknown, unknown>;
    runResearch(symbol: string, name: string): Promise<import("@langchain/langgraph").StateType<{
        symbol: import("@langchain/langgraph").LastValue<string>;
        name: import("@langchain/langgraph").LastValue<string>;
        fundamentals: import("@langchain/langgraph").LastValue<any>;
        sentiment: import("@langchain/langgraph").LastValue<any>;
        status: import("@langchain/langgraph").LastValue<"pending" | "completed" | "failed">;
    }>>;
}
