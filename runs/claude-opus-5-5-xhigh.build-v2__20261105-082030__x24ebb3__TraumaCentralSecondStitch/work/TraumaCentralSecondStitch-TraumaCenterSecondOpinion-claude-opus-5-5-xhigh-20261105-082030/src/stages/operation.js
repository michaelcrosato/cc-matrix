// The operation: the game. A plain state object (a local sim or the network's copy) drives the tissue
// canvas, hands, strains, HUD, sound and rumble. One stage for story, replay, Consult, attract and hub.
import { glowMaterial, setLookLayer, THREE } from '../../pixel-engine.js';
import { App } from '../app.js';
import { LINES, TOOL_NAMES } from '../content/lines.js';
import { OPS } from '../content/ops/index.js';
import { SeatControl } from '../input/cursor.js';
import { nextTask, taskOf, validTargets } from '../sim/entities.js';
import { createOp, drainEvents, retryStage, step } from '../sim/op.js';
import { OpHud } from '../ui/ophud.js';
import { BustRig } from '../view/bust.js';
import { TableView } from '../view/field.js';
import { EntViews } from '../view/entviews.js';
import { COUCH_GLOVES, HandRig, SEAT_GLOVES } from '../view/hands.js';
import { applyLook } from '../view/looks.js';
import { buildFieldFrame } from '../view/sets.js';
import { Stage } from './stage.js';

const { Group, Mesh, PlaneGeometry, Vector3 } = THREE;
const CAM_BASE = { y: 9.6, z: 3.1 };
export const OP_CAMERA = { preset: 'fixed', position: [0, CAM_BASE.y, CAM_BASE.z], target: [0, 0, 0.1], fov: 44, minZoom: 1, maxZoom: 1 };
export const TABLE_SPACING = 24;

const v3 = new Vector3();
const RATING_LOOK = { clean: ['CLEAN!', 'lime', 'cleanA'], good: ['GOOD', 'sky', 'goodA'], sloppy: ['SLOPPY', 'orange', 'sloppyA'] };
const LOOP_FOR = { drain: 'drainLoop', laser: 'laserLoop', gel: 'gelLoop', scanner: 'scanLoop', dressing: 'cutLoop', scalpel: 'cutLoop' };

export class OperationStage extends Stage {
  name = 'operation';
  cameraConfig = OP_CAMERA;

  /**
   * @param o { opId, mode: 'story'|'replay'|'consult'|'attract'|'net', difficulty, startStage, seed, capRank, seats:[{binding,...}], attract:{...}, source }
   */
  constructor(o) {
    super();
    this.o = o;
    this.opId = o.opId;
    this.mode = o.mode ?? 'story';
    this.def = OPS[o.opId];
    this.comm = { queue: [], line: null, chars: 0, acc: 0, hold: 0, wrapped: null, cooldown: 0, lastPool: {} };
    this.ended = false;
    this.endT = 0;
    this.paused = false;
    this.lookState = { sat: 1, vig: 0.3, spread: 0 };
    this.lookSent = '';
    this.controls = [];
    this.handRigs = [];
    this.loops = {};
    this.ekgT = 0;
    this.alarmT = 0;
    this.heartT = 0;
    this.rewindGlow = 0;
    this.introT = 0;
    this.fails = o.fails ?? 0;
    this.hudSeats = [];
    this.camX = 0;
    this.flicker = 0;
    this.smokeT = 0;
    this.attractT = 0;
    this.deadRumble = 0;
    this.camZoom = 1;
  }

  async build(ctx) {
    const o = this.o;
    // The state: a local sim, or whatever the network gives us.
    if (o.source) {
      this.source = o.source;
      this.state = o.source.state;
    } else {
      const seatsCfg = o.seats ?? [{ binding: 'all' }];
      const base = this.def.seatDefaults ?? {};
      const surgeon = o.seatSurgeon ?? (this.def.surgeon === 'sabine' ? 'sabine' : 'ilya');
      const seats = seatsCfg.map((s, i) => ({ id: i, surgeon, ...base, gift: s.gift ?? base.gift ?? null, bot: s.bot ?? null, name: s.name ?? null, x: i === 0 ? 0 : undefined }));
      // Consult: seats 1 and 3 have The Quiet, seats 2 and 4 The Second Look.
      if (this.mode === 'consult' || (this.mode === 'attract' && seats.length > 1)) seats.forEach((s, i) => { s.gift = i % 2 === 0 ? 'quiet' : 'look'; });
      else if (this.mode === 'attract' && o.gift) seats[0].gift = o.gift;
      this.sim = createOp(this.def, { seed: o.seed ?? 12345, seats, difficulty: o.difficulty ?? App.save.progress?.difficulty ?? 'resident', config: App.config, startStage: o.startStage ?? 0, capRank: o.capRank ?? null, cheats: o.cheats ?? App.cheats, composure: o.composure });
      this.state = this.sim;
      this.controls = seatsCfg.map((s, i) => (s.bot ? null : new SeatControl(App, i, s.binding ?? 'all')));
      this.controls.forEach((c, i) => { if (c) c.syncFromSeat(this.sim.seats[i]); });
      if (typeof window !== 'undefined' && window.__GAME__) window.__GAME__.sim = this.sim;
    }
    const st = this.state;
    const e = ctx.engine;
    // Lighting: the field recipe. Much more than this washes the tissue out.
    e.sun.intensity = 1.0;
    e.sun.color.setHex(0xffffff);
    e.setSunDirection([0.25, 1, 0.35]);
    e.ambient.intensity = 0.55;
    e.ambient.color.setHex(0xfff0e0);
    ctx.scene.background = new THREE.Color(0x0a0810);

    // Tables.
    this.tableViews = st.tables.map((t, i) => {
      const off = (i - (st.tables.length > 1 ? 1 : 0)) * TABLE_SPACING;
      return new TableView(ctx, t.arena, off, null);
    });
    const hasIce = this.def.id === 'op6';
    this.frames = this.tableViews.map((tv) => buildFieldFrame(ctx, tv.offsetX, { ice: hasIce ? [4.6, -2.6] : null, dish: undefined }));
    this.lamps = this.tableViews.map((tv) => ctx.lights.request({ position: [tv.offsetX, 5.2, 0.4], color: 0xfff4e8, intensity: 5, radius: 15, priority: 5 }));
    // Bigger windows than 16:9 get the camera pulled back so the safe zone still shows.
    this.fx = {
      dishAt: (table) => this.frames[table ?? 0].dishPos,
      tink: (ent) => {
        App.sfx('dishTink', { pitch: (this.tinks = (this.tinks ?? 0) + 1) % 5 });
        ctx.particles.burst('spark', this.frames[ent.table ?? 0].dishPos, { count: 4 });
      },
    };
    this.entViews = new EntViews(ctx, this.tableViews, this.fx);

    // Hands.
    const couch = this.mode === 'consult' || this.mode === 'net' || (this.mode === 'attract' && st.seats.length > 1);
    st.seats.forEach((s, i) => {
      const gloves = couch ? COUCH_GLOVES[i % 4] : s.surgeon === 'sabine' ? { glove: 'white', fold: 'mist' } : SEAT_GLOVES[0];
      this.handRigs[i] = new HandRig(ctx, i, { gloves });
      this.handRigs[i].setTool(s.tool);
    });
    this.seatColors = couch ? ['red', 'sky', 'lime', 'sand'] : ['lime', 'white', 'lime', 'sand'];
    this.ghost = null; // created when first needed

    // The pale strain's body (Op 10).
    this.pale = null;
    if (this.def.id === 'op10') this.buildPale(ctx);

    // Comm bust window.
    this.commRoot = new Group();
    ctx.scene.add(this.commRoot);
    this.busts = {};
    const backing = new Mesh(new PlaneGeometry(3.6, 3.2), glowMaterial(0x142036));
    backing.position.set(0, 1.4, -0.8);
    this.commRoot.add(backing);
    this.commRoot.visible = false;

    this.hud = new OpHud(App);
    for (const def of Object.values(LOOP_FOR)) {
      if (!this.loops[def]) this.loops[def] = ctx.audio.loop(def, { volume: 0 });
    }
    this.loops.droneLoop = ctx.audio.loop('droneLoop', { volume: 0 });
    this.camY = CAM_BASE.y + 7;
    this.camZ = CAM_BASE.z + 3;
    this.camX = this.tableViews[0].offsetX;
    this.viewT = 0;
    this.viewS = { t: 0, beat: 0, breath: 0, bulges: [] };
    this.setCameraNow(ctx);
    if (this.def.music) App.director.setBase(this.def.music);
    if (st.music && !o.keepMusic) App.director.play(st.music, { now: true });
    else if (!st.music && !o.keepMusic) App.director.play('silence', { now: true });
    App.director.onStage();
    this.updateLook(ctx, true);
    this.processEvents(ctx, this.takeEvents());
  }

