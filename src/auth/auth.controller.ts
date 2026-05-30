import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MeResponseDto } from './dto/me-response.dto';
import { DEFAULT_COOKIE_NAME, buildClearCookieOptions, buildCookieOptions } from './auth.constants';
import { User } from './entities/user.entity';
import { GitHubProfile } from './types/github-profile.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly cookieName: string;
  private readonly isProd: boolean;
  private readonly webUrl: string;

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {
    this.cookieName = this.config.get<string>('COOKIE_NAME') ?? DEFAULT_COOKIE_NAME;
    this.isProd = this.config.get<string>('NODE_ENV') === 'production';
    this.webUrl = this.config.get<string>('WEB_URL') ?? 'http://localhost:5173';
  }

  @Get('github')
  @UseGuards(GithubAuthGuard)
  @ApiOperation({ summary: 'Redirects the user to GitHub for OAuth' })
  githubLogin(): void {
    // Passport handles the redirect; this method body is intentionally empty.
  }

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  @ApiOperation({ summary: 'GitHub OAuth callback — sets cookie and redirects to web' })
  async githubCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const profile = req.user as GitHubProfile | undefined;
    if (!profile) {
      res.redirect(`${this.webUrl}/?error=oauth_failed`);
      return;
    }

    const user = await this.authService.findOrCreateUser(profile);
    const token = this.authService.generateJwt(user);
    res.cookie(this.cookieName, token, buildCookieOptions(this.isProd));
    res.redirect(`${this.webUrl}/`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: MeResponseDto })
  @ApiOperation({ summary: 'Returns the currently authenticated user' })
  me(@Req() req: Request): MeResponseDto {
    const user = req.user as User;
    return MeResponseDto.fromUser(user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clears the auth cookie' })
  logout(@Res() res: Response): void {
    res.clearCookie(this.cookieName, buildClearCookieOptions(this.isProd));
    res.status(HttpStatus.NO_CONTENT).end();
  }

  @Post('logout/all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revokes all sessions across every device' })
  async logoutAll(@Req() req: Request, @Res() res: Response): Promise<void> {
    const user = req.user as User;
    await this.authService.invalidateAllSessions(user.id);
    res.clearCookie(this.cookieName, buildClearCookieOptions(this.isProd));
    res.status(HttpStatus.NO_CONTENT).end();
  }
}
