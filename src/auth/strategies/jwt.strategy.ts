import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { DEFAULT_COOKIE_NAME } from '../auth.constants';
import { JwtPayload } from '../types/jwt-payload.type';
import { User } from '../entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET must be set');
    }
    const cookieName = config.get<string>('COOKIE_NAME') ?? DEFAULT_COOKIE_NAME;

    super({
      jwtFromRequest: (req: Request): string | null => {
        const cookies = req.cookies as Record<string, unknown> | undefined;
        const token = cookies ? cookies[cookieName] : undefined;
        return typeof token === 'string' ? token : null;
      },
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.authService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return user;
  }
}
