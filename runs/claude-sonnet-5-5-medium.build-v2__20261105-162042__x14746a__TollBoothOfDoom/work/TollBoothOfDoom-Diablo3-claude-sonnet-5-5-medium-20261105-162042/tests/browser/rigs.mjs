// Tier 3: the rigged bodies. Malison's rope arms are solved by the engine's two-bone IK on spring chains; the Crawler, Clapperjaw and Plate step on LegStepper feet.
import { pathToFileURL } from 'node:url';
import { launch, openGame, HTML } from '../../tools/browser.mjs';
export const name = 'browser rigs';
const ARMS = `
  const E = window.__PIXEL_ENGINE__; const g = window.__GAME__; const w = g.world; E.manual = true;
  const boss = w.monsters.find((m) => m.boss); const h = w.heroes[0]; h.x = boss.x - 6; h.z = boss.z + 4;
  E.step(30);
  const a = g.actors.map.get('m' + boss.id); const arms = a.limbs.filter((o) => o.name.startsWith('Arm'));
  const q0 = arms.map((o) => o.quaternion.toArray().join());
  for (let i = 0; i < 90; i++) { boss.x += Math.sin(i / 8) * 0.12; E.step(1); }
  const q1 = arms.map((o) => o.quaternion.toArray().join());
  return { arms: arms.length, finite: arms.every((o) => o.quaternion.toArray().every(Number.isFinite) && o.children[0].quaternion.toArray().every(Number.isFinite)),
    moved: q0.some((q, i) => q !== q1[i]), fore: arms.every((o) => o.children.some((c) => c.name.startsWith('Fore'))) };`;
const LEGS = `
  const E = window.__PIXEL_ENGINE__; const g = window.__GAME__; const w = g.world; E.manual = true;
  const m = w.monsters.find((q) => q.type === '%T' && !q.dead); if (!m) return { none: true };
  const h = w.heroes[0]; h.x = m.x - 4; h.z = m.z; E.step(20);
  const a = g.actors.map.get('m' + m.id); if (!a || !a.limbs) return { noactor: true };
  for (let i = 0; i < 120; i++) { m.x += 0.05; E.step(1); }
  const legs = a.limbs.filter((o) => o.name.startsWith('Leg'));
  return { legs: legs.length, steps: a.stepper ? a.stepper.steps : -1, finite: legs.every((o) => [o.rotation.x, o.rotation.y, o.rotation.z].every(Number.isFinite)), planted: a.stepper ? a.stepper.planted() : -1, shins: legs.filter((o) => o.children.some((c) => c.name.startsWith('Shin') && c.quaternion.toArray().every(Number.isFinite) && Math.abs(c.quaternion.w) < 0.9999)).length };`;
async function probe(t, q, js, check, label) {
  const b = await launch();
  try {
    const { page, errors } = await openGame(b, { url: pathToFileURL(HTML).href + '?' + q });
    const r = await page.evaluate(async (j) => { await window.__PIXEL_READY__; return await (new Function('return (async () => {' + j + '})()'))(); }, js);
    t.ok(check(r), `${label}: ${JSON.stringify(r)}`); t.ok(errors.length === 0, `${label}: page errors: ${errors.slice(0, 2)}`);
  } finally { await b.close(); }
}
export async function run(t) {
  await probe(t, 'quick=1&zone=summit&level=17&cls=sexton', ARMS, (r) => r.arms === 4 && r.fore && r.finite && r.moved, "Malison's four rope arms are solved by two-bone IK and move");
  await probe(t, 'quick=1&zone=ossuary3&level=8&seed=11', LEGS.replace('%T', 'tomb_crawler'), (r) => (r.legs === 6 && r.steps > 3 && r.finite && r.shins === 6), "Crawler legs step on LegStepper feet");
}
