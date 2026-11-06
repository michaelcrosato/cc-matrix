// The Medley: Stillness, then Beat, then Balance. Family Hour on one TV, AI Hub ghosts online.
import { THREE } from '../../pixel-engine.js';
import { App } from '../app.js';
import { MedleyClock } from '../core/clock.js';
import { BotDriver, GhostDriver, KeyboardDriver, LocalDriver, PadDriver } from '../core/drivers.js';
import { GhostSender, hub, SEAT_COLORS, SEAT_PALETTE } from '../core/net.js';
import { Kevin, place } from '../art/props.js';
import { LOOKS, PRESET_LOOKS } from '../data/classmates.js';
import { MEDLEY } from '../data/medley.js';
import { ACTIVITIES } from '../data/activities.js';
import { TITLE } from '../data/title.js';
import { sanitize, say, sayCentered, sayRight, textWidth } from '../ui/font.js';
import { Menu } from '../ui/menu.js';
import { promptBar } from '../ui/prompts.js';
import { panel, star, STAR_W } from '../ui/widgets.js';
import { BaseScene, laneCamera } from './base.js';
import { buildLanes, playerInfo } from './activity/lanes.js';
import { cardInput, drawCard } from './card.js';
import { PoseEvent } from './activity/poses.js';
import { RepsEvent } from './activity/reps.js';
import { HoopEvent } from './activity/hoop.js';
import { StepEvent, STEP_CHART_MEDLEY } from './activity/step.js';
import { buildHeaderProps, HeaderEvent } from './activity/header.js';
import { box, plazaSet } from './sets.js';
import { stepSongFrom } from '../audio/songs.js';

const { Vector3 } = THREE;
const LOOK_ORDER = [LOOKS.june, LOOKS.dennis, LOOKS.marguerite, PRESET_LOOKS[1]];
const WINDOW = MEDLEY.eventSeconds + MEDLEY.breakSeconds;
export const MEDLEY_LENGTH = MEDLEY.events.length * MEDLEY.eventSeconds + (MEDLEY.events.length - 1) * MEDLEY.breakSeconds;

const SONG_FOR = { pose: 'hold', reps: 'rep', hoop: 'hoop', step: 'step', header: 'lagoon' };

export class MedleyScene extends BaseScene {
  name = 'medley';
  id = 'medley';
  canPause = true;
  centreDial = false;
  phase = 'intro';
  area = -1;
  phaseT = 0;
  ended = false;
  resultSent = false;

  constructor(args = {}) {
    super(args);
    this.session = !!args.session;
    this.family = args.family ?? null;
    this.pauseToTitle = !this.session;
  }

  cameraConfig() { return laneCamera(4); }

  async build(ctx) {
    plazaSet(ctx, 11);
    box(ctx, 14, 0.14, 4, [0, -0.05, 0.8], 'white', { cast: false });
    place(ctx, 'class-rail', { at: [0, 0, -3.1], params: { len: 14 } });
    this.kevin = new Kevin(ctx, { at: [-4.8, 1.11, -3.1], yaw: 0.4 });
    this.cosmetic = ctx.random.fork('cosmetic');
    this.rngPick = ctx.random.fork('medley-picks');
    this.hub = this.session ? hub() : null;
    this.clock = new MedleyClock(this.hub);
    this.ghostSender = new GhostSender();
    const rand = (() => { const r = ctx.random.fork('bots'); return () => r.next(); })();
    this.lanes = await buildLanes(ctx, this.specs(rand), { rand, xs: this.seatXs() });
    for (const l of this.lanes) { l.points = []; l.total = 0; l.lastNorm = 0; }
    this.local = this.lanes.filter((l) => l.isLocal);
    this.me = this.lanes.find((l) => l.isMe) ?? this.local[0] ?? null;
    this.playerLane = this.me;
    // Picks come from a seeded stream, so all copies choose the same.
    this.picks = MEDLEY.events.map((e) => this.args.picks?.[e.kind] ?? this.rngPick.pick(e.options));
    this.events = this.picks.map((id, i) => this.makeEvent(id, i));
    for (const lane of this.lanes) {
      if (!lane.ghost) await buildHeaderProps(ctx, lane);
      lane.hoopMeshes = [0, 1, 2, 3].map((i) => {
        const m = place(ctx, 'hoop', { palette: { hoop: ['red', 'sky', 'lime', 'sand'][i] }, actor: true, shadow: false }).object;
        m.visible = false;
        return m;
      });
    }
    this.current = null;
    App.music('title');
    if (this.session) this.connectHub(); else this.enterPhase('intro');
  }

