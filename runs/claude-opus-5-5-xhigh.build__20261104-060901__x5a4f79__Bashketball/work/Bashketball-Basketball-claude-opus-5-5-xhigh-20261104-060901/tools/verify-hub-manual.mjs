// The AI Hub harness driven by hand (no auto): three players; click into P2's frame and press Enter on our card;
// Start now; P2 holds A (left) and its player moves on the host; Remove player P3 (its player turns CPU on the host);
// Time up (the host finishes; every copy is told the round ended). Serves build/hub on 127.0.0.1 port 0 and stops that
// server by its handle. Usage: node tools/verify-hub-manual.mjs (from the dev folder)
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: 'build/hub', stdio: ['ignore', 'pipe', 'pipe'] });
try {
  const port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port')), 15000); });
  const title = (await (await fetch(`http://127.0.0.1:${port}/game.html`)).text()).match(/<title>[^<]*/)[0];
  console.log('served:', title);
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1500, height: 950 } });
  await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&players=3`); await p.waitForTimeout(6000);
  const frames = () => p.frames().filter(f => f.url().includes('game.html'));
  const bbOf = async f => f.evaluate(() => window.__bb ? { scene: window.__bb.game.sceneName, role: window.__bb.NET.role, mySlot: window.__bb.NET.mySlot, ended: window.__bb.NET.ended, answers: window.__bb.NET.card, players: window.__bb.S.players.map(q => [Math.round(q.x), q.source && q.source.kind]) } : null);
  const all = async () => Promise.all(frames().map(async f => [f, await bbOf(f)]));
  console.log('copies:', (await all()).map(([, x]) => x && x.scene + '/' + x.role + '/slot' + x.mySlot).join('  '));
  const host = (await all()).find(([, x]) => x && x.role === 'host')[0];
  const cells = await p.$$('.cell');
  await cells[1].click({ position: { x: 300, y: 200 } }); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
  console.log('P2 pressed Enter on our card; card ready list:', JSON.stringify(((await bbOf(host)).answers || {}).ready));
  await p.click('#release'); await p.waitForTimeout(7000);
  console.log('after Start now: host scene', (await bbOf(host)).scene, 'phase', await host.evaluate(() => window.__bb.S.match && window.__bb.S.match.phase));
  const before = (await bbOf(host)).players[2][0];
  await cells[1].click({ position: { x: 300, y: 200 } }); await p.keyboard.down('KeyA'); await p.waitForTimeout(1500); await p.keyboard.up('KeyA'); await p.waitForTimeout(400);
  console.log('P2 held A: its player (slot 2) on the host moved from x', before, 'to x', (await bbOf(host)).players[2][0]);
  await p.selectOption('#who', { index: 2 }); await p.click('#remove'); await p.waitForTimeout(1500);
  console.log('after Remove player (P3): host sources by slot', JSON.stringify((await bbOf(host)).players.map(x => x[1])));
  await p.screenshot({ path: 'check-output/verify-hub-manual.png' });
  await p.click('#timeup'); await p.waitForTimeout(4000);
  console.log('log tail:\n' + await p.evaluate(() => document.body.innerText.split('\n').filter(l => /finish|end |ended|time-up|leave|played/.test(l)).slice(-8).join('\n')));
  console.log('copies told the round ended:', JSON.stringify((await all()).map(([, x]) => x && x.ended)));
  await b.close();
} finally { srv.kill('SIGTERM'); }
