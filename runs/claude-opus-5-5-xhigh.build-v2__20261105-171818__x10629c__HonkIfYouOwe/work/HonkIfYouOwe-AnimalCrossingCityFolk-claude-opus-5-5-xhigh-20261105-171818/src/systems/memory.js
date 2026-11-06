// What the village remembers about you. Neighbours bring it up, each one once.
import { MEMORY_LINES } from '../data/dialogue/unique.js';
import { NEIGHBOURS } from '../data/neighbours.js';
import { nextFrom } from './lines.js';

const CAP = 80;
export function remember(g, k, data = {}) {
  const w = g.world;
  w.memory.push({ k, day: w.clock.day, heard: [], ...data });
  if (w.memory.length > CAP) w.memory.shift();
  g.events.emit('memory', { k, ...data });
}
/** The freshest thing this neighbour hasn't mentioned yet, as a resolved line. */
export function memoryLine(g, npcId) {
  const w = g.world;
  for (let i = w.memory.length - 1; i >= 0; i--) {
    const m = w.memory[i];
    if (m.heard.includes(npcId)) continue;
    if (m.about === npcId && m.k !== 'bonk') continue;
    if (m.k === 'bonk' && m.about !== npcId) continue;
    if (w.clock.day - m.day > 5) break;
    const list = MEMORY_LINES[m.k];
    if (!list) continue;
    m.heard.push(npcId);
    const t = nextFrom(w, npcId, `mem.${m.k}`, list);
    const neighbour = m.about ? (NEIGHBOURS[m.about]?.short ?? NEIGHBOURS[m.about]?.name ?? m.about) : 'someone';
    return { text: t.replace(/\{item\}/g, m.item ?? 'thing').replace(/\{catch\}/g, m.catch ?? 'fish').replace(/\{neighbour\}/g, neighbour), memory: m };
  }
  return null;
}
