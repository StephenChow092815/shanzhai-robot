const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL);

async function forceSync() {
  console.log('--- Force Syncing Database V13 ---');
  try {
    // 1. Create watchlist
    console.log('Creating "watchlist" table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "watchlist" (
        "id" serial PRIMARY KEY NOT NULL,
        "symbol" varchar(20) NOT NULL UNIQUE,
        "source" varchar(20) NOT NULL,
        "last_price" numeric(30, 10),
        "created_at" timestamp DEFAULT now()
      )
    `;

    // 2. Create volatility_alerts
    console.log('Creating "volatility_alerts" table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "volatility_alerts" (
        "id" serial PRIMARY KEY NOT NULL,
        "symbol" varchar(20) NOT NULL,
        "change_percent" numeric(10, 2) NOT NULL,
        "price_at_alert" numeric(30, 10) NOT NULL,
        "direction" varchar(10) NOT NULL,
        "timestamp" timestamp DEFAULT now() NOT NULL
      )
    `;

    console.log('SUCCESS: V13 Tables Created.');
  } catch (e) {
    console.error('FAILED:', e.message);
  } finally {
    process.exit();
  }
}

forceSync();
