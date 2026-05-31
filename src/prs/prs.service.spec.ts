import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GithubService } from '../github/github.service';
import { GithubPrDto } from '../github/dto/github-pr.dto';
import { PrsService } from './prs.service';
import { PullRequest, PullRequestState } from './entities/pull-request.entity';

interface PrRepoMock {
  create: jest.Mock;
  upsert: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
}

describe('PrsService', () => {
  let service: PrsService;
  let repo: PrRepoMock;
  let github: { listPullRequests: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn((row) => row as PullRequest),
      upsert: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    github = { listPullRequests: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrsService,
        { provide: getRepositoryToken(PullRequest), useValue: repo },
        { provide: GithubService, useValue: github },
      ],
    }).compile();

    service = module.get<PrsService>(PrsService);
  });

  describe('findAll', () => {
    it('passes the provided filters, default paging, and createdAt DESC order to the repository', async () => {
      repo.find.mockResolvedValueOnce([]);

      await service.findAll({ state: PullRequestState.Open, repo: 'acme/api', author: 'octocat' });

      expect(repo.find).toHaveBeenCalledWith({
        where: {
          state: PullRequestState.Open,
          repoFullName: 'acme/api',
          authorUsername: 'octocat',
        },
        order: { createdAt: 'DESC' },
        take: 30,
        skip: 0,
      });
    });

    it('omits absent filters and honours explicit limit/offset', async () => {
      repo.find.mockResolvedValueOnce([]);

      await service.findAll({ limit: 10, offset: 20 });

      expect(repo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        take: 10,
        skip: 20,
      });
    });
  });

  describe('syncFromGithub', () => {
    it('derives merged/open state and upserts on githubId', async () => {
      const prs: GithubPrDto[] = [
        {
          id: 1,
          number: 1,
          title: 'merged pr',
          body: null,
          state: 'closed',
          user: 'octocat',
          headRef: 'feature',
          baseRef: 'main',
          htmlUrl: 'https://github.com/acme/api/pull/1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          mergedAt: '2024-01-02T00:00:00Z',
        },
        {
          id: 2,
          number: 2,
          title: 'open pr',
          body: 'desc',
          state: 'open',
          user: null,
          headRef: 'feature-2',
          baseRef: 'main',
          htmlUrl: 'https://github.com/acme/api/pull/2',
          createdAt: '2024-02-01T00:00:00Z',
          updatedAt: '2024-02-01T00:00:00Z',
          mergedAt: null,
        },
      ];
      github.listPullRequests.mockResolvedValueOnce(prs);
      repo.find.mockResolvedValueOnce([]);

      await service.syncFromGithub('acme/api');

      expect(github.listPullRequests).toHaveBeenCalledWith('acme', 'api');
      const upsertedRows = repo.upsert.mock.calls[0][0] as PullRequest[];
      const upsertOptions = repo.upsert.mock.calls[0][1];
      expect(upsertedRows).toHaveLength(2);
      const [merged, open] = upsertedRows as [PullRequest, PullRequest];
      expect(merged.state).toBe(PullRequestState.Merged);
      expect(open.state).toBe(PullRequestState.Open);
      expect(merged.mergedAt).toBeInstanceOf(Date);
      expect(open.mergedAt).toBeNull();
      expect(upsertOptions).toEqual({ conflictPaths: ['githubId'] });
    });

    it('does not call upsert and returns [] when GitHub has no PRs', async () => {
      github.listPullRequests.mockResolvedValueOnce([]);

      const result = await service.syncFromGithub('acme/api');

      expect(result).toEqual([]);
      expect(repo.upsert).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the pull request does not exist', async () => {
      repo.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
