import { ExaService } from '../../infrastructure/exa.service';
export declare class SentimentService {
    private readonly exaService;
    private readonly logger;
    constructor(exaService: ExaService);
    analyzeSentiment(symbol: string, name: string): Promise<{
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
    }>;
}
