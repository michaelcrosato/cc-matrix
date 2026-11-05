/* ---- THE GAUNT: the dungeon's own voice. Short, booming, third person, darkly funny. A queue with three priorities
   (3 critical: dying, starving, deaths, the Tithe; 2 events; 1 tips); one line every 1.2 s at most; a higher priority cuts
   a tip; health lines once per hero per 20 s; teaching tips once per game, and kept for the next game ---- */
const NARR = { queue: [], caption: null, last: -9, cool: {}, heard: null, lastKey: null, count: 0 };
const TIP_KEYS = /^tip_|_first$/;
function narratorHeard() {
  if (!NARR.heard) NARR.heard = new Set(E.store.get('gd:tips', []));
  return NARR.heard;
}
bus.on('say', ({ key, hero, prio, vars }) => {
  prio = prio || (TIP_KEYS.test(key) ? 1 : 2);
  if (prio === 1) { if (!game.settings.tips || narratorHeard().has(key)) return; }
  const cid = key + (/fading|starving|dying/.test(key) && hero ? hero.id : '');
  if (NARR.cool[cid] && game.real < NARR.cool[cid]) return;
  NARR.cool[cid] = game.real + (/fading|starving|dying/.test(key) ? 20 : prio === 1 ? 999 : 4);
  const cls = hero ? (SESSION && hero.name ? hero.name : hero.D.name) : null;
  const text = line(key, cls, vars);
  if (NARR.queue.some(q => q.text === text)) return;
  NARR.queue.push({ key, text, prio, at: game.real, color: hero ? hero.color : null });
  NARR.queue.sort((a, b) => b.prio - a.prio || a.at - b.at);
  if (NARR.queue.length > 4) NARR.queue.length = 4;
  if (NARR.caption && NARR.caption.prio === 1 && prio > 1) NARR.caption.end = Math.min(NARR.caption.end, game.real + .2);
});
/** each step (real time, so a paused game holds the caption) */
function stepNarrator(dt) {
  const c = NARR.caption;
  if (c) { c.t += dt; if (game.real >= c.end) NARR.caption = null; }
  if (NARR.caption || game.real - NARR.last < 1.2 || !NARR.queue.length) return;
  const q = NARR.queue.shift();
  if (game.real - q.at > 6 && q.prio < 3) return;   // stale
  const len = q.text.length;
  NARR.caption = { text: q.text, prio: q.prio, t: 0, end: game.real + Math.max(2.4, len * .065), color: q.prio === 3 ? '#ffb0a0' : null };
  NARR.last = game.real; NARR.lastKey = q.key; NARR.count++;
  if (q.prio === 1) { const H = narratorHeard(); H.add(q.key); E.store.set('gd:tips', [...H]); }
  speak(q.text, 'gaunt');
}
function clearNarrator() { NARR.queue.length = 0; NARR.caption = null; }
