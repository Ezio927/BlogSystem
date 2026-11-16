// Real private-console -> public-reader acceptance. Uses and removes one named fixture.
// Requires the SSH tunnel, the shanghai alias, and BLOG_URL pointing at this blog.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/home/ezio/.cache/ezio-blog-browser/node_modules/playwright-core');
const publicBase = process.env.BLOG_URL;
assert.equal(publicBase, 'https://47.101.37.232/blog', 'Explicitly set BLOG_URL for this owned deployment.');
const directory = path.resolve(__dirname, '../artifacts/server-authoring');
fs.mkdirSync(directory, { recursive: true });
const title = `服务端发布验收（临时）${Date.now()}`;
const first = '服务器保存的第一版验收正文，发布前只存在私有草稿中。';
const second = '服务器更新的第二版验收正文，公网无需构建即可读取。';
const third = '模拟发布失败后的编辑内容应保留，随后可以再次发布。';
let id, browser;
const result = { steps: [], errors: [], fixtureTitle: title };
const api = async (route, payload, origin = 'http://127.0.0.1:3401') => {
  const response = await fetch('http://127.0.0.1:3402/api/' + route, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(payload),
  });
  return { status: response.status, data: await response.json() };
};

(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || '/home/ezio/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => result.errors.push(String(error)));
  page.on('dialog', dialog => dialog.accept());
  await page.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));
  await page.goto('http://127.0.0.1:3401/editor?type=post', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('文章大标题...').fill(title);
  await page.locator('.tiptap[contenteditable="true"]').fill(first);
  await page.getByPlaceholder('记录一下这篇内容的核心思绪...').fill('短暂验收内容，验证后自动清除。');
  const savedResponse = page.waitForResponse(r => r.url().endsWith('/api/drafts/save') && r.request().method() === 'POST');
  await page.getByRole('button', { name: '存为草稿', exact: true }).click();
  const saved = await (await savedResponse).json();
  assert(saved.success); id = saved.id; result.id = id;
  assert.equal((await fetch(publicBase + '/posts/' + id)).status, 404);
  result.steps.push('Private server draft saved; public article returns 404');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.tiptap').getByText(first, { exact: true }).waitFor();
  assert.equal(await page.getByPlaceholder('文章大标题...').inputValue(), title);
  assert.equal(await page.getByTitle('待处理操作', { exact: true }).count(), 0);
  await page.screenshot({ path: directory + '/server-draft.png', fullPage: true });
  result.steps.push('Refresh restores title/body and rich-text preview; old queue absent');

  const publish = async () => {
    const response = page.waitForResponse(r => r.url().endsWith('/api/drafts/publish') && r.request().method() === 'POST');
    await page.getByRole('button', { name: /发布到博客|更新公开文章/ }).click();
    const data = await (await response).json(); assert(data.success, JSON.stringify(data));
    assert.equal(data.publishedURL, publicBase + '/posts/' + id);
    await page.getByRole('link', { name: '查看已发布内容' }).waitFor();
    return data;
  };
  await publish();
  const reader = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  reader.on('pageerror', error => result.errors.push(String(error)));
  await reader.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));
  assert.equal((await reader.goto(publicBase + '/posts/' + id, { waitUntil: 'domcontentloaded' })).status(), 200);
  await reader.getByText(first, { exact: true }).waitFor();
  await reader.screenshot({ path: directory + '/public-published.png', fullPage: true });
  result.steps.push('Direct browser publish immediately readable over public HTTPS');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.tiptap').getByText(first, { exact: true }).waitFor();
  await page.locator('.tiptap[contenteditable="true"]').fill(second);
  await publish();
  await reader.reload({ waitUntil: 'domcontentloaded' });
  await reader.getByText(second, { exact: true }).waitFor();
  result.steps.push('Reopened published article edited and updated; public refresh shows new text');

  // Only the publish response is mocked; draft persistence still uses the real server.
  await page.locator('.tiptap[contenteditable="true"]').fill(third);
  await page.route('http://127.0.0.1:3402/api/drafts/publish', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: '验收模拟写入失败' }) }), { times: 1 });
  const failedResponse = page.waitForResponse(r => r.url().endsWith('/api/drafts/publish'));
  await page.getByRole('button', { name: '更新公开文章', exact: true }).click();
  assert.equal((await failedResponse).status(), 503);
  await page.getByText(/发布失败，草稿已保留/).waitFor();
  assert((await page.locator('.tiptap').innerText()).includes(third));
  assert((await api('drafts/get', { id })).data.draft.content.includes(third));
  await reader.reload({ waitUntil: 'domcontentloaded' });
  await reader.getByText(second, { exact: true }).waitFor();
  await publish();
  await reader.reload({ waitUntil: 'domcontentloaded' });
  await reader.getByText(third, { exact: true }).waitFor();
  result.steps.push('Simulated publish failure preserves real draft and editor; retry publishes');

  const before = (await api('drafts/get', { id })).data.draft;
  assert((await api('drafts/save', { ...before, content: '<p>并发编辑的临时草稿</p>' })).data.success);
  const conflict = await api('drafts/save', { ...before, content: '<p>旧版本不应覆盖</p>' });
  assert.equal(conflict.data.success, false);
  assert((await api('drafts/get', { id })).data.draft.content.includes('并发编辑'));
  assert.equal((await api('drafts/save', before, 'https://untrusted.example')).status, 403);
  assert.equal((await api('sync/execute', {})).status, 409);
  result.steps.push('Stale save rejected; foreign Origin rejected; legacy sync disabled');

  const treeResponse = await reader.goto(publicBase + '/tree', { waitUntil: 'domcontentloaded' });
  assert((await treeResponse.text()).includes(title), 'New article must reach the dynamic tree response');
  await reader.getByRole('heading', { name: '灵境', exact: true }).waitFor();
  // Article titles in this view are hover tooltips, not an always-visible list.
  result.steps.push('Public tree loads successfully with the newly published article in its runtime data');
  await page.goto('http://127.0.0.1:3401/settings', { waitUntil: 'domcontentloaded' });
  await page.getByText(/修改后需要重新构建部署/).waitFor();
  await page.screenshot({ path: directory + '/private-settings.png', fullPage: true });
  assert.deepEqual(result.errors, []);
  result.passed = true;
})().catch(error => { result.failure = String(error); console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (id) {
    assert(/^draft_[a-f0-9]+$/.test(id));
    const cleanup = `from pathlib import Path\nimport json\nroot=Path.home()/'apps/ezio-blog/content'\ndoc_id=${JSON.stringify(id)}\ntitle=${JSON.stringify(title)}\nfor relative in ['posts/'+doc_id+'.md','manager_data/drafts/'+doc_id+'.json']:\n p=root/relative\n if p.exists():\n  text=p.read_text()\n  assert title in text, 'Refuse to remove a non-fixture document'\n  p.unlink()\nprint('Removed only the acceptance fixture')\n`;
    try { execFileSync('ssh', ['shanghai', 'python3', '-'], { input: cleanup, timeout: 20000 }); result.fixtureRemoved = true; }
    catch (error) { result.cleanupFailure = String(error); process.exitCode = 1; }
  }
  fs.writeFileSync(directory + '/browser-result.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
});
