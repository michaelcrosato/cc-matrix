/* 60-mission: the mission runtime shared by story, Missions, the Shadow Trial, the hub round, attract mode and Workshop
 * test plays. Objectives (assassinate, retrieve, rescue, escort, reach, defeat, interact, stopTimer, flag), triggers,
 * checkpoints, the moon timer, alarm bells and reinforcements, fail states; and the score, ranks, unlocks and saves. */
class Mission {
  constructor(levelId, o = {}) {
    const spec = o.spec ? JSON.parse(JSON.stringify(o.spec)) : B.levelSpec(levelId);
    this.level = spec; this.levelId = levelId; this.o = o; this.mode = o.mode || 'story'; this.missionId = o.missionId || levelId; this.auto = !!o.auto;
    this.charId = o.character || 'sojiro'; this.world = new World(spec); B.mission = this; B.clearFlows();
    this.cheats = Object.assign({ god: false, invisible: false, noclip: false, infTools: false, oneHit: false, freeze: false, reveal: false }, o.cheats || {});
    this.stats = { silentCuts: 0, kills: 0, cleanKills: 0, detections: 0, civiliansHarmed: 0, optionalDone: 0, tools: 0, retries: o.retries || 0, grapples: 0, cutKinds: {} };
    this.t = 0; this.over = false; this.result = null; this.failReason = null; this.noises = []; this.lobs = []; this.clouds = []; this.traps = []; this.baits = []; this.flames = []; this.fireballs = []; this.spirits = []; this.clones = [];
    this.flags = {}; this.heightened = false; this.heightenT = 0; this.bellRung = false; this.bellRunner = null; this.waves = 0; this.lastDetect = -99; this.ki = 0; this.kiState = 'calm';
    this.toastQ = []; this.hitFlash = 0; this.toolFlash = 0; this.slowmoT = 0; this.splash = null; this.flashT = 0; this.place = null; this.placeT = 0; this.bossBar = null; this.letterbox = 0; this.cine = null;
    this.shots = new E.Bullets(B.game, { plane: 'ground' });
    this.talk = new E.Dialog(B.game, { voice: null, speed: B.ts() }); this.talk.voice = null; this.talkWho = null;
    this.bento = B.Bento.make(o.loadout || (get('mission', this.missionId) || {}).loadoutHint || ['riceball', 'shuriken', 'smoke', 'poison', 'firecracker', 'caltrops', 'riceball', 'shuriken']);
    const hs = spec.hero || { at: [2, 2] };
    this.hero = B.makeHero(this.world, this.charId, { x: cc(hs.at[0]), y: cc(hs.at[1]), z: hs.z || 0, facing: (hs.facing || 0) * Math.PI / 180 }, { stats: (this.mode === 'hub' || this.mode === 'trial') ? 'trial' : null, rig: o.rig ? o.rig() : null });
    this.guards = (spec.guards || []).concat((spec.civilians || []).map(c => Object.assign({ type: c.disguised ? 'civilian' : c.type === 'target' ? 'target' : 'civilian' }, c, { kind: c.kind || c.type, type: c.type === 'target' ? 'target' : 'civilian' }))).map(g => new Guard(g, this));
    this.bosses = []; if (spec.boss) this.bosses.push(new Boss(spec.boss.id, spec.boss, this));
    this.escort = spec.escort ? new Escort(spec.escort, this) : null;
    this.pickups = (spec.pickups || []).map(p => Object.assign({ x: cc(p.at[0]), y: cc(p.at[1]), z: p.z || 0, taken: false }, p));
    this.interacts = (spec.interact || []).map(it => Object.assign({ x: cc(it.at[0]), y: cc(it.at[1]), z: it.z || 0, done: false, prog: 0, active: it.active !== false }, it));
    this.talkers = []; for (const n of spec.npcs || []) this.talkers.push(this.makeNpc(n));
    this.bells = (spec.bells || []).map(b => ({ x: cc(b[0]), y: cc(b[1]) })); this.barracks = (spec.barracks || []).map(b => ({ x: cc(b[0]), y: cc(b[1]) }));
    for (const b of this.bells) this.world.props.push({ id: 'hansho', x: b.x, y: b.y - 6, o: { solid: false } });
    this.exit = spec.exit ? { x: cc(spec.exit.at[0]), y: cc(spec.exit.at[1]), r: (spec.exit.r || 1.5) * CELL } : null;
    this.objectives = (spec.objectives || []).map(ob => Object.assign({ state: ob.hidden ? 'hidden' : 'active', n: 0 }, ob));
    this.triggers = (spec.triggers || []).map(t => Object.assign({ fired: false }, t));
    this.timer = spec.timer ? { left: spec.timer.seconds, max: spec.timer.seconds, stopped: false, fail: spec.timer.fail, stopOn: spec.timer.stopOn } : null;
    this.checkpointData = null; this.snapshot('start');
    if (o.checkpoint) this.restore(o.checkpoint);
  }
  /* ---- simple NPCs: Granny at the training's end, Tobei in his cage ---- */
  makeNpc(n) {
    const M = this, rig = B.RIGS[n.rig] ? B.RIGS[n.rig]() : B.RIGS.granny();
    return { id: n.id, x: cc(n.at[0]), y: cc(n.at[1]), z: n.z || 0, facing: (n.facing || 90) * Math.PI / 180, rig, talkLabel: n.label || 'Talk', line: n.line, speaker: n.speaker || n.id,
      canTalk: () => !n.when || M.objDone(n.when), talk() { if (n.line) M.say(n.speaker || n.id, n.line); if (n.flag) M.setFlag(n.flag, true); },
      update(dt) { rig.update(dt, { x: this.x, y: this.y, z: this.z, facing: this.facing, vx: 0, vy: 0 }); } };
  }
  /* ---- the step ---- */
  update(dt, intent) {
    const G = B.game, h = this.hero; this.intent = intent; this.t += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt); this.toolFlash = Math.max(0, this.toolFlash - dt); this.flashT = Math.max(0, this.flashT - dt); this.placeT = Math.max(0, this.placeT - dt);
    if (this.slowmoT > 0) { this.slowmoT -= dt / Math.max(.05, G.timeScale); if (this.slowmoT <= 0) { G.timeScale = 1; G.setZoom(this.zoomBase || 1); } }
    if (this.splash) { this.splash.t += dt / Math.max(.05, G.timeScale); if (this.splash.t > 1.4) this.splash = null; }
    if (this.talk.open) { const modal = this.talk.update(dt); B.Voice.dialog(this.talk, this.talkWho); if (modal) { this.letterbox = approach(this.letterbox, 1, dt * 4); return; } }
    this.letterbox = approach(this.letterbox, this.cine || (this.splash && this.slowmoT > 0) ? 1 : 0, dt * 4 / Math.max(.2, B.game.timeScale));
    if (this.cine) { this.cine.t += dt; if (this.cine.t > this.cine.d) { const f = this.cine.done; this.cine = null; if (f) f(); } else return; }
    if (this.over) { if (h) h.rig.update(dt, h.rigState({ pose: this.result === 'win' ? 'cheer' : h.dead ? 'die' : null })); for (const g of this.guards) g.update(dt, this); return; }
    if (h) { if (h.stunT > 0) { h.stunT -= dt; intent = B.emptyIntent(); } if (this.cheats.noclip) this.noclip(h, dt, intent); else B.heroUpdate(h, dt, intent, this); }
    B.perceive(this, dt);
    for (const g of this.guards) g.update(dt, this);
    for (const b of this.bosses) b.update(dt, this);
    if (this.escort) this.escort.update(dt, this);
    for (const n of this.talkers) n.update(dt);
    this.shots.update(dt, this.world.map);
    this.shots.hit(this.guards.filter(g => g.alive && !g.dying).concat(this.bosses.filter(b => b.alive && b.active)), (b, t) => { B.damage(h, t, b.dmg || 8, { kind: 'shuriken', quiet: false }); B.sfxAt('thunk', t.x, t.y); }, 'player');
    if (h && !h.dead) { const tg = [h]; if (this.escort && this.escort.freed && this.escort.alive) tg.push(this.escort); this.shots.hit(tg, (b, t) => { if (t === h) B.damage(b.src || null, h, b.dmg || 10, { kind: 'arrow' }); else t.takeHit(null, b.dmg || 10); }, 'enemy'); }
    B.toolsUpdate(this, dt); this.hazards(dt);
    for (const n of this.noises) n.t += dt; this.noises = this.noises.filter(n => n.t < .8);
    if (this.heightenT > 0) { this.heightenT -= dt; if (this.heightenT <= 0 && !this.bellRung) this.heightened = false; }
    if (this.waveAt && this.t >= this.waveAt) { this.waveAt = 0; this.reinforce(); }
    if (this.timer && !this.timer.stopped && !this.over) { this.timer.left -= dt; if (this.timer.left <= 0) { this.timer.left = 0; this.fail(this.timer.fail || 'Time ran out.'); } }
    // pickups by touch (tools); story items with interact
    if (h) for (const p of this.pickups) if (!p.taken && p.kind === 'tool' && Math.hypot(p.x - h.x, p.y - h.y) < 12 && Math.abs(p.z - h.z) < 10) this.takePickup(p);
    // zone names
    if (h) { const z = this.world.zoneAt(h.x, h.y); if (z && z !== this.place) { this.place = z; this.placeT = 3; } }
    this.runTriggers(); this.checkObjectives();
    // the music's mood: tension at any notice or Ki 60+, alert on any alert
    const alert = this.guards.some(g => g.alive && !g.civilian && g.mind.state === 'alert') || this.bosses.some(b => b.active && b.alive);
    const tense = alert || this.ki >= 60 || this.guards.some(g => g.alive && !g.civilian && g.mind.state !== 'calm');
    if (alert) this.lastAlert = this.t;
    if (!this.bosses.some(b => b.active && b.alive)) B.music.mood(alert || this.t - (this.lastAlert || -99) < 4 ? 2 : tense ? 1 : 0);
    if (G.settings.heartbeat && this.ki >= 50 && !this.over) { this.hbT = (this.hbT || 0) - dt; if (this.hbT <= 0) { this.hbT = 1 / lerp(.8, 2.2, (this.ki - 50) / 49); B.sfx('heartbeat', { vol: .5 + (this.ki - 50) / 100 }); } }
  }
  noclip(h, dt, I) { const s = I.sprint ? 260 : 140; h.x += I.move[0] * s * dt; h.y += I.move[1] * s * dt; if (I.jumpPressed || B.game.input.down('jump')) h.z += 120 * dt; if (B.game.input.down('crouch')) h.z = Math.max(0, h.z - 120 * dt); h.vx = I.move[0] * s; h.vy = I.move[1] * s; h.vz = 0; if (Math.hypot(I.move[0], I.move[1]) > .1) h.facing = Math.atan2(I.move[1], I.move[0]); h.exposure = 0; h.rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: h.facing, air: h.z > 0 }); }
  hazards(dt) {
    const h = this.hero;
    for (const f of this.flames) { f.t -= dt; if (crand() < dt * 6) P.fire(f.x, f.y, f.z, 1, { size: 1.2 }); if (h && !h.dead && Math.hypot(h.x - f.x, h.y - f.y) < f.r && Math.abs(h.z - f.z) < 8) { f.hit = (f.hit || 0) - dt; if (f.hit <= 0) { f.hit = .5; B.damage(null, h, 6, { kind: 'fire', unblockable: true }); } } }
    this.flames = this.flames.filter(f => f.t > 0);
    for (const b of this.fireballs) {
      b.vz -= 700 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; if (crand() < .6) P.add({ kind: 'fire', x: b.x, y: b.y, z: b.z, life: .3, size: 1.5 });
      const gz = this.world.map.groundAt(b.x, b.y, 2, b.z + 4) || 0;
      if (b.z <= gz) { b.done = true; P.explosion(b.x, b.y, gz + 2, .7, { freeze: false, shake: 2 }); B.sfxAt('boom', b.x, b.y, { vol: .5 }); if (h && Math.hypot(h.x - b.x, h.y - b.y) < 22) B.damage(null, h, 14, { kind: 'fire' }); this.flames.push({ x: b.x, y: b.y, z: gz, t: 2, r: 10 }); }
    }
    this.fireballs = this.fireballs.filter(b => !b.done);
    for (const s of this.spirits) {
      if (!s.alive) continue; s.t += dt; const a = Math.atan2(h.y - s.y, h.x - s.x); s.x += Math.cos(a) * 46 * dt; s.y += Math.sin(a) * 46 * dt; s.blob.update(dt, { squash: Math.sin(s.t * 8) * .15, look: [Math.cos(a), Math.sin(a)] });
      if (crand() < dt * 14) P.add({ kind: 'ember', x: s.x, y: s.y, z: s.z + 6, vz: 25, life: .5, color: '#ff8a3a' });
      if (Math.hypot(h.x - s.x, h.y - s.y) < 10 && Math.abs(h.z - s.z) < 12) { s.alive = false; P.explosion(s.x, s.y, s.z + 6, .5, { freeze: false, shake: 1 }); B.damage(null, h, 10, { kind: 'fire' }); }
      if (h.combo.busy && h.combo.active && E.inArc(h, h.facing, s, 24, 1.3)) { s.alive = false; P.smoke(s.x, s.y, s.z + 6, 6); B.sfx('smoke'); }
    }
    for (const c of this.clones) {
      if (!c.alive) continue; c.t += dt; c.fanT -= dt; c.rig.update(dt, { x: c.x, y: c.y, z: c.z, vx: 0, vy: 0, facing: Math.atan2(h.y - c.y, h.x - c.x), stance: 'ready', attack: c.fanT < .3 ? E.move('throw', 1 - c.fanT / .3) : null });
      if (c.fanT <= 0) { c.fanT = 2.4 + rand(); const a0 = Math.atan2(h.y - c.y, h.x - c.x); for (let i = 0; i < 3; i++) { const a = a0 + (i - 1) * .25; this.shots.fire({ x: c.x, y: c.y, z: c.z + 20, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, r: 2, team: 'enemy', life: 1.2, dmg: 5, color: '#ff8a8a' }); } }
    }
  }
  spawnClones(b) { this.clones = [0, 1].map(i => { const a = rand() * TAU; return { alive: true, x: b.x + Math.cos(a) * 40, y: b.y + Math.sin(a) * 40, z: b.z, t: 0, fanT: 1 + i, rig: B.RIGS.hotaru() }; }); for (const c of this.clones) P.smoke(c.x, c.y, c.z + 14, 10, { size: 2 }); this.say('hotaru', 'hot_clones'); }
  spawnSpirits(b) { for (let i = 0; i < 2; i++) { const a = rand() * TAU; this.spirits.push({ alive: true, x: b.x + Math.cos(a) * 30, y: b.y + Math.sin(a) * 30, z: b.z, t: 0, blob: new E.Blob({ R: 5, colors: { dk: '#8a2a0a', base: '#ff6a2a', lt: '#ffb060', spec: '#fff0c0', eye: '#fff8e0', pupil: '#2a0a00' }, mouth: 'fangs' }) }); } }
  /* ---- events ---- */
  toast(title, text) { if (this.mode === 'attract') return; B.ui.toast(title, text, 3); this.toastQ.push({ title, text, t: 0 }); }
  say(who, key, o = {}) {
    if (who === 'hero') who = this.charId === 'trial' ? 'sojiro' : this.charId;
    const line = B.STORY.line(key, this.charId); if (!line) return;
    const sp = B.STORY.speakers[who] || { name: who.toUpperCase(), rig: 'granny', voice: 'guard' };
    if (!this._portraits) this._portraits = {};
    const rig = this._portraits[who] || (this._portraits[who] = B.RIGS[sp.rig] ? B.RIGS[sp.rig](sp.arg) : null);
    this.talk.speed = B.ts(); this.talkWho = sp.voice;
    this.talk.say(Array.isArray(line) ? line : [line], { name: sp.name, portrait: rig, modal: !!o.modal && !this.auto, auto: o.modal && !this.auto ? undefined : 3.2, onDone: o.onDone, place: 'top' });
  }
  setFlag(k, v) { this.flags[k] = v === undefined ? (this.flags[k] || 0) + 1 : v; B.emit('flag', { k, v: this.flags[k] }); }
  silentCut(kind, g) {
    const G = B.game, mark = g.mark; this.stats.silentCuts += mark ? 0 : 1; this.stats.cutKinds[kind] = (this.stats.cutKinds[kind] || 0) + 1;
    if (!mark) { if (g.civilian && !g.disguised) this.civilianHurt(g); else this.stats.kills++; }
    if (mark) { g.defeated = true; this.setFlag('marks'); this.setFlag('mark_' + kind, true); }
    if (g.target) this.targetDown(g); this.disguisedCheck(g);
    this.zoomBase = G.zoom / (G.settings.zoom || 1); const reduce = G.reduceMotion;
    G.freeze(.05); G.timeScale = B.T('slowmo'); this.slowmoT = reduce ? .3 : .9; if (!reduce) G.setZoom(Math.min(2.2, (this.zoomBase || 1) * 1.6));
    this.splash = { kind, t: 0, mark }; G.audio.sting(B.STINGS.cut); B.sfx('twang');
    if (!mark && G.settings.blood === 'ink') G.after(.25, () => { P.bits(g.x, g.y, g.z + 14, 14, ['#d02a20', '#8a1410', '#1a1418']); this.inkDecals = (this.inkDecals || []).concat([{ x: g.x, y: g.y, z: g.z, r: 5 + crand() * 4 }]).slice(-40); });
    B.emit('silentCut', { kind, victim: g }); if (!mark) B.emit('kill', { victim: g, kind: 'silentCut' });
  }
  kill(g, kind) {
    if (g.mark) { g.defeated = true; return; }
    if (g.civilian && !g.disguised && kind !== 'silentCut') this.civilianHurt(g, true);
    else { this.stats.kills++; if (kind === 'poison') this.stats.cleanKills++; }
    if (g.target) this.targetDown(g); this.disguisedCheck(g);
    if (this.bellRunner === g) { this.bellRunner = null; this.toast('The bell stays silent.', ''); }
    B.sfxAt('bodyDrop', g.x, g.y); B.emit('kill', { victim: g, kind });
  }
  disguisedCheck(g) { if (g.spec.disguised && !g._dcount) { g._dcount = true; this.setFlag('disguisedDown'); } }
  targetDown(g) { this.setFlag('target_' + g.id, true); B.emit('targetDown', { g }); }
  civilianHurt(g, dead) { if (g._harmed) return; g._harmed = true; this.stats.civiliansHarmed++; this.toast('An innocent!', 'The Jubako-ya does not harm the people'); B.emit('civilian', { g, dead }); }
  detected(g, byHero) {
    if (!byHero || this.mode === 'attract') return;
    if (this.t - this.lastDetect > 5) { this.stats.detections++; this.lastDetect = this.t; B.game.audio.sting(B.STINGS.alert); B.emit('detected', { g }); }
  }
  bodyFound(g, b) { this.heightened = true; this.heightenT = Math.max(this.heightenT, 90); this.toast('A body was found!', 'The guards are on edge'); B.emit('bodyFound', { g, b }); }
  nearestBell(g) { let best = null, bd = 240; for (const b of this.bells) { const d = Math.hypot(b.x - g.x, b.y - g.y); if (d < bd) { bd = d; best = b; } } return best; }
  ringBell(g) {
    if (this.bellRung) return; this.bellRung = true; this.bellRunner = null; this.heightened = true; this.heightenT = 1e9;
    B.sfxAt('bell', g.x, g.y, { vol: 1.4 }); this.toast('The alarm bell rings!', 'Every guard is searching'); B.emit('bell', { g });
    const h = this.hero; for (const q of this.guards) if (q.alive && !q.civilian && !q.harmless) { q.mind.level = Math.max(q.mind.level, q.mind.search + .05); q.mind.last = { x: h.x, y: h.y, z: h.z }; }
    if (this.waves < 2 && this.barracks.length) this.waveAt = this.t + B.T('reinforceDelay');
  }
  reinforce() {
    const h = this.hero; let bk = this.barracks[0], bd = 1e9; for (const b of this.barracks) { const d = Math.hypot(b.x - h.x, b.y - h.y); if (d < bd) { bd = d; bk = b; } }
    this.waves++; this.toast('Reinforcements!', 'More guards pour out of the barracks');
    for (const type of ['samurai', 'ashigaru']) { const g = new Guard({ id: 'rf' + this.waves + type, type, at: [bk.x / CELL - .5 + (type === 'samurai' ? .3 : -.3), bk.y / CELL - .5], faction: this.level.faction, lantern: type === 'ashigaru' }, this); g.mind.level = g.mind.search + .1; g.mind.last = { x: h.x, y: h.y, z: h.z }; this.guards.push(g); }
    B.emit('reinforce', { wave: this.waves });
  }
  takePickup(p) {
    p.taken = true;
    if (p.kind === 'tool') { const n = B.Bento.add(this, p.tool, p.n || 1); B.sfx('pickup'); this.toast(get('tool', p.tool).name + (n ? ' x' + n : ''), n ? 'Packed in your bento' : 'No room in the bento'); }
    else { B.sfx('powerup'); this.toast(p.name || 'Found it', p.text || ''); this.setFlag('pickup_' + p.id, true); }
    B.emit('pickup', { p });
  }
  useInteract(it) {
    it.done = true; B.sfx('lever'); this.setFlag('interact_' + it.id, true);
    for (const a of it.do || []) this.doAction(a);
    if (it.count) { this.setFlag(it.count); }
    B.emit('interact', { it });
  }
  visibleTo(b) { const h = this.hero; try { return this.world.map.sight(h, b); } catch (e) { return false; } }
  /* ---- triggers and actions ---- */
  condition(c) {
    if (!c) return true; const [k, v] = c.split(':');
    if (k === 'objective') return this.objDone(v); if (k === 'kill') { const g = this.guards.find(q => q.id === v); return !!g && !g.alive; }
    if (k === 'alert') return this.guards.some(g => g.alive && g.mind.state === 'alert'); if (k === 'time') return this.t >= +v; if (k === 'pickup') return !!this.flags['pickup_' + v];
    if (k === 'flag') { const [f, n] = v.split('>='); return n ? (this.flags[f] || 0) >= +n : !!this.flags[f]; } if (k === 'interact') return !!this.flags['interact_' + v];
    return false;
  }
  runTriggers() {
    const h = this.hero;
    for (const t of this.triggers) {
      if (t.fired && t.once !== false) continue;
      let ok = true;
      if (t.rect) { const cx = h.x / CELL, cy = h.y / CELL; ok = cx >= t.rect[0] && cy >= t.rect[1] && cx <= t.rect[2] + 1 && cy <= t.rect[3] + 1 && (t.z === undefined || h.z >= t.z - 4); }
      if (t.at) ok = ok && Math.hypot(h.x - cc(t.at[0]), h.y - cc(t.at[1])) < (t.r || 1.5) * CELL;
      if (t.when) ok = ok && this.condition(t.when);
      if (!ok) continue; if (t.fired && t.once === false && t._in) continue;
      t.fired = true; t._in = true; for (const a of t.do || []) this.doAction(a);
    }
  }
  doAction(a) {
    const [k, ...r] = a;
    if (k === 'say') this.say(r[0], r[1], { modal: !!r[2] });
    else if (k === 'toast') this.toast(r[0], r[1] || '');
    else if (k === 'tutorial') this.tutorial(r[0], r[1]);
    else if (k === 'checkpoint') this.snapshot(r[0] || 'trigger');
    else if (k === 'spawn') { const g = new Guard(r[0], this); this.guards.push(g); }
    else if (k === 'boss') this.startBoss(r[0]);
    else if (k === 'objective') { const ob = this.objectives.find(o => o.id === r[0]); if (ob) { if (r[1] === 'show' && ob.state === 'hidden') { ob.state = 'active'; this.objToast(ob, 'New objective'); } else if (r[1] === 'done') this.completeObj(ob); else if (r[1] === 'fail') { ob.state = 'failed'; } } }
    else if (k === 'open' || k === 'close') { const [cx, cy, w = 1, hh = 1, ch] = r; for (let y = cy; y < cy + hh; y++) for (let x = cx; x < cx + w; x++) this.world.set(x, y, k === 'open' ? (ch || '.') : (ch || '#')); B.sfx('lever'); this.openCells = (this.openCells || []).concat([[k, cx, cy, w, hh, ch]]); }
    else if (k === 'music') A.layer(r[0], r[1] === undefined ? 1 : r[1], 1);
    else if (k === 'flag') this.setFlag(r[0], r[1] === undefined ? true : r[1]);
    else if (k === 'timer') { if (this.timer) this.timer.stopped = r[0] === 'stop'; }
    else if (k === 'free') { if (this.escort) { this.escort.freed = true; this.escort.say('tobei_freed'); } }
    else if (k === 'activate') { const it = this.interacts.find(i => i.id === r[0]); if (it) it.active = true; }
    else if (k === 'barges') { this.bargesCut = (this.bargesCut || 0) + 1; }
    else if (k === 'swap') { if (this.timer) this.timer.stopped = true; this.toast('The sake is swapped', 'The lord will drink only rice wine'); }
  }
  tutorial(title, text) { if (this.mode === 'attract' || this.auto) return; this.tut = { title, text, t: 0 }; B.sfx('fusuma'); }
  /* ---- objectives ---- */
  objDone(id) { const ob = this.objectives.find(o => o.id === id); return !!ob && ob.state === 'done'; }
  objToast(ob, kicker) { this.toast(kicker || 'Objective', ob.text); }
  completeObj(ob) {
    if (ob.state === 'done' || ob.state === 'failed') return; ob.state = 'done'; if (ob.optional) this.stats.optionalDone++;
    B.game.audio.sting(B.STINGS.objective); this.objToast(ob, ob.optional ? 'Optional task done' : 'Objective done'); B.emit('objective', { ob });
    for (const o2 of this.objectives) if (o2.state === 'hidden' && o2.after && o2.after.every(x => this.objDone(x))) { o2.state = 'active'; this.objToast(o2, 'New objective'); }
    if (ob.say) this.say(ob.say[0], ob.say[1]);
  }
  checkObjectives() {
    const h = this.hero;
    for (const ob of this.objectives) {
      if (ob.state !== 'active') continue;
      if (ob.after && !ob.after.every(x => this.objDone(x))) continue;
      let done = false;
      if (ob.type === 'assassinate') { const g = this.guards.find(q => q.id === ob.target); done = !!g && !g.alive; }
      else if (ob.type === 'retrieve') done = !!this.flags['pickup_' + ob.pickup];
      else if (ob.type === 'rescue' || ob.type === 'interact' || ob.type === 'stopTimer') done = ob.count ? (this.flags[ob.flag] || 0) >= ob.count : !!this.flags['interact_' + ob.interact];
      else if (ob.type === 'defeat') { const b = this.bosses.find(q => q.bossId === ob.boss); done = !!b && !b.alive; }
      else if (ob.type === 'flag') done = ob.count ? (this.flags[ob.flag] || 0) >= ob.count : !!this.flags[ob.flag];
      else if (ob.type === 'reach') { const z = ob.exit ? this.exit : { x: cc(ob.at[0]), y: cc(ob.at[1]), r: (ob.r || 1.5) * CELL }; done = !!z && Math.hypot(h.x - z.x, h.y - z.y) < z.r && h.z < (ob.z === undefined ? 40 : ob.z + 8); }
      else if (ob.type === 'escort') { const e = this.escort, z = ob.exit ? this.exit : { x: cc(ob.at[0]), y: cc(ob.at[1]), r: (ob.r || 2) * CELL }; done = !!e && e.alive && Math.hypot(e.x - z.x, e.y - z.y) < z.r + 8 && Math.hypot(h.x - z.x, h.y - z.y) < z.r + 16; }
      if (done) this.completeObj(ob);
    }
    if (!this.over && this.objectives.length && this.objectives.filter(o => !o.optional).every(o => o.state === 'done')) this.complete();
  }
  /* ---- bosses ---- */
  startBoss(id) {
    const b = this.bosses.find(q => q.bossId === id); if (!b || b.active || !b.alive) return;
    const spec = this.level.boss; this.snapshot('boss');
    for (const c of spec.close || []) this.doAction(['close', ...c]);
    this.bossBar = b; B.music.play('boss'); A.tempo(spec.bpm || 140);
    this.cine = { t: 0, d: this.auto ? .1 : 2.2, done: () => b.start() }; this.bossCard = { name: b.name, t: 0 };
    if (spec.intro) this.say(spec.intro[0], spec.intro[1]);
    B.emit('boss', { b, phase: 'start' });
  }
  bossDefeated(b) {
    const G = B.game, spec = this.level.boss; b.alive = false; G.timeScale = .3; this.slowmoT = 1.2; G.flash('#ffffff', .2); B.sfx('boom');
    for (const s of this.spirits) s.alive = false; for (const c of this.clones) { if (c.alive) P.smoke(c.x, c.y, c.z + 14, 8); c.alive = false; } this.flames.length = 0;
    if (spec.defeat) this.say(spec.defeat[0], spec.defeat[1]);
    for (const c of spec.close || []) this.doAction(['open', c[0], c[1], c[2], c[3], c[5] || '.']);
    this.bossBar = null; B.music.play(this.level.music || 'm1'); this.snapshot('afterBoss'); B.emit('boss', { b, phase: 'defeated' });
  }
  /* ---- checkpoints ---- */
  snapshot(why) {
    const h = this.hero; if (why !== 'start') this.toast('Checkpoint', '');
    this.checkpointData = { why, hero: { x: h.x, y: h.y, z: h.z, facing: h.facing }, bento: JSON.parse(JSON.stringify(this.bento)), flags: Object.assign({}, this.flags),
      guards: this.guards.map(g => ({ id: g.id, alive: g.alive, x: g.x, y: g.y, z: g.z, found: g.found, sunk: g.sunk, defeated: g.defeated, spec: g.spec, disguised: g.disguised })),
      objectives: this.objectives.map(o => o.state), pickups: this.pickups.map(p => p.taken), interacts: this.interacts.map(i => [i.done, i.active]), rows: this.world.rows.slice(),
      timer: this.timer ? { left: this.timer.left, stopped: this.timer.stopped } : null, heightened: this.heightened, bellRung: this.bellRung, waves: this.waves,
      bosses: this.bosses.map(b => ({ alive: b.alive, active: b.active })), escort: this.escort ? { x: this.escort.x, y: this.escort.y, freed: this.escort.freed, alive: this.escort.alive } : null, stats: Object.assign({}, this.stats, { cutKinds: Object.assign({}, this.stats.cutKinds) }), t: this.t };
    if (why !== 'start') B.emit('checkpoint', { why });
  }
  restore(cp) {
    const h = this.hero, c = cp || this.checkpointData; if (!c) return;
    Object.assign(h, { x: c.hero.x, y: c.hero.y, z: c.hero.z, facing: c.hero.facing, vx: 0, vy: 0, vz: 0, action: null, hp: h.hpMax, dead: false, drag: null, hug: null, crouch: false, eatT: 0, breath: B.T('breath'), stunT: 0, onGround: true });
    h.combo = new E.Combo(h.C.combo.map(m => new E.Attack(m, { reach: 9 })), { window: .3 });
    this.bento = JSON.parse(JSON.stringify(c.bento)); this.flags = Object.assign({}, c.flags);
    for (let y = 0; y < this.world.h; y++) if (this.world.rows[y] !== c.rows[y]) for (let x = 0; x < this.world.w; x++) if (this.world.rows[y][x] !== c.rows[y][x]) this.world.set(x, y, c.rows[y][x]);
    const keep = []; for (const s of c.guards) {
      const g = new Guard(Object.assign({}, s.spec, { disguised: s.disguised }), this); g.id = s.id;
      if (!s.alive) { Object.assign(g, { alive: false, x: s.x, y: s.y, z: s.z, found: s.found, sunk: s.sunk, defeated: s.defeated, dieT: 9 }); }
      keep.push(g);
    }
    this.guards = keep; this.objectives.forEach((o, i) => { o.state = c.objectives[i]; }); this.pickups.forEach((p, i) => { p.taken = c.pickups[i]; }); this.interacts.forEach((it, i) => { it.done = c.interacts[i][0]; it.active = c.interacts[i][1]; it.prog = 0; });
    if (this.timer && c.timer) Object.assign(this.timer, c.timer);
    this.heightened = c.heightened; this.bellRung = c.bellRung; this.bellRunner = null; this.waves = c.waves; this.waveAt = 0; this.over = false; this.result = null;
    this.bosses = this.bosses.map((b, i) => { const nb = new Boss(b.bossId, this.level.boss, this); nb.alive = c.bosses[i].alive; if (!nb.alive) { nb.deadT = 9; nb.active = false; } return nb; });
    if (this.bossBar) { this.bossBar = null; B.music.play(this.level.music || 'm1'); }
    if (this.escort && c.escort) Object.assign(this.escort, { x: c.escort.x, y: c.escort.y, freed: c.escort.freed, alive: true, hp: this.escort.hpMax, waiting: false });
    for (const t of this.triggers) if ((t.do || []).some(a => a[0] === 'boss' && this.bosses.some(b => b.bossId === a[1] && b.alive))) { t.fired = false; t._in = false; }
    this.lobs = []; this.clouds = []; this.traps = []; this.baits = []; this.flames = []; this.fireballs = []; this.spirits = []; this.clones = []; this.shots.clear();
    B.game.timeScale = 1; this.slowmoT = 0; this.splash = null; this.cine = null; this.talk.close();
  }
  retry() { this.stats.retries++; const r = this.stats.retries; this.restore(); this.stats.retries = r; B.emit('retry', {}); }
  /* ---- the end ---- */
  heroDeath(kind) {
    const h = this.hero; if (h.dead || this.over) return; h.dead = true; B.emit('heroDeath', { kind });
    if (this.mode === 'attract') { h.dead = false; h.hp = h.hpMax; return; }
    B.game.timeScale = .4; this.slowmoT = 1.2; B.game.audio.sting(B.STINGS.gameOver); A.music(null);
    this.over = true; this.result = 'dead';
  }
  fail(reason) { if (this.over) return; this.over = true; this.result = 'fail'; this.failReason = reason; B.game.audio.sting(B.STINGS.gameOver); A.music(null); B.emit('missionFail', { reason }); }
  complete() { if (this.over) return; this.over = true; this.result = 'win'; B.game.timeScale = 1; B.emit('missionEnd', { M: this }); }
  /* ---- the score ---- */
  score() {
    const s = this.stats, par = (this.level.par || 600) * B.T('parTimeMul');
    const rows = [['Complete', this.result === 'win' ? 1000 : 0], ['Silent Cuts', 150 * s.silentCuts], ['Other kills', 25 * Math.max(0, s.kills - s.silentCuts - s.cleanKills)], ['Clean kills', 100 * s.cleanKills],
      ['Optional tasks', 300 * s.optionalDone], ['Detections', -150 * s.detections], ['Unseen', s.detections === 0 ? 400 : 0], ['Civilians harmed', -400 * s.civiliansHarmed], ['Retries', -200 * s.retries],
      ['Untouched', this.hero && !this.hero.damaged ? 200 : 0], ['Time bonus', Math.round(Math.min(500, Math.max(0, par - this.t)))]];
    let total = rows.reduce((a, r) => a + r[1], 0);
    if (this.forceRank) { const rk = B.RANKS.find(q => q[0] === this.forceRank); total = Math.max(rk[1] + 50, 0); }
    return { rows, total, rank: B.rankOf(total) };
  }
}
B.Mission = Mission;