  seatXs() {
    const n = this.session ? (App.session?.players.length ?? 1) : (this.family?.length ?? 1);
    return [[0], [-1, 1], [-2.2, 0, 2.2], [-3, -1, 1, 3]][n - 1] ?? [-3, -1, 1, 3];
  }

  specs(rand) {
    if (this.session) {
      const info = App.session;
      return info.players.map((p, i) => {
        const mine = p.id === info.me;
        return { name: p.name, look: LOOK_ORDER[i % LOOK_ORDER.length], driver: mine ? new LocalDriver() : new GhostDriver(), isLocal: mine, isMe: mine, isPlayer: mine, color: 'red', seat: p.id, matColor: SEAT_PALETTE[i], hex: SEAT_COLORS[i] };
      });
    }
    const list = this.family ?? [{ kind: 'keyboard' }];
    const playerI = playerInfo();
    return list.map((f, i) => {
      let driver;
      if (f.kind === 'pad') driver = new PadDriver(f.index, (x, y) => App.deadzone(x, y));
      else if (f.kind === 'bot') driver = new BotDriver(f.skill ?? 'average', rand);
      else driver = new KeyboardDriver();
      const human = f.kind !== 'bot';
      return { name: f.name ?? (human ? `Player ${i + 1}` : ['June', 'Dennis', 'Marguerite', 'Kevin'][i]), look: f.look ?? (i === 0 && App.slot ? playerI.look : PRESET_LOOKS[i]), driver, isLocal: human, isPlayer: false, color: 'red', seat: i, matColor: SEAT_PALETTE[i], hex: SEAT_COLORS[i] };
    });
  }

  makeEvent(id, i) {
    const def = ACTIVITIES[id];
    const rng = this.ctx.random.fork(`event:${i}`);
    const opts = { hard: {}, duration: MEDLEY.eventSeconds };
    if (def.family === 'pose') return new PoseEvent(this, this.lanes, rng, { pose: def.pose, hard: {}, hold: MEDLEY.poseHold, settle: 4, release: 2 });
    if (def.family === 'reps') return new RepsEvent(this, this.lanes, rng, { rep: def.rep, hard: {}, reps: MEDLEY.repsCount, extra: 0, duration: MEDLEY.eventSeconds });
    if (def.family === 'hoop') return new HoopEvent(this, this.lanes, rng, opts);
    if (def.family === 'step') return new StepEvent(this, this.lanes, rng, { ...opts, chart: STEP_CHART_MEDLEY });
    return new HeaderEvent(this, this.lanes, rng, { ...opts, range: 0.8 });
  }

  // ---- The hub ----------------------------------------------------------------------------

  connectHub() {
    const h = this.hub;
    this.enterPhase('card');
    this.cardState = { left: null, ready: [], asking: 0, asked: false, paused: false, starting: false };
    this.offs = [
      h.on('card', (c) => { this.cardState = c; }),
      h.on('start', () => this.onStart()),
      h.on('message', (d, from) => this.onMessage(d, from)),
      h.on('leave', (e) => this.onLeave(e)),
      h.on('time-up', () => this.sendResult()),
      h.on('end', () => this.onEnd()),
    ];
    // Enter answers Ready: a direct listener, because the card has no menus.
    this.keyHandler = (e) => {
      if (this.phase !== 'card') return;
      if (e.key === 'Enter') { this.answered = true; h.answer('ready'); }
      if (e.key === 'm' || e.key === 'M') h.answer('more');
    };
    if (typeof window !== 'undefined') window.addEventListener('keydown', this.keyHandler);
  }

