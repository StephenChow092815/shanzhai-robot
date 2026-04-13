export interface ChainDiscoveryResult {
    symbol: string;
    name: string;
    masterChainId: string;
    mainPairAddress: string;
    priceUsd: string;
    liquidityUsd: number;
    volume24hUsd: number;
    confidenceScore: number;
}
export declare class DexScreenerService {
    private readonly logger;
    private readonly BASE_URL;
    findMasterChain(query: string): Promise<ChainDiscoveryResult | null>;
}
