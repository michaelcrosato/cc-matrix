/* ---- THE EXTRAS: the Nets lessons and their results, the replays and the highlights reel, the third umpire's screen,
 * and the high-score table with initials. Each is a screen of its own, built on the match's own record. ---- */
G.scenes.nets = {
  enter() {
    const P = G.profile();
    const items = G.LESSONS.map(l => ({ label: l.id + '  ' + l.title + (P.lessons && P.lessons[l.id] ? '  *' : ''), disabled: false }));
    items.push({ label: 'FREE PRACTICE', disabled: false }, { label: 'SIX MACHINE (12 BALLS)', disabled: false }, { label: 'BACK', disabled: false });
    G.netsMenu = new E.Menu(G.game, items, { x: 'center', y: 40, onPick: i => {
      const n = G.LESSONS.length;
      if (i < n) return G.startLesson(G.LESSONS[i]);
      if (i === n) return G.startNets('practice');
      if (i === n + 1) return G.startNets('six');
      return G.game.go('title');
    }, onCancel: () => G.game.go('title') });
  },
  update(dt) { G.netsMenu.update(dt); },
  draw(r) {
    r.sky(['#8fc4ff', '#ffe6b0']);
    r.overlay(g => {
      E.font.title(g, 'NETS', r.W / 2, 6, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      E.font.text(g, 'Eleven lessons, then free practice and the Six Machine. Mrs Crumb keeps the score.', r.W / 2, 28, '#ffffff', { align: 'center', font: 'tiny', outline: '#0b0814' });
    });
    G.netsMenu.draw(r);
    G.footer(r, [['shot', 'START'], ['block', 'BACK']]);
  }
};
// a lesson: a match with its own set-up, passed when its goal is met on the match's record, or failed when its balls run out
G.startLesson = lesson => {
  const cfg = {
    teams: [0, 3], ground: 'green', overs: 30, wickets: 10, kerf: false, batFirst: lesson.bowl ? 1 : 0,
    seed: 500 + lesson.id, humanSides: lesson.bowl || lesson.fielding ? [lesson.bowl ? 0 : 1] : [0],
    machine: lesson.machine || null, mode: 'lesson', lesson: lesson.id, startHype: lesson.startHype || null,
    umpireAccuracy: lesson.umpire, cpuLoft: lesson.cpuLoft, cpuPower: lesson.cpuPower, feedFielder: lesson.feedFielder, bowlX: lesson.bowlX, noCatch: lesson.noCatch
  };
  G.lessonNow = lesson;
  G.startMatch(cfg, { lesson, nets: true, onUpdate: () => {
    const m = G.match;
    if (m.phase === 'end') return;
    if (lesson.goal(m)) { G.lessonPass = true; m.phase = 'end'; m.result = { kind: 'lesson', winner: -1 }; G.endQueued = false; G.matchEnded(m); }
    else if (m.log.length >= lesson.balls) { G.lessonPass = false; m.phase = 'end'; m.result = { kind: 'lesson', winner: -1 }; G.endQueued = false; G.matchEnded(m); }
  } });
};
G.lessonEnded = m => {
  const L = G.lessonNow;
  const P = G.profile();
  P.lessons = P.lessons || {};
  if (G.lessonPass) P.lessons[L.id] = true;
  G.saveProfile(P);
  G.game.go('lessonresult', { lesson: L, passed: !!G.lessonPass, stats: Object.assign({}, m.stats) });
};
G.scenes.lessonresult = {
  enter(d) {
    G.lessonRes = d;
    const next = G.LESSONS.find(l => l.id === d.lesson.id + 1);
    const labels = (next && d.passed ? ['NEXT LESSON'] : []).concat(['TRY AGAIN', 'LESSONS']);
    G.lessonMenu = new E.Menu(G.game, labels, { x: 'center', y: 130, onPick: i => {
      const pick = labels[i];
      if (pick === 'NEXT LESSON') return G.startLesson(next);
      if (pick === 'TRY AGAIN') return G.startLesson(d.lesson);
      return G.game.go('nets');
    }, onCancel: () => G.game.go('nets') });
  },
  update(dt) { G.lessonMenu.update(dt); },
  draw(r) {
    const d = G.lessonRes;
    r.sky(['#2a3a72', '#e8a060']);
    r.overlay(g => {
      E.font.title(g, d.passed ? 'LESSON PASSED' : 'TRY AGAIN', r.W / 2, 20, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      E.font.text(g, d.lesson.id + '  ' + d.lesson.title, r.W / 2, 60, '#ffffff', { align: 'center', outline: '#0b0814' });
      E.font.text(g, d.lesson.text, r.W / 2, 80, '#e8e0f0', { align: 'center', font: 'tiny', outline: '#0b0814', wrap: 300 });
      E.font.text(g, 'Runs ' + (G.match ? G.match.I.runs : 0) + '   Dots ' + (G.match ? G.match.dotRun : 0) + '   Fours ' + d.stats.fours + '   Sixes ' + d.stats.sixes, r.W / 2, 104, '#ffe08a', { align: 'center', font: 'tiny', outline: '#0b0814' });
    });
    G.lessonMenu.draw(r);
    G.footer(r, [['shot', 'SELECT']]);
  }
};

/* ---- THE REPLAY: the last moments of a big play, played back at half speed from the match's own frames ---- */
G.replay = null;
G.requestReplay = (weight, label) => {
  const set = G.setting('replays');
  if (set === 'Never') return;
  if (!G.frameRing || G.frameRing.length < 30) return;
  const clip = { frames: G.frameRing.slice(-150), t: 0, label: label || 'REPLAY', weight, ground: G.mapGround, rigStep: 0 };
  G.highlights = G.highlights || [];
  G.highlights.push(clip);
  G.highlights.sort((a, b) => b.weight - a.weight);
  G.highlights = G.highlights.slice(0, 3);
  G.replay = clip;
};
// the replay: each recorded frame holds every player's state, and the real rigs are posed from those states, in order,
// one frame at a time (each rig steps through the recorded frames, so its walk and its swing are the play's own)
G.drawReplayFrame = (r, clip) => {
  const n = clip.frames.length;
  const idx = clamp(Math.floor(clip.t * 0.5 * 30), 0, n - 1);
  while (clip.rigStep < idx) {
    clip.rigStep++;
    const f = clip.frames[clip.rigStep], pf = clip.frames[clip.rigStep - 1];
    for (const p of f.players) {
      const rig = G.replayRig(p);
      const prev = pf.players.find(q => q.key === p.key) || p;
      rig.update(1 / 30, { x: p.x, y: p.y, z: 0, vx: (p.x - prev.x) * 30, vy: (p.y - prev.y) * 30, facing: p.facing, stance: p.role === 'bat' ? 'ready' : undefined });
    }
  }
  const f = clip.frames[idx];
  if (!f) return;
  for (const p of f.players) {
    const rig = G.replayRig(p);
    const w0 = r.w(p.x, p.y, 0);
    r.actor(p.x, p.y, 0, (g, ox, oy) => {
      rig.draw(g, ox, oy, r.view);
      if (p.bat) G.batInto(g, r, rig, G.batAngleNow(), G.batLiftNow(), (x, y, z) => { const w = r.w(x, y, z); return [ox + w[0] - w0[0], oy + w[1] - w0[1]]; });
    });
  }
  r.overlay(g => {
    const q = r.w(f.ball[0], f.ball[1], f.ball[2]);
    px.disc(g, q[0], q[1], 2, '#c8202a');
    E.font.text(g, clip.label, 6, 6, '#ffffff', { font: 'tiny', outline: '#0b0814' });
    E.font.text(g, 'REPLAY 0.5x', r.W - 6, 6, '#ffe08a', { font: 'tiny', align: 'right', outline: '#0b0814' });
  });
};
// the replay's rigs are their own (keyed apart from the live ones), so the live play is not disturbed
G.replayRig = p => {
  G._rp = G._rp || {};
  const key = 'rp:' + p.key + ':' + p.side + ':' + p.idx;
  if (!G._rp[key]) G._rp[key] = G.rigOf(key, p.side, p.idx);
  return G._rp[key];
};
G.replayTick = dt => {
  if (!G.replay) return false;
  G.replay.t += dt;
  if (G.replay.t >= G.replay.frames.length / 30 * 2) G.replay = null;
  return !!G.replay;
};

/* ---- THE HIGHLIGHTS: the three biggest clips of the match, one after another ---- */
// back to the results of the match the clips came from (or, for a reel opened on its own, the last match's results)
G.hlBack = () => G.game.go('results', G.hlReturn || { kind: 'quick', match: G.match });
G.scenes.highlights = {
  enter() { G.hl = { i: 0, t: 0 }; },
  update(dt) {
    const I = G.game.input;
    if (I.pressed('cancel') || I.pressed('confirm') || I.pressed('shot')) { I.consumeAll(); return G.hlBack(); }
    G.hl.t += dt;
    const c = G.highlights[G.hl.i];
    if (c && G.hl.t > c.frames.length / 30 * 2 + 0.5) { G.hl.i++; G.hl.t = 0; if (G.hl.i >= G.highlights.length) return G.hlBack(); }
  },
  draw(r) {
    r.sky(['#0a0a1e', '#2a2a4a']);
    const c = G.highlights[G.hl.i];
    if (!c) { r.overlay(g => E.font.text(g, 'NO HIGHLIGHTS', r.W / 2, r.H / 2, '#ffffff', { align: 'center', outline: '#0b0814' })); return; }
    if (c.ground) { G.map && G.map.drawFloor(r); }
    G.drawReplayFrame(r, Object.assign({}, c, { t: G.hl.t }));
    r.overlay(g => E.font.text(g, 'HIGHLIGHT ' + (G.hl.i + 1) + ' OF ' + G.highlights.length + '  ·  PRESS ' + (G.game.input.label('shot') || 'J') + ' TO SKIP', r.W / 2, r.H - 12, '#ffe08a', { font: 'tiny', align: 'center', outline: '#0b0814' }));
  }
};

/* ---- THE THIRD UMPIRE: a close run-out goes upstairs. The TV screen shows the call, then the verdict. ---- */
G.thirdUmpire = null;
G.drawThirdUmpire = r => {
  const t = G.thirdUmpire;
  if (!t) return;
  r.overlay(g => {
    E.ui.box(g, r.W / 2 - 84, 66, 168, 62, { bg: ['#101018', '#05050a'], alpha: 0.95 });
    E.font.text(g, 'THIRD UMPIRE', r.W / 2, 72, '#9ad0ff', { font: 'tiny', align: 'center', outline: '#0b0814' });
    const reveal = t.t > 1.2;
    const word = reveal ? (t.out ? 'OUT' : 'NOT OUT') : (Math.floor(t.t * 12) % 2 ? (t.out ? 'NOT OUT' : 'OUT') : (t.out ? 'OUT' : 'NOT OUT'));
    E.font.text(g, word, r.W / 2, 90, reveal ? (t.out ? '#ff6b6b' : '#5fd38a') : '#ffffff', { scale: 2, align: 'center', outline: '#0b0814' });
    if (reveal) E.font.text(g, t.name + ' · by ' + t.margin + ' ms', r.W / 2, 114, '#e8e0f0', { font: 'tiny', align: 'center', outline: '#0b0814' });
  });
};
G.tickThirdUmpire = dt => { if (G.thirdUmpire) { G.thirdUmpire.t += dt; if (G.thirdUmpire.t > 3.2) G.thirdUmpire = null; } };

/* ---- THE HIGH-SCORE TABLE: a Showdown score in the top five asks for initials ---- */
G.tableKey = mode => 'kerfuffle:table:' + mode;
G.tableOf = mode => E.store.get(G.tableKey(mode), []);
G.tableQualifies = (mode, score) => { const t = G.tableOf(mode); return t.length < 5 || score > t[t.length - 1].score; };
G.scenes.initials = {
  enter(d) { G.ini = { mode: d.mode, score: d.score, letters: [0, 0, 0], at: 0 }; },
  update(dt) {
    const I = G.game.input, s = G.ini;
    if (I.pressed('left')) s.at = (s.at + 2) % 3;
    if (I.pressed('right')) s.at = (s.at + 1) % 3;
    if (I.pressed('up')) s.letters[s.at] = (s.letters[s.at] + 1) % 26;
    if (I.pressed('down')) s.letters[s.at] = (s.letters[s.at] + 25) % 26;
    if (I.pressed('confirm') || I.pressed('shot')) {
      I.consumeAll();
      if (s.at < 2) { s.at++; return; }
      const name = s.letters.map(k => String.fromCharCode(65 + k)).join('');
      const t = G.tableOf(s.mode).concat([{ name, score: s.score }]).sort((a, b) => b.score - a.score).slice(0, 5);
      E.store.set(G.tableKey(s.mode), t);
      G.game.go('table', { mode: s.mode });
    }
  },
  draw(r) {
    const s = G.ini;
    r.sky(['#2a2052', '#4a3a72']);
    r.overlay(g => {
      E.font.title(g, 'A TOP FIVE SCORE', r.W / 2, 20, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      E.font.text(g, 'SCORE ' + s.score, r.W / 2, 56, '#ffffff', { align: 'center', outline: '#0b0814' });
      for (let k = 0; k < 3; k++) {
        const x = r.W / 2 - 40 + k * 40, col = k === s.at ? '#ffd23a' : '#e8e0f0';
        px.rect(g, x - 12, 84, 26, 30, '#2a2634');
        E.font.text(g, String.fromCharCode(65 + s.letters[k]), x, 92, col, { scale: 2, outline: '#0b0814' });
      }
      E.font.text(g, 'UP AND DOWN CHANGE A LETTER, LEFT AND RIGHT MOVE', r.W / 2, 128, '#c8c0e0', { align: 'center', font: 'tiny', outline: '#0b0814' });
    });
    G.footer(r, [['shot', 'NEXT'], ['block', 'BACK']]);
  }
};
G.scenes.table = {
  enter(d) { G.tableMode = d.mode; G.tableMenu = new E.Menu(G.game, ['MENU'], { x: 'center', y: 150, onPick: () => G.game.go('title') }); },
  update(dt) { G.tableMenu.update(dt); },
  draw(r) {
    const t = G.tableOf(G.tableMode);
    r.sky(['#2a2052', '#4a3a72']);
    r.overlay(g => {
      E.font.title(g, G.tableMode === 'bat' ? 'BATTING TABLE' : 'BOWLING TABLE', r.W / 2, 14, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      if (!t.length) E.font.text(g, 'NO SCORES YET', r.W / 2, 60, '#ffffff', { align: 'center', outline: '#0b0814' });
      t.forEach((row, k) => E.font.text(g, (k + 1) + '  ' + row.name + '   ' + row.score, r.W / 2 - 70, 50 + k * 16, k === 0 ? '#ffe08a' : '#e8e0f0', { outline: '#0b0814' }));
    });
    G.tableMenu.draw(r);
    G.footer(r, [['shot', 'MENU']]);
  }
};
