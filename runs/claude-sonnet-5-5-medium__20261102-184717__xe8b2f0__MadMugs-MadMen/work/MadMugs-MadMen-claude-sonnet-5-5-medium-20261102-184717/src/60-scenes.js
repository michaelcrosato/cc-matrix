// ---------------------------------------------------------------------------------------------------------------------
// SCENES: title, the office day, the ending, the credits
// ---------------------------------------------------------------------------------------------------------------------
const ctl = { attract: false, hubGate: false, walkTo: null, hover: null, focus: null, view: 0 };
const stepTimer = { idle: 0, lastPtr: null };
let wantAutosave = false;

function newGame() {
  S = BASE();
  const h = spotXY('hero_start'); hero.x = h[0]; hero.y = h[1]; hero.vx = hero.vy = 0; hero.facing = -Math.PI / 4;
  for (const id of NPC_IDS) placeNpc(id, spotFor(id, S.min));
  Object.assign(talk, { open: false }); pending = null; talkAfter = null; talkCool = .4; NB.open = false; TY.phase = 'off'; PT.phase = 'off'; ctl.walkTo = null;
}
function dirTo(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
function animate(dt) {
  const gm = rigs.gil;
  gm.update(dt, { x: hero.x, y: hero.y, z: 0, vx: hero.vx, vy: hero.vy, facing: hero.facing, pose: S.mode === 'type' ? 'crouch' : undefined });
  for (const id of NPC_IDS) {
    const n = npcs[id], b = n.body;
    if (n.moving) {
      n.flow.update(n.target[0], n.target[1]);
      const d = n.flow.dir(b.x, b.y, n.target[0], n.target[1]);
      b.vx = d[0] * 42; b.vy = d[1] * 42; b.update(dt, map);
      if (Math.hypot(b.vx, b.vy) > 1) b.facing = Math.atan2(b.vy, b.vx);
      if (Math.hypot(n.target[0] - b.x, n.target[1] - b.y) < 5) { n.moving = false; b.x = n.target[0]; b.y = n.target[1]; b.vx = b.vy = 0; }
    } else { b.vx = b.vy = 0; }
    if (!n.moving && n.shown) { const dd = Math.hypot(hero.x - b.x, hero.y - b.y); if (dd < 90 && S.mode !== 'pitch') b.facing = dirTo(b, hero); else if (S.mode === 'pitch') b.facing = dirTo(b, id === 'garland' ? hero : npcs.garland.body); }
    n.rig.update(dt, { x: b.x, y: b.y, z: 0, vx: b.vx, vy: b.vy, facing: b.facing, pose: n.moving ? undefined : (REST_POSE[id] || undefined) });
  }
  for (const e of EXTRAS) e.rig.update(dt, { x: e.x * 16, y: e.y * 16, z: 0, vx: 0, vy: 0, facing: e.f, pose: undefined });
}
function interactWith(t) {
  ctl.walkTo = null;
  if (t.kind === 'npc') return talkTo(t.id);
  switch (t.id) {
    case 'files': return runNode(S.items.ledger ? 'files.again' : 'files.1', () => {});
    case 'bar': game.audio.sfx('pour'); return runNode('bar.1');
    case 'phone': game.audio.sfx('phonering'); return runNode('phone.menu');
    case 'type': return cardCount() ? openTypewriter() : runNode('typewriter.none');
    case 'smoke': game.audio.sfx('lighter'); return runNode('smoke.1');
    case 'elevator':
      if (S.flags.pitchStarted) return;
      return S.flags.briefed ? runNode('elevator.1', () => { if (S.visits['elevator.leave']) { S.ending = 'elevator'; S.score = computeScore(); finishDay(); } }) : runNode('elevator.locked');
  }
}
function talkTo(id) {
  const v = n => S.visits[n] || 0;
  if (id === 'hollis') {
    if (!S.flags.briefed) return runNode('hollis.1');
    if (S.min >= 12 * 60 + 30 && S.min < 15 * 60 && !S.cards.legacy) return runNode('hollis.terrace');
    if (S.min >= 15 * 60) return runNode('hollis.late');
    return runNode('hollis.again', () => addTime(5));
  }
  if (id === 'dot') { if (!v('dot.1')) return runNode('dot.1', () => addTime(30)); return runNode(S.stats.haze >= 4 && !S.flags.mints ? (S.flags.mints = true, 'dot.drunk') : 'dot.again', () => addTime(10)); }
  if (id === 'walt') return v('walt.1') ? runNode('walt.again', () => addTime(10)) : runNode('walt.1', () => addTime(30));
  if (id === 'teddy') return v('teddy.1') ? runNode('teddy.again', () => addTime(10)) : runNode('teddy.1', () => addTime(30));
  if (id === 'lorraine') return v('lorraine.1') ? runNode('lorraine.again', () => addTime(10)) : runNode('lorraine.1', () => addTime(30));
  if (id === 'garland') return runNode('garland.wait', () => { if (S.flags.begin) startPitch(); });
}
function checkEvents() {
  if (S.mode !== 'walk') return;
  if (S.min >= MIN_ARRIVE && !S.flags.arrived) {
    S.flags.arrived = true; game.audio.sfx('elevatorbell'); placeNpc('garland', 'garland'); npcs.garland.shown = true;
    return runNode('arrive');
  }
  if (S.min >= MIN_PITCH && !S.flags.pitchStarted) { runNode('late', () => startPitch()); }
}
const mouseLive = () => !!(I.mouse && I.mouse.active && I.clock - I.mouse.t < 2.5 && I.lastDevice !== 'gamepad');
const hoverTarget = () => {
  if (!mouseLive()) return null;
  const p = I.pointer(); if (!p) return null;
  const cell = map.pick(p[0], p[1]); if (!cell) return null;
  const wx = (cell.cx + .5) * 16, wy = (cell.cy + .5) * 16;
  let best = null, bd = 22; for (const t of targets()) { const d = Math.hypot(t.x - wx, t.y - wy); if (d < bd) { bd = d; best = t; } }
  return best;
};
function nearTarget() {
  let best = null, bd = 99; for (const t of targets()) {
    const reach = t.kind === 'npc' ? 38 : 34, d = Math.hypot(t.x - hero.x, t.y - hero.y);
    if (d < reach && d < bd) { bd = d; best = t; }
  }
  return best;
}
function walkUpdate(dt) {
  talkCool = Math.max(0, talkCool - dt);
  const m = I.move(), manual = Math.hypot(m[0], m[1]) > .12;
  let vx = 0, vy = 0;
  if (manual) { ctl.walkTo = null; const d = game.view.screenDirToGround(m[0], m[1]); vx = d[0]; vy = d[1]; const l = Math.hypot(vx, vy) || 1, k = Math.min(1, Math.hypot(m[0], m[1])); vx = vx / l * k; vy = vy / l * k; }
  // a click: walk there (or to the person or thing clicked, and use it on arrival)
  const c = I.clicked();
  if (c && talkCool <= 0 && !ctl.attract) {
    const h = hoverTarget() || (() => { const cell = map.pick(c[0], c[1]); if (!cell) return null; const wx = (cell.cx + .5) * 16, wy = (cell.cy + .5) * 16; let b = null, bd = 22; for (const t of targets()) { const d = Math.hypot(t.x - wx, t.y - wy); if (d < bd) { bd = d; b = t; } } return b; })();
    const cell = map.pick(c[0], c[1]);
    if (h) ctl.walkTo = { t: h }; else if (cell && map.walkable(cell.cx, cell.cy)) ctl.walkTo = { x: (cell.cx + .5) * 16, y: (cell.cy + .5) * 16 };
    if (ctl.walkTo) { ctl.walkFlow = ctl.walkFlow || new E.FlowField(map); const g = ctl.walkTo.t ? (ctl.walkTo.t.stand || [ctl.walkTo.t.x, ctl.walkTo.t.y]) : [ctl.walkTo.x, ctl.walkTo.y]; ctl.walkGoal = g; ctl.walkFlow.update(g[0], g[1]); }
  }
  if (ctl.walkTo && !manual) {
    const g = ctl.walkGoal, d = Math.hypot(g[0] - hero.x, g[1] - hero.y), stopAt = ctl.walkTo.t ? (ctl.walkTo.t.kind === 'npc' ? 22 : 5) : 3;
    if (d <= stopAt) { const t = ctl.walkTo.t; ctl.walkTo = null; if (t) { hero.facing = dirTo(hero, t); interactWith(t); } }
    else { const dd = ctl.walkFlow.dir(hero.x, hero.y, g[0], g[1]); vx = dd[0]; vy = dd[1]; }
  }
  const sp = 66; hero.vx = vx * sp; hero.vy = vy * sp; hero.update(dt, map);
  if (Math.hypot(vx, vy) > .1) hero.facing = Math.atan2(vy, vx);
  ctl.hover = hoverTarget(); ctl.focus = ctl.hover || nearTarget();
  if (ctl.hover && I.lastDevice === 'keyboard' && I.clock - I.mouse.t < .3) I.lastDevice = 'mouse';
  if (talkCool <= 0) {
    if ((I.pressed('interact') || I.pressed('confirm')) && ctl.focus && !ctl.attract) { hero.facing = dirTo(hero, ctl.focus); interactWith(ctl.focus); }
    else if (I.pressed('notebook') && !ctl.attract) openNotebook();
  }
  if (I.pressed('view')) { game.nextView(); game.note('VIEW: ' + upper(game.view.id || game.view.label || '')); }
  checkEvents();
}

const play = {
  get pausable() { return S.mode !== 'note' && S.mode !== 'type'; }, view: 'threequarter', views: ['threequarter', 'iso', 'topdown'], propSize: 1.3, camera: { zoom: [.7, 2.2], start: 1, tall: 1.25 },
  enter(data) {
    data = data || {};
    ctl.attract = !!data.attract; stepTimer.idle = 0;
    if (data.load && pendingLoad) { restore(pendingLoad); pendingLoad = null; } else newGame();
    game.follow(hero, { z: 10 }); game.cam.bounds = v => map.bounds(v);
    game.lights.enabled = true; game.lights.ambient = .78;
    music('office'); refreshSchedule(false);
    if (!data.load && !IN_SESSION) game.after(.5, () => { S.flags.introDone = true; runNode('intro'); });
    if (ctl.attract) { botStart(); }
  },
  exit() { game.lights.enabled = false; ctl.attract = false; },
  update(dt) {
    const pr = S.pops; for (const p of pr) p.t += dt; while (pr.length && pr[0].t > 3.2) pr.shift();
    animate(dt);
    if (ctl.attract) { if (attractInterrupt()) return; botUpdate(dt); }
    if (IN_SESSION && !hubLive()) { return; }
    if (IN_SESSION) hubTick(dt);
    if (IN_SESSION && !S.flags.introDone && S.mode === 'walk') { S.flags.introDone = true; runNode('intro'); }
    if (wantAutosave && S.mode === 'walk' && !ctl.attract && !IN_SESSION && !S.flags.pitchStarted) { wantAutosave = false; try { game.saves.autosave(); } catch (e) { /* storage */ } }
    game.lights.ambient = clamp(.8 - (S.min - MIN_START) / (MIN_PITCH - MIN_START) * .26, .5, .82);
    if (S.mode === 'ending') return;
    if (PT.phase !== 'off') game.focus(31.5 * 16, 6.4 * 16, 10);
    else game.focus(hero.x, hero.y, 10);
    if (talkUpdate(dt)) return;
    if (S.mode === 'note') return notebookUpdate();
    if (S.mode === 'type') return typewriterUpdate(dt);
    if (S.mode === 'pitch') return pitchUpdate(dt);
    if (S.mode === 'walk') walkUpdate(dt);
  },
  draw(r) {
    map.drawFloor(r); drawDetails(r); drawAmbience(r); map.queueWalls(r);
    const actor = (b, rig, big) => {
      r.shadow(b.x, b.y, 7, .38);
      r.actor(b.x, b.y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), big ? { outline: '#ffe9b0' } : undefined);
    };
    actor(hero, rigs.gil);
    for (const id of NPC_IDS) { const n = npcs[id]; if (n.shown) actor(n.body, n.rig, ctl.focus && ctl.focus.id === id && S.mode === 'walk' && !ctl.attract); }
    for (const e of EXTRAS) { r.shadow(e.x * 16, e.y * 16, 7, .38); r.actor(e.x * 16, e.y * 16, 0, (g, ox, oy) => e.rig.draw(g, ox, oy, r.view)); }
    if (ctl.focus && S.mode === 'walk') { const t = ctl.focus, pul = .6 + Math.sin(game.time * 6) * .25, px_ = t.kind === 'npc' ? t.x : (t.stand ? t.stand[0] : t.x), py_ = t.kind === 'npc' ? t.y : (t.stand ? t.stand[1] : t.y); r.decal(() => r.groundRing(px_, py_, t.kind === 'npc' ? 10 : 8, '#ffe9b0', pul)); }
    if (ctl.walkTo && ctl.walkGoal) r.decal(() => r.groundRing(ctl.walkGoal[0], ctl.walkGoal[1], 5, '#9fe8ff', .7));
    if (S.mode === 'ending') return;
    drawHud(r, ctl.attract ? null : ctl.focus);
    if (S.mode === 'note') drawNotebook(r);
    if (S.mode === 'type') drawTypewriter(r);
    if (S.mode === 'pitch' || PT.phase !== 'off') drawPitch(r);
    if (ctl.attract) r.overlay(g => { const t = 'DEMO: PRESS ANY BUTTON', w = tw(t) + 14; panel(g, Math.round((r.W - w) / 2), r.H - 22, w, 16, { alpha: .8 }); txt(g, t, Math.round((r.W - w) / 2) + 7, r.H - 18, '#ffe9b0'); });
    if (IN_SESSION && !hubLive()) r.overlay(g => { const t = 'THE ROUND STARTS WHEN THE HUB SAYS', w = tw(t) + 14; panel(g, Math.round((r.W - w) / 2), 40, w, 16); txt(g, t, Math.round((r.W - w) / 2) + 7, 44, '#ffe9b0'); });
    talk.draw(r);
  }
};

