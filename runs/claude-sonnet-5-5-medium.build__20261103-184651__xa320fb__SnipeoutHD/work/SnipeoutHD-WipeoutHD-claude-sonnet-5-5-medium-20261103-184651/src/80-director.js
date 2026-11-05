(() => {
const E = My3D2dge, SN = globalThis.SN, px = SN.px;
const { clamp } = SN, U = SN.U, R = SN.R, HUD = SN.HUD, UI = SN.UI;
// ---- save ------------------------------------------------------------------------------------------------------------------
const KEY = 'snipeout-hd:v1';
const store = (() => { try { const s = window.localStorage; s.setItem('__t', '1'); s.removeItem('__t'); return s; } catch (e) { const m = {}; return { getItem: k => m[k] || null, setItem: (k, v) => { m[k] = String(v); } }; } })();
SN.S = { team: 'kestrel', cls: 'flare', track: 'solenne', laps: 3, camMode: 0, name: 'YOU', done: {}, bests: {}, ghosts: {}, medals: {} };
SN.save = { load() { try { const d = JSON.parse(store.getItem(KEY) || 'null'); if (d) Object.assign(SN.S, d); } catch (e) { /* fresh */ } }, write() { try { store.setItem(KEY, JSON.stringify(SN.S)); } catch (e) { /* full */ } } };
// reference lap (ms) a good lap needs: the track's speed profile at this class's top speed
SN.refLap = (trackId, cls) => { const tr = SN.getTrack(trackId), vmax = SN.CLASSES[cls].kmh / .225 * 1.05; let t = 0; for (let i = 0; i < tr.n; i++) t += tr.ds / Math.min(tr.vline[i] * .96, vmax); return t * 1000; };
SN.medalFor = (trackId, cls, ms) => { const ref = SN.refLap(trackId, cls) * 3 * .93; return ms <= ref * SN.MEDALS.gold ? 'gold' : ms <= ref * SN.MEDALS.silver ? 'silver' : ms <= ref * SN.MEDALS.bronze ? 'bronze' : null; };

// ---- backdrop: an AI-only race flying past a TV camera, under every menu ------------------------------------------------------
SN.Bg = {
  race: null, focus: null, t: 0,
  ensure(trackId) { const game = SN.game; if (!R.world || R.trackId !== trackId) { R.load(game, trackId); this.race = null; } if (!this.race || this.race.track.id !== trackId) this.fresh(trackId); },
  fresh(trackId) {
    const ents = SN.makeEntrants({ seed: (Date.now() % 997) + 1, count: 8, humans: [{ name: 'SPARE', team: 'kestrel', control: 'ai' }] });
    this.race = new SN.Race({ track: SN.getTrack(trackId), mode: 'race', cls: 'flare', laps: 99, seed: 11, entrants: ents, rules: { countdown: .5 } });
    this.race.human = null; this.focus = this.race.ships[3]; R.camStates = []; R.tv = null; this.t = 0; R._shipsFor = null;
  },
  update(dt, snap) {
    const race = this.race; if (!race || !R.world) return;
    race.step(dt); this.t += dt;
    if (this.t > 14 || !this.focus.alive) { const ord = race.ships.slice().sort((a, b) => a.place - b.place); this.focus = ord[Math.floor(Math.random() * 3)]; this.t = 0; }
    R.update(race, this.focus, true, snap); R.world.step(dt);
  },
  draw(r) { if (!R.world) return; R.glows(this.race, r); R.world.draw(r); }
};

// ---- director: one race from setup to results, used by the race, attract and session scenes ----------------------------------------
class Director {
  constructor(game, cfg) {
    this.game = game; this.cfg = cfg; this.over = false; this.overT = 0; this.rec = []; this.recT = 0; this.overlay = null; this.dev = null; this.endHandled = false; this.devRun = false;
    const track = SN.getTrack(cfg.track), mode = cfg.mode;
    this.restoreTune = SN.Tune.snapshot(); if (cfg.replay) SN.Tune.load(cfg.replay.tune); this.tune = SN.Tune.snapshot(); this.frames = []; this.fi = 0;
    R.load(game, cfg.track); R.camStates = []; R.tv = null; R._shipsFor = null;
    const solo = ['time', 'overclock', 'academy'].includes(mode);
    const humans = cfg.humans || (cfg.versus ? [{ name: 'P1', team: cfg.team || SN.S.team, color: '#2ec4ff' }, { name: 'P2', team: cfg.team2 || SN.S.team2, color: '#ff9a2a' }] : [{ name: SN.S.name, team: cfg.team || SN.S.team, control: cfg.demo ? 'ai' : 'human' }]);
    const ents = SN.makeEntrants({ seed: cfg.seed || 13, count: mode === 'snipeout' || cfg.versus ? 6 : 8, humans, ai: !solo, team: humans[0].team });
    this.race = new SN.Race({ track, mode, cls: cfg.cls, laps: cfg.laps || SN.TRACKS[cfg.track].laps, seed: cfg.seed || 13, entrants: ents, rules: Object.assign({}, cfg.rules || {}) });
    const race = this.race; race.human = race.ships.find(s => s.control === 'human') || null;
    this.focus = race.human || race.ships[race.ships.length - 1];
    if (cfg.demo) { this.focus = race.ships[race.ships.length - 1]; this.focus.control = 'ai'; this.focus.cheat = true; }
    this.foci = race.humans.length ? race.humans : [this.focus];
    const NEUTRAL = SN.neutralControls();
    race.humans.forEach((h, k) => { h.inputFn = cfg.replay ? (k === 0 ? (sh => Object.assign(sh.ctl, cfg.replay.frames[this.fi++] || NEUTRAL)) : (sh => NEUTRAL)) : (sh => { const c = SN.Controls.read(sh.ctl, game.players && game.players[k] || game.input); if (k === 0) this.frames.push(Object.assign({}, c)); return c; }); });
    if (cfg.versus) { while (R.world.cameras.length < 2) R.world.addCamera({ mode: 'fixed', fixed: { x: 0, y: 0, z: 400, yaw: 0, pitch: -.1, fov: 70 } }); game.splitScreen(2, { layout: 'columns' }); }
    if (mode === 'snipeout') race.rules.scoreGoal = cfg.goal || 0;
    if (mode === 'overclock') race.rules.zoneGoal = cfg.goal || 0;
    // time-trial ghost
    if (mode === 'time') { const gk = cfg.track + ':' + cfg.cls, gd = SN.S.ghosts[gk]; if (gd && gd.s && gd.s.length) { this.ghost = gd; race.ghostBest = gd.ms; race.ghostShips = [{ pose: null }]; } }
    R.camMode = SN.S.camMode; R.ensureShips(race); R.update(race, this.focus, false, true);
    HUD.reset(); this.lastLap = 1; this.radioT = 4; this.lowWarn = 0; this.said = {};
    if (!cfg.demo) { SN.Audio.music(SN.TRACKS[cfg.track].music, { fade: 1 }); SN.Audio.humOn = true; ['arp', 'lead'].forEach(l => SN.Audio.layer(l, false)); }
    else SN.Audio.music('attract', { fade: 1 });
    if (race.human) HUD.say(SN.STORY.authority, SN.STORY.radio.start[Math.floor(Math.random() * 3)], 4);
    race.events.length = 0;
  }
  get race_() { return this.race; }
  update(dt) {
    const g = this.game, race = this.race, I = g.input, human = race.human;
    HUD.tick(dt);
    if (this.overlay) { this.overlayUpdate(dt); }
    const frozen = this.overlay && !this.devRun;
    if (!frozen) {
      if (this.cfg.demo && this.focus) { /* AI drives */ this.focus.inputFn = null; }
      if (this.cfg.versus && game.players[1] && game.players[1].pressed('camera')) { SN.S.camMode = R.camMode = (R.camMode + 1) % 3; }
      if (human && I.pressed('camera') && !this.cfg.demo) { SN.S.camMode = R.camMode = (R.camMode + 1) % 3; HUD.call(R.CAMS[R.camMode] + ' CAM', '#9fe8ff', .9, 1); }
      R.lookBack = !!(human && I.down('lookBack'));
      if (this.cfg.demo && this.focus) { const f = this.focus; f.energy = 100; if (f.weapon == null && Math.random() < .002) f.weapon = null; }
      if (this.cfg.slow) dt *= this.cfg.slow;
      race.step(dt);
      this.handle(race.events);
      if (SN.CHEATS.infAmmo && human && !human.weapon && race.rules.weapons && race.state === 'racing') human.weapon = 'cannon';
      // ghost
      if (this.ghost && race.ghostShips) { const k = race.time * 10, i = Math.floor(k), s = this.ghost.s; if (race.state === 'racing' && s[i]) { const a = s[i], b = s[Math.min(i + 1, s.length - 1)], f = k - i, d = a[0] + (b[0] - a[0]) * f, u = a[1] + (b[1] - a[1]) * f; race.ghostShips[0].pose = R.ghostPose(race.track, d, u); } else race.ghostShips[0].pose = null; }
      if (human && race.state === 'racing') { this.recT += dt; if (this.recT >= .1) { this.recT -= .1; this.rec.push([Math.round(human.dist * 10) / 10, Math.round(human.u * 10) / 10]); } }
      // radio chatter
      if (human && race.state === 'racing' && !this.cfg.demo) { this.radioT -= dt; if (human.energy < 25 && human.alive && this.lowWarn <= 0) { this.lowWarn = 25; this.radio('low'); } this.lowWarn -= dt; if (human.place === 1 && race.mode === 'race' && !this.said.lead && race.time > 10) { this.said.lead = 1; this.radio('lead'); } }
    }
    // focus: when the human is out, the TV follows the leader
    let focus = this.focus, tv = false;
    if (human && !human.alive && !human.respawnAt && race.mode !== 'overclock') { focus = race.ships.slice().sort((a, b) => a.place - b.place).find(s => s.alive) || human; tv = true; }
    if (this.cfg.demo && race.time % 12 < dt * 2 && race.state === 'racing') { /* camera swap handled by the TV */ }
    if (this.cfg.demo) { tv = Math.floor(race.time / 9) % 2 === 1; }
    if (human && race.state === 'over' || (race.over && human && human.finished && race.mode === 'race')) tv = true;
    if (this.cfg.replay) tv = Math.floor(race.time / 7) % 2 === 1;
    R.update(race, focus, tv, false); if (this.cfg.versus && this.foci[1] && R.world.cameras[1]) R.chaseCam(this.foci[1], R.camMode, false, 1); R.world.step(dt);
    SN.Audio.hum_update(clamp(SN.kmh(focus.v) / (SN.CLASSES[race.cls].kmh * 1.25), 0, 1.2), focus.boostT > 0);
    // layers: more music on lap 2 and the last lap
    if (human) { const l = human.lap; if (l !== this._layer) { this._layer = l; if (l >= 2) SN.Audio.layer('arp', true); if (l >= race.laps && race.mode === 'race') SN.Audio.layer('lead', true); if (race.mode !== 'race') { SN.Audio.layer('arp', true); SN.Audio.layer('lead', race.zone > 1); } } }
    if (race.over && !this.endHandled) { this.overT += dt; if (this.overT > (this.cfg.demo ? 0 : 2.4)) { this.endHandled = true; if (this.onEnd) this.onEnd(this); } }
  }
  radio(key) { const L = SN.STORY.radio[key], s = L[Math.floor(Math.random() * L.length)]; HUD.say(SN.STORY.authority, s, 4); SN.Audio.voice(s, 9, 0); }
  handle(events) {
    const g = this.game, race = this.race, human = race.human, P = g.particles;
    for (const e of events) {
      if (!this.cfg.demo) SN.Audio.event(e, human);
      const sh = e.ship, mine = sh && race.humans.includes(sh), p = sh && sh.pos, call = (a, b, c, d) => HUD.call(a, b, c, d, mine ? sh : undefined);
      switch (e.t) {
        case 'go': call('GO!', '#5dff9a', 1.1, 4); break;
        case 'launch': call('PERFECT LAUNCH', '#8fe0ff', 1.4, 2); break;
        case 'stall': call('STALLED', '#ff6b6b', 1.2, 2); break;
        case 'wall': if (p) { P.sparks(p[0], p[1], p[2], 8, null, { color: '#ffd36a' }); } if (mine) { g.shake(clamp(e.impact * 6, 1, 6)); g.input.rumble(clamp(e.impact * 1.2, .2, .8), .2); if (!this.said.wall && Math.random() < .3) { this.said.wall = 1; this.radio('wall'); } } break;
        case 'scrape': if (p && Math.random() < .08) P.sparks(p[0], p[1], p[2] - 10, 2, null, { color: '#ffb347' }); break;
        case 'land': if (mine && e.impact > 150) g.shake(2); break;
        case 'pickup': if (mine) { call(SN.WEAPONS[e.weapon].name, SN.WEAPONS[e.weapon].color, 1.3, 2); SN.Audio.voice(SN.WEAPONS[e.weapon].call, 5, 1); if (p) P.glints(p[0], p[1], p[2] + 12, 8, SN.WEAPONS[e.weapon].color); } break;
        case 'pad': if (mine && e.kind === 'boost') { call('BOOST', '#8fe0ff', .8, 2); g.input.rumble(.3, .3); } break;
        case 'fire': if (mine) g.input.rumble(.25, .1); break;
        case 'hit': if (mine) { g.shake(4); g.flash('#ff4040', .15); g.input.rumble(.8, .3); call(e.by ? 'HIT BY ' + e.by.name.slice(0, 10) : 'HIT', '#ff6b6b', 1, 1); } if (e.by === human) call('HIT!', '#ffd36a', .7, 2); if (p) P.sparks(p[0], p[1], p[2], 10, null, { color: '#ffffff' }); break;
        case 'blast': { const f = race.track.frameAt(e.dist), pp = [f.C[0] + f.R[0] * e.u, f.C[1] + f.R[1] * e.u, f.C[2] + f.R[2] * e.u + 20]; P.explosion(pp[0], pp[1], pp[2], .7, { sound: false, flash: false }); break; }
        case 'elim': if (p) P.explosion(p[0], p[1], p[2], 1.4, { sound: false, flash: false }); if (e.ship === human) { g.shake(8); call('ELIMINATED', '#ff4a4a', 2, 3); this.radio('elim'); } else if (e.by === human) { call('SNIPED ' + e.ship.name.slice(0, 10), '#ffd36a', 1.6, 2); } break;
        case 'respawn': if (e.ship === human) call('SHIELDS UP', '#4aa8ff', 1, 2); break;
        case 'lap': if (mine && race.mode !== 'overclock') { const final = e.lap === race.laps - 1; if (e.lap >= race.laps) break; call(final ? 'FINAL LAP' : 'LAP ' + (e.lap + 1), final ? '#ff8a2a' : '#ffffff', 1.8, 3); if (final) this.radio('lastLap'); const best = Math.min(...sh.lapTimes); if (e.time <= best) HUD.say('LAP', 'LAP ' + e.lap + '  ' + SN.fmtTime(e.time) + '  BEST', 3); else HUD.say('LAP', 'LAP ' + e.lap + '  ' + SN.fmtTime(e.time), 3); } break;
        case 'finish': if (mine) { call(SN.ord(e.place) + ' PLACE', e.place === 1 ? '#ffd36a' : '#fff', 3, 4); if (e.place === 1) this.radio('win'); } break;
        case 'zone': call('ZONE ' + e.n, '#ff2fb4', 2, 4); break;
        case 'drill': { const d = SN.DRILLS.find(x => x.id === e.id); call('DRILL COMPLETE', '#5dff9a', 1.4, 2); const nx = SN.DRILLS[race.drillIdx]; if (nx) HUD.say(SN.STORY.authority, HUD.fill(nx.text), 6); break; }
        case 'beam': { const a = e.ship.pos, b = e.target ? e.target.pos : [a[0] + e.ship.fr.F[0] * 900 * U / 4, a[1] + e.ship.fr.F[1] * 900 * U / 4, a[2]]; (race._beams = race._beams || []).push({ from: [a[0], a[1], a[2] - 6], to: b, life: .15, color: e.kind === 'siphon' ? '#5dff9a' : '#7affff' }); break; }
        case 'roll': if (mine) call('BARREL ROLL', '#c07aff', .8, 1); break;
        case 'lock': if (mine) call('LOCK', '#ff3b3b', .6, 1); break;
        case 'over': break;
      }
    }
    if (race._beams) { for (const b of race._beams) b.life -= 1 / 120; race._beams = race._beams.filter(b => b.life > 0); }
  }
  // overlays: dev panel and the how-to page, drawn over a frozen race
  overlayUpdate(dt) { const o = this.overlay; if (o.update) o.update(dt); }
  hud(r) {
    const race = this.race, vps = this.game.viewports || [];
    this.foci.forEach((f, k) => { const vp = vps[k]; if (!vp) return; const proxy = { W: vp.w, H: vp.h, overlay: fn => r.overlay(g => { g.save(); g.beginPath(); g.rect(vp.x, vp.y, vp.w, vp.h); g.clip(); g.translate(vp.x, vp.y); fn(g); g.restore(); }) }; HUD.draw(proxy, race, f, { hideBoard: true, hideTags: true, hideMap: false }); });
    if (this.overlay && this.overlay.draw) this.overlay.draw(r);
  }
  draw(r) {
    const race = this.race; R.glows(race, r); R.world.draw(r);
    if (this.cfg.versus) return;
    HUD.draw(r, race, this.focus, { demo: this.cfg.demo, replay: !!this.cfg.replay, hideTags: false });
    if (this.overlay && this.overlay.draw) this.overlay.draw(r);
  }
  dispose() { SN.Audio.humStop(); if (this.cfg.replay && this.restoreTune) SN.Tune.load(this.restoreTune); }
}
SN.Director = Director;
})();