  onStart() {
    if (this.started) return;
    this.started = true;
    this.enterPhase('countdown');
    this.ghostSender.start(() => this.ghostState(), this.hub);
  }

  ghostState() {
    if (this.ended) return null;
    const lane = this.me;
    if (!lane) return null;
    const ev = this.current;
    const [c, t] = ev ? ev.clipState(lane) : [0, 0];
    const score = this.scoreOf(lane);
    const [x, y] = ev ? ev.ghostPos(lane) : [0, 0];
    return { area: this.area, x: round3(x), y: round3(y), clip: c, time: round3(t), score, label: ev ? ACTIVITIES[this.picks[this.area]]?.name ?? '' : TITLE };
  }

  onMessage(d, from) {
    if (this.ended) return;
    const lane = this.lanes.find((l) => l.seat === from);
    if (!lane || !lane.ghost) return;
    lane.driver.receive(d);
    lane.score = lane.driver.score;
  }

  /** That avatar waves and walks off. The round goes on, host included. */
  onLeave(e) {
    const lane = this.lanes.find((l) => l.seat === e.id);
    if (!lane || lane.gone) return;
    lane.gone = true;
    lane.leaveT = 0;
    lane.avatar.play('Wave', { fade: 0.2 });
  }

  sendResult() {
    if (this.resultSent || !this.hub) return;
    this.resultSent = true;
    const lane = this.me;
    const score = this.scoreOf(lane);
    const stats = {};
    this.picks.forEach((id, i) => { stats[ACTIVITIES[id].name] = lane.points[i] ?? 0; });
    this.hub.result({ score, stats, awards: this.awardsFor(lane) });
    this.enterPhase('waiting');
  }

  onEnd() {
    this.ended = true;
    this.canPause = false; // After end the game takes no input.
    App.stack.clear();
    this.ghostSender.stop();
    this.ctx.audio.stopMusic();
    this.ctx.audio.stopLoops();
    App.voice.stop();
  }

  awardsFor(lane) {
    const a = MEDLEY.awards;
    const out = [];
    const pts = lane.points;
    if ((pts[0] ?? 0) >= 700) out.push(a.stillest);
    if ((pts[1] ?? 0) >= 700) out.push(a.beat);
    if ((pts[2] ?? 0) >= 500) out.push(a.headed);
    if (!out.length) out.push(a.apologetic);
    return out.map((x) => ({ title: x.title, detail: x.detail }));
  }

  // ---- The round ----------------------------------------------------------------------------

  enterPhase(p) {
    this.phase = p;
    this.phaseT = 0;
    if (p === 'podium') this.buildPodium();
  }

  scoreOf(lane) {
    if (!lane) return 0;
    if (lane.ghost) return lane.driver.score;
    const live = this.current && this.current.lanes.includes(lane) && this.phase === 'play' ? this.current.normalized(lane) : 0;
    return Math.round(lane.total + live);
  }

  eventIndexAt(t) {
    if (t < 0) return -1;
    if (t >= MEDLEY_LENGTH) return -2;
    const i = Math.floor(t / WINDOW);
    return t - i * WINDOW < MEDLEY.eventSeconds ? i : -1;
  }

  startEvent(i) {
    this.area = i;
    this.current = this.events[i];
    this.current.begin();
    const kind = this.current.kind;
    if (kind === 'step') { this.ctx.audio.playMusic(stepSongFrom(0, 24), 'step'); App.songName = 'step'; } else App.music(SONG_FOR[kind] ?? 'title');
    App.say('coach', ACTIVITIES[this.picks[i]].coach);
    for (const l of this.lanes) { if (l.hoopMeshes) for (const m of l.hoopMeshes) m.visible = false; }
    if (kind !== 'header') for (const l of this.lanes) { for (const s of l.stars ?? []) s.visible = false; if (l.objects) for (const o of l.objects) { o.mesh.visible = false; o.shadow.visible = false; } l.avatar.root.position.x = l.x; }
    if (kind === 'header') { this.current.launchZ = -7; this.current.apex = 1.5; }
  }

