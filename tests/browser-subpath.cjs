// Run against the built public reader: BLOG_URL=http://127.0.0.1:3414/blog node tests/browser-subpath.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/blogsystem-browser/node_modules/playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = (process.env.BLOG_URL || 'http://127.0.0.1:3400/blog').replace(/\/$/, '');
const origin = new URL(base).origin;
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || '/home/ezio/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell' });
  const result = { pages: [], requests: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => result.errors.push(String(error)));
    page.on('request', request => {
      if (new URL(request.url()).origin === origin) result.requests.push(new URL(request.url()).pathname);
    });
    await page.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));
    for (const route of ['', '/posts/welcome', '/about', '/photowall', '/timeline', '/tree']) {
      const response = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200, route);
      await page.waitForTimeout(600);
      assert.ok((await page.title()).endsWith("Ezio's Blog"));
      const nativeLinks = await page.locator('a[href]').evaluateAll(links => links.map(link => link.getAttribute('href')));
      assert.ok(nativeLinks.every(href => !href.startsWith('/') || href.startsWith('//') || href === '/blog' || href.startsWith('/blog/')), `unprefixed link on ${route}`);
      assert.ok(nativeLinks.every(href => !href.startsWith('/blog/blog')), `duplicated prefix on ${route}`);
      const broken = await page.locator('img').evaluateAll(images => images.filter(img => img.src.startsWith(location.origin) && img.complete && !img.naturalWidth).map(img => img.src));
      assert.deepEqual(broken, [], route);
      result.pages.push(route || '/');
    }
    // Client navigation must keep one prefix and retain active navigation styling.
    await page.goto(base);
    await page.locator('header nav a', { hasText: '关于' }).click();
    await page.waitForURL(base + '/about');
    assert.match(await page.locator('header nav a', { hasText: '关于' }).getAttribute('class'), /text-indigo-600/);
    await page.getByRole('button', { name: '研究动态', exact: true }).click();
    await page.waitForURL(base + '/about?tab=activity');
    assert.equal(new URL(page.url()).pathname, '/blog/about');
    // Static assets are public under the same prefix, including font-relative URLs and 3D data.
    for (const resource of ['/avatar.jpg', '/fonts/fonts.css', '/siamese-cat.png', '/pets/xhblogs-big-fish/idle.webm', '/pets/xhblogs-big-fish/happy.webm', '/spaceship.bin']) {
      const response = await fetch(base + resource);
      assert.equal(response.status, 200, resource);
      await response.arrayBuffer();
    }
    const css = await (await fetch(base + '/fonts/fonts.css')).text();
    const font = css.match(/url\(([^)]+)\)/)[1];
    assert.equal((await fetch(new URL(font, base + '/fonts/fonts.css'))).status, 200);
    assert.ok(!result.requests.some(url => url.startsWith('/blog/api/music')));
    assert.equal((await fetch(base + '/api/music?ids=1')).status, 404);
    assert.equal((await fetch(base + '/music')).status, 404);
    assert.ok(result.requests.some(url => url.startsWith('/blog/_next/')));
    assert.ok(result.requests.every(url => url === '/blog' || url.startsWith('/blog/')), `root request escaped the blog: ${result.requests.filter(url => !url.startsWith('/blog'))}`);
    assert.deepEqual(result.errors, []);
    result.passed = true;
    console.log(JSON.stringify({ passed: result.passed, pages: result.pages.length, localRequests: result.requests.length, errors: result.errors }));
  } finally {
    fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
    fs.writeFileSync(path.join(root, 'artifacts/subpath-browser.json'), JSON.stringify(result, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
