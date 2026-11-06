// PLAN.md's measured skill scores, played by bots fitted event by event (tools/fit-bots.mjs, tools/plan-fits.json).
// The plan's own figures come from separate prototypes and do not all agree with each other, so one bot cannot print them all.
// These fits are test settings only: the game never reads them. Reaching a score shows this build can produce it, and these
// checks fail if the physics drifts. They are not more evidence than that. The general bots' checks stay in test-plan.mjs.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { here, logicPage } from './lib.mjs';
import { ROWS, SEEDS, measure, measureKeys, measurePlates, KEY_ROWS, PLATE_ROWS } from './fit-bots.mjs';

const SK = ['sharp', 'average', 'clumsy'];
const TOL = {
  poses: [10, 10, 10],
  // At 120 Hz the sharp bot has no setting between 24 and 25 steps of delay: Tier 2 reads 71 or 97 against the plan's 86.
  stillWater: [16, 6, 8],
  plank: [8, 9, 10],
  cairn: [1, 1.5, 1],
  grandHold: [3, 12, 12],
  roomService: [1, 1.6, 1],
  springboard: [6, 5, 9],
};

export default async function ({ ok, info, browser }) {
  const fits = JSON.parse(readFileSync(join(here, 'plan-fits.json'), 'utf8'));
  let page = await logicPage(browser);
  const fresh = async () => { await page.context().close(); page = await logicPage(browser); };
  const check = (label, got, want, tol) => ok(Math.abs(got - want) <= tol, label, `${got.toFixed(1)}, plan ${want} within ${tol}`);
  for (const id of Object.keys(ROWS)) {
    for (const [tier, setup, plan] of ROWS[id]) {
      const row = [];
      for (let i = 0; i < 3; i++) {
        let s = 0;
        const fit = setup && setup.braceK === 0 ? fits.roomBare[SK[i]] : fits[id][SK[i]];
        for (const seed of SEEDS[id]) s += await measure(page, { id, tier, setup, skill: SK[i], seed, fit });
        const v = s / SEEDS[id].length;
        row.push(v);
        check(`Fitted ${id} T${tier + 1} ${JSON.stringify(setup || {})} ${SK[i]}`, v, plan[i], TOL[id][i]);
      }
      info('fitted', id, `T${tier + 1}`, JSON.stringify(setup || {}), row.map((v) => v.toFixed(v < 10 ? 1 : 0)).join(' / '), 'plan', plan.join(' / '));
    }
    await fresh();
  }
  for (const [id, tier, setup, plan] of KEY_ROWS) {
    const row = [];
    for (let i = 0; i < 3; i++) {
      let s = 0;
      for (const seed of [1, 2]) s += await measureKeys(page, { id, tier, setup, skill: SK[i], seed, fit: fits.keys[SK[i]] });
      const v = s / 2;
      row.push(v);
      check(`Fitted on keys ${id} T${tier + 1} ${SK[i]}`, v, plan[i], 13);
    }
    info('fitted on keys', id, `T${tier + 1}`, row.map((v) => v.toFixed(0)).join(' / '), 'plan', plan.join(' / '));
  }
  await fresh();
  for (let t = 0; t < 3; t++) {
    const row = [];
    for (let i = 0; i < 3; i++) {
      let s = 0;
      for (const seed of [1, 2]) s += await measurePlates(page, { tier: t, seed, ...fits.plateKeys[SK[i]] });
      const v = s / 2;
      row.push(v);
      check(`Fitted plates on keys T${t + 1} ${SK[i]}`, v, PLATE_ROWS[t][i], 9);
    }
    info('fitted plates on keys', `T${t + 1}`, row.map((v) => v.toFixed(0)).join(' / '), 'plan', PLATE_ROWS[t].join(' / '));
  }
  await page.context().close();
}
