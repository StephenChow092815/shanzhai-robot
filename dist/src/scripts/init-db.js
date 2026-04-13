"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const postgres = require('postgres');
const dotenv = require('dotenv');
const { readFileSync, readdirSync } = require('fs');
const { join } = require('path');
dotenv.config();
async function initDb() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ DATABASE_URL not found in .env');
        process.exit(1);
    }
    console.log('🚀 Connecting to database...');
    const sql = postgres(connectionString);
    try {
        const migrationDir = join(process.cwd(), 'drizzle');
        const files = readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();
        const latestMigration = files[files.length - 1];
        console.log(`📂 Using migration: ${latestMigration}`);
        const migrationPath = join(migrationDir, latestMigration);
        const migrationSql = readFileSync(migrationPath, 'utf-8');
        const statements = migrationSql.split('--> statement-breakpoint');
        console.log('🧹 Force refreshing top_gainers_logs...');
        await sql.unsafe('DROP TABLE IF EXISTS "top_gainers_logs" CASCADE');
        for (const statement of statements) {
            if (!statement.trim())
                continue;
            try {
                await sql.unsafe(statement);
                console.log(`✅ Executed: ${statement.trim().split('\n')[0].substring(0, 50)}...`);
            }
            catch (err) {
                if (err.code === '42P07') {
                    console.log(`ℹ️  Skipped (Already exists): ${statement.trim().split('\n')[0].substring(0, 50)}...`);
                }
                else {
                    console.error(`⚠️  Warning executing statement: ${err.message}`);
                }
            }
        }
        console.log('🚀 Database sync completed successfully!');
    }
    catch (error) {
        console.error('❌ Error initializing database:', error);
    }
    finally {
        await sql.end();
    }
}
initDb();
//# sourceMappingURL=init-db.js.map