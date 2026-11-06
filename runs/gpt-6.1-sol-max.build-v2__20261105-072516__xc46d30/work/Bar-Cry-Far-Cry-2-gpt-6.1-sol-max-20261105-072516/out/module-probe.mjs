import {chromium} from '@playwright/test';
import {globSync} from 'node:fs';
import {resolve} from 'node:path';
const browser=await chromium.launch({executablePath:globSync('/home/micha/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell')[0]});
try{const page=await browser.newPage();page.on('pageerror',e=>console.log('ERROR',String(e)));await page.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:undefined}));await page.goto('file://'+resolve('../Bar-Cry-Far-Cry-2-gpt-6.1-sol-max-20261105-072516.html')+'?game.attract=off',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1500);console.log(JSON.stringify(await page.evaluate(()=>({text:document.body.innerText.slice(-2500),game:!!window.__game}))));}finally{await browser.close();}
