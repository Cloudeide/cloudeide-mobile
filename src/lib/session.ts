/**
 * One computer's conversation, kept while any screen shows it.
 *
 * The chat and the review screen read the same timeline, so it lives here and
 * not in either: a loop asks the server for what the computer said since the
 * last message (waiting up to 25 s when there is nothing), folds it in, and
 * tells whichever screens are listening.
 */

import { useEffect, useSyncExternalStore } from 'react';
import { ApiError, events, send as sendToComputer } from './api';
import { announce } from './notify';
import { phoneId } from './phone';
import { EMPTY, fold, type Timeline } from './timeline';

export interface SessionState {
  readonly timeline: Timeline;
  /** Something went wrong reaching the server; the loop keeps trying. */
  readonly problem?: string;
  /** The computer has not allowed this phone (or no longer does). */
  readonly notAllowed: boolean;
  /** The first read has come back, so an empty timeline really is empty. */
  readonly loaded: boolean;
}

const START: SessionState = { timeline: EMPTY, notAllowed: false, loaded: false };

class ComputerSession {
  state: SessionState = START;
  private readonly listeners = new Set<() => void>();
  private abort: AbortController | undefined;
  private users = 0;

  constructor(readonly publicId: string, readonly name: string) { }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private set(patch: Partial<SessionState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(l => l());
  }

  retain() {
    this.users++;
    // A loop is running unless there is none or the last one was told to stop.
    if (!this.abort || this.abort.signal.aborted) {
      const abort = new AbortController();
      this.abort = abort;
      void this.run(abort).finally(() => {
        if (this.abort === abort) {
          this.abort = undefined;
        }
      });
    }
  }

  release() {
    this.users = Math.max(0, this.users - 1);
    if (this.users === 0) {
      this.abort?.abort();
    }
  }

  private async run(abort: AbortController) {
    const me = await phoneId();
    let retry = 2_000;
    while (!abort.signal.aborted) {
      try {
        // The first read does not wait: the history should appear at once.
        const batch = await events(this.publicId, me, this.state.timeline.after, abort.signal, this.state.loaded);
        if (abort.signal.aborted) {
          return;
        }
        const timeline = fold(this.state.timeline, batch);
        if (this.state.loaded) {
          announce(this.name, batch);
        }
        this.set({ timeline, problem: undefined, notAllowed: false, loaded: true });
        retry = 2_000;
      } catch (err) {
        if (abort.signal.aborted) {
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          this.set({ notAllowed: true, loaded: true });
          return;
        }
        this.set({ problem: err instanceof Error ? err.message : String(err), loaded: true });
        await new Promise(resolve => setTimeout(resolve, retry));
        retry = Math.min(retry * 2, 30_000);
      }
    }
  }

  async send(kind: string, body: unknown): Promise<void> {
    await sendToComputer(this.publicId, await phoneId(), kind, body);
  }
}

const sessions = new Map<string, ComputerSession>();

export function sessionFor(publicId: string, name = 'Computer'): ComputerSession {
  let session = sessions.get(publicId);
  if (!session) {
    session = new ComputerSession(publicId, name);
    sessions.set(publicId, session);
  }
  return session;
}

/** Signing out forgets every conversation on this phone. */
export function forgetSessions() {
  sessions.clear();
}

export function useComputerSession(publicId: string, name?: string) {
  const session = sessionFor(publicId, name);
  useEffect(() => {
    session.retain();
    return () => session.release();
  }, [session]);
  const state = useSyncExternalStore(session.subscribe, () => session.state);
  return { ...state, send: (kind: string, body: unknown) => session.send(kind, body) };
}
