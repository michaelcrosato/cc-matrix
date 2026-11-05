/* ============================================================================
 * scenes: title, play (and the attract mode, which is play with a pilot), about, and the AI Hub round
 * ========================================================================== */
const PLACE = 'Calloway Homes · East Side';
const STAGE_NAME = { brief: 'Briefing', surveil: 'Surveillance', tip: 'The informant', wire: 'The wire', listen: 'The van', chase: 'The run', box: 'The box', report: 'The report', done: 'Closed' };
let saveBlob = null, talkCool = 0;

function startCase(opts = {}) {
  S = newCase(opts.stage ? { stage: opts.stage } : {}); resultsShown = false; hintShown = {}; demo = false; pilotCtl = null; sessionEnded = false; lastToast = '';
  game.go('play', Object.assign({ fresh: true }, opts));
}
function startAttract() { S = newCase(); resultsShown = false; hintShown = {}; demo = true; userPoked = false; pilotInit(); game.go('play', { demo: true, fresh: true }); }

game.saves.write = () => ({ data: { S: JSON.parse(JSON.stringify(S, (k, v) => k === '_ph' ? undefined : v)), hero: { x: hero ? hero.x : 0, y: hero ? hero.y : 0 }, ph: S._ph || {} }, place: PLACE, level: STAGE_NAME[S.stage] });
game.saves.read = save => { saveBlob = save.data; demo = false; pilotCtl = null; resultsShown = false; hintShown = {}; S = Object.assign(newCase(), saveBlob.S); S._ph = saveBlob.ph || {}; game.go('play', { load: true }); };
game.saves.canSave = true;

