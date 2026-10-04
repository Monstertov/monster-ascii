import {chromium} from 'playwright';import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const errors=[];
const page=await browser.newPage({viewport:{width:1280,height:1000}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://127.0.0.1:18081/docs/');await page.locator('pre').nth(5).waitFor();
const pre=page.locator('[data-effect="spin3d"] pre');const before=await pre.textContent();await page.waitForTimeout(600);assert.notEqual(await pre.textContent(),before);await page.screenshot({path:'screenshots/demo.png',fullPage:true});
await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);const staticText=await pre.textContent();await page.waitForTimeout(600);assert.equal(await pre.textContent(),staticText);await page.screenshot({path:'screenshots/demo-reduced-motion.png',fullPage:true});assert.deepEqual(errors,[]);console.log('Demo: changing frames, reduced motion static, no console errors');await browser.close();
