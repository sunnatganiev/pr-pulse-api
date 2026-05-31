import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GithubService } from '../github/github.service';
import { GithubPrDto } from '../github/dto/github-pr.dto';
import { PullRequest, PullRequestState } from './entities/pull-request.entity';
import { PrFilterDto } from './dto/pr-filter.dto';

@Injectable()
export class PrsService {
  private readonly logger = new Logger(PrsService.name);

  constructor(
    @InjectRepository(PullRequest) private readonly prRepo: Repository<PullRequest>,
    private readonly githubService: GithubService,
  ) {}

  async syncFromGithub(repoFullName: string): Promise<PullRequest[]> {
    const [owner, repo] = repoFullName.split('/');
    if (!owner || !repo) {
      throw new BadRequestException('repoFullName must be in "owner/repo" format');
    }

    const prs = await this.githubService.listPullRequests(owner, repo);
    if (prs.length === 0) {
      this.logger.log(`No pull requests to sync for ${repoFullName}`);
      return [];
    }

    const rows = prs.map((pr) => this.toEntity(pr, repoFullName));
    await this.prRepo.upsert(rows, { conflictPaths: ['githubId'] });
    this.logger.log(`Synced ${rows.length} pull requests for ${repoFullName}`);

    const githubIds = rows.map((row) => row.githubId);
    return this.prRepo.find({
      where: { githubId: In(githubIds) },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(filter: PrFilterDto): Promise<PullRequest[]> {
    return this.prRepo.find({
      where: {
        ...(filter.state ? { state: filter.state } : {}),
        ...(filter.repo ? { repoFullName: filter.repo } : {}),
        ...(filter.author ? { authorUsername: filter.author } : {}),
      },
      order: { createdAt: 'DESC' },
      take: filter.limit ?? 30,
      skip: filter.offset ?? 0,
    });
  }

  async findOne(id: string): Promise<PullRequest> {
    const pr = await this.prRepo.findOne({ where: { id } });
    if (!pr) {
      throw new NotFoundException(`Pull request ${id} not found`);
    }
    return pr;
  }

  private toEntity(pr: GithubPrDto, repoFullName: string): PullRequest {
    return this.prRepo.create({
      githubId: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: this.deriveState(pr),
      authorUsername: pr.user,
      repoFullName,
      htmlUrl: pr.htmlUrl,
      createdAt: new Date(pr.createdAt),
      updatedAt: new Date(pr.updatedAt),
      mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null,
      lastSyncedAt: new Date(),
    });
  }

  private deriveState(pr: GithubPrDto): PullRequestState {
    if (pr.mergedAt) {
      return PullRequestState.Merged;
    }
    return pr.state === 'open' ? PullRequestState.Open : PullRequestState.Closed;
  }
}
