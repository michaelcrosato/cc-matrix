/* 62-over: everyone down -> CONTINUE? 10 -> (rise) or GAME OVER -> initials for each qualifying player (on their own
 * controller) -> the table -> the title. And the ending: the King falls, the heroes cheer, the credits roll, Descent II. */

scenes.over = {
  view: 'threequarter', touch: [],
  enter() { SC.over = { t: 0, phase: 'cont', n: 10, entries: [], cur: null }; NARR.speak(LINES.continue); music(null); },
  update(dt) {
    const o = SC.over; o.t += dt;
    if (o.phase === 'cont') {
      o.n = Math.max(0, 10 - Math.floor(o.t));
      if (o.t > .6 && game.players.some(p => p.pressed('fire') || p.pressed('start') || p.pressed('confirm'))) {
        for (const h of PARTY) { h.alive = false; riseHero(h); }
        for (const h of PARTY) { const s = W.p.starts[h.pi % W.p.starts.length]; h.x = s.x; h.y = s.y; h.body.x = s.x; h.body.y = s.y; }
        game.go('play', {}); return;
      }
      if (o.t >= 10) { o.phase = 'over'; o.t = 0; NARR.speak(LINES.game_over); music('over'); }
      return;
    }
    if (o.phase === 'over') {
      if (o.t > 3) {
        o.phase = 'enter'; o.t = 0;
        o.entries = RUN.cheated || anyCheat() ? [] : PARTY.filter(h => SCORES.qualifies(h.score)).map(h => ({ h, name: [0, 0, 0], i: 0, done: false }));
        if (o.entries.length) { music('name'); NARR.speak(LINES.high_score); } else { game.go('scores', { back: 'title' }); }
      }
      return;
    }
    // initials: each qualifying player on their own controller (or keyboard half)
    const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!? ';
    for (const e of o.entries) {
      if (e.done) continue;
      const inp = e.h.input || game.input;
      if (inp.repeat('up', .3, .1)) { e.name[e.i] = (e.name[e.i] + 1) % ALPHA.length; happen('ui', { k: 'move' }); }
      if (inp.repeat('down', .3, .1)) { e.name[e.i] = (e.name[e.i] + ALPHA.length - 1) % ALPHA.length; happen('ui', { k: 'move' }); }
      if (inp.pressed('left') && e.i > 0) e.i--;
      if ((inp.pressed('right') || inp.pressed('fire') || inp.pressed('confirm')) && o.t > .4) {
        if (e.i < 2) e.i++; else { e.done = true; const t = Date.now() + e.h.pi; e.t = t; SCORES.add({ name: e.name.map(k => ALPHA[k]).join(''), score: e.h.score, cls: e.h.cls, floor: RUN.deepest, cont: e.h.continues, t }); happen('ui', { k: 'pick' }); }
      }
      if (inp.pressed('cancel') && e.i > 0) e.i--;
    }
    if (o.entries.every(e => e.done)) game.go('scores', { back: 'title', hi: o.entries[0].t });
  },
  draw(r) {
    drawWorld(r);
    r.overlay(g => {
      const o = SC.over, W0 = r.W, H0 = r.H;
      E.ui.box(g, W0 / 2 - 140, H0 / 2 - 60, 280, 120, { bg: ['#2a0a0a', '#0a0202'], border: '#c83a2a', alpha: .92 });
      if (o.phase === 'cont') {
        E.font.title(g, 'CONTINUE?', W0 / 2, H0 / 2 - 48, { scale: 3, colors: ['#ffe0c0', '#e85a3a', '#8a1a0a'], outline: '#120404', depth: 2, align: 'center' });
        E.font.title(g, String(o.n), W0 / 2, H0 / 2 - 14, { scale: 4, colors: ['#ffffff', '#ffd36a', '#c87a2a'], outline: '#120404', depth: 2, align: 'center' });
        otxt(g, 'PRESS ' + game.input.label('fire') + ' TO RISE AGAIN', W0 / 2, H0 / 2 + 30, '#f0e0c8', { align: 'center' });
        txt(g, 'Every hero rises with ' + startHealth() + ' life force. Scores are kept.', W0 / 2, H0 / 2 + 44, '#a89880', { align: 'center' });
      } else if (o.phase === 'over') {
        E.font.title(g, 'GAME OVER', W0 / 2, H0 / 2 - 30, { scale: 3, colors: ['#ffe0c0', '#e85a3a', '#8a1a0a'], outline: '#120404', depth: 2, align: 'center' });
        otxt(g, LINES.game_over, W0 / 2, H0 / 2 + 10, '#f0e0c8', { align: 'center', scale: 1 });
      } else {
        const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!? ';
        otxt(g, 'NAME THYSELF, MORSEL', W0 / 2, H0 / 2 - 52, '#ffe08a', { align: 'center', scale: 2 });
        o.entries.forEach((e, k) => {
          const x = W0 / 2 + (k - (o.entries.length - 1) / 2) * 66, y = H0 / 2 - 20;
          txt(g, e.h.D.name, x, y - 8, e.h.color, { align: 'center' });
          for (let q = 0; q < 3; q++) { const on = q === e.i && !e.done; if (on) { txt(g, '▲', x - 18 + q * 18, y + 2, '#ffe08a', { align: 'center' }); txt(g, '▼', x - 18 + q * 18, y + 30, '#ffe08a', { align: 'center' }); } otxt(g, ALPHA[e.name[q]], x - 18 + q * 18, y + 12, on ? '#ffffff' : '#c8b8a0', { align: 'center', scale: 2 }); }
          txt(g, String(e.h.score), x, y + 42, '#ffe08a', { align: 'center' });
          if (e.done) txt(g, 'SAVED', x, y + 52, '#7ae87a', { align: 'center' });
        });
        txt(g, '↑↓ letter   → / ' + game.input.label('fire') + ' next', W0 / 2, H0 / 2 + 50, '#a89880', { align: 'center' });
      }
    });
  }
};