// ---- the title ---------------------------------------------------------------------------------------------------------------
let titleMenu = null, titleNoSave = true;
const CAST = ['gil', 'dot', 'walt', 'teddy', 'hollis', 'lorraine', 'garland'];
const title = {
  enter() {
    if (IN_SESSION) { game.go('play', { hub: true }, { fade: 0 }); return; }
    stepTimer.idle = 0; stepTimer.lastPtr = null; music('title');
    const latest = game.saves.latest && game.saves.latest();
    titleNoSave = !latest;
    const items = [{ label: 'NEW DAY' }, { label: 'CONTINUE', disabled: titleNoSave }, { label: 'SETTINGS' }, { label: 'ABOUT' }];
    titleMenu = new E.Menu(game, touchOnly() ? [{ label: 'SETTINGS' }] : items, {
      x: 'center', y: 150, box: false,
      onPick: (i, it) => {
        if (it.label === 'NEW DAY') game.go('play', {});
        else if (it.label === 'CONTINUE') { const s = game.saves.latest(); if (s && game.saves.load) game.saves.load(s.slot !== undefined ? s.slot : 'auto'); }
        else if (it.label === 'SETTINGS') game.menu('settings');
        else if (it.label === 'ABOUT') game.go('about', {});
      }
    });
  },
  update(dt) {
    stepTimer.idle += dt;
    const m = I.move(), p = I.pointer();
    if (I.anyPressed() || Math.hypot(m[0], m[1]) > .1 || I.clicked() || (p && stepTimer.lastPtr && (Math.abs(p[0] - stepTimer.lastPtr[0]) + Math.abs(p[1] - stepTimer.lastPtr[1])) > 2)) stepTimer.idle = 0;
    stepTimer.lastPtr = p ? p.slice() : null;
    for (const id of CAST) rigs[id].update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 });
    titleMenu.update(dt);
    if (stepTimer.idle >= 10) game.go('play', { attract: true });
  },
  draw(r) {
    r.sky(['#1a1030', '#4a2a50', '#c8704a']);
    r.overlay(g => {
      // the skyline: towers with lit windows that change slowly
      const base = r.H - 40;
      for (let i = 0, x = -4; x < r.W; i++) {
        const bw = 18 + (hashStr('b' + i) % 22), bh = 40 + (hashStr('h' + i) % 80), c = ['#1a1424', '#221a30', '#2a2038'][i % 3];
        px.rect(g, x, base - bh, bw, bh + 60, c);
        for (let wy = base - bh + 5; wy < base; wy += 8) for (let wx = x + 3; wx < x + bw - 3; wx += 6) if ((hashStr(wx + ':' + wy + ':' + Math.floor(game.time / 6)) % 5) < 2) px.rect(g, wx, wy, 3, 4, '#ffd890');
        x += bw + 2;
      }
      px.rect(g, 0, base + 12, r.W, r.H, '#120c1a');
      E.font.title(g, TITLE, r.W / 2, r.W < 380 ? 30 : 22, { scale: r.W < 380 ? 3 : 4, align: 'center', colors: ['#fff6d8', '#f0c878', '#c8783a'], outline: '#1a0c10', depth: 3, depthColor: '#5a2a1a' });
      txt(g, TAGLINE.toUpperCase(), Math.round(r.W / 2 - tw(TAGLINE.toUpperCase()) / 2), 60, '#ffe9b0');
      txt(g, 'A MAD MEN STORY IN ONE TUESDAY', Math.round(r.W / 2 - tw('A MAD MEN STORY IN ONE TUESDAY') / 2), 72, '#b8a8c8');
      // the mugs
      const n = CAST.length, sz = 38, gap = Math.min(10, Math.floor((r.W - 20 - n * sz) / (n - 1))), tot = n * sz + (n - 1) * gap, sx = Math.round((r.W - tot) / 2);
      CAST.forEach((id, i) => { const x = sx + i * (sz + gap), y = 84 + (i % 2) * 4; px.rect(g, x - 2, y - 2, sz + 4, sz + 4, '#0c0a12'); px.rect(g, x - 1, y - 1, sz + 2, sz + 2, PEOPLE[id].color); rigs[id].drawPortrait(g, x, y, sz, { zoom: 2.6 }); });
    });
    if (touchOnly()) r.overlay(g => { const t = 'CONTROLLER OR KEYBOARD REQUIRED', w = tw(t, { scale: 1 }) + 20; panel(g, Math.round((r.W - w) / 2), 128, w, 18, { border: '#f0a090' }); txt(g, t, Math.round((r.W - w) / 2) + 10, 133, '#ffd0c0'); });
    else r.overlay(g => { const t = I.lastDevice === 'gamepad' ? 'PICK' : 'PICK OR CLICK'; promptLine(g, r, 'confirm', t, r.H - 14); });
    titleMenu.draw(r);
    if (stepTimer.idle > 6) r.overlay(g => txt(g, 'DEMO STARTS IN ' + Math.ceil(10 - stepTimer.idle), r.W - 6 - tw('DEMO STARTS IN 00'), r.H - 10, '#8a8298'));
  }
};

