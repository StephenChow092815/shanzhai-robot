"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.topGainersLogs = exports.alerts = exports.sentimentLogs = exports.researchReports = exports.tokens = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.tokens = (0, pg_core_1.pgTable)('tokens', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    address: (0, pg_core_1.varchar)('address', { length: 42 }).unique().notNull(),
    symbol: (0, pg_core_1.varchar)('symbol', { length: 20 }).notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }),
    network: (0, pg_core_1.varchar)('network', { length: 50 }).default('ethereum'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
});
exports.researchReports = (0, pg_core_1.pgTable)('research_reports', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tokenId: (0, pg_core_1.integer)('token_id').references(() => exports.tokens.id).notNull(),
    summary: (0, pg_core_1.text)('summary'),
    tokenomics: (0, pg_core_1.jsonb)('tokenomics'),
    roadmap: (0, pg_core_1.jsonb)('roadmap'),
    team: (0, pg_core_1.jsonb)('team'),
    risks: (0, pg_core_1.jsonb)('risks'),
    githubStats: (0, pg_core_1.jsonb)('github_stats'),
    auditStatus: (0, pg_core_1.text)('audit_status'),
    version: (0, pg_core_1.integer)('version').default(1),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.sentimentLogs = (0, pg_core_1.pgTable)('sentiment_logs', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tokenId: (0, pg_core_1.integer)('token_id').references(() => exports.tokens.id).notNull(),
    score: (0, pg_core_1.decimal)('score', { precision: 3, scale: 2 }),
    buzz: (0, pg_core_1.integer)('buzz'),
    source: (0, pg_core_1.varchar)('source', { length: 50 }),
    rawOutput: (0, pg_core_1.jsonb)('raw_output'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.alerts = (0, pg_core_1.pgTable)('alerts', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tokenId: (0, pg_core_1.integer)('token_id').references(() => exports.tokens.id).notNull(),
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(),
    severity: (0, pg_core_1.varchar)('severity', { length: 20 }).notNull(),
    message: (0, pg_core_1.text)('message').notNull(),
    data: (0, pg_core_1.jsonb)('data'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.topGainersLogs = (0, pg_core_1.pgTable)('top_gainers_logs', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    symbol: (0, pg_core_1.varchar)('symbol', { length: 20 }).notNull(),
    priceChangePercent: (0, pg_core_1.numeric)('price_change_percent', { precision: 20, scale: 6 }).notNull(),
    lastPrice: (0, pg_core_1.numeric)('last_price', { precision: 30, scale: 10 }).notNull(),
    observationTime: (0, pg_core_1.timestamp)('observation_time').notNull(),
    captureTime: (0, pg_core_1.timestamp)('capture_time').defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
//# sourceMappingURL=schema.js.map