/** @file View-only pad assistance and fever sway. The resulting camera aim is sent through the normal input wire. */
import type { CameraInput } from '../../../engine';
import type { Person } from '../scenes/state';
import type { Context } from './context';
let previousAim = false;
export function aimInput(ctx: Context, bot: [number, number] | null): CameraInput | undefined {
  if (bot) return { view: bot } as CameraInput;
  if (ctx.screen !== 'play' || !ctx.frame || !ctx.p) return undefined;
  if (ctx.p.seat?.data.map) return { look: [0, 0], turn: [0, 0] };
  const p = ctx.p,
    fever = !!p.seat?.data.fever,
    phase = ctx.frame.world.tick / 80;
  const base: CameraInput = fever
    ? ctx.device === 'gamepad'
      ? { look: [Math.sin(phase) * 0.0008, Math.cos(phase * 0.7) * 0.0005] }
      : { turn: [Math.sin(phase) * 0.024, Math.cos(phase * 0.7) * 0.018] }
    : {};
  if (ctx.device !== 'gamepad' || !ctx.store.get('assist', true)) return fever ? base : undefined;
  const pad = [...navigator.getGamepads()].find(Boolean);
  if (!pad) return fever ? base : undefined;
  const aiming = !!pad.buttons[6]?.pressed,
    snap = aiming && !previousAim;
  previousAim = aiming;
  if (Math.abs(pad.axes[2] ?? 0) < 0.1 && Math.abs(pad.axes[3] ?? 0) < 0.1 && !snap) return fever ? base : undefined;
  const yaw = ctx.frame.camera.yaw,
    targets = [...ctx.frame.world.query('actor', 'soldier', 'health')] as unknown as Person[];
  const nearest = targets
    .filter((t) => t.health.hp > 0)
    .map((t) => ({
      t,
      d: Math.atan2(
        Math.sin(Math.atan2(t.actor.x - p.actor.x, t.actor.z - p.actor.z) - yaw),
        Math.cos(Math.atan2(t.actor.x - p.actor.x, t.actor.z - p.actor.z) - yaw),
      ),
    }))
    .sort((a, b) => Math.abs(a.d) - Math.abs(b.d))[0];
  if (!nearest || Math.abs(nearest.d) > 0.1) return fever ? base : undefined;
  return {
    ...base,
    look: [
      (base.look?.[0] ?? 0) -
        nearest.d * 0.035 +
        (pad.axes[2] ?? 0) * 0.006 +
        (snap ? -Math.max(-0.035, Math.min(0.035, nearest.d)) : 0),
      base.look?.[1] ?? 0,
    ],
  };
}