// ---- the ending ---------------------------------------------------------------------------------------------------------------
const endState = { t: 0, page: 0, lines: [], notes: [] };
const end = {
  enter() {
    S.mode = 'ending'; const E_ = ENDINGS[S.ending || 'lost']; endState.t = 0; endState.page = 0;
    endState.lines = E_.lines.slice(S.ending === 'elevator' ? 0 : 1);
    const notes = [];
    if (S.flags.promised) notes.push('Evelyn leaves the light on. This time she doesn\'t have to.');
    if (S.flags.called && !S.flags.promised) notes.push('Evelyn leaves the light on anyway.');
    if (S.rel.dot >= 2) notes.push('Dot is made a junior copywriter. She asks for a raise before the paperwork is dry.');
    if (S.rel.walt >= 1) notes.push('Walt\'s layout goes on the wall of the lobby, unsigned.');
    if (S.flags.leanedStatus) notes.push('Teddy tells the partners the strategy was his. It nearly was.');
    if (S.rel.hollis >= 2) notes.push('Hollis pours you one, and for once pours himself a smaller one.');
    endState.notes = notes.slice(0, 3);
    S.score = computeScore(); music('epilogue', { fade: 1 }); endState.attract = !!ctl.attractLoop; endState.auto = 0;
  },
  update(dt) {
    endState.t += dt;
    if (endState.attract) {
      if (attractInterrupt()) return;
      endState.auto += dt;
      const pages = endState.lines.length + (endState.notes.length ? 1 : 0) + 1;
      if (endState.auto > 2.6) { endState.auto = 0; if (endState.page < pages) endState.page++; else { game.go('play', { attract: true }); } }
      return;
    }
    const next = I.pressed('confirm') || I.pressed('interact') || I.clicked();
    if (next && endState.t > .4) {
      endState.t = 0;
      if (endState.page < endState.lines.length + (endState.notes.length ? 1 : 0)) { endState.page++; game.audio.sfx('select'); }
      else if (endState.page === endState.lines.length + (endState.notes.length ? 1 : 0)) { endState.page++; game.audio.sfx('confirm'); }
      else if (!IN_SESSION) game.go('title');
    }
    if (I.pressed('cancel') && !IN_SESSION && endState.page > 0) game.go('title');
  },
  draw(r) {
    const E_ = ENDINGS[S.ending || 'lost'];
    r.sky(['#0e0a16', '#2a1c34', '#4a2e3a']);
    r.overlay(g => {
      const w = Math.min(r.W - 24, 380), x = Math.round((r.W - w) / 2);
      E.font.title(g, E_.title, r.W / 2, 22, { scale: 3, align: 'center', colors: ['#fff6d8', E_.tone, '#8a5a3a'], outline: '#12080c', depth: 2, depthColor: '#2a1a1a' });
      const total = endState.lines.length, notes = endState.notes.length;
      let y = 58;
      for (let i = 0; i < Math.min(endState.page, total); i++) { E.font.wrap(endState.lines[i], w, {}).forEach(ln => { txt(g, ln, x, y, '#fff4e0'); y += 10; }); y += 5; }
      if (endState.page === 0) txt(g, 'The day is over. The story isn\'t.', x, 58, '#c8c0d0');
      if (endState.page > total && notes) { y += 4; txt(g, 'AFTERWARD', x, y, '#ffd890'); y += 11; endState.notes.forEach(n => { E.font.wrap(n, w, {}).forEach(ln => { txt(g, ln, x, y, '#e8e0f0'); y += 10; }); y += 3; }); }
      if (endState.page > total + (notes ? 1 : 0) - 0 && endState.page >= total + (notes ? 1 : 0)) {
        panel(g, x, r.H - 78, w, 62);
        txt(g, 'STANDING', x + 10, r.H - 72, '#ffe9b0'); txt(g, String(S.score) + ' points', x + 10, r.H - 62, '#fff', { scale: 2 });
        txt(g, 'Garland\'s interest ' + S.interest + '   Cards ' + cardCount() + '/5   Haze ' + S.stats.haze, x + 10, r.H - 40, '#c8c0d0');
        txt(g, 'Nerve ' + stat('nerve') + '   Heart ' + stat('heart') + '   Polish ' + stat('polish'), x + 10, r.H - 30, '#c8c0d0');
      }
      const last = endState.page > total + (notes ? 1 : 0);
      const prompt = last ? (IN_SESSION ? 'THE HUB TAKES IT FROM HERE' : 'BACK TO THE TITLE') : 'CONTINUE';
      if (!(last && IN_SESSION)) promptLine(g, r, 'confirm', prompt, r.H - 8);
      else txt(g, prompt, Math.round((r.W - tw(prompt)) / 2), r.H - 12, '#b8b0c8');
    });
  }
};

