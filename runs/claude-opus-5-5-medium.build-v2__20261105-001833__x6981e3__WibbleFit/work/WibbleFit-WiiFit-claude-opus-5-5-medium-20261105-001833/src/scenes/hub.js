// The island: walk between stations. Jumping and waving have no purpose and are still here.
import { compileClips, ContactShadow, HERO_MODEL, HERO_RIG, PALETTE, PlatformerCharacter, readMoveInput, setLookLayer, Squash, THREE, toonMaterial, applySky, skyAt } from '../../pixel-engine.js';
import { App } from '../app.js';
import { dress, makeAvatar } from '../art/avatar.js';
import { ALL_CLIPS } from '../art/clips.js';
import { buildIsland } from '../art/island.js';
import { place } from '../art/stage.js';
import { ACTIONS } from '../core/actions.js';
import { isOpen, hardOpen, openedToday, scheduleDay } from '../core/progress.js';
import { ACT, STATION_ACTS } from '../data/activities.js';
import { AVATARS, CAST_LOOKS } from '../data/classmates.js';
import { BARKS, STORY } from '../data/lines.js';
import { STATIONS } from '../data/stations.js';
import { weekDay } from '../data/week.js';
import { plate, say, textWidth, wrap } from '../ui/font.js';
import { talk } from '../ui/dialogue.js';
import { Menu, pointerArt } from '../ui/menu.js';
import { prompt, promptBar, promptWidth } from '../ui/prompts.js';
import { note, panel, stars } from '../ui/widgets.js';
import { BaseScene } from './base.js';
const { Vector3 } = THREE;

