// One deliberate real model call; run only when a configured provider is intended.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/blogsystem-browser/node_modules/playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base=(process.env.BLOG_BASE_URL || 'https://47.101.37.232/blog').replace(/\/$/,'');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE || '/home/ezio/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell'});
 const result={base,errors:[],musicRequests:[],chatRequests:0};
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await page.addInitScript(()=>sessionStorage.setItem('hasSeenSplash','true'));
  page.on('pageerror',e=>result.errors.push(String(e)));
  page.on('request',r=>{if(r.url().endsWith('/api/chat'))result.chatRequests++;if(/\/api\/music|music\.163\.com|meting\//.test(r.url()))result.musicRequests.push(r.url())});
  assert.equal((await page.goto(base,{waitUntil:'domcontentloaded'})).status(),200);
  await page.getByRole('heading',{name:'Ezio',exact:true}).waitFor();
  await page.getByRole('button',{name:'展开小鲸鱼聊天',exact:true}).click();
  const panel=page.getByRole('region',{name:'和小鲸鱼聊一会儿'});
  const input=panel.getByLabel('想对小鲸鱼说的话');
  await input.fill('你好，小鲸鱼！用一句话介绍一下你自己吧。');
  const started=Date.now();
  const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/chat')&&r.request().method()==='POST',{timeout:45000});
  await panel.getByRole('button',{name:'发送',exact:true}).click();
  const response=await responsePromise;const body=await response.json();
  assert.equal(response.status(),200,JSON.stringify(body));assert.ok(body.reply?.trim());
  await panel.getByText(body.reply,{exact:true}).waitFor();
  assert.equal(await input.inputValue(),'');
  result.status=response.status();result.reply=body.reply;result.elapsedMs=Date.now()-started;
  fs.mkdirSync(root+'/artifacts',{recursive:true});
  for(const width of [1440,390]) {
   await page.setViewportSize({width,height:1000});await page.waitForTimeout(350);
   const box=await panel.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=1000);
   await page.screenshot({path:root+`/artifacts/companion-live-${width}.png`});
  }
  assert.equal(result.chatRequests,1);assert.deepEqual(result.errors,[]);assert.deepEqual(result.musicRequests,[]);
  result.passed=true;console.log(JSON.stringify(result));
 } finally {fs.writeFileSync(root+'/artifacts/companion-live.json',JSON.stringify(result,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
