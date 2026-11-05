// screenshots of the main screens at 1920x1080 into .cache/shots for review; fails only on errors
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const root = new URL('../../', import.meta.url), up = new URL('../../../', import.meta.url), out = new URL('.cache/shots/', root);
const NAME = 'OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-opus-5-5-xhigh-20261104-035148.html';
const SHOTS = [
  ['garage', `OB.game.go('garage', { mode: 'love' }, { fade: 0 })`, 1200],
  ['radio', `OB.game.go('radio', { mode: 'arcade', car: 'orchidea', passenger: 'vivi' }, { fade: 0 })`, 1200],
  ['race-love', `OB.startRace({ mode: 'love', car: 'orchidea', paint: '#e8463a', passenger: 'marisol', noIntro: true, zStart: 180 }); setTimeout(() => { const r = OB.Race.current; r.p1.brain = new OB.Brain({ targets: true }); }, 400)`, 9000],
  ['race-night', `OB.startRace({ mode: 'arcade', route: { stages: ['S13'], sprint: true }, car: 'girasole', paint: '#ffc81a', passenger: 'juni', noIntro: true, zStart: 200 }); setTimeout(() => { OB.Race.current.p1.brain = new OB.Brain({}); }, 400)`, 6000],
  ['race-fork', `OB.startRace({ mode: 'arcade', car: 'magnolia', paint: '#2a3a8a', passenger: 'vivi', noIntro: true, zStart: 920 }); setTimeout(() => { OB.Race.current.p1.brain = new OB.Brain({ route: 'R' }); }, 400)`, 5200],
  ['race-canyon', `OB.startRace({ mode: 'arcade', route: { stages: ['S6'], sprint: true }, car: 'gardenia', paint: '#f4f2ee', passenger: 'juni', noIntro: true, zStart: 300 }); setTimeout(() => { OB.Race.current.p1.brain = new OB.Brain({ driftAt: 3 }); }, 400)`, 6000],
  ['race-town', `OB.startRace({ mode: 'arcade', route: { stages: ['S8'], sprint: true }, car: 'primavera', paint: '#f4ead2', passenger: 'marisol', noIntro: true, zStart: 150 }); setTimeout(() => { OB.Race.current.p1.brain = new OB.Brain({}); }, 400)`, 5000],
  ['tour', `OB.Profile.data.seenTour = true; OB.game.go('tour', null, { fade: 0 })`, 1200],
  ['brief', `OB.game.go('brief', { id: 'B2' }, { fade: 0 })`, 1500],
  ['garden', `OB.Profile.data.seeds = 1200; OB.game.go('garden', null, { fade: 0 })`, 1200],
  ['ending', `OB.game.go('ending', { mood: 'bloom', clock: 25, cfg: { mode: 'arcade', paint: '#e8463a', afterEnding: 'menu' }, players: [{ goal: 'A', passenger: 'marisol', car: 'orchidea', score: 0, stats: {} }] }, { fade: 0 })`, 11500],
  ['results', `OB.game.go('results', { reason: 'goal', mood: 'bloom', grade: 'AA', petals: 44, maxPetals: 52, clock: 21, cfg: { mode: 'love', seed: 1 }, players: [{ id: 'p1', name: 'P1', score: 512340, route: 'LRLR', stage: 'S13', goal: 'C', finished: true, time: 301.2, stats: { bestDrift: 8400, nearMisses: 12, overtakes: 31, slipTime: 14.2, maxSpeed: 281, crashes: 1 }, passenger: 'vivi', car: 'orchidea' }] }, { fade: 0 })`, 2500],
  ['versus', `OB.game.addPlayer({ keys: 'right' }); OB.startRace({ mode: 'versus', route: { stages: ['S1', 'S3', 'S6'], sprint: true }, noIntro: true, zStart: 120, players: [{ car: 'orchidea', paint: '#e8463a', name: 'P1', passenger: 'marisol', bot: {} }, { car: 'gardenia', paint: '#f4f2ee', name: 'P2', passenger: 'juni', bot: {} }] })`, 6000],
  ['dev', `OB.startRace({ mode: 'arcade', car: 'orchidea', passenger: 'vivi', noIntro: true, zStart: 300 }); setTimeout(() => OB.Dev.open(), 3000)`, 4500],
  ['howto', `OB.game.go('howto', { page: 1 }, { fade: 0 })`, 4000],
  ['about', `OB.game.go('about', null, { fade: 0 }); setTimeout(() => OB.SCENES.about.turn(1), 300)`, 1200],
  ['attract', `OB.Attract.start('title')`, 9000]
];
export default async function (t) {
  mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  for (const [name, js, wait] of SHOTS) {
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(new URL(NAME, up).href); await p.waitForTimeout(2500); await p.keyboard.press('Shift'); await p.evaluate(js); await p.waitForTimeout(wait);
    await p.screenshot({ path: new URL(name + '.png', out).pathname });
    const ge = await p.evaluate(() => OB.game.errors.map(e => e.where + ': ' + e.message));
    t('screen ' + name + ' without errors', errs.length === 0 && ge.length === 0, errs.concat(ge).join(' | '));
    await p.close();
  }
  await b.close();
}
