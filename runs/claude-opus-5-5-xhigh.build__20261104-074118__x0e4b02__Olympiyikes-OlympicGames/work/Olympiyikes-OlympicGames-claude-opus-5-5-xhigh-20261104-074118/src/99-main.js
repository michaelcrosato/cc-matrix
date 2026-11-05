// Start: boot steps, deep links (#ev/<id>, #scene/<name>, #attract, #poselab/<pose>, #games/day/<n>, #hubcard), the
// game's debug handle (game.debug.snapshot) and window.__oly for tests and tools.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game;

game.debug = {
  snapshot() {
    const ctx = O.Run.ctx, m = O.meet, inEv = game.sceneName && game.sceneName.startsWith('ev:');
    return {
      scene: game.sceneName, mode: m ? m.mode : null, day: m ? m.day : null, event: inEv && ctx ? ctx.def.id : (m && m.events ? m.events[m.day] : null),
      phase: inEv && ctx ? ctx.phase : null, sub: inEv && ctx && ctx.s ? ctx.s.phase || null : null, round: inEv && ctx ? ctx.round : null,
      athletes: inEv && ctx ? ctx.athletes.map(a => ({ id: a.id, nation: a.nation, human: a.human, hype: +(a.hype || 0).toFixed(2), perf: O.aggregate(ctx.def, a), notes: a.notes.slice() })) : [],
      medals: m ? m.medals : null, torches: m ? m.torches : null, party: m ? m.party : null,
      hub: O.Hub ? { active: O.Hub.active, slot: O.Hub.slot, total: O.Hub.total, sent: O.Hub.sentResult } : null,
      dev: O.Dev ? { open: !!O.Dev.isOpen, changed: O.tune.changedAll() } : null,
      attract: !!(O.Attract && O.Attract.on), touchOnly: !!O.touchOnly, errors: game.errors.length
    };
  },
  teleport() {}
};
if (typeof window !== 'undefined') window.__oly = O;

/** a meet with sample data, for deep links and the dev panel's JUMP */
O.sampleMeet = function (ev, scene, day) {
  const m = O.meet = O.flow.newMeet({ mode: 'games', events: O.EVENT_ORDER.slice(), players: [{ nation: 'SUN', input: game.input }] });
  m.day = day !== undefined ? day - 1 : Math.max(0, O.EVENT_ORDER.indexOf(ev || 'sprint'));
  const rnd = E.rng(77);
  for (let d = 0; d <= m.day; d++) { const id = m.events[d]; const res = O.sampleResults(id, rnd); m.results[id] = res; if (d < m.day || scene !== 'results') O.flow.award(res); }
  return m;
};
O.sampleResults = function (id, rnd) {
  const ev = O.EVENTS[id], ids = O.NATION_IDS.slice().sort((a, b) => O.nation(b).skills[id] - O.nation(a).skills[id] + (rnd() - .5) * .2);
  const wr = O.Records.wr(id) || 100, rows = ids.map((n, i) => { const perf = ev.format.type === 'match' ? null : +(ev.measure.better === 'lower' ? wr * (1.02 + i * .025) : wr * (.97 - i * .04)).toFixed(2); return { nation: n, name: O.nation(n).athlete.name, human: n === 'SUN', player: n === 'SUN' ? 0 : null, color: n === 'SUN' ? E.PLAYER_COLORS[0] : O.nation(n).colors.a, perf, display: perf == null ? (i < 2 ? (i ? 'LOST' : 'WON') : '') : ev.measure.fmt(perf), rank: i + 1, medal: i < 3 ? 'gsb'[i] : null, notes: [], points: perf == null ? 1000 - i * 100 : O.points(id, perf) }; });
  return { event: id, rows, records: [], initials: [], mode: 'games' };
};

// deep links
const hash = (typeof location !== 'undefined' && location.hash || '').replace(/^#/, '');
let first = 'title', firstData = {};
const parts = hash.split('/');
if (!O.inHub) {
  if (parts[0] === 'ev' && O.EVENTS[parts[1]]) { O.meet = O.flow.quickMeet(parts[1]); if (parts[2] === 'attract') { O.meet = O.flow.newMeet({ mode: 'attract', events: [parts[1]], players: [] }); O.meet.featured = 0; } first = 'ev:' + parts[1]; }
  else if (parts[0] === 'scene' && O.scenes[parts[1]]) { first = parts[1]; if (['results', 'podium', 'medals', 'eventCard', 'dayCard', 'torch', 'closing', 'beat', 'initials', 'opening'].includes(parts[1])) O.sampleMeet(parts[2], parts[1]); if (parts[1] === 'beat') firstData = { id: parts[2] || 'halftime', then: 'next' }; }
  else if (parts[0] === 'attract') { first = 'title'; O.startAttractAtBoot = true; }
  else if (parts[0] === 'poselab') { first = 'poselab'; firstData = { pose: parts[1] }; }
  else if (parts[0] === 'games' && parts[1] === 'day') { O.sampleMeet(null, 'day', +parts[2] || 1); first = 'dayCard'; }
  else if (parts[0] === 'hubcard' && O.Hub) { first = 'hubCard'; O.Hub.offline(); }
}
const boot = {
  title: 'OLYMPIYIKES!', version: O.VERSION,
  steps: [
    ['Inflating the blimp', () => { O.NATIONS.forEach(n => O.Art.flagCanvas(n.id, 21, 14)); }],
    ['Waxing the skis', () => { for (const id in O.EVENTS) if (O.EVENTS[id].prebuild) O.EVENTS[id].prebuild(); }],
    ['Teaching the crowd to wave', () => { O.Anthem.song('SUN'); }],
    ['Calming the mascot', () => { if (O.Hub && O.inHub) return O.Hub.boot(); }]
  ],
  messages: ['Inflating the blimp', 'Waxing the skis', 'Teaching the crowd to wave', 'Calming the mascot', 'Polishing the medals', 'Tuning the starter\'s gun']
};
if (O.inHub) first = 'hubSplash';
game.start({ scenes: O.scenes, scene: first, boot });
if (first !== 'title' && Object.keys(firstData).length) game.go(first, firstData, { fade: 0 });
if (O.startAttractAtBoot) game.after(.5, () => O.Attract.begin('title'));
})();
