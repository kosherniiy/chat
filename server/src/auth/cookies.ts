import type { CookieOptions, Response } from 'express';
import { AUTH_COOKIE_NAME } from '../config';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(AUTH_COOKIE_NAME, token, cookieOptions);
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
};

export const parseCookieHeader = (header: string | undefined): Record<string, string> => {
  if (!header) {
    return {};
  }

  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.split('=');
    const key = rawKey?.trim();
    if (!key) {
      return acc;
    }
    acc[key] = decodeURIComponent(rest.join('=').trim());
    return acc;
  }, {});
};

export const getAuthTokenFromCookieHeader = (header: string | undefined): string | null => {
  const cookies = parseCookieHeader(header);
  const token = cookies[AUTH_COOKIE_NAME]?.trim();
  return token ? token : null;
};
