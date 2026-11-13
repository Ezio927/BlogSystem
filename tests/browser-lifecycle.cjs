// Run in an idle worktree with installed XHBlogs dependencies. Uses its own loopback dev server;
// creates one temporary fixture route and removes it even when assertions fail.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/blogsystem-browser/node_modules/playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const project = path.join(root, 'XHBlogs');
const fixture = path.join(project, 'app/lifecycle-check');
const port = Number(process.env.LIFECYCLE_PORT || 3413);
const origin = `http://127.0.0.1:${port}`;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const { BASE_PATH } = await import(require('node:url').pathToFileURL(path.join(project, 'lib/sitePath.mjs')).href);
  const base = origin + BASE_PATH;
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid LIFECYCLE_PORT');
  const next = path.join(project, 'node_modules/next/dist/bin/next');
  if (!fs.existsSync(next)) throw new Error('Install XHBlogs dependencies before running this test.');
  if (fs.existsSync(fixture)) throw new Error(`Refusing to overwrite existing fixture: ${fixture}`);
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  });
  const agents = path.join(project, 'AGENTS.md');
  const priorAgents = fs.existsSync(agents) ? fs.readFileSync(agents) : null;
  fs.mkdirSync(fixture);
  fs.copyFileSync(path.join(__dirname, 'fixtures/lifecycle-page.tsx'), path.join(fixture, 'page.tsx'));
  const server = spawn(process.execPath, [next, 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: project, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe']
  });
  let logs = '';
  for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { logs = (logs + chunk).slice(-16000); });
  let browser;
  try {
    const deadline = Date.now() + 45000;
    while (true) {
      if (server.exitCode !== null) throw new Error(`Dev server exited: ${logs}`);
      try {
        const response = await fetch(`${base}/lifecycle-check`, { signal: AbortSignal.timeout(1500) });
        if (response.status === 200) break;
      } catch { /* Wait for the isolated dev server to compile the fixture. */ }
      if (Date.now() > deadline) throw new Error(`Dev server did not become ready: ${logs}`);
      await delay(200);
    }
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || '/home/ezio/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell' });
    const assert = require('node:assert/strict');
    const result = { musicRequests: [], errors: [] };
    const watch = page => {
      page.on('pageerror', error => result.errors.push(String(error)));
      page.on('request', request => {
        if (/\/api\/music|music\.163\.com|meting\//.test(request.url())) result.musicRequests.push(request.url());
      });
    };
    const page = await browser.newPage();
    watch(page);
    await page.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));
    await page.goto(`${base}/lifecycle-check`);
    await page.locator('#fixture').waitFor({ state: 'visible' });
    assert.equal(await page.locator('audio').count(), 0);
    await page.close();

    const blocked = await browser.newPage();
    watch(blocked);
    await blocked.addInitScript(() => {
      Storage.prototype.getItem = function () { throw new DOMException('Storage blocked for lifecycle check', 'SecurityError'); };
      Storage.prototype.setItem = function () { throw new DOMException('Storage blocked for lifecycle check', 'SecurityError'); };
    });
    await blocked.goto(`${base}/lifecycle-check`);
    await blocked.locator('#fixture').waitFor({ state: 'visible' });
    const before = await blocked.evaluate(() => document.documentElement.classList.contains('dark'));
    await blocked.locator('#theme').click();
    await blocked.waitForFunction(previous => document.documentElement.classList.contains('dark') !== previous, before);
    assert.equal(await blocked.evaluate(() => document.documentElement.classList.contains('splash-seen')), true);
    assert.deepEqual(result.musicRequests, []);
    assert.deepEqual(result.errors, []);
    result.passed = true;
    console.log(JSON.stringify(result));
    fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
    fs.writeFileSync(path.join(root, 'artifacts/lifecycle-browser.json'), JSON.stringify(result, null, 2));

  } finally {
    if (browser) await browser.close();
    if (server.exitCode === null) {
      const signal = value => {
        try {
          if (process.platform === 'win32') server.kill(value);
          else process.kill(-server.pid, value);
        } catch (error) { if (error.code !== 'ESRCH') throw error; }
      };
      signal('SIGTERM');
      const deadline = Date.now() + 5000;
      while (server.exitCode === null && Date.now() < deadline) await delay(100);
      if (server.exitCode === null) signal('SIGKILL');
    }
    fs.unlinkSync(path.join(fixture, 'page.tsx'));
    fs.rmdirSync(fixture);
    // Dev validators reference the temporary route; regenerate them on the next dev start.
    fs.rmSync(path.join(project, '.next/dev/types'), { recursive: true, force: true });
    // Next 16.4 may refresh this generated guide when the dev server starts.
    if (priorAgents) fs.writeFileSync(agents, priorAgents);
    else if (fs.existsSync(agents)) fs.unlinkSync(agents);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
