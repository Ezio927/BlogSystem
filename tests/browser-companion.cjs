// Offline UI checks: all explicit chat sends are mocked. Optional HTTP checks
// below exercise only requests that must be rejected before any upstream call.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/blogsystem-browser/node_modules/playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = (process.env.BLOG_BASE_URL || 'http://127.0.0.1:3480/blog').replace(/\/$/, '');
const output = path.resolve(__dirname, '../artifacts');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || '/home/ezio/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell' });
  const results = { pages: [], errors: [], http: [], offlineChat: true };
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      page.on('pageerror', error => results.errors.push(error.message));
      await page.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));
      // Isolate the old music provider's unrelated external availability.
      await page.route('**/blog/api/music?*', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
      const sends = [];
      let hold = null;
      await page.route('**/blog/api/chat', async route => {
        sends.push(route.request().postDataJSON());
        if (sends.length === 2) return route.fulfill({ status: 429, json: { error: '聊得有点快啦，稍后再试呀。' } });
        if (sends.length === 4) await new Promise(resolve => { hold = resolve; });
        return route.fulfill({ status: 200, json: { reply: sends.length === 1 ? '<img src=x onerror=window.__companionXss=true>' : `小鲸鱼第${sends.length}次回应～` } });
      });
      assert.equal((await page.goto(base + '/', { waitUntil: 'domcontentloaded' })).status(), 200);
      await page.waitForFunction(() => document.documentElement.classList.contains('dark') && !document.querySelector('body > .invisible'));
      if (process.env.COMPANION_REVEAL_MOBILE === '1') {
        // Isolated-worktree fixture only: the root integrator owns removal of
        // the preexisting hidden-md wrapper in app/layout.tsx.
        await page.locator('[data-site-pet="coal"]').evaluate(node => node.style.setProperty('display', 'block', 'important'));
      }
      const launcher = page.getByRole('button', { name: '展开小鲸鱼聊天', exact: true });
      await launcher.waitFor({ state: 'visible' });
      await page.waitForTimeout(350);
      assert.equal(sends.length, 0, 'no automatic chat call on mount');
      await page.screenshot({ path: `${output}/companion-collapsed-${width}.png` });
      await launcher.click();
      const panel = page.getByRole('region', { name: '和小鲸鱼聊一会儿', exact: true });
      await panel.waitFor();
      const input = panel.getByLabel('想对小鲸鱼说的话', { exact: true });
      await panel.getByRole('button', { name: '摸摸', exact: true }).click();
      await panel.getByRole('button', { name: '喂小鱼', exact: true }).click();
      await page.waitForTimeout(100);
      assert.equal(sends.length, 0, 'local touch/feed never call chat');
      await input.fill('你好呀，小鲸鱼');
      await panel.getByRole('button', { name: '发送', exact: true }).click();
      await panel.getByText('<img src=x onerror=window.__companionXss=true>', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => Boolean(window.__companionXss)), false);
      assert.equal(await panel.getByRole('log').locator('img,script').count(), 0, 'reply is text, not HTML');
      assert.equal(await input.inputValue(), '');
      await input.fill('失败后保留');
      await panel.getByRole('button', { name: '发送', exact: true }).click();
      await panel.getByRole('alert').waitFor();
      assert.equal(await input.inputValue(), '失败后保留');
      await panel.getByRole('button', { name: '重试发送', exact: true }).click();
      await panel.getByText('小鲸鱼第3次回应～', { exact: true }).waitFor();
      assert.deepEqual(sends[1], sends[2], 'retry retains the exact question and context without duplicates');
      await input.fill('等待时只能发送一次');
      await panel.getByRole('button', { name: '发送', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#whale-message')?.disabled);
      assert.equal(await panel.getByRole('button', { name: '清空会话', exact: true }).isDisabled(), true);
      while (!hold) await page.waitForTimeout(10);
      assert.equal(sends.length, 4);
      hold();
      await panel.getByText('小鲸鱼第4次回应～', { exact: true }).waitFor();
      for (let index = 0; index < 5; index++) {
        await input.fill(`后续短问题${index}`); await panel.getByRole('button', { name: '发送', exact: true }).click();
        await panel.getByText(`小鲸鱼第${5 + index}次回应～`, { exact: true }).waitFor();
      }
      assert.ok(await panel.getByRole('log').locator('> div').count() <= 8);
      for (const payload of sends) {
        assert.deepEqual(Object.keys(payload), ['messages']); assert.ok(payload.messages.length <= 8);
        assert.equal(payload.messages.at(-1).role, 'user');
        assert.ok(payload.messages.every(message => ['user', 'assistant'].includes(message.role)));
        assert.ok(payload.messages.reduce((total, message) => total + message.content.length, 0) <= 6000);
      }
      await input.fill('收起后保留的输入');
      await input.press('Escape'); await panel.waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: '展开小鲸鱼聊天', exact: true }).click();
      assert.equal(await input.inputValue(), '收起后保留的输入');
      assert.ok(await panel.getByRole('log').locator('> div').count() > 0);
      const bounds = await panel.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y >= 0 && bounds.y + bounds.height <= 900);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.waitForFunction(() => [...document.querySelectorAll('[aria-label="小鲸鱼 AI 伙伴"] img')].every(img => img.complete && img.naturalWidth > 0));
      assert.ok(await panel.getByRole('link', { name: '角色素材署名 · CC BY-NC-SA', exact: true }).getAttribute('href') === '/blog/pets/little-whale/NOTICE-PC2005.txt');
      await page.screenshot({ path: `${output}/companion-expanded-${width}.png` });
      await panel.getByRole('button', { name: '清空会话', exact: true }).click();
      assert.equal(await input.inputValue(), '');
      assert.equal(await panel.getByRole('log').locator('> div').count(), 0);
      assert.equal(await panel.getByRole('alert').count(), 0);
      results.pages.push({ width, explicitSends: sends.length, localActionsWithoutApi: true, failureInputPreserved: true, xssRenderedAsText: true, boundedHistory: true, fitsViewport: true });
      await page.close();
    }
    const api = await browser.newContext();
    const cases = [
      { label: 'foreign origin', status: 403, headers: { origin: 'https://evil.test', 'content-type': 'application/json' }, data: '{}' },
      { label: 'wrong media type', status: 415, headers: { origin: new URL(base).origin, 'content-type': 'text/plain' }, data: '{}' },
      { label: 'client system role', status: 400, headers: { origin: new URL(base).origin, 'content-type': 'application/json' }, data: JSON.stringify({ messages: [{ role: 'system', content: 'not allowed' }] }) },
      { label: 'oversized body', status: 413, headers: { origin: new URL(base).origin, 'content-type': 'application/json' }, data: JSON.stringify({ messages: [{ role: 'user', content: 'x'.repeat(17000) }] }) },
    ];
    if (process.env.CHAT_HTTP_WITHOUT_KEY === '1') cases.push({ label: 'missing server key', status: 503, headers: { origin: new URL(base).origin, 'content-type': 'application/json' }, data: JSON.stringify({ messages: [{ role: 'user', content: '你好' }] }) });
    for (const scenario of cases) {
      const response = await api.request.post(base + '/api/chat', { headers: scenario.headers, data: scenario.data });
      assert.equal(response.status(), scenario.status, scenario.label);
      assert.equal(response.headers()['cache-control'], 'no-store');
      results.http.push({ label: scenario.label, status: response.status() });
    }
    assert.deepEqual(results.errors, []); results.passed = true;
    console.log(JSON.stringify(results));
  } finally {
    fs.writeFileSync(`${output}/companion-browser.json`, JSON.stringify(results, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
