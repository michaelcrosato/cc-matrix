// Every balance variable: one table, read live. Values persist apart from the save.
import { storage } from '../core/storage.js';
export const TUNING = [
  { id: 'minPerSec', label: 'Game minutes per real second', default: 1.25, min: 0.25, max: 20, step: 0.25, page: 'Time' },
  { id: 'walk', label: 'Walk speed (m/s)', default: 2.6, min: 1, max: 6, step: 0.2, page: 'Player' },
  { id: 'jog', label: 'Jog speed (m/s)', default: 4.2, min: 2, max: 8, step: 0.2, page: 'Player' },
  { id: 'run', label: 'Run speed (m/s)', default: 6.0, min: 3, max: 12, step: 0.2, page: 'Player' },
  { id: 'zoom', label: 'Camera zoom', default: 1.6, min: 1.2, max: 2.4, step: 0.1, page: 'Player' },
  { id: 'fishPerAcre', label: 'Fish per water acre', default: 3, min: 0, max: 10, step: 1, page: 'Fishing' },
  { id: 'biteWindow', label: 'Bite window (s)', default: 0.6, min: 0.2, max: 2, step: 0.1, page: 'Fishing' },
  { id: 'maxNibbles', label: 'Max false nibbles', default: 3, min: 0, max: 6, step: 1, page: 'Fishing' },
  { id: 'bugsPerAcre', label: 'Bugs per acre', default: 1.5, min: 0, max: 6, step: 0.5, page: 'Nature' },
  { id: 'spookRun', label: 'Bug spook radius at a run (m)', default: 3, min: 0.5, max: 8, step: 0.5, page: 'Nature' },
  { id: 'fruitRegrow', label: 'Fruit regrow (days)', default: 2, min: 0, max: 6, step: 1, page: 'Nature' },
  { id: 'weedsPerDay', label: 'Weeds per day', default: 3, min: 0, max: 20, step: 1, page: 'Nature' },
  { id: 'hybridChance', label: 'Hybrid chance', default: 0.15, min: 0, max: 1, step: 0.05, page: 'Nature' },
  { id: 'balloonsPerDay', label: 'Balloons per day', default: 3, min: 0, max: 20, step: 1, page: 'Nature' },
  { id: 'sellMult', label: 'Sell price x', default: 1, min: 0.2, max: 5, step: 0.2, page: 'Money' },
  { id: 'buyMult', label: 'Buy price x', default: 1, min: 0.2, max: 5, step: 0.2, page: 'Money' },
  { id: 'debtMult', label: 'Debt x', default: 1, min: 0.2, max: 5, step: 0.2, page: 'Money' },
  { id: 'favourMult', label: 'Favour reward x', default: 1, min: 0, max: 5, step: 0.5, page: 'Neighbours' },
  { id: 'friendMult', label: 'Friendship gain x', default: 1, min: 0, max: 5, step: 0.5, page: 'Neighbours' },
  { id: 'npcSpeed', label: 'Neighbour walk speed (m/s)', default: 1.8, min: 0.5, max: 5, step: 0.1, page: 'Neighbours' },
  { id: 'chatRate', label: 'Neighbour chat rate x', default: 1, min: 0, max: 5, step: 0.5, page: 'Neighbours' },
  { id: 'rainMult', label: 'Rain chance x', default: 1, min: 0, max: 3, step: 0.25, page: 'World' },
  { id: 'cheeseVol', label: 'Cheese volatility x', default: 1, min: 0, max: 3, step: 0.25, page: 'Money' },
  { id: 'textSpeed', label: 'Text speed (chars/s)', default: 35, min: 10, max: 200, step: 5, page: 'Time' },
];
export const tuning = {};
for (const t of TUNING) tuning[t.id] = t.default;
const KEY = 'creditor-creek:tuning';
export function loadTuning() { const s = storage.json(KEY, {}); for (const t of TUNING) if (typeof s[t.id] === 'number') tuning[t.id] = Math.min(t.max, Math.max(t.min, s[t.id])); }
export function saveTuning() { const o = {}; for (const t of TUNING) if (tuning[t.id] !== t.default) o[t.id] = tuning[t.id]; storage.setJson(KEY, o); }
export function setTuning(id, v) { const t = TUNING.find(x => x.id === id); if (!t) return; tuning[id] = Math.round(Math.min(t.max, Math.max(t.min, v)) / t.step) * t.step; tuning[id] = +tuning[id].toFixed(4); saveTuning(); }
export function resetTuning(id) { for (const t of TUNING) if (!id || t.id === id) tuning[t.id] = t.default; saveTuning(); }
