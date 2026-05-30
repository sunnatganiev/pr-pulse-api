import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { User } from '../entities/user.entity';
import { JwtPayload } from '../types/jwt-payload.type';
import { JwtStrategy } from './jwt.strategy';

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-uuid',
  githubId: 12345,
  username: 'octocat',
  email: 'octo@example.com',
  avatarUrl: 'https://avatars/octo.png',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  lastLoginAt: null,
  tokenVersion: 0,
  ...overrides,
});

describe('JwtStrategy.validate', () => {
  let strategy: JwtStrategy;
  let authService: { findById: jest.Mock };

  beforeEach(async () => {
    authService = { findById: jest.fn() };

    const configValues: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      COOKIE_NAME: 'prpulse_jwt',
    };
    const config = {
      get: jest.fn((key: string) => configValues[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: config },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('returns the user when payload.tokenVersion matches the stored value', async () => {
    const user = makeUser({ tokenVersion: 2 });
    authService.findById.mockResolvedValueOnce(user);
    const payload: JwtPayload = { sub: user.id, githubId: user.githubId, tokenVersion: 2 };

    const result = await strategy.validate(payload);

    expect(result).toBe(user);
    expect(authService.findById).toHaveBeenCalledWith(user.id);
  });

  it('throws UnauthorizedException when the user no longer exists', async () => {
    authService.findById.mockResolvedValueOnce(null);
    const payload: JwtPayload = { sub: 'missing', githubId: 1, tokenVersion: 0 };

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when payload.tokenVersion is stale', async () => {
    const user = makeUser({ tokenVersion: 5 });
    authService.findById.mockResolvedValueOnce(user);
    const payload: JwtPayload = { sub: user.id, githubId: user.githubId, tokenVersion: 4 };

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('treats payload.tokenVersion=undefined as 0 (backward-compat for pre-migration tokens)', async () => {
    const user = makeUser({ tokenVersion: 0 });
    authService.findById.mockResolvedValueOnce(user);
    const payload: JwtPayload = { sub: user.id, githubId: user.githubId };

    const result = await strategy.validate(payload);

    expect(result).toBe(user);
  });

  it('rejects undefined payload tokenVersion when stored tokenVersion is non-zero', async () => {
    const user = makeUser({ tokenVersion: 1 });
    authService.findById.mockResolvedValueOnce(user);
    const payload: JwtPayload = { sub: user.id, githubId: user.githubId };

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
