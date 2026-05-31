import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { GITHUB_TOKEN_ENV, OCTOKIT } from './github.constants';
import { GithubService } from './github.service';

@Module({
  imports: [ConfigModule],
  providers: [
    GithubService,
    {
      provide: OCTOKIT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Octokit => {
        const token = config.get<string>(GITHUB_TOKEN_ENV);
        if (!token) {
          throw new Error(`${GITHUB_TOKEN_ENV} must be set`);
        }
        return new Octokit({ auth: token });
      },
    },
  ],
  exports: [GithubService],
})
export class GithubModule {}
