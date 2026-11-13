import { isIP } from 'node:net';
import { COMPANION_PERSONA } from './companionPersona.mjs';

const MAX_BODY_BYTES = 16 * 1024;
const MAX_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_TOTAL_LENGTH = 6000;
const UPSTREAM_URL = 'https://api.deepseek.com/chat/completions';
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

class ChatError extends Error {
  /** @param {number} status @param {string} message @param {number} [retryAfter] */
  constructor(status, message, retryAfter) { super(message); this.status = status; this.retryAfter = retryAfter; }
}

/** @param {unknown} value */
export function readChatMessages(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => key !== 'messages') || !('messages' in value) ||
      !Array.isArray(value.messages) || !value.messages.length || value.messages.length > MAX_MESSAGES) {
    throw new ChatError(400, '请发送1至8条对话消息，再试一次呀。');
  }
  let total = 0;
  const messages = value.messages.map(message => {
    if (!message || typeof message !== 'object' || Array.isArray(message) ||
        Object.keys(message).some(key => !['role', 'content'].includes(key)) ||
        !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string' ||
        !message.content.trim() || message.content.length > MAX_MESSAGE_LENGTH) {
      throw new ChatError(400, '每条消息只能是文字，最多1000字；请缩短后重试。');
    }
    total += message.content.length;
    return { role: message.role, content: message.content.trim() };
  });
  if (total > MAX_TOTAL_LENGTH || messages.at(-1)?.role !== 'user') {
    throw new ChatError(400, '对话总长最多6000字，最后一条需要是你的消息。');
  }
  return messages;
}

/** @param {Request} request */
async function readJson(request) {
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) {
    throw new ChatError(413, '这次消息太长啦，请缩短后再发送。');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ChatError(400, '消息没有送过来，请重新发送。');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let source = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new ChatError(413, '这次消息太长啦，请缩短后再发送。');
      }
      source += decoder.decode(value, { stream: true });
    }
    source += decoder.decode();
    return JSON.parse(source);
  } catch (error) {
    if (error instanceof ChatError) throw error;
    throw new ChatError(400, '消息格式没有读懂，请重新发送。');
  } finally { reader.releaseLock(); }
}

/** @param {Request} request @param {NodeJS.ProcessEnv} env */
function checkSource(request, env) {
  const expected = env.CHAT_ALLOWED_ORIGIN ?? new URL(request.url).origin;
  let url;
  try { url = new URL(expected); } catch { throw new ChatError(503, '小鲸鱼还没准备好，请稍后再来呀。'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new ChatError(503, '小鲸鱼还没准备好，请稍后再来呀。');
  }
  if (request.headers.get('origin') !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new ChatError(403, '请在本站打开小鲸鱼聊天，再发送消息。');
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new ChatError(415, '请使用聊天框发送文字消息。');
  }
}

/** Trusted reverse proxy must overwrite X-Real-IP. All other headers are ignored.
 * @param {Request} request @param {NodeJS.ProcessEnv} env */
function clientKey(request, env) {
  if (env.CHAT_TRUST_PROXY !== '1') return 'shared-local';
  const candidate = request.headers.get('x-real-ip')?.trim() ?? '';
  if (!isIP(candidate)) return 'shared-local';
  return candidate.toLowerCase();
}

/** Process-local limits: rolling windows; no conversation or IP is written to disk.
 * @param {() => number} now */
function createBudget(now) {
  /** @type {Map<string, number[]>} */
  const visitors = new Map();
  /** @type {number[]} */
  let global = [];
  let concurrent = 0;
  /** @param {string} key */
  return function reserve(key) {
    const instant = now();
    global = global.filter(time => time > instant - DAY);
    for (const [visitor, times] of visitors) {
      const recent = times.filter(time => time > instant - HOUR);
      if (recent.length) visitors.set(visitor, recent); else visitors.delete(visitor);
    }
    const times = visitors.get(key) ?? [];
    const minute = times.filter(time => time > instant - MINUTE);
    const wait = (oldest, window) => Math.max(1, Math.ceil((oldest + window - instant) / 1000));
    if (minute.length >= 6) throw new ChatError(429, '聊得有点快啦，稍等一分钟再来找我～', wait(minute[0], MINUTE));
    if (times.length >= 40) throw new ChatError(429, '小鲸鱼需要歇一小会儿，过一阵再聊呀。', wait(times[0], HOUR));
    if (global.length >= 300) throw new ChatError(429, '今天的小鲸鱼额度用完啦，明天再来聊呀。', wait(global[0], DAY));
    if (concurrent >= 3) throw new ChatError(429, '小鲸鱼正在接待朋友，稍等几秒再试呀。', 5);
    visitors.set(key, [...times, instant]);
    global.push(instant);
    concurrent += 1;
    return () => { concurrent -= 1; };
  };
}

/** @param {unknown} data */
function replyText(data) {
  if (!data || typeof data !== 'object' || !('choices' in data) || !Array.isArray(data.choices)) return null;
  const content = data.choices[0]?.message?.content;
  return typeof content === 'string' && content.trim() ? content.trim().slice(0, MAX_MESSAGE_LENGTH) : null;
}

/** Dependency injection keeps tests offline. Production uses the fixed official API.
 * @param {{ env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch; now?: () => number; timeoutMs?: number }} [options] */
export function createChatHandler({ env = process.env, fetchImpl = fetch, now = Date.now, timeoutMs = 30_000 } = {}) {
  const reserve = createBudget(now);
  /** @param {Request} request */
  return async function handleChat(request) {
    try {
      checkSource(request, env);
      const messages = readChatMessages(await readJson(request));
      const key = env.DEEPSEEK_API_KEY?.trim();
      if (!key) throw new ChatError(503, '小鲸鱼还没接好聊天信号，请稍后再来呀。');
      const release = reserve(clientKey(request, env));
      try {
        const signal = AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)]);
        const upstream = await fetchImpl(UPSTREAM_URL, {
          method: 'POST', cache: 'no-store', redirect: 'error', signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: env.DEEPSEEK_MODEL || 'deepseek-flash',
            messages: [{ role: 'system', content: COMPANION_PERSONA }, ...messages],
            thinking: { type: 'disabled' }, stream: false, max_tokens: 400,
          }),
        });
        if (!upstream.ok) {
          // Never read or echo upstream errors: they can contain sensitive details.
          await upstream.body?.cancel().catch(() => undefined);
          throw new ChatError(503, '小鲸鱼的聊天信号暂时不稳，稍后再试一次呀。');
        }
        const reply = replyText(await upstream.json());
        if (!reply) throw new ChatError(502, '小鲸鱼刚才没说清楚，可以再发一次吗？');
        return Response.json({ reply }, { headers: { 'Cache-Control': 'no-store' } });
      } catch (error) {
        if (error instanceof ChatError) throw error;
        if (error && typeof error === 'object' && 'name' in error && ['TimeoutError', 'AbortError'].includes(String(error.name))) {
          throw new ChatError(504, '小鲸鱼这次想得有点久，消息还在输入框里，可以重试呀。');
        }
        throw new ChatError(502, '消息暂时没送到小鲸鱼这里，请稍后重试呀。');
      } finally { release(); }
    } catch (error) {
      const safe = error instanceof ChatError ? error : new ChatError(500, '小鲸鱼暂时走神了，请稍后再试呀。');
      return Response.json({ error: safe.message }, { status: safe.status,
        headers: { 'Cache-Control': 'no-store', ...(safe.retryAfter ? { 'Retry-After': String(safe.retryAfter) } : {}) } });
    }
  };
}