  buildPale(ctx) {
    const g = new Group();
    const mat = glowMaterial(0xf0ead8);
    const mat2 = glowMaterial(0xffcd75);
    this.paleSegs = [];
    for (let i = 0; i < 40; i++) {
      const m = new Mesh(new THREE.SphereGeometry(0.2, 7, 5), i % 7 === 3 ? mat2 : mat);
      m.scale.y = 0.6;
      g.add(m);
      this.paleSegs.push(m);
    }
    setLookLayer(g, 'actors');
    ctx.scene.add(g);
    this.pale = g;
  }

  takeEvents() {
    if (this.source) return this.source.drain();
    return drainEvents(this.sim);
  }

  // ---------------------------------------------------------------- Fixed step
  fixedUpdate(ctx, dt) {
    if (this.source) { this.source.fixed?.(ctx, this, dt); return; }
    if (this.paused || App.overlays.length || !this.sim) return;
    App.devices.poll(ctx);
    const sp = App.devView.simSpeed;
    if (App.devView.frameStep && !App.devView.stepNow) return;
    App.devView.stepNow = false;
    this.simAcc = (this.simAcc ?? 0) + (this.mode === 'attract' ? 1 : sp);
    while (this.simAcc >= 1) {
      this.simAcc -= 1;
      const inputs = {};
      this.controls.forEach((c, i) => {
        if (!c) return;
        c.frameEdges(ctx, this.sim);
        inputs[i] = c.step(ctx, this.sim, this, dt);
      });
      if (App.devView.botPlays && this.mode !== 'attract') {
        const seat0 = this.sim.seats[0];
        if (!seat0.bot) seat0.bot = { skill: App.devView.botSkill };
        seat0.bot.skill = App.devView.botSkill;
      } else if (!App.devView.botPlays && this.mode !== 'attract' && !(this.o.seats?.[0]?.bot)) {
        if (this.sim.seats[0].bot) this.sim.seats[0].bot = null;
      }
      step(this.sim, inputs);
      if (this.sim.seats[0].bot && this.controls[0]) this.controls[0].syncFromSeat(this.sim.seats[0]);
    }
  }

  // ---------------------------------------------------------------- Per frame
  frame(ctx, dt, overlay) {
    const st = this.state = this.source ? this.source.state : this.sim;
    if (!st) return;
    this.viewT += dt;
    const evs = this.takeEvents();
    this.processEvents(ctx, evs);
    if (this.mode !== 'attract') this.frameInput(ctx, dt, overlay);
    this.updateComm(dt);
    this.updateHeartAndBreath(ctx, dt);
    this.updateView(ctx, dt);
    this.updateAudio(ctx, dt);
    this.updateLook(ctx);
    this.updateEnd(ctx, dt);
    if (this.mode === 'attract') this.o.attract?.frame?.(this, ctx, dt);
    this.o.onFrame?.(this, ctx, dt);
  }

  frameInput(ctx, dt, overlay) {
    const nav = App.devices.nav;
    const local = this.source ? [this.source.control].filter(Boolean) : this.controls;
    if (!this.source && !overlay && !this.ended && nav.start) { this.openPause(); return; }
    if (overlay) return;
    // Wheel clicks and table tabs.
    if (App.devices.click && this.ui) {
      for (const b of this.hud.wheelHitBoxes) {
        if (this.ui.hit(b.x, b.y, b.w, b.h)) {
          const c = this.source ? this.source.control : this.controls[b.seat];
          if (c && (this.source ? b.seat === c.seatId : true) && this.state.tools.includes(b.tool)) { c.lastTool = c.tool; c.tool = b.tool; App.sfx('click'); }
        }
      }
      if (this.hud.tabs) {
        for (const tb of this.hud.tabs) {
          if (this.ui.hit(tb.x, tb.y, tb.w, tb.h) && this.controls[0]) { this.controls[0].table = tb.i; this.controls[0].input.table = tb.i; }
        }
      }
    }
    for (const c of local) {
      if (!c) continue;
      if (c.reminder) { c.reminder = false; this.hud.reminderT = 3; App.sfx('uiMove'); }
    }
  }
  openPause() {
    import('../ui/overlays.js').then((m) => { if (!App.overlays.length && !this.ended) { App.overlays.push(new m.PauseOverlay(this)); App.sfx('uiBack'); } });
  }