/* ---------- title ---------- */
let titleMenu = null, titleT = 0, titleIdle = 0, titleMode = 'menu';
const SKY = []; for (let i = 0; i < 46; i++) SKY.push({ x: (i * 37) % 340, w: 18 + (i * 13) % 26, h: 40 + (i * 29) % 70, lit: (i * 7) % 5 });
function makeTitleMenu() {
  const saved = game.saves.latest();
  const items = [{ label: 'Start the case' }, { label: 'Continue', disabled: !saved }, { label: 'Settings' }, { label: 'About and credits' }];
  titleMenu = new E.Menu(game, items, { x: 'center', y: 128, box: true, bg: '#10141a', border: '#d8b070', color: '#d8d0c0', pick: '#ffd36a', dim: '#5a5a64',
    onPick: i => {
      if (touchOnly() && i < 2) return;
      if (i === 0) startCase(); else if (i === 1) { const s = game.saves.latest(); if (s) game.saves.load(s.slot); }
      else if (i === 2) game.menu('settings'); else showAbout();
    } });
}
const title = {
  enter() { makeTitleMenu(); titleT = 0; lastUserInput = performance.now(); userPoked = false; demo = false; pilotCtl = null; music('title', { fade: 1 }); ui.hud({}); scaleUI(); },
  update(dt) {
    titleT += dt; pollPadPoke();
    if (ui.screen) { lastUserInput = performance.now(); return; }
    if (titleMenu) titleMenu.update(dt);
    if (performance.now() - lastUserInput > 10000) { startAttract(); }
  },
  draw(r) {
    r.sky(['#06080d', '#141a26', '#2a2430']);
    const W = r.W, H = r.H, cy = Math.round(H * .62);
    r.overlay(g => {
      // skyline of rowhouses, lit windows, a cold street lamp, rain
      for (let pass = 0; pass < 2; pass++) for (const b of SKY) {
        const bx = Math.round((b.x * (pass ? 1.3 : 1) + pass * 11) % (W + 40)) - 20, bh = b.h + pass * 18, bw = b.w + pass * 5, top = cy - bh;
        E.px.rect(g, bx, top, bw, bh + 80, pass ? '#0b0d12' : '#161a22');
        E.px.rect(g, bx, top, bw, 2, pass ? '#1a1e28' : '#2a303c');
        for (let wy = top + 8; wy < cy - 6; wy += 11) for (let wx = bx + 4; wx < bx + bw - 4; wx += 8) { const on = ((wx * 7 + wy * 13 + b.lit) % 9) < 2; if (on) E.px.rect(g, wx, wy, 3, 5, pass ? '#6a5a30' : '#c89a48'); }
      }
      E.px.rect(g, 0, cy, W, H - cy, '#0a0b10');
      E.px.rect(g, 0, cy, W, 2, '#2a2e38');
      const lx = Math.round(W * .82); E.px.rect(g, lx, cy - 74, 2, 74, '#2a2e38'); E.px.rect(g, lx - 8, cy - 76, 12, 3, '#2a2e38');
      px_glow(g, lx - 3, cy - 72, 40, '#ffd890');
      for (let i = 0; i < 70; i++) { const rx = Math.round(((i * 53 + titleT * 40) % (W + 20)) - 10), ry = Math.round(((i * 97 + titleT * 260) % (H + 20)) - 10); E.px.line(g, rx, ry, rx - 2, ry + 6, 'rgba(140,160,190,.35)'); }
      E.font.title(g, 'WIRE TAP DANCE', Math.round(W / 2), Math.round(H * .13), { scale: 3, align: 'center', colors: ['#f4e2b8', '#d8a850', '#8a5a28'], depth: 2, depthColor: '#2a1a0a' });
      E.font.text(g, 'A spiritual successor to the street-level detective drama', Math.round(W / 2), Math.round(H * .13) + 36, '#b8a888', { align: 'center', shadow: '#000' });
      E.font.text(g, 'Nobody gets convicted by a feeling.', Math.round(W / 2), Math.round(H * .13) + 48, '#8a8478', { align: 'center', shadow: '#000' });
    });
    if (titleMenu) { titleMenu.y = Math.round(H * .44); titleMenu.draw(r); }
    r.text(('Move: ' + (I.lastDevice === 'gamepad' ? 'D-pad or left stick' : 'W S, arrows or mouse') + '    Pick: ' + I.label('confirm')).toUpperCase(), r.W / 2, r.H - 26, '#a8a090', { align: 'center', shadow: '#000' });
    if (touchOnly()) {
      r.overlay(g => { const w = Math.min(W - 20, 260); E.ui.box(g, Math.round(W / 2 - w / 2), Math.round(H * .32), w, 34, { bg: ['#2a1410', '#1a0c08'], border: '#e07a5a' }); E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', Math.round(W / 2), Math.round(H * .32) + 6, '#ffb09a', { align: 'center' }); E.font.text(g, 'This game has no touch controls. Settings are open to you.', Math.round(W / 2), Math.round(H * .32) + 18, '#c8a898', { align: 'center' }); });
    }
    r.text(('v' + (E.version || '') + ' - ' + (10 - Math.min(10, Math.floor((performance.now() - lastUserInput) / 1000))) + 's to the demonstration').toUpperCase(), 6, r.H - 12, '#4a4a54');
  }
};
function px_glow(g, x, y, rad, col) { E.px.blend(g, .22, 'add', () => { for (let k = 4; k > 0; k--) E.px.disc(g, x, y, Math.round(rad * k / 4), col); }); }

/* ---------- about and credits: the source information, shown in the game as it is in the report ---------- */
function showAbout() {
  ui.show('about', { kicker: 'Credits', title: TITLE, text: 'An original spiritual successor to The Wire (2002–2008).', sections: ABOUT_SECTIONS,
    actions: [{ label: 'Back', primary: true, fn: () => ui.hide() }] });
}

/* ---------- play ---------- */
const play = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'iso', 'topdown'], camera: { zoom: [.6, 2.2], start: .75 },
  enter(data) {
    data = data || {};
    if (data.demo) demo = true; else if (data.fresh) demo = false;
    const loading = !!data.load;
    try { ui.hide(); } catch (e) { /* no screen open */ }
    talkCool = 0; buildWorld();
    if (loading && saveBlob) { Object.assign(hero, { x: saveBlob.hero.x, y: saveBlob.hero.y }); fixupAfterLoad(); }
    if ((data.fresh || IN_SESSION) && IN_SESSION && !data.load) { S.approach = 'book'; S.stage = 'surveil'; Object.assign(hero, { x: 10.5 * T16, y: 11.5 * T16 }); }
    if (data.fresh && data.stage && STAGE_START[data.stage]) STAGE_START[data.stage]();
    game.follow(hero, { z: 16 }); game.cam.bounds = v => map.bounds(v);
    game.lights.enabled = true; game.lights.ambient = .8;
    game.weather = { kind: 'rain', amount: .28, wind: .15, lightning: 0 };
    music(({ chase: 'chase', box: 'box', report: 'report' })[S.stage] || (S.stage === 'brief' ? 'title' : 'stealth'), { fade: 1 });
    A.sfx('door'); resultsShown = !!S.done && resultsShown;
    if (!demo) { if (S.stage === 'brief') hint('start', 'The detail office', 'Walk to Sgt. Kowalczyk and press ' + I.label('interact') + '. ' + I.label('board') + ' opens the case file. ' + I.label('view') + ' changes the camera view.'); }
    scaleUI();
  },
  exit() { game.lights.enabled = false; game.weather = null; ui.hud({}); ui.tutorial && ui.tutorial(null); music(null); },
  update(dt) {
    pollPadPoke();
    if (demo && userPoked) { userPoked = false; ui.hide && ui.hide(); demo = false; pilotCtl = null; game.go('title'); return; }
    // the AI Hub holds a round until its clock says go
    if (IN_SESSION && HUB.time() < 0) { hudTick(); return; }
    if (IN_SESSION) hubTick(dt);
    if (demo) pilotThink(dt);
    if (ui.screen) { talkCool = .3; hudTick(); return; }
    if (talk.update(dt)) { talkCool = .3; tickRigs(dt); hudTick(); return; }
    talkCool = Math.max(0, talkCool - dt);
    const ctl = readControls(), now = !!(overlay || boxScreen);
    if (talkCool > 0 && !pilotCtl) { ctl.interact = false; ctl.board = false; }
    if (!now && !demo && ctl.board) { openBoard(); hudTick(); return; }
    if (ctl.view) { game.nextView(); game.note && game.note('VIEW: ' + game.view.label); }
    if (overlay === 'wire') updateWire(dt, { press: ctl.interact, cancel: ctl.cancel });
    else if (overlay === 'listen') updateListen(dt, { press: ctl.interact, cancel: ctl.cancel });
    // mouse: hover moves the focus; a click walks up to a thing and does it
    hover = null;
    const pick = pickInteract();
    if (!overlay && !boxScreen && I.lastDevice === 'mouse' && !demo) {
      const mg = game.mouseGround();
      if (mg) { let bd = 18; for (const o of pick.list) { const d = Math.hypot(o.x - mg[0], o.y - mg[1]); if (d < bd) { bd = d; hover = o; } } }
      const c = I.clicked();
      if (c && !ctl.camera) { const g = game.view.toGround(c[0], c[1]); if (g) { let h = null, bd2 = 18; for (const o of pick.list) { const d = Math.hypot(o.x - g[0], o.y - g[1]); if (d < bd2) { bd2 = d; h = o; } } if (h) { if (Math.hypot(h.x - hero.x, h.y - hero.y) < REACH) h.run(); else autoWalk = h; } else autoWalk = { x: g[0], y: g[1], run: null }; } }
    }
    if (!now && !overlay && !boxScreen && ctl.interact && pick.best && !busyScript()) pick.best.run();
    stepWorld(dt, ctl);
    if (S.stage === 'wire' && S.heat < 100 && false) return;
    hudTick(pick.best);
  },
  draw(r) { drawWorld(r); }
};
const busyScript = () => !!(scriptTask && !scriptTask.done);
function tickRigs(dt) { heroRig.update(dt, hero.rigState()); for (const lk of lookouts) lk.update(dt); for (const w of walkers) w.update(dt, map, hero); }

