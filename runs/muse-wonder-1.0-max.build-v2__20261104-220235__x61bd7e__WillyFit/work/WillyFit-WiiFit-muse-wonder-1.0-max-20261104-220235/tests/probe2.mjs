import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srv = spawn('python3', ['-u','-m','http.server','0','--bind','127.0.0.1'], { cwd: join(root,'tests/hub') });
let port=0;
await new Promise(res=>{const on=d=>{const m=String(d).match(/port (\d+)/); if(m){port=+m[1];res();}}; srv.stderr.on('data',on); srv.stdout.on('data',on); setTimeout(res,4000);});
const pw = await import('playwright');
const browser = await pw.chromium.launch();
const cases = ['players=2&auto=1','players=4&latency=150&jitter=50&loss=5&auto=1','players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave'];
for (const q of cases) {
  const hp = await browser.newPage();
  await hp.goto('http://127.0.0.1:'+port+'/harness.html?game=game.html&'+q);
  await hp.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 120000 }).catch(()=>{});
  const r = await hp.evaluate(()=>({ pass: !!(window.__hubCheck && window.__hubCheck.pass), bad: (window.__hubCheck?.checks||[]).filter(c=>!c.pass).map(c=>c.name+': '+(c.detail||'').slice(0,80)) }));
  console.log(q, '=>', r.pass ? 'PASS' : 'FAIL', JSON.stringify(r.bad).slice(0,300));
  await hp.close();
}
await browser.close(); srv.kill('SIGTERM');
