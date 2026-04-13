"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const postgres = require('postgres');
const dotenv = require('dotenv');
const axios = require('axios');
dotenv.config();
async function recover() {
    const connectionString = process.env.DATABASE_URL;
    const proxyUrl = process.env.HTTPS_PROXY || 'http://127.0.0.1:6666';
    if (!connectionString) {
        console.error('DATABASE_URL not found');
        return;
    }
    const sql = postgres(connectionString);
    const baseUrl = 'https://fapi.binance.com';
    const getProxy = () => {
        try {
            const url = new URL(proxyUrl);
            return {
                protocol: url.protocol.replace(':', ''),
                host: url.hostname,
                port: parseInt(url.port, 10),
            };
        }
        catch {
            return undefined;
        }
    };
    try {
        console.log('🚀 Starting manual recovery for 08:00 and 12:00 Beijing marks...');
        const exInfoRes = await axios.get(`${baseUrl}/fapi/v1/exchangeInfo`, { proxy: getProxy() });
        const perpetuals = new Set(exInfoRes.data.symbols
            .filter((s) => s.contractType === 'PERPETUAL' && s.status === 'TRADING')
            .map((s) => s.symbol));
        const tickerRes = await axios.get(`${baseUrl}/fapi/v1/ticker/24hr`, { proxy: getProxy() });
        const tickers = tickerRes.data;
        const FILTER_KEYWORDS = ['ALPHA', 'YALA', 'TANSSIUSDT', 'A2Z', 'BNX', 'ALPACA'];
        const top10 = tickers
            .filter((t) => perpetuals.has(t.symbol) && t.symbol.endsWith('USDT') && parseFloat(t.quoteVolume) > 5000000 && !FILTER_KEYWORDS.some(k => t.symbol.includes(k)))
            .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
            .slice(0, 10);
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const marks = [new Date(today)];
        const h4 = new Date(today);
        h4.setUTCHours(4, 0, 0, 0);
        marks.push(h4);
        for (const mark of marks) {
            console.log(`📝 Processing mark: ${mark.toISOString()} (Beijing ${new Date(mark.getTime() + 8 * 3600 * 1000).toLocaleString()})`);
            await sql.unsafe('DELETE FROM top_gainers_logs WHERE observation_time = $1', [mark]);
            const records = top10.map(item => ({
                symbol: item.symbol,
                price_change_percent: parseFloat(item.priceChangePercent).toString(),
                last_price: parseFloat(item.lastPrice).toString(),
                observation_time: mark,
                capture_time: new Date(),
            }));
            for (const r of records) {
                await sql.unsafe('INSERT INTO top_gainers_logs (symbol, price_change_percent, last_price, observation_time, capture_time) VALUES ($1, $2, $3, $4, $5)', [r.symbol, r.price_change_percent, r.last_price, r.observation_time, r.capture_time]);
            }
            console.log(`✅ Recovered 10 records for ${mark.toISOString()}`);
        }
        console.log('🎉 Recovery completed successfully!');
    }
    catch (error) {
        console.error('❌ Recovery failed:', error);
    }
    finally {
        await sql.end();
    }
}
recover();
//# sourceMappingURL=recover-historical-data.js.map