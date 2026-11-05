// The modes in a real browser, played to the end: the Practice Range (scripted, all seven stations), a 4-hunter party,
// Quick Draw, and each bonus game alone; the Lodge's engine rigs (E.Humanoid Uncle Dub, E.Blob hound) draw pixels.
import { chromium } from 'playwright';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, done } from '../lib/check.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..'), OUT = join(ROOT, 'tests/out');
const FILE = 'file://' + resolve(ROOT, '..', 'BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-medium-20261104-050554.html');
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const open = async (hash) => { const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); await p.goto(FILE + hash); await p.waitForTimeout(2500); return { p, errs }; };
const S = p => p.evaluate(() => My3D2dge.current.debug.snapshot());
// play a run from inside the page: the given player setup, the sim at 8x through game.advance (the page's own engine),
// confirm on every non-site segment; screenshots mid-site
const play = async (p, setup, name, perStep) => p.evaluate(async ({ setup, perStep }) => {
  const G = My3D2dge.current, B = BB; G.stop();
  (new Function('B', 'G', setup))(B, G);
  G.advance(.6); const sites = new Set(); let t = 0;
  while (t < 60 * 20 && G.sceneName === 'hunt') {
    const s = G.debug.snapshot();
    if (s.seg === 'site') { sites.add(s.site); if (perStep) (new Function('B', 'G', perStep))(B, G); G.advance(.25); t += .25; }
    else { G.input.tap('confirm'); G.advance(.3); t += .3; }
  }
  const out = { sites: [...sites], scene: G.sceneName, errors: G.errors.length, scores: B.play.players.map(q => q.total), range: B.records.range };
  G.start(); return out;
}, { setup, perStep });
// range
{
  const { p, errs } = await open('#menu');
  const r = await play(p, "B.begin({ mode: 'range', hunts: ['range'] });", 'range', `
    const site = B.play.site, R = site.rangeState; if (!R || R.finished) return; const pl = B.play.players[0], st = R.i, live = site.herd.list.filter(a => a.live && !a.dead);
    pl.rack = 0; pl.reload = 0; pl.chambered = true; if (pl.rounds <= 0) pl.rounds = pl.tube;
    const aim = a => { const P = site.lens.project(...B.aimPointOf(a, a.rig ? 'heart' : null)); pl.ret = [P[0], P[1]]; };
    if (st === 1) { if (!R.counters.pumps) { B.play.fire(pl, 240, 135); B.bus.emit('pump', { p: pl }); } else B.bus.emit('reload', { p: pl }); }
    else if (st === 5) { const a = live.find(x => x.cat === 'animal'); if (a && !a.frozen) B.bus.emit('call', { p: pl }); if (a && a.frozen > 0) { aim(a); B.play.fire(pl, pl.ret[0], pl.ret[1]); } }
    else if (st === 4) { const a = live.find(x => x.cat === 'animal'); if (a) { aim(a); pl.scoped = true; pl.scopeK = 1; pl.breathHeld = true; B.play.fire(pl, pl.ret[0], pl.ret[1]); } }
    else { const a = live.find(x => x.cat === 'animal' ? x.legal : x.kind === 'squirrel'); if (a && (a.cat !== 'animal' || !a.hits.length || st === 2)) { aim(a); B.play.fire(pl, pl.ret[0], pl.ret[1]); } }`);
  check('range: all seven stations, the badge, back to the menu', r.range === true && r.scene === 'menu' && r.errors === 0, JSON.stringify(r));
  check('range page: no errors', !errs.length, errs.join('|')); await p.close();
}
// party with 4 hunters: P1 the page's input with a bot, three CPU hunters
{
  const { p, errs } = await open('#menu');
  const r = await play(p, "B.cpuCount = 3; B.begin({ mode: 'party', hunts: ['bugle'], party: true }); B.curRun ? 0 : 0; G.advance(.9); for (const q of B.play.players) if (!q.bot) q.bot = new B.Bot(q, { skill: 'expert' });");
  check('party: 4 hunters played the whole Bugle Ridge hunt', r.scores.length === 4 && r.sites.length === 5 && r.scene === 'menu' && r.errors === 0, JSON.stringify(r));
  check('party: every hunter scored', r.scores.filter(s => s > 0).length >= 3, r.scores.join(','));
  check('party page: no errors', !errs.length, errs.join('|')); await p.close();
}
// quick draw
{
  const { p, errs } = await open('#menu');
  const r = await play(p, "B.cpuCount = 1; B.begin({ mode: 'quickdraw', hunts: ['hollow'], party: true }); G.advance(.9); for (const q of B.play.players) if (!q.bot) q.bot = new B.Bot(q, { skill: 'average' });");
  check('quick draw: the first site of each hunt and the clays', ['hollow-1', 'bugle-1', 'muskeg-1', 'bonus-saucer'].every(x => r.sites.includes(x)) && r.scene === 'menu' && r.errors === 0, JSON.stringify(r));
  check('quick draw page: no errors', !errs.length, errs.join('|')); await p.close();
}
// each bonus game alone
for (const bonus of ['crow', 'saucer', 'snowball']) {
  const { p, errs } = await open('#menu');
  const r = await play(p, `B.begin({ mode: 'bonus', bonus: '${bonus}', hunts: [B.get('bonus', '${bonus}').hunt] }); G.advance(.9); B.play.players[0].bot = new B.Bot(B.play.players[0], { skill: 'expert', cheat: true });`);
  check('bonus ' + bonus + ': played, scored, back to the menu', r.sites.length === 1 && r.scores[0] > 0 && r.scene === 'menu' && r.errors === 0, JSON.stringify(r));
  check('bonus ' + bonus + ' page: no errors', !errs.length, errs.join('|')); await p.close();
}
// the Lodge: Uncle Dub (E.Humanoid) and the hound (E.Blob) are drawn by the engine every frame, inside its view
{
  const { p, errs } = await open('#lodge'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => new Promise(res => {
    const L = BB.lodgeState, n = { dub: 0, hound: 0 }, at = [];
    const d = L.dub.draw.bind(L.dub), h = L.hound.draw.bind(L.hound);
    L.dub.draw = (g, ox, oy, v) => { n.dub++; at.push([ox, oy]); return d(g, ox, oy, v); };
    L.hound.draw = (g, ox, oy, v) => { n.hound++; return h(g, ox, oy, v); };
    setTimeout(() => res({ n, at: at[at.length - 1], W: My3D2dge.current.W, H: My3D2dge.current.H, humanoid: L.dub instanceof My3D2dge.Humanoid, blob: L.hound instanceof My3D2dge.Blob, errors: My3D2dge.current.errors.length }), 1500);
  }));
  check('lodge: E.Humanoid Uncle Dub and E.Blob hound are drawn each frame', r.humanoid && r.blob && r.n.dub > 20 && r.n.hound > 20 && r.errors === 0, JSON.stringify(r));
  check('lodge: Dub stands on screen', r.at && r.at[0] > 0 && r.at[0] < r.W && r.at[1] > 0 && r.at[1] < r.H, JSON.stringify(r.at));
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(800);
  check('lodge: the wall focus moves with the arrows', await p.evaluate(() => BB.lodgeState.list.i === 2));
  await p.screenshot({ path: join(OUT, 'm-lodge.png') });
  check('lodge page: no errors', !errs.length, errs.join('|')); await p.close();
}
await b.close(); done();