  // ---------------------------------------------------------------- Comm
  say(who, text, front = false) {
    const line = { who, text };
    if (front) this.comm.queue.unshift(line); else this.comm.queue.push(line);
  }
  pool(group, key, vars) {
    if (this.def.noVoice || this.mode === 'attract') return;
    const c = this.comm;
    if (c.cooldown > 0 || c.line || c.queue.length) return;
    const who = this.def.commenter && Math.random() < 0.55 && LINES[this.def.commenter]?.[key] ? this.def.commenter : group;
    const list = LINES[who]?.[key];
    if (!list?.length) return;
    let i = c.lastPool[key] ?? Math.floor(Math.random() * list.length);
    c.lastPool[key] = (i + 1) % list.length;
    let text = list[i % list.length];
    if (vars) for (const k of Object.keys(vars)) text = text.replace(`{${k}}`, vars[k]);
    this.say(who, text);
    c.cooldown = 6;
  }
  updateComm(dt) {
    const c = this.comm;
    c.cooldown = Math.max(0, c.cooldown - dt);
    if (!c.line) {
      if (c.queue.length) {
        c.line = c.queue.shift();
        c.chars = 0;
        c.acc = 0;
        c.hold = 0;
        c.wrapped = null;
        c.plain = c.line.text.replace(/\*/g, '');
        c.bust = this.showBust(c.line.who);
      }
    }
    if (c.line) {
      const rate = 40 * (App.save.settings.textSpeed ?? 1);
      if (c.chars < c.plain.length) {
        c.acc += dt * rate;
        while (c.acc >= 1 && c.chars < c.plain.length) {
          c.acc -= 1;
          const i = c.chars++;
          if (App.voiceChar(c.line.who, c.plain, i)) c.bust?.syllable();
        }
      } else {
        c.hold += dt;
        const need = Math.min(3.2, 0.9 + c.plain.length * 0.028) * (c.queue.length ? 0.7 : 1);
        if (c.hold >= need) { c.line = null; c.bust = null; }
      }
    }
    for (const b of Object.values(this.busts)) if (b.object.visible) b.update(dt);
  }
  showBust(who) {
    for (const b of Object.values(this.busts)) b.object.visible = false;
    if (!this.busts[who]) {
      const b = new BustRig(this.ctx, who);
      this.commRoot.add(b.object);
      this.busts[who] = b;
    }
    const b = this.busts[who];
    b.object.visible = true;
    const low = this.state.tables[0].vitals < 30;
    b.setEmotion(who === 'reyes' ? (low ? 'angry' : 'stern') : who === 'ilya' ? (low ? 'panic' : 'neutral') : 'neutral');
    this.commRoot.visible = true;
    return b;
  }

  placeCommBust(ctx) {
    const cam = ctx.camera.camera;
    const hud = ctx.hud;
    const show = !!this.comm.line && !App.overlays.length;
    this.commRoot.visible = show;
    if (!show) return;
    // Put the head in the window the strip leaves open, in camera space.
    const d = 3;
    const halfH = Math.tan((cam.fov * Math.PI) / 360) * d;
    const halfW = halfH * cam.aspect;
    const artX = 19, artY = hud.height - 16;
    const nx = (artX / hud.width) * 2 - 1, ny = 1 - (artY / hud.height) * 2;
    this.commRoot.position.copy(cam.position);
    this.commRoot.quaternion.copy(cam.quaternion);
    this.commRoot.translateX(nx * halfW);
    this.commRoot.translateY(ny * halfH - 0.17);
    this.commRoot.translateZ(-d);
    const s = (32 / hud.height) * 2 * halfH / 2.7;
    this.commRoot.scale.setScalar(s);
  }

