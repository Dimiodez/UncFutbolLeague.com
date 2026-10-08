import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { ensureMountain, validateCheckpoint } from '../functions/_lib/mountain.js';
import { sha256 } from '../functions/_lib/auth.js';
import { onRequestPost } from '../functions/api/mountain/run.js';
import { onRequestGet } from '../functions/api/mountain/leaderboard.js';

function adapter(db) {
  return {
    prepare(sql) { return { args: [], bind(...args) { this.args = args; return this; },
      async first() { return db.prepare(sql).get(...this.args) || null; },
      async all() { return { results: db.prepare(sql).all(...this.args) }; },
      async run() { return { meta: { changes: db.prepare(sql).run(...this.args).changes } }; },
    }; },
    async batch(statements) {
      db.exec('BEGIN');
      try { const output = []; for (const s of statements) output.push(await s.run()); db.exec('COMMIT'); return output; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
}
const totals = (activePlayMs = 60000, totalDeaths = 3) => ({ activePlayMs, totalDeaths,
  ballsTakenToFace: 2, salmonStrikes: 4, bruceSockKnocks: 1, bizzieInterruptions: 2 });

async function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_auth.sql', import.meta.url), 'utf8'));
  const env = { DB: adapter(db) };
  await ensureMountain(env);
  for (const id of ['one', 'two']) {
    db.prepare('INSERT INTO users(discord_id,username,display_name) VALUES (?,?,?)').run(id, id, id);
    db.prepare("INSERT INTO sessions(id_hash,discord_id,expires_at) VALUES (?,?,datetime('now','+1 day'))").run(await sha256(id), id);
  }
  const send = (body, user = 'one', origin = 'https://example.test') => onRequestPost({ env,
    request: new Request('https://example.test/api/mountain/run', { method: 'POST',
      headers: { origin, cookie: '__Host-ufl_session=' + user }, body: JSON.stringify(body) }),
  });
  const start = async (user = 'one') => {
    const response = await send({ action: 'start' }, user);
    assert.equal(response.status, 200);
    const { id } = await response.json();
    db.prepare('UPDATE mountain_runs SET started_at=started_at-1000 WHERE id=?').run(id);
    return id;
  };
  const complete = async (stats, user = 'one') => {
    const id = await start(user);
    for (let level = 1; level <= 10; level++) {
      const response = await send({ action: 'checkpoint', id, level,
        stats: { ...stats, activePlayMs: stats.activePlayMs * level / 10 } }, user);
      assert.equal(response.status, 200, await response.text());
    }
    return id;
  };
  const board = async () => (await (await onRequestGet({ env })).json()).entries;
  return { db, env, send, start, complete, board };
}

test('Mountain checkpoints reject skipped levels, impossible time, decreasing totals, and fake counters', () => {
  const run = { level: 1, stats: JSON.stringify(totals(6000)), started_at: 0 };
  const body = { level: 2, stats: totals(12000) };
  assert.deepEqual(validateCheckpoint(body, run, 20), body.stats);
  for (const invalid of [
    { ...body, level: 10 }, { ...body, stats: totals(7000) },
    { ...body, stats: totals(50000) }, { ...body, stats: totals(12000, 1) },
    { ...body, stats: { ...body.stats, salmonStrikes: -1 } },
    { ...body, stats: { ...body.stats, bruceSockKnocks: 1.2 } },
  ]) assert.throws(() => validateCheckpoint(invalid, run, 20));
});

test('Mountain saves require authenticated ordered full campaigns and cannot be replayed or stolen', async () => {
  const { db, send, start, complete, board } = await fixture();
  try {
    assert.equal((await send({ action: 'start' }, 'bad')).status, 401);
    assert.equal((await send({ action: 'start' }, 'one', 'https://other.test')).status, 403);
    assert.equal((await send(null)).status, 400);
    const id = await start();
    const body = { action: 'checkpoint', id, level: 1, stats: totals(6000) };
    assert.equal((await send(body, 'two')).status, 409);
    assert.equal((await send({ ...body, level: 10 })).status, 400);
    assert.equal((await send(body)).status, 200);
    assert.equal((await send(body)).status, 400);
    assert.equal((await board()).length, 0, 'partial runs are not ranked');
    const completedId = await complete(totals());
    assert.equal((await send({ ...body, id: completedId, level: 10 })).status, 409);
    assert.deepEqual((await board())[0], { displayName: 'one', ...totals() });
    db.prepare("UPDATE users SET status='suspended' WHERE discord_id='one'").run();
    assert.equal((await board()).length, 0);
  } finally { db.close(); }
});

test('Mountain bests rank time first, deaths second, and retain incident counters from that run', async () => {
  const { db, complete, board } = await fixture();
  try {
    await complete(totals(60000, 6));
    await complete(totals(70000, 2));
    assert.equal((await board())[0].activePlayMs, 60000, 'slower runs never replace a best');
    await complete(totals(60000, 3));
    await complete(totals(60000, 4), 'two');
    const entries = await board();
    assert.deepEqual(entries.map(entry => [entry.displayName, entry.totalDeaths]), [['one', 3], ['two', 4]]);
    assert.equal(entries[0].salmonStrikes, 4);
  } finally { db.close(); }
});

test('Mountain handles missing database gracefully', async () => {
  assert.equal((await onRequestGet({ env: {} })).status, 503);
  assert.equal((await onRequestPost({ env: {}, request: new Request('https://example.test') })).status, 503);
});
