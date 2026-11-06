// The game: modes, sim-time scripts, the programme's flow.
import * as THREE from 'three/webgpu';
import { Input } from '../input/input.js';
import { UI, el, txt } from '../ui/ui.js';
import { Speech } from '../ui/speech.js';
import { Scripts } from '../core/script.js';
import { Loop, FIXED } from '../core/loop.js';
import { T } from '../core/tuning.js';
import { loadSave, writeSave } from '../core/save.js';
import { cosmetic, pick, freshSeed, setSeed, seeded, rng } from '../core/rng.js';
import { makeScene, R, setWipe, draw } from '../render/renderer.js';
import { setPalette, tickPalette, paletteName } from '../render/palette.js';
import { makeSky } from '../render/sky.js';
import { makeSea, seaU } from '../render/sea.js';
import { CameraRig } from '../render/cameraRig.js';
import { Particles } from '../render/particles.js';
import { ComicText } from '../render/comicText.js';
import { AudioEngine } from '../audio/engine.js';
import { Island, LANDMARKS } from '../art/island.js';
import { D, QUESTIONS } from '../data/dialogue.js';
import { DAYS, ALL_TESTS, MARBLE_COLOUR, MAINTENANCE } from '../data/programme.js';
import { EVENTS, LANDMARK } from '../data/events.js';
import { UNLOCKS } from '../data/unlocks.js';
import { wobbleAge, medalFor, marblesFor, tierOpen, highestTier, liveDays, totalSteps, restTilt, bestTests, newProfile } from './programme.js';
import { Hub } from './hub.js';
import { JarMode } from './jar.js';
import { CheckIn } from './checkin.js';
import { setGlyphStyle } from '../input/glyphs.js';
import * as Screens from '../ui/screens/menus.js';
import * as Play from '../ui/screens/play.js';
import { attractScript } from './attract.js';
export class Game {
  constructor(params) {
    this.params = params; this.manual = params.manual; this.save = loadSave();
    const d = { music: 10, sfx: 80, voice: 80, glyph: 'ps', rumble: true, autoBreathe: false, rhythmOffset: 0, uiScale: 1, ink: 1, reduceShake: false, difficulty: 'standard' };
    this.settings = Object.assign(d, this.save.settings); this.save.settings = this.settings;
    const { scene, camera } = makeScene(); this.scene = scene; this.camera = camera;
    this.input = new Input(); this.audio = new AudioEngine(); this.audio.settings = { music: this.settings.music, sfx: this.settings.sfx, voice: this.settings.voice }; this.audio.applyVolumes();
    this.ui = new UI(this.input, (k) => this.audio.sfx(k)); this.speech = new Speech(this.ui, this.input, this.audio); this.scripts = new Scripts();
    this.rig = new CameraRig(camera); this.rig.reduceShake = this.settings.reduceShake;
    this.loop = new Loop(this); this.mode = null; this.simPaused = false; this.hitstopT = 0; this.idle = 0; this.attractOn = false; this.errors = []; this.testBotSkill = null; this.barkPool = new Map(); this.fps = 0; this.stepMs = 0; this.lastBarkAt = 0;
    this.rngFlow = seeded('flow', freshSeed() & 0xffff); this.CheckInCls = CheckIn; this.god = false; this.sessionInfo = null; this.freeCam = false; this.statT = 0;
    this.input.onDevice = () => { this.ui.refreshGlyphs(); };
    this.input.onGesture = () => { this.audio.resume(); };
    this.applySettings();
  }
  buildWorld() {
    this.sky = makeSky(this.scene); this.sea = makeSea(this.scene); this.particles = new Particles(this.scene); this.comicText = new ComicText(this.scene); this.island = new Island(this.scene);
    setPalette('dawn', true); this.island.setRest(9);
  }
  applySettings() {
    const s = this.settings; this.audio.settings.music = s.music; this.audio.settings.sfx = s.sfx; this.audio.settings.voice = s.voice; this.audio.applyVolumes(); setGlyphStyle(s.glyph); this.ui.setScale(s.uiScale); R.inkStrength = s.ink; this.rig.reduceShake = s.reduceShake; this.ui.refreshGlyphs();
  }
  persist() { writeSave(); }
  openPlan() { Screens.openPlan(this); }
  get profile() { const i = this.save.current; return i >= 0 ? this.save.profiles[i] : null; }
  // ------- the main tick --------
  fixed(dt) {
    try {
      // A hit-stop holds everything, input included: a press made during one still counts after it.
      if (this.hitstopT > 0) { this.hitstopT -= dt; return; }
      this.input.poll(dt);
      if (this.testBotSkill && this.mode && this.mode.event) this.writeBotPad(dt);
      if (this.session) this.session.fixed(dt);
      this.checkPause();
      this.watchAudioUnlock(dt);
      if (!this.simPaused) {
        this.scripts.tick(dt);
        { const t0 = performance.now(); if (this.mode && this.mode.fixed) this.mode.fixed(dt); this.stepMs += (performance.now() - t0 - this.stepMs) * .05; }
        this.speech.tick(dt, this.ui.top() && this.ui.focus.cur);
        this.checkAttract(dt);
        if (this.audio.settings) this.audio.tiltDeg = this.detuneOverride ?? this.currentTilt();
      }
      this.ui.tick(dt);
      this.input.anyInput = false;
    } catch (e) { this.fatal(e); }
  }
  fatal(e) {
    const m = String(e && e.stack || e); this.errors.push(m); console.error(m);
    if (/unreachable|RuntimeError/.test(m)) { if (globalThis.AIHub?.active) globalThis.AIHub.fail(m.slice(0, 200)); else { this.loop.running = false; this.persist(); if (!this.params.test) location.reload(); } }
  }
  frame(real) {
    try {
      this.fps += (1 / Math.max(.001, real) - this.fps) * .05;
      if (!this.simPaused) { tickPalette(real); if (this.mode && this.mode.frame) this.mode.frame(real); }
      if (!this.simPaused || this.freeCam) this.rig.tick(real);
      this.sky.tick(real, this.camera); this.particles.tick(this.simPaused ? 0 : real); this.comicText.tick(this.simPaused ? 0 : real);
      this.updateSea(); this.sunFollow();
      if (this.devFrame) this.devFrame(real);
      if (this.titleBeam) this.titleBeam(real);
    } catch (e) { this.fatal(e); }
  }
  draw() { try { draw(); } catch (e) { this.fatal(e); } }
  updateSea() { const g = this.island.group; seaU.cx.value = g.position.x; seaU.cz.value = g.position.z; seaU.foam.value = g.visible && this.island.stage !== 'hidden' ? 1 : 0; seaU.tiltX.value = this.island.tx; seaU.tiltZ.value = this.island.tz; }
  sunFollow() { if (R.sun) { const l = this.rig.look; R.sun.target.position.set(l.x, 0, l.z); R.sun.position.set(l.x + 24, 42, l.z + 18); } }
  writeBotPad(dt) {
    const ev = this.mode.event, pads = window.__pads; if (!pads || !pads[0]) return; const p = pads[0]; const b = ev.botPad(0, this.testBotSkill, dt) || {};
    if (ev.phase !== 'play') { p.axes[0] = 0; p.axes[1] = 0; p.buttons[6] = { pressed: false, value: 0 }; p.buttons[7] = { pressed: false, value: 0 }; p.buttons[0] = { pressed: false, value: 0 }; p.buttons[2] = { pressed: false, value: 0 }; p.buttons[5] = { pressed: false, value: 0 }; return; }
    p.axes[0] = b.x || 0; p.axes[1] = b.z || 0;
    const set = (n, v) => { p.buttons[n] = { pressed: v > .5, value: v }; };
    set(6, b.lf || 0); set(7, b.rf || 0); set(0, (b.hop || b.hopHeld) ? 1 : 0); set(2, b.flail ? 1 : 0); set(5, b.breath ? 1 : 0);
  }
  watchAudioUnlock(dt) {
    if (this.audio.ctx && this.audio.ctx.state === 'suspended' && this.input.padSeen && !this.audioTagShown && !this.session) {
      this.audioWait = (this.audioWait || 0) + dt; if (this.audioWait > 3) { this.audioTagShown = true; const t = txt('div', 'audioTag', 'Press a key or click for sound'); document.body.appendChild(t); this.audioTag = t; }
    } else if (this.audioTag && this.audio.running) { this.audioTag.remove(); this.audioTag = null; }
  }
  checkPause() {
    const m = this.input.merged; if (this.session) { if (m.pause) this.session.toggleVolumes(); return; }
    if (this.simPaused || this.ui.top() || this.attractOn) { return; }
    const canPause = this.mode && (this.mode.event || this.mode.screen === 'island' || this.mode.screen === 'jar');
    if (m.pause && canPause) Screens.openPause(this);
    if (this.mode?.event && this.input.disconnected != null) { const lane = this.mode.event.lanes.find(l => l.ctrl === this.input.pads[this.input.disconnected] || (l.kind === 'local' && !l.ctrl && this.input.lastDevice === 'pad' && this.input.lastPad === this.input.disconnected)); this.input.disconnected = null; if (lane) Screens.openPause(this, 'A controller was disconnected. Please reconnect it.'); }
    this.input.disconnected = null;
  }
  checkAttract(dt) {
    const onIdleScreen = ['title', 'menu', 'touch'].includes(this.ui.topId()) && this.mode === this.titleMode;
    if (!onIdleScreen || this.session) { this.idle = 0; return; }
    if (this.input.anyInput) this.idle = 0; else this.idle += dt;
    if (this.idle >= 10) { this.idle = 0; this.startAttract(); }
  }
  startAttract() { this.attractOn = true; this.attractScript = this.scripts.run(attractScript(this), 'attract'); }
  stopAttract() { this.attractOn = false; this.input.swallow(); this.testBotSkill = null; this.scripts.killTag('attract'); this.speech.clear(); this.clearMode(); this.ui.closeAll(); this.goTitle(true); }
  // ------- helpers used by events --------
  after(sec, fn) { this.scripts.later(sec, fn); }
  comic(word, x, y, z, color, scale, life) { const off = this.mode?.event?.group?.parent; if (off && off !== this.scene) { const v = new THREE.Vector3(x, y, z).applyMatrix4(off.matrixWorld); this.comicText.pop(word, v.x, v.y, v.z, color, scale, life); } else this.comicText.pop(word, x, y, z, color, scale, life); }
  comicIsland(word, x, y, z) { const v = new THREE.Vector3(x, y, z).applyMatrix4(this.island.group.matrixWorld); this.comicText.pop(word, v.x, v.y, v.z); }
  hitstop(s) { this.hitstopT = Math.max(this.hitstopT, s); }
  rumble(lane, strength = .5, dur = .15) {
    if (!this.settings.rumble) return; const dev = lane?.ctrl ? lane.ctrl : null; if (lane && lane.kind !== 'local') return;
    const idx = dev && dev.device === 'pad' ? dev.index : this.input.lastDevice === 'pad' ? this.input.lastPad : null; if (idx == null) return;
    let pads = []; try { pads = navigator.getGamepads(); } catch { return; } const p = pads[idx];
    p?.vibrationActuator?.playEffect?.('dual-rumble', { duration: dur * 1000, strongMagnitude: strength, weakMagnitude: strength * .7 })?.catch?.(() => {});
  }
  addFall() { const p = this.profile; if (p) { p.falls++; } }
  line(who, key, vars) {
    const pool = D[who]?.[key] || D.trudy[key]; if (!pool) return null; const k = `${who}.${key}`; let used = this.barkPool.get(k); if (!used || used.length >= pool.length) { used = []; this.barkPool.set(k, used); }
    const free = pool.map((_, i) => i).filter(i => !used.includes(i)); const i = free[Math.floor(cosmetic() * free.length)]; used.push(i); let t = pool[i]; if (vars) for (const a in vars) t = t.replaceAll(`{${a}}`, vars[a]); return t;
  }
  bark(who, key, vars) { const t = this.line(who, key, vars); if (t) this.speech.bark(who, t); return t; }
  barkNow(who, key, vars) { if (this.mode?.event?.phase === 'done') return null; return this.bark(who, key, vars); }
  /** Blocking line in a script: yield* game.say(...) */
  *say(who, key, vars) { const t = D[who]?.[key] || D.trudy[key] ? this.line(who, key, vars) : key; const r = this.speech.say(who, t); yield () => r.done; }
  *sayText(who, text) { const r = this.speech.say(who, text); yield () => r.done; }
  *wipe(fn) {
    let t = 0; const dur = .35;
    while (t < dur) { t += FIXED; setWipe(t / dur); yield; }
    setWipe(1); if (fn) fn(); yield .05;
    t = 0; while (t < dur) { t += FIXED; setWipe(1 - t / dur); yield; } setWipe(0);
  }
  currentTilt() { const p = this.profile; if (this.mode === this.titleMode || !p) { const q = this.save.profiles.find(Boolean); return this.island.restDeg; } return this.island.restDeg; }
  currentRestTilt() { return this.island.restDeg; }
  setDetuneDeg(d) { this.detuneOverride = d; }
  setMode(m) { if (this.mode && this.mode !== m && this.mode.dispose) this.mode.dispose(); this.mode = m; }
  clearMode() { if (this.mode && this.mode.dispose) this.mode.dispose(); this.mode = null; this.titleMode = null; this.ui.hud.innerHTML = ''; this.comicText.clear(); this.particles.clear(); }
  stepsTotal() { return totalSteps(EVENTS); }
  syncTilt() { const p = this.profile; const deg = p ? restTilt(p.steps, this.stepsTotal()) : 9; const off = T.restTiltAdd; this.island.setRest(Math.max(0, deg + off)); this.detuneOverride = null; return deg; }
  // ------- title and menus --------
  goTitle(skipFade) { this.clearMode(); this.ui.closeAll(); this.speech.clear(); setWipe(0); this.classKind = null; this.titleMode = { screen: 'title', frame: (dt) => { const a = (this.tAngle = (this.tAngle || 0) + dt * .05); this.island.tick(dt); this.rig.set(Math.sin(a) * 58 + 8, 19, Math.cos(a * .5) * 12 + 54, 0, 8, 0); } }; this.mode = this.titleMode; this.island.setStage('hub'); this.rig.damp = 2; this.rig.set(10, 19, 58, 0, 8, 0, true); const p = this.save.profiles.find(Boolean); this.island.setRest(p ? restTilt(p.steps, this.stepsTotal()) : 9); this.island.setMarbles(p ? p.marbleList : []); { const v = this.island.restVec(); this.island.tx = v[0]; this.island.tz = v[1]; this.island.tick(0); } setPalette('dawn', !!skipFade); this.audio.playTrack('levelBest'); Screens.openTitle(this); this.idle = 0; }
  // ------- programme ---------
  enterProgramme() {
    this.ui.closeAll(); const p = this.profile; p.lastSeenPrev = p.lastSeen; p.lastSeen = Date.now(); this.persist();
    this.scripts.run(this.programmeEntry(), 'flow');
  }
  *programmeEntry() { yield* this.wipe(() => this.startHub()); yield* this.dayFlow(); }
  startHub(at) {
    const p = this.profile; this.clearMode(); this.syncTilt(); setPalette(this.dayPalette()); this.island.setMarbles(p.marbleList);
    const hub = new Hub(this, p); this.hub = hub; this.mode = hub; this.audio.playTrack('island'); this.refreshHubSpots();
    if (at) hub.teleport(at.x, at.z);
    else if (p.tutorial) hub.teleport(0, 10);
    return hub;
  }
  dayDef() { const p = this.profile; const days = liveDays(EVENTS); return days[p.day - 1] || null; }
  planFor() {
    const p = this.profile, def = this.dayDef();
    if (def) return def.classes;
    if (!p.plan || p.planDay !== p.day) { const pool = Object.keys(EVENTS).filter(e => e !== 'grandHold' && e !== 'islandLoop'); const r = seeded('plan', p.day); const out = []; while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]); p.plan = out; p.planDay = p.day; }
    return p.plan;
  }
  tierFor(id) { const p = this.profile, def = this.dayDef(); if (def) return 0; const best = p.medals[id]; return Math.min(highestTier(best?.tiers, EVENTS[id].tiers.length), EVENTS[id].tiers.length - 1); }
  remaining() { const p = this.profile; return this.planFor().filter(c => !p.doneToday.includes(c)); }
  dayPalette() { const p = this.profile, n = p.doneToday.length, seq = ['dawn', 'noon', 'golden', 'dusk']; const tot = Math.max(1, this.planFor().length); return p.checkinDone ? seq[Math.min(3, Math.round((n / tot) * 3))] : 'dawn'; }
  questionFor(p) { return QUESTIONS[(p.questionN++) % QUESTIONS.length]; }
  *dayFlow() {
    const p = this.profile, hub = this.hub;
    if (!p.tutorial) yield* this.arrival(hub);
    if (!p.checkinDone) {
      hub.locked = true;
      if (p.day > 1) { const gapDays = p.lastSeenPrev ? (Date.now() - p.lastSeenPrev) / 864e5 : 0; if (gapDays >= 2) yield* this.say('trudy', 'absent'); else if (!p.levelled) yield* this.say('trudy', 'morning'); else yield* this.say('trudy', 'maintenance'); }
      yield* this.ask(this.questionFor(p));
      yield* this.say('trudy', 'checkinIntro');
      yield* this.runCheckIn();
    }
    if (p.opensToast !== p.day) { p.opensToast = p.day; const def = this.dayDef(); if (def?.opens === 'mirror') yield* this.say('trudy', 'mirror'); if (def?.opens === 'group') yield* this.say('trudy', 'group'); }
    this.hubResume();
  }
  hubResume() {
    const hub = this.hub; if (!hub) return; hub.locked = false; this.refreshHubSpots(); const p = this.profile;
    if (!p.bedReady && !this.remaining().length) { p.bedReady = true; this.persist(); this.scripts.run(this.say('trudy', 'allDone'), 'flow'); }
    else if (!p.planShown) { p.planShown = true; this.persist(); this.scripts.run(function* (g) { yield* g.say('trudy', p.day === 1 ? 'tutorialClass' : 'planIntro'); if (!g.ui.top()) Screens.openPlan(g); }(this), 'flow'); }
  }
  *arrival(hub) {
    hub.locked = true; hub.teleport(0, 10); hub.dropIn(); yield () => hub.dropped; yield .6; hub.trudy.hop(); hub.camDist = 9;
    yield* this.sayText('trudy', D.trudy.arrival[0]); yield* this.sayText('trudy', D.trudy.arrival[1]);
    hub.leanMode = true; hub.locked = true;
    const teach = function* (g, key, doneKey, test) { yield* g.say('trudy', key); let hold = 0; g.ui.hud.querySelector('.bottomprompts')?.remove(); const bar = g.ui.bottom([['lean', 'Lean']]); g.ui.hud.appendChild(bar); g.ui.refreshGlyphs(bar); let waited = 0; while (hold < .7 && waited < 25) { const I = g.input.merged; if (test(I)) hold += FIXED; waited += FIXED; yield; } bar.remove(); g.audio.sfx('creak', { dur: 1 }); yield* g.say('trudy', doneKey); };
    yield* teach(this, 'teachLeft', 'teachLeftDone', (I) => I.x < -.45);
    yield* teach(this, 'teachRight', 'teachRightDone', (I) => I.x > .45);
    yield* teach(this, 'teachForward', 'teachForwardDone', (I) => I.z < -.45);
    hub.leanMode = false; const p = this.profile; p.tutorial = true; this.persist();
    yield* this.say('trudy', 'teachCheckIn');
  }
  *ask(q) { let answer = null; Screens.openQuestion(this, q, (a) => { answer = a; }); yield () => answer !== null; this.ui.close(); yield* this.sayText('trudy', answer === 'a' ? q.yes : q.no); }
  testsToday() { const p = this.profile, def = this.dayDef(); if (def && Array.isArray(def.tests)) return def.tests; if (def && def.tests === 'best') { const list = ALL_TESTS.map(id => ({ id, score: p.testBest[id] ?? 0 })); return bestTests(list); } const r = seeded('tests', p.day); const pool = [...ALL_TESTS], out = []; while (out.length < 3) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]); return out; }
  *runCheckIn() {
    const p = this.profile; const tests = this.testsToday(); let result = null;
    yield* this.wipe(() => { this.startEventMode(CheckIn, { tier: 0, tests }, [{ kind: 'local', name: p.name, colour: p.paint, hat: p.hat, skin: p.skin }]); });
    const ev = this.mode.event; yield () => ev.phase === 'done'; yield 1;
    const res = ev.results; for (const r of res) p.testBest[r.id] = Math.max(p.testBest[r.id] ?? 0, r.score);
    const mean = res.reduce((a, r) => a + r.score, 0) / res.length; const dayIdx = p.day - 1; const age = wobbleAge(mean, dayIdx); const prev = p.ages.length ? p.ages[p.ages.length - 1] : null;
    this.prevTilt = restTilt(p.steps, this.stepsTotal()); p.ages.push(age); p.checkinDone = true; p.steps += p.day <= DAYS.length ? 1 : 0; this.persist();
    yield* Play.ageReveal(this, age, prev);
    yield* this.wipe(() => { this.startHub(); this.hub.locked = true; });
    yield* this.pourMarbles([MARBLE_COLOUR.checkin]);
    yield* this.wipe(() => { this.startHub(); this.hub.locked = true; });
    this.notchFx();
    yield .6;
  }
  *testReveal(a, b) { yield* Play.ageReveal(this, a, b); }
  notchFx() { this.audio.sfx('creak', { dur: 2 }); this.audio.sting('notch'); this.bark('trudy', 'notch'); this.rig.shake(.06); if (this.hub && this.prevTilt != null) this.hub.startFromTilt(this.prevTilt); this.prevTilt = null; }
  *pourMarbles(colours) {
    const p = this.profile, was = p.marbleList.slice(), before = p.marbles;
    this.clearMode(); const jar = new JarMode(this, was, colours); this.mode = jar; this.bark('trudy', 'jar');
    yield () => jar.done;
    p.marbleList.push(...colours); p.marbles += colours.length; this.checkUnlocks(before, p.marbles); this.persist();
    yield .3;
  }
  checkUnlocks(a, b) { for (const u of UNLOCKS) if (a < u.at && b >= u.at) { const p = this.profile; p.unlocked.push(u.id); this.audio.sting('unlock'); this.ui.toast(`Unlocked: ${u.name}`, 4); } }
  startEventMode(Cls, opts, specs) {
    this.clearMode(); const ev = new Cls(this, { laneCount: specs.length, ...opts, god: opts.god || this.god });
    if (Cls.palette) setPalette(Cls.palette); else setPalette(this.profile && this.profile.checkinDone ? this.dayPalette() : (opts.palette || 'noon'));
    if (Cls.id !== 'islandLoop' && Cls.id !== 'grandHold') { this.island.setStage('backdrop'); }
    ev.build(specs);
    if (!(Cls.id === 'stepClass')) this.audio.playTrack(Cls.music);
    const mode = { event: ev, screen: 'play', fixed: (dt) => ev.fixed(dt), frame: (dt) => { ev.frame(dt); this.island.tick(dt); }, dispose: () => ev.dispose() };
    this.mode = mode; this.hubGone(); this.input.pointerActive = false; this.input.ringX = 0; this.input.ringZ = 0; document.body.classList.toggle('hidecursor', !opts.attract); return ev;
  }
  hubGone() { this.hub = null; }
  localLaneSpec() { const p = this.profile; return p ? [{ kind: 'local', name: p.name, colour: p.paint, hat: p.hat, skin: p.skin }] : [{ kind: 'local', name: 'Guest', colour: '#E8443A' }]; }
  /** A programme or free-play class. */
  playClass(id, ctx = 'programme') { this.scripts.run(this.classFlow(id, ctx), 'flow'); }
  *classFlow(id, ctx) {
    const p = this.profile, Cls = EVENTS[id]; const tier = ctx.tier ?? (typeof ctx === 'object' ? 0 : this.tierFor(id)); const kind = typeof ctx === 'string' ? ctx : ctx.kind;
    const hubAt = LANDMARKS[LANDMARK[id]]; if (this.hub) this.hub.locked = true; this.classKind = kind;
    for (;;) {
      let go = null; Play.openIntro(this, Cls, tier, (v) => { go = v; }); yield () => go !== null; this.ui.close();
      if (go === 'back') { if (this.hub) this.hub.locked = false; else if (kind === 'free') Screens.openFreePlay(this); return; }
      if (p && !p.met.includes(id)) p.met.push(id);
      yield* this.wipe(() => { const specs = this.lanesFor(Cls); this.startEventMode(Cls, { tier }, specs); });
      const ev = this.mode.event; this.currentEventId = id; if (!this.attractOn) this.instructorHello(Cls);
      let restart = null; this.onRestart = () => { restart = true; };
      yield () => ev.phase === 'done' || restart; this.onRestart = null;
      if (restart) { this.clearMode(); continue; }
      yield 1.1;
      const levelled = id === 'grandHold' && ev.levelled;
      const res = ev.laneResult(0); document.body.classList.remove('hidecursor');
      const minutes = Math.max(.1, ev.playT / 60); const first = p ? !(p.medals[id]) : false; const medal = medalFor(res.form, T.medalScale);
      if (p) { p.minutes += minutes; const rec = p.medals[id] || (p.medals[id] = { best: 0, medal: 'attended', tiers: [] }); rec.tiers[tier] = Math.max(rec.tiers[tier] ?? 0, res.form); if (res.form >= rec.best) { rec.best = res.form; rec.medal = medal.id; } }
      if (ev.lanes[0]?.doll && !ev.lanes[0].fallen && Cls.id !== 'plank' && Cls.id !== 'springboard') ev.lanes[0].doll.rig.play(medal.id === 'attended' ? 'shrug' : medal.bonus >= 3 ? 'bow' : 'cheer', .2);
      let retry = null; Play.openResults(this, Cls, res, medal, tier, (v) => { retry = v; }, kind); yield () => retry !== null; this.ui.close();
      if (retry === 'retry') { this.clearMode(); continue; }
      // Marbles, tilt, on.
      const n = p ? marblesFor(minutes, res.form, first, T.marblesPerMin, T.medalScale) : 0;
      const colours = new Array(n).fill(MARBLE_COLOUR[medal.id]);
      const countsStep = p && kind === 'programme' && !p.doneToday.includes(id);
      if (countsStep) { this.prevTilt = restTilt(p.steps, this.stepsTotal()); p.doneToday.push(id); if (p.day <= DAYS.length) p.steps += 1; }
      this.persist();
      if (levelled) { yield* this.ending(); return; }
      if (p) { yield* this.wipe(() => { this.island.setStage('hub'); this.island.setRest(this.prevTilt ?? this.island.restDeg); setPalette(this.dayPalette()); }); yield* this.pourMarbles(colours); }
      if (kind === 'free' && !this.wasOnIsland) { yield* this.wipe(() => { this.goTitle(true); Screens.openMenu(this); Screens.openFreePlay(this); }); return; }
      yield* this.wipe(() => { this.startHub(hubAt ? { x: hubAt.x - Math.sign(hubAt.x) * (hubAt.r + 1), z: hubAt.z - Math.sign(hubAt.z) * (hubAt.r + 1) } : null); if (this.hub) this.hub.locked = true; });
      if (countsStep) { this.notchFx(); yield 1.2; }
      this.hubResume(); return;
    }
  }
  instructorHello(Cls) { if (Cls.instructor === 'trudy') { const k = { fruitHat: 'fruitIntro', roomService: 'serviceIntro', springboard: 'springIntro', raft: 'raftIntro' }[Cls.id]; if (k) this.barkNow('trudy', k); } else if (Cls.instructor === 'stillwater') this.barkNow('stillwater', 'intro'); else this.barkNow('bolster', Cls.id === 'tug' ? 'tug' : Cls.id === 'plates' ? 'plates' : Cls.id === 'islandLoop' ? 'loop' : 'intro'); }
  lanesFor(Cls) { const specs = this.localLaneSpec(); if (Cls.id === 'raft') { const names = [['Gentle Margaret', '#E77BB0', 'sharp'], ['Retired Kevin', '#2FA7A0', 'average'], ['Unsteady Paul', '#F58A2E', 'clumsy']]; for (const [name, colour, skill] of names) specs.push({ kind: 'bot', name, colour, skill }); } return specs; }
  restartEvent() { if (this.onRestart) this.onRestart(); }
  /** Pause > Leave Class. Back to the island, or the menu if you came from there. */
  leaveClass() {
    this.scripts.killTag('flow'); this.speech.clear(); setWipe(0); document.body.classList.remove('hidecursor');
    const p = this.profile; if (!p || this.classKind === 'free' || this.groupRun) { this.groupRun = false; this.goTitle(true); return; }
    this.startHub(); this.hub.locked = false; if (!p.checkinDone) this.scripts.run(this.dayFlow(), 'flow'); else this.hubResume();
  }
  refreshHubSpots() {
    const hub = this.hub; if (!hub) return; const p = this.profile; const list = []; const rem = this.remaining();
    const spot = (lm, label, useText, act, marked = false) => { const L = LANDMARKS[lm]; list.push({ x: L.x, z: L.z, r: L.r, label, useText, act, marked, id: lm }); };
    const plan = this.planFor();
    const byLm = {}; for (const c of plan) { (byLm[LANDMARK[c]] ||= []).push(c); }
    const opened = new Set(p.met); for (const c of plan) opened.add(c);
    const lmEvents = {}; for (const id of Object.keys(EVENTS)) { if (!opened.has(id)) continue; (lmEvents[LANDMARK[id]] ||= []).push(id); }
    for (const lm in lmEvents) { const evs = lmEvents[lm]; const pending = evs.find(e => rem.includes(e)); if (lm === 'gazebo') continue; const ev = pending || evs[0]; spot(lm, EVENTS[ev].title + (evs.length > 1 && !pending ? '...' : ''), 'Go to class', () => { if (pending || evs.length === 1) this.playClass(ev, pending ? 'programme' : { kind: 'hub-free', tier: this.tierFor(ev) }); else Screens.openLandmarkPick(this, evs); }, !!pending); }
    spot('jar', 'The Jar', 'Look at the marbles', () => this.scripts.run(this.lookAtJar(), 'flow'));
    spot('board', "Today's Plan", 'Read', () => Screens.openPlan(this));
    spot('bedHut', 'The Bed Hut', 'Go to bed', () => this.tryBed(), !rem.length);
    if (p.day >= 3) spot('mirror', 'The Mirror', 'Look', () => Screens.openMirror(this));
    if (p.day >= 4 || p.levelled) spot('gazebo', rem.includes('raft') ? 'Tippy Raft' : 'The Gazebo', rem.includes('raft') ? 'Go to class' : 'Group Class', () => { if (rem.includes('raft')) this.playClass('raft', 'programme'); else Screens.openGroup(this); }, rem.includes('raft'));
    list.push({ x: hub.trudy.group.position.x, z: hub.trudy.group.position.z, r: 1.2, label: 'Trudy', useText: 'Ask', id: 'trudy', act: () => { this.bark('trudy', 'ask'); Screens.openPlan(this); } });
    hub.setSpots(list);
  }
  *lookAtJar() { const hub = this.hub; if (!hub) return; hub.locked = true; const jp = this.island.jarGroup.getWorldPosition(new THREE.Vector3()); const old = hub.placeCam; hub.placeCam = () => {}; this.rig.set(jp.x + 1, jp.y + 2.2, jp.z + 6, jp.x, jp.y + 1.1, jp.z); yield* this.sayText('trudy', `There are ${this.profile.marbles} marbles in the jar. I do not count them. There are ${this.profile.marbles}.`); hub.placeCam = old; hub.locked = false; }
  tryBed() {
    if (this.remaining().length) { this.scripts.run(this.say('trudy', 'bedEarly'), 'flow'); return; }
    this.scripts.run(this.goToBed(), 'flow');
  }
  *goToBed() {
    const p = this.profile; const hub = this.hub; if (hub) { hub.locked = true; hub.doll.rig.play('sleep', .4); } yield* this.say('trudy', 'bed');
    yield* this.wipe(() => { p.day += 1; p.doneToday = []; p.checkinDone = false; p.bedReady = false; p.planShown = false; p.stamps.push(new Date().toISOString().slice(0, 10)); this.persist(); this.audio.sfx('stamp'); this.startHub({ x: LANDMARKS.bedHut.x, z: LANDMARKS.bedHut.z + 3 }); this.hub.locked = true; setPalette('dawn', true); });
    yield* Play.stampCard(this);
    yield* this.dayFlow();
  }
  *ending() {
    const p = this.profile; p.levelled = true; p.steps = this.stepsTotal(); this.persist();
    document.body.classList.remove('hidecursor');
    yield* this.wipe(() => { this.clearMode(); this.island.setStage('hub'); this.island.setRest(0); this.island.tx = 0; this.island.tz = 0; this.detuneOverride = 0; setPalette('golden', true); this.startHub({ x: 0, z: 10 }); this.hub.locked = true; this.hub.setTiltRest(0); this.hub.tiltM.tx = 0; this.hub.tiltM.tz = 0; this.hub.tiltM.vx = 0; this.hub.tiltM.vz = 0; });
    this.audio.playTrack('level');
    const hub = this.hub; yield 1.2; hub.trudy.bubble.position.x = 0; yield* this.sayText('trudy', D.trudy.grandEnd[0]); yield* this.sayText('trudy', D.trudy.grandEnd[1]); hub.trudy.rig.play('faint', .2); this.audio.sfx('clack', { f: 500 }); yield 1.4; hub.trudy.rig.play('idle', .4); hub.trudy.hop();
    yield 1.5; this.island.lightLamp(true); { const q = this.island.jarGroup.getWorldPosition(new THREE.Vector3()); this.particles.burst(q.x, q.y + 2.4, q.z, 70, ['#F5B700', '#FFF8EE', '#7FD6C8', '#C8D4DF'], 5, .14, 1.6, 6); } this.particles.confetti(0, 12, 0, 120); this.audio.sfx('cheer'); this.audio.sting('fanfare');
    yield* Play.credits(this); yield* this.sayText('trudy', D.trudy.grandAfter[0]); yield* this.sayText('trudy', D.trudy.grandAfter[1]);
    for (const id of Object.keys(EVENTS)) if (!p.met.includes(id)) p.met.push(id);
    p.bedReady = true; this.persist(); hub.locked = false; this.refreshHubSpots();
  }
}
