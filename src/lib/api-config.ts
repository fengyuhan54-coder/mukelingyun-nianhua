import { cookies } from 'next/headers';

// Each browser supplies its own credential. Never fall back to server files or environment tokens.
const TOKEN_COOKIE = 'muling_ark_token';

export function loadConfig(): { apiToken?: string } {
  const apiToken = cookies().get(TOKEN_COOKIE)?.value;
  return apiToken ? { apiToken } : {};
}

export function saveConfig(config: { apiToken?: string }, secure = false) {
  const token = config.apiToken?.trim() || '';
  if (!token) {
    cookies().delete(TOKEN_COOKIE);
    return;
  }
  cookies().set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: '/',
    // Session cookie: no persistent server-side credential file.
  });
}

export function getApiToken(): string | undefined {
  return loadConfig().apiToken;
}
