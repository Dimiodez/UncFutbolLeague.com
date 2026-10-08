import test from 'node:test';
import assert from 'node:assert/strict';
import { OnlineLeaderboard } from '../game/OnlineLeaderboard.js';

test('shared run queue saves summit checkpoints in order and refreshes after the final save', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const body = options?.body ? JSON.parse(options.body) : null;
    calls.push([url, body]);
    return Response.json(body?.action === 'start' ? { id: 'run' } : body ? { ok: true } : { entries: [] });
  };
  try {
    const status = { textContent: '' };
    const board = new OnlineLeaderboard(status, { replaceChildren() {} });
    board.begin(true);
    for (let level = 1; level <= 10; level++) board.checkpoint(level, { activePlayMs: level * 6000 });
    await board.session;
    assert.deepEqual(calls.slice(1, 11).map(([, body]) => [body.id, body.level]),
      Array.from({ length: 10 }, (_, index) => ['run', index + 1]));
    assert.equal(calls.at(-1)[0], '/api/mountain/leaderboard');
  } finally { globalThis.fetch = original; }
});

test('preview and guest runs do not submit checkpoints; guest errors are readable', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ error: 'Sign in with Discord before starting to save your run.' }, { status: 401 }); };
  try {
    const status = { textContent: '' };
    const board = new OnlineLeaderboard(status, {});
    board.begin(false);
    board.checkpoint(10, {});
    await board.session;
    assert.equal(calls, 0);
    board.begin(true);
    board.checkpoint(1, {});
    await board.session;
    assert.equal(calls, 1);
    assert.match(status.textContent, /Sign in with Discord/);
  } finally { globalThis.fetch = original; }
});
