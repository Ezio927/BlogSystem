// Run against the public reader and local manager candidates; no music endpoint is mocked.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/blogsystem-browser/node_modules/playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sites = [
  { name: 'public', base: process.env.BLOG_URL || 'http://127.0.0.1:3400/blog', routes: ['', '/posts/welcome', '/about'] },
  { name: 'manager', base: process.env.MANAGER_URL || 'http://127.0.0.1:3401', routes: ['', '/posts/welcome', '/settings?tab=music'] },
];
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || '/home/ezio/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell' });
  const result = { pages: [], musicRequests: [], errors: [] };
  fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
  try {
    for (const site of sites) {
      const extraHTTPHeaders = site.name === 'manager' && process.env.MANAGER_HOST_HEADER ? { Host: process.env.MANAGER_HOST_HEADER } : {};
      const context = await browser.newContext();
      if (extraHTTPHeaders.Host) {
        // Chromium forbids overriding Host directly. The test transport forwards
        // to an isolated candidate using the manager's unchanged loopback Host.
        await context.route(new URL(site.base).origin + '/**', async route => {
          const headers = { ...route.request().headers(), host: extraHTTPHeaders.Host };
          if (headers.origin) headers.origin = 'http://' + extraHTTPHeaders.Host;
          await route.fulfill({ response: await route.fetch({ headers }) });
        });
      }
      // The isolated manager can exercise live settings without touching an existing backend.
      if (process.env.MOCK_MANAGER_BACKEND === '1' && site.name === 'manager') {
        await context.route('http://127.0.0.1:3402/**', route => route.fulfill({
          contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': new URL(site.base).origin },
          body: JSON.stringify({ success: true, data: { cloudMusicIds: ['1'] }, blogPath: '/fixtures/XHBlogs' })
        }));
      }
      await context.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));
      for (const width of [1440, 390]) {
        const page = await context.newPage({ viewport: { width, height: 1000 } });
        page.on('pageerror', error => result.errors.push(String(error)));
        page.on('request', request => {
          if (/\/api\/music|music\.163\.com|meting\//.test(request.url())) result.musicRequests.push(request.url());
        });
        for (const route of site.routes) {
          const response = await page.goto(site.base + route, { waitUntil: 'domcontentloaded' });
          assert.equal(response.status(), 200, site.name + route);
          await page.waitForTimeout(600);
          assert.equal(await page.locator('audio').count(), 0);
          assert.equal(await page.locator('a[href$="/music"]').count(), 0);
          assert.equal(await page.getByText('音乐播放设置', { exact: true }).count(), 0);
          assert.equal(await page.locator('link[rel="icon"]').last().getAttribute('href'), new URL(site.base).pathname.replace(/\/$/, '') + '/avatar.jpg');
          if (route === '') {
            const images = await page.locator('img').evaluateAll(elements => elements.filter(img => new URL(img.src).pathname.endsWith('/avatar.jpg')).map(img => ({ ready: img.complete && img.naturalWidth > 0 })));
            assert.ok(images.length > 0 && images.every(img => img.ready), site.name + ' avatar');
            await page.screenshot({ path: path.join(root, 'artifacts', `no-music-${site.name}-${width}.png`), fullPage: true });
          }
          result.pages.push({ site: site.name, width, route });
        }
        await page.close();
      }
      // Explicit probes are separate from normal page traffic above.
      for (const route of ['/music', '/api/music?ids=1']) {
        const response = await context.request.get(site.base + route, { headers: extraHTTPHeaders });
        assert.equal(response.status(), 404, site.name + route);
      }
      const avatar = await (await context.request.get(site.base + '/avatar.jpg', { headers: extraHTTPHeaders })).body();
      assert.deepEqual(avatar, fs.readFileSync(path.join(root, site.name === 'public' ? 'XHBlogs' : 'my-blog-manager', 'public/avatar.jpg')));
      await context.close();
    }
    assert.deepEqual(result.musicRequests, []);
    assert.deepEqual(result.errors, []);
    result.passed = true;
    console.log(JSON.stringify({ passed: true, pages: result.pages.length, musicRequests: [], errors: [] }));
  } finally {
    fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
    fs.writeFileSync(path.join(root, 'artifacts/no-music-browser.json'), JSON.stringify(result, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
