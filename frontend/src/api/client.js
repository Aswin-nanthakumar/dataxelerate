/**
 * API client — JWT bearer auth with automatic refresh-token rotation.
 * All traffic goes to the same-origin /api/v1 prefix (proxied in dev,
 * rewritten in production deployments).
 */

const BASE = import.meta.env.VITE_API_BASE || '/api/v1';

const ACCESS_KEY = 'uf_access';
const REFRESH_KEY = 'uf_refresh';

export const tokenStore = {
  get access() { return localStorage.getItem(ACCESS_KEY); },
  get refresh() { return localStorage.getItem(REFRESH_KEY); },
  set(access, refresh) {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem('uf_user');
  },
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function tryRefresh() {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) return false;
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;
  const json = await res.json();
  tokenStore.set(json.data.accessToken, json.data.refreshToken);
  return true;
}

export async function api(path, { method = 'GET', body, raw = false, params } = {}) {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const url = `${BASE}${path}${qs}`;
  const headers = { 'Content-Type': 'application/json' };
  if (tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`;

  let res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && tokenStore.refresh) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers.Authorization = `Bearer ${tokenStore.access}`;
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } else {
      tokenStore.clear();
    }
  }

  if (raw) {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(res.status, err.error?.message || res.statusText, err.error?.details);
    }
    return res;
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new ApiError(res.status, json.error?.message || `Request failed (${res.status})`, json.error?.details);
  }
  return json;
}

export const get = (path, params) => api(path, { params });
export const post = (path, body, opts = {}) => api(path, { method: 'POST', body, ...opts });
export const patch = (path, body) => api(path, { method: 'PATCH', body });