  closeEvent() {
    const ev = this.current;
    if (!ev) return;
    for (const lane of this.lanes) {
      if (lane.ghost) continue;
      ev.finishLane?.(lane);
      const pts = ev.normalized(lane);
      lane.points[this.area] = pts;
      lane.total += pts;
    }
    this.current = null;
    this.area = -1;
    this.breakRemark = this.cosmetic.pick(MEDLEY.remarks.middle);
    for (const lane of this.lanes) if (!lane.gone) lane.avatar.play('Idle', { fade: 0.3 });
    App.music('title');
  }

  onFixed(ctx, dt) {
    if (this.ended) return;
    this.phaseT += dt;
    switch (this.phase) {
      case 'intro':
        if (this.phaseT >= MEDLEY.introSeconds) { this.enterPhase('play'); this.clock.local = 0; }
        break;
      case 'countdown':
        if (this.hub.time() >= 0) this.enterPhase('play');
        break;
      case 'play': {
        this.clock.tick(dt);
        const t = this.clock.now();
        const i = this.eventIndexAt(t);
        if (i === -2) { this.closeEvent(); this.finishRound(); break; }
        if (i !== this.area) {
          if (this.area >= 0) this.closeEvent();
          if (i >= 0) this.startEvent(i);
        }
        if (this.current) {
          const et = t - this.area * WINDOW;
          this.eventT = et;
          this.current.step(ctx, dt, et, true);
        }
        break;
      }
      default:
        break;
    }
  }

  finishRound() {
    if (this.session) { this.sendResult(); return; }
    this.enterPhase('podium');
  }

  onInput(ctx) {
    const { input } = ctx;
    if (this.phase === 'card') cardInput(ctx, this);
    // The menu waits for Ounce to finish her remark, which sits where the menu goes.
    if (this.phase === 'podium' && this.menu && !this.bark.active) this.menu.update(ctx, 0);
  }

  buildPodium() {
    const order = [...this.lanes].sort((a, b) => b.total - a.total);
    this.order = order;
    const steps = [[0, 0.9], [-1.6, 0.6], [1.6, 0.35], [3.2, 0.05]];
    order.forEach((lane, i) => {
      const [x, h] = steps[i] ?? [0, 0];
      if (h > 0.06) box(this.ctx, 1.5, h, 1.4, [x, h / 2, -0.4], 'white');
      lane.avatar.root.position.set(x, h, -0.4);
      lane.avatar.groundY = h;
      lane.avatar.root.rotation.y = 0;
      lane.avatar.play(i === 0 ? 'Victory' : i === order.length - 1 ? 'Slump' : 'Wave', { fade: 0.3 });
    });
    App.sfx('fanfareSoft');
    App.music('report');
    const remark = order.length > 1 ? this.cosmetic.pick(MEDLEY.remarks.first) : this.cosmetic.pick(MEDLEY.remarks.middle);
    App.say('ounce', remark);
    this.awards = order.map((l) => this.awardsFor(l)[0]);
    this.menu = new Menu([
      { label: 'Rematch', id: 'rematch', action: () => App.go('medley', { ...this.args }) },
      { label: 'Back to title', id: 'title', action: () => App.go('title', { menu: 'main' }) },
    ], { width: 200, align: 'center', y: 0 });
    for (const l of this.lanes) { if (l.hoopMeshes) for (const m of l.hoopMeshes) m.visible = false; }
  }

  onUpdate(ctx, dt) {
    this.kevin.update(dt);
    if (this.current) this.current.visual(ctx, dt, this.eventT ?? 0);
    else for (const l of this.lanes) {
      if (l.ghost && !l.gone) l.driver.lerp(dt);
      if (!l.gone || l.leaveT === undefined) l.avatar.update(dt);
    }
    for (const l of this.lanes) {
      if (l.gone) {
        l.leaveT += dt;
        if (l.leaveT > 1.4) { l.avatar.play('Walk', { fade: 0.2 }); l.avatar.root.rotation.y = 1.57 * (l.x >= 0 ? 1 : -1); l.avatar.root.position.x += (l.x >= 0 ? 1 : -1) * dt * 1.8; }
        l.avatar.update(dt);
        if (l.leaveT > 6) l.avatar.root.visible = false;
      } else if (l.ghost) {
        // Hide a ghost that's in a different part of the round.
        l.avatar.root.visible = this.phase !== 'play' || l.driver.area === this.area;
      }
    }
  }

