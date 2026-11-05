// In Chromium with emulated standard-mapping controllers (navigator.getGamepads stubbed with DualSense-named pads):
// four local players join Beach Match (two keyboard halves, two pads), ready up and each moves her own fighter; prompts
// show PlayStation glyphs on pads and keycaps on keyboards, then Xbox letters once chosen; Serve Cam in a live match;
// every attract beat; the photo filters. Screenshots go to test-output/pads/ for review.
import { chromium } from 'playwright';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { DEV } from '../lib/load.mjs';
import { build } from '../../tools/build.mjs';
export default async function (t) {
  if (t.args['skip-browser']) return;
  build();
  const url = pathToFileURL(join(DEV, '..', basename(DEV) + '.html')).href, shots = join(DEV, 'test-output/pads'); mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.addInitScript(() => {
      const mk = i => ({ index: i, id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', connected: true, mapping: 'standard', timestamp: 0, buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] });
      window.__pads = [null, null, null, null];
      window.__padOn = i => { window.__pads[i] = mk(i); };
      window.__btn = (i, b, on) => { const p = window.__pads[i]; p.buttons[b] = { pressed: on, touched: on, value: on ? 1 : 0 }; p.timestamp++; };
      window.__axis = (i, a, v) => { window.__pads[i].axes[a] = v; window.__pads[i].timestamp++; };
      Object.defineProperty(navigator, 'getGamepads', { value: () => window.__pads.slice(), configurable: true });
    });
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(url); await page.waitForFunction(() => window.AOA && window.AOA.game && window.AOA.game.sceneName === 'title', null, { timeout: 30000 });
    const key = async k => { await page.keyboard.down(k); await page.waitForTimeout(70); await page.keyboard.up(k); await page.waitForTimeout(150); };
    const btn = async (i, b) => { await page.evaluate(([i, b]) => window.__btn(i, b, true), [i, b]); await page.waitForTimeout(90); await page.evaluate(([i, b]) => window.__btn(i, b, false), [i, b]); await page.waitForTimeout(160); };
    const ev = f => page.evaluate(f);
    await page.waitForTimeout(800);
    // Beach Match with four players
    await ev(() => window.AOA.game.go('exhibition', null, { fade: 0 })); await page.waitForTimeout(500);
    await key('Digit2'); await page.waitForTimeout(300);
    await ev(() => { window.__padOn(1); window.__padOn(2); }); await page.waitForTimeout(300);
    await btn(1, 9); await page.waitForTimeout(300); await btn(2, 9); await page.waitForTimeout(500);
    const joined = await ev(() => { const G = window.AOA, sc = G.game.scene; return { players: G.game.players.length, who: sc.slots.map(s => s.who), devs: G.game.players.map(I => G.dev(I)), halves: G.game.players.map(I => I.half || (typeof I.pad === 'number' ? 'pad' + I.pad : 'p1')) }; });
    t.ok('four players joined (two keyboard halves, two pads)', joined.players === 4 && joined.who.filter(Boolean).length === 4, JSON.stringify(joined));
    await page.screenshot({ path: join_(shots, 'join-4p.png') });
    await ev(() => window.AOA.game.settings.set('glyphs', 'xbox')); await page.waitForTimeout(250); await page.screenshot({ path: join_(shots, 'join-4p-xbox.png') });
    const xbJoin = await ev(() => window.AOA.game.players.map(I => window.AOA.btnName('confirm', I)));
    t.ok('the Xbox setting shows A on the pads in the lobby', xbJoin.filter(g => g === 'A').length === 2, xbJoin.join(' '));
    await ev(() => window.AOA.game.settings.set('glyphs', 'playstation')); await page.waitForTimeout(150);
    const glyphs = await ev(() => { const G = window.AOA, P = G.game.players; return P.map(I => G.btnName('confirm', I)); });
    t.ok('pad players see PlayStation glyphs, keyboard players see keys', glyphs.filter(g => g === '✕').length === 2 && glyphs.filter(g => g !== '✕').length === 2, glyphs.join(' '));
    const clash = await ev(() => window.AOA.game.players.filter(I => I.half).flatMap(I => { const by = {}; for (const a of ['confirm', 'cancel', 'alt', 'extra', 'tabL', 'tabR']) for (const c of (I.map[a] || []).filter(c => !/^(Pad|Act:)/.test(c))) (by[c] = by[c] || []).push(a); return Object.entries(by).filter(([, a]) => a.length > 1).map(([c, a]) => I.half + ' ' + c + '=' + a.join('/')); }));
    t.ok('keyboard halves: the menu actions are on different keys', !clash.length, clash.join(' '));
    // ready: F (left half), . (right half), Cross on each pad
    await key('KeyF'); await key('Period'); await btn(1, 0); await btn(2, 0); await page.waitForTimeout(1200);
    t.ok('all four ready starts the match', await ev(() => window.AOA.game.sceneName === 'match' && window.AOA.M.humans().length === 4), await ev(() => window.AOA.game.sceneName));
    await page.waitForTimeout(3500);
    const before = await ev(() => window.AOA.M.humans().map(p => [Math.round(p.x), Math.round(p.y), p === window.AOA.M.server]));
    await page.keyboard.down('KeyS'); await page.keyboard.down('ArrowDown'); await ev(() => { window.__axis(1, 1, 1); window.__axis(2, 1, -1); });
    await page.waitForTimeout(700);
    await page.keyboard.up('KeyS'); await page.keyboard.up('ArrowDown'); await ev(() => { window.__axis(1, 1, 0); window.__axis(2, 1, 0); });
    const after = await ev(() => window.AOA.M.humans().map(p => [Math.round(p.x), Math.round(p.y), p === window.AOA.M.server]));
    const moved = before.map((b, i) => Math.hypot(after[i][0] - b[0], after[i][1] - b[1]) > 8 || b[2]);
    t.ok('each player moves her own fighter', moved.every(Boolean), JSON.stringify({ before, after }));
    await page.screenshot({ path: join_(shots, 'match-4p.png') });
    await ev(() => { window.AOA.game.settings.set('glyphs', 'xbox'); for (const I of window.AOA.game.players) I.glyphs = 'xbox'; });
    const xb = await ev(() => window.AOA.game.players.map(I => window.AOA.btnName('play', I)));
    t.ok('the Xbox setting shows A on pads', xb.filter(g => g === 'A').length === 2, xb.join(' '));
    await page.waitForTimeout(300); await page.screenshot({ path: join_(shots, 'match-4p-xbox.png') });
    // Serve Cam in the live match
    await ev(() => { window.AOA.M.cpuControl = true; window.AOA.M.camMode = 'Serve Cam'; }); await page.waitForFunction(() => window.AOA.M.phase === 'rally', null, { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(600);
    t.ok('Serve Cam in a live rally', await ev(() => window.AOA.game.view.id === 'servecam' && window.AOA.M.phase === 'rally'));
    await page.screenshot({ path: join_(shots, 'servecam-live.png') });
    await ev(() => { window.AOA.game.settings.set('glyphs', 'playstation'); window.AOA.dropPlayers(); window.AOA.game.go('title', null, { fade: 0 }); }); await page.waitForTimeout(600);
    // the attract's beats, each screenshotted (the long match beat is cut short once it has shown play)
    await ev(() => { window.AOA.attractT = 9.5; }); await page.waitForTimeout(1500);
    const seen = [], prompts = [];
    for (let k = 0; k < 9; k++) {
      const beat = await page.waitForFunction(() => window.AOA.attract && window.AOA.attract.t > 2.4 && window.AOA.attract.beat, null, { timeout: 30000 }).then(h => h.jsonValue(), () => null);
      if (!beat) break; seen.push(beat);
      await page.screenshot({ path: join_(shots, 'attract-' + k + '-' + beat + '.png') });
      const n = await ev(() => { const G = window.AOA, f = G.prompt; let n = 0; G.prompt = function () { n++; return f.apply(this, arguments); }; return new Promise(res => setTimeout(() => { G.prompt = f; res(n); }, 250)); });
      if (n) prompts.push(beat + ':' + n);
      await ev(() => { const A = window.AOA.attract; A.t = window.AOA.ATTRACT_BEATS[A.i].len; }); await page.waitForTimeout(400);
    }
    t.ok('the attract draws no button prompts but its own Press', !prompts.length, prompts.join(' '));
    t.ok('the attract shows every beat in order', seen.join(',') === 'match,map,friends,suits,pool,casino,photo,final,card', seen.join(','));
    await key('Space'); await page.waitForTimeout(600); t.ok('and a key ends it', await ev(() => !window.AOA.attract));
    // the photo filters
    await ev(() => { const G = window.AOA; G.ensureState('tess'); G.debugTools.setDay(2, 1); G.debugTools.goto('location', { loc: 'pool' }); }); await page.waitForTimeout(900);
    await ev(() => window.AOA.photo.open()); await page.waitForTimeout(400);
    const avg = [];
    for (let f = 0; f < 5; f++) {
      await page.evaluate(f => { window.AOA.overlay.get('photo').filter = f; }, f); await page.waitForTimeout(300); await page.screenshot({ path: join_(shots, 'filter-' + f + '.png') });
      avg.push(await ev(() => { const c = document.getElementById('screen'), g = document.createElement('canvas'); g.width = 32; g.height = 18; const x = g.getContext('2d'); x.drawImage(c, 0, 0, 32, 18); const d = x.getImageData(0, 0, 32, 18).data, s = [0, 0, 0]; for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) s[k] += d[i + k]; return s.map(v => v / (d.length / 4)); }));
    }
    const far = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 6, distinct = avg.every((a, i) => avg.every((b, j) => i === j || far(a, b)));
    t.ok('each photo filter (Clean, Sunny, Sepia, Retro, Night Glow) changes the picture', distinct, avg.map(a => a.map(Math.round).join(',')).join(' | '));
    t.ok('no console errors', !errs.length, errs.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
}
const join_ = (a, b) => join(a, b);
