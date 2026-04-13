"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = exports.DATABASE_CONNECTION = void 0;
const common_1 = require("@nestjs/common");
const postgres_js_1 = require("drizzle-orm/postgres-js");
const postgres = require("postgres");
const schema = require("./schema");
const config_1 = require("@nestjs/config");
exports.DATABASE_CONNECTION = 'DATABASE_CONNECTION';
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            {
                provide: exports.DATABASE_CONNECTION,
                useFactory: (configService) => {
                    const connectionString = configService.get('DATABASE_URL');
                    const queryClient = postgres(connectionString);
                    return (0, postgres_js_1.drizzle)(queryClient, { schema });
                },
                inject: [config_1.ConfigService],
            },
        ],
        exports: [exports.DATABASE_CONNECTION],
    })
], DatabaseModule);
//# sourceMappingURL=database.module.js.map