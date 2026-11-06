import * as THREE from 'three/webgpu';
import { h } from '../ui/dom.js';
import { Doll, paintColour } from '../art/doll.js';
import { MAP } from '../art/island.js';
import { EVENTS, TIER_NAMES } from '../data/events.js';
import { hasEvent } from '../events/index.js';
import { promptHTML } from '../input/glyphs.js';
import { blankInput } from '../input/input.js';
import { tun } from '../core/tuning.js';
import { rot2 } from '../render/cameraRig.js';
import { QUESTIONS, line } from '../data/dialogue.js';
import { Ragdoll } from '../physics/ragdoll.js';
import { openPlan } from '../ui/screens/plan.js';
import { openMirror } from '../ui/screens/mirror.js';
import { openJournal } from '../ui/screens/journal.js';
import { cos, cosPick } from '../core/rng.js';
import { diagram } from '../ui/diagrams.js';
import { DAYS } from '../data/programme.js';
import { refreshJarDisplay } from './jar.js';

const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _iq = new THREE.Quaternion();

// What each place does. Events listed here are offered when you use it.
const SPOT_EVENTS = {
  sunDeck: ['poses'], pond: ['stillWater'], quarry: ['cairn'], yard: ['logReps'], bandstand: ['stepClass'], boardwalk: ['roomService'],
  pier: ['fruitHat', 'plank', 'springboard'], green: ['plates'], beach: ['tug'], lighthouse: ['grandHold'], ringRoad: ['islandLoop'], gazebo: ['raft'],
};

