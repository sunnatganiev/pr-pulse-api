import { Test, TestingModule } from '@nestjs/testing';
import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { GithubService } from './github.service';
import { OCTOKIT } from './github.constants';

interface OctokitMock {
  rest: {
    users: { getAuthenticated: jest.Mock };
    repos: { listForAuthenticatedUser: jest.Mock };
    pulls: { list: jest.Mock };
  };
}

describe('GithubService', () => {
  let service: GithubService;
  let octokit: OctokitMock;

  beforeEach(async () => {
    octokit = {
      rest: {
        users: { getAuthenticated: jest.fn() },
        repos: { listForAuthenticatedUser: jest.fn() },
        pulls: { list: jest.fn() },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GithubService, { provide: OCTOKIT, useValue: octokit }],
    }).compile();

    service = module.get<GithubService>(GithubService);
  });

  describe('listRepos', () => {
    it('maps the Octokit response to GithubRepoDto, dropping extraneous fields', async () => {
      octokit.rest.repos.listForAuthenticatedUser.mockResolvedValueOnce({
        data: [
          {
            id: 1,
            name: 'pr-pulse-api',
            full_name: 'acme/pr-pulse-api',
            private: true,
            default_branch: 'main',
            description: 'should not leak into the DTO',
            owner: { login: 'acme' },
          },
        ],
      });

      const result = await service.listRepos();

      expect(octokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        per_page: 30,
        affiliation: 'owner,collaborator',
      });
      expect(result).toEqual([
        {
          id: 1,
          name: 'pr-pulse-api',
          fullName: 'acme/pr-pulse-api',
          private: true,
          defaultBranch: 'main',
        },
      ]);
    });
  });

  describe('getViewerLogin', () => {
    it('returns the authenticated user login from the mocked Octokit', async () => {
      octokit.rest.users.getAuthenticated.mockResolvedValueOnce({
        data: { login: 'octocat', id: 12345 },
      });

      const result = await service.getViewerLogin();

      expect(octokit.rest.users.getAuthenticated).toHaveBeenCalledTimes(1);
      expect(result).toBe('octocat');
    });
  });

  describe('error mapping', () => {
    it('maps a GitHub 403 to ServiceUnavailableException and logs a warning', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      octokit.rest.repos.listForAuthenticatedUser.mockRejectedValueOnce({
        status: 403,
        message: 'API rate limit exceeded',
      });

      await expect(service.listRepos()).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(warnSpy).toHaveBeenCalledTimes(1);

      warnSpy.mockRestore();
    });
  });
});
