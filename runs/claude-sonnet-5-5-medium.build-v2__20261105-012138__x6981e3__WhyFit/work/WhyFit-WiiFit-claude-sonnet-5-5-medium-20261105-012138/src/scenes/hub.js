// The island hub: isometric, the kit's full moveset, stations, Ounce hopping after you, classmates doing small loops.
import { BaseScene } from './base.js';
import { buildIsland, place } from '../art/world.js';
import { makeAvatar, playerLook, NPC_LOOKS, dress } from '../art/avatar.js';
import { Menu, panel, drawStars, layoutLog, inRect } from '../ui/widgets.js';
import { say, sayWrapped, wrap } from '../ui/font.js';
import { drawPrompts } from '../ui/prompts.js';
import { PauseMenu } from '../ui/screens/pause.js';
import { STATIONS, stationById } from '../data/stations.js';
import { ACTIVITIES, ACT_ORDER, HARD_DAY } from '../data/activities.js';
import { WEEK, dayOf, goalDone } from '../data/week.js';
import { ONE_LINERS, MORNING_REMARKS, pick, CLASSMATE } from '../data/lines.js';
import { key as recKey } from '../core/progress.js';
import { applySky, skyAt, compileClips, ContactShadow, HERO_CLIPS, HERO_MODEL, HERO_RIG, PlatformerCharacter, readMoveInput, setLookLayer, THREE, Squash, SpringChain, toonMaterial, PALETTE } from '../../pixel-engine.js';

const { Vector3 } = THREE;
const INTERACT = ['Enter', 'KeyE'];

export class StationMenu {
  id = 'station'; blocks = true;
  constructor(app, hub, st) {
    this.app = app; this.hub = hub; this.st = st; this.hard = false;
    const S = app.slot, day = S?.day ?? 1;
    const hardOn = day >= HARD_DAY || !!app.devUnlock;
    const items = st.acts.map((id) => {
      const A = ACTIVITIES[id], open = day >= A.unlock || !!app.devUnlock;
      const stars = (hd) => S.stars[recKey(id, hd)] ?? 0;
      return {
        label: A.name, disabled: !open,
        value: () => (open ? `${'*'.repeat(stars(this.hard))}${'-'.repeat(3 - stars(this.hard))} ${S.best[recKey(id, this.hard)] ?? '---'}` : `Day ${A.unlock}`),
        onSelect: () => { this.scene.pop(); app.go('activity', { id, hard: this.hard && hardOn }); },
      };
    });
    this.hardOn = hardOn;
    this.menu = new Menu(items, { w: 300, rowH: 17, title: st.name.length > 18 ? '' : st.name, maxRows: 7, name: 'station', onMove: () => app.sfx('move', { volume: 0.4 }), onDenied: () => app.sfx('deny') });
    this.remark = st.blurb;
  }
  update(nav) {
    this.menu.update(nav);
    if (this.hardOn && nav.triangle) { this.hard = !this.hard; this.app.sfx('confirm', { volume: 0.5 }); }
    if (nav.back || nav.rclick || nav.pause) { this.app.sfx('back'); this.scene.pop(); }
  }
  draw(hud) {
    this.menu.draw(hud);
    if (this.st.name.length > 18) say(hud, hud.width / 2, 14, this.st.name, { anchor: 'c', scale: 1, color: 'white', shadow: 'navy' });
    say(hud, hud.width / 2, hud.height - 54, this.remark, { anchor: 'c', color: 'white' });
    drawPrompts(this.app, hud, this.hardOn ? [['confirm', 'Go'], ['triangle', this.hard ? 'Normal' : 'Hard'], ['back', 'Back']] : [['confirm', 'Go'], ['back', 'Back']]);
  }
}
export class YesNo {
  id = 'yesno'; blocks = true;
  constructor(app, text, yes, no, yesLabel = 'Yes', noLabel = 'Not yet') { this.app = app; this.text = text; this.menu = new Menu([{ label: yesLabel, onSelect: () => { this.scene.pop(); yes(); } }, { label: noLabel, onSelect: () => { this.scene.pop(); no?.(); } }], { w: 160, rowH: 17, name: 'yesno', onMove: () => app.sfx('move', { volume: 0.4 }) }); this.no = no; }
  update(nav) { this.menu.update(nav); if (nav.back || nav.rclick) { this.scene.pop(); this.no?.(); } }
  draw(hud) { sayWrapped(hud, 20, 40, this.text, hud.width - 40, { color: 'white', scale: 1 }); this.menu.draw(hud); }
}