/* ---- the ending, the credits and Descent II ---- */
scenes.ending = {
  view: 'threequarter', touch: [],
  enter() {
    SC.end = { t: 0, rigs: PARTY.map(h => h.D.rig()), phase: 'story' };
    music('ending'); store.set('d2', true);
    NARR.speak(STORY.ending);
    if (!RUN.cheated && !anyCheat() && !SESSION) for (const h of PARTY) if (SCORES.qualifies(h.score)) SCORES.add({ name: h.D.name.slice(0, 3), score: h.score, cls: h.cls, floor: 9, cont: h.continues, t: Date.now() + h.pi });
  },
  update(dt) {
    const e = SC.end; e.t += dt;
    const any = anyP('fire') || anyP('confirm') || anyP('start') || game.input.clicked();
    if (e.phase === 'story' && (e.t > 14 || (any && e.t > 1.5))) { e.phase = 'credits'; e.t = 0; }
    else if (e.phase === 'credits' && (e.t > 30 || (any && e.t > 1.5))) { e.phase = 'choice'; e.t = 0; e.menu = bigMenu([{ label: 'DESCENT II', go: () => { RUN.loop++; for (const h of PARTY) { h.alive = true; h.hp = Math.max(h.hp, startHealth()); } NARR.speak(STORY.descent2); gotoFloor(0, { card: true }); } }, { label: 'BACK TO THE TITLE', go: () => game.go('title') }], { y: 150 }); NARR.speak(STORY.tag); }
    else if (e.phase === 'choice') { const p = e.menu.update(); if (p) p.go(); }
  },
  draw(r) {
    const e = SC.end;
    drawTitleBack(r, e.t + 5, true);
    r.overlay(g => {
      const W0 = r.W, H0 = r.H;
      e.rigs.forEach((rig, k) => { rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: 'cheer' }); rig.draw(g, W0 / 2 + (k - (e.rigs.length - 1) / 2) * 44, H0 - 40, r.view); });
      px.sprite(g, SPR.gauntletBig, W0 / 2 - 12, H0 - 120 + Math.sin(game.real * 2) * 3);
      if (e.phase === 'story') {
        E.font.title(g, 'THE GAUNTLET IS YOURS', W0 / 2, 14, { scale: 2, colors: LOGO_COLORS, outline: '#120806', depth: 2, depthColor: '#3a1a0a', align: 'center' });
        E.font.wrap(STORY.ending, Math.min(W0 - 40, 380), {}).forEach((l, k) => otxt(g, l, W0 / 2, 40 + k * 10, '#f0e0c8', { align: 'center' }));
        PARTY.forEach((h, k) => otxt(g, h.D.name + '  ' + h.score, W0 / 2, 100 + k * 10, h.color, { align: 'center' }));
      } else if (e.phase === 'credits') {
        const lines = ['GAUNTLETDOWN', '', ...ABOUT.credits.slice(1), '', 'THE HEROES', 'Brakka Ironbelly, the Berserker', 'Hilde Stoutheart, the Shieldmaiden', 'Fenn Quickfletch, the Ranger', 'Old Mother Wix, the Hexer', '', 'THE HUNGRY', 'Hungerghosts, Gnashers, Pot-Lobbers, Cinder Imps,', 'Fryars, Snatchers, the Tithe, and King Famish', '', 'THANK YOU FOR PLAYING', '', STORY.tag];
        const y0 = H0 - e.t * 14;
        lines.forEach((l, k) => { const y = y0 + k * 12; if (y > -10 && y < H0 - 70) otxt(g, l, W0 / 2, y, k === 0 ? '#ffe08a' : /^[A-Z ]+$/.test(l) ? '#e8a840' : '#f0e0c8', { align: 'center', scale: k === 0 ? 2 : 1 }); });
      } else {
        E.font.wrap(STORY.tag, Math.min(W0 - 40, 380), {}).forEach((l, k) => otxt(g, l, W0 / 2, 60 + k * 10, '#f0e0c8', { align: 'center' }));
        e.menu.draw(g, W0);
      }
    });
  }
};

