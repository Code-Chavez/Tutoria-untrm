import type { Account } from './accounts';

const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api';

export async function apiLogin(account: Account): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
  if (!res.ok) throw new Error(`login ${account.email}: ${res.status}`);
  const body = (await res.json()) as { data?: { accessToken: string }; accessToken?: string };
  return (body.data?.accessToken ?? body.accessToken) as string;
}

export async function api<T = unknown>(token: string, method: string, path: string, body?: unknown): Promise<{ status: number; body: T }> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as T };
}

/** Llamada sin sesión (p. ej. activar una cuenta con el enlace de la invitación). */
export async function apiPublic<T = unknown>(method: string, path: string, body?: unknown): Promise<{ status: number; body: T }> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as T };
}

/** Texto único por ejecución para que las pruebas no dependan de datos de corridas anteriores. */
export function unique(label: string): string {
  return `${label} E2E ${Date.now().toString(36)}`;
}
