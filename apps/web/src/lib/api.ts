const API_BASE = import.meta.env.VITE_API_URL ?? '';

let csrfToken: string | null = null;

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function initCsrf(retries = 8): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/csrf`, { credentials: 'include' });
      if (!res.ok) throw new Error(`CSRF request failed: ${res.status}`);
      const data = await res.json();
      csrfToken = data.csrfToken;
      return getCsrfToken()!;
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        await sleep(500 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return readCsrfCookie() ?? csrfToken;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!getCsrfToken() && options.method && options.method !== 'GET') {
    await initCsrf();
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getCsrfToken();
  if (token && options.method && !['GET', 'HEAD'].includes(options.method)) {
    headers['X-CSRF-Token'] = token;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export { API_BASE };
