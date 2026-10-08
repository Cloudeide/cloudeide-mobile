import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY, fold, pendingReview, type RelayEvent } from '../src/lib/timeline.ts';

let id = 0;
const ev = (kind: string, body: unknown): RelayEvent => ({ id: ++id, kind, body, at: '2026-10-10T10:00:00Z' });

test('a task, its steps, the reply as it grows, and the end', () => {
  const t = fold(EMPTY, [
    ev('task.started', { text: 'Add an FAQ' }),
    ev('step', { text: 'Reading index.html' }),
    ev('text', { text: 'I will add' }),
    ev('text', { text: 'I will add a section.' }),
    ev('done', { status: 'completed', text: 'Added the FAQ.', files: [{ path: 'index.html', added: 40, removed: 2 }] }),
  ]);
  assert.deepEqual(t.items.map(i => i.type), ['task', 'step', 'reply', 'done']);
  const reply = t.items[2];
  assert.equal(reply.type === 'reply' && reply.text, 'Added the FAQ.');
  assert.equal(t.running, false);
  assert.equal(pendingReview(t)?.files[0].path, 'index.html');
});

test('the same event twice is folded once', () => {
  const step = ev('step', { text: 'Searching' });
  const once = fold(EMPTY, [step]);
  assert.equal(fold(once, [step]).items.length, 1);
});

test('a question closes when it is answered, and Keep settles the review', () => {
  let t = fold(EMPTY, [
    ev('task.started', { text: 'Run the tests' }),
    ev('question', { ref: 'call-1', text: 'Run npm test?', options: ['Allow', 'Skip'] }),
  ]);
  assert.equal(t.running, true);
  const q = t.items[1];
  assert.ok(q.type === 'question' && q.open && q.options.length === 2);

  t = fold(t, [ev('question.settled', { ref: 'call-1' })]);
  assert.ok(t.items[1].type === 'question' && !t.items[1].open);

  t = fold(t, [ev('done', { status: 'completed', files: [{ path: 'a.ts', added: 1, removed: 0 }] })]);
  t = fold(t, [ev('changes.settled', { outcome: 'kept', count: 1 })]);
  assert.equal(pendingReview(t), undefined);
});

test('a new task starts a new reply rather than overwriting the last one', () => {
  const t = fold(EMPTY, [
    ev('task.started', { text: 'One' }), ev('text', { text: 'first' }), ev('done', { status: 'completed' }),
    ev('task.started', { text: 'Two' }), ev('text', { text: 'second' }),
  ]);
  const replies = t.items.filter(i => i.type === 'reply').map(i => (i as { text: string }).text);
  assert.deepEqual(replies, ['first', 'second']);
});

test('busy and errors become notices; junk is ignored', () => {
  const t = fold(EMPTY, [
    ev('busy', { message: 'Already working' }),
    ev('error', { message: 'No folder is open' }),
    ev('hologram', { text: 'hi' }),
    ev('step', null),
  ]);
  assert.deepEqual(t.items.map(i => i.type === 'notice' && i.tone), ['muted', 'error']);
});
