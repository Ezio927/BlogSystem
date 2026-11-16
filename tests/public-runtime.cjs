// Run after the reader build. All fixtures are temporary; user content is untouched.
// Usage: node tests/public-runtime.cjs [path/to/XHBlogs/.next/standalone/server.js]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const entry = path.resolve(process.argv[2] || 'XHBlogs/.next/standalone/server.js');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ezio-public-runtime-'));
const port = 3483;
let child;
let logs = '';
const request = (resource = '/blog/tree') => new Promise((resolve, reject) => {
  const req = http.get({ hostname: '127.0.0.1', port, path: resource }, res => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', chunk => body += chunk);
    res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
  });
  req.on('error', reject);
});
const write = (relative, content) => fs.writeFileSync(path.join(root, relative), content);
const article = (title, body, draft = false) => `---\ntitle: ${title}\ndate: '2026-11-16'\ndraft: ${draft}\n---\n\n${body}\n`;
(async () => {
  assert(fs.existsSync(entry), `Build the reader first: missing ${entry}`);
  for (const collection of ['posts', 'chatters', 'moments']) fs.mkdirSync(path.join(root, collection));
  child = spawn(process.execPath, [entry], {
    cwd: path.dirname(entry),
    env: { ...process.env, HOSTNAME: '127.0.0.1', PORT: String(port), XHBLOGS_CONTENT_ROOT: root },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', chunk => logs += chunk);
  child.stderr.on('data', chunk => logs += chunk);
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { ready = (await request()).status === 200; } catch {}
    if (ready) break;
    if (child.exitCode !== null) throw new Error(`Reader exited: ${logs}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, `Reader did not become ready: ${logs}`);
  write('posts/runtime-post.md', article('PublicRuntimePost', 'Public post version one'));
  write('chatters/中文杂谈.md', article('PublicRuntimeChatter', 'Public chatter body'));
  write('moments/runtime-moment.md', article('PublicRuntimeMoment', 'Public moment body'));
  write('posts/private.md', article('PRIVATE_POST_MARKER', 'private post', true));
  write('chatters/private.md', article('PRIVATE_CHATTER_MARKER', 'private chatter', '"true"'));
  write('moments/private.md', article('PRIVATE_MOMENT_MARKER', 'private moment', true));
  write('outside.md', article('SYMLINK_SECRET_MARKER', 'secret symlink target'));
  for (const collection of ['posts', 'chatters', 'moments']) fs.symlinkSync(path.join(root, 'outside.md'), path.join(root, collection, 'link.md'));
  const first = await request();
  assert.equal(first.status, 200);
  for (const marker of ['PublicRuntimePost', 'Public post version one', 'PublicRuntimeChatter', 'PublicRuntimeMoment']) assert(first.body.includes(marker), marker);
  for (const marker of ['PRIVATE_POST_MARKER', 'PRIVATE_CHATTER_MARKER', 'PRIVATE_MOMENT_MARKER', 'SYMLINK_SECRET_MARKER']) assert(!first.body.includes(marker), marker);
  write('posts/runtime-post.md', article('PublicRuntimePostUpdated', 'Public post version two'));
  const updated = await request();
  assert(updated.body.includes('PublicRuntimePostUpdated'));
  assert(updated.body.includes('Public post version two'));
  assert(!updated.body.includes('Public post version one'));
  fs.mkdirSync(path.join(root, 'media'));
  const mediaName = 'a'.repeat(32) + '.png';
  write('media/' + mediaName, 'runtime image bytes');
  const image = await request('/blog/media/' + mediaName);
  assert.equal(image.status, 200);
  assert.equal(image.body, 'runtime image bytes');
  assert.equal(image.headers['content-type'], 'image/png');
  assert.equal(image.headers['x-content-type-options'], 'nosniff');
  assert(image.headers['cache-control'].includes('immutable'));
  fs.symlinkSync(path.join(root, 'outside.md'), path.join(root, 'media', 'b'.repeat(32) + '.jpg'));
  assert.equal((await request('/blog/media/' + 'b'.repeat(32) + '.jpg')).status, 404);
  assert.equal((await request('/blog/media/outside.md')).status, 404);
  assert.equal((await request('/blog/media/' + 'c'.repeat(32) + '.png')).status, 404);
  fs.renameSync(path.join(root, 'media'), path.join(root, 'original-media'));
  fs.symlinkSync(path.join(root, 'original-media'), path.join(root, 'media'));
  assert.equal((await request('/blog/media/' + mediaName)).status, 404);
  console.log('Runtime images: immediate visibility, correct headers, missing files and symlinks passed.');
  console.log('Public standalone /blog/tree: content after startup, live update, private drafts and symlink filtering passed.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM');
    await new Promise(resolve => { child.once('exit', resolve); setTimeout(resolve, 3000).unref(); });
  }
  fs.rmSync(root, { recursive: true, force: true });
});