function hudTick(best) {
  if (!ui.root) return;
  const o = (OBJ[S.stage] || OBJ.done)(), ev = evidenceList(S).length;
  const keys = I.lastDevice === 'gamepad'
    ? [['L Stick', 'Move'], [I.label('sprint'), 'Sprint'], [I.label('crouch'), 'Crouch'], [I.label('camera'), 'Camera'], [I.label('interact'), 'Interact'], [I.label('board'), 'Case file']]
    : [['WASD', 'Move'], [I.label('sprint'), 'Sprint'], [I.label('crouch'), 'Crouch'], [I.label('camera'), 'Camera'], [I.label('interact'), 'Interact'], [I.label('board'), 'Case file'], [I.label('view'), 'View']];
  const bars = []; if (lookoutsActive() && !demo) bars.push({ label: 'Heat', value: S.heat, max: 100, color: S.heat > 66 ? '#e0583a' : '#e0b06a' });
  if (hero && hero.stamina < hero.staminaMax - 1) bars.push({ label: 'Wind', value: hero.stamina, max: hero.staminaMax, color: hero.exhausted ? '#e0583a' : '#7ac08a' });
  const photoP = photoWho && S._ph ? S._ph[photoWho] : 0;
  const prompt = overlay || boxScreen || (S.done && !demo) ? null : photoWho ? { label: 'Photographing ' + CREW[photoWho], progress: photoP, hint: 'Hold steady' } : best ? { act: 'interact', label: best.label, hint: hover === best ? 'Click or ' + I.label('interact') : 'Interact' } : null;
  const mk = []; if (o.at) mk.push({ x: o.at.x, y: o.at.y, kind: 'diamond', color: '#ffd36a' });
  for (const [k, p] of crewList()) if (S.photos[k]) mk.push({ x: p.x, y: p.y, kind: 'dot', color: '#e07a5a' });
  try {
    ui.hud({ objective: S.done ? null : { step: String(Math.max(1, STAGES.indexOf(S.stage) + 1)).padStart(2, '0') + ' / 08', title: o.title, text: o.text, at: o.at ? { x: o.at.x, y: o.at.y, z: 0 } : undefined, from: o.at ? hero : undefined },
      status: { text: clockLabel(S.hour) + ' · ' + STAGE_NAME[S.stage].toUpperCase(), color: S.heat > 66 ? '#e0583a' : '#e0b06a' }, place: PLACE, bars, counts: [['Budget', '$' + S.cash], ['Exhibits', String(ev)]],
      prompt, keys: demo ? null : keys, minimap: demo || overlay ? null : { map, at: { x: hero.x, y: hero.y, facing: hero.facing }, markers: mk, camera: true } });
  } catch (e) { game.fail('hud', e); }
}

