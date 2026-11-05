// 43-screens.js: the screens around the play (plan 4.14): the title, the main menu, stage select, difficulty, the
// briefing, the results, game over with initials, the records, the about pages, how to play, and the touch-only
// notice. Menus are E.Menu (hover, click, keys and pad all work); the rest are drawn in our own frame with the
// engine's font. Text is 10-foot sized: the smallest is scale 1 of a 240-line screen.

TC.PALETTE = { bg: ['#10244a', '#081428'], accent: '#3aa0e8', text: '#f4f7ff', gold: '#ffd36a', warn: '#ff3b30', dim: '#8aa0c0' };

// A framed panel for a screen's body.
TC.panel = function (g, x, y, w, h) {
  if (E.ui && E.ui.box) E.ui.box(g, x, y, w, h, { bg: TC.PALETTE.bg, border: TC.PALETTE.accent });
  else { g.fillStyle = TC.PALETTE.bg[1]; g.fillRect(x, y, w, h); }
};

// The title: "SUBLIME" in white and blue, a big "3" in fire colours, the wave band and the version (plan 4.14).
TC.drawLogo = function (g, W, t) {
  if (!E.font || !E.font.title) return;
  E.font.title(g, 'SUBLIME', W / 2, 26, { scale: 3, colors: ['#ffffff', '#9fe3ff', '#3aa0e8', '#1a4f9c'], outline: '#08142a', depth: 2, align: 'center' });
  E.font.title(g, 'CRISIS 3', W / 2, 52, { scale: 2, colors: ['#ffffff', '#9fe3ff', '#3aa0e8', '#1a4f9c'], outline: '#08142a', depth: 2, align: 'center' });
  const wave = 4 + Math.sin(t * 2) * 2;
  g.fillStyle = '#ffb347'; g.globalAlpha = 0.85;
  for (let x = 0; x < W; x += 4) g.fillRect(x, 74 + Math.round(Math.sin(x * 0.06 + t * 2.4) * wave * 0.6), 4, 2);
  g.globalAlpha = 1;
};

// Count-up numbers: the value that a stat shows at time t of its count (0..1 over the count).
TC.countUp = function (v, t) { return Math.round(v * TC.clamp(t, 0, 1)); };

// The results screen's stats for one player row.
TC.resultRows = function (result) {
  return result.rows.map(r => ({ id: r.id, name: r.name, rank: r.rank, score: r.score, acc: r.acc, kills: r.kills,
    headshots: r.headshots, saves: r.saves, lost: r.lost, quick: r.quick, bestChain: r.bestChain, total: r.total,
    accBonus: r.accBonus, noDamage: r.noDamage, continues: r.continues, time: r.time, shots: r.shots, hits: r.hits }));
};

// Device-aware how-to text: the labels of this player's device, read at draw time.
TC.howtoLines = function (seat) {
  const L = a => TC.labelFor(seat, a) || '?';
  return [
    ['Aim', 'Mouse, or the right stick (or the arrow keys)'],
    ['Fire', L('fire')],
    ['Take cover (hold)', L('cover')],
    ['Quick reload (in cover)', L('reload')],
    ['Next / previous weapon', L('next') + ' / ' + L('prev')],
    ['Weapons 1-4', '1 2 3 4'],
    ['Pause', 'Escape or Start'],
  ];
};

// The about pages, from the About data (the same data the exit interview is written from).
TC.aboutPages = function () {
  const A = TC_ABOUT || {};
  const kv = o => Object.keys(o || {}).map(k => k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()) + ': ' + o[k]);
  return [
    { title: 'CREDITS', lines: [
      'Sublime Crisis 3 is an original game inspired by Time Crisis 3 (Namco, 2003).',
      'Built on my-3D2dge v0.85.2 (the handoff engine, patched), with its own software renderer.',
      'Music, sound and voices are written in code. No audio files. Animalese voices.',
      'Multiplayer: AI Hub session protocol v1, shared world, 1-4 players.',
    ] },
    { title: 'SOURCE INFORMATION', lines: kv(A.sourceInformation) },
    { title: 'TESTING FEEDBACK', lines: A.testingFeedback || [] },
    { title: 'ENGINE FEEDBACK', lines: A.engineFeedback || [] },
    { title: 'PROMPT FEEDBACK', lines: A.promptFeedback || [] },
    { title: 'THANKS', lines: [A.thanks || 'Thanks to the CREST field team, and to everyone who held a pad for the demo.'] },
  ];
};

// Touch-only devices: no touch controls, a notice, and the settings button. A key press or a pad unlocks the title.
TC.touchOnly = function () {
  if (typeof matchMedia === 'undefined') return false;
  return !matchMedia('(any-pointer: fine)').matches && !matchMedia('(any-hover: hover)').matches;
};
