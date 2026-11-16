import path from 'node:path';

// Resolve at request time: application releases never own server content.
export function contentRoot() {
  return path.resolve(process.env.XHBLOGS_CONTENT_ROOT || process.cwd());
}
