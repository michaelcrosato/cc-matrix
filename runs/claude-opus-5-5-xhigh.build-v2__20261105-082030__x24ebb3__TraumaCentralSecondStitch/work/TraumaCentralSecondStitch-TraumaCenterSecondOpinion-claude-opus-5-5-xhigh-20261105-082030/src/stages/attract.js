// Attract mode: a looping reel of real sim segments, played by the bot with cheats. Any input exits at
// once to Title and is swallowed. It never touches saves or settings.
import { App } from '../app.js';
import { CLOSE_CAM, toTitle } from './flow.js';
import { OperationStage, OP_CAMERA } from './operation.js';
import { StoryStage } from './story.js';

const GOD = { god: true, infComposure: true, freezeClock: true, unlimitedMistakes: true };
export const REEL = [
  { kind: 'story', scene: 'ep1', seconds: 18, label: 'A STORM. 3 A.M.' },
  { kind: 'op', op: 'op1', stage: 1, seconds: 26 },
  { kind: 'op', op: 'op2', stage: 2, seconds: 24 },
  { kind: 'op', op: 'op3', stage: 0, seconds: 24 },
  { kind: 'op', op: 'op4', stage: 1, seconds: 22 },
  { kind: 'op', op: 'op5', stage: 2, seconds: 28, gift: 'quiet' },
  { kind: 'op', op: 'op6', stage: 6, seconds: 24, gift: 'look', composure: 100 },
  { kind: 'op', op: 'op7', stage: 3, seconds: 26, gift: 'quiet' },
  { kind: 'op', op: 'op8', stage: 2, seconds: 30, gift: 'quiet' },
  { kind: 'op', op: 'pileup', stage: 0, seconds: 24, seats: 4 },
];

let reelIndex = 0;
let active = false;

export function startAttractReel(from = 0) {
  reelIndex = from;
  active = true;
  App.inAttract = true;
  playSegment();
}
function drawBanner(ui) {
  const s = 'DEMO - PRESS ANY BUTTON';
  const blink = Math.sin(performance.now() / 300) > -0.3;
  const w = ui.hud.measure(s, 1).width + 12;
  const x = (ui.w - w) / 2;
  ui.rect(x, 28, w, 12, 'ink');
  ui.outline(x, 28, w, 12, 'red');
  if (blink) ui.text(x + 6, 30, s, { color: 'white', shadow: false });
}
function exitAttract() {
  if (!active) return;
  active = false;
  App.inAttract = false;
  App.idle = 0;
  App.devices.swallow = 0.2;
  toTitle('title');
}
function playSegment() {
  if (!active) return;
  const seg = REEL[reelIndex % REEL.length];
  reelIndex = (reelIndex + 1) % REEL.length;
  const watch = {
    t: 0,
    armed: 0,
    frame(stage, ctx, dt) {
      this.t += dt;
      this.armed += dt;
      // Touch-only devices let it run; anything else ends it.
      if (!App.touchOnly && this.armed > 0.25 && (App.devices.anyPress || App.devices.mouseMoved || App.devices.last === 'pad' && App.devices.pads.some((p) => p.axes.some((a) => a) || p.down.some(Boolean)))) { exitAttract(); return; }
      if (this.t >= seg.seconds && !App.loading) playSegment();
    },
    next() { if (!App.loading) playSegment(); },
  };
  if (seg.kind === 'story') {
    const st = new StoryStage({ sceneId: seg.scene, auto: true, onDone: () => { if (active) playSegment(); }, attractLabel: (ui) => drawBanner(ui) });
    const orig = st.frame.bind(st);
    st.frame = (ctx, dt, ov) => { orig(ctx, dt, ov); watch.frame(st, ctx, dt); };
    App.goto(st, { kind: 'dissolve', camera: CLOSE_CAM });
    return;
  }
  const seats = Array.from({ length: seg.seats ?? 1 }, (_, i) => ({ bot: { skill: 0.55 + i * 0.1, god: true } }));
  const stage = new OperationStage({ opId: seg.op, mode: 'attract', difficulty: 'resident', startStage: seg.stage, seed: 4242 + reelIndex, seats, gift: seg.gift, composure: seg.composure ?? 60, cheats: GOD, attract: watch, drawExtra: (s, ctx, ui) => drawBanner(ui) });
  App.goto(stage, { kind: 'blinds', duration: 0.2, camera: OP_CAMERA });
}
export const attractState = () => ({ active, reelIndex });
export function stopAttract() { active = false; App.inAttract = false; App.idle = 0; }
