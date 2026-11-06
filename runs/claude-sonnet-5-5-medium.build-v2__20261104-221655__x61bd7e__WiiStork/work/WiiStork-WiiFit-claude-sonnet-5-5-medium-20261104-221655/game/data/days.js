// The five days. `open`: activities that day unlocks (cumulative). A designer edits the table.
window.G.DAYS = [
  { n: 1, name: 'Orientation', open: ['stork', 'squat', 'step', 'tray'], goal: 'Do three things, gently.' },
  { n: 2, name: 'Improvement', open: ['flow', 'pushup', 'hoop', 'laundry'], goal: 'Get two stars today. Gertrude may nod.' },
  { n: 3, name: 'The Plateau', open: ['candle', 'lunge', 'jog', 'slalom'], goal: 'Nothing will move. Do it anyway.', hold: true },
  { n: 4, name: "Tare's Day", open: [], goal: 'Tiers open. Tare has a thing to do.', tier2: true, recal: true },
  { n: 5, name: 'The Gentle Games', open: [], goal: 'The last day. Be here for it.', games: true }
];
G.isOpen = id => { const S = G.S; if (S.free || S.day > 5) return true; let ok = false; for (const d of G.DAYS) if (d.n <= S.day && d.open.includes(id)) ok = true; return ok; };
G.openDay = id => { const d = G.DAYS.find(d => d.open.includes(id)); return d ? d.n : 1; };
G.tier2Open = () => G.S.free || G.S.day >= 4;
// Spine Age shown at this morning's check: held on day 3, then catches up
G.checkAge = () => { const S = G.S, A = G.spineAge(), prev = S.spine.length ? S.spine[S.spine.length - 1] : 71; const shown = S.day === 3 ? prev : A; S.spine[Math.min(S.spine.length, 7)] === undefined; S.spine.push(shown); if (S.spine.length > 8) S.spine.shift(); S.shownAge = shown; return { shown, prev, true: A }; };
G.suggestFor = day => { const o = G.actList.filter(a => G.isOpen(a.id)); return o.length ? o[(day * 7 + 3) % o.length].id : 'stork'; };
