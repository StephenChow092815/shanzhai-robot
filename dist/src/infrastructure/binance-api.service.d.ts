import { ConfigService } from '@nestjs/config';
export declare class BinanceApiService {
    private readonly configService;
    private readonly logger;
    private readonly baseUrl;
    constructor(configService: ConfigService);
    getTopGainers(limit?: number): Promise<any>;
    private getProxyConfig;
}
