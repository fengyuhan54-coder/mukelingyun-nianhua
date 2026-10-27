import { getApiToken, loadConfig } from './api-config';

export function resolveApiToken(provided?: unknown): string | undefined {
  if (typeof provided === 'string' && provided.startsWith('ark-')) return provided;
  return getApiToken() || (loadConfig() as { token?: string }).token;
}
