// The modes that sit on the race: coppers and the garage, replays, survival (three rival ghosts, a gauntlet of the five
// roads) and hot seat (two to four players take turns on a cup of roads). Pure logic: the scenes live in game.js.
import { TRACKS } from './data/tracks.js';

export const PAINTS = [
  { id: 'ember', name: 'Ember', body: '#e0532a', cost: 0 },
  { id: 'dune', name: 'Dune', body: '#e8b84a', cost: 3 },
  { id: 'sky', name: 'Sky', body: '#3f8fe0', cost: 3 },
  { id: 'mint', name: 'Mint', body: '#3fbf8a', cost: 3 },
  { id: 'plum', name: 'Plum', body: '#9b4fc4', cost: 5 },
  { id: 'ink', name: 'Ink', body: '#2a2a33', cost: 5 },
];
export const RIVALS = [
  { name: 'Tex Mirage', body: '#f2f2f6', skill: .97 },
  { name: 'Mlle Gravillon', body: '#f2c14b', skill: .93 },
  { name: 'Bobo Yeti', body: '#7fd6ff', skill: .9 },
];
/** coppers a medal is worth (the first time a road reaches it) */
export const COPPERS = { 0: 1, 1: 2, 2: 3, 3: 5 };

/** the coppers a new time earns: the difference between the medal it reaches and the best medal already had */
export function coppersFor(medalNow, medalBefore) {
  const now = medalNow === null ? 0 : COPPERS[medalNow], before = medalBefore === null || medalBefore === undefined ? 0 : COPPERS[medalBefore];
  return Math.max(0, now - before);
}

/** a survival round's result: the rivals and the player ranked by how far each got (finish time first, then progress) */
export function rankRound(entries) {
  return entries.slice().sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    if (a.finished && b.finished) return a.ms - b.ms;
    return b.progress - a.progress;
  });
}

/** the survival gauntlet's roads, in order */
export const GAUNTLET = TRACKS.filter(t => t.env === "DUSTBOWL");   // the five Dustbowl roads
