// The dev entries not covered elsewhere: Skip segment, CLOSE, and the Animal Lab and Sound Lab opened from the dev menu.
import { chromium } from 'playwright';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, done } from '../lib/check.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = 'file://' + resolve(ROOT, '..', 'BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-medium-20261104-050554.html');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(FILE + '#hunt/hollow/1'); await p.waitForTimeout(5000);
const openDev = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(500); await p.getByText('Dev mode', { exact: true }).first().click(); await p.waitForTimeout(400); };
const pickRoot = async label => { await p.evaluate(l => { const pg = BB.dev.stack[0]; BB.dev.stack.length = 1; pg.list.i = pg.list.items.findIndex(x => x.label === l); }, label); await p.keyboard.press('Enter'); await p.waitForTimeout(300); };
const S = () => p.evaluate(() => My3D2dge.current.debug.snapshot());
// skip segment: the site ends and the flow moves on to its tally
await openDev(); await pickRoot('TOOLS');
await p.evaluate(() => { const pg = BB.dev.stack[BB.dev.stack.length - 1]; pg.list.i = pg.list.items.findIndex(x => x.label === 'SKIP SEGMENT'); }); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
const s1 = await S(); check('skip segment ends the site and moves to the tally', s1.seg === 'tally', s1.seg);
// close
await p.keyboard.press('Escape'); await p.waitForTimeout(200); await pickRoot('CLOSE'); check('CLOSE closes dev mode', await p.evaluate(() => !BB.devOpen));
// the labs from the dev root
await p.goto(FILE + '#hunt/hollow/1'); await p.reload(); await p.waitForTimeout(5000);
await openDev(); await pickRoot('ANIMAL LAB'); await p.waitForTimeout(800);
check('the Animal Lab opens from dev mode', (await S()).scene === 'animallab');
await p.goto(FILE + '#hunt/hollow/2'); await p.reload(); await p.waitForTimeout(5000);
await openDev(); await pickRoot('SOUND LAB'); await p.waitForTimeout(800);
check('the Sound Lab opens from dev mode', (await S()).scene === 'soundlab');
check('no errors', !errs.length && await p.evaluate(() => My3D2dge.current.errors.length) === 0, errs.join('|'));
await b.close(); done();