  // ---------------------------------------------------------------- Events
  processEvents(ctx, evs) {
    const st = this.state;
    for (const ev of evs) {
      const at = ev.x != null ? this.world(ev.x, ev.z, ev.table) : null;
      switch (ev.e) {
        case 'say': this.say(ev.who, ev.text); break;
        case 'rating': {
          const [text, color, sound] = RATING_LOOK[ev.q];
          if (!ev.small || ev.q !== 'clean') {
            const p = this.project(at);
            this.hud.popup(ev.small ? text : text, p.x, p.y, color, ev.small ? 1 : 2, ev.small ? 0.5 : 0.85);
          }
          if (ev.q === 'clean') {
            App.sfx(sound, { pitch: Math.min(12, ev.streak) });
            if (ev.streak >= 3 && ev.streak % 5 === 0) {
              const p = this.project(at);
              this.hud.popup(`x${Math.min(2, 1 + ev.streak * 0.1).toFixed(1)} STREAK`, p.x, p.y - 14, 'sand', 1, 1);
              this.pool('reyes', 'clean');
            }
            if (!ev.small) ctx.particles.burst('sparkle', at, { count: 5, colors: ['white', 'lime'] });
          } else App.sfx(sound);
          break;
        }
        case 'mistake': {
          App.sfx('mistakeA');
          App.shake(0.55);
          App.flash('red', { duration: 0.12, strength: 0.45 });
          App.rumble({ strong: 0.9, weak: 0.5, ms: 220 });
          ctx.engine.hitstop(0.07);
          const p = this.project(at);
          this.hud.popup('MISTAKE', p.x, p.y, 'red', 2, 1);
          ctx.particles.burst('blood', at, { count: 12 });
          this.pool('reyes', 'mistake');
          break;
        }
        case 'grab': App.sfx('grab'); App.rumble({ strong: 0.1, weak: 0.4, ms: 50 }); break;
        case 'pop': App.sfx('hookPop'); ctx.particles.burst('blood', at, { count: 8 }); ctx.engine.hitstop(0.03); App.rumble({ strong: 0.3, weak: 0.5, ms: 70 }); break;
        case 'dish': App.sfx('grab', { pitch: -4 }); break;
        case 'release': App.sfx('click', { pitch: -3 }); break;
        case 'drop': App.sfx('tick'); break;
        case 'stitch': App.sfx('stitch', { pitch: Math.min(14, ev.n * 1.1) }); App.rumble({ strong: 0, weak: 0.25, ms: 30 }); break;
        case 'stitchMiss': App.sfx('tick'); break;
        case 'knot': App.sfx('knot'); break;
        case 'cutStart': App.sfx('slice'); break;
        case 'cutDone': App.sfx('slice', { pitch: 4 }); break;
        case 'dressStart': App.sfx('dressing'); break;
        case 'sizzle': App.sfx('sizzle'); ctx.particles.burst('smoke2', at, { count: 6 }); ctx.particles.burst('spark', at, { count: 6 }); break;
        case 'ping': App.sfx('ping', { pitch: ev.cyst === 'false' ? -5 : 0 }); ctx.particles.burst('scanmote', at); break;
        case 'reveal': App.sfx('ping', { pitch: 3 }); break;
        case 'syringeDraw': App.sfx('syringeDraw'); break;
        case 'syringeReady': App.sfx('syringeReady'); App.rumble({ strong: 0, weak: 0.3, ms: 40 }); break;
        case 'inject': App.sfx('inject'); ctx.particles.burst('scanmote', at, { count: 8, colors: ['cyan', 'white'] }); App.rumble({ strong: 0.2, weak: 0.3, ms: 100 }); break;
        case 'doseWasted': App.sfx('sloppyA'); this.pool('reyes', 'doseWasted'); break;
        case 'noDose': App.sfx('tick'); this.pool('reyes', 'noDose'); break;
        case 'wrongTool': App.sfx('tick'); if (ev.want !== 'dressing') this.pool('reyes', 'wrongTool', { want: TOOL_NAMES[ev.want] ?? ev.want }); break;
        case 'heal': App.sfx('heal'); ctx.particles.burst('foam', at, { count: 6 }); break;
        case 'bruise': App.sfx('tick', { pitch: -6 }); break;
        case 'marker': App.sfx('uiConfirm'); break;
        case 'music': if (!this.source?.silentMusic) { App.director.setBase(ev.id); App.director.play(ev.id); } break;
        case 'stage': if (ev.retry) this.comm.queue.length = 0; break;
        case 'toolUnlocked': this.hud.setBanner(`${TOOL_NAMES[ev.tool]} UNLOCKED`, 'cyan', 1.4); App.sfx('uiConfirm'); break;
        case 'giftUnlocked': App.sfx('choir'); break;
        case 'giftDenied': App.sfx('denied'); this.pool('reyes', 'giftDenied'); break;
        case 'quietOn': App.sfx('inhale'); this.heartT = 0; break;
        case 'quietOff': App.sfx('whoosh', { pitch: -6 }); break;
        case 'rewind': App.sfx('rewind'); this.rewindGlow = 1; App.flash('white', { duration: 0.2, strength: 0.4 }); App.rumble({ strong: 0.5, weak: 0.6, ms: 260 }); this.startGhostReplay(ctx); if (this.controls[0]) this.controls[0].useWas = false; break;
        case 'tag': { const r = this.handRigs; if (r[1]) { [r[0], r[1]] = [r[1], r[0]]; } } if (this.controls[0]) { this.controls[0].syncFromSeat(st.seats[0]); this.controls[0].mouseAim = false; } App.sfx('uiConfirm'); this.hud.setBanner(ev.surgeon === 'sabine' ? 'DR. ACHTERBERG' : 'DR. MARSH', 'white', 1); break;
        case 'tableSwitch': if (ev.seat === 0) { App.sfx('whoosh'); App.rumble({ strong: 0, weak: 0.2, ms: 40 }); } break;
        case 'focusTable': if (this.controls[0]) { this.controls[0].table = ev.table; this.controls[0].input.table = ev.table; } break;
        case 'codeBlue': App.sfx(ev.fib ? 'alarm' : 'flatline'); App.shake(0.35); this.chargeSound = false; break;
        case 'clear': App.sfx('clear'); App.flash('white', { duration: 0.16, strength: 0.9 }); App.shake(0.95); ctx.engine.hitstop(0.12); App.rumble({ strong: 1, weak: 1, ms: 300 }); this.hud.setBanner('CLEAR!', 'white', 0.8); this.chargeSound = false; break;
        case 'badShock': App.sfx('badShock'); App.shake(0.3); this.chargeSound = false; break;
        case 'revived': App.sfx('cleanA', { pitch: 7 }); break;
        case 'massageStart': this.hud.setBanner('HIS HEART STOPPED', 'red', 1.4); break;
        case 'massageBeat': App.sfx('ekg'); break;
        case 'massagePress': App.sfx('massage', { pitch: ev.n }); App.rumble({ strong: 0.7, weak: 0.2, ms: 80 }); App.shake(0.12); this.pressT = 0.15; this.hud.popup(ev.q === 'clean' ? 'CLEAN!' : 'GOOD', ui2(this).w / 2, ui2(this).h * 0.5, ev.q === 'clean' ? 'lime' : 'sky', 1, 0.4); break;
        case 'massageMiss': App.sfx('sloppyA'); break;
        case 'massageWrong': App.sfx('tick'); break;
        case 'massageDone': App.sfx('uiConfirm'); break;
        case 'knock': App.sfx('knock'); App.shake(0.25); App.rumble({ strong: 0.5, weak: 0, ms: 90 }); this.pool('reyes', 'knock'); ctx.particles.burst('blood', at, { count: 6 }); break;
        case 'coreOut': App.sfx('wrath', { pitch: 10 }); ctx.particles.burst('blood', at, { count: 12 }); break;
        case 'coreSinks': App.sfx('wrath', { pitch: -6 }); break;
        case 'coreSnap': case 'snapBack': App.sfx('mistakeA', { pitch: 6 }); App.shake(0.3); break;
        case 'missedKnock': App.sfx('sloppyA'); ctx.particles.burst('blood', at, { count: 10 }); break;
        case 'strainHit': this.entViews.flash(ev.x, ev.z); App.sfx('strainHit'); App.shake(0.4); ctx.engine.hitstop(0.06); App.rumble({ strong: 0.8, weak: 0.5, ms: 150 }); if (at) ctx.particles.burst('gunk', at, { count: 12 }); break;
        case 'strainDying': App.sfx('strainDie'); App.shake(0.7); App.flash('white', { duration: 0.2, strength: 0.5 }); this.hud.setBanner('', 'white', 0); if (at) ctx.particles.burst('gunk', at); break;
        case 'strainDead': if (at) ctx.particles.burst('gold', at); this.hud.setBanner('STRAIN CLEARED', 'lime', 1.6); App.sfx('uiConfirm'); break;
        case 'eyeOpen': App.sfx(ev.wrath ? 'wrath' : 'choir'); break;
        case 'weep': App.sfx('weep', { pitch: Math.random() * 3 }); break;
        case 'dropSucked': App.sfx('slurp', { pitch: 5 }); if (at) ctx.particles.burst('tear', at, { count: 2 }); break;
        case 'dropGel': App.sfx('sizzle', { pitch: 7, volume: 0.4 }); break;
        case 'dropLand': App.sfx('tick', { pitch: -3 }); if (at) ctx.particles.burst('tear', at); break;
        case 'eyeDead': if (at) ctx.particles.burst('gunk', at); break;
        case 'eyeHeals': App.sfx('choir', { pitch: 4 }); break;
        case 'weeperCrawl': App.sfx('sob'); App.shake(0.25); break;
        case 'sob': App.sfx('sob'); App.shake(0.2); this.hud.setBanner('THE SOB', 'cyan', 1); break;
        case 'sobWave': App.sfx('sobWave'); App.shake(0.8); App.flash('sky', { duration: 0.3, strength: 0.5 }); App.rumble({ strong: 1, weak: 0.8, ms: 400 }); break;
        case 'sobHeld': App.sfx('uiConfirm'); break;
        case 'stalkOut': App.sfx('wrath', { pitch: 5 }); break;
        case 'thump': App.sfx('thump', { volume: 0.7 }); this.beatKick = 1; App.rumble({ strong: 0.35, weak: 0, ms: 60 }); break;
        case 'bpm': App.director.heartTempo(ev.bpm); break;
        case 'systole': App.sfx('mistakeA', { volume: 0.5, pitch: 8 }); App.shake(0.2); break;
        case 'flare': App.sfx('wrath', { pitch: 4 }); if (at) ctx.particles.burst('blood', at); break;
        case 'plateCut': App.sfx('slice', { pitch: -2 }); break;
        case 'plateOff': App.sfx('hookPop', { pitch: -6 }); App.shake(0.3); break;
        case 'plateSeals': App.sfx('wrath', { pitch: -3 }); break;
        case 'round': if (ev.n > 1) this.hud.setBanner(`ROUND ${ev.n}`, 'red', 1); break;
        case 'arrest': App.sfx('flatline'); break;
        case 'haloHeals': App.sfx('choir', { pitch: 7, volume: 0.5 }); break;
        case 'ghostCut': App.sfx('mistakeA', { pitch: 7 }); App.shake(0.25); if (at) ctx.particles.burst('gold', at, { count: 6 }); break;
        case 'haloGone': App.sfx('choir'); App.shake(0.4); break;
        case 'trueVitals': App.sfx('flatline', { volume: 0.5 }); App.shake(0.6); this.hud.setBanner(`${Math.round(ev.v)}`, 'red', 1.8); break;
        case 'cue': this.cue(ctx, ev.cue); break;
        case 'fx': if (ev.fx === 'shake') App.shake(0.5); break;
        case 'pain': this.painKick = 1; App.rumble({ strong: 0.15, weak: 0.1, ms: 90 }); break;
        case 'cold': if (ev.cold != null) App.sfx('ice'); break;
        case 'wound': break;
        case 'won': this.onWon(); break;
        case 'lost': this.onLost(ev.reason); break;
        default: break;
      }
    }
  }
  cue(ctx, name) {
    if (name === 'quietAwaken') {
      this.quietAwaken = 1;
      App.director.play('silence', { now: true });
      App.sfx('heartbeat');
      App.shake(0.4);
    } else if (name === 'reyesBack') {
      this.reyesBack = true;
    }
  }

