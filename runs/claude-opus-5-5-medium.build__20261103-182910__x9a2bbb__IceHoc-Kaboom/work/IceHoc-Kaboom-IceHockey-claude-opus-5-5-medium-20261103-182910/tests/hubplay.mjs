// A real AI Hub session in the harness, driven by real keyboard events: two copies of the game (host and client) on the
// harness's simulated network. The client's player skates and shoots with key presses; the host's world must answer.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const out = (what, ok, detail = '') => console.log((ok ? 'PASS' : 'FAIL') + ' [hubplay] ' + what + (ok ? '' : ': ' + String(detail).slice(0, 300)));
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: new URL('../hub/', import.meta.url).pathname });
const port = await new Promise((res, rej) => { let b = ''; const on = d => { b += d; const m = b.match(/port (\d+)/); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port')), 8000); });
const br = await chromium.launch();
try {
  const p = await br.newPage({ viewport: { width: 1400, height: 900 } });
  await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&players=2&latency=80&jitter=20&limit=300`);
  const frames = async () => { const fs = p.frames().filter(f => f !== p.mainFrame()); const info = []; for (const f of fs) { try { info.push([f, await f.evaluate(() => window.AIHub && window.__game ? { host: AIHub.isHost, me: AIHub.me, server: !!AIHub.server, phase: window.__game.M && window.__game.M.phase, scene: window.__game.game.sceneName } : null)]); } catch (e) { /* not ready */ } } return info.filter(x => x[1]); };
  let fr = []; for (let i = 0; i < 60 && fr.length < 2; i++) { await p.waitForTimeout(500); fr = await frames(); }
  out('two copies of the game joined the session', fr.length >= 2, JSON.stringify(fr.map(x => x[1])));
  const key = (f, code, type) => f.evaluate(([c, t]) => window.dispatchEvent(new KeyboardEvent(t, { code: c, key: c, bubbles: true })), [code, type]);
  // both players answer READY on the game's own card with Enter
  for (const [f] of fr) { await key(f, 'Enter', 'keydown'); await p.waitForTimeout(80); await key(f, 'Enter', 'keyup'); }
  let started = false; for (let i = 0; i < 80 && !started; i++) { await p.waitForTimeout(500); started = (await frames()).every(x => x[1].phase && x[1].phase !== 'card' && x[1].phase !== 'none'); }
  out('the round started on both copies after READY', started, JSON.stringify((await frames()).map(x => x[1])));
  await p.waitForTimeout(4500);   // the 3-2-1 and the faceoff
  fr = await frames();
  const host = fr.find(x => x[1].host)[0], client = fr.find(x => !x[1].host)[0], cid = fr.find(x => !x[1].host)[1].me;
  const hostView = () => host.evaluate(id => { const M = window.__game.M, h = M.humans.find(x => x.id === id); return { x: Math.round(h.s.x), y: Math.round(h.s.y), id: h.s.id, shots: M.stats[h.s.id].shots, checks: M.events.filter(e => e.type === 'check_start' && e.by === h.s.id).length, phase: M.phase, score: M.score }; }, cid);
  const clientView = () => client.evaluate(() => { const M = window.__game.M, h = M.humans.find(x => !x.remote); return { x: Math.round(h.s.x), y: Math.round(h.s.y), phase: M.phase, score: M.score.slice() }; });
  for (let i = 0; i < 20; i++) { const st = await host.evaluate(id => { const h = window.__game.M.humans.find(x => x.id === id); return h.s.state + ':' + window.__game.M.phase; }, cid); if (st === 'skate:play') break; await p.waitForTimeout(250); }
  const a = await hostView();
  // the client's player holds D (skate right) then A (skate left): the host's copy of that skater must follow
  const vtrace = []; await key(client, 'KeyD', 'keydown'); for (let i = 0; i < 6; i++) { await p.waitForTimeout(250); vtrace.push(await host.evaluate(id => Math.round(window.__game.M.humans.find(x => x.id === id).s.vx), cid)); } await key(client, 'KeyD', 'keyup');
  const b = await hostView();
  let trace = [];
  for (let attempt = 0; attempt < 3; attempt++) {
  for (let i = 0; i < 40; i++) { const st = await host.evaluate(id => { const h = window.__game.M.humans.find(x => x.id === id); return h.s.state + ':' + window.__game.M.phase; }, cid); if (st === 'skate:play') break; await p.waitForTimeout(250); }
  trace = []; await key(client, 'KeyA', 'keydown'); for (let i = 0; i < 8; i++) { await p.waitForTimeout(250); const v = await host.evaluate(id => { const M = window.__game.M, h = M.humans.find(x => x.id === id); return [Math.round(h.s.x), Math.round(h.s.vx), h.s.state, h.net.mx]; }, cid); trace.push(v); } await key(client, 'KeyA', 'keyup');
  if (Math.min(...trace.map(t => t[1])) < -40) break; }
  const c = await hostView();
  out('the client player\'s key presses move their skater in the host\'s world (right, then left)', Math.max(...vtrace) > 60 && Math.min(...trace.map(t => t[1])) < -40 && c.id === b.id, JSON.stringify([a, b, c, vtrace, trace]));
  // presses arrive too: K (shoot / check) tapped repeatedly while chasing the puck
  for (let i = 0; i < 40; i++) {
    const tgt = await host.evaluate(id => { const M = window.__game.M, h = M.humans.find(x => x.id === id), p2 = M.puck; return [p2.x - h.s.x, p2.y - h.s.y]; }, cid);
    const dx = tgt[0] > 8 ? 'KeyD' : tgt[0] < -8 ? 'KeyA' : null, dy = tgt[1] > 8 ? 'KeyS' : tgt[1] < -8 ? 'KeyW' : null;
    for (const k2 of [dx, dy]) if (k2) await key(client, k2, 'keydown');
    await p.waitForTimeout(180);
    for (const k2 of ['KeyD', 'KeyA', 'KeyS', 'KeyW']) await key(client, k2, 'keyup');
    await key(client, 'KeyK', 'keydown'); await p.waitForTimeout(60); await key(client, 'KeyK', 'keyup');
  }
  const d = await hostView();
  out('the client player\'s button presses reach the host (shots or checks by that skater)', d.shots + d.checks > 0, JSON.stringify(d));
  const cv = await clientView(), hv = await hostView();
  out('the client draws the host\'s world: same phase and score, own skater near the host\'s position', cv.phase === hv.phase && JSON.stringify(cv.score) === JSON.stringify(hv.score) && Math.hypot(cv.x - hv.x, cv.y - hv.y) < 60, JSON.stringify([cv, hv]));
  const errs = []; for (const [f] of fr) errs.push(...await f.evaluate(() => window.__game.game.errors.map(e => e.message)));
  out('no errors on either copy', !errs.length, errs.join(' | '));
} finally { await br.close(); srv.kill(); }