  onDraw(ctx) {
    const { hud } = ctx;
    switch (this.phase) {
      case 'card': drawCard(ctx, this); return;
      case 'intro': this.drawIntro(ctx); return;
      case 'countdown': {
        const n = Math.max(1, Math.ceil(-this.hub.time() / 1000));
        sayCentered(hud, hud.width / 2, Math.round(hud.height * 0.32), String(n), { scale: 5, color: 'sand', name: 'count' });
        this.drawNames(ctx);
        return;
      }
      case 'play': this.drawPlay(ctx); return;
      case 'waiting':
        panel(hud, Math.round(hud.width / 2) - 100, 40, 200, 34, { fill: 'white', name: 'waiting' });
        sayCentered(hud, hud.width / 2, 46, 'Thank you. I have written that down.', { color: 'ink', shadow: false, name: 'waiting-text' });
        sayCentered(hud, hud.width / 2, 58, `Your score: ${this.scoreOf(this.me)}`, { color: 'teal', shadow: false, name: 'waiting-score' });
        this.drawNames(ctx);
        return;
      case 'podium': this.drawPodium(ctx); return;
      default:
    }
  }

  /** Name tags, in seat colours. On the card a tag also says who's ready. */
  drawNames(ctx, ready = null) {
    const { hud } = ctx;
    for (const lane of this.lanes) {
      if (lane.gone && lane.leaveT > 3) continue;
      if (!lane.avatar.root.visible) continue;
      const v = new Vector3(lane.avatar.root.position.x, lane.avatar.root.position.y + 2.05, lane.avatar.root.position.z).project(ctx.camera.camera);
      const x = (v.x + 1) * 0.5 * hud.width, y = (1 - v.y) * 0.5 * hud.height;
      const name = `${sanitize(lane.name).slice(0, 10)}${ready?.has(lane.seat) ? ' ok' : ''}`;
      const w = textWidth(name) + 6;
      const bx = Math.max(12, Math.min(hud.width - w - 12, Math.round(x - w / 2)));
      hud.rect(bx, Math.round(y) + 2, w, 11, lane.hex ?? 'navy');
      say(hud, bx + 3, Math.round(y) + 4, name, { color: 'white', name: 'lane-name' });
    }
  }

  drawIntro(ctx) {
    const { hud } = ctx;
    const cx = Math.round(hud.width / 2);
    hud.rect(cx - 90, 12, 180, 24, 'navy');
    sayCentered(hud, cx, 16, 'The Medley', { scale: 2, color: 'white', name: 'title' });
    const w = Math.min(hud.width - 24, 300);
    panel(hud, cx - Math.round(w / 2), 40, w, this.picks.length * 11 + 8, { fill: 'white', name: 'intro-panel' });
    this.picks.forEach((id, i) => sayCentered(hud, cx, 44 + i * 11, `${i + 1}. ${ACTIVITIES[id].name}`, { color: 'ink', shadow: false, name: 'intro-event' }));
    this.drawNames(ctx);
  }

