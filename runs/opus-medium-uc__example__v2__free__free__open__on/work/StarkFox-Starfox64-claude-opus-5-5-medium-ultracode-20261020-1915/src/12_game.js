// ===== 12_game.js — game flow, event interpreter, director, camera, HUD, radio, attract AI =====
const CHARS = {
  vix: { name: 'VIX STARK', color: '#ff9a3a' }, marlow: { name: 'MARLOW', color: '#b8c4d8' }, kestrel: { name: 'KESTREL', color: '#5aa8ff' },
  tobi: { name: 'TOBI', color: '#7aff7a' }, croak: { name: 'EMPEROR CROAK', color: '#c070ff' }, jackal: { name: 'JACKAL', color: '#ffcc40' }, hq: { name: 'GENERAL BRUNO', color: '#ffd8a0' },
};
const $ = (s) => document.querySelector(s);

const Game = {
  stats: {}, radioQ: [], radioCur: null, hintCur: null, hintsShown: new Set(), toastT: 0, onceKeys: new Set(),
  camPos: V3(), camLook: V3(), camUp: V3(0, 1, 0), fov: 62, phase: null, phaseIdx: 0, deathT: 0, clearT: 0,
  attractT: 0, attractStage: 0, introT: 0, sessionStart: 0, stageStartHits: 0,

  // ------------------------------------------------------------ stage lifecycle
  async loadStage(id, o = {}) {
    UI.showLoading(true);
    await new Promise((r) => setTimeout(r, 30));
    const st = STAGES[id];
    G.stageId = id; G.stage = st; G.mode = st.mode; G.attract = !!o.attract;
    G.boss = null; G.cinematic = false;
    for (const e of G.ents) if (e.dispose) e.dispose();
    G.ents = []; G.shots.forEach((s) => s.kill()); G.shots = [];
    GameTimers.length = 0;
    clearScene();
    Phys.reset(st.gravity ?? -22);
    FX.clear(); FX.attach();
    World.begin();
    R.sunDir = st.sunDir;
    if (st.mode === 'rails') { Rail.build(st.rails, st.start); Rail.speed = 60; }
    st.build(makeRng(id === 'corvanis' ? 42 : 77));
    G.player = new Player();
    G.wingmen = ['marlow', 'kestrel', 'tobi'].map((w) => new Wingman(w));
    if (o.wingmenOut) for (const w of G.wingmen) if (o.wingmenOut.includes(w.id)) { w.active = false; w.hp = 0; }
    if (!o.keepRun) { G.lives = 3; G.bombs = 3; G.laser = 0; G.gold = 0; G.goldTotal = 0; G.shieldMax = 100; G.totalHits = 0; }
    G.player.reset();
    G.hits = 0; this.stageStartHits = G.totalHits;
    this.stats = { shots: 0, landed: 0, rolls: 0, loops: 0, charges: 0, bombs: 0, deflects: 0, rescues: 0, damage: 0, wingmenLost: 0, bonus: 0 };
    this.radioQ = []; this.radioCur = null; this.hideRadio(); this.hintCur = null; $('#hint').classList.remove('show');
    this.onceKeys = new Set();
    G.stageTime = 0; G.routeTaken = [st.start];
    G.checkpoint = null;
    if (st.mode === 'rails') this.saveCheckpoint(st.start, 0);
    else { this.phaseIdx = 0; this.enterPhase(0); }
    // place everyone so the first frame is sane
    if (st.mode === 'rails') { G.player.updateRails(0, Rail.s); G.wingmen.forEach((w) => w.updateRails(0)); }
    else { G.player.pos.set(0, 40, 700); G.player.yaw = 0; G.player.updateAllRange(0); }
    this.snapCamera();
    try { await R.renderer.compileAsync(R.scene, R.camera); } catch (e) { /* compile lazily */ }
    UI.showLoading(false);
    UI.hud(true);
    G.state = 'play'; G.paused = false;
    AudioSys.music(o.attract ? 'attract' : st.music);
    this.startIntro();
    Input.resetIdle();
  },
  startIntro() {
    const st = G.stage;
    G.cinematic = true; this.introT = 0;
    UI.stageCard(st, G.attract);
    if (!G.attract) AudioSys.stinger('missionStart');
    if (st.mode === 'allrange') {
      // warp-in streaks
      for (let i = 0; i < 60; i++) FX.sparks.spawn({ pos: G.player.pos.clone().add(V3(rand(-30, 30), rand(-20, 20), rand(-200, 40))), vel: V3(0, 0, -900), life: rand(0.3, 0.8), s0: 2, s1: 1, c0: 0xffffff, c1: 0x7ab8ff, int: 3, stretch: 0.05 });
    }
  },
  saveCheckpoint(segId, local) {
    G.checkpoint = { route: G.routeTaken.slice(), segId, local, hits: G.hits, gold: G.gold };
  },
  restoreCheckpoint() {
    const keepBoss = G.mode === 'allrange' && G.boss && G.boss.alive;
    if (keepBoss) {
      // modern QoL: the flagship keeps its damage; only hostile small fry and projectiles are cleared
      for (const e of G.ents) if (e.dispose && !e.isBossPart) e.dispose();
      G.ents = G.ents.filter((e) => e.isBossPart && e.alive);
    } else {
      for (const e of G.ents) if (e.dispose) e.dispose();
      if (G.boss) { G.boss.dispose(); G.boss = null; UI.bossBar(null); }
      G.ents = [];
    }
    G.shots.forEach((s) => s.kill()); G.shots = []; GameTimers.length = 0;
    const P = G.player;
    P.reset(); P.repairWings(); G.laser = 0; G.bombs = Math.max(G.bombs, 3);
    if (G.mode === 'rails') {
      const c = G.checkpoint;
      Rail.restore(c.route, c.segId, c.local); Rail.speed = 60;
      G.routeTaken = c.route.slice();
      G.hits = c.hits;
      P.updateRails(0, Rail.s);
      AudioSys.music(G.stage.music);
    } else {
      G.hits = G.checkpoint ? G.checkpoint.hits : G.hits;
      P.pos.set(0, 40, 700); P.yaw = 0; P.pitch = 0; P.updateAllRange(0);
      if (!keepBoss) this.enterPhase(this.phaseIdx);
    }
    G.wingmen.forEach((w) => { if (w.active) w.trouble = null; });
    this.snapCamera();
    G.player.invuln = 2.5;
    this.radio('marlow', pick(['Shake it off, Vix. We\'re right behind you.', 'Back in the fight! Stay focused.']), 1);
  },
  onPlayerDeath() {
    this.deathT = 2.6;
    if (this.chargeSnd) this.chargeSnd.stop();
  },
  afterDeath() {
    if (G.lives > 0) {
      G.lives--;
      UI.fade(0.4, () => this.restoreCheckpoint());
    } else {
      G.state = 'gameover';
      UI.hud(false);
      AudioSys.music('gameover');
      UI.open('gameover');
    }
  },
  onBossDefeated(boss) {
    UI.bossBar(null);
    AudioSys.play('explosionBig');
    FX.addShake(3, 1.2);
    Input.rumble(1, 1, 900);
    this.clearT = 5.5;
    this.radio('tobi', 'It\'s going down! Great work, team!', 3);
    for (const e of G.ents) if (e.alive && e.hostile && !e.isBossPart) e.die('none');
  },
  missionClear() {
    G.cinematic = true;
    this.clearSeq = { t: 0, from: G.player.pos.clone(), camFrom: R.camera.position.clone() };
    AudioSys.stinger('missionClear');
    AudioSys.music('results');
    UI.banner('MISSION ACCOMPLISHED', 3.5);
    this.radio('vix', G.stage.next ? 'Corvanis is clear. All wings, regroup — next stop, the armada!' : 'The flagship is down. Croak\'s armada is finished!', 3);
  },
  finishStage() {
    G.cinematic = false;
    G.state = 'results';
    G.totalHits += G.hits;
    const st = G.stage;
    const medal = G.hits >= st.medalHits && G.wingmen.every((w) => w.active);
    const rec = Save.data.medals[st.id] || { best: 0, medal: false };
    rec.best = Math.max(rec.best, G.hits); rec.medal = rec.medal || medal;
    Save.data.medals[st.id] = rec;
    Save.data.high = Math.max(Save.data.high, G.totalHits);
    if (st.next) Save.data.unlocked = Math.max(Save.data.unlocked, STAGES[st.next].number);
    Save.store();
    UI.hud(false);
    if (G.attract) { Attract.next(); return; }
    UI.results({ stage: st, hits: G.hits, total: G.totalHits, medal, best: rec.best, stats: this.stats, wingmen: G.wingmen.map((w) => ({ id: w.id, active: w.active, hp: w.hp })) });
  },
  quitToTitle() {
    G.state = 'title'; G.attract = false; G.cinematic = false;
    UI.hud(false);
    if (G.player && G.player.chargeSnd) G.player.chargeSnd.stop();
    Title.enter();
  },

  // ------------------------------------------------------------ event interpreter (data-driven)
  runEvent(e) {
    const P = G.player;
    switch (e.type) {
      case '_enterSeg':
        G.routeTaken.push(e.seg.id);
        if (e.seg.def.route) this.stat('route' + e.seg.def.route);
        if (e.seg.closed) Rail.speed = 46;
        break;
      case 'radio': this.radio(e.who, e.text, e.prio ?? 1); break;
      case 'hint': this.hint(e.id, e.text); break;
      case 'toast': this.toast(e.text, e.dur || 2.5); break;
      case 'music': AudioSys.music(e.track); break;
      case 'speed': Rail.speed = e.value; break;
      case 'wave': {
        const offs = e.offsets || [[0, 0]];
        for (let i = 0; i < e.count; i++) {
          const o = offs[i % offs.length];
          const p = { ...e.params };
          for (const k of ['x0', 'x1']) if (p[k] !== undefined) p[k] += o[0];
          for (const k of ['y0', 'y1']) if (p[k] !== undefined) p[k] += o[1];
          if (p.x0 !== undefined && p.x1 === undefined) p.x1 = p.x0;
          if (p.y0 !== undefined && p.y1 === undefined) p.y1 = p.y0;
          setTimeoutGame(() => { if (G.state === 'play') new RailFlyer(e.kind, e.pattern, p, { drop: i === e.count - 1 ? e.drop : null }); }, i * (e.delay || 0));
        }
        break;
      }
      case 'darts':
        for (let i = 0; i < e.count; i++) setTimeoutGame(() => new Dart(rand(-22, 22), rand(-12, 14)), i * 0.4);
        break;
      case 'turrets':
        e.xs.forEach((x, i) => {
          const s = Rail.s + e.ahead + i * 45;
          const p = Rail.toWorld(s, x, 0);
          const gy = World.heightAt(p.x, p.z);
          if (gy > -900) { p.y = gy; new Turret(p); }
        });
        break;
      case 'roofTurrets': {
        const seg = Rail.segs.city;
        (seg.roofSlots || []).filter((r, i) => r.s >= e.from && r.s <= e.to && i % 2 === 0).forEach((r) => new Turret(r.pos));
        break;
      }
      case 'tanks':
        for (let i = 0; i < e.count; i++) {
          const f = Rail.frame(Rail.s + e.ahead + i * 30);
          const p = f.pos.clone().addScaledVector(f.right, e.side * (30 + i * 6));
          p.y = World.heightAt(p.x, p.z);
          new Tank(p, f.right.clone().multiplyScalar(-e.side));
        }
        break;
      case 'mines':
        for (let i = 0; i < e.count; i++) new Mine(Rail.toWorld(Rail.s + e.ahead + i * 40, rand(-20, 20), rand(-12, 14)));
        break;
      case 'ring': this.placeRing(e.kind, Rail.s + e.ahead, e.x || 0, e.y || 0); break;
      case 'rings': for (let i = 0; i < e.n; i++) this.placeRing(e.kind, Rail.s + e.ahead + i * (e.spacing || 0), e.x || 0, e.y || 0); break;
      case 'crate': new Crate(Rail.toWorld(Rail.s + e.ahead, e.x || 0, e.y || 0), e.drop); break;
      case 'checkpoint': {
        const seg = Rail.seg;
        const r = this.placeRing('checkpoint', Rail.s + e.ahead, 0, 0);
        r.cp = { segId: seg.id, local: Rail.s + e.ahead - seg.s0 };
        break;
      }
      case 'trouble': {
        const w = G.wingmen.find((x) => x.id === e.who && x.active);
        if (!w) break;
        const chaser = new Chaser(w);
        w.startTrouble(chaser, 9);
        this.radio(w.id, { marlow: 'I\'ve got one on my tail and I can\'t shake him!', kestrel: 'Vix! Get this creep off me — NOW!', tobi: 'Help! Vix, somebody\'s shooting at me!' }[w.id], 3);
        this.hint('trouble', 'A wingman is in trouble — shoot the enemy chasing them!');
        break;
      }
      case 'boss':
        if (e.boss === 'strider') {
          G.boss = new StriderBoss();
          UI.bossBar(G.boss);
          AudioSys.music('boss'); AudioSys.stinger('warning'); AudioSys.play('bossAlarm');
          UI.banner('WARNING', 2.2, 'warn');
          this.radio('tobi', 'Scanning... It\'s a Granite Strider! Its shoulder pods are the weak points!', 2);
          this.radio('marlow', 'Watch the missiles — shoot them down or out-boost them!', 1);
        } else {
          G.boss = new MothershipBoss();
          UI.bossBar(G.boss);
          FX.flash(G.boss.pos, 0xb05aff, 80000, 1.2); R.flashU.value = 0.8;
          AudioSys.stinger('warning'); AudioSys.play('bossAlarm');
          UI.banner('WARNING', 2.2, 'warn');
        }
        break;
      case 'fork': break;
      case 'spawnDrones':
        for (let i = 0; i < e.count; i++) {
          const d = V3(rand(-1, 1), rand(-0.4, 0.4), rand(-1, 1)).normalize().multiplyScalar(rand(400, 700));
          new Drone(P.pos.clone().add(d));
        }
        break;
      case 'spawnAces': {
        const defs = [
          { name: 'JACKAL', hp: 24, hits: 8, skill: 1.3, speed: 90, palette: { body: 0x2a2a30, accent: 0xffc040 }, death: ['jackal', 'Impossible! This isn\'t over, Stark!'] },
          { name: 'VESPER', hp: 18, hits: 6, skill: 1.1, speed: 86, palette: { body: 0x3a2a4a, accent: 0xc23bff }, death: ['jackal', 'Vesper\'s down? Tch — useless!'] },
          { name: 'GRUB', hp: 16, hits: 5, skill: 0.9, speed: 80, palette: { body: 0x3a4a2a, accent: 0x8aff3a }, death: ['jackal', 'Grub! Get out of there, you oaf!'] },
        ];
        G.aces = defs.map((d, i) => {
          const a = new Ace(P.pos.clone().add(V3((i - 1) * 60, 40, -600)), { ...d, mesh: Models.ace(d.palette) });
          a.onDeath = () => this.radio(d.death[0], d.death[1], 2);
          return a;
        });
        UI.bossBar({ name: 'JACKAL PACK', hpFrac: () => G.aces.reduce((s, a) => s + (a.alive ? a.hp : 0), 0) / 58 });
        break;
      }
      case 'troubleAce': {
        const w = G.wingmen.find((x) => x.id === e.who && x.active);
        const ace = (G.aces || []).find((a) => a.alive);
        if (!w || !ace) break;
        ace.target = w; ace.retarget = 14;
        w.startTrouble(ace, 13);
        this.radio(w.id, { marlow: 'One of the Pack is on me! I could use a hand, Vix!', kestrel: 'This mutt won\'t get off my six! Vix!', tobi: 'Vix! A jackal is chasing me!! HELP!' }[w.id], 3);
        break;
      }
      case 'acesRetreat': {
        const left = (G.aces || []).filter((a) => a.alive);
        if (left.length) { this.radio('jackal', 'Pack, pull back! We\'ll finish this another day!', 2); left.forEach((a) => { a.hostile = false; a.lockable = false; setTimeoutGame(() => a.dispose(), 2.5); a.jink = 3; a.jinkDir.set(0, 1, 0); }); }
        UI.bossBar(null);
        break;
      }
      case 'pickups': {
        const kinds = ['silver', pick(['bomb', 'laser', 'silver']), pick(['gold', 'wing', 'bomb'])];
        kinds.forEach((k, i) => new Crate(P.pos.clone().addScaledVector(P.nose, 160 + i * 40).add(V3(rand(-25, 25), rand(-10, 10), rand(-25, 25))), k));
        this.radioOnce('supplies' + Math.floor(G.stageTime / 30), 'hq', 'Supply containers dropped near your position, Stark Fox!');
        break;
      }
      default: console.warn('Unknown stage event', e);
    }
  },
  placeRing(kind, s, x, y) {
    const f = Rail.frame(s);
    const pos = f.pos.clone().addScaledVector(f.right, x).addScaledVector(f.up, y);
    const r = new Pickup(kind, pos, { face: f.tan, magnet: false });
    if (kind !== 'checkpoint') r.mesh.scale.setScalar(1.8);
    return r;
  },
  // all-range phase director
  enterPhase(i) {
    const ph = G.stage.phases[i];
    if (!ph) return;
    this.phaseIdx = i;
    this.phase = { def: ph, t: 0, fired: new Set() };
    G.checkpoint = { hits: G.hits };
    (ph.enter || []).forEach((e) => this.runEvent(e));
  },
  updateDirector(dt) {
    const ph = this.phase;
    if (!ph) return;
    ph.t += dt;
    (ph.def.timeline || []).forEach((e, i) => { if (!ph.fired.has(i) && ph.t >= e.t) { ph.fired.add(i); this.runEvent(e); } });
    if (ph.def.until(ph)) {
      (ph.def.exit || []).forEach((e) => this.runEvent(e));
      this.enterPhase(this.phaseIdx + 1);
    }
  },

  // ------------------------------------------------------------ scoring / items
  addHits(n, pos, src) {
    if (n <= 0) return;
    G.hits += n;
    UI.popup(pos, n > 1 ? `+${n}` : '+1', n > 2 ? 'big' : '');
  },
  bonus(n, pos) {
    G.hits += n; this.stats.bonus += n;
    UI.popup(pos, `HIT +${n} BONUS`, 'bonus');
    AudioSys.play('oneUp', { volume: 0.5, pitch: 1.3 });
  },
  stat(k, v = 1) { this.stats[k] = (this.stats[k] || 0) + v; },
  collect(kind, pos) {
    const P = G.player;
    switch (kind) {
      case 'silver': P.heal(G.shieldMax * 0.3); AudioSys.play('ring'); UI.popup(pos, 'SHIELD +', 'item'); break;
      case 'gold':
        G.gold++; G.goldTotal++; P.heal(G.shieldMax * 0.5); AudioSys.play('goldRing');
        if (G.gold >= 3) {
          G.gold = 0;
          if (G.shieldMax < 140) { G.shieldMax = 140; P.heal(140); this.toast('SHIELD CAPACITY EXPANDED!'); this.radio('tobi', 'Three gold rings — I\'ve boosted your shield capacity!', 1); }
          else { G.lives++; AudioSys.play('oneUp'); this.toast('1-UP!'); }
        }
        UI.popup(pos, 'GOLD RING', 'item');
        break;
      case 'checkpoint': {
        const r = G.ents.find((e) => e.kind === 'checkpoint' && e.pos.distanceTo(pos) < 1);
        P.heal(G.shieldMax * 0.4); P.repairWings();
        AudioSys.play('checkpoint'); AudioSys.stinger('checkpoint');
        this.toast('CHECKPOINT');
        if (r && r.cp) this.saveCheckpoint(r.cp.segId, r.cp.local);
        break;
      }
      case 'laser':
        if (P.wingHP[0] <= 0 || P.wingHP[1] <= 0) { this.radio('tobi', 'Can\'t mount that upgrade with a broken wing! Find a wing repair!', 1); break; }
        G.laser = Math.min(2, G.laser + 1); AudioSys.play('pickup');
        this.toast(G.laser === 1 ? 'TWIN LASERS' : 'HYPER LASERS');
        if (this.onceKeys.has('laserMsg') === false) { this.onceKeys.add('laserMsg'); this.radio('tobi', G.laser === 1 ? 'Twin lasers online! Double the firepower!' : 'Hyper lasers! Now you\'re cooking!', 1); }
        break;
      case 'bomb': G.bombs = Math.min(9, G.bombs + 1); AudioSys.play('pickup'); this.toast('SMART BOMB +1'); break;
      case 'wing': P.repairWings(); P.heal(20); AudioSys.play('pickup'); this.toast('WINGS REPAIRED'); break;
    }
  },

  // ------------------------------------------------------------ radio / hints / toasts
  radio(who, text, prio = 1) {
    if (this.radioQ.length > 4) this.radioQ = this.radioQ.filter((m) => m.prio >= 2);
    this.radioQ.push({ who, text, prio });
    if (prio >= 3 && this.radioCur && this.radioCur.prio < 3) this.radioCur.t = 0;
  },
  radioOnce(key, who, text, prio) { if (this.onceKeys.has(key)) return; this.onceKeys.add(key); this.radio(who, text, prio); },
  updateRadio(dt) {
    if (this.radioCur) {
      this.radioCur.t -= dt;
      this.radioCur.shown = Math.min(this.radioCur.text.length, this.radioCur.shown + dt * 55);
      $('#radio-text').textContent = this.radioCur.text.slice(0, Math.floor(this.radioCur.shown));
      if (this.radioCur.t <= 0) { this.radioCur = null; this.hideRadio(); }
      return;
    }
    if (!this.radioQ.length) return;
    this.radioQ.sort((a, b) => b.prio - a.prio);
    const m = this.radioQ.shift();
    const vd = AudioSys.voice(m.who, m.text);
    AudioSys.play('radioOpen', { volume: 0.5 });
    m.t = Math.max(2.6, vd + 0.8, m.text.length / 22 + 1.0); m.shown = 0;
    this.radioCur = m;
    const c = CHARS[m.who];
    $('#radio-portrait').innerHTML = UI.portrait(m.who);
    $('#radio-name').textContent = c.name; $('#radio-name').style.color = c.color;
    $('#radio').classList.add('show');
  },
  hideRadio() { $('#radio').classList.remove('show'); },
  hint(id, text) {
    if (!Settings.hints || G.attract || this.hintsShown.has(id)) return;
    this.hintsShown.add(id);
    this.hintCur = { id, text, t: 7 };
    $('#hint').innerHTML = `<div class="hint-tag">TIP</div><div>${UI.glyphText(text)}</div>`;
    $('#hint').classList.add('show');
  },
  hintDone(id) { if (this.hintCur && this.hintCur.id === id) this.hintCur.t = Math.min(this.hintCur.t, 0.8); },
  updateHint(dt) {
    if (!this.hintCur) return;
    this.hintCur.t -= dt;
    if (this.hintCur.t <= 0) { this.hintCur = null; $('#hint').classList.remove('show'); }
  },
  toast(text, dur = 2.2) { const t = $('#toast'); t.textContent = text; t.classList.add('show'); this.toastT = dur; },

  // ------------------------------------------------------------ camera
  snapCamera() { this.cameraUpdate(1, true); },
  cameraUpdate(dt, snap = false) {
    const P = G.player;
    if (!P) return;
    const cam = R.camera;
    let tp, tl, up = V3(0, 1, 0), fov = 62;
    const far = G.camMode === 1;
    if (this.clearSeq) {
      const c = this.clearSeq;
      tp = c.camFrom; tl = P.pos.clone();
    } else if (G.mode === 'rails') {
      const f = Rail.frame(Rail.s + P.dz - (far ? 30 : 21));
      tp = f.pos.clone().addScaledVector(f.right, P.lx * 0.72).addScaledVector(f.up, P.ly * 0.7 + (far ? 9 : 5.5));
      const fl = Rail.frame(Rail.s + P.dz + 40);
      tl = fl.pos.clone().addScaledVector(fl.right, P.lx * 0.85).addScaledVector(fl.up, P.ly * 0.8 + 2);
      up = f.up.clone().applyAxisAngle(f.tan, -P.vx / 40 * 0.06 - P.bankVis * 0.05);
      if (P.maneuver && P.maneuver.type === 'loop') { tl = P.pos.clone(); }
      if (this.introT < 5 && G.cinematic && !G.attract) {
        // intro: start ahead of the team looking back at them, swing behind
        const k = smooth(clamp(this.introT / 4.6, 0, 1));
        const front = Rail.toWorld(Rail.s + 60, 18, 6);
        tp = front.lerp(tp, k);
        tl = P.pos.clone().lerp(tl, k);
      }
    } else {
      const flat = new THREE.Quaternion().setFromEuler(_e1.set(P.maneuver ? 0 : P.pitch, P.yaw, 0, 'YXZ'));
      const back = V3(0, far ? 9 : 6, far ? 34 : 24).applyQuaternion(P.maneuver ? P.quat.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), -P.bankVis - P.visRoll - P.flipRoll)) : flat);
      tp = P.pos.clone().add(back);
      tl = P.pos.clone().addScaledVector(P.nose, 30);
      if (P.maneuver) up = V3(0, 1, 0).applyQuaternion(P.quat);
    }
    if (P.boosting) fov = 75; else if (P.braking) fov = 54;
    if (snap) { this.camPos.copy(tp); this.camLook.copy(tl); this.camUp.copy(up); }
    else {
      const k = G.mode === 'rails' ? 9 : 5.5;
      this.camPos.lerp(tp, 1 - Math.exp(-dt * k));
      this.camLook.lerp(tl, 1 - Math.exp(-dt * 12));
      this.camUp.lerp(up, 1 - Math.exp(-dt * 6)).normalize();
    }
    this.fov = damp(this.fov, fov, 4, dt);
    cam.fov = this.fov; cam.updateProjectionMatrix();
    cam.position.copy(this.camPos).add(FX.shakeOffset(_v4));
    cam.up.copy(this.camUp);
    cam.lookAt(this.camLook);
    followSun(P.pos, R.sunDir);
  },

  // ------------------------------------------------------------ main update
  update(dt) {
    G.time += dt;
    if (G.state !== 'play') return;
    G.stageTime += dt;
    const P = G.player;
    if (G.cinematic && !this.clearSeq) {
      this.introT += dt;
      if (this.introT > (G.attract ? 1.5 : 4.8)) { G.cinematic = false; if (!G.attract) this.hint('pause', 'Press {pause} any time for the pause menu, controls and settings'); }
    }
    // inputs → player
    let ai = null;
    if (G.attract || G.testPilot) ai = Attract.pilot(dt);
    if (P.alive && !this.clearSeq) {
      if (G.cinematic) P.controls(dt, { sx: 0, sy: 0 });
      else P.controls(dt, ai);
    }
    if (Input.pressed('camera') && !G.attract) { G.camMode = 1 - G.camMode; this.toast(G.camMode ? 'CAMERA: FAR' : 'CAMERA: NEAR', 1); }
    // world motion
    if (G.mode === 'rails') {
      const spd = Rail.speed * (P.boosting ? 1.75 : P.braking ? 0.5 : 1) * (P.alive ? 1 : 0.4);
      const evs = Rail.advance(spd * dt, G.stage.forkChooser);
      for (const e of evs) this.runEvent(e);
      if (P.alive && !this.clearSeq) P.updateRails(dt, Rail.s);
    } else {
      if (P.alive && !this.clearSeq) P.updateAllRange(dt);
      if (!G.cinematic) this.updateDirector(dt);
    }
    // mission clear fly-off
    if (this.clearSeq) {
      const c = this.clearSeq; c.t += dt;
      const fwd = P.nose.clone();
      P.pos.addScaledVector(fwd, (60 + c.t * 120) * dt).add(V3(0, c.t * 20 * dt, 0));
      P.mesh.position.copy(P.pos);
      P.boosting = true; P.commonVisuals(dt); P.retA.visible = P.retB.visible = false;
      if (c.t > 4.2) { this.clearSeq = null; this.finishStage(); return; }
    }
    for (const w of G.wingmen) w.update(dt);
    for (let i = G.ents.length - 1; i >= 0; i--) { const e = G.ents[i]; if (!e.alive) { G.ents.splice(i, 1); continue; } if (!e.isBossPart) e.update(dt); }
    if (G.boss) G.boss.update(dt);
    updateShots(dt);
    updateGameTimers(dt);
    Phys.step(dt);
    // death / clear timers
    if (!P.alive && this.deathT > 0) { this.deathT -= dt; if (this.deathT <= 0) this.afterDeath(); }
    if (this.clearT > 0) { this.clearT -= dt; if (this.clearT <= 0) this.missionClear(); }
    // low shield beeper
    const low = P.alive && P.shield < G.shieldMax * 0.25 && !G.attract;
    if (low && !P.lowSnd) P.lowSnd = AudioSys.loop('lowShield');
    if (!low && P.lowSnd) { P.lowSnd.stop(); P.lowSnd = null; }
    this.updateRadio(dt); this.updateHint(dt);
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) $('#toast').classList.remove('show'); }
    if (Input.pressed('pause') && !G.attract && G.state === 'play') UI.pause(true);
  },
};

