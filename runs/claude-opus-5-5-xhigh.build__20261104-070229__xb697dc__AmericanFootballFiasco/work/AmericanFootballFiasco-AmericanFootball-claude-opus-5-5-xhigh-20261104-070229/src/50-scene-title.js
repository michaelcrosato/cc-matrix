// The title: Tumbleweed Field at dusk, the Fiascos and the Mudhogs lined up at midfield, Fumbles dancing, a gag every few
// seconds; the logo cracks in; PRESS START. Ten seconds without input starts the attract mode. On a touch-only device:
// CONTROLLER OR KEYBOARD REQUIRED and a SETTINGS button. Also the idle detector and the shared stage behind the menus.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, F = FF.F, YD = 16, game = FF.game, ui = FF.ui, glyph = FF.glyph;
/* ---- idle: seconds since any input from anyone ---- */
const idle = FF.idle = { t: 0, ptr: null, any: false };
idle.update = dt => {
  let hit = false; const I = game.input;
  for (const p of game.players) if (p.anyPressed && p.anyPressed()) hit = true;
  const ptr = I.pointer(); if (ptr && (!idle.ptr || Math.hypot(ptr[0] - idle.ptr[0], ptr[1] - idle.ptr[1]) > 6)) hit = true; if (ptr) idle.ptr = ptr.slice();
  if (I.clicked()) hit = true;
  const mv = I.move(); if (Math.hypot(mv[0], mv[1]) > .3) hit = true;
  if (FF.touchTapped || FF.rawInput) { hit = true; FF.touchTapped = false; FF.rawInput = false; }   // (any key, even one bound to nothing)
  if (hit) { idle.t = 0; idle.any = true; } else idle.t += dt;
  return idle.t;
};
idle.reset = () => { idle.t = 0; };
/* ---- touch-only devices: a coarse pointer, no fine one, touch points, no pad, no key ---- */
const touchOnly = FF.touchOnly = { locked: false };
touchOnly.check = () => {
  if (typeof matchMedia !== 'function' || typeof navigator === 'undefined') return false;
  const coarse = matchMedia('(pointer: coarse)').matches, fine = matchMedia('(any-pointer: fine)').matches, touch = (navigator.maxTouchPoints || 0) > 0;
  return coarse && !fine && touch;
};
touchOnly.init = () => {
  touchOnly.locked = touchOnly.check() && !touchOnly.unlocked;
  if (touchOnly.locked) { game.input.touchEnabled = false; }
  if (typeof addEventListener === 'function') {
    addEventListener('keydown', () => { touchOnly.unlocked = true; touchOnly.locked = false; });
    addEventListener('gamepadconnected', () => { touchOnly.unlocked = true; touchOnly.locked = false; });
    addEventListener('touchstart', () => { FF.touchTapped = true; }, { passive: true });
    for (const ev of ['keydown', 'pointerdown', 'wheel']) addEventListener(ev, () => { FF.rawInput = true; }, { passive: true, capture: true });
    // a real mouse move (not jitter) makes the mouse the device used last: hover moves the focus, prompts show keys and mouse
    let mx = null, my = null; addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; if (mx !== null && Math.abs(e.clientX - mx) + Math.abs(e.clientY - my) > 3 && game.input.lastDevice !== 'mouse') game.input.lastDevice = 'mouse'; mx = e.clientX; my = e.clientY; }, { passive: true });
  }
};
/* ---- the stage: the stadium, the crowd and a few rigs behind the title and the menus ---- */
class Stage {
  constructor(id = 'tumbleweed', o = {}) {
    this.st = new FF.Stadium(id, { night: o.night }); this.t = 0;
    const T = FF.data.teams, home = T[o.home || 'fiascos'], away = T[o.away || 'mudhogs'];
    this.crowd = new FF.Crowd(this.st, [home, away], {});
    this.cast = [];
    const line = (team, side) => ['C', 'LG', 'RG', 'QB', 'RB', 'WR1', 'WR2'].forEach((sl, i) => { const p = team.bySlot[sl], x = F.MID_X + (side ? 1 : -1) * (sl === 'QB' ? 30 : sl === 'RB' ? 80 : 14), y = F.MID_Y + (sl === 'LG' ? -24 : sl === 'RG' ? 24 : sl === 'WR1' ? -90 : sl === 'WR2' ? 90 : 0); this.cast.push({ rig: FF.Rigs.athlete(p, team, !side), x, y, facing: side ? Math.PI : 0, pose: ['C', 'LG', 'RG'].includes(sl) ? 'stance3' : 'stance2', slot: sl, side }); });
    const dline = (team, side) => ['DE1', 'NT', 'DE2', 'LB1', 'LB2', 'CB', 'S'].forEach(sl => { const p = team.bySlot[sl], y = { DE1: -40, NT: 0, DE2: 40, LB1: -60, LB2: 60, CB: -110, S: 0 }[sl], x = F.MID_X + (side ? 1 : -1) * ({ DE1: 16, NT: 16, DE2: 16, LB1: 60, LB2: 60, CB: 90, S: 170 }[sl]); this.cast.push({ rig: FF.Rigs.athlete(p, team, !side), x, y: F.MID_Y + y, facing: side ? Math.PI : 0, pose: ['DE1', 'NT', 'DE2'].includes(sl) ? 'stance3' : 'stance2', slot: sl, side }); });
    line(home, 0); dline(away, 1);
    this.mascot = { rig: FF.Rigs.mascot(home), x: F.MID_X - 40, y: F.SIDE_B + 40, facing: -Math.PI / 2, pose: 'celebrate', dance: 0 };
    this.cast.push(this.mascot);
    this.gagT = 4; this.gag = null; this.ball = null;
  }
  enter() { this.st.enter({ weather: 'clear' }); FF.cam.reset(F.MID_X, F.MID_Y + 20); FF.cam.setView('broadcast'); FF.cam.applyZoom(1.2, true); game.cam.smooth = 0; game.cam.bounds = null; game.focus(F.MID_X, F.MID_Y + 20, 0); }
  update(dt) {
    this.t += dt; this.crowd.update(dt, null); this.gagT -= dt;
    if (this.gagT <= 0) { this.gagT = 6 + Math.random() * 2; this.gag = { k: Math.floor(Math.random() * 3), t: 0 }; }
    const G = this.gag; if (G) { G.t += dt; if (G.t > 3.2) this.gag = null; }
    for (const c of this.cast) {
      let pose = c.pose, vx = 0, extra = {};
      if (G && G.k === 0 && c.slot === 'QB') { pose = G.t < .5 ? 'throw' : 'idle'; extra.poseU = Math.min(1, G.t / .5); }
      if (G && G.k === 0 && c.slot === 'NT' && G.t > .9 && G.t < 2.4) { pose = 'tackled'; extra.poseU = Math.min(1, (G.t - .9) * 2); extra.fallBack = true; }
      if (G && G.k === 1 && c.slot === 'RB' && c.side === 0) { pose = G.t < .6 ? 'kick' : G.t < 2 ? 'down' : 'getUp'; extra.poseU = G.t < .6 ? G.t / .6 : (G.t - 2) / 1.2; extra.fallBack = true; }
      if (c === this.mascot) { pose = 'celebrate'; c.rig.ff.onFire = G && G.k === 2 && G.t < 2.6; }
      FF.Rigs.drive(c.rig, Object.assign({ x: c.x, y: c.y, z: 0, vx, vy: 0, facing: c.facing, pose, poseT: this.t, dance: c.dance }, extra), dt);
    }
    if (G && G.k === 0) { const k = Math.min(1, Math.max(0, (G.t - .45) / .45)); this.ball = G.t > .45 && G.t < .95 ? { x: F.MID_X - 30 + k * 46, y: F.MID_Y, z: 26 + Math.sin(k * Math.PI) * 30 - k * 10 } : null; if (G.t > .9 && G.t < 1) game.particles.impact(F.MID_X + 16, F.MID_Y, 20, 1, '#ffffff'); }
    else this.ball = null;
    if (G && G.k === 2 && G.t < 2.6 && Math.random() < .5) game.particles.fire(this.mascot.x, this.mascot.y, 40, 1, { size: .6 });
    game.focus(F.MID_X, F.MID_Y + 20, 0);
  }
  draw(r) {
    this.st.draw(r, this.t); this.crowd.draw(r);
    const view = E.charView(r.view);
    for (const c of this.cast) { r.shadow(c.x, c.y, 6, .35); r.actor(c.x, c.y, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, view)); }
    if (this.ball) { const b = this.ball; r.shadow(b.x, b.y, 2.5, .3); r.queue(b.x, b.y, b.z, g => { const [x, y] = r.w(b.x, b.y, b.z); FF.drawBall(g, x, y, game.zoom || 1, 0); }); }
  }
}
FF.Stage = Stage;
let stage = null;
FF.stage = () => stage || (stage = new Stage());

