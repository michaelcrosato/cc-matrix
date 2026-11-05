/* 61-local: Play, the presentation of one Sim on this machine: it turns each player's device (or the Autopilot, or the
 * network) into commands, steps the Sim, drains its events into effects, sounds, rumble and the HUD, and draws each
 * player's viewport (split screen for local co-op). Reads everything; owns no game rules. */
class Play {
  constructor(o) {
    this.o = o; this.sim = o.sim || new Sim(o);
    this.n = this.sim.players.length;
    this.inputs = o.inputs || [TC.game.input];
    this.aims = this.sim.players.map((p, i) => new Aim(this.inputs[i] || this.inputs[0], i));
    this.huds = this.sim.players.map((p, i) => new Hud(this, i));
    this.cams = this.sim.players.map(() => new CamFX());
    this.fx = new FX(); this.r3 = new Rail3D(); this.bots = o.bots || {}; this.t = 0; this.portraits = {}; this.slow = 0; this.doneT = 0;
    this.local = !o.net; this.net = o.net || null; this.view = o.view || null; this.props = {};
    this.lastScene = null; this.cardT = 0;
    TC.play = this;
  }
  portraitRig(who) {
    let r = this.portraits[who]; if (r !== undefined) return r;
    const sp = reg('speaker', who); r = sp ? new E.Humanoid(Object.assign({}, sp.rig)) : null; if (r) r.update(.016, { x: 0, y: 0, facing: Math.PI / 2 }); this.portraits[who] = r; return r;
  }
  /* ---- one update step ---- */
  update(dt) {
    const sim = this.sim, G = TC.game;
    this.t += dt;
    if (TC.dev && TC.dev.open) { TC.dev.update(dt, this); return; }
    if (tune.view.freeCam && TC.dev) TC.dev.flyStep(dt, this); else if (TC.dev) TC.dev.free = null;
    // commands (a session's Net steps the Sim itself: the host from everyone's commands, a replica from the host's frames)
    if (this.net) this.net.update(dt, this);
    else {
      const cmds = [];
      for (let i = 0; i < this.n; i++) cmds[i] = this.bots[i] ? this.bots[i].command(sim, i, dt) : this.localCmd(i, dt);
      sim.step(dt, cmds);
    }
    for (const ev of sim.drain()) this.onEvent(ev);
    this.fx.step(dt, sim);
    for (const c of this.cams) c.step(dt);
    for (const h of this.huds) h.step(dt);
    for (const id in this.props) this.props[id].step && this.props[id].step(dt);
    if (this.net) { this.slow = 0; G.timeScale = 1; }
    if (this.slow > 0) { this.slow -= dt / Math.max(.05, G.timeScale); G.timeScale = this.slow > 0 ? .35 : (tune.time.speed || 1); }
    else if (G.timeScale !== (tune.time.speed || 1) && !this.o.attract) G.timeScale = tune.time.speed || 1;
    // ambient effects
    const env = sim.stage.env;
    if (env.fireworks && this.fx.r() < dt * .45) { const f = sim.focus(); this.fx.firework([f[0] + 300 + this.fx.r() * 900, f[1] + (this.fx.r() - .5) * 1400, 160 + this.fx.r() * 200], (this.fx.r() * 3) | 0); if (this.local) Audio3.play('firework', { vol: .25 }); }
    if (env.storm) { this.fx.nextBolt -= dt; if (this.fx.nextBolt <= 0) { this.fx.nextBolt = 9 + this.fx.r() * 6; this.bolt = .25; if (TC.game.settings.flashes !== false) TC.game.flash('#ffffff', .12, .25); setTimeout && !HEADLESS && setTimeout(() => Audio3.play('thunder', { vol: .8 }), 500 + this.fx.r() * 900); } }
    this.bolt = Math.max(0, (this.bolt || 0) - dt);
    this.smokeT = Math.max(0, (this.smokeT || 0) - dt); this.smoke = Math.min(1, this.smokeT) * .65;
    // the music's layers follow the phase
    const ph = sim.phase;
    if (ph !== this.lastPhase) { this.lastPhase = ph; if (ph === 'action') { Audio3.layer('drums', 1); Audio3.layer('lead', 1); } else if (ph === 'travel') { Audio3.layer('drums', 0); Audio3.layer('lead', 0); } }
    if (ph === 'action' && sim.timer < 10 && !this.hurry) { this.hurry = true; const A = G.audio; if (A.song) A.tempo((A.song.bpm || 150) + 8); }
    if (ph !== 'action' && this.hurry) { this.hurry = false; const s = reg('song', Audio3.songId); if (s && G.audio.song) G.audio.tempo(s.bpm); }
    if (ph === 'action') { const s = Math.ceil(sim.timer); if (s !== this.lastSec) { this.lastSec = s; if (s <= 5 && s > 0) Audio3.play('timewarn', { vol: .7 }); else if (s <= 10 && s > 0) Audio3.play('timetick', { vol: .5 }); } }
  }
  /** a local player's command this step, from their device */
  localCmd(i, dt) {
    const sim = this.sim, I = this.inputs[this.net ? 0 : i] || this.inputs[0], A = this.aims[i], rect = this.rectFor(this.net ? 0 : i);
    if (!I || (tune.view.freeCam && i === 0)) return NOCMD;
    A.update(dt, rect, this.assistTargets(i, rect), sim.players[i].c > .5);
    const c = commandFrom(I, A);
    if (sim.cut || sim.phase === 'continue' || sim.players[i].out) { c.firePressed = c.firePressed || I.pressed('confirm') || I.pressed('start'); c.fireDown = c.fireDown || I.down('confirm'); }
    return c;
  }
  /** the local view of player i: the predicted cover and the local aim on a replica */
  localView(i) { const n = this.net; return n && !n.isHost && i === n.me ? { c: n.localC, aim: [this.aims[i].ax, this.aims[i].ay] } : null; }
  rectFor(i) { const G = TC.game, vps = G.viewports; if (vps && vps.length > 1 && vps[i]) { const v = vps[i]; return { x: v.x, y: v.y, w: v.w, h: v.h }; } return { x: 0, y: 0, w: G.screen.W, h: G.screen.H }; }
  /** aim-assist targets in view units for player i */
  assistTargets(i, rect) {
    const sim = this.sim, cam = sim.cameraFor(i), out = [];
    for (const e of sim.enemies) { if (!e.alive || e.civ || e.ally || !e.vols) continue; const c = e.vols.head ? e.vols.head.c : e.vols.body ? e.vols.body.c : null; if (!c) continue; const a = worldToAim(cam, [c[0], c[1], c[2] - 6]); if (a) out.push([a[0], a[1], 6 / a[2] / Math.tan(cam.fov * DEG / 2)]); }
    for (const pr of sim.projectiles) { if (pr.owner >= 0) continue; const a = worldToAim(cam, pr.pos); if (a) out.push([a[0], a[1], pr.r * 1.7 / a[2] / Math.tan(cam.fov * DEG / 2)]); }
    void rect; return out;
  }
  /* ---- events into effects ---- */
  onEvent(ev) {
    const sim = this.sim, fx = this.fx, hud = i => this.huds[i] || this.huds[0], all = f => this.huds.forEach(f), loc = this.local;
    const gunAt = i => { const c = sim.cameraFor(i), B = camBasis(c, 2, 2, {}); return [c.x + B.fx * 14 + B.rx * 7 - B.ux * 6, c.y + B.fy * 14 + B.ry * 7 - B.uy * 6, c.z + B.fz * 14 + B.rz * 7 - B.uz * 6]; };
    switch (ev.type) {
      case 'shot': {
        const W = reg('weapon', ev.w), g0 = gunAt(ev.p); fx.muzzle(g0, ev.w === 'sg' || ev.w === 'gl' ? 1.6 : ev.w === 'mg' ? .9 : 1);
        // tracers for the hitscan guns (ev.to: one end per ray); the launcher's round is drawn as itself (ev.to: one point)
        if (ev.w !== 'gl' && Array.isArray(ev.to)) ev.to.forEach((t, k) => { if (Array.isArray(t) && (ev.w !== 'hg' || k === 0)) fx.tracer(g0, t, ev.w === 'sg' ? [255, 210, 150] : [255, 235, 170], ev.w === 'hg' ? .04 : .06); });
        this.cams[ev.p] && this.cams[ev.p].recoil(W.recoil); if (ev.w === 'sg' || ev.w === 'gl') this.cams[ev.p].kick(.12);
        Audio3.play(W.sfx, { vol: ev.p === this.me() ? 1 : .5 });
        this.rumble(ev.p, ev.w === 'sg' ? .45 : ev.w === 'gl' ? .5 : .18, ev.w === 'sg' ? .12 : .06);
        break;
      }
      case 'impact': if (ev.at) { fx.impact(ev.at, ev.mat); Audio3.play('imp_' + (ev.mat || 'stone'), { at: ev.at, vol: .7 }); if (ev.mat === 'metal' && fx.r() < .3) Audio3.play('ricochet', { at: ev.at, vol: .5 }); } break;
      case 'ehit': { fx.burst(ev.at, 5, { speed: 40, g: 160, life: .35, size: 1.6, mode: 2, color: [90, 30, 40] }); fx.spark(ev.at, 2, [255, 255, 255]); Audio3.play('ehit', { at: ev.at }); const e = sim.enemyById(ev.e); if (e && e.rig && fx.r() < .4) Voice.bark('captor', 'hurt', { vol: .25 }); break; }
      case 'hitmark': hud(ev.p).mark(ev.head); break;
      case 'headshot': Audio3.play('head', { vol: .8 }); hud(ev.p).call('HEADSHOT', { scale: 1, life: .6, slot: 'top', color: '#ffd36a' }); break;
      case 'quick': hud(ev.p).call('QUICK KILL', { scale: 1, life: .6, slot: 'top', color: '#9fe3ff' }); break;
      case 'kill': { if (ev.kind !== 'drone' && ev.kind !== 'jetski') Voice.bark('captor', 'die', { vol: .3 }); if (ev.kind === 'drone') { fx.spark(ev.at, 16); fx.smoke(ev.at, 3); } break; }
      case 'score': if (ev.at) hud(ev.p).pop(ev.pts, ev.at); break;
      case 'eshot': {
        const e = sim.enemyById(ev.e), from = ev.from;
        fx.muzzle(from, ev.kind === 'gunner' || ev.kind === 'turret' ? 1.2 : .8, ev.ally ? [200, 230, 255] : [255, 200, 120]);
        if (ev.ally) { fx.tracer(from, ev.to, [180, 220, 255], .08); Audio3.play('hg', { at: from, vol: .4 }); break; }
        if (ev.miss && ev.to) { fx.tracer(from, ev.to, [255, 160, 90], .07); Audio3.play('whizz', { at: ev.to, vol: .6 }); if (fx.r() < .5) fx.impact(V3.add(ev.to, V3.mul(V3.norm(V3.sub(ev.to, from)), 30)), 'stone'); }
        else if (ev.p >= 0) { const c = sim.cameraFor(ev.p); fx.tracer(from, [c.x, c.y, c.z - 8], [255, 120, 80], .06); }
        Audio3.play(ev.kind === 'drone' ? 'zap' : ev.kind === 'gunner' || ev.kind === 'turret' ? 'minigun' : 'hg', { at: from, vol: .55, pitch: .8 });
        void e; break;
      }
      case 'threat': { if (ev.p === this.me() || this.local) { const at = null; void at; } if (ev.kind === 'redtide' || ev.kind === 'sniper') Audio3.play(ev.kind === 'sniper' ? 'laser' : 'chirp', { vol: .4 }); break; }
      case 'blocked': { const c = sim.cameraFor(ev.p), at = [c.x + Math.cos(c.yaw) * 16, c.y + Math.sin(c.yaw) * 16, c.z + 3]; fx.spark(at, 10); fx.impact(at, ev.kind === 'slash' ? 'metal' : 'wood'); Audio3.play('blocked'); Audio3.play('ricochet', { vol: .6 }); this.cams[ev.p] && this.cams[ev.p].kick(.12); hud(ev.p).call('SAFE', { scale: 1, life: .4, slot: 'top', color: '#9fe3ff' }); break; }
      case 'hurt': { hud(ev.p).hurtT = .5; this.cams[ev.p] && this.cams[ev.p].hit(); Audio3.play('hurt'); Voice.bark(sim.players[ev.p].agent, 'hurt', { vol: .5 }); this.rumble(ev.p, .6, .25); if (ev.why === 'time') break; hud(ev.p).call(ev.why === 'civilian' ? 'HOLD YOUR FIRE!' : 'HIT!', { scale: 2, life: .7, slot: 'top', color: '#ff5a4a' }); break; }
      case 'explode': { if (ev.arrival) { const c = sim.cameraFor(this.me() < 0 ? 0 : this.me()), d = Math.hypot(ev.at[0] - c.x, ev.at[1] - c.y); if (d < 50) { const k = (50 - d) / Math.max(1, d); ev.at = [ev.at[0] + (ev.at[0] - c.x) * k, ev.at[1] + (ev.at[1] - c.y) * k, ev.at[2]]; } } fx.explosion(ev.at, ev.r || 40); Audio3.play(ev.big ? 'boom' : 'boom_s', { at: ev.at }); for (let i = 0; i < this.n; i++) { const c = sim.cameraFor(i), d = Math.hypot(c.x - ev.at[0], c.y - ev.at[1]); this.cams[i].kick(clamp(1 - d / 600, 0, 1) * (ev.big ? .8 : .4)); if (d < 300) this.rumble(i, .5, .3); } if (ev.big && TC.game.settings.flashes !== false) TC.game.flash('#ffd890', .08, .3); break; }
      case 'launch': Audio3.play({ rocket: 'rocket', missile: 'rocket', grenade: 'bounce', harpoon: 'twang', torpedo: 'hiss', flare: 'pop', pgl: 'gl' }[ev.kind] || 'pop', { at: ev.at, vol: .6 }); break;
      case 'shotdown': all(h => h.call('SHOT DOWN!', { scale: 1, life: .7, slot: 'top', color: '#ffd36a' })); break;
      case 'pickup': { const W = reg('weapon', ev.w); hud(ev.p).banner(ev.first ? 'NEW WEAPON: ' + W.kind : W.kind + ' +' + ev.n, ev.first ? W.name + '  •  ' + 'SWITCH: ' + TC.label(this.inputs[ev.p] || TC.game.input, 'next') : null); Audio3.play(ev.first ? 'newweapon' : 'pickup'); if (ev.first) hud(ev.p).showPrompt('weapon'); break; }
      case '1up': hud(ev.p).call('1UP!', { scale: 3, life: 1, color: '#5ad17a' }); Audio3.play('oneup'); break;
      case 'extend': all(h => h.call('TIME EXTEND +' + ev.s, { scale: 2, life: 1, slot: 'top', color: '#9fe3ff' })); Audio3.play('pickup'); break;
      case 'timeup': all(h => h.call("TIDE'S IN!", { scale: 3, life: 1.6, color: '#5ab4ff', sub: 'TIME UP  •  LIFE LOST' })); Audio3.play('tidesin'); break;
      case 'action': all(h => h.call('ACTION!', { scale: 4, life: .9, color: '#ffd36a' })); Audio3.play('action'); if (ev.boss) Audio3.music(ev.boss === 'krake' || ev.boss === 'scylla' ? 'kingtide' : 'bossfight'); break;
      case 'scene': { const n = ev.n + 1; all(h => h.call('AREA ' + n, { scale: 2, life: 1.8, slot: 'top', color: '#9fe3ff', sub: ev.title })); break; }
      case 'clear': all(h => h.call('CLEAR!', { scale: 3, life: 1.3, color: '#ffffff', sub: 'TIME BONUS +' + fmt(ev.bonus) })); Audio3.play('pickup'); break;
      case 'say': all(h => h.say(ev.who, ev.text)); break;
      case 'line': Voice.say(ev.text, ev.who); break;
      case 'prompt': all(h => h.showPrompt(ev.id)); break;
      case 'bosscard': this.card = { name: ev.name, title: ev.title, who: ev.who, t: 0 }; Audio3.sting('bossintro'); break;
      case 'bossdown': this.slow = .6; all(h => h.call(ev.mini ? ev.name + ' DOWN!' : ev.name + ' DEFEATED!', { scale: 2, life: 2, color: '#ffd36a' })); break;
      case 'partdown': fx.explosion(ev.at, 34); Audio3.play('boom_s', { at: ev.at }); break;
      case 'spinup': Audio3.play('spinup', { at: ev.at }); break;
      case 'slash': Audio3.play('slash'); break;
      case 'civhit': hud(ev.p).call('HOLD YOUR FIRE!', { scale: 2, life: 1, slot: 'top', color: '#ff5a4a', sub: ev.range ? '-2,000' : '-5,000  •  LIFE LOST' }); break;
      case 'break': { const d = ev.debris; if (d === 'glass') { fx.impact(ev.at, 'glass'); fx.impact(ev.at, 'glass'); Audio3.play('glass', { at: ev.at }); } else if (d === 'fire') { fx.fire(ev.at, 6); Audio3.play('pop', { at: ev.at }); } else if (d === 'wood') { fx.burst(ev.at, 14, { speed: 90, g: 300, life: .9, size: 2.2, colors: [[150, 100, 60], [200, 150, 90], [110, 70, 40]] }); Audio3.play('wood', { at: ev.at }); } else { fx.spark(ev.at, 10); } if (ev.vapor) for (let k = 0; k < 6; k++) fx.smoke(ev.at, 2, [230, 240, 245], 8); break; }
      case 'intel': { hud(ev.p).banner('INTEL FOUND', '"' + INTEL[ev.n % INTEL.length] + '"'); Audio3.play('newweapon'); const got = E.store.get('tc3:intel', []); if (!got.includes(ev.n)) { got.push(ev.n); E.store.set('tc3:intel', got); } break; }
      case 'splash': fx.impact(ev.at, 'water'); fx.burst(ev.at, 14, { speed: 40, up: 90, g: 260, life: .9, size: 2.4, mode: 2, color: [210, 235, 255] }); Audio3.play('splash', { at: ev.at }); break;
      case 'thud': fx.burst(ev.at, 6, { speed: 30, g: 100, life: .5, size: 3, mode: 2, grow: 4, color: [150, 140, 130] }); break;
      case 'collapse': for (let k = 0; k < 4; k++) fx.explosion([ev.at[0], ev.at[1] - 100 + k * 60, ev.at[2]], 30); fx.burst(ev.at, 40, { speed: 120, g: 300, life: 1.4, size: 3, colors: [[150, 100, 60], [110, 70, 40]] }); Audio3.play('wood'); Audio3.play('boom'); break;
      case 'cutfx': if (ev.fx === 'fireworks') { const f = ev.at || sim.focus(); for (let k = 0; k < 5; k++) fx.firework([f[0] + (fx.r() - .5) * 200, f[1] + (fx.r() - .5) * 200, f[2] + 120 + fx.r() * 80], k % 3); Audio3.play('firework'); } else if (ev.fx === 'explosion') { fx.explosion(ev.at || sim.focus(), 80); Audio3.play('boom'); } else if (ev.fx === 'flash' && TC.game.settings.flashes !== false) TC.game.flash('#ffffff', .2, .6); break;
      case 'music': Audio3.music(ev.song); break;
      case 'sfx': Audio3.play(ev.name); break;
      case 'shake': for (const c of this.cams) c.kick(ev.k || .4); break;
      case 'continue': Audio3.music('continue'); break;
      case 'continued': Audio3.music(sim.stage.music); Audio3.play('oneup'); break;
      case 'gameover': break;
      case 'empty': Audio3.play('empty'); if (ev.p === 0 || this.local) hud(ev.p).showPrompt('reload'); break;
      case 'reload': Audio3.play('reload', { vol: .7 }); break;
      case 'switch': Audio3.play('switch', { vol: .7 }); break;
      case 'cover': Audio3.play(ev.on ? 'coverin' : 'coverout', { vol: .6 }); break;
      case 'shieldoff': Audio3.play('imp_metal'); all(h => h.call('SHIELD DOWN!', { scale: 1, life: .6, slot: 'top', color: '#ffd36a' })); break;
      case 'allyhit': { const e = sim.enemyById(ev.e); if (e) all(h => h.say(e.o.who || 'rook', 'Hey! Watch it!')); break; }
      case 'multikill': hud(ev.p).call(ev.n + ' IN ONE BLAST!', { scale: 1, life: .8, slot: 'top', color: '#ffb347' }); break;
      case 'stage': { Audio3.music(sim.stage.music); Audio3.ambience(sim.stage.env.ambience || (sim.stage.env.storm ? 'storm' : 'festival')); break; }
      case 'cutstart': this.cutCam = null; break;
      case 'lineend': break;
      case 'rocketfire': Audio3.play('rocket', { at: ev.at }); break;
      case 'return': hud(ev.p).call('BACK IN THE FIGHT', { scale: 2, life: 1.2, color: '#5ad17a' }); break;
      case 'final': all(h => { h.call('FINAL SHOT!', { scale: 4, life: 3, color: '#ff5a4a' }); h.prompt = null; h.seen.final = false; h.showPrompt('final'); }); this.slow = 3; Audio3.play('gong'); break;
      case 'slowmo': this.slow = Math.max(this.slow, ev.s || .6); break;
      case 'smoke': this.smokeT = ev.s || 3; for (let k = 0; k < 10; k++) fx.smoke([1560 + fx.r() * 40, -80 + (fx.r() - .5) * 60, 300], 3, [150, 150, 160], 14); break;
      case 'surge': for (const c of this.cams) c.kick(.6); all(h => h.call('TIDE RISING!', { scale: 3, life: 1.6, color: '#5ab4ff' })); Audio3.play('tidesin'); break;
      case 'coverhit': { const c = sim.cameraFor(0); fx.burst([c.x + Math.cos(c.yaw) * 14, c.y + Math.sin(c.yaw) * 14, c.z - 8], 20, { speed: 90, g: 300, life: .9, size: 2.4, colors: [[150, 100, 60], [200, 150, 90]] }); Audio3.play('wood'); all(h => h.call(ev.hp > 1 ? 'COVER CRACKED!' : ev.hp === 1 ? 'COVER BREAKING!' : 'COVER GONE!', { scale: 2, life: 1, slot: 'top', color: '#ff9a6a' })); break; }
      case 'swap': Audio3.play('coverout'); break;
      case 'locks': all(h => h.banner('GATE LOCKS', ev.left ? ev.left + ' LEFT' : 'ALL JAMMED!')); break;
      case 'bossstate': break;
    }
  }
  me() { return this.net ? this.net.me : 0; }
  rumble(i, k, s) { const I = this.inputs[i]; if (I && I.lastDevice === 'gamepad' && I.rumble && !this.bots[i]) I.rumble(k, s); }

