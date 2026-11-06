// Every balance number that dev mode exposes: one table, read live by the systems.
import { store } from '../core/storage.js';

export const TUNING = [
  { id: 'gameMinutesPerSecond', label: 'Game minutes per second', default: 1.25, min: 0.25, max: 20, step: 0.25 },
  { id: 'walkSpeed', label: 'Walk speed', default: 2.6, min: 1, max: 6, step: 0.1 },
  { id: 'jogSpeed', label: 'Jog speed', default: 4.2, min: 2, max: 8, step: 0.1 },
  { id: 'runSpeed', label: 'Run speed', default: 6.0, min: 3, max: 12, step: 0.2 },
  { id: 'cameraZoom', label: 'Camera zoom', default: 1.6, min: 1.2, max: 2.4, step: 0.1 },
  { id: 'fishPerAcre', label: 'Fish per water acre', default: 3, min: 0, max: 10, step: 1 },
  { id: 'biteWindow', label: 'Bite window (s)', default: 0.6, min: 0.2, max: 2, step: 0.05 },
  { id: 'maxNibbles', label: 'Max false nibbles', default: 3, min: 0, max: 6, step: 1 },
  { id: 'bugsPerAcre', label: 'Bugs per acre', default: 1.5, min: 0, max: 6, step: 0.25 },
  { id: 'spookRun', label: 'Bug spook radius, running', default: 3, min: 0.5, max: 8, step: 0.25 },
  { id: 'fruitRegrow', label: 'Fruit regrow (days)', default: 2, min: 0, max: 6, step: 1 },
  { id: 'weedsPerDay', label: 'Weeds per day', default: 3, min: 0, max: 20, step: 1 },
  { id: 'hybridChance', label: 'Hybrid chance', default: 0.15, min: 0, max: 1, step: 0.05 },
  { id: 'balloonsPerDay', label: 'Balloons per day', default: 3, min: 0, max: 20, step: 1 },
  { id: 'sellMult', label: 'Sell price ×', default: 1, min: 0.2, max: 5, step: 0.1 },
  { id: 'buyMult', label: 'Buy price ×', default: 1, min: 0.2, max: 5, step: 0.1 },
  { id: 'debtMult', label: 'Debt ×', default: 1, min: 0.2, max: 5, step: 0.1 },
  { id: 'favourMult', label: 'Favour reward ×', default: 1, min: 0, max: 5, step: 0.1 },
  { id: 'friendMult', label: 'Friendship gain ×', default: 1, min: 0, max: 5, step: 0.1 },
  { id: 'npcSpeed', label: 'Neighbour walk speed', default: 1.8, min: 0.5, max: 5, step: 0.1 },
  { id: 'chatRate', label: 'Neighbour chat rate ×', default: 1, min: 0, max: 5, step: 0.1 },
  { id: 'rainMult', label: 'Rain chance ×', default: 1, min: 0, max: 3, step: 0.1 },
  { id: 'cheeseVol', label: 'Cheese volatility ×', default: 1, min: 0, max: 3, step: 0.1 },
  { id: 'textSpeed', label: 'Text speed (chars/s)', default: 35, min: 10, max: 200, step: 5 },
];
const KEY = 'honk:tuning';
export const tuning = {};
export function resetTuning(id) {
  for (const t of TUNING) if (!id || t.id === id) tuning[t.id] = t.default;
  saveTuning();
}
export function setTuning(id, v) {
  const t = TUNING.find((x) => x.id === id);
  if (!t) return;
  tuning[id] = Math.min(t.max, Math.max(t.min, Math.round(v / t.step) * t.step));
  saveTuning();
}
function saveTuning() { store.set(KEY, tuning); }
export function loadTuning() {
  for (const t of TUNING) tuning[t.id] = t.default;
  const s = store.get(KEY);
  if (s) for (const t of TUNING) if (typeof s[t.id] === 'number') tuning[t.id] = s[t.id];
}
for (const t of TUNING) tuning[t.id] = t.default;
