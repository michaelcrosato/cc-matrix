// Small helpers for scenes: say, choose, and a host conversation.
import { Dialogue } from '../ui/dialogue.js';
import { resolveTags } from './lines.js';
import { NEIGHBOURS } from '../data/neighbours.js';
import { CHAR_NAMES } from '../data/names.js';

export const nameOf = (id) => CHAR_NAMES[id] ?? NEIGHBOURS[id]?.name ?? id;
function pages(g, text, extra) {
  const t = resolveTags(text, g, extra);
  return t.split('//').map((s) => s.trim()).filter(Boolean);
}
/** Generator: speak one or more lines as a character, wait for the player. */
export function* say(g, who, lines, { extra = {}, name = null, voice = null, emote = null } = {}) {
  const list = (Array.isArray(lines) ? lines : [lines]).flatMap((l) => pages(g, l, extra));
  let done = false;
  const d = new Dialogue({ who, name: name ?? nameOf(who), voice: voice ?? who, beats: list.map((text, i) => (i === 0 && emote ? { text, emote } : { text })), onDone: () => { done = true; } });
  g.ui.push(d);
  faceTalk(g, who, true);
  while (!done) yield;
  faceTalk(g, who, false);
}
/** Generator: a line and a choice. Returns the index chosen. Back picks the last option. */
export function* ask(g, who, text, choices, { extra = {}, name = null, voice = null } = {}) {
  const list = pages(g, text, extra);
  let done = false;
  let result = -1;
  const d = new Dialogue({ who, name: name ?? nameOf(who), voice: voice ?? who, beats: list, choices, onDone: (c) => { done = true; result = c; } });
  g.ui.push(d);
  faceTalk(g, who, true);
  while (!done) yield;
  faceTalk(g, who, false);
  return result;
}
/** Narration with no speaker. */
export function* narrate(g, text, extra = {}) {
  let done = false;
  g.ui.push(new Dialogue({ who: null, name: '', voice: null, beats: pages(g, text, extra), onDone: () => { done = true; } }));
  while (!done) yield;
}
function faceTalk(g, who, on) {
  const npc = g.npcs?.get?.(who);
  const a = g.actorOf?.(who);
  if (npc) npc.talking = on;
  if (a && on) {
    a.faceToward(g.player.x, g.player.z);
    g.player.faceToward(a.x, a.z);
    a.headLook = null;
  }
}
