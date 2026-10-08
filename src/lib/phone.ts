/**
 * Who this phone is, to the computers it connects to.
 *
 * A random id made once and kept, and a name a person recognises in the
 * "Connect … to this computer?" box ("Pixel 8", "iPhone"). Neither is a
 * secret: what lets the phone send work is the computer's Allow, which the
 * server keeps against this id.
 */

import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';

const PHONE_ID_KEY = 'cloudeide.phoneId';

let cached: string | undefined;

export async function phoneId(): Promise<string> {
  if (cached) {
    return cached;
  }
  let id = await SecureStore.getItemAsync(PHONE_ID_KEY);
  if (!id) {
    id = Crypto.randomUUID().replace(/-/g, '');
    await SecureStore.setItemAsync(PHONE_ID_KEY, id);
  }
  cached = id;
  return id;
}

export function phoneName(): string {
  return (Device.modelName ?? Device.deviceName ?? 'Phone').slice(0, 60);
}
