/**
 * Telling the person when the agent needs them or is done.
 *
 * Version 1 is local: while the app is open or was just put away, a finished
 * task, a question or a failure on the computer becomes a phone
 * notification. Notifications that reach a phone whose app is fully closed
 * need the server to send pushes (Firebase on Android, an Apple key on
 * iPhone), which is the next step in docs/MOBILE.md.
 */

import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { RelayEvent } from './timeline';

const CHANNEL = 'agent';

Notifications.setNotificationHandler({
  // In the app, the screen already shows it; a banner on top would say it twice.
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let ready: Promise<boolean> | undefined;

/** Asks once, after sign-in, rather than at first launch with nothing explained. */
export function enableNotifications(): Promise<boolean> {
  ready ??= (async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Agent',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) {
      return true;
    }
    return (await Notifications.requestPermissionsAsync()).granted;
  })().catch(() => false);
  return ready;
}

function str(body: unknown, name: string): string {
  const value = (body as Record<string, unknown> | null)?.[name];
  return typeof value === 'string' ? value : '';
}

/** What, in a batch from one computer, is worth interrupting somebody for. */
export function worthTelling(computer: string, events: readonly RelayEvent[]): { title: string; body: string } | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind === 'question') {
      return { title: `${computer} is waiting for you`, body: str(e.body, 'text') || 'The agent has a question.' };
    }
    if (e.kind === 'done') {
      const status = str(e.body, 'status');
      const files = (e.body as { files?: unknown[] } | null)?.files?.length ?? 0;
      if (status === 'failed') {
        return { title: `Task failed on ${computer}`, body: str(e.body, 'error') || 'Open CloudeIDE to see why.' };
      }
      if (status === 'completed') {
        return {
          title: `Done on ${computer}`,
          body: files > 0 ? `${files} ${files === 1 ? 'file' : 'files'} changed. Review and keep or undo.` : 'The agent finished.',
        };
      }
    }
  }
  return undefined;
}

export function announce(computer: string, events: readonly RelayEvent[]): void {
  if (AppState.currentState === 'active') {
    return;
  }
  const note = worthTelling(computer, events);
  if (!note) {
    return;
  }
  void enableNotifications().then(ok => {
    if (!ok) {
      return;
    }
    return Notifications.scheduleNotificationAsync({
      content: { title: note.title, body: note.body },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
    });
  }).catch(() => { /* a missed notification is not worth a crash */ });
}
