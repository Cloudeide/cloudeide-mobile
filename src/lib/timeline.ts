/**
 * What the computer said, turned into what the screen shows.
 *
 * The desktop app sends small messages while it works on a task (see
 * cloudeideRemoteControl.ts in the desktop repository): the task it started,
 * each tool as it starts, the reply as it is written, a question when a tool
 * waits for Allow, and `done` with the changed files. This file folds them, in
 * order, into a list of cards. No React and no network, so it is tested on its
 * own (test/timeline.test.ts).
 */

export interface RelayEvent {
  readonly id: number;
  readonly kind: string;
  readonly body: unknown;
  readonly at: string;
}

export interface ChangedFile {
  readonly path: string;
  readonly added: number;
  readonly removed: number;
}

export type Item =
  | { readonly type: 'task'; readonly key: string; readonly text: string; readonly at: string }
  | { readonly type: 'step'; readonly key: string; readonly text: string }
  | { readonly type: 'reply'; readonly key: string; readonly text: string }
  | {
    readonly type: 'question'; readonly key: string; readonly ref: string; readonly text: string;
    readonly detail: string; readonly options: readonly string[]; readonly open: boolean;
  }
  | {
    readonly type: 'done'; readonly key: string; readonly status: string;
    readonly error?: string; readonly files: readonly ChangedFile[];
    /** kept | undone, once somebody chose. */
    readonly outcome?: string;
  }
  | { readonly type: 'notice'; readonly key: string; readonly text: string; readonly tone: 'muted' | 'error' };

export interface Timeline {
  readonly items: readonly Item[];
  /** The last event folded in; the next read asks for what came after it. */
  readonly after: number;
  /** A task is running on the computer: Stop is offered and Send waits. */
  readonly running: boolean;
}

export const EMPTY: Timeline = { items: [], after: 0, running: false };

function str(body: unknown, name: string): string {
  const value = (body as Record<string, unknown> | null)?.[name];
  return typeof value === 'string' ? value : '';
}

function files(body: unknown): ChangedFile[] {
  const list = (body as { files?: unknown } | null)?.files;
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object' && typeof (f as { path?: unknown }).path === 'string')
    .map(f => ({
      path: f.path as string,
      added: typeof f.added === 'number' ? f.added : 0,
      removed: typeof f.removed === 'number' ? f.removed : 0,
    }));
}

/** The reply card of the task now running, if it has one. */
function currentReply(items: Item[]): number {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (item.type === 'task' || item.type === 'done') {
      return -1;
    }
    if (item.type === 'reply') {
      return i;
    }
  }
  return -1;
}

export function fold(timeline: Timeline, events: readonly RelayEvent[]): Timeline {
  const items = [...timeline.items];
  let { after, running } = timeline;

  for (const event of events) {
    if (event.id <= after) {
      continue;
    }
    after = event.id;
    const key = String(event.id);
    const body = event.body;

    switch (event.kind) {
      case 'task.started':
        items.push({ type: 'task', key, text: str(body, 'text'), at: event.at });
        running = true;
        break;

      case 'step': {
        const text = str(body, 'text');
        if (text) {
          items.push({ type: 'step', key, text });
        }
        break;
      }

      // The whole reply so far, every few seconds: replace, do not append.
      case 'text': {
        const text = str(body, 'text');
        const at = currentReply(items);
        if (at >= 0) {
          items[at] = { ...items[at], text } as Item;
        } else if (text) {
          items.push({ type: 'reply', key, text });
        }
        break;
      }

      case 'question': {
        const options = (body as { options?: unknown } | null)?.options;
        items.push({
          type: 'question', key, ref: str(body, 'ref'), text: str(body, 'text'), detail: str(body, 'detail'),
          options: Array.isArray(options) ? options.filter((o): o is string => typeof o === 'string') : [],
          open: true,
        });
        break;
      }

      case 'question.settled': {
        const ref = str(body, 'ref');
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type === 'question' && item.ref === ref) {
            items[i] = { ...item, open: false };
          }
        }
        break;
      }

      case 'done': {
        const text = str(body, 'text');
        const at = currentReply(items);
        if (at >= 0) {
          items[at] = { ...items[at], text: text || (items[at] as { text: string }).text } as Item;
        } else if (text) {
          items.push({ type: 'reply', key: `${key}-reply`, text });
        }
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type === 'question' && item.open) {
            items[i] = { ...item, open: false };
          }
        }
        const error = str(body, 'error');
        items.push({ type: 'done', key, status: str(body, 'status') || 'completed', error: error || undefined, files: files(body) });
        running = false;
        break;
      }

      case 'changes.settled': {
        const outcome = str(body, 'outcome');
        for (let i = items.length - 1; i >= 0; i--) {
          const item = items[i];
          if (item.type === 'done' && item.files.length > 0 && !item.outcome) {
            items[i] = { ...item, outcome };
            break;
          }
        }
        break;
      }

      case 'busy':
      case 'error': {
        const text = str(body, 'message');
        if (text) {
          items.push({ type: 'notice', key, text, tone: event.kind === 'error' ? 'error' : 'muted' });
        }
        break;
      }
    }
  }

  return { items, after, running };
}

/** The latest finished task that changed files and is still waiting for Keep or Undo. */
export function pendingReview(timeline: Timeline): Extract<Item, { type: 'done' }> | undefined {
  for (let i = timeline.items.length - 1; i >= 0; i--) {
    const item = timeline.items[i];
    if (item.type === 'done') {
      return item.files.length > 0 && !item.outcome ? item : undefined;
    }
  }
  return undefined;
}