  /* ---- drawing ---- */
  camFor(i) {
    const sim = this.sim, lv = this.localView(i); let cam;
    if (lv) { const p = sim.players[i], keep = p.c; p.c = lv.c; cam = sim.cameraFor(i); p.c = keep; } else cam = sim.cameraFor(i);
    if (tune.view.freeCam && TC.dev && TC.dev.free) cam = Object.assign({}, TC.dev.free, { fov: tune.view.fov });
    const sway = sim.scene && sim.scene.carrier && !sim.cut ? (sim.stage.env.swayK || 1.4) : 0;
    return this.cams[i] ? this.cams[i].apply(cam, sway) : cam;
  }
  draw(r) {
    const vp = r.viewport, i = vp ? vp.i : (this.view !== null ? this.view : 0), rect = vp ? { x: vp.x, y: vp.y, w: vp.w, h: vp.h } : { x: 0, y: 0, w: r.W, h: r.H };
    r.overlay(g => this.drawView(g, i, rect));
  }
  drawView(g, i, rect) {
    const sim = this.sim, R3 = this.r3, env = sim.stage.env, p = sim.players[i] || sim.players[0];
    R3.size(rect.w, rect.h); R3.wobble = !!TC.wobble;
    const cam = this.camFor(i); TC.listener = cam;
    R3.begin(cam, env, this.t); R3.flash = this.bolt > 0 ? this.bolt * 2 : 0;
    this.fx.draw(R3);
    if (sim.stage.lights) sim.stage.lights(R3, sim, this.t);
    for (const pr of sim.projectiles) if (pr.kind === 'flare' || pr.kind === 'rocket' || pr.kind === 'missile') R3.addLight(pr.pos[0], pr.pos[1], pr.pos[2], 90, .6);
    R3.drawWorld(sim.world);
    const R = this.helper(R3);
    // carriers
    for (const cid in sim.carriers) { const C = sim.carriers[cid], def0 = C.C; if (!def0.mesh || !C.M) continue; const M = this.swayM(C, cid); R3.drawMesh(meshOf(cid === sim.scene.carrier && MESHDEF[def0.mesh + '-open'] ? def0.mesh + '-open' : def0.mesh), M, {}); /* the car they ride: its open variant */ if (def0.mesh === 'speedboat') { const w = xform(M, [-36, 0, 0]); this.helm = this.helm || makeRig({ rng: () => .5 }, reg('speaker', 'mari').rig); this.helm.update(.016, { x: w[0], y: w[1], z: w[2], facing: C.yaw, pose: null }); if (sim.scene.carrier === cid || sim.cut) R3.drawRig(this.helm, w[0], w[1], w[2]); } }
    // the stage's moving props
    if (sim.stage.draw) sim.stage.draw(R, sim, this.t);
    // objects
    for (const ob of sim.objects) {
      if (!ob.alive && !(ob.K.hang && ob.fall !== undefined && ob.fall < 2)) continue;
      const c = [(ob.box[0] + ob.box[3]) / 2, (ob.box[1] + ob.box[4]) / 2, ob.at[2]];
      if (!R3.sees(c[0], c[1], c[2] + 8, 30)) continue;
      let M = mat34(ob.at[0], ob.at[1], ob.at[2], ob.yaw);
      if (ob.K.popup) M = mat34(ob.at[0], ob.at[1], ob.at[2], ob.yaw, 0, -(1 - ob.up) * Math.PI / 2 * .98);
      if (ob.K.hang) M = mat34(ob.at[0], ob.at[1], ob.at[2], ob.yaw + this.t * .3, 0, Math.sin(this.t * 1.7 + ob.id) * .12);
      R3.drawMesh(objMesh(ob.kind), M, { flash: ob.flash * .6, glow: ob.K.bonus ? .2 + .2 * Math.sin(this.t * 6) : 0 });
      if (ob.K.hang && ob.alive) R3.line([ob.at[0], ob.at[1], ob.at[2]], [ob.at[0], ob.at[1], ob.at[2] + 12], [60, 50, 40]);
      if (ob.K.hang && !ob.alive) this.fx.fire([ob.at[0], ob.at[1], ob.at[2]], 1, .5);
      if (ob.K.objective && ob.alive) R3.glow(c[0], c[1], c[2], 10, [255, 170, 60], .5 + .3 * Math.sin(this.t * 6));
    }
    // the boss
    if (sim.boss && sim.boss.D.draw) sim.boss.D.draw(R, sim.boss, sim);
    // enemies, civilians, allies
    for (const e of sim.enemies) {
      if (e.mesh) { if (e.D.ai === 'drone') { R3.drawMesh(meshOf('drone'), mat34(e.x, e.y, e.z, e.facing, e.alive ? 0 : e.deathT * 3, e.alive ? Math.sin(this.t * 3 + e.id) * .15 : e.deathT * 5), { flash: e.flash }); if (e.alive) R3.glow(e.x + Math.cos(e.facing) * 5, e.y + Math.sin(e.facing) * 5, e.z, 3, [255, 60, 60], .8); if (!e.alive) this.fx.smoke([e.x, e.y, e.z], 1, [50, 50, 56], 4); } continue; }
      if (!e.rig) continue;
      if (e.D.ai === 'jetski' && e.ski) { R3.drawMesh(meshOf('jetski'), mat34(e.ski.x, e.ski.y, e.ski.z + Math.sin(this.t * 9 + e.id) * 1, e.ski.yaw, Math.sin(this.t * 7 + e.id) * .06), { flash: e.flash }); if (this.fx.r() < .5) this.fx.add({ pos: [e.ski.x - Math.cos(e.ski.yaw) * 12, e.ski.y - Math.sin(e.ski.yaw) * 12, e.ski.z], vel: [(this.fx.r() - .5) * 30, (this.fx.r() - .5) * 30, 30], g: 200, life: .5, size: 2.5, mode: 2, color: [220, 240, 255] }); }
      if (e.z > -20 && !e.ski) R3.shadow(e.x, e.y, e.cover ? e.cover.at[2] : e.z);
      if (e.rope) R3.line(e.rope, [e.x, e.y, e.z + 26], [180, 160, 120]);
      R3.drawRig(e.rig, e.rig.x, e.rig.y, e.rig.z, { flash: e.flash * .8, alpha: e.alpha, light: e.civ || e.ally ? undefined : undefined });
      if (e.hostage) R3.drawRig(e.hostage, e.hostage.x, e.hostage.y, e.hostage.z, {});
      if (e.D.ai === 'shield') { const k = e.shieldOn ? 0 : 1, a = e.facing + k * 1.3, M = mat34(e.x + Math.cos(a) * 7, e.y + Math.sin(a) * 7, e.z + 1, a); R3.drawMesh(meshOf('riotshield'), M, { flash: e.flash * .5 }); }
      if (e.laser > 0 && e.alive) { const m = muzzle(e), c = sim.cameraFor(e.target >= 0 ? e.target : 0), spread = (1 - e.laser) * 60, to = [c.x + Math.cos(c.yaw) * 30 + Math.sin(this.t * 7) * spread, c.y + Math.sin(c.yaw) * 30 + Math.cos(this.t * 5) * spread, c.z - 4 + Math.sin(this.t * 9) * spread * .5]; R3.line(m, to, [255, 40, 40], 1); R3.glow(m[0], m[1], m[2], 3, [255, 60, 60], 1); }
      if (e.glint > 0 && e.alive) { const m = muzzle(e); R3.glow(m[0], m[1], m[2], 2 + e.glint * 4, [255, 255, 220], e.glint); }
    }
    // cutscene actors
    if (sim.cut) for (const id in sim.cut.actors) { const a = sim.cut.actors[id]; if (!a.hide) { R3.shadow(a.x, a.y, a.z); R3.drawRig(a.rig, a.x, a.y, a.z, {}); } }
    // projectiles
    for (const pr of sim.projectiles) {
      const P = PROJ[pr.kind] || {}, c = hexRGB(P.color || '#ffffff');
      if (pr.kind === 'flare') { R3.glow(pr.pos[0], pr.pos[1], pr.pos[2], 10, [255, 120, 40], 1); R3.splat(pr.pos[0], pr.pos[1], pr.pos[2], 4, [255, 230, 180], 1); this.fx.add({ pos: pr.pos.slice(), life: .3, size: 3, mode: 1, color: [255, 120, 40] }); continue; }
      if (pr.kind === 'torpedo') { R3.splat(pr.pos[0], pr.pos[1], pr.pos[2] + 2, 8, c, 0); this.fx.add({ pos: pr.pos.slice(), vel: [(this.fx.r() - .5) * 20, (this.fx.r() - .5) * 20, 20], g: 100, life: .8, size: 3, mode: 2, color: [230, 245, 255] }); continue; }
      R3.splat(pr.pos[0], pr.pos[1], pr.pos[2], pr.r * 1.2, c, 0);
      if (P.trail && this.fx.r() < .5) this.fx.smoke(pr.pos, 1, [180, 180, 186], 2, 2);
      if (pr.kind === 'grenade' || pr.kind === 'pgl') R3.glow(pr.pos[0], pr.pos[1], pr.pos[2], 3, [255, 80, 60], .4 + .4 * Math.sin(this.t * 20));
      if (pr.rope) R3.line(pr.rope, pr.pos, [200, 190, 170]);
    }
    R3.sky();
    this.fx.drawAfter(R3);
    if (env.rain) this.drawRain(R3, cam);
    const pc = this.localView(i) ? this.localView(i).c : p ? p.c : 0;
    if (p && pc > .3 && !sim.cut) R3.vignette(clamp((pc - .3) * .6, 0, .45));
    if (this.smoke > 0) R3.vignette(this.smoke * .6, [120, 120, 130], false);
    R3.present(g, rect.x, rect.y);
    if (this.huds[i]) this.huds[i].draw(g, rect, sim, R3);
    if (this.card && i === 0) this.drawCard(g, rect);
    if (TC.dev && TC.dev.open) TC.dev.draw(g, this);
    if (tune.view.perf && i === 0) txt(g, 'tris ' + R3.stats.tris + '  px ' + R3.stats.px + '  actors ' + R3.stats.actors + '  lights ' + R3.dyn.length + '  shadows ' + R3.stats.shadows, rect.x + 4, rect.y + rect.h - 58, '#8affaa');   // (above the cover prompt)
    if (TC.devOverlays) TC.devOverlays(g, this, R3, rect, i);
  }
  swayM(C, cid) { if (!C.M) return C.M; const t = this.t, k = cid === 'stingray' ? 0 : (this.sim.stage.env.swayK || 1.4); if (!k) return C.M; return mulMat34(C.M, mat34(0, 0, Math.sin(t * 1.3) * .8, 0, Math.sin(t * .7 + 1) * k * .6 * DEG, Math.sin(t * .9) * k * DEG)); }
  drawRain(R3, cam) {
    const col = R3.col, W = R3.W, H = R3.H, t = this.t;
    for (let k = 0; k < 160; k++) { const x = ((k * 97 + Math.floor(t * 300) * 13 + k * k) % W + W) % W, y0 = ((k * 61 + t * 420 * (1 + (k % 3) * .3)) % (H + 20)) - 20; for (let j = 0; j < 6; j++) { const y = Math.round(y0 + j), xx = Math.round(x - j * .4); if (y >= 0 && y < H && xx >= 0 && xx < W) { const i2 = y * W + xx, o = col[i2]; col[i2] = (255 << 24 | Math.min(255, ((o >> 16) & 255) + 50) << 16 | Math.min(255, ((o >> 8) & 255) + 50) << 8 | Math.min(255, (o & 255) + 46)) >>> 0; } } }
    void cam;
  }
  drawCard(g, rect) {
    const c = this.card; c.t += 1 / 60; if (c.t > 2.6) { this.card = null; return; }
    const W = rect.w, a = c.t < .25 ? c.t / .25 : c.t > 2.2 ? (2.6 - c.t) / .4 : 1, y = rect.y + rect.h * .58, x = rect.x + W * (1 - a) * .3;
    E.ui.box(g, x - 4, y, W * .7, 40, { bg: ['#3a0a14', '#14060a'], border: '#ff3b30', alpha: .9 });
    const rig = c.who && this.portraitRig(c.who); if (rig) try { rig.drawPortrait(g, x + 2, y + 3, 34, { zoom: 2.8, turn: .4, bg: '#2a0a14', frame: false }); } catch (e) { /* none */ }
    txt(g, c.name, x + 42, y + 5, '#ffd36a', { scale: 2 }); txt(g, c.title, x + 42, y + 24, '#ffffff');
  }
  /** a small drawing helper for stages and bosses */
  helper(R3) {
    const self = this;
    return {
      R3, t: this.t,
      mesh(id, M, o = {}) { R3.drawMesh(meshOf(id), M, o); },
      meshObj(kind, at, flash) { R3.drawMesh(objMesh(kind), mat34(at[0], at[1], at[2], 0), { flash: flash || 0 }); },
      rig(rig, x, y, z, o = {}) { R3.shadow(x, y, z); R3.drawRig(rig, x, y, z, { flash: o.flash || 0 }); },
      fire(at, k = 1) { if (self.fx.r() < .6) self.fx.fire(at, 1, k); if (self.fx.r() < .2) self.fx.smoke([at[0], at[1], at[2] + 10], 1, [40, 38, 42], 8); R3.addLight(at[0], at[1], at[2], 90, .5); },
      line(a, b, c) { R3.line(a, b, c); },
      glow(at, r, c, k) { R3.glow(at[0], at[1], at[2], r, c, k); },
      light(at, r, k) { R3.addLight(at[0], at[1], at[2], r, k); },
      fx: self.fx
    };
  }
}
TC.Play = Play;
const INTEL = [
  'Note to self: never trust a fish that winks. -J.',
  "Krake's coffee order: black, like the Current. Two sugars.",
  'Hammerhead keeps a photo of his mother in his helmet. She is also in a helmet.',
  'The Gull has never missed. The Gull has also never been to a party.',
  'Tidewall rule 12: do not feed the turbines. Rule 13: see rule 12.',
  'Black Current dental plan: none. Explains a lot.'
];
TC.INTEL = INTEL;
