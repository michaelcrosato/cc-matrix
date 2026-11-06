// Scene factories that know about areas outside the map system (the launch, the ending).
import { app, goto } from '../core/app.js';
import { Run } from '../core/run.js';
import { Area } from './area.js';
import { LEVELS } from '../data/levels/index.js';

export function makeGameFor(id, entry, o = {}) {
  if (id === 'ending') return new Area('launch', { entry: 'ending', ...o });
  return new Area(id, { entry, ...o });
}

/** Dev mode teleport: go to any chapter, area or beat. Keeps your Run so loadouts survive. */
export function devTeleport(area, t) {
  const run = app.run;
  run.chapter = t.chapterNo ?? run.chapter;
  for (const f of t.flags ?? []) run.setFlag(f);
  for (const k of t.keys ?? []) run.giveKey(k);
  if (t.dame) run.dameWith = true;
  if (t.dame === false) run.dameWith = false;
  if (t.area === 'launch' || t.area === 'ending') { goto(makeGameFor(t.area, null, {})); return; }
  const data = run.areaData(t.area);
  data.beats = {};
  for (const id of t.skip ?? []) data.beats[id] = true;
  const game = new Area(t.area, { start: t.at, noSave: false });
  goto(game);
}
export { LEVELS, Run };
