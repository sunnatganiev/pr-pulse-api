import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { GithubModule } from './github/github.module';
import { HealthModule } from './health/health.module';
import { PrsModule } from './prs/prs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    GithubModule,
    PrsModule,
  ],
})
export class AppModule {}