/* ---- the logo: AMERICAN FOOTBALL over a cracked, burning FIASCO, a football bouncing off its O ---- */
FF.drawLogo = (g, r, t, y0 = 18) => {
  // a narrow (portrait) screen: start below the corner's Menu and Full screen buttons when the title would run under them
  let ca = null; try { ca = game.cornerArea(); } catch (e) { ca = null; }
  if (ca && r.W / 2 + E.font.width('AMERICAN FOOTBALL', { scale: 2 }) / 2 + 2 > ca.x0 && y0 < ca.y1 + 2) y0 = Math.round(ca.y1) + 4;
  FF.logoTop = y0;
  const cx = Math.round(r.W / 2), k = Math.min(1, t / .6), drop = (1 - E.ease.outBounce(k)) * -60;
  E.font.title(g, 'AMERICAN FOOTBALL', cx, y0 + drop, { scale: 2, colors: ['#ffffff', '#fff4d8', '#ffb347', '#e0662a'], outline: '#1a0a20', depth: 2, depthColor: '#4a1a6a', align: 'center' });
  const hit = t > .9, shake = hit && t < 1.3 ? Math.round(Math.sin(t * 60) * 2) : 0, fy = y0 + 22;
  E.font.title(g, 'FIASCO', cx + shake, fy, { scale: 5, colors: ['#fff8a0', '#ffd84a', '#ff9a2a', '#e8481a', '#a8201a'], outline: '#1a0a10', depth: 4, depthColor: '#5a1030', align: 'center' });
  if (hit) { const w = E.font.width('FIASCO', { scale: 5 }), x0 = cx - w / 2 + 6; let px0 = x0, py0 = fy + 6; for (let i = 1; i <= 7; i++) { const nx = x0 + i * (w - 12) / 7, ny = fy + 8 + ((i * 37) % 9) * 2.4; px.line(g, px0 + shake, py0, nx + shake, ny, '#2a0a14', 1); px0 = nx; py0 = ny; } }
  // the football: thrown in, it hits the O and bounces off
  const w5 = E.font.width('FIASCO', { scale: 5 }), oX = cx + w5 * .42, oY = fy + 16;
  let bx, by;
  if (t < .9) { const u = t / .9; bx = r.W + 20 - (r.W + 20 - oX) * u; by = oY - 50 + 50 * u * u; } else { const u = Math.min(1.6, t - .9); bx = oX + u * 70; by = oY - Math.sin(Math.min(1, u / .7) * Math.PI) * 30 + Math.max(0, u - .7) * 60; }
  if (t < 2.5) { FF.drawBall(g, bx, by, 2.2, t * 8); if (t < .9) for (let i = 1; i < 4; i++) px.line(g, bx + i * 6, by - 4 + i, bx + i * 6 + 6, by - 4 + i, '#ffffff'); }
  // flames licking the top of FIASCO
  for (let i = 0; i < 12; i++) { const fx = cx - w5 / 2 + 8 + i * (w5 - 16) / 11, h = 4 + Math.abs(Math.sin(t * 7 + i * 1.7)) * 7; px.blend(g, .7, 'add', () => { px.poly(g, [[fx - 3, fy + 2], [fx + 3, fy + 2], [fx + Math.sin(t * 5 + i) * 2, fy + 2 - h]], i % 2 ? '#ff9a2a' : '#ffd84a'); }); }
};
FF.scenes = FF.scenes || {};
let tt = 0, startedBy = false;
FF.scenes.title = {
  view: 'broadcast', input: FF.KEYS, res: 'ps1', camera: { zoom: false },
  enter() { tt = 0; idle.reset(); FF.stage().enter(); FF.audioFx.music('ANTHEM'); game.lights.enabled = true; },
  update(dt) {
    tt += dt; FF.stage().update(dt);
    const it = idle.update(dt);
    if (it > 10 && !game.shell.screen) { game.go('attract', { from: 'title' }); return; }
    if (touchOnly.locked) {
      const c = game.input.clicked(); if (c) { const b = settingsBtn(); if (c[0] >= b.x && c[0] < b.x + b.w && c[1] >= b.y && c[1] < b.y + b.h) game.menu('settings'); }
      return;
    }
    if (tt > .8 && !game.shell.screen && (game.players.some(p => p.pressed('start') || p.pressed('confirm') || p.pressed('b1')) || game.input.clicked())) { game.audio.sfx('menuSelect'); startedBy = true; game.go('menu', null, { fade: 'wipe' }); }
  },
  draw(r) {
    FF.stage().draw(r);
    r.overlay(g => {
      px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, r.W, 56 + (FF.logoTop || 14), '#0a0414'));
      FF.drawLogo(g, r, tt, 14);
      if (touchOnly.locked) {
        ui.panel(g, r.W / 2 - 150, r.H * .6 - 6, 300, 30, { alpha: .9 });
        ui.T(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H * .6 + 4, '#ffd84a', { align: 'center', scale: 1 });
        const b = settingsBtn(); ui.button(g, b.x, b.y, b.w, b.h, 'SETTINGS', { focus: true, scale: 2 });
      } else if (tt > .8) {
        const on = Math.floor(tt * 2) % 2 === 0 || tt < 1.5, y = Math.round(r.H * .66), dev = idle.any ? glyph.device(game.input) : null;
        if (on) { const w = E.font.width('PRESS START', { scale: 2 }); ui.T(g, 'PRESS START', r.W / 2, y, '#ffffff', { align: 'center', scale: 2 }); const cx = r.W / 2 + w / 2 + 8; if (!dev || dev !== 'gamepad') glyph.chip(g, cx, y + 7, 'start', { dev: 'keyboard' }); if (!dev || dev === 'gamepad') glyph.chip(g, cx + (dev ? 0 : 38), y + 7, 'b1', { dev: 'gamepad' }); }
      }
      ui.T(g, 'v' + FF.version + '  ·  ' + E.versionLabel(), 6, r.H - 10, '#8a86a8', { font: 'tiny' });
      ui.T(g, '© 2026  A FIASCO PRODUCTION', r.W - 6, r.H - 10, '#8a86a8', { font: 'tiny', align: 'right' });
    });
  }
};
function settingsBtn() { const w = 120, h = 24; return { x: Math.round(game.W / 2 - w / 2), y: Math.round(game.H * .6 + 32), w, h }; }
})();
