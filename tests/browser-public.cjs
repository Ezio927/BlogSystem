const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/tmp/blogsystem-browser/node_modules/playwright-core');
const fs=require('fs');const assert=require('assert/strict');
const baseUrl=(process.env.BLOG_BASE_URL || process.env.BLOG_URL || 'http://127.0.0.1:3400/blog').replace(/\/$/, '');
const root=require('path').resolve(__dirname,'..');fs.mkdirSync(root+'/artifacts',{recursive:true});
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE || '/home/ezio/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell'});
const results={pages:[],errors:[]};
try{for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});page.on('pageerror',e=>results.errors.push(String(e)));
 await page.addInitScript(()=>sessionStorage.setItem('hasSeenSplash','true'));
 for(const route of (process.env.BLOG_CHECK_ROUTES?.split(',') || ['/','/posts/welcome','/posts/missing','/timeline','/chatter','/about','/photowall','/music','/friends','/projects'])){
 const response=await page.goto(baseUrl+route,{waitUntil:'domcontentloaded'});
 // Public tunnel assets may arrive after DOMContentLoaded; require actual hydration.
 await page.waitForFunction(()=>document.documentElement.classList.contains('dark'),undefined,{timeout:20000});
 await page.waitForTimeout(1200);
 const state=await page.evaluate(()=>({title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,text:document.body.innerText.slice(0,1800),brokenImages:[...document.images].filter(x=>x.complete&&!x.naturalWidth).map(x=>x.src)}));
 assert.equal(response.status(),['/posts/missing','/music'].includes(route)?404:200,route);if(route==='/')assert.equal(state.title,"Ezio's Blog");assert.ok(state.scrollWidth<=width+1,`${route} overflow ${width}/${state.scrollWidth}`);
 if(route==='/')await page.getByRole('heading',{name:'Ezio',exact:true}).waitFor({state:'visible'});
 assert.ok(!state.text.includes('每日选刊')&&!state.text.includes('AI 日报'));
 assert.deepEqual(state.brokenImages,[],`broken images on ${route}`);
 if(['/','/posts/welcome'].includes(route))await page.screenshot({path:`${root}/artifacts/${route==='/'?'home':'reading'}-${width}.png`,fullPage:true});
 results.pages.push({width,route,status:response.status(),...state});
 }
 await page.close();
}results.passed=results.errors.length===0;console.log(JSON.stringify({passed:results.passed,pages:results.pages.length,errors:results.errors}));
}finally{fs.writeFileSync(root+'/artifacts/'+(process.env.BLOG_CHECK_ROUTES?'public-browser-focused.json':'public-browser.json'),JSON.stringify(results,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
