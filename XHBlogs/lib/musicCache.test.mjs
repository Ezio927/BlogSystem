import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSongCache } from './musicCache.mjs';

test('concurrent page requests share a song lookup and reuse successful metadata', async () => {
  let calls = 0;
  const get = createSongCache(async id => { calls++; return { id, name: 'Song' }; });
  const result = await Promise.all([get('1'), get('1'), get('1')]);
  assert.equal(calls, 1);
  assert.deepEqual(result[0], result[2]);
  await get('1');
  assert.equal(calls, 1);
});

test('successful metadata refreshes after ten minutes', async () => {
  let time = 0, calls = 0;
  const get = createSongCache(async id => ({ id, version: ++calls }), { now: () => time });
  await get('1'); time = 599_999;
  assert.equal((await get('1')).version, 1);
  time = 600_000;
  assert.equal((await get('1')).version, 2);
});

test('upstream failures cool down briefly and can recover', async () => {
  let time = 0, calls = 0;
  const get = createSongCache(async id => ++calls === 1 ? { id, error: 'upstream_unavailable' } : { id, name: 'Recovered' }, { now: () => time });
  await get('1'); time = 29_999;
  assert.equal((await get('1')).error, 'upstream_unavailable');
  assert.equal(calls, 1); time = 30_000;
  assert.equal((await get('1')).name, 'Recovered');
});

test('metadata cache stays bounded as different ids are queried', async () => {
  let calls = 0;
  const get = createSongCache(async id => { calls++; return { id }; }, { limit: 2 });
  await get('1'); await get('2'); await get('3'); await get('3');
  assert.equal(calls, 3);
  await get('1'); assert.equal(calls, 4);
});

test('rejected lookup does not leave a permanently pending entry', async () => {
  let calls = 0;
  const get = createSongCache(async id => { if (++calls === 1) throw Error('network'); return { id }; });
  await assert.rejects(get('1'), /network/);
  assert.deepEqual(await get('1'), { id: '1' });
});
