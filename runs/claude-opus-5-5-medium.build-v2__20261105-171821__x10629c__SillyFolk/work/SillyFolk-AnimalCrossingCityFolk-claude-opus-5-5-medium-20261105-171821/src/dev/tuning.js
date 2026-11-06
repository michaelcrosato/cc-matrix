// Balance variables, read live by every system. Dev mode's Balance page is generated from this table.
import { storage, KEYS } from '../core/storage.js';
export const TUNING = [
  { id: 'minPerSec', label: 'Game minutes per real second', default: 1.25, min: 0.25, max: 20, step: 0.25 },
  { id: 'walk', label: 'Walk speed (m/s)', default: 2.6, min: 1, max: 6, step: 0.1 },
  { id: 'jog', label: 'Jog speed (m/s)', default: 4.2, min: 2, max: 8, step: 0.1 },
  { id: 'run', label: 'Run speed (m/s)', default: 6.0, min: 3, max: 12, step: 0.1 },
  { id: 'zoom', label: 'Camera zoom', default: 1.6, min: 1.2, max: 2.4, step: 0.1 },
  { id: 'fishPerAcre', label: 'Fish per water acre', default: 3, min: 0, max: 10, step: 1 },
  { id: 'biteWindow', label: 'Bite window (s)', default: 0.6, min: 0.2, max: 2, step: 0.05 },
  { id: 'maxNibbles', label: 'Max false nibbles', default: 3, min: 0, max: 6, step: 1 },
  { id: 'bugsPerAcre', label: 'Bugs per acre', default: 1.5, min: 0, max: 6, step: 0.25 },
  { id: 'spook', label: 'Bug spook radius at a run (m)', default: 3, min: 0.5, max: 8, step: 0.25 },
  { id: 'fruitRegrow', label: 'Fruit regrow (days)', default: 2, min: 0, max: 6, step: 1 },
  { id: 'weeds', label: 'Weeds per day', default: 3, min: 0, max: 20, step: 1 },
  { id: 'hybrid', label: 'Hybrid chance', default: 0.15, min: 0, max: 1, step: 0.05 },
  { id: 'balloons', label: 'Balloons per day', default: 3, min: 0, max: 20, step: 1 },
  { id: 'sell', label: 'Sell price ×', default: 1, min: 0.2, max: 5, step: 0.1 },
  { id: 'buy', label: 'Buy price ×', default: 1, min: 0.2, max: 5, step: 0.1 },
  { id: 'debt', label: 'Debt ×', default: 1, min: 0.2, max: 5, step: 0.1 },
  { id: 'favour', label: 'Favour reward ×', default: 1, min: 0, max: 5, step: 0.1 },
  { id: 'friend', label: 'Friendship gain ×', default: 1, min: 0, max: 5, step: 0.1 },
  { id: 'npcWalk', label: 'Neighbour walk speed (m/s)', default: 1.8, min: 0.5, max: 5, step: 0.1 },
  { id: 'chat', label: 'Neighbour chat rate ×', default: 1, min: 0, max: 5, step: 0.1 },
  { id: 'rain', label: 'Rain chance ×', default: 1, min: 0, max: 3, step: 0.1 },
  { id: 'cheese', label: 'Cheese volatility ×', default: 1, min: 0, max: 3, step: 0.1 },
  { id: 'textSpeed', label: 'Text speed (chars/s)', default: 35, min: 10, max: 200, step: 5 },
];
export const T = {};
export function resetTuning(id) { for (const t of TUNING) if (!id || t.id === id) T[t.id] = t.default; saveTuning(); }
export const saveTuning = () => storage.setJSON(KEYS.tuning, T);
export function loadTuning() { for (const t of TUNING) T[t.id] = t.default; const s = storage.getJSON(KEYS.tuning); if (s) for (const t of TUNING) if (typeof s[t.id] === 'number') T[t.id] = s[t.id]; }
loadTuning();