// ---- about / credits -----------------------------------------------------------------------------------------------------------
const about = {
  scroll: 0,
  enter() { about.scroll = 0; },
  update(dt) {
    const m = I.move(); about.scroll = clamp(about.scroll + m[1] * dt * 120, 0, Math.max(0, (about.max || 0) - 200));
    if (I.pressed('cancel') || I.pressed('confirm') || I.clicked()) game.go('title');
  },
  draw(r) {
    r.sky(['#120c1a', '#2a1c34']);
    r.overlay(g => {
      const w = Math.min(r.W - 20, 400), x = Math.round((r.W - w) / 2);
      E.font.title(g, 'ABOUT', r.W / 2, 8, { scale: 2, align: 'center', colors: ['#fff6d8', '#f0c878', '#c8783a'] });
      let y = 34 - about.scroll;
      const Q = { testing: ['Issues caught', 'Critical issues', 'Most helpful test', 'Least helpful test'], engine: ['Liked most', 'Stuck or guessed wrong', 'Built myself', 'Hardest part', 'Remove or overhaul', 'Change one thing'], prompt: ['Liked most', 'Confusing', 'Hardest thing', 'One test I would add'] };
      const fb = (title, key) => [[title, '']].concat(FEEDBACK[key].map((t, i) => [Q[key][i], t]));
      const sectionLines = ABOUT.concat(fb('Testing Feedback', 'testing'), fb('Engine Feedback', 'engine'), fb('Prompt Feedback', 'prompt'), [['Credits', ''], ['', 'Writing, code, music and sound by Claude Sonnet 5.5. Engine: my-3D2dge. Hub: AI Hub.']]);
      for (const [k, v] of sectionLines) {
        if (!v) { y += 4; if (y > 8 && y < r.H) txt(g, upper(k), x, y, '#ffd890'); y += 11; continue; }
        const lines = E.font.wrap((k ? k + ': ' : '') + v, w, {});
        lines.forEach(ln => { if (y > 24 && y < r.H - 16) txt(g, ln, x, y, '#e8e0f0'); y += 9; }); y += 2;
      }
      about.max = y + about.scroll;
      panel(g, 0, r.H - 16, r.W, 16, { alpha: .9 }); let gx = 8; gx += drawGlyph(g, 'cancel', gx, r.H - 8) + 3; txt(g, 'BACK    UP / DOWN: SCROLL', gx, r.H - 11, '#d8d2c0');
    });
  }
};
