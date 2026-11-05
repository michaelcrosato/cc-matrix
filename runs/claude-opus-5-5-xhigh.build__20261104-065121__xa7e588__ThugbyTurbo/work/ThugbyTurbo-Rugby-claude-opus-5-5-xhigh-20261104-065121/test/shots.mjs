// Screenshots of chosen moments, for what a script can't judge (the look): node test/shots.mjs [name ...] [--size 1280x720]
// Each shot: a deep link or a scene, then steps run in the page through window.__thugby, then a capture.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT } from '../build.mjs';

const args = process.argv.slice(2), only = args.filter(a => !a.startsWith('--') && !/^\d/.test(a));
const sizeArg = (args.includes('--size') ? args[args.indexOf('--size') + 1] : '1280x720').split('x').map(Number);
const out = resolve(new URL('../.cache/shots/', import.meta.url).pathname); mkdirSync(out, { recursive: true });
const SHOTS = {
  title: { hash: '', wait: 2500 },
  menu: { hash: '#menu', wait: 1500 },
  cup: { hash: '#cup', wait: 1500 },
  training: { hash: '#training', wait: 1500 },
  about: { hash: '#about', wait: 1500 },
  about2: { hash: '#about', wait: 1500, js: 'H.game.scenes.about.page = 1' },
  about4: { hash: '#about', wait: 1500, js: 'H.game.scenes.about.page = 3' },
  records: { hash: '#records', wait: 1500 },
  kickoff: { hash: '#match', wait: 7000 },
  play: { hash: '#match/docks', wait: 6000, js: 'H.game.debug.force("give"); H.game.advance(1.5)', after: 600 },
  far: { hash: '#match/furnace', wait: 6000, js: 'H.game.debug.force("give"); const p=H.TT.MS.m.carrier(); p.y=200; H.game.advance(.5)', after: 600 },
  monster: { hash: '#match/megadome', wait: 6000, js: 'H.game.debug.force("give"); H.game.advance(1); H.game.debug.force("monster"); H.game.advance(.35)', after: 50 },
  ruck: { hash: '#match', wait: 6000, js: 'H.game.debug.force("give"); H.game.advance(.5); H.game.debug.force("ruck"); H.game.advance(.8)', after: 100 },
  scrum: { hash: '#match/docks', wait: 6000, js: 'H.game.debug.force("scrum"); H.game.advance(2.6)', after: 100 },
  push: { hash: '#match/docks', wait: 6000, js: 'H.game.debug.force("scrum"); H.game.advance(3.8)', after: 100 },
  lineout: { hash: '#match/furnace', wait: 6000, js: 'H.game.debug.force("touch"); H.game.advance(2.4)', after: 100 },
  setkick: { hash: '#match/megadome', wait: 6000, js: 'H.game.debug.force("tryHome",{wide:true}); H.game.advance(4)', after: 400 },
  penalty: { hash: '#match', wait: 6000, js: 'H.game.debug.force("penalty"); H.game.advance(.6)', after: 200 },
  dev: { hash: '#match', wait: 6000, js: 'H.TT.dev.openPanel(); H.game.advance(.2)', after: 300 },
  drill: { hash: '#training/3', wait: 3000 },
  attract: { hash: '#attract', wait: 9000 },
  card: { hash: '#card', wait: 2000 },
  story: { hash: '', wait: 1500, js: 'H.TT.Cup.s=H.TT.Cup.fresh(); H.game.go("story",{node:"prologue",after:"prologue"},{fade:0}); H.game.advance(3)', after: 300 },
  pitchstory: { hash: '', wait: 1500, js: 'H.TT.Cup.s=H.TT.Cup.fresh(); H.game.go("story",{node:"r2",after:"cup",venue:"docks"},{fade:0}); H.game.advance(4)', after: 300 },
  tunnel: { hash: '', wait: 1500, js: 'H.TT.Cup.s=H.TT.Cup.fresh(); H.game.go("story",{node:"r4",after:"cup",venue:"megadome"},{fade:0}); H.game.advance(2); for(let i=0;i<3;i++){H.game.input.tap("confirm");H.game.advance(1.5);}', after: 300 },
  podium: { hash: '', wait: 1500, js: 'H.game.go("story",{node:"victory",after:"victory",venue:"megadome"},{fade:0}); H.game.advance(3)', after: 300 },
  results: { hash: '#match', wait: 5000, js: 'H.game.debug.force("tryHome"); H.game.advance(6); H.game.debug.force("fulltime"); H.game.advance(6)', after: 600 },
  setup: { hash: '', wait: 1500, js: 'H.game.go("setup",{seats:[]},{fade:0}); H.game.advance(.5)', after: 300 },
  join: { hash: '', wait: 1500, js: 'H.game.go("join",{mode:"exhibition"},{fade:0}); H.game.advance(.5)', after: 300 },
  touchonly: { hash: '', wait: 2500, size: [390, 844], mobile: true }
};
const names = only.length ? only : Object.keys(SHOTS);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const n of names) {
  const S = SHOTS[n]; if (!S) { console.log('no shot ' + n); continue; }
  const sz = S.size || sizeArg;
  const page = await browser.newPage({ viewport: { width: sz[0], height: sz[1] }, ...(S.mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(pathToFileURL(OUT.pathname).href + S.hash);
  await page.waitForTimeout(S.wait);
  if (S.js) { try { await page.evaluate('(()=>{const H=window.__thugby;' + S.js + '})()'); } catch (e) { errs.push('js: ' + e.message); } }
  await page.waitForTimeout(S.after || 200);
  await page.screenshot({ path: out + '/' + n + '.png' });
  console.log(n + (errs.length ? ' ERRORS: ' + errs.slice(0, 3).join(' | ') : ' ok'));
  await page.close();
}
await browser.close();
