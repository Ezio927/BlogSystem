/**
 * Cache song metadata, not audio. Share concurrent lookups so page visits do not
 * repeatedly fan out to the external music API. Failures get a short cooldown.
 * @template {{ error?: string }} T
 * @param {(id: string) => Promise<T>} load
 * @param {{ now?: () => number, limit?: number }} options
 */
export function createSongCache(load, { now = Date.now, limit = 100 } = {}) {
  const cached = new Map();
  const pending = new Map();
  return async function getSong(id) {
    const entry = cached.get(id);
    if (entry && entry.expires > now()) return entry.value;
    if (pending.has(id)) return pending.get(id);
    const request = Promise.resolve().then(() => load(id)).then(value => {
      if (!cached.has(id) && cached.size >= limit) cached.delete(cached.keys().next().value);
      cached.set(id, { value, expires: now() + (value.error ? 30_000 : 600_000) });
      return value;
    }).finally(() => pending.delete(id));
    pending.set(id, request);
    return request;
  };
}