  // ---------------------------------------------------------------- View
  world(x, z, table) {
    const tv = this.tableViews[table ?? 0] ?? this.tableViews[0];
    return [tv.offsetX + x, tv.heightAt(x, z, this.viewS) + 0.2, z];
  }
  project(at) {
    const hud = this.ctx.hud;
    if (!at) return { x: hud.width / 2, y: hud.height / 2 };
    v3.set(at[0], at[1], at[2]).project(this.ctx.camera.camera);
    return { x: ((v3.x + 1) / 2) * hud.width, y: ((1 - v3.y) / 2) * hud.height };
  }
  setCameraNow(ctx) {
    const cam = ctx.camera.camera;
    cam.position.set(this.camX, this.camY, this.camZ);
    cam.lookAt(this.camX, 0, 0.1);
  }

  updateHeartAndBreath(ctx, dt) {
    const st = this.state;
    const S = this.viewS;
    S.t = this.viewT;
    this.beatKick = Math.max(0, (this.beatKick ?? 0) - dt * 5);
    const arena = st.tables[this.viewTable()].arena;
    if (st.heart) {
      S.beat = st.heart.calm && st.heart.bpm < 1 ? 0 : st.heart.systole ? 1 - st.heart.phase / 0.35 * 0.4 : Math.max(0, 0.25 - (st.heart.phase - 0.35));
      if (st.massage) S.beat = this.pressT > 0 ? 1 : 0;
    } else {
      // A resting heart behind everything.
      const rate = 60 + (99 - (st.tables[0].vitals ?? 70)) * 0.8;
      S.beat = Math.max(0, Math.sin(this.viewT * (rate / 60) * Math.PI * 2)) ** 6;
      if (st.massage) S.beat = this.pressT > 0 ? 1 : 0;
    }
    this.pressT = Math.max(0, (this.pressT ?? 0) - dt);
    S.breath = Math.sin(this.viewT * 1.4) * 0.5 + 0.5;
    if (st.codeBlue) { S.beat = 0; S.breath = 0.3; }
    S.bulges = [];
    for (const e of st.ents) {
      if (e.k === 'strain:introit' && !e.hidden && e.phase !== 'dead' && e.table === this.viewTable()) {
        S.bulges.push({ x: e.x, z: e.z, r: 1.3, h: e.phase === 'pore' ? 0.38 + Math.sin(this.viewT * 12) * 0.08 : 0.22 });
      }
    }
    void arena;
  }

  viewTable() {
    const c = this.controls[0];
    if (c) return c.table;
    const seat = this.state.seats[this.o.viewSeat ?? 0];
    return seat?.table ?? 0;
  }

