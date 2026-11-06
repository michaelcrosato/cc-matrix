import {chromium} from 'playwright';import {spawn} from 'node:child_process';import fs from 'node:fs';
export async function run(T){
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:'tests/hub',stdio:['ignore','pipe','pipe']});let browser;
 try{
 const port=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(new Error('Server startup timeout')),10000);server.stdout.on('data',d=>{out+=d;const m=out.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(Number(m[1]));}});server.on('exit',n=>reject(new Error('Server exited '+n)));});
 const url='http://127.0.0.1:'+port;const html=await(await fetch(url+'/game.html')).text();T.check(html.includes('<title>Wee Serene'),'ephemeral server serves our game');
 browser=await chromium.launch({headless:true});const scenarios=['players=1&auto=1','players=2&auto=1','players=3&latency=150&jitter=50&loss=5&auto=1','players=4&latency=150&jitter=50&loss=5&auto=1','players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave'];
 const reports=[];
 for(const scenario of scenarios){const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url+'/harness.html?game=game.html&'+scenario);try{await page.waitForFunction(()=>document.body.dataset.complete==='true',{},{timeout:120000});}catch(e){T.check(false,'hub completes '+scenario+' '+(await page.locator('#log').innerText()).slice(-1500));}
 const report=await page.evaluate(()=>window.__hubCheck||{});reports.push({scenario,report,errors});T.check(report.pass===true,'hub harness '+scenario+' '+JSON.stringify(report.checks?.filter(c=>!c.pass)||report));T.equal(errors,[],'hub has no page errors '+scenario);
 if(scenario.startsWith('players=2')){const frames=page.frames().filter(f=>f!==page.mainFrame()&&new URL(f.url()).pathname.endsWith('/game.html'));const states=await Promise.all(frames.map(f=>f.evaluate(()=>({players:G.hub.info?.players.length,received:Object.keys(G.hub.ghosts).length,deal:G.hub.deal,over:G.hub.over,reported:G.hub.reported}))));T.check(states.length>=2,'hub two-page session loaded');T.check(states.some(s=>s.received>0),'two-page hub session receives ghost state');T.check(states.every(s=>JSON.stringify(s.deal)===JSON.stringify(states[0].deal)),'hub copies deal same seeded events');}
 await page.close();
 }
 const standalone=await browser.newPage();await standalone.goto(url+'/game.html');await standalone.waitForFunction(()=>window.__game?.sceneName==='title');T.check(await standalone.evaluate(()=>!G.inSession&&G.sceneName==='title'),'standalone still reaches title');await standalone.close();fs.writeFileSync('tests/hub-report.json',JSON.stringify(reports,null,2));
 }finally{await browser?.close();server.kill('SIGTERM');}
}
