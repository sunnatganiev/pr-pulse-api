import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { GitHubProfile } from './types/github-profile.type';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async findOrCreateUser(profile: GitHubProfile): Promise<User> {
    const existing = await this.userRepo.findOne({
      where: { githubId: profile.githubId },
    });

    if (existing) {
      existing.username = profile.username;
      existing.email = profile.email;
      existing.avatarUrl = profile.avatarUrl;
      existing.lastLoginAt = new Date();
      return this.userRepo.save(existing);
    }

    const draft = this.userRepo.create({
      githubId: profile.githubId,
      username: profile.username,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      lastLoginAt: new Date(),
    });
    const saved = await this.userRepo.save(draft);
    this.logger.log(`Created new user ${saved.id} (githubId=${saved.githubId})`);
    return saved;
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  generateJwt(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      githubId: user.githubId,
      tokenVersion: user.tokenVersion,
    };
    return this.jwtService.sign(payload);
  }

  async invalidateAllSessions(userId: string): Promise<void> {
    await this.userRepo.increment({ id: userId }, 'tokenVersion', 1);
    this.logger.log(`Invalidated all sessions for user ${userId}`);
  }
}
