// Sounds (9.3), all synthesized: the SMG, clicks, reloads, brass, explosions, ricochets, enemy fire, whizzes, telegraph
// ticks, projectile whistles, rotors, engines, rain, alarms, pickups, stings. Positional: volume by depth, pan by screen x.
// The Sim's events -> sounds, and the rumble map.
(() => {
const E = My3D2dge, WP = globalThis.WP, { clamp } = WP;
const A = WP.Audio = { game: null, loopT: {} };
const N = (f, to, dur, vol, o = {}) => Object.assign({ wave: 'noise', freq: f, to, dur, vol }, o);
const T = (wave, f, to, dur, vol, o = {}) => Object.assign({ wave, freq: f, to, dur, vol }, o);
A.SFX = {
  smg: [N(2400, 700, .06, .32, { filter: 'bandpass', q: .8 }), T('square', 90, 50, .06, .22), N(5000, 3000, .03, .08, { filter: 'highpass' })],
  smgFury: [N(2800, 900, .05, .3), T('square', 110, 60, .05, .2), T('sine', 1200, 600, .04, .05)],
  dry: [T('square', 1800, 1500, .02, .12), N(4000, 3000, .015, .1)],
  reloadOut: [T('square', 700, 500, .03, .14), N(2000, 900, .06, .12)],
  reloadIn: [T('square', 520, 380, .04, .16), N(1500, 800, .05, .14, { delay: .02 })],
  charge: [N(3000, 1200, .05, .16), T('square', 900, 1400, .04, .1, { delay: .07 }), N(2500, 1800, .03, .14, { delay: .1 })],
  brass: [T('triangle', 3200, 2900, .03, .05), T('triangle', 2700, 2500, .025, .04, { delay: .09 })],
  throw: [N(800, 2400, .2, .18, { filter: 'bandpass', q: 1.4 }), T('square', 220, 160, .05, .1)],
  boom: [N(900, 60, .7, .5, { filter: 'lowpass', q: .7 }), T('sine', 60, 30, .6, .45), N(3000, 400, .25, .2, { delay: .02 })],
  boomBig: [N(700, 40, 1.1, .6, { filter: 'lowpass', q: .7 }), T('sine', 55, 25, .9, .55), N(2500, 300, .4, .25, { delay: .04 }), T('triangle', 80, 30, .7, .25, { delay: .1 })],
  boomSmall: [N(1400, 120, .35, .35, { filter: 'lowpass' }), T('sine', 90, 40, .3, .25)],
  ricochet: [T('sine', 2400, 900, .22, .1), N(5000, 4000, .02, .06)],
  thud: [N(600, 200, .06, .18, { filter: 'lowpass' })],
  rifle: [N(1800, 500, .09, .26), T('square', 160, 70, .06, .12)],
  mg: [N(1400, 400, .07, .24), T('square', 120, 60, .05, .12)],
  whiz: [T('sine', 3200, 1400, .12, .06), N(6000, 3000, .08, .04, { filter: 'highpass' })],
  hitPlayer: [N(600, 120, .18, .4, { filter: 'lowpass' }), T('square', 140, 60, .15, .22)],
  tick: [T('square', 1200, 1200, .025, .07)],
  whistleProj: [T('sine', 2200, 700, 1.6, .08, { attack: .3 })],
  knifeWhoosh: [N(1500, 4000, .25, .12, { filter: 'bandpass', q: 2 })],
  rocket: [N(1200, 900, .5, .16, { filter: 'bandpass', q: .6 }), T('saw', 90, 70, .3, .06)],
  mortarLaunch: [T('sine', 140, 60, .3, .35), N(800, 200, .2, .2)],
  shellFire: [N(800, 80, .5, .45, { filter: 'lowpass' }), T('sine', 70, 35, .5, .4)],
  rotor: [N(300, 200, .05, .16, { filter: 'lowpass', q: 2 })],
  engine: [T('saw', 55, 50, .12, .05), N(200, 150, .12, .05, { filter: 'lowpass' })],
  boat: [T('saw', 70, 66, .1, .05)],
  rain: [N(6000, 5000, .4, .05, { filter: 'highpass', attack: .1 })],
  thunder: [N(300, 40, 2.2, .35, { filter: 'lowpass', attack: .1 })],
  alarm: [T('square', 880, 880, .12, .12), T('square', 660, 660, .12, .12, { delay: .14 })],
  officerWhistle: [T('sine', 2600, 2700, .35, .14, { vib: [30, .02] }), T('sine', 2600, 2600, .25, .14, { delay: .45, vib: [30, .02] })],
  pickMag: [T('square', 660, 660, .05, .14, { arp: [0, 7], step: .05 })],
  pickGren: [T('square', 440, 440, .08, .14, { arp: [0, 5, 10], step: .04 })],
  pickHeal: [T('triangle', 523, 523, .2, .18, { arp: [0, 4, 7, 12], step: .05 })],
  pickBig: [T('square', 523, 523, .3, .16, { arp: [0, 4, 7, 12, 16], step: .05 }), T('triangle', 262, 262, .3, .1)],
  pickPoints: [T('square', 988, 988, .14, .12, { arp: [0, 5], step: .07 })],
  fury: [T('saw', 220, 880, .5, .14), T('square', 440, 440, .6, .12, { arp: [0, 4, 7, 12, 7, 12], step: .08, delay: .1 })],
  civHit: [T('square', 300, 280, .4, .16), T('square', 317, 300, .4, .14), T('square', 450, 420, .4, .1)],
  rescued: [T('square', 523, 523, .6, .14, { arp: [0, 4, 7, 12, 16, 19], step: .08 }), T('triangle', 262, 262, .6, .14, { arp: [0, 7, 12], step: .16 })],
  lowAmmo: [T('square', 1400, 1400, .05, .08)],
  heartbeat: [T('sine', 60, 40, .12, .35), T('sine', 55, 38, .1, .25, { delay: .18 })],
  menuMove: [T('square', 880, 880, .03, .08)], menuPick: [T('square', 660, 1320, .08, .12)], menuBack: [T('square', 660, 330, .08, .1)],
  klaxon: [T('saw', 330, 330, .4, .14, { vib: [6, .06] }), T('saw', 330, 330, .4, .14, { delay: .55, vib: [6, .06] })],
  shatter: [N(6000, 3000, .2, .2, { filter: 'highpass' }), T('triangle', 4000, 2000, .1, .06)],
  splinter: [N(2000, 600, .12, .2), T('square', 300, 200, .05, .08)],
  armored: [T('triangle', 3000, 2600, .06, .08), N(6000, 5000, .03, .05)],
  bossPart: [N(800, 100, .5, .35, { filter: 'lowpass' }), T('square', 200, 60, .4, .14)],
  splash: [N(2500, 600, .2, .12, { filter: 'bandpass' })],
  chute: [N(900, 400, .4, .1, { filter: 'bandpass', q: 3 })],
  steam: [N(5000, 3000, .8, .2, { filter: 'highpass' })],
  flame: [N(600, 300, .9, .25, { filter: 'lowpass', attack: .1 })],
  squawk: [T('square', 900, 1500, .1, .12, { vib: [30, .2] }), T('square', 1100, 700, .1, .1, { delay: .1 })],
  cheer: [N(2000, 2200, .6, .1, { filter: 'bandpass', q: 1, attack: .1 })],
  tallyTick: [T('square', 1320, 1320, .025, .08)], tallyBig: [T('square', 523, 523, .25, .16, { arp: [0, 7, 12], step: .06 })],
  coin: [T('square', 988, 988, .08, .12), T('square', 1319, 1319, .25, .12, { delay: .07 })],
  spark: [N(7000, 4000, .05, .08, { filter: 'highpass' })]
};
A.define = game => { A.game = game; for (const k in A.SFX) game.audio.define('wp_' + k, A.SFX[k]); };
A.play = (name, o = {}) => { const g = A.game; if (!g || WP.headless || A.muteAll) return; const k = WP.ctx && WP.ctx.demo ? .5 : 1; g.audio.sfx('wp_' + name, Object.assign({ vary: .05 }, o, { vol: (o.vol === undefined ? 1 : o.vol) * k })); };   // (the attract demo at half volume)
/** a world point: volume by depth, pan by screen x */
A.at = (name, world, x, y, z, o = {}) => {
  const V = world.view, p = V.project(x, y, z || 0), D = V.depth(x, y);
  const vol = (o.vol || 1) * clamp(1.2 - D / 900, .15, 1), pan = p ? clamp((p[0] / WP.W - .5) * 1.4, -.9, .9) : 0;
  A.play(name, Object.assign({}, o, { vol, pan }));
};
// ---------- the Sim's events -> sounds and rumble ----------
A.onEvents = (world, evs, ctx) => {
  const now = WP.time;
  for (const ev of evs) {
    switch (ev.k) {
      case 'shot': if (ctx.isLocal(ev.pid) || world.players.length > 1) { if (!A._smgT || now - A._smgT > 1 / 15) { A._smgT = now; A.play(ev.fury ? 'smgFury' : 'smg', { vol: ctx.isLocal(ev.pid) ? 1 : .5, pan: clamp((ev.sx / WP.W - .5), -.6, .6) }); } if (ctx.isLocal(ev.pid)) { WP.Gun.shot(ev.pid); ctx.rumble(ev.pid, .06, .03); if (A._bT === undefined || now - A._bT > .2) { A._bT = now; A.play('brass', { vol: .5 }); } }
        if (ev.what === 'cover' || ev.mat === 'metal') { if ((A._ricT || 0) < now - .12 && WP.fxr() < .3) { A._ricT = now; A.at('ricochet', world, ev.x, ev.y, ev.z, { vol: .6 }); } } else if (ev.mat === 'wood') A.at('splinter', world, ev.x, ev.y, ev.z, { vol: .3 }); } break;
      case 'dryClick': if (ctx.isLocal(ev.pid)) A.play('dry'); break;
      case 'reload': if (ctx.isLocal(ev.pid)) { A.play('reloadOut'); A.game && A.game.after && A.game.after(.45, () => A.play('reloadIn')); A.game && A.game.after && A.game.after(.85, () => A.play('charge')); } break;
      case 'pthrow': if (ctx.isLocal(ev.pid)) { A.play('throw'); WP.Gun.throw(ev.pid); ctx.rumble(ev.pid, .45, .2); } break;
      case 'explode': A.at(ev.big >= 2 ? 'boomBig' : ev.big ? 'boom' : 'boomSmall', world, ev.x, ev.y, ev.z, { vol: ev.kind === 'cam' ? 1 : 1 }); if (ev.big >= 1) { ctx.shake(ev.big >= 2 ? 5 : 3); ctx.flash('#fff0c0', .08, .4); } if (ev.kind === 'pgren' || ev.kind === 'barrel' || ev.big >= 2) ctx.freeze(.04); for (const p of world.players) if (ctx.isLocal(p.pid)) ctx.rumble(p.pid, ev.big >= 2 ? .8 : .45, .25); break;
      case 'efire': { const e = world.byId(ev.id); if (!e) break; A.at(ev.proj === 'rocket' || ev.proj === 'missile' ? 'rocket' : ev.proj === 'mortar' ? 'mortarLaunch' : ev.proj === 'shell' ? 'shellFire' : ev.part ? 'mg' : 'rifle', world, e.x, e.y, e.z, { vol: .7 }); if (ev.hit === false && ctx.isLocal(ev.pid) && WP.fxr() < .5) A.play('whiz', { vol: .5, pan: (WP.fxr() - .5) }); break; }
      case 'damage': if (ctx.isLocal(ev.pid) && ev.v > 0) { A.play('hitPlayer'); ctx.rumble(ev.pid, .8, .25); ctx.shake(2); } break;
      case 'telegraph': break;
      case 'proj': { const e = world.byId(ev.id); if (!e) break; if (ev.kind === 'mortar') A.play('whistleProj', { vol: .7 }); else if (ev.kind === 'knife') A.at('knifeWhoosh', world, e.x, e.y, e.z); else if (ev.kind === 'grenade') A.at('throw', world, e.x, e.y, e.z, { vol: .5 }); else if (ev.kind === 'flame') A.at('flame', world, e.x, e.y, 0); break; }
      case 'intercept': A.at('boomSmall', world, ev.x, ev.y, ev.z, { vol: .6 }); A.play('pickPoints', { vol: .5 }); break;
      case 'kill': { const tp = WP.TYPES[ev.type]; if (tp.kind === 'infantry' && WP.Voice) WP.Voice.bark('die', world, ev); if (ev.part === 'head' && ctx.isLocal(ev.by)) A.play('coin', { vol: .4 }); break; }
      case 'pickup': if (ctx.isLocal(ev.pid) || true) { const k = ev.kind; A.play(k === 'mag' || k === 'crate' ? 'pickMag' : k === 'gren' || k === 'gbox' ? 'pickGren' : k === 'ration' || k === 'medkit' ? 'pickHeal' : k === 'fury' || k === 'dynamite' || k === 'flare' ? 'pickBig' : 'pickPoints'); } break;
      case 'fury': A.play('fury'); break;
      case 'civHit': case 'hostageHit': if (ev.pid >= 0) A.play('civHit'); if (WP.Voice) WP.Voice.bark('eek', world, world.byId(ev.id) || ev); break;
      case 'rescued': A.play('rescued'); A.play('cheer', { vol: .6 }); break;
      case 'whistle': { const e = world.byId(ev.id); if (e) A.at('officerWhistle', world, e.x, e.y, e.z); break; }
      case 'spotted': A.play('alarm'); ctx.flash('#ffffff', .06, .3); break;
      case 'propDown': if (ev.type === 'searchlight') A.at('shatter', world, ev.x, ev.y, ev.z); else if (ev.type === 'crate' || ev.type === 'ammoCrate') A.at('splinter', world, ev.x, ev.y, ev.z); else if (ev.type === 'mast') A.at('bossPart', world, ev.x, ev.y, 20); break;
      case 'armored': if ((A._armT || 0) < now - .1) { A._armT = now; A.at('armored', world, ev.x, ev.y, ev.z, { vol: .5 }); } break;
      case 'partDown': A.at('bossPart', world, ev.x, ev.y, ev.z); break;
      case 'bossWarn': A.play('klaxon'); break;
      case 'bossDefeat': ctx.slowmo(); for (const p of world.players) if (ctx.isLocal(p.pid)) ctx.rumble(p.pid, 1, .6); break;
      case 'squawk': { const e = world.byId(ev.id); if (e) A.at('squawk', world, e.x, e.y, e.z); break; }
      case 'chute': A.play('chute', { vol: .6 }); break;
      case 'steam': A.play('steam'); break;
      case 'packFury': if (WP.Voice) WP.Voice.howl(); break;
      case 'unload': { const e = world.byId(ev.id); if (e) A.at('thud', world, e.x, e.y, e.z); break; }
    }
  }
};
// loops emulated by retriggering short sounds: rotors, engines, boats, rain
A.loops = (world, dt) => {
  const t = WP.time, due = (k, iv) => { if ((A.loopT[k] || 0) <= t) { A.loopT[k] = t + iv; return true; } return false; };
  let heli = null, eng = null, boat = null;
  for (const e of world.ents) { if (e.dead) continue; if (e.type === 'heli' || e.type === 'hyenaOne') heli = heli || e; else if (['jeep', 'truck', 'apc', 'tank', 'bigEar', 'warthog', 'ironHog', 'forklift'].includes(e.type)) eng = eng || e; else if (['skiff', 'gunboat', 'crocodile'].includes(e.type)) boat = boat || e; }
  if (heli && due('rotor', .08)) A.at('rotor', world, heli.x, heli.y, heli.z, { vol: .8, vary: .02 });
  if (eng && due('engine', .11)) A.at('engine', world, eng.x, eng.y, eng.z, { vol: .7, vary: .01 });
  if (boat && due('boat', .1)) A.at('boat', world, boat.x, boat.y, boat.z, { vol: .6, vary: .01 });
  if (world.stage.rain && due('rain', .35)) A.play('rain', { vol: .7, vary: .2 });
  if (world.stage.lightning && due('thunder', 9 + WP.fxr() * 6)) A.play('thunder', { vol: .8 });
  for (const e of world.ents) if (e.atk && e.atk.phase === 'tele' && !(e.atk.spec && e.atk.spec.noRing)) { const u = e.atk.t / e.atk.T; if (u > .5 && due('tick' + e.id, .25 - u * .16)) A.play('tick', { pitch: .8 + u * .8, vol: .6 }); }
  const me = world.players.find(p => !p.down);
  if (me && me.damage > 75 && due('heart', .9)) A.play('heartbeat', { vol: .7 });
  if (me && me.mag > 0 && me.mag <= 5 && me.spares.length === 0 && me.fury <= 0 && due('low', .5)) A.play('lowAmmo', { vol: .5 });
};
})();