export class StationMenu {
  id = 'station'; attractable = false;
  constructor(scene, key) {
    this.scene = scene; this.key = key;
    const st = STATIONS[key], slot = App.slot; this.remark = st.remark;
    const acts = STATION_ACTS(key); this.hard = false; this.hardOk = hardOpen(slot);
    const items = acts.map((a) => {
      const open = isOpen(slot, a.id);
      const r = slot?.records[a.id];
      return { label: open ? a.name : `Opens day ${a.day}`, disabled: !open, on: () => App.go('activity', { id: a.id, mode: 'week', hard: this.hard }),
        value: () => (open && r ? String(Math.round(r.best)) : ''), rstars: r?.stars ?? 0, draw: (hud, x, ry, w) => { if (open && r) stars(hud, x + w - 100, ry + 2, r.stars, 1); } };
    });
    if (this.hardOk) items.push({ label: 'Version', value: () => (this.hard ? 'Hard' : 'Normal'), adjust: () => { this.hard = !this.hard; }, on: () => { this.hard = !this.hard; } });
    items.push({ label: 'Back', on: () => App.close(this) });
    this.menu = new Menu({ title: st.name, items, onBack: () => App.close(this), scale: 1, rowH: 15, w: Math.min(App.ctx.hud.width - 24, 340), maxRows: 8 });
  }
  update(ctx, dt) { this.menu.update(ctx, dt); }
  draw(hud) {
    const r = this.menu.draw(hud);
    const lines = wrap(this.remark, 52), rh = lines.length * 10 + 8;
    if (r.y + r.h + rh + 18 < hud.height) { panel(hud, r.x, r.y + r.h + 3, r.w, rh, 'ink', 'teal'); lines.forEach((l, i) => say(hud, r.x + 8, r.y + r.h + 7 + i * 10, l, { color: 'white', shadow: false })); }
    promptBar(hud, [['confirm', 'Select'], ['back', 'Back']]);
  }
}
export class HubScene extends BaseScene {
  id = 'hub'; canPause = true; near = null; barkIn = 4; nav = null; ounceHop = 0; npc = [];
  camera() { return { preset: 'iso', zoom: 1.15 }; }
  async build(ctx) {
    this.ctx = ctx;
    this.world = await buildIsland(ctx);
    App.music('plaza');
    const slot = App.slot, look = slot?.look ?? AVATARS[0];
    const m = await ctx.loadModel(HERO_MODEL, { castShadow: false });
    dress(m.scene, { ...look, items: slot?.look?.equipped });
    this.model = m.scene; setLookLayer(this.model, 'actors');
    this.shadow = new ContactShadow(0.42);
    ctx.scene.add(this.model, this.shadow);
    const start = this.args.at ?? [0, 0.1, 6.5];
    this.hero = new PlatformerCharacter(ctx.physics, { position: start, lockDepth: false });
    this.hero.attachModel(this.model, compileClips(ALL_CLIPS, HERO_RIG, this.model), HERO_RIG);
    this.input = null; this.f = new Vector3(); this.tmp = new Vector3(); this.ro = new Vector3(); this.rd = new Vector3();
    this.ounce = place(ctx, 'ounce', start[0] + 1.6, 0, start[2] + 1, { actors: true, scale: 1.4 }); this.oSq = new Squash();
    this.needle = this.ounce.object.getObjectByName('needle');
    this.ox = start[0] + 1.6; this.oz = start[2] + 1; this.oy = 0; this.ovy = 0; this.oFacing = 0;
    // Life: classmates on small loops.
    for (const [who, x, z, clip, r] of [['coach', -11, 6.8, 'Tree', 0], ['marguerite', -6, 6, 'Idle', 1.2], ['dennis', 8.6, -2, 'Teeter', 0.6], ['june', 10, -8, 'Sit', 0]]) {
      const a = await makeAvatar(ctx, CAST_LOOKS[who]); a.setAt(x, 0, z, 0); a.play(clip);
      this.npc.push({ who, a, x, z, r, clip, ph: this.cosmetic.next() * 6 });
    }
    this.kevin = place(ctx, 'kevin', 7, 1.0, -1, { actors: true });
    this.jarFluid();
    if (slot?.phase === 'free' && !this.args.attract && !this.args.silent) this.dayIntro();
    this.highlight = null;
    this.walkT = 0;
    applySky(ctx.engine, skyAt(this.args.sky ?? 11));
  }
  jarFluid() {
    const slot = App.slot, { MILESTONES } = {};
    void MILESTONES;
    const f = Math.min(1, (slot?.drips ?? 0) / 175);
    const THREEm = THREE;
    const m = new THREEm.Mesh(new THREEm.CylinderGeometry(0.96, 0.96, 1, 12), toonMaterial(PALETTE.sky));
    m.scale.y = Math.max(0.02, f * 2.2); m.position.set(4, 0.4 + m.scale.y / 2, -4); this.ctx.scene.add(m);
    const s = new THREEm.Mesh(new THREEm.BoxGeometry(0.1, 1, 0.04), toonMaterial(PALETTE.white)); s.scale.y = m.scale.y * 0.8; s.position.set(3.55, m.position.y, -3.05); this.ctx.scene.add(s);
  }
  dayIntro() {
    const slot = App.slot; if (slot.dayIntroDone === slot.day) return;
    slot.dayIntroDone = slot.day; App.writeSave();
    const d = scheduleDay(slot.day);
    if (slot.week === 1) talk(STORY.days[d], () => {
      const opened = openedToday(slot).map((id) => ACT[id].name);
      if (opened.length) App.barkLine(`Open today: ${opened.slice(0, 2).join(', ')}${opened.length > 2 ? '...' : '.'}`, 'ounce', 3.4);
    });
  }
  // Stations you can use right now.
  stationKeys() {
    const slot = App.slot, out = [];
    for (const [k, s] of Object.entries(STATIONS)) {
      if (k === 'terrace') continue;
      if (s.unlockDay && (!slot || (slot.week === 1 && slot.day < s.unlockDay))) continue;
      out.push(k);
    }
    return out;
  }
  frame(ctx, dt, rdt, free) {
    const feet = this.model.position;
    this.hero.updateVisual(this.model, dt, ctx.physics.alpha);
    const g = ctx.physics.groundBelow(this.tmp.set(feet.x, feet.y + 0.1, feet.z), 20, this.hero.body);
    if (g) this.shadow.place(feet.x, g.y, feet.z, feet.y - g.y);
    this.target.set(feet.x, feet.y + 0.9, feet.z);
    this.world.update(ctx, dt);
    this.world.grass.push?.(0, feet, 0.8);
    // Near a station?
    this.near = null; let bd = Infinity;
    for (const k of this.stationKeys()) { const st = STATIONS[k], d = Math.hypot(st.at[0] - feet.x, st.at[1] - feet.z), r = st.reach ?? 3; if (d < r && d - r < bd) { bd = d - r; this.near = k; } }
    // Mouse: hovering a station names it; clicking walks there and enters.
    this.hover = null;
    if (App.device.last === 'mouse' && !App.top()) {
      const p = ctx.input.pointer; ctx.camera.rayAt(p.x, p.y, this.ro, this.rd);
      const t = this.rd.y < 0 ? -this.ro.y / this.rd.y : null;
      if (t !== null) {
        const hx = this.ro.x + this.rd.x * t, hz = this.ro.z + this.rd.z * t;
        let best = 4; for (const k of this.stationKeys()) { const s = STATIONS[k], d = Math.hypot(s.at[0] - hx, s.at[1] - hz); if (d < best) { best = d; this.hover = k; } }
        if (ctx.input.wasPressed('MouseLeft') && free && !(pointerArt(ctx).x > ctx.hud.width - 22 && pointerArt(ctx).y < 22)) {
          if (this.hover) { const s = STATIONS[this.hover]; this.nav = { x: s.at[0], z: s.at[1], enter: this.hover }; } else this.nav = { x: hx, z: hz };
        }
      }
    }
    if (free && !this.attract) {
      const i = ctx.input;
      if (this.near && i.wasPressed('PadCross', 'Enter', 'Space', 'KeyE')) { i.clearQueued('Space', 'PadCross'); this.interact(this.near); this.jumpBlock = 8; }
    }
    this.updateOunce(ctx, dt, free);
    this.updateNpcs(ctx, dt);
    if (App.settings) {
      this.barkIn -= dt;
      if (this.barkIn <= 0 && free && !App.bark) { this.barkIn = 8 + this.cosmetic.next() * 6; App.barkLine(this.cosmetic.pick(BARKS.hub), 'ounce', 3.4); }
    }
    this.footT = (this.footT ?? 0) + dt * (this.hero.speed > 0.5 ? this.hero.speed : 0);
    if (this.footT > 1.6) { this.footT = 0; if (feet.y < 0.2 && Math.abs(feet.x) > 8 && feet.z < -5) this.world.decals.add('footprint', [feet.x, 0.02, feet.z], [0, 1, 0], { size: 0.5 }); }
  }
  tick(ctx, dt) {
    if (!this.hero) return;
    this.input = readMoveInput(ctx, this.hero, this.input);
    const i = this.input;
    // Hero wrapper: pad buttons, on top of the kit's keys.
    if (ctx.input.consumePress('PadCross')) i.jump = true;
    if (ctx.input.isDown('PadCross')) i.jumpHeld = true;
    if (ctx.input.consumeAny(ACTIONS.wave)) i.wave = true;
    if (ctx.input.consumeAny(ACTIONS.sit)) i.sit = true;
    // These kit keys mean something else here.
    if (App.device.last === 'pad' || true) { i.attack = false; i.grab = false; }
    if (this.jumpBlock > 0) { this.jumpBlock--; i.jump = false; i.jumpHeld = false; }
    if (App.blocked()) { i.move.set(0, 0, 0); i.jump = false; i.jumpHeld = false; i.wave = false; i.sit = false; i.crouch = false; }
    else if (this.attract) this.attractWalk(ctx, i);
    else if (this.nav) {
      const f = this.hero.feetInto(this.f), dx = this.nav.x - f.x, dz = this.nav.z - f.z, d = Math.hypot(dx, dz);
      const manual = Math.hypot(i.move.x, i.move.z) > 0.05;
      const reach = this.nav.enter ? 3 : 0.4;
      if (manual) this.nav = null;
      else if (d < reach) { const e = this.nav.enter; this.nav = null; if (e) this.interact(e); }
      else i.move.set(dx / d, 0, dz / d);
    }
    this.hero.fixedUpdate(dt, i);
  }
  attractWalk(ctx, i) {
    const route = [[-8, 3], [-7, -6], [7, -6], [8, 3], [0, 8]];
    this.wp = this.wp ?? 0;
    const f = this.hero.feetInto(this.f), [x, z] = route[this.wp], dx = x - f.x, dz = z - f.z, d = Math.hypot(dx, dz);
    if (d < 1) this.wp = (this.wp + 1) % route.length; else i.move.set(dx / d, 0, dz / d);
    this.attractJ = (this.attractJ ?? 0) + 1;
    i.jump = this.attractJ % 200 === 0; i.jumpHeld = i.jump;
  }
  updateOunce(ctx, dt, free) {
    const feet = this.model.position, o = this.ounce.object;
    const dx = feet.x + 1.5 - this.ox, dz = feet.z - 0.9 - this.oz, d = Math.hypot(dx, dz);
    this.oFacing = Math.atan2(feet.x - this.ox, feet.z - this.oz);
    this.ovy -= 22 * dt; this.oy += this.ovy * dt;
    if (this.oy <= 0) {
      if (this.ovy < -1) { this.oSq.kick(-2.4); }
      this.oy = 0; this.ovy = 0;
      if (d > 1.2) { this.ovy = 4.6; this.oSq.kick(2); if (d < 12) App.sfx('hop', { volume: 0.25 }); this.hopVx = (dx / d) * Math.min(5.2, d * 2); this.hopVz = (dz / d) * Math.min(5.2, d * 2); } else { this.hopVx = 0; this.hopVz = 0; }
    }
    this.ox += (this.hopVx ?? 0) * dt; this.oz += (this.hopVz ?? 0) * dt;
    this.oSq.update(dt); const [h, v] = this.oSq.scale();
    o.position.set(this.ox, this.oy, this.oz); o.rotation.y = this.oFacing; o.scale.set(1.4 * h, 1.4 * v, 1.4 * h);
    if (this.needle) this.needle.rotation.y = Math.PI + Math.sin(ctx.time * 2.3) * 0.5;
  }
  updateNpcs(ctx, dt) {
    for (const n of this.npc) {
      if (n.r > 0 && n.clip === 'Idle') {
        n.ph += dt * 0.4; const x = n.x + Math.cos(n.ph) * n.r, z = n.z + Math.sin(n.ph) * n.r;
        n.a.root.rotation.y = Math.atan2(x - n.a.root.position.x, z - n.a.root.position.z);
        n.a.root.position.set(x, 0, z); n.a.play('Walk', { speed: 0.5 });
      }
      n.a.update(dt);
    }
    const k = this.kevin.object, w = Math.sin(ctx.time * 11) > 0.6 && Math.sin(ctx.time * 0.5) > 0.5 ? 0.7 : 0;
    const wl = k.getObjectByName('wingL'), wr = k.getObjectByName('wingR'); if (wl) wl.rotation.z = w; if (wr) wr.rotation.z = -w;
  }
  interact(k) {
    const st = STATIONS[k];
    if (k === 'hammock') return this.hammock();
    if (st.kind === 'scene') { App.go(st.scene, {}); return; }
    App.open(new StationMenu(this, k));
  }
  hammock() {
    const slot = App.slot;
    const confirm = () => {
      App.open(new class extends Object {
        id = 'hammock'; menu = new Menu({ title: 'End the day?', items: [{ label: 'Lie down', on: () => { App.close(this.self); App.go('report'); } }, { label: 'Not yet', on: () => App.close(this.self) }], onBack: () => App.close(this.self), scale: 2 });
        constructor() { super(); this.self = this; }
        update(c, d) { this.menu.update(c, d); }
        draw(h) { this.menu.draw(h); promptBar(h, [['confirm', 'Select'], ['back', 'Back']]); }
      }());
    };
    if (!slot) { App.go('title'); return; }
    if (slot.week === 1 && slot.day === 7 && !slot.today.includes('longstand')) { talk([{ who: 'coach', text: 'Stand.' }], () => App.go('activity', { id: 'longstand', mode: 'week' })); return; }
    if (slot.today.length === 0) talk(wrapLines(this.cosmetic.pick(BARKS.leavingEarly)), confirm);
    else confirm();
  }
  draw(ctx, hud) {
    const slot = App.slot, W = hud.width, H = hud.height;
    if (slot && !App.attract) {
      const d = slot.week > 1 ? `Week ${slot.week}, day ${scheduleDay(slot.day)}` : `Day ${slot.day}`;
      plate(hud, 12, 12, d, { scale: 2, color: 'white' }); note(12, 12, textWidth(d, 2), 14, 'hud-day');
      const dr = `${slot.drips} Drips`; plate(hud, W - 12 - 22 - textWidth(dr, 2), 12, dr, { scale: 2, color: 'cyan' }); note(W - 34 - textWidth(dr, 2), 12, textWidth(dr, 2), 14, 'hud-drips');
      const g = weekDay(scheduleDay(slot.day)).goalText;
      plate(hud, 12, 31, `${slot.goalDone ? 'Done: ' : 'Prescription: '}${g}`, { color: slot.goalDone ? 'lime' : 'sand' });
    }
    if (App.top() || App.attract) return;
    const show = this.near ?? this.hover;
    const list = [];
    if (show) {
      const s = STATIONS[show], text = show === 'hammock' ? `End the day: ${s.name}` : `Enter: ${s.name}`;
      list.push(['confirm', text]);
    }
    if (App.device.last !== 'mouse') list.push(['jump', 'Jump'], ['wave', 'Wave'], ['sit', 'Sit']); else list.push(['walk', 'Click to walk']);
    list.push(['pause', 'Pause']);
    promptBar(hud, W < 420 ? list.slice(0, 3) : list);
  }
  barkY(hud) { return 46; }
  status() { return `hub | day ${App.slot?.day ?? '-'} | near ${this.near ?? '-'} | hero ${this.model ? `${this.model.position.x.toFixed(1)},${this.model.position.z.toFixed(1)}` : ''}`; }
  fingerprint() { return this.status(); }
  ready(ctx) { /* attract keeps walking */ }
}
const wrapLines = (t) => [{ who: 'ounce', mood: 'wince', text: t }];
export { promptWidth, prompt, panel, isOpen };
