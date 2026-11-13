// Public blog deployment path. Next Link/router apply this themselves.
export const BASE_PATH = '/blog';

/** Prefix root-relative resource URLs and native HTML links exactly once.
 * @param {string} url
 */
export function withBasePath(url) {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//') ||
      url === BASE_PATH || url.startsWith(BASE_PATH + '/') ||
      url.startsWith(BASE_PATH + '?') || url.startsWith(BASE_PATH + '#')) return url;
  return BASE_PATH + url;
}

/** Normalize usePathname values for active navigation and router destinations.
 * @param {string} pathname
 */
export function withoutBasePath(pathname) {
  return pathname === BASE_PATH ? '/' : pathname.startsWith(BASE_PATH + '/') ? pathname.slice(BASE_PATH.length) : pathname;
}
