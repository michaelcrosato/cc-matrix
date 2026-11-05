// SNIPEOUT HD: the Season 2161 campaign. Four tiers of events, the Grand Prix, unlock rules, and how each event's
// result becomes a medal.
(() => {
const SN = globalThis.SN;
SN.SEASON = {
  tiers: [
    { id: 't1', name: 'ROOKIE LICENCE', cls: 'SPARK', events: ['e1', 'e2', 'e3', 'e4'], rule: 'OPEN', need: null },
    { id: 't2', name: 'AUTHORITY NOTICE', cls: 'FLARE', events: ['e5', 'e6', 'e7', 'e8'], rule: '3 MEDALS IN THE ROOKIE LICENCE', need: { tier: 't1', medals: 3 } },
    { id: 't3', name: 'STORM WARNING', cls: 'STORM', events: ['e9', 'e10'], rule: '3 MEDALS IN THE AUTHORITY NOTICE', need: { tier: 't2', medals: 3 } },
    { id: 't4', name: 'GRAND PRIX', cls: 'STORM', events: ['gp'], rule: 'A MEDAL IN BOTH STORM WARNING EVENTS', need: { events: ['e9', 'e10'] } }
  ],
  events: {
    e1: { id: 'e1', name: 'ACADEMY', mode: 'academy', track: 'solenne', cls: 'SPARK', target: 'All drills first try / 3 retries or fewer / complete' },
    e2: { id: 'e2', name: 'HARBOUR SPRINT', mode: 'race', track: 'solenne', cls: 'SPARK', laps: 3, target: '1st / 2nd / 3rd' },
    e3: { id: 'e3', name: 'GORGE CLOCK', mode: 'timetrial', track: 'karakum', cls: 'SPARK', laps: 3, target: 'Medal times' },
    e4: { id: 'e4', name: 'RED BASIN RACE', mode: 'race', track: 'karakum', cls: 'SPARK', laps: 3, target: '1st / 2nd / 3rd' },
    e5: { id: 'e5', name: 'STACK SNIPEOUT', mode: 'snipeout', track: 'meridian', cls: 'FLARE', target: 10, targetText: 'First to 10: 1st / 2nd / 3rd' },
    e6: { id: 'e6', name: 'COMPLIANCE TRIAL', mode: 'overclock', track: 'solenne', cls: 'SPARK', target: 'Zone 30 / 20 / 10' },
    e7: { id: 'e7', name: 'BOARDROOM LAP', mode: 'hotlap', track: 'meridian', cls: 'FLARE', target: 'Medal lap times' },
    e8: { id: 'e8', name: 'QWIK-FUEL CUP', mode: 'race', track: 'meridian', cls: 'FLARE', laps: 3, target: '1st / 2nd / 3rd' },
    e9: { id: 'e9', name: 'POLAR RUN', mode: 'race', track: 'borealis', cls: 'STORM', laps: 3, target: '1st / 2nd / 3rd' },
    e10: { id: 'e10', name: 'CANYON REMATCH', mode: 'snipeout', track: 'karakum', cls: 'STORM', target: 12, targetText: 'First to 12: 1st / 2nd / 3rd' },
    gp: { id: 'gp', name: 'HOVERLINE GRAND PRIX', mode: 'gp', tracks: ['solenne', 'karakum', 'meridian', 'borealis'], cls: 'STORM', laps: 3, target: 'Champion / 2nd / 3rd overall' }
  },
  gpPoints: [10, 8, 6, 5, 4, 3, 2, 1]
};
SN.MEDALS = ['gold', 'silver', 'bronze'];
SN.medalRank = m => m === 'gold' ? 3 : m === 'silver' ? 2 : m === 'bronze' ? 1 : 0;
/** the medal a result earns in an event (or a quick mode): 'gold' | 'silver' | 'bronze' | null */
SN.medalFor = (mode, res, o = {}) => {
  if (mode === 'race' || mode === 'snipeout' || mode === 'gp' || mode === 'season' || mode === 'versus' || mode === 'hub') { const p = res.place; return p === 1 ? 'gold' : p === 2 ? 'silver' : p === 3 ? 'bronze' : null; }
  if (mode === 'overclock') { const z = res.zone || 0; return z >= 30 ? 'gold' : z >= 20 ? 'silver' : z >= 10 ? 'bronze' : null; }
  if (mode === 'academy') return res.academyMedal || null;
  if (mode === 'timetrial' || mode === 'hotlap') {
    const m = SN.medalTimes(o.track, o.cls, mode), t = mode === 'hotlap' ? res.bestLap : res.time;
    if (!m || !isFinite(t)) return null; return t <= m[0] ? 'gold' : t <= m[1] ? 'silver' : t <= m[2] ? 'bronze' : null;
  }
  return null;
};
/** medal times for a track, class and mode: [gold, silver, bronze] seconds (measured: SN.MEDAL_TIMES, else from the
 *  track's ideal line with the same ratios) */
SN.medalTimes = (track, cls, mode) => {
  const m = SN.MEDAL_TIMES[track + '/' + cls + '/' + mode]; if (m) return m;
  const T = SN.getTrack(track), lap = T.idealLap(cls) * 1.06, base = mode === 'hotlap' ? lap : lap * 3 + 2.5;
  return [+(base * 1.04).toFixed(1), +(base * 1.10).toFixed(1), +(base * 1.20).toFixed(1)];
};
})();
