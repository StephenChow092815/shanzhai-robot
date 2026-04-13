"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const drizzle_kit_1 = require("drizzle-kit");
exports.default = (0, drizzle_kit_1.defineConfig)({
    dialect: 'postgresql',
    schema: './src/database/schema.ts',
    out: './drizzle',
    dbCredentials: {
        url: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/shanzhai_db',
    },
    verbose: true,
    strict: true,
});
//# sourceMappingURL=drizzle.config.js.map