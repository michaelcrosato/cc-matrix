/* ---- NETS, THE SUPER OVER SHOWDOWN and THE ATTRACT SHOWREEL. Nets is practice against the machine, and the Six
 * Machine challenge (twelve balls, a score). The Showdown is six balls batting or a defended fourteen, with a best
 * score kept. Attract runs CPU matches on the real machinery, with cheats, until any input ends it. ---- */
const MACHINE_ALL = ['express', 'yorker', 'outswing', 'inswing', 'legbreak', 'googly', 'offbreak', 'dobber', 'cutter', 'bouncer'];
G.startNets = mode => {
  const six = mode === 'six';
  const cfg = { teams: [0, 3], ground: 'green', overs: six ? 2 : 99, wickets: 10, kerf: false, batFirst: 0, seed: six ? 91 : 92,
    humanSides: [0], machine: six ? ['express', 'outswing', 'legbreak', 'bouncer', 'yorker', 'dobber'] : MACHINE_ALL, mode: six ? 'six' : 'practice', preset: 'balanced' };
  G.startMatch(cfg, { nets: true, six });
};

/* ---- SHOWDOWN: bat six balls against the machine, or defend fourteen against Kev Malone's slog ---- */
G.scenes.showdown = {
  enter() {
    G.showMenu = new E.Menu(G.game, ['BAT: SIX BALLS', 'BOWL: DEFEND 14', 'BACK'], { x: 'center', y: 96, onPick: i => {
      if (i === 2) return G.game.go('title');
      G.startShowdown(i === 0 ? 'bat' : 'bowl');
    }, onCancel: () => G.game.go('title') });
  },
  update(dt) { G.showMenu.update(dt); },
  draw(r) {
    const best = E.store.get('kerfuffle:showdown:best', {});
    r.sky(['#2a2052', '#4a3a72']);
    r.overlay(g => {
      E.font.title(g, 'SUPER OVER', r.W / 2, 14, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      E.font.text(g, 'BEST BATTING ' + (best.bat || 0) + '   BEST BOWLING ' + (best.bowl || 0), r.W / 2, 42, '#ffe08a', { align: 'center', font: 'tiny', outline: '#0b0814' });
    });
    G.showMenu.draw(r);
    G.footer(r, [['shot', 'SELECT'], ['block', 'BACK']]);
  }
};
G.startShowdown = mode => {
  G.showMode = mode;
  const cfg = mode === 'bat'
    ? { teams: [0, 3], ground: 'bay', overs: 1, wickets: 2, kerf: true, batFirst: 0, seed: 404, humanSides: [0], machine: ['express', 'bouncer', 'yorker', 'dobber', 'express', 'bouncer'], mode: 'showdown', singleInnings: true }
    : { teams: [0, 3], ground: 'hall', overs: 1, wickets: 2, kerf: true, batFirst: 1, seed: 505, humanSides: [0], mode: 'showdown', singleInnings: true };
  G.startMatch(cfg, { showdown: true });
};
// the showdown's score: the runs off the bat, or fourteen less the runs conceded, times ten, plus wickets times twenty-five
G.showdownScore = m => {
  const inn = m.innings[0];
  if (G.showMode === 'bat') return inn.runs;
  const runs = inn.runs;
  const wk = inn.wkts;
  return Math.max(0, (14 - runs) * 10 + wk * 25);
};

/* ---- ATTRACT: the showreel. CPU matches on the real machinery, a segment per ground. ---- */
G.ATTRACT = G.ATTRACT_CHAIN;   // the ten segments of the showreel (10-data.js)
G.attractSeg = 0;
G.scenes.attract = {
  enter() {
    const seg = G.ATTRACT[G.attractSeg % G.ATTRACT.length];
    G.attractSeg++;
    G.startAttractSegment(seg);
  }
};
G.startAttractSegment = seg => {
  const cfg = { teams: seg.teams, ground: seg.ground, overs: 3, wickets: 5, kerf: true, batFirst: 0, seed: 300 + G.attractSeg * 17,
    humanSides: [], autoBat: true, autoBowl: true, bowlScatter: 1.2, mode: 'attract' };   // the CPU bowls tight to the stumps, so the batters are beaten for wickets as well as runs
  G.attractT = 0;
  G.attractNote = seg.note;
  G.startMatch(cfg, { attract: true, onUpdate: dt => {
    G.attractT += dt;
    if (G.attractT > 90 && G.match.phase !== 'end') { G.match.phase = 'end'; G.match.result = G.match.result || { kind: 'tie', winner: -1 }; G.matchEnded(G.match); }
  } });
};
G.attractInput = I => {
  if (I.anyPressed() || (I.mouse && G.mouseMoved(I))) { I.consumeAll(); G.game.go('title', null, { fade: 0 }); }
};
G.attractDraw = r => {
  r.overlay(g => {
    const blink = Math.floor(G.game.time * 2) % 2;
    E.font.text(g, G.attractNote || '', 6, 6, '#ffe08a', { font: 'tiny', outline: '#0b0814' });
    if (blink) E.font.text(g, 'DEMO', r.W / 2, r.H - 26, '#ffffff', { align: 'center', outline: '#0b0814' });
    E.font.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H - 14, '#ffe08a', { align: 'center', font: 'tiny', outline: '#0b0814' });
  });
};
