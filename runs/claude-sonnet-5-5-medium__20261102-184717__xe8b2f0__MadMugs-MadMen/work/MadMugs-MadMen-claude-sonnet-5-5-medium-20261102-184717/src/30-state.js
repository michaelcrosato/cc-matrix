// ---------------------------------------------------------------------------------------------------------------------
// STATE: the day, your four numbers, who trusts you, what you carry, what you know. Everything saves from here.
// ---------------------------------------------------------------------------------------------------------------------
const BASE = () => ({
  mode: 'walk', min: MIN_START, stats: { nerve: 3, heart: 3, polish: 3, haze: 0 }, rel: { dot: 0, walt: 0, teddy: 0, hollis: 0, lorraine: 0 },
  items: { lighter: true }, cards: {}, flags: {}, visits: {}, tagline: null, interest: 30, hazeClock: 0, ending: null, score: 0, round: 0, used: {}, strikes: 0, pops: []
});
let S = BASE();
const STAT_NAMES = { nerve: 'NERVE', heart: 'HEART', polish: 'POLISH', haze: 'HAZE' };
const STAT_COLORS = { nerve: '#f0a05a', heart: '#f08aa0', polish: '#8ac0f0', haze: '#c8a8e8' };
const stat = k => clamp(S.stats[k] + (k === 'polish' && S.items.layout ? 2 : 0) + (k === 'nerve' && S.items.photo ? 1 : 0), 0, 12);
function pop(text, color) { S.pops.push({ text, color: color || '#fff', t: 0 }); if (S.pops.length > 6) S.pops.shift(); }
function addStat(k, d) {
  const old = S.stats[k]; S.stats[k] = clamp(old + d, 0, 10);
  if (S.stats[k] !== old) pop((d > 0 ? '+' : '') + (S.stats[k] - old) + ' ' + STAT_NAMES[k], STAT_COLORS[k]);
}
function giveItem(id) { if (S.items[id]) return; S.items[id] = true; game.audio.sfx('pickup'); pop('GOT: ' + ITEMS[id].name.toUpperCase(), '#ffe9a8'); }
function giveCard(theme, strong) {
  const had = S.cards[theme];
  if (had) { if (strong && !had.strong) { had.strong = true; pop(THEMES[theme].name + ' CARD: STRONGER', THEMES[theme].color); } return; }
  S.cards[theme] = { strong: !!strong }; game.audio.sfx('powerup'); pop('NEW CARD: ' + THEMES[theme].name, THEMES[theme].color);
}
function addRel(id, d) { const old = S.rel[id]; S.rel[id] = clamp(old + d, -2, 3); if (S.rel[id] !== old) pop(PEOPLE[id].name + (d > 0 ? ' TRUSTS YOU MORE' : ' TRUSTS YOU LESS'), d > 0 ? '#aee8b0' : '#f0a090'); }
function applyFx(fx) {
  if (!fx) return;
  for (const k of ['nerve', 'heart', 'polish', 'haze']) if (fx[k]) addStat(k, fx[k]);
  if (fx.rel) for (const id in fx.rel) addRel(id, fx.rel[id]);
  if (fx.give) giveItem(fx.give);
  if (fx.card) Array.isArray(fx.card) ? giveCard(fx.card[0], fx.card[1]) : giveCard(fx.card, false);
  if (fx.flag) S.flags[fx.flag] = true;
  if (fx.time) addTime(fx.time);
}
// ---- the clock: every action costs minutes; haze wears off an hour at a time -------------------------------------------
function addTime(m) {
  S.min += m; S.hazeClock += m;
  while (S.hazeClock >= 60) { S.hazeClock -= 60; if (S.stats.haze > 0) { S.stats.haze--; pop('-1 HAZE (TIME PASSES)', STAT_COLORS.haze); } }
  refreshSchedule(true); wantAutosave = true;
}
function refreshSchedule(walk) { for (const id of NPC_IDS) setNpcSpot(id, spotFor(id, S.min), walk); }
const cardCount = () => Object.keys(S.cards).length;
function objective() {
  if (S.mode === 'ending') return '';
  if (!S.flags.briefed) return 'Hollis wants a word. His office is at the north end.';
  if (S.flags.arrived) return 'Garland is waiting in the conference room. (' + fmtTime(MIN_PITCH) + ')';
  const ready = cardCount() >= 3 && S.tagline;
  if (!S.tagline && cardCount() >= 2) return 'Write the line at your desk (the typewriter). Cards: ' + cardCount() + ' of 5.';
  if (ready) return 'Find more to say, or take a breath. Garland comes at 3:30.';
  return 'Learn what Garland wants. Cards: ' + cardCount() + ' of 5. He arrives at ' + fmtTime(MIN_ARRIVE) + '.';
}
function computeScore() {
  const relSum = Object.values(S.rel).reduce((a, b) => a + Math.max(0, b), 0);
  const base = Math.round(S.interest * 8) + (stat('nerve') + stat('heart') + stat('polish')) * 12 - S.stats.haze * 15 + relSum * 20 + cardCount() * 25;
  const bonus = { handshake: 400, account: 300, maybe: 120, lost: 0, spill: -50, elevator: -100 }[S.ending] || 0;
  return Math.max(0, base + bonus);
}
function decideEnding() {
  if (S.stats.haze >= 8) return 'spill';
  if (S.interest >= 70) return (stat('heart') >= 5 && S.rel.hollis >= 1 && !S.flags.leanedStatus) ? 'handshake' : 'account';
  if (S.interest >= 48) return 'maybe';
  return 'lost';
}
// ---- save and load (the pause menu's slots) -----------------------------------------------------------------------------
function snapshot() {
  return JSON.parse(JSON.stringify({ S: Object.assign({}, S, { pops: [] }), hero: [hero.x, hero.y, hero.facing], npcs: NPC_IDS.map(id => [id, npcs[id].spot]) }));
}
function restore(data) {
  S = Object.assign(BASE(), data.S, { pops: [] }); S.mode = 'walk';
  hero.x = data.hero[0]; hero.y = data.hero[1]; hero.facing = data.hero[2]; hero.vx = hero.vy = 0;
  for (const [id, spot] of data.npcs) placeNpc(id, spot);
  refreshSchedule(false);
}
game.saves.write = () => ({ data: snapshot(), place: 'Hollis, Pratt & Vane', level: fmtTime(S.min) });
game.saves.read = save => { if (save && save.data) { pendingLoad = save.data; game.go('play', { load: true }); } };
let pendingLoad = null;