/* ---- the attract mode: a looping demo played by cheating bots; any input goes back to the title ---- */
const ATTRACT = { on: false, seg: 0, t: 0, segs: [
  { kind: 'floor', floor: 'f2', time: 25, banner: 'GNASHERS, MELEE, MAGIC' },
  { kind: 'floor', floor: 'f5', time: 20, banner: 'THE TITHE, THE DINNER BELL, FORCE FIELDS' },
  { kind: 'floor', floor: 'f7', time: 15, banner: 'CINDER IMPS AND LAVA' },
  { kind: 'floor', floor: 'f9', time: 20, banner: 'KING FAMISH', boss: 2 },
  { kind: 'scores', time: 6 }, { kind: 'prologue', time: 8 }, { kind: 'title', time: 4 }] };
function startAttract() { ATTRACT.since = game.real + .2; ATTRACT.on = true; ATTRACT.seg = 0; ATTRACT.t = 0; runAttractSeg(); }
function runAttractSeg() {
  const s = ATTRACT.segs[ATTRACT.seg]; ATTRACT.t = 0;
  if (s.kind === 'floor') {
    PARTY.length = 0;
    HERO_ORDER.forEach((c, i) => PARTY.push(makeHero(c, i, {})));
    reseed(1234 + ATTRACT.seg); RUN.loop = 1; RUN.cheated = true; NARR.reset(true);
    gotoFloor(FLOOR_ORDER.indexOf(s.floor), { attract: true });
    for (const h of PARTY) { h.bot = makeBot(h, { cheat: true }); h.flasks = 3; h.keys = 2; }
    if (s.boss && W.boss) { W.boss.intro = 0; W.boss.hp = W.boss.maxHp * .65; W.boss.phase = 2; }
    if (s.floor === 'f5') { const b = W.items.find(i => i.kind === 'bell'); if (b) { PARTY[3].x = b.x - 30; PARTY[3].y = b.y; PARTY[3].body.x = PARTY[3].x; PARTY[3].body.y = PARTY[3].y; } }
  } else if (s.kind === 'scores') game.go('scores', { attract: true }, { fade: 0 });
  else game.go('attractCard', { kind: s.kind }, { fade: 0 });
}
function attractStep(dt) {
  ATTRACT.t += dt;
  const s = ATTRACT.segs[ATTRACT.seg];
  if (rawInput(ATTRACT.since) || game.input.anyPressed() || game.input.clicked() || game.players.some(p => p.padMove && Math.hypot(p.padMove[0], p.padMove[1]) > .4) || (game.input.pointer() && IDLE.px && Math.hypot(game.input.pointer()[0] - IDLE.px[0], game.input.pointer()[1] - IDLE.px[1]) > 4)) { stopAttract(); return; }
  if (s.kind === 'floor' && W) {   // the director: no quiet screens; an invulnerable party; a hop when stuck
    if (W.mons.length < 10 && ATTRACT.t % 3 < dt) for (let i = 0; i < 4; i++) { const h = PARTY[i % 4], a = R() * TAU, x = h.x + Math.cos(a) * 60, y = h.y + Math.sin(a) * 60; if (W.map.walkable(Math.floor(x / T), Math.floor(y / T))) spawnMon(Rpick(['gnasher', 'ghost', 'imp', 'lobber']), x, y, 2, { awake: true, emerge: true }); }
    for (const h of PARTY) { if (!h.alive) riseHero(h, { free: true }); h.hp = Math.max(h.hp, 500); }
    if (W.done) { W.done = null; W.doneT = 0; }
  }
  if (ATTRACT.t >= s.time) { ATTRACT.seg = (ATTRACT.seg + 1) % ATTRACT.segs.length; runAttractSeg(); }
}
function stopAttract() { ATTRACT.on = false; game.input.consumeAll(); for (const p of game.players) p.consumeAll(); IDLE.t = 0; IDLE.px = game.input.pointer(); PARTY.length = 0; game.go('title', {}, { fade: 0 }); }
scenes.attractCard = {
  view: 'threequarter', touch: [],
  enter(d) { SC.ac = { kind: d.kind, t: 0 }; if (d.kind === 'title') music('title'); },
  update(dt) { SC.ac.t += dt; attractStep(dt); },
  draw(r) {
    drawTitleBack(r, SC.ac.t + 2, SC.ac.kind !== 'title');
    r.overlay(g => {
      const W0 = r.W, H0 = r.H;
      if (SC.ac.kind === 'prologue') { const lines = E.font.wrap(STORY.prologue, Math.min(W0 - 40, 380), {}); const n = Math.min(lines.length, Math.floor(SC.ac.t * 2.2) + 1); lines.slice(0, n).forEach((l, k) => otxt(g, l, W0 / 2, 30 + k * 11, '#f0e0c8', { align: 'center' })); }
      else drawTitleFront(g, r);
      drawDemoBanner(g, r);
    });
  }
};
function drawDemoBanner(g, r) {
  const s = ATTRACT.segs[ATTRACT.seg];
  px.rect(g, 0, r.H - 22, r.W, 22, '#000000');
  otxt(g, 'DEMO' + (s.banner ? ':  ' + s.banner : ''), 8, r.H - 16, '#ffd84a');
  if (Math.floor(game.real * 2) % 2 === 0) otxt(g, 'PRESS ANY BUTTON', r.W - 8, r.H - 16, '#ffffff', { align: 'right' });
}