function drawWorld(r) {
  const dark = darkness(S.hour); game.lights.ambient = .86 - .56 * dark; game.lights.enabled = true;
  { const tag = map.floorAt(hero.x, hero.y), indoors = tag === 'wood' || tag === 'tile'; game.weather = indoors ? null : { kind: 'rain', amount: .2 + dark * .25, wind: .15, lightning: 0 }; }
  map.drawFloor(r);
  // decals: lookouts' cones, the lens, the objective ring
  const o = (OBJ[S.stage] || OBJ.done)();
  if (game.settings.cones && lookoutsActive() && !demo) for (const lk of lookouts) r.decal(() => r.groundArc(lk.x, lk.y, 4, lk.range, lk.facing - lk.fov / 2, lk.facing + lk.fov / 2, lk.alert > .01 ? '#ff5a3a' : '#ffe08a', lk.alert > .01 ? .22 + lk.alert * .3 : .12));
  if (camRaised) r.decal(() => r.groundArc(hero.x, hero.y, 4, 150, aimAng - .2, aimAng + .2, photoWho ? '#9affc0' : '#ffffff', photoWho ? .35 : .2));
  if (o.at && !S.done) r.decal(() => r.groundArc(o.at.x, o.at.y, 6 + Math.sin(game.time * 4) * 1.5, 11, 0, Math.PI * 2, '#ffd36a', .45));
  if (hover) r.decal(() => r.groundArc(hover.x, hover.y, 8, 12, 0, Math.PI * 2, '#ffffff', .55));
  // set dressing
  for (const d of DRESS) { try { if (d.k === 'prop') r.prop(d.n, d.x * T16, d.y * T16, 0, { light: !!d.light }); else if (E.SHAPES && E.SHAPES[d.n]) r.shape(d.n, d.x * T16, d.y * T16, 0, { facing: d.facing || 0 }); } catch (e) { /* skip a prop that will not draw */ } }
  map.queueWalls(r);
  const actors = [[hero, heroRig, hero], ...Object.values(P).map(p => [p, p.rig, p.body]), ...walkers.map(p => [p, p.rig, p.body]), ...lookouts.map(l => [l, l.rig, l])];
  for (const [who, rig, b] of actors) {
    r.shadow(who.x, who.y, 6.5, .35, undefined, b.groundZ || 0);
    r.actor(who.x, who.y, who.z || 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { xray: who === hero ? { color: '#8ad0ff' } : undefined });
  }
  game.lights.add(hero.x, hero.y, 24, 54, .35, { color: '#ffe8c0' });
  // billboards: photographs in progress, names, alerts
  r.overlay(g => {
    if (camRaised) for (const [k, p] of crewList()) { if (S.photos[k]) continue; const s = r.w(p.x, p.y, 46); E.font.text(g, CREW[k].toUpperCase(), s[0], s[1] - 8, photoWho === k ? '#9affc0' : '#e8e0d0', { align: 'center', shadow: '#000' }); if (photoWho === k && S._ph) E.ui.bar(g, s[0] - 14, s[1] + 2, 28, 4, S._ph[k] || 0, '#9affc0'); }
    for (const lk of lookouts) if (lk.alert > .02) { const s = r.w(lk.x, lk.y, 44); E.font.text(g, '!', s[0], s[1] - 10, lk.alert > .7 ? '#ff5a3a' : '#ffd36a', { align: 'center', shadow: '#000', scale: 2 }); E.ui.bar(g, s[0] - 10, s[1] + 4, 20, 3, Math.min(1, lk.alert), '#ff5a3a'); }
    if (autoWalk && autoWalk.x) { const s = r.w(autoWalk.x, autoWalk.y, 0); E.px.rect(g, Math.round(s[0]) - 1, Math.round(s[1]) - 1, 3, 3, '#ffd36a'); }
  });
  if (overlay === 'wire' && W) drawWire(r);
  if (overlay === 'listen' && L) drawListen(r);
  if (demo) r.text(('DEMONSTRATION - PRESS ANY BUTTON').toUpperCase(), r.W / 2, r.H - 18, Math.floor(game.time * 2) % 2 ? '#ffffff' : '#b8a888', { align: 'center', shadow: '#000' });
  talk.draw(r);
}
function fixupAfterLoad() {
  // put the people where the saved stage expects them
  if (S.stage === 'chase') startChaseStage();
  if (S.stage === 'box') toBox();
  if (S.stage === 'report' || S.stage === 'done') { P.dray.pose = 'kneel'; const [sx, sy] = spawnXY('boxsuspect'); Object.assign(P.dray.body, { x: sx, y: sy }); }
}
const STAGE_START = {   // for tests: begin a fresh case at a later stage
  surveil() { S.approach = 'book'; },
  tip() { S.approach = 'book'; S.photos = { lorne: true, sweets: true, dray: true }; },
  wire() { STAGE_START.tip(); S.tip = 'paid'; },
  listen() { STAGE_START.wire(); S.tapPlanted = true; },
  chase() { STAGE_START.listen(); S.wireLog = 4; startChaseStage(); },
  box() { STAGE_START.chase(); S.chase.caught = true; S.chase.clean = true; toBox(); },
  report() { STAGE_START.box(); S.box.result = 'flipped'; }
};