/* ---- saves, unlocks, the trial board ---- */
B.save = { data: null };
B.freshSave = () => ({ v: 1, character: 'sojiro', nextMission: 'training', completed: {}, best: {}, tools: B.TOOL_ORDER.filter(t => !get('tool', t).unlock), lastLoadout: null, flags: {}, playSeconds: 0 });
game.saves.write = () => ({ data: B.save.data, place: (get('mission', B.save.data.nextMission) || { title: 'The end' }).title, level: Object.keys(B.save.data.completed).length + 1 });
game.saves.read = s => { B.save.data = Object.assign(B.freshSave(), s.data || s); };
B.autosave = () => { if (B.HUB || !B.save.data) return; try { game.saves.save('auto'); } catch (e) { game.fail('autosave', e); } };
B.loadLatest = () => { try { const s = game.saves.latest(); if (s) { game.saves.load(s.slot === undefined ? 'auto' : s.slot); return true; } } catch (e) { game.fail('load', e); } return false; };
B.hasSave = () => { try { return !B.HUB && !!game.saves.latest(); } catch (e) { return false; } };
B.toolUnlocked = id => { const T = get('tool', id); if (!T.unlock) return true; const S = B.save.data; return !!S && S.tools.includes(id); };
/* after a mission: best records, the tools a rank unlocks */
B.applyResults = (M, sc) => {
  const S = B.save.data || (B.save.data = B.freshSave()), id = M.missionId, ch = M.charId, out = { newTools: [] };
  S.best[id] = S.best[id] || {}; const old = S.best[id][ch]; if (!old || sc.total > old.score) S.best[id][ch] = { score: sc.total, rank: sc.rank };
  S.completed[id] = true; S.playSeconds += M.t;
  for (const t of B.TOOL_ORDER) { const T = get('tool', t), u = T.unlock; if (!u || S.tools.includes(t)) continue; if ((u.any || u.mission === id) && B.rankIndex(sc.rank) <= B.rankIndex(u.rank)) { S.tools.push(t); out.newTools.push(t); } }
  const ms = get('mission', id); if (ms && ms.next && M.mode === 'story') S.nextMission = ms.next;
  return out;
};
B.trialBoard = () => E.store.get('bentou:trial', { top: [], ghost: null });
