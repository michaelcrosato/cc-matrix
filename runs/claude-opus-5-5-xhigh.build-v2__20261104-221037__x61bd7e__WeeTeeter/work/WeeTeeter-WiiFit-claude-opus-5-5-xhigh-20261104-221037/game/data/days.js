/* data/days.js: the five days. opens: activities that open that morning. Add a day here with no code. */
(() => {
const G = window.G;
G.DATA.days = [
  { day: 1, name: 'Orientation', opens: ['stork', 'squat', 'step', 'tray'], guided: 'stork' },
  { day: 2, name: 'Improvement', opens: ['flow', 'pushup', 'hoop', 'laundry'], nod: true },
  { day: 3, name: 'The Plateau', opens: ['candle', 'lunge', 'jog', 'slalom'], hold: true },
  { day: 4, name: "Tare's Day", opens: [], tier2: true, catchUp: true, scene: 'tareday' },
  { day: 5, name: 'The Gentle Games', opens: [], tier2: true, games: true, shortCheck: true },
  { day: 6, name: 'After', opens: [], tier2: true, after: true }
];
G.DATA.dayOf = d => G.DATA.days[Math.min(d, G.DATA.days.length) - 1];
G.DATA.openOn = id => { const row = G.DATA.days.find(d => d.opens.includes(id)); return row ? row.day : 1; };
G.DATA.games = { list: ['stork', 'step', 'slalom'], dur: 30, duel: 90 };
})();