/* ---------- the pilot: the attract mode plays the case with cheats (no heat, a quick sprint, a free tap) ---------- */
let pilot = null;
function pilotInit() { pilot = { i: 0, t: 0, nav: 0, wait: 0, did: false, stuck: 0, last: null, confirmT: 0, boxT: 0 }; }
function pilotWalk(x, y, within, ctl) {
  const d = Math.hypot(x - hero.x, y - hero.y);
  if (d <= within) return true;
  flow.update(x, y); const dir = flow.dir(hero.x, hero.y, x, y) || [0, 0], l = Math.hypot(dir[0], dir[1]) || 1;
  ctl.move = [dir[0] / l, dir[1] / l]; ctl.sprint = true; ctl.manual = false;
  const p = pilot; if (p.last && Math.hypot(hero.x - p.last[0], hero.y - p.last[1]) < .3) p.stuck += 1 / 60; else p.stuck = 0; p.last = [hero.x, hero.y];
  if (p.stuck > 1.6) { Object.assign(hero, { x: hero.x + ctl.move[0] * 20, y: hero.y + ctl.move[1] * 20, vx: 0, vy: 0 }); p.stuck = 0; }
  return false;
}
function pilotThink(dt) {
  const p = pilot || (pilotInit(), pilot), ctl = { move: [0, 0], sprint: false, camera: false, interact: false, tackle: false, board: false, view: false, cancel: false, manual: false, aim: null };
  hero.sprintSpeed = 150; hero.stamina = hero.staminaMax; S.heat = 0;
  for (const lk of lookouts) lk.alert = 0;
  p.t += dt; pilotCtl = ctl;
  // dialogue, the box and results run themselves
  if (talk.open) { p.confirmT += dt; if (p.confirmT > .9) { p.confirmT = 0; I.tap('confirm'); } return; }
  if (ui.screen || boxScreen) {
    if (boxScreen) { p.boxT += dt; if (p.boxT > 1.6) { p.boxT = 0; if (S.box.result) { leaveBox(); } else { const opts = boxOptions(S), order = ['wire', 'photo', 'tip', 'chase', 'soft', 'deal', 'bluff']; const id = (order.map(k => opts.find(o => o.id === k)).find(Boolean) || opts[0]).id; pickBox(id); } } return; }
    if (resultsShown) { p.wait += dt; if (p.wait > 9) { ui.hide(); p.wait = 0; resultsShown = false; startAttract(); } return; }
    return;
  }
  if (busyScript()) return;
  if (overlay === 'wire') { const st = WIRE_STEPS[Math.min(W.step, 2)], m = wireMarker(W.t, st.speed); if (Math.abs(m - st.centre) < .035) ctl.interact = true; return; }
  if (overlay === 'listen') { if (L.done) { p.wait += dt; if (p.wait > 1.4) { ctl.interact = true; p.wait = 0; } } else if (L.phase === 'line' && curLine()[1] && !L.hit && L.t > .5) ctl.interact = true; return; }
  const near = (tag, within = 18, i = 0) => { const [x, y] = spawnXY(tag, i); return pilotWalk(x, y, within, ctl); };
  const go = (id) => { const o = interactables().find(q => q.id === id); if (o) o.run(); };
  const stg = S.stage;
  if (S.done) return;
  if (stg === 'brief') { if (p.t < 1.2) return; if (near('kowalczyk', 18)) go('kowalczyk'); }
  else if (stg === 'surveil') {
    const k = crewList().find(([n]) => !S.photos[n]); if (!k) return;
    const [n, c] = k, spots = { lorne: [34.5, 26.5], sweets: [34.5, 25.5], dray: [38.5, 27.5] }, [sx, sy] = cellXY(...spots[n]);
    if (pilotWalk(sx, sy, 10, ctl)) { ctl.camera = true; ctl.aim = Math.atan2(c.y - hero.y, c.x - hero.x); c.wary = 0; ctl.sprint = false; }
  }
  else if (stg === 'tip') { if (near('tooley', 18)) go('tooley'); }
  else if (stg === 'wire') { if (near('payphone', 14)) go('payphone'); }
  else if (stg === 'listen') { if (near('van', 14)) go('van'); }
  else if (stg === 'chase') {
    if (!chase) return; if (!chase.running) { near('gate', 60); return; }
    P.dray.body.sprintSpeed = 96; if (pilotWalk(P.dray.x, P.dray.y, 18, ctl)) ctl.tackle = true; if (chase.cornered && !chase.done) { if (Math.hypot(P.dray.x - hero.x, P.dray.y - hero.y) < 22) go('cuff'); }
  }
  else if (stg === 'box') { if (near('boxhero', 14)) { if (Math.hypot(P.dray.x - hero.x, P.dray.y - hero.y) < 60) go('dray'); } }
  else if (stg === 'report') { if (near('pruitt', 20)) go('pruitt'); }
}

