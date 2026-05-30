import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { GitHubProfile } from '../types/github-profile.type';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    const clientID = config.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = config.get<string>('GITHUB_CLIENT_SECRET');
    const apiUrl = config.get<string>('API_URL') ?? 'http://localhost:3000';
    if (!clientID || !clientSecret) {
      throw new Error('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set');
    }

    super({
      clientID,
      clientSecret,
      callbackURL: `${apiUrl}/auth/github/callback`,
      scope: ['read:user', 'user:email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: Error | null, user?: GitHubProfile) => void,
  ): void {
    const githubId = Number(profile.id);
    if (!Number.isFinite(githubId)) {
      done(new UnauthorizedException('Invalid GitHub profile id'));
      return;
    }

    const emails = profile.emails;
    const photos = profile.photos;
    const email = emails && emails.length > 0 && emails[0] ? (emails[0].value ?? null) : null;
    const avatarUrl = photos && photos.length > 0 && photos[0] ? (photos[0].value ?? '') : '';
    const username = profile.username ?? profile.displayName ?? `gh_${profile.id}`;

    done(null, { githubId, username, email, avatarUrl });
  }
}
