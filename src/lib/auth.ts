/**
 * Signing in, without typing a password into this app.
 *
 * The same exchange the desktop app uses: this app makes a secret
 * (`verifier`), sends only its SHA-256 (`challenge`) to the sign-in page in
 * the browser, the person signs in there with Google, GitHub or email, and
 * the page sends back a one-time code to `cloudeidemobile://auth`. The code is
 * worth nothing without the verifier, which never leaves this app except in
 * the HTTPS request that trades both for a token.
 */

import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { exchangeCode, SERVER_URL } from './api';

export const REDIRECT = 'cloudeidemobile://auth';

function base64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

export type SignInResult = { ok: true; email: string } | { ok: false; cancelled: boolean; message?: string };

export async function signIn(): Promise<SignInResult> {
  const verifier = base64Url(bytesToBase64(Crypto.getRandomBytes(32)));
  const challenge = base64Url(await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 }));

  const url = `${SERVER_URL}/editor-auth?challenge=${encodeURIComponent(challenge)}&label=${encodeURIComponent('Phone app')}&app=mobile`;
  const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT);
  if (result.type !== 'success') {
    return { ok: false, cancelled: true };
  }

  const code = /[?&]code=([^&#]+)/.exec(result.url)?.[1];
  if (!code) {
    return { ok: false, cancelled: false, message: 'The sign-in page did not send a code back. Try again.' };
  }
  try {
    const { email } = await exchangeCode(decodeURIComponent(code), verifier);
    return { ok: true, email };
  } catch (err) {
    return { ok: false, cancelled: false, message: err instanceof Error ? err.message : String(err) };
  }
}
