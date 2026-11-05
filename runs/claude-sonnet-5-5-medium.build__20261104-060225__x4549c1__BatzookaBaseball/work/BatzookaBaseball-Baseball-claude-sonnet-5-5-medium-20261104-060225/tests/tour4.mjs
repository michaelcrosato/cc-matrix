import { createRequire } from 'node:module'; import { resolve, dirname, basename } from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = createRequire('/tmp/s55pw/')('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'); const file = resolve(root, '..', basename(root) + '.html');
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
page.on('pageerror', e => errs.push(String(e))); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
await page.goto(pathToFileURL(file).href + '#tourmap'); await page.waitForTimeout(900);
const ev = f => page.evaluate(f), adv = s => page.evaluate(x => My3D2dge.current.advance(x, { draw: true }), s);
await ev(() => { BZ.tourSave(BZ.tourNew()); My3D2dge.current.go('tourmap'); }); await adv(1);
for (let stop = 0; stop < 4; stop++) {
  await ev(() => My3D2dge.current.scene.play()); await adv(1.6);
  const park = await ev(() => 0); await ev(() => My3D2dge.current.input.tap('cancel')); await adv(3);
  let sc = await ev(() => My3D2dge.current.sceneName); if (sc !== 'match') { console.log('FAIL stop', stop, 'not match:', sc); break; }
  const info = await ev(() => ({ park: BZ.M.parkDef.id, opp: BZ.M.sides[1].team.id }));
  await ev(() => { BZ.enableBot(true, 1); BZ.M.sides[1].human = false; BZ.M.score[0] = 30; });
  for (let g = 0; g < 300; g++) { await adv(5); if (await ev(() => BZ.M.over || My3D2dge.current.sceneName !== 'match')) break; }
  await adv(6); sc = await ev(() => My3D2dge.current.sceneName);
  const won = await ev(() => !!My3D2dge.current.scene.won); await adv(1);
  await ev(() => My3D2dge.current.scene.list.rows[0].fn()); await adv(1.5);
  const st = await ev(() => BZ.tourLoad().stop); const sc2 = await ev(() => My3D2dge.current.sceneName);
  await ev(() => My3D2dge.current.input.tap('cancel')); await adv(3); const sc3 = await ev(() => My3D2dge.current.sceneName);
  console.log('stop', stop, JSON.stringify(info), 'results:', sc, 'won', won, 'story:', sc2, 'tour stop now', st, 'then', sc3);
  if (sc3 === 'clubhouse') { await ev(() => My3D2dge.current.go('tourmap')); await adv(1.5); }
}
console.log('finished flag', await ev(() => BZ.tourLoad().finished), 'errors', errs.length ? errs : 'none'); await b.close();
