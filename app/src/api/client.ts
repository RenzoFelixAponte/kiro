import { mockRequest } from './mock';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

const TOKEN_KEY = 'qa_access_token';
const REFRESH_KEY = 'qa_refresh_token';

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/**
 * Único punto de salida hacia el backend.
 * - Con VITE_USE_MOCK=true responde con datos simulados (misma forma que el contrato).
 * - Con VITE_USE_MOCK=false hace fetch real con el token Bearer.
 */
export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  if (USE_MOCK) {
    return mockRequest<T>(method, path, body);
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // Token vencido: intenta renovar una vez
  if (res.status === 401 && localStorage.getItem(REFRESH_KEY) && path !== '/auth/refresh') {
    const ok = await tryRefresh();
    if (ok) {
      headers.Authorization = `Bearer ${getToken()}`;
      res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    }
  }

  if (!res.ok) {
    let code = 'http_error';
    let message = `Error ${res.status}`;
    try {
      const data = await res.json();
      code = data?.error?.code ?? code;
      message = data?.error?.message ?? message;
    } catch {
      /* respuesta sin JSON */
    }
    throw new ApiError(code, message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: localStorage.getItem(REFRESH_KEY) }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.access_token, data.refresh_token ?? localStorage.getItem(REFRESH_KEY));
    return true;
  } catch {
    return false;
  }
}

/** Sube la imagen al bucket con la URL firmada que entrega el backend. */
export async function uploadFile(uploadUrl: string, file: File): Promise<void> {
  if (USE_MOCK) return;
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'image/jpeg' },
    body: file,
  });
  if (!res.ok) throw new ApiError('upload_failed', 'No se pudo subir la foto', res.status);
}
