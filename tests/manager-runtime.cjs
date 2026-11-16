// Run after the manager webpack build. All content is created and removed in /tmp.
// Usage: node tests/manager-runtime.cjs path/to/.next/standalone/server.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

const entry = path.resolve(process.argv[2] || 'my-blog-manager/.next/standalone/server.js');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ezio-manager-runtime-'));
const port = 3481;
let child;
let logs = '';
const request = (route) => new Promise((resolve, reject) => {
  const req = http.get({ hostname: '127.0.0.1', port, path: route, headers: { Host: '127.0.0.1:3401' } }, res => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', chunk => body += chunk);
    res.on('end', () => resolve({ status: res.statusCode, body }));
  });
  req.on('error', reject);
});
const write = (relative, content) => {
  const filename = path.join(root, relative);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, content);
};
const article = (title, body) => `---\ntitle: ${title}\ndate: '2026-11-16'\ntags: [fixture]\n---\n\n${body}\n`;

(async () => {
  assert(fs.existsSync(entry), `Build the manager first: missing ${entry}`);
  for (const directory of ['posts', 'chatters', 'moments', 'app/about']) fs.mkdirSync(path.join(root, directory), { recursive: true });
  write('manager_data/drafts/private.json', JSON.stringify({ title: 'PRIVATE_DRAFT_MUST_NOT_APPEAR' }));
  child = spawn(process.execPath, [entry], {
    cwd: path.dirname(entry),
    env: { ...process.env, HOSTNAME: '127.0.0.1', PORT: String(port), EZIO_CMS_MODE: 'server', XHBLOGS_CONTENT_ROOT: root },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', chunk => logs += chunk);
  child.stderr.on('data', chunk => logs += chunk);
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { ready = (await request('/')).status === 200; } catch {}
    if (ready) break;
    if (child.exitCode !== null) throw new Error(`Manager exited: ${logs}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, `Manager did not become ready: ${logs}`);
  const emptyHome = await request('/');
  assert(!emptyHome.body.includes('欢迎来到我的博客'), 'Must not use release content as a fallback');
  assert(!emptyHome.body.includes('PRIVATE_DRAFT_MUST_NOT_APPEAR'));

  // Publish after startup; these slugs never existed during build or first render.
  write('posts/中文文章.md', article('ChinesePostFixture', '# Chinese post body'));
  write('chatters/中文杂谈.md', article('ChineseChatterFixture', '# Chinese chatter body'));
  write('posts/runtime-new.md', article('RuntimePostFixture', '# Runtime body version one'));
  write('chatters/runtime-chatter.md', article('RuntimeChatterFixture', '# Runtime chatter body'));
  write('moments/runtime-moment.md', "---\nid: runtime-moment\ndate: '2026-11-16T00:00:00Z'\nimages: []\n---\n\nRuntimeMomentFixture\n");
  write('app/about/about.md', article('RuntimeAboutFixture', '# RuntimeAboutBodyFixture'));
  for (const [route, marker] of [
    ['/', 'RuntimePostFixture'], ['/timeline', 'RuntimePostFixture'], ['/posts/runtime-new', 'Runtime body version one'],
    ['/chatter', 'RuntimeChatterFixture'], ['/chatter/runtime-chatter', 'Runtime chatter body'],
    ['/posts/' + encodeURIComponent('中文文章'), 'Chinese post body'], ['/chatter/' + encodeURIComponent('中文杂谈'), 'Chinese chatter body'],
    ['/about', 'RuntimeAboutBodyFixture'], ['/moments', 'RuntimeMomentFixture'], ['/tree', 'RuntimePostFixture'],
  ]) {
    const response = await request(route);
    assert.equal(response.status, 200, route);
    assert(response.body.includes(marker), `${route} must read the persistent root`);
    assert(!response.body.includes('PRIVATE_DRAFT_MUST_NOT_APPEAR'), route);
  }
  write('posts/runtime-new.md', article('RuntimePostFixture', '# Runtime body version two'));
  const updated = await request('/posts/runtime-new');
  assert(updated.body.includes('Runtime body version two'), 'Published updates must bypass stale HTML');
  assert(!updated.body.includes('Runtime body version one'));
  for (const route of ['/posts/missing', '/chatter/missing', '/posts/%252e%252e%252fmanager_data', '/chatter/%2e%2e%2fmanager_data', '/posts/%2525']) assert.equal((await request(route)).status, 404, route);
  const settings = await request('/settings');
  assert.equal(settings.status, 200);
  assert(settings.body.includes('修改后需要重新构建部署'));
  assert(!settings.body.includes('title="待处理操作"'), 'Server mode must hide the local queue');
  console.log('Manager standalone: 10 persistent-content routes, new slugs, live update, 404s, private drafts and server settings passed.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM');
    await new Promise(resolve => { child.once('exit', resolve); setTimeout(resolve, 3000).unref(); });
  }
  fs.rmSync(root, { recursive: true, force: true });
});
