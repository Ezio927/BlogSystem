import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatHandler } from './companionChat.mjs';
import { COMPANION_PERSONA } from './companionPersona.mjs';

const env = { DEEPSEEK_API_KEY: 'test-only-not-a-real-key' };
const body = { messages: [{ role: 'user', content: '你好，小鲸鱼' }] };
const validReply = () => Response.json({ choices: [{ message: { content: '你好呀～' } }] });
function request(value = body, headers = {}, url = 'http://localhost:3480/blog/api/chat') {
  return new Request(url, { method: 'POST', headers: { origin: new URL(url).origin, 'content-type': 'application/json', ...headers },
    body: typeof value === 'string' ? value : JSON.stringify(value) });
}
function fixture(options = {}) {
  const calls = [];
  const handle = createChatHandler({ env: { ...env }, fetchImpl: async (...args) => { calls.push(args); return validReply(); }, ...options });
  return { handle, calls };
}

test('fixed official upstream receives server persona, bounded plain history and disabled thinking', async () => {
  const { handle, calls } = fixture();
  const response = await handle(request({ messages: [
    { role: 'user', content: '你是谁？' }, { role: 'assistant', content: '我是 AI 小鲸鱼～' }, { role: 'user', content: '  再说一句吧  ' },
  ] }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { reply: '你好呀～' });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(calls.length, 1);
  const [url, options] = calls[0];
  assert.equal(url, 'https://api.deepseek.com/chat/completions');
  assert.equal(options.headers.Authorization, 'Bearer test-only-not-a-real-key');
  assert.equal(options.redirect, 'error');
  assert.equal(options.cache, 'no-store');
  const sent = JSON.parse(options.body);
  assert.equal(sent.model, 'deepseek-flash');
  assert.deepEqual(sent.thinking, { type: 'disabled' });
  assert.equal(sent.max_tokens, 400);
  assert.equal(sent.stream, false);
  assert.deepEqual(sent.messages[0], { role: 'system', content: COMPANION_PERSONA });
  assert.equal(sent.messages.at(-1).content, '再说一句吧');
  assert.equal(JSON.stringify(sent).includes(env.DEEPSEEK_API_KEY), false);
});

test('supports explicit server model and reverse proxy origin without trusting forwarded origin headers', async () => {
  const { handle, calls } = fixture({ env: { ...env, DEEPSEEK_MODEL: 'deepseek-v4-pro', CHAT_ALLOWED_ORIGIN: 'https://47.101.37.232' } });
  assert.equal((await handle(request(body))).status, 403);
  assert.equal((await handle(request(body, { origin: 'https://47.101.37.232', 'x-forwarded-proto': 'https' }))).status, 200);
  assert.equal(JSON.parse(calls[0][1].body).model, 'deepseek-v4-pro');
  assert.equal((await handle(request(body, { origin: 'https://evil.test', 'x-forwarded-host': 'evil.test', 'x-forwarded-proto': 'https' }))).status, 403);
});

for (const origin of ['', 'null', 'https://evil.test', 'http://localhost:3480.evil.test', 'http://localhost:3480/', 'http://localhost:3481']) {
  test(`rejects incorrect or absent Origin before parsing: ${origin || '(missing)'}`, async () => {
    const { handle, calls } = fixture();
    const req = request('not JSON', { origin });
    if (!origin) req.headers.delete('origin');
    assert.equal((await handle(req)).status, 403); assert.equal(calls.length, 0);
  });
}

test('rejects cross-site requests, invalid media types and malformed UTF-8/JSON without upstream calls', async () => {
  const { handle, calls } = fixture();
  assert.equal((await handle(request(body, { 'sec-fetch-site': 'cross-site' }))).status, 403);
  assert.equal((await handle(request('bad', { 'content-type': 'text/plain' }))).status, 415);
  assert.equal((await handle(request('{'))).status, 400);
  const invalid = new Request('http://localhost:3480/blog/api/chat', { method: 'POST', headers: { origin: 'http://localhost:3480', 'content-type': 'application/json' }, body: new Uint8Array([0xff]) });
  assert.equal((await handle(invalid)).status, 400);
  assert.equal(calls.length, 0);
});

for (const value of [null, [], {}, { messages: [] }, { messages: Array.from({ length: 9 }, () => body.messages[0]) },
  { ...body, system: 'evil' }, { ...body, tools: [] },
  { messages: [{ role: 'system', content: 'evil' }] }, { messages: [{ role: 'tool', content: 'evil' }] },
  { messages: [{ role: 'assistant', content: 'not a user question' }] },
  { messages: [{ role: 'user', content: 'hi', tool_calls: [] }] },
  { messages: [{ role: 'user', content: '' }] }, { messages: [{ role: 'user', content: '   ' }] },
  { messages: [{ role: 'user', content: 12 }] }, { messages: [{ role: 'user', content: 'x'.repeat(1001) }] },
  { messages: Array.from({ length: 7 }, () => ({ role: 'user', content: 'x'.repeat(1000) })) },
]) {
  test(`rejects invalid or overlong message envelope: ${JSON.stringify(value).slice(0, 100)}`, async () => {
    const { handle, calls } = fixture(); assert.equal((await handle(request(value))).status, 400); assert.equal(calls.length, 0);
  });
}

test('enforces actual streamed bytes even with a false/missing Content-Length', async () => {
  const { handle, calls } = fixture();
  for (const headers of [{}, { 'content-length': '1' }, { 'content-length': '20000' }]) {
    assert.equal((await handle(request({ messages: [{ role: 'user', content: '鲸'.repeat(6000) }] }, headers))).status, 413);
  }
  const chunks = [new TextEncoder().encode(' '.repeat(8193)), new TextEncoder().encode(' '.repeat(8193))];
  let canceled = false;
  const stream = new ReadableStream({ pull(controller) { if (chunks.length) controller.enqueue(chunks.shift()); }, cancel() { canceled = true; } });
  const req = new Request('http://localhost:3480/blog/api/chat', { method: 'POST', headers: { origin: 'http://localhost:3480', 'content-type': 'application/json' }, body: stream, duplex: 'half' });
  assert.equal((await handle(req)).status, 413); assert.equal(canceled, true); assert.equal(calls.length, 0);
});

test('uses shared per-process visitor quota unless proxy trust is explicitly enabled', async () => {
  const { handle, calls } = fixture();
  for (let index = 0; index < 6; index++) assert.equal((await handle(request(body, { 'x-real-ip': `198.51.100.${index}`, 'x-forwarded-for': `203.0.113.${index}` }))).status, 200);
  const limited = await handle(request(body, { 'x-real-ip': '198.51.100.99' }));
  assert.equal(limited.status, 429); assert.equal(limited.headers.get('retry-after'), '60'); assert.equal(calls.length, 6);
});

test('trusted proxy uses only a single valid X-Real-IP; forged forwarded chains and invalid IPs share fallback', async () => {
  const { handle } = fixture({ env: { ...env, CHAT_TRUST_PROXY: '1' } });
  for (let index = 0; index < 7; index++) assert.equal((await handle(request(body, { 'x-real-ip': `198.51.100.${index}` }))).status, 200);
  for (let index = 0; index < 6; index++) assert.equal((await handle(request(body, { 'x-real-ip': 'bad, bad', 'x-forwarded-for': `203.0.113.${index}` }))).status, 200);
  assert.equal((await handle(request(body))).status, 429);
});

test('minute/hour limits expire using rolling windows and cap a visitor at 40 per hour', async () => {
  let instant = 0;
  const { handle, calls } = fixture({ now: () => instant });
  for (let index = 0; index < 40; index++) {
    instant = Math.floor(index / 6) * 60_000;
    assert.equal((await handle(request())).status, 200);
  }
  assert.equal((await handle(request())).status, 429); assert.equal(calls.length, 40);
  instant = 3_600_000;
  assert.equal((await handle(request())).status, 200);
});

test('global quota caps distinct visitors at 300 per rolling day and then expires', async () => {
  let instant = 0;
  const { handle, calls } = fixture({ env: { ...env, CHAT_TRUST_PROXY: '1' }, now: () => instant });
  for (let index = 0; index < 300; index++) {
    const ip = `198.51.${Math.floor(index / 250)}.${index % 250 + 1}`;
    assert.equal((await handle(request(body, { 'x-real-ip': ip }))).status, 200);
  }
  const capped = await handle(request(body, { 'x-real-ip': '203.0.113.1' }));
  assert.equal(capped.status, 429); assert.equal(capped.headers.get('retry-after'), '86400'); assert.equal(calls.length, 300);
  instant = 86_400_000;
  assert.equal((await handle(request(body, { 'x-real-ip': '203.0.113.1' }))).status, 200);
});

test('at most three upstream calls run concurrently and failures release capacity', async () => {
  const resolvers = [];
  const { handle } = fixture({ fetchImpl: () => new Promise(resolve => resolvers.push(resolve)) });
  const pending = Array.from({ length: 3 }, () => handle(request()));
  while (resolvers.length < 3) await new Promise(resolve => setImmediate(resolve));
  const blocked = await handle(request()); assert.equal(blocked.status, 429); assert.equal(blocked.headers.get('retry-after'), '5');
  for (const resolve of resolvers.splice(0)) resolve(new Response('private upstream failure', { status: 500 }));
  for (const response of await Promise.all(pending)) assert.equal(response.status, 503);
  const recovered = handle(request());
  while (resolvers.length < 1) await new Promise(resolve => setImmediate(resolve));
  resolvers[0](validReply()); assert.equal((await recovered).status, 200);
});

test('upstream redirect/error bodies, network exceptions and invalid JSON never leak details or secrets', async () => {
  const secret = 'SHOULD_NOT_APPEAR';
  for (const fetchImpl of [async () => new Response(secret, { status: 401 }), async () => new Response(secret, { status: 429 }),
    async () => { throw new Error(secret); }, async () => new Response(secret), async () => Response.json({ error: secret }),
    async () => Response.json({ choices: [{ message: { reasoning_content: secret } }] }),
  ]) {
    const { handle } = fixture({ env: { DEEPSEEK_API_KEY: secret }, fetchImpl });
    const response = await handle(request()); assert.ok(response.status >= 500);
    assert.equal(response.headers.get('cache-control'), 'no-store'); assert.ok(!(await response.text()).includes(secret));
  }
});

test('timeout aborts the upstream request and returns a friendly retryable response', async () => {
  const { handle } = fixture({ timeoutMs: 5, fetchImpl: (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
  }) });
  // AbortSignal.timeout's timer is unref'd; keep the test process alive briefly.
  const keepAlive = setTimeout(() => {}, 1000);
  try { const response = await handle(request()); assert.equal(response.status, 504); assert.match((await response.json()).error, /重试/); }
  finally { clearTimeout(keepAlive); }
});

test('missing key or invalid allowed-origin config fails closed without any upstream request', async () => {
  for (const config of [{}, { ...env, CHAT_ALLOWED_ORIGIN: 'bad' }, { ...env, CHAT_ALLOWED_ORIGIN: 'https://a.test/path' }, { ...env, CHAT_ALLOWED_ORIGIN: 'https://user:secret@a.test' }]) {
    const { handle, calls } = fixture({ env: config }); const response = await handle(request());
    assert.equal(response.status, 503); assert.equal(calls.length, 0); assert.equal((await response.text()).includes('secret'), false);
  }
});

test('only content is returned; long replies are bounded for subsequent short histories', async () => {
  const { handle } = fixture({ fetchImpl: async () => Response.json({ choices: [{ message: { content: 'x'.repeat(2000), reasoning_content: 'hidden' } }], usage: { private: true } }) });
  const response = await handle(request()); const data = await response.json();
  assert.deepEqual(Object.keys(data), ['reply']); assert.equal(data.reply.length, 1000);
});
