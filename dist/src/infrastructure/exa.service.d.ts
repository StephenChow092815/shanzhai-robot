export declare class ExaService {
    private readonly logger;
    private readonly exa;
    constructor();
    searchProjectInfo(query: string, numResults?: number): Promise<import("exa-js").SearchResult<{
        numResults: number;
        useAutoprompt: true;
        text: true;
        highlights: true;
    }>[]>;
    findTechnicalDocs(symbol: string, name: string): Promise<import("exa-js").SearchResult<{
        numResults: number;
        useAutoprompt: true;
        text: true;
        highlights: true;
    }>[]>;
    findTokenomicsDocs(symbol: string, name: string): Promise<import("exa-js").SearchResult<{
        numResults: number;
        useAutoprompt: true;
        text: true;
        highlights: true;
    }>[]>;
}