  updateView(ctx, dt) {
    const st = this.state;
    const tableI = this.viewTable();
    const tv = this.tableViews[tableI] ?? this.tableViews[0];
    const S = this.viewS;
    // Tissue.
    const seatForScan = st.seats.find((s) => s.act === 'scanner' && s.table === tableI);
    const scan = seatForScan ? { x: seatForScan.x, z: seatForScan.z, r: 2.2 } : null;
    const seatLocal = st.seats[this.o.viewSeat ?? 0];
    const showRing = st.tools.includes('syringe');
    this.tableViews.forEach((view, i) => {
      const t = st.tables[i];
      if (i !== tableI && this.tableViews.length > 1 && Math.abs(view.offsetX - this.camX) > 20) return;
      view.deform(S);
      view.paint(st, t, { t: this.viewT, scan: i === tableI ? scan : null, showRing, ringHot: seatLocal?.tool === 'syringe' });
    });
    this.entViews.sync(st, S, dt);

    // Hands.
    const reticles = [];
    let hint = null;
    this.hudSeats.length = 0;
    st.seats.forEach((seat, i) => {
      const rig = this.handRigs[i];
      if (!rig) return;
      if (seat.gone) { rig.group.visible = false; return; }
      const stv = this.tableViews[seat.table] ?? this.tableViews[0];
      const ctl = this.controls[i];
      // Local tips move at once; everything else draws from state.
      const lx = ctl ? ctl.x : this.source?.localTip?.(seat)?.x ?? seat.x;
      const lz = ctl ? ctl.z : this.source?.localTip?.(seat)?.z ?? seat.z;
      const surf = stv.heightAt(lx, lz, S);
      const ctxTool = st.context && st.ents.some((e) => e.k === st.context && e.table === seat.table && !e.dead && !e.hidden) ? st.context : (ctl?.tool ?? seat.tool);
      rig.update(dt, stv.offsetX + lx, surf + 0.05, lz, { tool: ctxTool, use: !!seat.act, holding: !!seat.grab, draw: seat.draw ?? 0, hidden: !!st.codeBlue || !!st.massage });
      const p = this.project([stv.offsetX + lx, surf + 0.05, lz]);
      const isHuman = !seat.bot;
      if (seat.table === tableI && !st.codeBlue && !st.massage) {
        const color = st.seats.length > 1 && !this.def.partner ? this.seatColors[i] : null;
        const r = { sx: p.x, sy: p.y, on: seat.onTarget, use: !!seat.act, color, draw: seat.tool === 'syringe' ? seat.draw : 0, icon: st.seats.length > 1 && !this.def.partner ? ctxTool : null };
        if (st.heart && !st.heart.calm && isHuman) { r.beatRing = S.beat; r.beatBad = st.heart.systole; }
        if (this.def.partner && !isHuman) r.color = 'mist';
        reticles.push(r);
      }
      if (!(this.def.partner && seat.bot)) this.hudSeats.push({ id: seat.id, tool: ctl?.tool ?? seat.tool, color: st.seats.length > 1 && !this.def.partner ? this.seatColors[i] : null, gone: seat.gone, wheelOpen: (ctl?.wheelShown ?? 0) > 0 || st.seats.length <= 1 || !!this.def.partner, showWheel: st.seats.length <= 1 || !!this.def.partner || !!ctl, showLabel: true, corner: i });
      // Smoke, suction motes, foam from the working tool.
      if (seat.act && seat.onTarget && seat.table === tableI) {
        this.smokeT += dt;
        if (this.smokeT > 0.09) {
          this.smokeT = 0;
          const w = [stv.offsetX + seat.x, surf + 0.1, seat.z];
          if (seat.act === 'laser') { ctx.particles.burst('smoke2', w); ctx.particles.burst('spark', w, { count: 2 }); }
          else if (seat.act === 'drain') ctx.particles.burst('suck', w);
          else if (seat.act === 'gel') ctx.particles.burst('foam', w, { count: 2 });
          else if (seat.act === 'scanner') ctx.particles.burst('scanmote', w);
          else if (seat.act === 'scalpel') ctx.particles.burst('blood', w, { count: 1 });
        }
      }
      if (isHuman && (i === (this.o.viewSeat ?? 0)) && !st.codeBlue && !st.massage) {
        const hintsOn = (!this.def.noHint && (this.mode !== 'net') && DIFF_HINT(st)) || this.mode === 'attract';
        if (hintsOn) {
          const task = nextTask(st, { ...seat, x: lx, z: lz });
          if (task) {
            const hp = this.project([stv.offsetX + task.x, stv.heightAt(task.x, task.z, S) + 0.3, task.z]);
            hint = { sx: hp.x, sy: hp.y, tool: task.tool === 'marker' || task.tool === 'dressing' ? null : task.tool, have: ctl?.tool ?? seat.tool };
          }
        }
      }
    });
    this.hudView = { table: tableI, seatIndex: this.o.viewSeat ?? 0, viewSeat: this.o.viewSeat ?? 0, seats: this.hudSeats, comm: this.comm, reticles, hint, t: this.viewT, noSignal: this.def.noVoice, net: !!this.source, coachHints: false };
    const shownTable = st.tables[tableI];
    this.hudView.vitalsShown = shownTable.fake ?? shownTable.vitals;
    // The selected tool's valid targets, for a soft pulse.
    this.hudView.pulses = [];
    const pulseSeat = st.seats[this.o.viewSeat ?? 0];
    if (pulseSeat && !st.codeBlue && !st.massage && !this.def.noHint) {
      const pctl = this.controls[this.o.viewSeat ?? 0] ?? this.source?.control;
      const ptool = st.context ?? pctl?.tool ?? pulseSeat.tool;
      for (const t of validTargets(st, pulseSeat, ptool).slice(0, 14)) {
        const hp = this.project([tv.offsetX + t.x, tv.heightAt(t.x, t.z, S) + 0.1, t.z]);
        this.hudView.pulses.push({ sx: hp.x, sy: hp.y });
      }
    }

    this.updateCrisisHands(ctx, dt, tv);
    // The ghost hand: The Second Look's replay and Miserere's copy.
    this.updateGhost(ctx, dt);
    // The pale strain.
    if (this.pale) {
      const body = st.ents.find((e) => e.k === 'strain:pale');
      this.pale.visible = !!body;
      if (body) {
        const left = Math.max(0, 40 - st.pain * 6);
        this.paleSegs.forEach((m, i) => {
          const u = i / 39;
          const x = -5.2 + u * 10.4;
          const z = 0.2 + Math.sin(u * 19 + this.viewT * 0.35) * 0.36;
          m.visible = i < left;
          m.position.set(x, tv.heightAt(x, z, S) + 0.13 + Math.sin(this.viewT * 0.9 + i * 0.3) * 0.02, z);
        });
      }
    }

    // Lamps flicker low.
    const lowest = shownTable.fake ?? shownTable.vitals;
    this.tableViews.forEach((view, i) => {
      const k = lowest < 15 && !App.save.settings.reduceFlashes ? (Math.sin(this.viewT * 31) * Math.sin(this.viewT * 17) > 0.25 ? 0.4 : 1) : 1;
      this.lamps[i].intensity = 5 * k;
    });

    // Camera: dive in, whip-pan, a little parallax.
    const seat = st.seats[this.o.viewSeat ?? 0];
    const ctl = this.controls[0];
    const tipX = ctl ? ctl.x : seat?.x ?? 0;
    const tipZ = ctl ? ctl.z : seat?.z ?? 0;
    const narrow = Math.max(1, (16 / 9) / Math.max(0.2, ctx.camera.camera.aspect));
    const baseY = CAM_BASE.y * narrow, baseZ = CAM_BASE.z * narrow;
    this.camY += (baseY - this.camY) * Math.min(1, dt * 3.2);
    this.camZ += (baseZ - this.camZ) * Math.min(1, dt * 3.2);
    const wantX = tv.offsetX + (tipX / 8) * 0.25;
    const k = Math.min(1, dt * (Math.abs(wantX - this.camX) > 3 ? 14 : 5));
    this.camX += (wantX - this.camX) * k;
    const zDrift = (tipZ / 4.5) * 0.25;
    const cam = ctx.camera.camera;
    cam.position.set(this.camX, this.camY, this.camZ + zDrift * 0.5);
    cam.lookAt(this.camX, 0, 0.1 + zDrift);
    this.placeCommBust(ctx);
    // Mouse cursor is ours in surgery.
  }

