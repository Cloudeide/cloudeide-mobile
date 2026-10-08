/**
 * The CloudeIDE server, as the phone needs it.
 *
 * Two kinds of call: sign-in (`/api/auth/editor/exchange`, the same exchange
 * the desktop app uses) and Remote Control (`/api/remote/*`, which the server
 * documents in docs/MOBILE.md §5). The token is kept in the phone's secure
 * storage (Keychain on iOS, Keystore on Android), never in plain storage.
 */

import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import type { RelayEvent } from './timeline';

const TOKEN_KEY = 'cloudeide.token';

/** api.cloudeide.com unless app.json says otherwise (`extra.serverUrl`), e.g. for a test server. */
export const SERVER_URL: string = (
  (Constants.expoConfig?.extra as { serverUrl?: string } | undefined)?.serverUrl ?? 'https://api.cloudeide.com'
).replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

let cachedToken: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cachedToken === undefined) {
    cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  }
  return cachedToken;
}

export async function setToken(token: string): Promise<void> {
  cachedToken = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function signOut(): Promise<void> {
  cachedToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function call<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const token = await getToken();
  if (!token) {
    throw new ApiError('Not signed in.', 401);
  }
  let response: Response;
  try {
    response = await fetch(`${SERVER_URL}/api${path}`, {
      ...init,
      signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') {
      throw err;
    }
    throw new ApiError('Could not reach CloudeIDE. Check the connection.', 0);
  }
  let body: unknown = undefined;
  try {
    body = await response.json();
  } catch {
    // Not JSON; the status says enough.
  }
  if (!response.ok) {
    const message = (body as { error?: unknown } | undefined)?.error;
    throw new ApiError(typeof message === 'string' ? message : `Request failed (${response.status}).`, response.status);
  }
  return body as T;
}

/** Trades the code from the browser, plus the secret only this app holds, for a token. */
export async function exchangeCode(code: string, verifier: string): Promise<{ email: string }> {
  let response: Response;
  try {
    response = await fetch(`${SERVER_URL}/api/auth/editor/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, verifier }),
    });
  } catch {
    throw new ApiError('Could not reach CloudeIDE. Check the connection.', 0);
  }
  const body = await response.json().catch(() => ({})) as { token?: string; user?: { email?: string }; error?: string };
  if (!response.ok || !body.token) {
    throw new ApiError(body.error ?? `Sign-in failed (${response.status}).`, response.status);
  }
  await setToken(body.token);
  return { email: body.user?.email ?? '' };
}

// ── Remote Control ───────────────────────────────────────────────────────────

export interface Computer {
  readonly publicId: string;
  readonly name: string;
  readonly platform: string;
  readonly workspace: string | null;
  readonly online: boolean;
  readonly lastSeenAt: string;
}

export interface Pairing {
  readonly id: number;
  readonly code: string;
  readonly status: 'pending' | 'approved' | 'denied' | 'expired';
  readonly expiresAt: string;
}

const enc = encodeURIComponent;

export async function listComputers(): Promise<Computer[]> {
  return (await call<{ computers: Computer[] }>('/remote/computers')).computers;
}

export function requestPairing(publicId: string, phoneId: string, phoneName: string): Promise<Pairing> {
  return call(`/remote/computers/${enc(publicId)}/pair`, { method: 'POST', body: JSON.stringify({ phoneId, phoneName }) });
}

export function pairingStatus(id: number): Promise<Pairing> {
  return call(`/remote/pairings/${id}`);
}

export async function send(publicId: string, phoneId: string, kind: string, body: unknown): Promise<void> {
  await call(`/remote/computers/${enc(publicId)}/send`, { method: 'POST', body: JSON.stringify({ phoneId, kind, body }) });
}

/** Waits on the server for up to 25 s when there is nothing new. */
export async function events(publicId: string, phoneId: string, after: number, signal?: AbortSignal, wait = true): Promise<RelayEvent[]> {
  const query = `phoneId=${enc(phoneId)}&after=${after}${wait ? '' : '&wait=0'}`;
  return (await call<{ messages: RelayEvent[] }>(`/remote/computers/${enc(publicId)}/events?${query}`, {}, signal)).messages;
}