// homing pursuer used for wingman-in-trouble events (rails)
class Chaser extends Entity {
  constructor(w) {
    super(Models.fighter(), { hp: 4, hits: 3, radius: 3.4, color: 0xb8441e });
    this.w = w; this.escape = false; this.fireCD = 0.5;
    this.update(0);
  }
  update(dt) {
    if (this.escape) { this.pos.addScaledVector(V3(0, 1, -0.5), 200 * dt); this.baseUpdate(dt); this.escT = (this.escT || 0) + dt; if (this.escT > 2) this.dispose(); return; }
    if (!this.w.active) { this.escape = true; return; }
    const behind = this.w.pos.clone().addScaledVector(this.w.forward(), -16).add(V3(Math.sin(this.age * 3) * 2, Math.cos(this.age * 2.3) * 1.5, 0));
    this.prev.copy(this.pos);
    if (dt === 0) this.pos.copy(behind); else this.pos.lerp(behind, 1 - Math.exp(-dt * 6));
    this.vel.subVectors(this.pos, this.prev).multiplyScalar(1 / Math.max(dt, 1e-4));
    this.facePoint(this.w.pos, dt, 8);
    this.fireCD -= dt;
    if (this.fireCD <= 0 && dt > 0) {
      this.fireCD = 0.35;
      const d = _v1.subVectors(this.w.pos, this.pos).normalize();
      fireShot('eshot', 'enemy', this.pos.clone().addScaledVector(d, 3), d.multiplyScalar(200).add(this.w.vel), { life: 0.4, color: 0xff6a2a, scale: 0.5 });
    }
    this.baseUpdate(dt);
  }
}

