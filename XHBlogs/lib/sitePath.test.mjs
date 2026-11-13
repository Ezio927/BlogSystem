import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BASE_PATH, withBasePath, withoutBasePath } from './sitePath.mjs';

test('prefixes root paths exactly once and leaves external destinations and fragments alone', () => {
  assert.equal(BASE_PATH, '/blog');
  for (const url of ['/api/music?ids=1', '/pets/fish/idle.webm', '/posts/welcome#note', '/', '/blogger']) {
    assert.equal(withBasePath(url), '/blog' + url);
    assert.equal(withBasePath(withBasePath(url)), '/blog' + url);
  }
  for (const url of ['', '#heading', 'relative.png', 'https://example.com/a', '//cdn.example.com/a', 'data:image/png;base64,x', 'mailto:test@example.com', '/blog', '/blog/about', '/blog?tab=one', '/blog#heading']) {
    assert.equal(withBasePath(url), url);
  }
});

test('normalizes either Next pathname form for active links and router queries', () => {
  assert.equal(withoutBasePath('/blog'), '/');
  assert.equal(withoutBasePath('/blog/'), '/');
  assert.equal(withoutBasePath('/blog/about'), '/about');
  assert.equal(withoutBasePath('/about'), '/about');
  assert.equal(withoutBasePath('/blogger'), '/blogger');
});

test('vendored font URLs resolve relative to their prefixed stylesheet', async () => {
  const css = await readFile(new URL('../public/fonts/fonts.css', import.meta.url), 'utf8');
  const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map(match => match[1]);
  assert.ok(urls.length > 100);
  for (const url of urls) assert.ok(new URL(url, 'https://example.com/blog/fonts/fonts.css').pathname.startsWith('/blog/fonts/'));
});
