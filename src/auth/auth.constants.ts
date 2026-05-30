import type { CookieOptions } from 'express';

export const DEFAULT_COOKIE_NAME = 'prpulse_jwt';
export const DEFAULT_JWT_EXPIRES_IN = '7d';
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const buildCookieOptions = (isProd: boolean): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  maxAge: SEVEN_DAYS_MS,
  path: '/',
});

export const buildClearCookieOptions = (isProd: boolean): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  path: '/',
});
