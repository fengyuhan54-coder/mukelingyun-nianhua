import { request } from 'node:https';

// Use an isolated connection for model POSTs instead of the framework's fetch pool.
export function requestMulingModel(url: string, init: RequestInit & { signal: AbortSignal }): Promise<Response> {
  return new Promise((resolve, reject) => {
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    const req = request(url, {
      method: init.method || 'POST', headers, signal: init.signal,
      family: 4, agent: false,
    }, res => {
      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(Buffer.from(chunk)));
      res.on('error', reject);
      res.on('end', () => {
        const responseHeaders = new Headers();
        for (const [name, value] of Object.entries(res.headers)) {
          if (value !== undefined) responseHeaders.set(name, Array.isArray(value) ? value.join(', ') : value);
        }
        resolve(new Response(Buffer.concat(chunks), { status: res.statusCode || 502, headers: responseHeaders }));
      });
    });
    req.setTimeout(120_000, () => req.destroy(Object.assign(new Error('模型响应超时'), { code: 'ETIMEDOUT' })));
    req.on('error', reject);
    req.end(typeof init.body === 'string' ? init.body : undefined);
  });
}

function connectionCode(error: unknown): string {
  const value = error as { code?: string; cause?: unknown; errors?: unknown[] } | null;
  if (!value || typeof value !== 'object') return '';
  return value.code || connectionCode(value.cause) || (value.errors || []).map(connectionCode).find(Boolean) || '';
}

export async function fetchMulingModel(
  url: string,
  init: RequestInit & { signal: AbortSignal },
  options: {
    isGeneration: boolean;
    onRetry?: (seconds: number, attempt: number) => void;
    wait: (ms: number, signal: AbortSignal) => Promise<void>;
  },
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    init.signal.throwIfAborted();
    try {
      return await requestMulingModel(url, init);
    } catch (error) {
      if (init.signal.aborted) throw error;
      const code = connectionCode(error);
      console.error('[muling-model-connection]', { code: code || 'NETWORK_ERROR', attempt: attempt + 1 });
      const beforeConnection = ['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'UND_ERR_CONNECT_TIMEOUT'].includes(code);
      const transient = beforeConnection || ['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'UND_ERR_SOCKET', 'UND_ERR_HEADERS_TIMEOUT'].includes(code)
        || (error instanceof TypeError && error.message === 'fetch failed' && !code);
      if (transient && (!options.isGeneration || beforeConnection) && attempt < 2) {
        const delay = (attempt + 1) * 2000;
        options.onRetry?.(delay / 1000, attempt + 1);
        await options.wait(delay, init.signal);
        continue;
      }
      if (/CERT|TLS|SSL/.test(code)) {
        throw new Error('无法建立与模型服务的安全连接，请检查电脑时间、代理或网络证书设置。');
      }
      if (options.isGeneration && !beforeConnection) {
        throw new Error('生图请求连接中断，暂时无法确认模型是否已生成作品。为避免重复计费，未自动重复提交，请稍后确认后重试。');
      }
      throw new Error(transient
        ? `连接模型服务失败，已自动重试 2 次（${code || 'NETWORK_ERROR'}）。请检查当前网络或代理能否访问火山方舟后，再次创作；这不是余额不足的提示。`
        : '无法连接模型服务，请检查网络或代理设置后重试。');
    }
  }
}