/** The hub: walk the crooked island, talk to everyone, go to class, go to bed. */
export class Hub {
  constructor(game, opts = {}) {
    this.game = game; this.opts = opts; this.name = 'island'; this.canPause = true;
    this.input = blankInput(); this.focus = null; this.walkTo = null; this.orbit = 0; this.pitch = 0.42; this.dist = 11;
    this.cutscene = false; this.t = 0; this.askT = 0; this.nearT = 0; this.idleT = 8;
    this.spots = [];
    this.label = null; this.leanTut = false; this.ragdoll = null; this.lastFocusId = null;
  }
  enter() {
    const g = this.game;
    g.setIsland('home');
    g.ui.clear();
    g.programme.syncIsland();
    g.phys.leanExtraX = 0; g.phys.leanExtraZ = 0;
    const p = g.save.profile;
    g.palette.set(g.programmePalette(), 1.2);
    g.audio.music('island');
    refreshJarDisplay(g);
    if (!this.doll) {
      this.doll = new Doll({ shirt: p ? paintColour(p.paint) : '#2CB5A0', hat: p ? p.hat : 'none' });
      g.art.group.add(this.doll.root);
    }
    const spawn = this.opts.at ? MAP[this.opts.at] : null;
    if (spawn) g.phys.setPosition(spawn.x + 2, spawn.z + 3);
    else if (g.hubPos) g.phys.setPosition(g.hubPos.x, g.hubPos.z);
    else g.phys.setPosition(0, 10);
    const t = g.phys.pos;
    const trudy = g.art.trudy;
    this.tx = t.x + 1.8; this.tz = t.z + 1.2;
    trudy.root.position.set(this.tx, 0, this.tz);
    this.promptsEl = h('div.prompts');
    this.hudLayer = g.ui.open({ name: 'hub', passive: true, build: (s) => {
      this.topTag = h('div.hud-note.tag', { style: 'top:5.6rem;display:none' }, '');
      this.dayTag = h('div.tag', { style: 'position:absolute;top:5.6rem;left:5.2vw;font-size:3.2rem;transform:rotate(-1deg)' }, '');
      this.marbleTag = h('div.tag', { style: 'position:absolute;top:5.6rem;right:5.2vw;font-size:3.2rem;transform:rotate(1deg)' }, '');
      this.label = h('div.hotlabel.tag'); this.label.style.display = 'none';
      s.el.append(this.promptsEl, this.dayTag, this.marbleTag, this.topTag, this.label);
    } });
    this.lastDev = null;
    this.refreshTags();
    this.buildSpots();
    this.chase(true);
    if (this.opts.arrival) this.handle = g.scripts.run(this.arrival());
    else if (this.opts.morning) this.handle = g.scripts.run(this.morning());
    else if (this.opts.afterJar) this.handle = g.scripts.run(this.afterJar());
    else if (this.opts.afterCheckin) this.handle = g.scripts.run(this.afterCheckin());
    else this.greet();
  }
  exit() {
    const g = this.game;
    if (this.handle) this.handle.cancel();
    g.hubPos = { x: g.phys.pos.x, z: g.phys.pos.z };
    if (this.ragdoll) { this.ragdoll.end(); this.ragdoll = null; }
    if (this.doll) { g.art.group.remove(this.doll.root); this.doll = null; }
    g.phys.wantX = 0; g.phys.wantZ = 0; g.phys.leanExtraX = 0; g.phys.leanExtraZ = 0;
    if (this.lastFocusId) g.art.outline(this.lastFocusId, false);
    if (this.hudLayer) g.ui.close(this.hudLayer);
    g.speech.clear();
    g.ui.clear();
  }
  refreshTags() {
    const g = this.game;
    const p = g.save.profile;
    if (!p) { this.dayTag.style.display = 'none'; this.marbleTag.style.display = 'none'; return; }
    const d = g.programme.dayDef(p.today.day);
    this.dayTag.textContent = `Day ${p.today.day}: ${d.name}`;
    this.marbleTag.textContent = `${p.marbles} marbles`;
  }
  buildSpots() {
    const g = this.game, art = g.art;
    this.spots = Object.keys(MAP).map((id) => ({ id, label: MAP[id].label, x: MAP[id].x, z: MAP[id].z, y: MAP[id].y, r: id === 'ringRoad' ? 2.5 : 4.4 }));
    for (const gu of art.guests) this.spots.push({ id: `guest:${gu.id}`, label: gu.doll && nameOf(gu.id), guest: gu, y: 1.9, r: 2 });
    this.spots.push({ id: 'heron', label: 'Ms. Stillwater', x: art.heron.root.position.x, z: art.heron.root.position.z, y: 2.7, r: 2.6, who: 'stillwater' });
    this.spots.push({ id: 'walrus', label: 'Coach Bolster', x: art.walrus.root.position.x, z: art.walrus.root.position.z, y: 3, r: 3, who: 'bolster' });
  }
  greet() {
    const g = this.game;
    this.handle = g.scripts.run((function* s(self) {
      yield 0.6;
      const pr = g.programme;
      if (!g.save.profile) return;
      if (!pr.planLeft().length && g.save.profile.today.checkin) g.bark('trudy', 'all_done', null, 4);
    })(this));
  }
  // ---- Scripts ----
  *arrival() {
    const g = this.game;
    this.cutscene = true;
    g.palette.set('dawn', 0.2);
    const trudy = g.art.trudy;
    // You drop onto the island from above, clatter, spring up.
    yield 0.5;
    g.audio.sfx('whoosh');
    const t = g.phys.pos;
    this.doll.root.position.set(t.x, 0, t.z);
    this.doll.ragdolled = true;
    this.doll.update(0);
    this.doll.root.position.set(t.x, 6.5, t.z);
    g.art.group.updateWorldMatrix(true, true);
    this.ragdoll = new Ragdoll(g.phys.world, this.doll, g.art.group, { x: 0, y: -3, z: 0 }, { x: 0.02, y: 0, z: 0.01 });
    let clacks = 0;
    const until = g.simTime + 1.5;
    yield () => {
      if (this.ragdoll) this.ragdoll.sync();
      const y = this.ragdoll ? this.ragdoll.centre().y : 9;
      if (y < 0.6 && clacks < 2) { clacks++; g.audio.sfx('fall'); g.comic.pop('CLACK!', t.x, 1.8, t.z); g.rig.shake(0.1); }
      return g.simTime > until;
    };
    this.ragdoll.end(); this.ragdoll = null;
    this.doll.ragdolled = false;
    this.doll.root.position.set(t.x, 0, t.z);
    this.doll.rig.once('land');
    g.audio.sfx('spring');
    yield 0.5;
    this.trudyHopTo(t.x + 2, t.z + 1.6);
    yield 0.6;
    trudy.rig.once('gasp');
    trudy.feel(0.8);
    yield* g.say('trudy', 'drop_in');
    // Lean left: the whole island tips under you, and every orange rolls.
    this.leanTut = true;
    for (const [sit, dx, dz, bonus] of [['lean_left', -1, 0, 'Lean left'], ['lean_right', 1, 0, 'Lean right'], ['lean_forward', 0, -1, 'Lean forward']]) {
      const l = g.speech.say('trudy', line('trudy', sit), { auto: 0 });
      this.setPrompts([['lean', bonus]]);
      let held = 0;
      this.leanGoal = [dx, dz];
      yield () => {
        const i = this.input;
        const d = i.wishX * dx + i.wishZ * dz;
        if (d > 0.5) held += 1 / 120;
        if (l.finished && !l.autoClear) { l.autoClear = true; }
        return held > 0.9;
      };
      if (g.speech.line === l) g.speech.clear();
      g.audio.sfx('creak', { dur: 0.8 });
      trudy.rig.once('hop');
      yield 0.5;
    }
    this.leanTut = false; this.leanGoal = null;
    g.phys.leanExtraX = 0; g.phys.leanExtraZ = 0;
    yield* g.say('trudy', 'lean_done');
    g.save.profile.tutorialDone = true;
    g.save.write();
    this.cutscene = false;
    yield* g.say('trudy', 'first_checkin');
    g.go(() => g.flow.toCheckIn());
  }
  *morning() {
    const g = this.game;
    const p = g.save.profile;
    this.cutscene = true;
    g.palette.set('dawn', 0.2);
    yield 0.5;
    const away = p.lastSeen ? (Date.now() - p.lastSeen) / 3600000 : 0;
    if (away > 12) yield* g.say('trudy', 'returned');
    else if (p.levelled) yield* g.say('trudy', 'maintenance');
    else if (p.today.day === DAYS.length) yield* g.say('trudy', 'level_day');
    else yield* g.say('trudy', 'morning');
    const def = g.programme.dayDef(p.today.day);
    if (def.opens === 'mirror') yield* g.say('trudy', 'mirror_open');
    if (def.opens === 'group') yield* g.say('trudy', 'group_open');
    if (!p.today.question) {
      yield* g.say('trudy', 'question_intro');
      const q = QUESTIONS[(p.today.day - 1 + (p.answersSeed || 0)) % QUESTIONS.length];
      const ans = yield* this.ask(q);
      yield* g.sayText('trudy', ans);
      p.today.question = true;
    }
    this.cutscene = false;
    yield* g.say('trudy', 'checkin_start');
    g.go(() => g.flow.toCheckIn());
  }
  /** Always Yes/No, always a reply either way. */
  *ask(q) {
    const g = this.game;
    let reply = null;
    g.speech.say('trudy', q.q, {});
    g.ui.open({
      name: 'question',
      build: (s) => {
        const row = h('div.choices');
        s.el.append(row);
        row.append(s.item(h('div', q.a[0]), { use: () => { reply = q.yes; } }));
        row.append(s.item(h('div', q.a[1]), { use: () => { reply = q.no; } }));
      },
      prompts: [['use', 'Answer']],
    });
    yield () => reply;
    g.ui.close(g.ui.top);
    g.speech.clear();
    return reply;
  }
  *afterCheckin() {
    const g = this.game;
    yield 0.4;
    g.speech.say('trudy', line('trudy', 'plan'), { auto: 3.4 });
    openPlan(g, this);
  }
  *afterJar() {
    const g = this.game;
    yield 0.5;
    const pr = g.programme;
    if (g.save.profile && !pr.planLeft().length && g.save.profile.today.checkin) yield* g.say('trudy', 'all_done');
  }
  *bedtime() {
    const g = this.game;
    this.cutscene = true;
    this.sleeping = true;
    yield* g.say('trudy', 'bed');
    yield* g.wipe(() => {
      g.programme.nextDay();
      g.audio.sfx('stamp');
    });
    g.go(() => g.flow.toIsland({ morning: true, at: 'bedHut' }));
    this.cutscene = false;
  }
  setPrompts(list) { this.promptOverride = list; this.lastDev = null; }
  trudyHopTo(x, z) { this.tx = x; this.tz = z; }
  // ---- Use ----
  useSpot(spot) {
    const g = this.game, pr = g.programme, p = g.save.profile;
    if (!spot || !p) return;
    this.walkTo = null;
    if (spot.who) { g.bark(spot.who, 'idle', null, 3.4); return; }
    if (spot.guest) { const w = spot.guest.id; g.bark(w, 'idle', null, 3.4); spot.guest.doll.rig.once('wave'); return; }
    if (spot.id === 'board') { openPlan(g, this); return; }
    if (spot.id === 'jar') { g.speech.say('trudy', p ? `${p.marbles} marbles. ${line('trudy', 'jar')}` : line('trudy', 'jar'), { auto: 3.4 }); return; }
    if (spot.id === 'bedHut') {
      if (!p) return;
      if (pr.planLeft().length) { g.bark('trudy', 'not_done', null, 3); return; }
      this.handle = g.scripts.run(this.bedtime());
      return;
    }
    if (spot.id === 'mirror') {
      if (p && (p.today.day >= 3 || p.levelled)) openMirror(g, this);
      else g.speech.say('trudy', 'The Mirror opens on Day 3. You are not ready to see yourself. I say this kindly.', { auto: 3.4 });
      return;
    }
    if (spot.id === 'gazebo') { this.chooseGazebo(); return; }
    const list = (SPOT_EVENTS[spot.id] || []).filter(hasEvent);
    if (!list.length) return;
    this.startFromList(list, spot.label);
  }
  chooseGazebo() {
    const g = this.game, p = g.save.profile;
    if (p && (p.today.day < 4 && !p.levelled)) { g.speech.say('trudy', 'The Gazebo opens on Day 4. I am still dusting it. It does not need dusting.', { auto: 3.4 }); return; }
    const choices = [{ label: 'Group Class', use: () => g.go(() => g.flow.toGroup()) }];
    if (hasEvent('raft')) choices.unshift({ label: 'Tippy Raft', use: () => this.startFromList(['raft'], 'The Raft') });
    this.chooser('The Gazebo', choices);
  }
  /** At a place with classes: the one due today, otherwise whatever is open. */
  startFromList(list, label) {
    const g = this.game, pr = g.programme, p = g.save.profile;
    const due = list.filter((id) => pr.classesToday().includes(id) && !p.today.done.includes(id));
    if (due.length === 1 && list.length === 1) { this.goClass(due[0], true); return; }
    const open = list.filter((id) => due.includes(id) || pr.seen(id));
    if (!open.length) {
      g.speech.say('trudy', "That class is not on today's plan. It will come to you. Things do.", { auto: 3.2 });
      return;
    }
    if (open.length === 1 && !due.length) { this.chooseTier(open[0]); return; }
    this.chooser(label, open.map((id) => ({ label: `${EVENTS[id].title}${due.includes(id) ? ' (today)' : ''}`, use: () => (due.includes(id) ? this.goClass(id, true) : this.chooseTier(id)) })));
  }
  chooseTier(id) {
    const g = this.game, pr = g.programme;
    const tiers = EVENTS[id].tiers.map((_, t) => t).filter((t) => pr.tierOpen(id, t));
    if (tiers.length === 1) { this.goClass(id, false, 0); return; }
    this.chooser(EVENTS[id].title, tiers.map((t) => ({ label: TIER_NAMES[t], use: () => this.goClass(id, false, t) })));
  }
  chooser(title, choices) {
    const g = this.game;
    let scr = null;
    const close = () => g.ui.close(scr);
    scr = g.ui.open({
      name: 'chooser', className: 'dim', prompts: [['use', 'Choose'], ['back', 'Back']], back: close,
      build: (s) => {
        s.el.append(h('div.h2', { style: 'margin-top:12rem' }, title));
        const col = h('div.col');
        s.el.append(col);
        for (const c of choices.slice(0, 6)) col.append(s.item(h('div', c.label), { use: () => { close(); c.use(); } }));
      },
    });
  }
  goClass(id, programme, tier) {
    const g = this.game, pr = g.programme;
    if (id === 'grandHold' && programme && pr.planLeft().some((x) => x !== 'grandHold')) {
      g.speech.say('trudy', 'The lighthouse is for last. Please do your other classes first. I have been waiting for years. You can wait for a walrus.', { auto: 4 });
      return;
    }
    const t = tier ?? pr.programmeTier(id);
    g.go(() => g.flow.runClass(id, t, { programme }));
  }
  // ---- Sim ----
  fixed(dt) {
    const g = this.game, inp = g.input, ph = g.phys;
    this.t += dt;
    const modal = (g.ui.top && !g.ui.top.passive) || (inp.uiBusy && !this.leanTut);
    if (!modal) {
      inp.sample('any', this.input, dt);
    } else { Object.assign(this.input, blankInput()); }
    const i = this.input;
    const yaw = g.rig.yaw;
    if (this.leanTut) {
      // Lean tutorial: your weight goes straight into the island.
      const [wx, wz] = rot2(i.device === 'pad' ? i.wishX : (inp.keyX || inp.pointerActive ? i.wishX : i.wishX), i.wishZ, yaw);
      ph.leanExtraX = wx * 0.13; ph.leanExtraZ = wz * 0.13;
      ph.wantX = 0; ph.wantZ = 0;
    } else if (!this.cutscene && !modal) {
      let mx = 0, mz = 0;
      if (i.device === 'pad') { mx = i.moveX; mz = i.moveZ; } else if (i.keysActive) { mx = i.moveX; mz = i.moveZ; }
      if (mx || mz) this.walkTo = null;
      let [wx, wz] = rot2(mx, mz, yaw);
      if (this.walkTo) {
        const t = this.spotPos(this.walkTo), p = ph.pos;
        const dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
        if (d < (this.walkTo.r || 3) * 0.8) { const s = this.walkTo; this.walkTo = null; this.useSpot(s); wx = 0; wz = 0; } else { wx = dx / d; wz = dz / d; }
      }
      const s = tun.walkSpeed;
      ph.wantX = wx * s; ph.wantZ = wz * s;
      if ((i.use || i.hopPressed) && !g.speech.active) {
        if (this.focus && (i.use || i.device === 'pad')) this.useSpot(this.focus);
        else if (i.hopPressed) this.hop();
      }
      if (i.ask) this.askTrudy();
      if (inp.btnEdge & 1 && this.hover && !g.speech.active) this.walkTo = this.hover;
      // Bot/test convenience: Triangle or T opens today's plan when nothing is focused and speech is quiet.
      this.orbit -= i.lookX * 1.8 * dt; this.pitch = Math.max(0.12, Math.min(1.1, this.pitch + i.lookY * 0.9 * dt));
      if (inp.dragX || inp.dragY) { this.orbit -= inp.dragX * 0.005; this.pitch = Math.max(0.12, Math.min(1.1, this.pitch + inp.dragY * 0.003)); }
      if (inp.wheel) this.dist = Math.max(5, Math.min(26, this.dist + inp.wheel * 1.2));
      this.idleT -= dt;
      if (this.idleT <= 0) {
        this.idleT = cos(14, 28);
        if (!g.speech.active) g.bark('trudy', 'idle', null, 3.2);
        // Gary, on the notice board, attends to his own affairs.
        g.art.gary.rig.once(this.idleT > 21 ? 'squawk' : 'peck');
        if (this.idleT > 21) g.audio.sfx('squawk');
      }
    } else { ph.wantX = 0; ph.wantZ = 0; }
    g.stepIsland(dt, 1);
    this.updateFocus();
    this.trudyStep(dt);
    if (this.hopT > 0) this.hopT -= dt;
  }
  hop() {
    if ((this.hopT || 0) > 0) return;
    this.hopT = 0.5;
    this.doll.rig.once('hop');
    this.game.audio.sfx('boing');
  }
  /** Ask Trudy: today's plan, and a word about what is next. */
  askTrudy() {
    const g = this.game, pr = g.programme;
    if (!g.save.profile) return;
    openPlan(g, this);
    const next = pr.nextClass();
    if (next) g.bark('trudy', 'ask_plan', { next: EVENTS[next].title, place: EVENTS[next].place }, 3.2);
    else g.bark('trudy', 'ask_done', null, 3.2);
  }
  spotPos(s) { return s.guest ? { x: s.guest.x, z: s.guest.z } : { x: s.x, z: s.z }; }
  updateFocus() {
    const g = this.game, ph = g.phys, p = ph.pos, inp = g.input;
    let best = null, bd = 1e9;
    for (const s of this.spots) {
      const q = this.spotPos(s);
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d < s.r && d / s.r < bd) { bd = d / s.r; best = s; }
    }
    // A hovered thing gets the same treatment: project anchors to screen and take the nearest.
    this.hover = null;
    if (inp.lastDevice === 'kbm' && inp.pointerActive && !this.cutscene) {
      let hb = 1e9;
      g.art.group.updateWorldMatrix(true, false);
      for (const s of this.spots) {
        const q = this.spotPos(s);
        _v.set(q.x, s.y * 0.7, q.z).applyMatrix4(g.art.group.matrixWorld).project(g.camera);
        if (_v.z > 1) continue;
        const sx = (_v.x * 0.5 + 0.5) * inp.w, sy = (-_v.y * 0.5 + 0.5) * inp.h;
        const d = Math.hypot(sx - inp.mx, sy - inp.my);
        if (d < inp.h * 0.09 && d < hb) { hb = d; this.hover = s; }
      }
    }
    this.focus = this.hover || best;
  }
  trudyStep(dt) {
    const g = this.game, trudy = g.art.trudy, p = g.phys.pos;
    if (!this.leanTut && !this.cutscene) { const y = g.rig.yaw, c = Math.cos(y), s = Math.sin(y); this.tx = p.x + 1.8 * c + 0.9 * s; this.tz = p.z - 1.8 * s + 0.9 * c; }
    const pos = trudy.root.position;
    const dx = this.tx - pos.x, dz = this.tz - pos.z, d = Math.hypot(dx, dz);
    if (d > 0.6) {
      const sp = Math.min(6.5, 1.6 + d);
      pos.x += (dx / d) * sp * dt; pos.z += (dz / d) * sp * dt;
      this.trudyHop = (this.trudyHop || 0) + dt;
      if (this.trudyHop > 0.42) { this.trudyHop = 0; trudy.rig.once('hop'); trudy.squash = 0.8; if (d < 7) g.audio.sfx('thud', { pitch: 340 }); }
    }
    // She keeps her face to you and the room.
    trudy.yaw = g.rig.yaw * 0.85;
    // Her bubble slides to the high side of the world.
    const c = Math.cos(trudy.yaw), s = Math.sin(trudy.yaw);
    trudy.feel((-g.phys.tx * c + g.phys.tz * s) * 6);
  }
  chase(snap) {
    const g = this.game, p = g.phys.pos;
    g.art.group.updateWorldMatrix(true, false);
    if (this.mirrorShot) {
      const m = MAP.mirror;
      _v.set(m.x, 1.2, m.z + 2.4).applyMatrix4(g.art.group.matrixWorld);
      g.rig.shot(_v.x - 1.8, _v.y + 0.9, _v.z + 6.6, _v.x + 1.1, _v.y - 0.25, _v.z, { rate: 3, fov: 38 });
      return;
    }
    _v.set(p.x, 0.9, p.z).applyMatrix4(g.art.group.matrixWorld);
    const d = this.dist, a = this.orbit;
    const cx = _v.x + Math.sin(a) * d * Math.cos(this.pitch), cy = _v.y + Math.sin(this.pitch) * d + 0.8, cz = _v.z + Math.cos(a) * d * Math.cos(this.pitch);
    g.rig.shot(cx, cy, cz, _v.x, _v.y + 0.7, _v.z, { snap, rate: 6, fov: 42 });
  }
  frame(dt) {
    const g = this.game, ph = g.phys, doll = this.doll;
    g.syncIsland(dt);
    this.chase(false);
    const p = ph.pos;
    _iq.set(ph.q.x, ph.q.y, ph.q.z, ph.q.w).invert();
    const trudy = g.art.trudy;
    trudy.root.quaternion.copy(_iq).multiply(_q.setFromAxisAngle(_v.set(0, 1, 0), trudy.yaw));
    if (doll) {
      if (this.ragdoll) this.ragdoll.sync();
      else {
        doll.root.position.set(p.x, 0, p.z);
        // Most of the tilt is cancelled so the doll stands up against the crooked ground.
        doll.root.quaternion.copy(_iq);
        const sp = Math.hypot(ph.wantX, ph.wantZ);
        if (sp > 0.4) { doll.face(Math.atan2(ph.wantX, ph.wantZ)); doll.rig.loop('walk', { speed: Math.max(0.7, sp / 3.2) }); } else if (this.leanTut) {
          const i = this.input; doll.face(0);
          doll.root.quaternion.multiply(_q.setFromEuler(new THREE.Euler(i.wishZ * 0.25, 0, -i.wishX * 0.25)));
          doll.rig.loop('spread');
        } else doll.rig.loop(this.sleeping ? 'sleep' : 'idle');
      }
      doll.update(dt);
    }
    this.frameUI();
  }
  frameUI() {
    const g = this.game;
    const dev = g.input.lastDevice;
    if (dev !== this.lastDev) {
      this.lastDev = dev;
      const list = this.promptOverride && (this.leanTut) ? this.promptOverride : [['move', 'Walk'], ['interact', 'Use'], ['ask', "Today's plan"], ['look', 'Look']];
      this.promptsEl.innerHTML = list.map(([v, t]) => promptHTML(v, t, dev, g.save.settings.glyphs)).join('');
    }
    if (this.leanTut !== this.wasLean) { this.wasLean = this.leanTut; this.lastDev = null; }
    const modalNow = !!(g.ui.top && !g.ui.top.passive);
    this.promptsEl.style.display = modalNow ? 'none' : '';
    const f = g.ui.top && !g.ui.top.passive ? null : this.focus;
    const id = f ? f.id : null;
    if (id !== this.lastFocusId) {
      if (this.lastFocusId && MAP[this.lastFocusId]) g.art.outline(this.lastFocusId, false);
      this.lastFocusId = id;
      if (id && MAP[id]) g.art.outline(id, true);
      if (f) { this.label.style.display = ''; this.label.innerHTML = `${escapeHTML(f.label)} ${promptHTML('interact', '', dev, g.save.settings.glyphs)}`; } else this.label.style.display = 'none';
    }
    if (f) {
      const q = this.spotPos(f);
      g.art.group.updateWorldMatrix(true, false);
      _v.set(q.x, f.y, q.z).applyMatrix4(g.art.group.matrixWorld).project(g.camera);
      this.label.style.left = `${((_v.x * 0.5 + 0.5) * 100).toFixed(2)}%`;
      this.label.style.top = `${Math.max(8, (-_v.y * 0.5 + 0.5) * 100).toFixed(2)}%`;
    }
  }
  /** Test hook: walk the bot to a spot. */
  botDrive() { return null; }
}
function nameOf(id) { return { margaret: 'Gentle Margaret', kevin: 'Retired Kevin', sandras: 'Both Sandras', paul: 'Unsteady Paul', gerald: 'Young Gerald' }[id] || id; }
const escapeHTML = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export { diagram, openJournal, cosPick };
