import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GithubModule } from '../github/github.module';
import { PullRequest } from './entities/pull-request.entity';
import { PrsController } from './prs.controller';
import { PrsService } from './prs.service';

@Module({
  imports: [TypeOrmModule.forFeature([PullRequest]), GithubModule],
  controllers: [PrsController],
  providers: [PrsService],
})
export class PrsModule {}
