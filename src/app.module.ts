import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ScheduleModule } from '@nestjs/schedule';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { ResearchModule } from './agents/research/research.module';
import { AdminModule } from './admin/admin.module';
import { DatabaseModule } from './database/database.module';
import { MarketModule } from './services/market.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    MarketModule,
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'client', 'dist'),
    }),
    InfrastructureModule,
    ResearchModule,
    AdminModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