  drawPlay(ctx) {
    const { hud } = ctx;
    const t = this.clock.now();
    // Standings along the top: one small cell a player.
    this.drawStandings(ctx);
    if (this.current) {
      this.current.draw(ctx, this.eventT ?? 0);
      const left = Math.ceil(MEDLEY.eventSeconds - (this.eventT ?? 0));
      sayCentered(hud, hud.width / 2, hud.height - 22, `${ACTIVITIES[this.picks[this.area]].name}  ${left}s`, { color: 'white', name: 'event-name' });
    } else {
      const next = Math.floor(t / WINDOW) + 1;
      const until = Math.ceil(next * WINDOW - t);
      const w = Math.min(hud.width - 24, 300);
      const cx = Math.round(hud.width / 2);
      panel(hud, cx - Math.round(w / 2), 30, w, 42, { fill: 'white', name: 'break' });
      sayCentered(hud, cx, 34, `Next: ${ACTIVITIES[this.picks[next]]?.name ?? ''}`, { color: 'teal', shadow: false, name: 'next-event' });
      sayCentered(hud, cx, 46, this.breakRemark ?? '', { color: 'ink', shadow: false, name: 'break-remark' });
      sayCentered(hud, cx, 58, `${until}s`, { color: 'slate', shadow: false, name: 'break-count' });
    }
    this.drawNames(ctx);
  }

  drawStandings(ctx) {
    const { hud } = ctx;
    const cells = this.lanes;
    const w = Math.min(Math.floor((hud.width - 24) / cells.length) - 2, 112);
    const total = cells.length * (w + 2) - 2;
    let x = Math.round((hud.width - total) / 2);
    for (const lane of cells) {
      hud.rect(x, 12, w, 12, lane.gone ? 'slate' : lane.hex ?? 'navy');
      const name = sanitize(lane.name).slice(0, Math.max(3, Math.floor((w - 34) / 6)));
      say(hud, x + 2, 14, name, { color: 'white', shadow: false, name: 'standing' });
      sayRight(hud, x + w - 2, 14, String(this.scoreOf(lane)), { color: 'white', shadow: false, name: 'standing-score' });
      x += w + 2;
    }
  }

  drawPodium(ctx) {
    const { hud } = ctx;
    const cx = Math.round(hud.width / 2);
    hud.rect(cx - 90, 10, 180, 24, 'navy');
    sayCentered(hud, cx, 14, 'The Podium', { scale: 2, color: 'white', name: 'title' });
    const w = Math.min(hud.width - 24, 330);
    const x = cx - Math.round(w / 2);
    panel(hud, x, 38, w, this.order.length * 12 + 8, { fill: 'white', name: 'podium-panel' });
    this.order.forEach((lane, i) => {
      const y = 42 + i * 12;
      const medal = ['sand', 'mist', 'orange', 'slate'][i];
      star(hud, x + 5, y, true);
      hud.rect(x + 5 + STAR_W + 2, y + 1, 3, 7, medal);
      say(hud, x + 24, y, `${sanitize(lane.name).slice(0, 10)}  ${lane.total}`, { color: 'ink', shadow: false, name: 'podium-row' });
      const a = this.awards[i];
      if (a && w > 240) sayRight(hud, x + w - 5, y, a.title, { color: 'teal', shadow: false, name: 'podium-award' });
    });
    if (this.menu && !this.bark.active) {
      this.menu.o.y = Math.max(38 + this.order.length * 12 + 12, hud.height - 74);
      this.menu.draw(ctx);
      promptBar(hud, App.device, [['confirm', 'Select']]);
    }
  }

  barkBottom() { return this.phase === 'podium' ? 30 : 34; }

  overlayDot() { const l = this.me; return l ? `${l.dot.x.toFixed(2)},${l.dot.y.toFixed(2)} area ${this.area}` : '-'; }
  status() {
    const t = this.clock?.now?.() ?? 0;
    return `medley | ${this.phase} | area ${this.area} | t ${Number.isFinite(t) ? t.toFixed(1) : 'waiting'} | ${(this.lanes ?? []).map((l) => this.scoreOf(l)).join(',')}`;
  }
  fingerprint() { return (this.lanes ?? []).map((l) => (l.ghost ? '' : `${l.total}|${l.dot.x.toFixed(4)}`)).join(';'); }

  dispose() {
    this.ghostSender?.stop();
    for (const off of this.offs ?? []) off?.();
    if (this.keyHandler && typeof window !== 'undefined') window.removeEventListener('keydown', this.keyHandler);
  }
}

const round3 = (v) => Math.round(v * 1000) / 1000;
