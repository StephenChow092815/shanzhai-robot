import { pgTable, serial, text, varchar, timestamp, jsonb, decimal, integer, numeric } from 'drizzle-orm/pg-core';

export const tokens = pgTable('tokens', {
  id: serial('id').primaryKey(),
  address: varchar('address', { length: 42 }).unique().notNull(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  name: varchar('name', { length: 100 }),
  network: varchar('network', { length: 50 }).default('ethereum'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const researchReports = pgTable('research_reports', {
  id: serial('id').primaryKey(),
  tokenId: integer('token_id').references(() => tokens.id).notNull(),
  summary: text('summary'),
  tokenomics: jsonb('tokenomics'), // { total_supply, allocation, vesting, etc }
  roadmap: jsonb('roadmap'),
  team: jsonb('team'),
  risks: jsonb('risks'),
  githubStats: jsonb('github_stats'),
  auditStatus: text('audit_status'),
  version: integer('version').default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sentimentLogs = pgTable('sentiment_logs', {
  id: serial('id').primaryKey(),
  tokenId: integer('token_id').references(() => tokens.id).notNull(),
  score: decimal('score', { precision: 3, scale: 2 }), // -1.0 to 1.0
  buzz: integer('buzz'), // mention count
  source: varchar('source', { length: 50 }), // 'lunar_crush', 'exa_ai', etc.
  rawOutput: jsonb('raw_output'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  tokenId: integer('token_id').references(() => tokens.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'whale_transfer', 'price_spike', 'rug_pull_risk'
  severity: varchar('severity', { length: 20 }).notNull(), // 'low', 'medium', 'high', 'critical'
  message: text('message').notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const topGainersLogs = pgTable('top_gainers_logs', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  priceChangePercent: numeric('price_change_percent', { precision: 20, scale: 6 }).notNull(),
  lastPrice: numeric('last_price', { precision: 30, scale: 10 }).notNull(),
  observationTime: timestamp('observation_time').notNull(),
  captureTime: timestamp('capture_time').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * V13: Watchlist for Anomaly Volatility Monitoring
 */
export const watchlist = pgTable('watchlist', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 20 }).notNull().unique(),
  source: varchar('source', { length: 20 }).notNull(), // 'auto' (from gainers) | 'manual' (from user)
  lastPrice: numeric('last_price', { precision: 30, scale: 10 }), // For 1m delta calculation
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * V13: Records of Anomaly Volatility events (>= 5% change in 1m)
 */
export const volatilityAlerts = pgTable('volatility_alerts', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  changePercent: numeric('change_percent', { precision: 10, scale: 2 }).notNull(),
  priceAtAlert: numeric('price_at_alert', { precision: 30, scale: 10 }).notNull(),
  direction: varchar('direction', { length: 10 }).notNull(), // 'up' | 'down'
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});