  showCursor() { return App.overlays.length > 0 && App.devices.last === 'kbm'; }

  /** Paddles come up for a Code Blue; two gloves press for the massage. */
  updateCrisisHands(ctx, dt, tv) {
    const st = this.state;
    const crisis = st.codeBlue ? 'paddle' : st.massage ? 'massage' : null;
    if (crisis && !this.crisisRigs) this.crisisRigs = [new HandRig(ctx, 0, { gloves: SEAT_GLOVES[0] }), new HandRig(ctx, 1, { gloves: SEAT_GLOVES[0] })];
    if (!this.crisisRigs) return;
    const on = !!crisis;
    this.crisisRigs.forEach((r, i) => {
      r.group.visible = on;
      if (!on) return;
      const side = i === 0 ? 1 : -1;
      let press = 0;
      if (crisis === 'massage') press = (st.massage.next === 'a') === (i === 0) ? 0.12 : (this.pressT ?? 0) > 0 ? -0.2 : 0.05;
      else if (st.codeBlue.charging) press = 0.08 + Math.sin(this.viewT * 30) * 0.02 * st.codeBlue.charge;
      else press = 0.7;
      const x = side * (crisis === 'massage' ? 0.85 : 1.5), z = crisis === 'massage' ? 0.9 : 0.7 + side * 0.4;
      const y = tv.heightAt(x, z, this.viewS) + press;
      r.update(dt, tv.offsetX + x, y, z, { tool: crisis === 'paddle' ? 'paddle' : 'none', use: true, hidden: false });
    });
  }

  startGhostReplay(ctx) {
    if (!this.ghost) this.ghost = new HandRig(ctx, 0, { ghost: true });
  }
  updateGhost(ctx, dt) {
    const st = this.state;
    const g = st.handGhost;
    const gp = st.ghostPlay;
    if ((g || gp) && !this.ghost) this.startGhostReplay(ctx);
    if (!this.ghost) return;
    const tv = this.tableViews[0];
    if (gp) {
      const tr = gp.trail;
      if (tr?.length) {
        const k = Math.min(tr.length - 1, Math.floor((gp.t / gp.span) * tr.length));
        const s = tr[k];
        this.ghost.group.visible = true;
        this.ghost.update(dt, tv.offsetX + s[0], tv.heightAt(s[0], s[1], this.viewS) + 0.05, s[1], { tool: s[3], use: !!s[2] });
      }
    } else if (g) {
      this.ghost.group.visible = true;
      this.ghost.update(dt, tv.offsetX + g.x, tv.heightAt(g.x, g.z, this.viewS) + 0.05, g.z, { tool: g.tool, use: !!g.use });
    } else this.ghost.group.visible = false;
  }

  // ---------------------------------------------------------------- Sound
  updateAudio(ctx, dt) {
    const st = this.state;
    const seat = st.seats[this.o.viewSeat ?? 0];
    // Tool loops: pitch and volume follow force.
    const active = {};
    if (!App.overlays.length && st.status === 'playing') {
      for (const s of st.seats) {
        if (!s.act || s.gone || s.bot && this.mode !== 'attract') continue;
        const name = LOOP_FOR[s.act];
        if (!name) continue;
        if (s.act === 'scalpel' && !s.cutting) continue;
        active[name] = Math.max(active[name] ?? 0, s.onTarget ? 1 : 0.55);
      }
    }
    for (const [name, loop] of Object.entries(this.loops)) {
      if (name === 'droneLoop') continue;
      const vol = active[name] ?? 0;
      loop.set({ volume: vol, pitch: name === 'drainLoop' && vol ? (seat?.onTarget ? 3 : -2) : 0 });
    }
    this.loops.droneLoop.set({ volume: st.quiet ? 1 : 0 });
    if (st.status !== 'playing' || App.overlays.length) return;
    // The monitor.
    const table = st.tables[this.viewTable()] ?? st.tables[0];
    const shown = table.fake ?? table.vitals;
    const bpm = st.heart ? (st.heart.calm ? 60 : st.heart.bpm) : 60 + (99 - shown) * 0.8;
    const ekgRate = (bpm / 60) * (st.quiet ? App.config.quietSlow : 1);
    this.hud.ekg.update(dt, ekgRate, table.fake != null ? 0.6 : 0, !!st.codeBlue);
    this.ekgT -= dt;
    if (!st.codeBlue && !st.massage && !(st.heart && !st.heart.calm)) {
      if (this.ekgT <= 0) {
        this.ekgT = 1 / ekgRate;
        App.sfx('ekg', { pitch: Math.max(-6, (shown - 50) / 12) });
      }
    }
    this.alarmT -= dt;
    if (shown < 30 && !st.codeBlue && this.alarmT <= 0) {
      this.alarmT = shown < 15 ? 1 : 1.6;
      App.sfx('alarm', { volume: shown < 15 ? 1 : 0.6 });
      this.pool('reyes', 'lowVitals');
      if (!this.def.noVoice && Math.random() < 0.3) this.pool('pem', 'lowVitals');
    }
    // Paddles charging.
    if (st.codeBlue) {
      if (st.codeBlue.charging && !this.chargeSound) { this.chargeSound = true; App.sfx('charge'); }
      if (!st.codeBlue.charging) this.chargeSound = false;
    }
    // The Quiet: a heartbeat in the silence, and a slow rumble in time.
    if (st.quiet) {
      this.heartT -= dt;
      if (this.heartT <= 0) { this.heartT = 0.92; App.sfx('heartbeat'); App.rumble({ strong: 0.4, weak: 0, ms: 90 }); }
    }
    App.director.mood(Math.min(...st.tables.map((t) => t.vitals)));
  }

