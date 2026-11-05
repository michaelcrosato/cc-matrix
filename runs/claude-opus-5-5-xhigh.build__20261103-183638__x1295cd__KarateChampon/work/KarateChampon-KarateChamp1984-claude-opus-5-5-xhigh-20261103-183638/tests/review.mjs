// Eye review only: scripted screenshots of screens and moments (tests/out/review/). Usage: node tests/review.mjs [name ...]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, basename } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), file = join(root, '..', basename(root) + '.html'), out = join(root, 'tests/out/review'); mkdirSync(out, { recursive: true });
const K = (k, n = 1) => Array(n).fill(['key', k]), W = ms => [['wait', ms]], J = code => [['js', code]];
const SHOTS = {
  menu: ['title', [...W(1200), ...K('Enter'), ...W(600)]],
  select: ['versus', [...W(800), ...K('ArrowDown', 4), ...K('Enter'), ...W(500), ...K('ArrowRight', 2), ...W(300)]],
  stagesel: ['versus', [...W(800), ...K('ArrowDown', 4), ...K('Enter'), ...W(300), ...K('Enter'), ...W(300), ...K('Enter'), ...W(800)]],
  road: ['road/m4', [...W(1500)]],
  vscard: ['road/m4', [...W(1000), ...K('Enter'), ...W(1800)]],
  fightmid: ['fight/harbor/ebi', [...W(5000), ...J("KC.scene.ai[0] = new KC.KarateAI({fid:'taro',level:7,seed:3}); KC.scene.readers[0] = null;"), ...W(6000)]],
  fightcall: ['fight/dojo/negi', [...W(4200), ...J("const f=KC.scene.fighters; f[0].x=150; f[1].x=150+18+26; f[0].control({posture:'n',press:'r'});"), ...W(1300)]],
  tatami: ['fight/fuji/kyabetsu', [...J("KC.game.settings.set('camera','Tatami 2.5D')"), ...W(4500)]],
  tatamiMarket: ['fight/market/asari', [...J("KC.game.settings.set('camera','Tatami 2.5D')"), ...W(4500)]],
  cutscene: ['road/m3', [...W(800), ...K('Enter'), ...W(1800)]],
  promotion: ['title', [...W(800), ...J("KC.game.go('promotion', { from: 'green', to: 'blue', next: () => {} })"), ...W(3000)]],
  continue: ['title', [...W(800), ...J("KC.Story.newGame(); KC.Story.node = 5; KC.game.go('continue', { opponent: 'ebi' })"), ...W(1500)]],
  practice: ['practice/lessonII', [...W(4300)]],
  boards: ['bonus/boards', [...W(2200), ['down', 'KeyK'], ...W(1200)]],
  pots: ['bonus/pots', [...W(5200)]],
  bull: ['bonus/bull', [...W(3600)]],
  records: ['records', [...W(800)]],
  about: ['about', [...W(800)]],
  movelist: ['fight/dojo/kamaboko', [...W(1500), ...J("KC.MoveList.open()"), ...K('ArrowDown'), ...K('KeyK'), ...W(700)]],
  dev: ['fight/dojo/kamaboko', [...W(1500), ...J("KC.Dev.open()"), ...W(400)]],
  lab: ['lab/turnBackKick', [...W(2300)]],
  spar: ['spar', [...W(1500), ...K('KeyL'), ...W(250)]],
  credits: ['credits', [...W(9000)]],
  attract: ['attract', [...W(9000)]],
  pad: ['title', [...W(800), ...J("KC.game.input.lastDevice='gamepad'"), ...W(300)]],
  initials: ['title', [...W(800), ...J("KC.game.go('initials', { mode: 'pots', score: 12345, next: () => {} })"), ...W(800)]],
  pausemenu: ['fight/dojo/kamaboko', [...W(3000), ...K('Escape'), ...W(500)]],
  pausedev: ['fight/dojo/kamaboko', [...W(3000), ...K('Escape'), ...W(400), ...K('ArrowDown', 3), ...K('Enter'), ...W(500)]],
  kachinuki: ['title', [...W(800), ...J("KC.game.addPlayer({keys:'right'}); KC.game.addPlayer({pad:1}); KC.LocalKachi.start(['taro','mei','ebi'])"), ...W(4500)]]
};
const want = process.argv.slice(2), b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
for (const [name, [hash, steps]] of Object.entries(SHOTS)) {
  if (want.length && !want.includes(name)) continue;
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }), errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(pathToFileURL(file).href + '#' + hash);
  for (const [k, v] of steps) { if (k === 'wait') await p.waitForTimeout(v); else if (k === 'key') { await p.keyboard.press(v); await p.waitForTimeout(90); } else if (k === 'down') await p.keyboard.down(v); else if (k === 'js') { await p.waitForFunction(() => window.KC && KC.game && KC.game.sceneName); await p.evaluate(v); } }
  await p.screenshot({ path: join(out, name + '.png') });
  const ge = await p.evaluate(() => window.__game ? window.__game.game.errors.map(e => e.message) : []);
  console.log((errs.length || ge.length ? 'ERR ' : 'ok  ') + name + ' ' + errs.concat(ge).slice(0, 2).join(' | '));
  await p.close();
}
await b.close();
