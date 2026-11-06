import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function testPackage(check){
 const read=f=>fs.readFileSync(path.resolve(root,f),'utf8'),m=JSON.parse(read('build-meta.json')),exit=JSON.parse(read('../exit-interview.json')),about=JSON.parse(read('src/about-data.json')),html=read('../'+m.html),session=read('vendor/hub/session.js');
 check(JSON.stringify(exit)===JSON.stringify(about),'Interview matches the in-game data source');check(Object.keys(exit).join(',')==='sourceInformation,testingFeedback,engineFeedback,promptFeedback,aiHub','Exact interview shape');check(exit.testingFeedback.length===4&&exit.engineFeedback.length===6&&exit.promptFeedback.length===4,'Feedback answer counts');check(exit.sourceInformation.usage==='added on import','Usage is exact');check(html.includes('<meta charset="utf-8"><script>'+session+'</script>'),'Unmodified Hub client is first');check(!/<script[^>]+src=/.test(html),'No external script dependencies');check(html.includes('Permission is hereby granted'),'Native engine license is included');
 const browser=await chromium.launch();try{const page=await browser.newPage({viewport:{width:1280,height:720}}),errs=[];page.on('pageerror',e=>errs.push(String(e)));await page.goto(pathToFileURL(path.resolve(root,'..',m.html)).href);await page.waitForFunction(()=>window.GAME?.game.sceneName==='title');check(await page.title()===m.title,'Final page title');check(JSON.stringify(await page.evaluate(()=>GAME.ABOUT))===JSON.stringify(exit),'Embedded About equals the interview');await page.evaluate(()=>GAME.game.go('about'));await page.waitForTimeout(350);check(await page.evaluate(()=>GAME.game.sceneName==='about'&&GAME.game.errors.length===0)&&errs.length===0,'Final About draws without errors');await page.close();}finally{await browser.close();}
}
