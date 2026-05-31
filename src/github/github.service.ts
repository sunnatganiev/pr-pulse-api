import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { DEFAULT_PER_PAGE, OCTOKIT, REPO_AFFILIATION } from './github.constants';
import { GithubRepoDto } from './dto/github-repo.dto';
import { GithubPrDto } from './dto/github-pr.dto';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(@Inject(OCTOKIT) private readonly octokit: Octokit) {}

  async getViewerLogin(): Promise<string> {
    try {
      const { data } = await this.octokit.rest.users.getAuthenticated();
      return data.login;
    } catch (err) {
      this.mapGithubError(err);
    }
  }

  async listRepos(): Promise<GithubRepoDto[]> {
    try {
      const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
        per_page: DEFAULT_PER_PAGE,
        affiliation: REPO_AFFILIATION,
      });
      return data.map((repo) => GithubRepoDto.fromOctokit(repo));
    } catch (err) {
      this.mapGithubError(err);
    }
  }

  async listPullRequests(owner: string, repo: string): Promise<GithubPrDto[]> {
    try {
      const { data } = await this.octokit.rest.pulls.list({
        owner,
        repo,
        state: 'all',
        per_page: DEFAULT_PER_PAGE,
      });
      return data.map((pr) => GithubPrDto.fromOctokit(pr));
    } catch (err) {
      this.mapGithubError(err);
    }
  }

  private mapGithubError(err: unknown): never {
    const status = this.extractStatus(err);
    switch (status) {
      case 401:
        throw new UnauthorizedException('GitHub token is invalid or expired');
      case 403:
        this.logger.warn('GitHub API returned 403 — rate limit reached or access forbidden');
        throw new ServiceUnavailableException('GitHub API rate limit reached');
      case 404:
        throw new NotFoundException('GitHub resource not found');
      default:
        this.logger.error(`Unexpected GitHub API error (status=${status ?? 'unknown'})`);
        throw new BadGatewayException('GitHub API request failed');
    }
  }

  private extractStatus(err: unknown): number | undefined {
    if (typeof err === 'object' && err !== null && 'status' in err) {
      const status = (err as { status: unknown }).status;
      return typeof status === 'number' ? status : undefined;
    }
    return undefined;
  }
}