  updateLook(ctx, force = false) {
    const st = this.state;
    const L = this.lookState;
    const dt = App.frameDt;
    const k = Math.min(1, dt * 5);
    const wantSat = st.quiet ? 0.12 : 1 - (this.quietAwaken ? 0.8 * this.quietAwaken : 0);
    const wantVig = st.quiet ? 0.85 : st.codeBlue ? 0.6 : 0.3;
    L.sat += (wantSat - L.sat) * k;
    L.vig += (wantVig - L.vig) * k;
    this.rewindGlow = Math.max(0, this.rewindGlow - dt * 1.1);
    L.spread = this.rewindGlow * 3;
    if (this.quietAwaken && !st.quiet && st.composure < 100) this.quietAwaken = Math.max(0, this.quietAwaken - dt * 2);
    if (st.quiet) this.quietAwaken = 0;
    const key = `${L.sat.toFixed(2)},${L.vig.toFixed(2)},${L.spread.toFixed(2)},${App.save.settings.look},${App.save.settings.pixelSize}`;
    if (force || key !== this.lookSent) {
      this.lookSent = key;
      applyLook(ctx.engine, App.save.settings, L.sat, L.vig, L.spread);
    }
  }

  // ---------------------------------------------------------------- Endings
  onWon() {
    this.ended = 'won';
    this.endT = 0;
    this.o.onWon?.(this);
    App.sfx('uiConfirm');
  }
  onLost(reason) {
    this.ended = 'lost';
    this.endT = 0;
    this.failReason = reason;
    App.sfx('flatline');
    App.director.play('silence', { now: true });
    App.rumble({ strong: 0.5, weak: 0.5, ms: 500 });
    this.o.onLost?.(this, reason);
  }
  updateEnd(ctx, dt) {
    if (!this.ended) return;
    this.endT += dt;
    if (this.mode === 'attract') {
      if (this.endT > 1.5) this.o.attract?.next?.();
      return;
    }
    if (this.source) return;
    if (this.ended === 'won' && this.endT > 1.5 && !this.leaving) {
      this.leaving = true;
      this.finishToResults();
    }
    if (this.ended === 'lost' && this.endT > 1.2 && !this.failOverlay) {
      this.failOverlay = true;
      import('../ui/overlays.js').then((m) => App.overlays.push(new m.FailOverlay(this)));
    }
  }
  async finishToResults() {
    const { ResultsStage } = await import('./results.js');
    App.goto(new ResultsStage({ sim: this.sim, opId: this.opId, mode: this.mode, seatsCfg: this.o.seats, fromLog: this.o.fromLog }), { kind: 'blinds', camera: { preset: 'fixed', position: [0.2, 1.75, 5.1], target: [0, 1.42, 0], fov: 30, minZoom: 1, maxZoom: 1 } });
  }
  retry() {
    if (!this.sim) return;
    App.overlays.length = 0;
    retryStage(this.sim);
    this.ended = false;
    this.endT = 0;
    this.failOverlay = false;
    this.comm.queue.length = 0;
    this.comm.line = null;
    if (this.sim.music) App.director.play(this.sim.music, { now: true });
    this.controls.forEach((c, i) => { if (c) { c.syncFromSeat(this.sim.seats[i]); c.useWas = false; c.tool = this.sim.seats[i].tool; } });
  }
  restart(difficulty) {
    const o = { ...this.o, difficulty: difficulty ?? this.o.difficulty, capRank: null, fails: this.fails };
    App.goto(new OperationStage(o));
  }

  draw(ctx, ui, dt) {
    if (!this.hudView) return;
    this.hud.draw(ui, this.state, this.hudView, dt);
    if (App.devView.hitboxes) this.drawHitboxes(ui);
    if (App.devView.stats) this.drawStats(ctx, ui);
    this.o.drawExtra?.(this, ctx, ui, dt);
    if (this.ended === 'won' && this.mode !== 'attract') ui.center(ui.h * 0.38, 'PATIENT STABLE', { color: 'lime', scale: 3 });
  }
  drawHitboxes(ui) {
    const st = this.state;
    const table = this.viewTable();
    for (const e of st.ents) {
      if (e.table !== table || e.dead) continue;
      const tv = this.tableViews[table];
      const p = this.project([tv.offsetX + e.x, tv.heightAt(e.x, e.z, this.viewS) + 0.1, e.z]);
      const t = taskOf(st, e);
      ui.text(p.x + 3, p.y - 3, `${e.id}${t ? `:${t.tool}` : ''}`, { color: e.hidden ? 'slate' : 'cyan' });
      ui.rect(p.x - 1, p.y - 1, 3, 3, 'cyan');
    }
  }
  drawStats(ctx, ui) {
    const st = this.state;
    const lines = [`FPS ${ctx.engine.fps.toFixed(0)}`, `TICK ${st.tick}`, `ENTS ${st.ents.length}`, `DROPS ${st.drops?.length ?? 0}`, `SCORE ${st.score}`, `STREAK ${st.streak}`, `STAGE ${st.stage + 1}/${this.def.stages.length}`];
    lines.forEach((l, i) => ui.text(4, 24 + i * 9, l, { color: 'lime' }));
  }
  status() {
    const st = this.state;
    if (!st) return 'op';
    return `${this.opId} mode=${this.mode} stage=${st.stage} vitals=${Math.round(st.tables[0].vitals)} t=${Math.round(st.clock)} score=${st.score} status=${st.status}`;
  }
  fingerprint() {
    return this.sim ? `${this.sim.tick}:${this.sim.score}:${this.sim.rng}` : '';
  }
  dispose() {
    for (const l of Object.values(this.loops)) l.stop?.();
    App.devView.botPlays = false;
  }
}

const DIFF_HINT = (st) => st.diffId !== 'attending';
const ui2 = (stage) => stage.ui;
