// Lane staging: up to 4 mats in a row, each with its own driver (local, bot or ghost).
import { App } from '../../app.js';
import { BotDriver, LocalDriver } from '../../core/drivers.js';
import { makeAvatar } from '../../art/avatar.js';
import { place } from '../../art/props.js';
import { CLASSMATE_SKILL, LOOKS, PRESET_LOOKS } from '../../data/classmates.js';
import { ActivityScene } from './base.js';
import { Lane } from './events.js';
import { matsFor } from '../sets.js';
import { topRow } from '../../ui/activity-hud.js';

const PAIRS = [['june', 'dennis'], ['marguerite', 'dennis'], ['june', 'marguerite'], ['dennis', 'marguerite']];
const SEAT_NAMES = { june: 'June', dennis: 'Dennis', marguerite: 'Marguerite' };

/** Mats and avatars. specs: [{ name, who, look, driver, isPlayer, isLocal, color }] */
export async function buildLanes(ctx, specs, { rand, mat = 'yoga-mat', matOpts = {}, xs = null, z = 0.8, yaw = 0 } = {}) {
  const positions = xs ?? matsFor(specs.length);
  const lanes = [];
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    const x = positions[i];
    const lane = new Lane({ index: i, x, z, rand, ...s });
    if (mat) lane.mat = place(ctx, mat, { at: [x, 0, z], palette: s.matColor && mat === 'yoga-mat' ? { mat: s.matColor } : undefined, shadow: false, ...matOpts });
    lane.avatar = await makeAvatar(ctx, s.look ?? PRESET_LOOKS[i % PRESET_LOOKS.length], { at: [x, mat === 'step-platform' ? 0.28 : mat ? 0.05 : 0, z], yaw });
    lanes.push(lane);
  }
  return lanes;
}

/** You on the centre mat, two classmates as bots. */
export function soloSpecs(player, botRand, pairIndex = 0) {
  const [a, b] = PAIRS[pairIndex % PAIRS.length];
  const bot = (who) => ({ name: SEAT_NAMES[who], who, look: LOOKS[who], driver: new BotDriver(CLASSMATE_SKILL[who], botRand), color: 'slate', matColor: who === 'june' ? 'plum' : who === 'dennis' ? 'lime' : 'mist' });
  return [bot(a), { name: player.name, look: player.look, driver: new LocalDriver(), isPlayer: true, isLocal: true, color: 'red', matColor: 'sky' }, bot(b)];
}

export function playerInfo() {
  const slot = App.slot;
  return { name: slot?.name ?? 'You', look: withWardrobe(slot?.look ?? PRESET_LOOKS[0], slot) };
}

/** A look plus whatever the jar has given and you have chosen to wear. */
export function withWardrobe(look, slot) {
  if (!slot) return look;
  const worn = slot.worn ?? slot.wardrobe ?? [];
  const out = { ...look };
  for (const id of worn) {
    if (id === 'band2') out.band2 = 'cyan';
    else if (id === 'cape') out.cape = true;
    else if (id === 'wrist') out.wrist = true;
    else if (id === 'visor') out.visor = true;
    else if (id === 'whistle') out.whistle = true;
    else if (id === 'goldShoes') out.goldShoes = true;
  }
  return out;
}

const LANE_ORDER = { tree: 0, heron: 1, warrior: 2, chair: 3, fold: 0, plank: 1, squats: 0, lunges: 2, press: 1, hoop: 2, step: 3 };

export class LaneActivity extends ActivityScene {
  centreDial = true;

  async stage(ctx) {
    await this.dress(ctx);
    const rand = () => this.botRand.next();
    const specs = this.laneSpecs(rand);
    this.lanes = await buildLanes(ctx, specs, { rand, ...this.laneOptions() });
    this.playerLane = this.lanes.find((l) => l.isPlayer);
    this.event = this.makeEvent(this.lanes, this.rng, this.hardData);
    this.event.begin();
    await this.afterLanes?.(ctx);
  }

  laneOptions() { return {}; }

  laneSpecs(rand) {
    return soloSpecs(playerInfo(), rand, LANE_ORDER[this.activity] ?? 0);
  }

  async dress() {}
  makeEvent() { throw new Error('makeEvent'); }

  begin() {
    this.event.begin();
    this.eventT = 0;
  }

  stepPlay(ctx, dt, scoring) {
    this.eventT += dt;
    this.event.step(ctx, dt, this.eventT, scoring);
  }

  /** During the count, people on poses are already wobbling. Nothing else has started: no hoop drops before Go. */
  countStep(ctx, dt) { if (this.event.kind === 'pose') this.event.step(ctx, dt, 0, false); }
  idleStep(ctx, dt) { this.eventT += dt; this.event.step(ctx, dt, this.eventT, false); }

  playLength() { return this.event.duration; }
  isOver() { return (this.eventT ?? 0) >= this.event.duration; }

  visual(ctx, dt) {
    this.event.visual(ctx, dt, this.eventT ?? 0);
  }

  drawGame(ctx) {
    if (this.phase === 'intro') return;
    this.event.draw(ctx, this.eventT ?? 0);
  }

  drawGameHud(ctx) {
    const left = Math.max(0, this.event.duration - (this.eventT ?? 0));
    topRow(ctx.hud, `${Math.ceil(left)}s`, this.scoreText());
  }

  scoreText() { return `${Math.round(this.event.scoreOf(this.playerLane))}${this.def.unit === '%' ? '%' : ''}`; }

  result() {
    const score = this.event.scoreOf(this.playerLane);
    const round = Math.round(score);
    return { score: round, seconds: this.totalPlay, display: `${round}${this.def.unit === '%' ? '%' : ` ${this.def.unit}`}`, classmates: this.lanes.filter((l) => l.who).map((l) => ({ who: l.who, name: l.name, score: Math.round(this.event.scoreOf(l)) })) };
  }

  onOutroStart() {
    if (this.playerLane) { this.playerLane.frozenClip = true; this.playerLane.avatar?.play('Bow', { once: true, fade: 0.3 }); }
    this.coach?.play('CoachStand', { fade: 0.4 });
  }
}
