import {chromium} from '@playwright/test';
import {globSync} from 'node:fs';
import {resolve} from 'node:path';
const browser=await chromium.launch({executablePath:globSync('/home/micha/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell')[0],args:['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader']});
try{
const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>console.log('ERROR',String(e)));page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,500));});
const off=encodeURIComponent(JSON.stringify(['feature:cascadedShadows','feature:gi','feature:ssr','feature:ao','feature:gpuCrowds','feature:air']));
await page.goto('file://'+resolve('../Bar-Cry-Far-Cry-2-gpt-6.1-sol-max-20261105-072516.html')+'?game.attract=off&game.detail=0.05&quality=low&gfx.featuresOff='+off,{waitUntil:'domcontentloaded'});
for(let n=0;n<6;n++){
 await new Promise(r=>setTimeout(r,10000));
 console.log(JSON.stringify(await page.evaluate(()=>({ready:window.__engine?.ready,errors:window.__engine?.errors,info:window.__engine?.info?.(),stats:window.__engine?.stats?.(),screen:window.__game?.screen()}))).slice(0,4500));
 if(await page.evaluate(()=>window.__engine?.ready===true))break;
}
await page.screenshot({path:'out/title-probe.png'});
}finally{await browser.close();}
