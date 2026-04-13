import { ConfigService } from '@nestjs/config';
import { ExaService } from '../../infrastructure/exa.service';
export declare class FundamentalsService {
    private readonly exaService;
    private readonly configService;
    private readonly logger;
    private readonly model;
    private readonly parser;
    constructor(exaService: ExaService, configService: ConfigService);
    research(symbol: string, name: string): Promise<{
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
    }>;
}
