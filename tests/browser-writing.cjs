const publicBase=(process.env.BLOG_URL || 'http://127.0.0.1:3400/blog').replace(/\/$/, '');
const { chromium }=require(process.env.PLAYWRIGHT_MODULE || '/tmp/blogsystem-browser/node_modules/playwright-core');const fs=require('fs');const assert=require('assert/strict');
const root=require('path').resolve(__dirname,'..');fs.mkdirSync(root+'/artifacts',{recursive:true});let id;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE || '/home/ezio/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell'});
 const page=await browser.newPage({viewport:{width:1500,height:1000}});const results={steps:[],errors:[]};page.on('pageerror',e=>results.errors.push(String(e)));page.on('dialog',d=>d.accept());
 await page.addInitScript(()=>sessionStorage.setItem('hasSeenSplash','true'));
 const save=async(label)=>{const [response]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/drafts/save')&&r.request().method()==='POST'),page.getByRole('button',{name:label,exact:true}).click()]);const data=await response.json();assert.equal(data.success,true,JSON.stringify(data));id=data.id;return data};
 const sync=async()=>{
  await page.getByTitle('待处理操作',{exact:true}).click();
  const navigation=page.waitForEvent('domcontentloaded');const update=page.waitForResponse(r=>r.url().endsWith('/api/drafts/sync_local'));await page.getByRole('button',{name:'🚀 更新本地',exact:true}).click();assert.equal((await(await update).json()).success,true);await navigation;await page.waitForTimeout(500);
  if(!await page.getByRole('button',{name:'🔄 同步 XHBlogs',exact:true}).isVisible())await page.getByTitle('待处理操作',{exact:true}).click();
  await page.getByRole('button',{name:'🔄 同步 XHBlogs',exact:true}).click();const wait=page.waitForResponse(r=>r.url().endsWith('/api/sync/execute'));await page.getByRole('button',{name:'确认同步',exact:true}).click();assert.equal((await(await wait).json()).success,true);
 };
 try{
 await page.goto('http://127.0.0.1:3401/editor?type=post',{waitUntil:'domcontentloaded'});
 await page.getByPlaceholder('文章大标题...').fill('写作闭环验证');
 await page.locator('.tiptap[contenteditable="true"]').fill('这是一篇临时验证文章，确认保存、重新打开和公开阅读。');
 await page.getByPlaceholder('记录一下这篇内容的核心思绪...').fill('验证草稿保存与文章更新。');
 await save('存为草稿');results.steps.push('create and save draft');
 await page.waitForTimeout(800);await page.screenshot({path:root+'/artifacts/editor-saved.png',fullPage:true});
 const privateRes=await fetch(publicBase+'/posts/'+id);assert.equal(privateRes.status,404);results.steps.push('draft is not public');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(1200);assert.equal(await page.getByPlaceholder('文章大标题...').inputValue(),'写作闭环验证');await page.locator('.tiptap').getByText('这是一篇临时验证文章，确认保存、重新打开和公开阅读。',{exact:true}).waitFor();results.steps.push('reload/reopen preserves content and rich text preview');
 await save('正式发布');await page.waitForTimeout(400);await sync();results.steps.push('publish queue and synchronize');
 const reader=await browser.newPage({viewport:{width:1440,height:900}});await reader.addInitScript(()=>sessionStorage.setItem('hasSeenSplash','true'));let res=await reader.goto(publicBase+'/posts/'+id,{waitUntil:'domcontentloaded'});assert.equal(res.status(),200);await reader.getByText('这是一篇临时验证文章，确认保存、重新打开和公开阅读。',{exact:true}).waitFor();await reader.screenshot({path:root+'/artifacts/published-reading.png',fullPage:true});results.steps.push('published article readable without rebuild');
 await page.goto('http://127.0.0.1:3401/editor?type=post&id='+id,{waitUntil:'domcontentloaded'});await page.waitForTimeout(1000);await page.locator('.tiptap[contenteditable="true"]').fill('文章已经更新，公开阅读应立即显示这一段新内容。');await save('正式发布');await page.waitForTimeout(300);await sync();
 res=await reader.reload({waitUntil:'domcontentloaded'});assert.equal(res.status(),200);await reader.getByText('文章已经更新，公开阅读应立即显示这一段新内容。',{exact:true}).waitFor();results.steps.push('edit published article and reader refresh sees update');
 results.id=id;results.passed=results.errors.length===0;console.log(JSON.stringify(results));
 }catch(e){results.failure=String(e);await page.screenshot({path:root+'/artifacts/editor-failure.png',fullPage:true});throw e}
 finally{fs.writeFileSync(root+'/artifacts/writing-browser.json',JSON.stringify(results,null,2));await browser.close();if(id){for(const p of [root+'/my-blog-manager/manager_data/drafts/'+id+'.json',root+'/my-blog-manager/posts/'+id+'.md',root+'/XHBlogs/posts/'+id+'.md'])if(fs.existsSync(p))fs.unlinkSync(p)}}
})().catch(e=>{console.error(e);process.exitCode=1});