export class HubScene extends BaseScene {
  static id = 'hub';
  static camera = { preset: 'iso', zoom: 1.15 };
  constructor(app, args) { super(app, args); this.input = null; this.walkTarget = null; this.near = null; this.hover = null; this.lastBark = -99; this.npcs = []; this.phase = 'free'; this.o = new Vector3(); this.d = new Vector3(); this.feet = new Vector3(); this.gp = new Vector3(); }
  get S() { return this.app.slot; }
  async build(ctx) {
    const app = this.app, S = this.S, day = S.day;
    this.world = buildIsland(ctx);
    applySky(ctx.engine, skyAt(9));
    // hero: the kit's model, re-dressed
    const hm = (await ctx.loadModel(HERO_MODEL, { castShadow: false })).scene;
    dress(hm, playerLook(S)); setLookLayer(hm, 'actors');
    this.model = hm; this.shadow = new ContactShadow(0.42); ctx.scene.add(hm, this.shadow);
    const spawn = this.args.spawn ?? [0, 0, 6];
    this.hero = new PlatformerCharacter(ctx.physics, { position: spawn, lockDepth: false });
    this.hero.attachModel(hm, compileClips(HERO_CLIPS, HERO_RIG, hm), HERO_RIG);
    // Ounce, hopping after you
    const om = place(ctx, 'ounce', [spawn[0] + 2, 0, spawn[2] + 1], { scale: 1.4 });
    this.ounce = om.object; this.needle = this.ounce.getObjectByName('needle'); this.squash = new Squash(); this.hopT = 0; this.ounceGround = new Vector3(spawn[0] + 2, 0, spawn[2] + 1);
    // classmates
    await this.makeNpcs(ctx, day);
    this.app.music('plaza');
    if (day >= 4) this.plumbLine(ctx);
    if (day >= 5) { this.kev = place(ctx, 'kevin', [0, 1.6, 3], { scale: 0.7 }).object; }
    this.phase = 'free';
    app.slot.phase = app.slot.phase === 'morning' ? 'morning' : 'free';
  }
  plumbLine(ctx) {
    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.08), toonMaterial(PALETTE.slate)); rod.position.set(2.2, 1.1, 3.4); ctx.scene.add(rod);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08), toonMaterial(PALETTE.slate)); arm.position.set(1.9, 2.2, 3.4); ctx.scene.add(arm);
    const cord = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.6, 0.03), toonMaterial(PALETTE.white)); cord.position.set(1.6, 1.4, 3.4); ctx.scene.add(cord);
    const bob = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 6), toonMaterial(PALETTE.cyan)); bob.rotation.x = Math.PI; bob.position.set(1.6, 0.45, 3.4); ctx.scene.add(bob);
  }
  async makeNpcs(ctx, day) {
    const mk = async (id, look, at, loop, clip) => { const a = await makeAvatar(ctx, NPC_LOOKS[look]); a.addTo(ctx.scene); a.setPos(...at, 0); a.play(clip ?? 'Idle'); this.npcs.push({ id, a, loop, i: 0, wait: 0, pos: new Vector3(...at), clip: clip ?? 'Idle' }); };
    await mk('coach', 'coach', [-11, 0.2, 5.4], null, 'Idle');
    await mk('marguerite', 'marguerite', [-3.5, 0.2, 6], null, 'Sit');
    await mk('dennis', 'dennis', [9, 0, -7], [[9, -7], [13, -7], [13, -9], [9, -9]], 'Walk');
    await mk('june', 'june', [-9, 0, -8], [[-9, -8], [-13, -8], [-13, -11], [-9, -11]], 'Walk');
    const dm = this.npcs.find((n) => n.id === 'marguerite'); dm.a.setPos(-3.5, 0.45, 6.5, Math.PI / 2);
  }
  fixed(ctx, dt) {
    if (this.stack.length || this.app.dialogue.active) { this.hero.fixedUpdate(dt, this.input ?? (this.input = readMoveInput(ctx, this.hero, this.input))); return; }
    const inp = this.input = readMoveInput(ctx, this.hero, this.input);
    const ci = ctx.input;
    inp.jump = inp.jump || ci.consumePress('PadCross') && !this.near; inp.jumpHeld = inp.jumpHeld || ci.isDown('PadCross');
    inp.wave = inp.wave || ci.consumePress('PadTriangle'); inp.sit = inp.sit || ci.consumePress('PadSquare');
    this.stickDir(inp, ctx);
    if (this.walkTarget) {
      const f = this.hero.feetInto(this.feet); const dx = this.walkTarget.x - f.x, dz = this.walkTarget.z - f.z, d = Math.hypot(dx, dz);
      if (inp.move.lengthSq() > 0.01 || d < 0.45) { if (d < 0.45 && this.walkEnter) { const s = this.walkEnter; this.walkEnter = null; this.openStation(s); } this.walkTarget = null; }
      else inp.move.set(dx / d, 0, dz / d);
    }
    this.hero.fixedUpdate(dt, inp);
  }
  stickDir() {}
  update(ctx, dt) { super.update(ctx, dt); }
  tick(ctx, dt, blocked) {
    const app = this.app, nav = app.nav, hud = ctx.hud;
    this.world.update(dt);
    this.hero.updateVisual(this.model, dt, ctx.physics.alpha);
    const f = this.model.position;
    const ground = ctx.physics.groundBelow(this.gp.set(f.x, f.y + 0.1, f.z), 20, this.hero.body);
    if (ground) this.shadow.place(f.x, ground.y, f.z, f.y - ground.y);
    this.followOunce(dt);
    for (const n of this.npcs) this.moveNpc(n, dt);
    if (this.kev) { this.kev.position.set(this.ounce.position.x, this.ounce.position.y + 0.95 * 1.4, this.ounce.position.z); }
    // nearest station
    let best = null, bd = 1e9;
    for (const s of STATIONS) { const d = Math.hypot(f.x - s.x, f.z - s.z); if (d < s.r && d < bd) { best = s; bd = d; } }
    this.near = best;
    // mouse hover and click
    const dev = app.device;
    if (dev.last === 'mouse' && !blocked) this.mouseWorld(ctx);
    if (blocked) return;
    if (app.attract) { this.attractWalk(dt); return; }
    if (nav.pause) { this.openPause(); return; }
    if (this.near && (ctx.input.wasPressed('PadCross') || ctx.input.wasPressed('Enter', 'KeyE'))) { this.openStation(this.near); return; }
    if (nav.click && this.hoverStation) { this.walkTarget = new Vector3(this.hoverStation.x, 0, this.hoverStation.z + 1.6); this.walkEnter = this.hoverStation; }
    else if (nav.click && this.hoverPoint) { this.walkTarget = this.hoverPoint.clone(); this.walkEnter = null; }
    // Ounce barks
    if (this.t - this.lastBark > 6 && this.near && this.t > 3) { this.lastBark = this.t; this.nearBark(); }
  }
  attractWalk(dt) {
    const route = [[0, 8], [-9, 3], [-4, -3], [4, -3], [11, 3], [12, -8], [0, 9]];
    this.aw = this.aw ?? { i: 0, t: 0 }; this.aw.t += dt;
    if (!this.walkTarget || this.aw.t > 5) { this.aw.i = (this.aw.i + 1) % route.length; this.aw.t = 0; this.walkTarget = new Vector3(route[this.aw.i][0], 0, route[this.aw.i][1]); }
  }
  mouseWorld(ctx) {
    const p = ctx.input.pointer;
    ctx.camera.rayAt(p.x, p.y, this.o, this.d);
    const hit = ctx.physics.castRay(this.o, this.d, 200);
    this.hoverPoint = null; this.hoverStation = null;
    if (hit) { const pt = hit.point ?? this.o.clone().addScaledVector(this.d, hit.distance); this.hoverPoint = new Vector3(pt.x, 0, pt.z); for (const s of STATIONS) if (Math.hypot(pt.x - s.x, pt.z - s.z) < s.r) this.hoverStation = s; }
  }
  nearBark() {
    const S = this.S, st = this.near;
    const lines = { pavilion: ['Stillness is a muscle. So is regret. Coach says that. I just relay.'], shed: ['Reps are counted. Regrets are filed.'], beach: ['Hoops and steps. Rhythm is optional. Judgement is not.'], lagoon: ['The water is nearby. It has seen worse.'], jar: ['The Jar is not full. Neither, I think, are you.'], hall: ['The chart is honest. I only draw it.'], locker: ['Change into something less noted.'], hammock: ['Resting is also an activity. A quieter one.'], weigh: ['Step on me whenever you like. Ow, in advance.'], jog: ['Around the island. Once. I have timed it. It is long.'] };
    this.bark('ounce', (lines[st.id] ?? ['I have a remark. I am saving it.'])[0]);
  }
  followOunce(dt) {
    const f = this.model.position, g = this.ounceGround;
    const dx = f.x - g.x, dz = f.z - g.z, d = Math.hypot(dx, dz);
    const want = 2.4;
    if (d > want) { const s = Math.min(d - want, 5.5 * dt) / d; g.x += dx * s; g.z += dz * s; this.hopT += dt * 7; } else this.hopT += dt * 2;
    const hop = d > want + 0.05 ? Math.abs(Math.sin(this.hopT)) * 0.35 : Math.abs(Math.sin(this.hopT)) * 0.04;
    this.ounce.position.set(g.x, hop, g.z); this.ounce.rotation.y = Math.atan2(dx, dz);
    this.squash.update(dt); const [sxz, sy] = this.squash.scale(); this.ounce.scale.set(1.4 * sxz, 1.4 * sy, 1.4 * sxz);
    if (this.needle) this.needle.rotation.y = Math.PI + Math.sin(this.t * 2) * 0.3;
  }
  moveNpc(n, dt) {
    n.a.update(dt);
    if (!n.loop) return;
    const [tx, tz] = n.loop[n.i]; const dx = tx - n.pos.x, dz = tz - n.pos.z, d = Math.hypot(dx, dz);
    if (n.wait > 0) { n.wait -= dt; n.a.play(n.id === 'dennis' ? 'Wave' : 'Idle'); return; }
    if (d < 0.2) { n.i = (n.i + 1) % n.loop.length; n.wait = n.id === 'dennis' ? 3 : 2; return; }
    n.a.play('Walk'); n.pos.x += dx / d * 1.1 * dt; n.pos.z += dz / d * 1.1 * dt;
    n.a.setPos(n.pos.x, 0, n.pos.z, Math.atan2(dx, dz));
  }
  openPause() {
    const app = this.app;
    if (app.session) return;
    this.push(new PauseMenu(app, { island: null, dev: { open: () => app.openDev?.(this), about: () => app.openAbout?.(this) }, howto: 'Move with the stick, WASD or by clicking the ground. Walk up to a place to enter it. The hammock ends the day.' }));
  }
  openStation(st) {
    const app = this.app, S = this.S;
    app.sfx('confirm');
    if (st.acts.length) { this.push(new StationMenu(app, this, st)); return; }
    if (st.id === 'jar') app.go('jar'); else if (st.id === 'locker') { if (S.day >= 2) app.go('locker'); else this.bark('ounce', 'The Locker Room opens on Day 2. It is being tidied.'); }
    else if (st.id === 'hall') app.go('records');
    else if (st.id === 'hammock') this.hammock();
    else if (st.id === 'weigh') { if (S.day === 7 && !S.ended) this.push(new YesNo(app, 'Coach is ready. The whole island is ready. Are you?', () => app.go('activity', { id: 'longstand' }), null, 'Stand', 'Not yet')); else this.bark('ounce', 'You have been weighed today. Come back tomorrow. I will still be accurate.'); }
  }
  hammock() {
    const app = this.app, S = this.S, done = S.doneToday.length > 0;
    const goal = goalDone(S.day, S, ACTIVITIES);
    let msg = pick(ONE_LINERS.hammockOk, app.rng('hm'));
    if (!done) msg = pick(ONE_LINERS.hammockEarly, app.rng('hm')) + ' Rest anyway?';
    else if (!goal) msg = 'Coach\'s prescription is not done. She will not say anything. She will look at the ceiling. Rest?';
    else msg = 'End the day? ' + msg;
    this.push(new YesNo(app, msg, () => this.endDay(), null, 'Rest', 'Not yet'));
  }
  endDay() { const S = this.S; S.phase = 'evening'; this.app.commit(); this.app.go('report'); }
  draw(hud) {
    const S = this.S, w = hud.width, d = dayOf(S.day);
    hud.rect(0, 0, w, 36, 'night');
    say(hud, 12, 10, `Day ${S.day} of 7`, { color: 'white', scale: 2 });
    const done = goalDone(S.day, S, ACTIVITIES);
    say(hud, 12, 27, `Coach: ${d.goal.text}${done ? ' - done' : ''}`, { color: done ? 'lime' : 'sand' });
    say(hud, w - 12, 10, `Drips ${S.drips}`, { anchor: 'r', color: 'sky', scale: 2 });
    if (!this.stack.length) {
      if (this.near) drawPrompts(this.app, hud, [['jump', `Enter: ${this.near.name}`], ['wave', 'Wave']], {});
      else drawPrompts(this.app, hud, [['move', 'Walk'], ['jump', 'Jump'], ['pause', 'Menu']]);
      if (this.hoverStation && this.app.device.last === 'mouse') { const p = this.app.nav; say(hud, p.px + 10, p.py - 12, this.hoverStation.name, { color: 'white' }); }
    }
  }
  cameraTarget() { const p = this.model?.position; return p ? this._target.set(p.x, p.y + 0.9, p.z) : this._target.set(0, 0, 6); }
  status() { return `hub | day ${this.S.day} | near ${this.near?.id ?? '-'} | drips ${this.S.drips}`; }
  extraState() { const f = this.model?.position; return { near: this.near?.id ?? null, pos: f ? [f.x.toFixed(1), f.z.toFixed(1)] : null }; }
  fingerprint() { const f = this.model?.position; return `hub:${f?.x.toFixed(2)},${f?.z.toFixed(2)}`; }
}