// ---------------------------------------------------------------- attract mode (AI pilot, cheats freely)
const Attract = {
  seq: [{ stage: 'corvanis', dur: 75 }, { stage: 'zeta', dur: 60, phase: 1 }, { stage: 'corvanis', dur: 40, skipTo: 'boss' }],
  i: 0, t: 0, rollCD: 0, fireT: 0, flipCD: 6, bombCD: 8,
  async start() {
    this.i = 0;
    await this.play();
  },
  async play() {
    const s = this.seq[this.i % this.seq.length];
    this.t = s.dur;
    G.attract = true;
    await Game.loadStage(s.stage, { attract: true });
    if (s.phase) Game.enterPhase(s.phase);
    if (s.skipTo) {
      const route = ['approach', 'city', 'canyon', 'plains', 'boss'];
      Rail.restore(route, 'plains', Rail.segs.plains.length - 80);
      G.routeTaken = route.slice(0, 4);
      G.player.updateRails(0, Rail.s); Game.snapCamera();
    }
    UI.attractOverlay(true);
  },
  async next() { this.i++; if (this.i >= this.seq.length) { this.stop(); return; } await this.play(); },
  stop() { UI.attractOverlay(false); G.attract = false; Game.quitToTitle(); },
  update(dt) {
    if (!G.attract || G.state !== 'play') return;
    this.t -= dt;
    if (this.t <= 0) { this.t = 999; UI.fade(0.5, () => this.next()); }
  },
  pilot(dt) {
    const P = G.player;
    const I = { sx: 0, sy: 0, boost: false, brake: false, fireP: false, fireH: false, fireR: false, rapid: false, bomb: false, roll: 0, bankL: false, bankR: false, flip: false };
    if (G.attract) P.shield = G.shieldMax;
    // pick target: nearest hostile ahead
    let best = null, bd = 1e9;
    for (const e of G.ents) {
      if (!e.alive || !e.hostile) continue;
      const wp = e.worldPos();
      const to = _v1.subVectors(wp, P.pos);
      const ahead = to.dot(P.nose);
      if (ahead < 10) continue;
      const d = to.length();
      if (d < bd && d < 600) { bd = d; best = e; }
    }
    if (G.boss && G.boss.alive) { const parts = Object.values(G.boss.parts).filter((p) => p.alive && !p.locked()); if (parts.length) best = parts[0]; }
    // if a pickup is near and ahead, steer to it
    for (const e of G.ents) if (e instanceof Pickup && e.alive && e.pos.distanceTo(P.pos) < 220 && _v1.subVectors(e.pos, P.pos).dot(P.nose) > 20) { best = e; break; }
    if (G.mode === 'rails') {
      if (best) {
        const f = Rail.frame(Rail.s);
        const to = _v1.subVectors(best.worldPos(), P.pos);
        const lx = to.dot(f.right), ly = to.dot(f.up);
        I.sx = clamp(lx / 10, -1, 1); I.sy = clamp(-ly / 10, -1, 1);
      } else { I.sx = clamp(-P.lx / 15, -1, 1) + Math.sin(G.time * 0.7) * 0.4; I.sy = clamp(P.ly / 15, -1, 1); }
      if (G.boss && G.boss.alive) I.sy = clamp((P.ly - 8) / 10, -1, 1) * (best instanceof BossPart ? 0.3 : 1);
    } else if (best) {
      const to = _v1.subVectors(best.worldPos(), P.pos).normalize();
      const local = to.clone().applyQuaternion(new THREE.Quaternion().setFromEuler(_e1.set(P.pitch, P.yaw, 0, 'YXZ')).invert());
      I.sx = clamp(local.x * 3, -1, 1); I.sy = clamp(-local.y * 3, -1, 1);
      if (local.z > 0.3 && Math.random() < dt * 0.6) { I.flip = true; I.brake = true; }
    } else { I.sx = 0.3; }
    // weapons: rapid fire when aligned, periodic charge shots
    this.fireT += dt;
    const cyc = this.fireT % 4;
    if (best && best.hostile) {
      if (cyc < 2.4) I.rapid = true;
      else if (cyc < 3.6) I.fireH = true;
      else if (cyc - dt < 3.6) I.fireR = true;
    }
    // barrel roll when shots are near
    this.rollCD -= dt;
    if (this.rollCD <= 0 && G.shots.some((s) => s.alive && s.owner === 'enemy' && s.pos.distanceTo(P.pos) < 30)) { I.roll = Math.random() < 0.5 ? -1 : 1; this.rollCD = 1.2; }
    this.flipCD -= dt;
    if (G.mode === 'rails' && this.flipCD <= 0 && G.ents.some((e) => e.alive && e instanceof RailFlyer && _v1.subVectors(e.pos, P.pos).dot(P.nose) < 0)) { I.flip = true; this.flipCD = 9; }
    this.bombCD -= dt;
    if (this.bombCD <= 0 && G.ents.filter((e) => e.alive && e.hostile).length > 5) { I.bomb = true; this.bombCD = 12; }
    I.boost = Math.sin(G.time * 0.31) > 0.85;
    return I;
  },
};
