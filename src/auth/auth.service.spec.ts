import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { GitHubProfile } from './types/github-profile.type';

interface UserRepoMock {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  increment: jest.Mock;
}

describe('AuthService', () => {
  let service: AuthService;
  let repo: UserRepoMock;
  let jwtService: { sign: jest.Mock };

  const baseProfile: GitHubProfile = {
    githubId: 12345,
    username: 'octocat',
    email: 'octo@example.com',
    avatarUrl: 'https://avatars/octo.png',
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      increment: jest.fn(),
    };
    jwtService = { sign: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('findOrCreateUser', () => {
    it('returns the existing user and updates lastLoginAt when one is found', async () => {
      const existing: User = {
        id: 'existing-uuid',
        githubId: baseProfile.githubId,
        username: baseProfile.username,
        email: baseProfile.email,
        avatarUrl: baseProfile.avatarUrl,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        lastLoginAt: null,
        tokenVersion: 0,
      };
      repo.findOne.mockResolvedValueOnce(existing);
      repo.save.mockImplementationOnce(async (u: User) => u);

      const result = await service.findOrCreateUser(baseProfile);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { githubId: baseProfile.githubId },
      });
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('existing-uuid');
      expect(result.lastLoginAt).toBeInstanceOf(Date);
    });

    it('creates a new user when none exists', async () => {
      repo.findOne.mockResolvedValueOnce(null);
      const created = { ...baseProfile, lastLoginAt: expect.any(Date) } as Partial<User>;
      repo.create.mockReturnValueOnce(created as User);
      const saved: User = {
        id: 'new-uuid',
        githubId: baseProfile.githubId,
        username: baseProfile.username,
        email: baseProfile.email,
        avatarUrl: baseProfile.avatarUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
        tokenVersion: 0,
      };
      repo.save.mockResolvedValueOnce(saved);

      const result = await service.findOrCreateUser(baseProfile);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          githubId: baseProfile.githubId,
          username: baseProfile.username,
          email: baseProfile.email,
          avatarUrl: baseProfile.avatarUrl,
        }),
      );
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(saved);
    });

    it('stores email as null when GitHub profile has no email', async () => {
      const noEmailProfile: GitHubProfile = { ...baseProfile, email: null };
      repo.findOne.mockResolvedValueOnce(null);
      repo.create.mockImplementationOnce((u) => u as User);
      repo.save.mockImplementationOnce(async (u: User) => ({ ...u, id: 'x' }));

      await service.findOrCreateUser(noEmailProfile);

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ email: null }));
    });
  });

  describe('generateJwt', () => {
    it('signs a payload with sub, githubId and tokenVersion, returning the token verbatim', () => {
      const user: User = {
        id: 'user-uuid',
        githubId: 99,
        username: 'octo',
        email: null,
        avatarUrl: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        tokenVersion: 3,
      };
      jwtService.sign.mockReturnValueOnce('signed.jwt.token');

      const token = service.generateJwt(user);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-uuid',
        githubId: 99,
        tokenVersion: 3,
      });
      expect(token).toBe('signed.jwt.token');
    });
  });

  describe('invalidateAllSessions', () => {
    it('atomically increments tokenVersion for the given user via Repository.increment', async () => {
      repo.increment.mockResolvedValueOnce({ affected: 1 });

      await service.invalidateAllSessions('user-uuid');

      expect(repo.increment).toHaveBeenCalledTimes(1);
      expect(repo.increment).toHaveBeenCalledWith({ id: 'user-uuid' }, 'tokenVersion', 1);
    });

    it('resolves to void on success', async () => {
      repo.increment.mockResolvedValueOnce({ affected: 1 });

      const result = await service.invalidateAllSessions('user-uuid');

      expect(result).toBeUndefined();
    });
  });
});