/* ---------- the AI Hub round ---------- */
let hubT = 0;
function hubTick(dt) {
  hubT += dt; if (hubT < 1) return; hubT = 0;
  try { HUB.progress({ score: caseScore(S), label: STAGE_NAME[S.stage] + ' · ' + evidenceList(S).length + ' exhibits' }); } catch (e) { /* ignore */ }
}
function hubSetup() {
  HUB.connect({ mode: 'parallel', seats: [1, 4] }).then(info => {
    if (!info) return;   // no hub after all: the game runs as it does on its own (the title)
    HUB.on('time-up', () => { if (!sessionEnded) { sessionEnded = true; try { HUB.result({ score: caseScore(S), stats: { exhibits: evidenceList(S).length, burns: S.burns } }); } catch (e) { /* ignore */ } } });
    HUB.on('end', () => { sessionEnded = true; music(null); try { A.mute(true); } catch (e) { /* ignore */ } });
    HUB.ready();
  });
}

/* ---------- the handle tests and tools use ---------- */
game.debug = {
  snapshot: () => ({ scene: game.sceneName, stage: S && S.stage, hero: hero ? [Math.round(hero.x), Math.round(hero.y)] : null, heat: Math.round(S.heat), cash: S.cash, photos: Object.assign({}, S.photos), tip: S.tip, tap: S.tapPlanted, wireLog: S.wireLog, chase: chase ? { running: chase.running, done: chase.done, cornered: chase.cornered, t: Math.round(chase.t) } : null, caught: S.chase.caught, box: S.box.result, hour: Math.round(S.hour * 10) / 10, burns: S.burns, done: S.done, overlay, boxScreen, demo, talking: !!talk.open, evidence: evidenceList(S).length, score: caseScore(S), errors: game.errors.length }),
  state: () => S, setState(patch) { Object.assign(S, patch); }, hero: () => hero, people: () => P, lookouts: () => lookouts, map: () => map, walkers: () => walkers, chase: () => chase,
  teleport(x, y) { Object.assign(hero, { x, y, vx: 0, vy: 0 }); }, tele: (tag, i) => placeHero(tag, i), spawn: spawnXY, interact: id => { const o = interactables().find(q => q.id === id); if (o) o.run(); return !!o; },
  startCase, startAttract, pick: pickBox, startBox, showAbout, endCase, whistle, openBoard, overlay: () => overlay, wire: () => W, listen: () => L, boxScreen: () => boxScreen, pilot: () => pilot, photo: photoTaken,
  tackle: tackleAttempt, leaveBox, hoverId: () => hover && hover.id, autoWalk: () => autoWalk, scriptBusy: busyScript, toStage, doBurn, triggerChase, verdict: () => verdict(S), toBox, STAGE_START
};

/* ---------- boot ---------- */
if (HUB && HUB.active) hubSetup();
if (IN_SESSION) { demo = false; S = newCase({ stage: 'surveil' }); S.approach = 'book'; }
game.start({ scene: IN_SESSION ? 'play' : 'title', scenes: { title, play } });
/* a deep link for tools and checks: #play, #attract or #<stage> (surveil, tip, wire, listen, chase, box, report) */
{ const h = typeof location !== 'undefined' ? location.hash.slice(1) : ''; if (!IN_SESSION && h) { if (h === 'play') startCase(); else if (h === 'attract') startAttract(); else if (STAGE_START[h]) startCase({ stage: h }); } }
