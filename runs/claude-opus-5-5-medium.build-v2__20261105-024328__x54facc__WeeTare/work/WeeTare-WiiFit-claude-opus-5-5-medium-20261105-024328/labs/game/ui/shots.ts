/**
 * @file Every camera in the game as a function from the sim to a shot (cameras/stage.ts eases to it): the title's slow orbit,
 * each activity's purpose-built framing, and the finale's wide view of the whole island banking with its tilt.
 */
import type { EngineFrame } from '../../../engine';
import { SHOT } from '../cameras/stage';
import type { EvState, Flow } from '../scenes/types';
import { STATIONS } from '../scenes/data/stations';

type Vec = [number, number, number];
type ActorView = { actor?: { x: number; y: number; z: number; yaw: number } };

const set = (at: Vec, look: Vec, fov = 46, lag = 0.5) => Object.assign(SHOT, { at, look, fov, lag });

/** Reads an actor's feet. */
export function feetOf(frame: EngineFrame, id: number): { x: number; y: number; z: number; yaw: number } {
  const entity = (frame.world as unknown as { get(id: number): ActorView | undefined }).get(id);
  return entity?.actor ?? { x: 0, y: 8, z: 0, yaw: 0 };
}

/** Sets the shot for an activity. */
function eventShot(
  frame: EngineFrame,
  ev: EvState,
  guest: { x: number; y: number; z: number; yaw: number },
  t: number,
): void {
  const { x, y, z } = guest;
  const d = ev.d as Record<string, number> & { guests?: unknown };
  switch (ev.id) {
    case 'check':
      return void set([x + Math.sin(t * 0.08) * 0.6, y + 1.3, z + 6 - Math.min(2, ev.total / 1200)], [x, y + 1, z], 42);
    case 'poseA':
    case 'poseB':
    case 'poseC':
    case 'ring':
    case 'heron':
    case 'hoopS':
    case 'stepS':
    case 'pondS': {
      if (ev.phase === 'demo') {
        const c = (frame.world as unknown as { query(n: string): { cast: { plumb: number } }[] }).query('cast')[0];
        const p = feetOf(frame, c.cast.plumb);
        return void set([p.x + 2.2, p.y + 1.6, p.z + 5], [p.x, p.y + 1.4, p.z], 42);
      }
      const a = 0.6 + Math.sin(t * 0.05) * 0.25;
      return void set([x + Math.sin(a) * 6.4, y + 2.1, z - Math.cos(a) * 6.4], [x, y + 0.45, z + 0.4], 46);
    }
    case 'reps':
      return void set([x + 5, y + 1.6, z + 4.5], [x + 1.6, y + 0.9, z - 1], 46);
    case 'step':
      return void set([x, y + 3.4, z + 7], [x, y + 1, z - 0.8], 48);
    case 'pond':
      return void set([x, y + 1.2, z - 5], [x, y + 0.8, z], 38);
    case 'line':
      return void set([x - 7, y + 3.4, z + 2], [x + 3, y + 0.6, z], 48, 0.3);
    case 'paddle': {
      const yaw = d.yaw;
      return void set(
        [x - Math.sin(yaw) * 8, y + 3.2, z - Math.cos(yaw) * 8],
        [x + Math.sin(yaw) * 3, y + 0.8, z + Math.cos(yaw) * 3],
        52,
        0.4,
      );
    }
    case 'garden':
      return void set([d.cx, d.cy + 5.2, d.cz + 1.4], [d.cx, d.cy, d.cz], 44, 0.6);
    case 'plunge':
      if (ev.phase === 'cards') return void set([x + 5, 2.4, z - 8], [x, 2.6, z - 2], 50, 0.25);
      if (ev.phase === 'air') return void set([x + 12, Math.max(4, y + 1), z - 3], [x, y + 1, z - 2], 50, 0.12);
      return void set([x + 7, y + 1.6, z - 1], [x, y + 0.9, z - 2], 46);
    case 'hoop':
      return void set([x, y + 1.6, z - 6.5], [x, y + 0.9, z], 46);
    case 'jog': {
      const yaw = d.yaw;
      return void set(
        [x - Math.sin(yaw) * 7, y + 3, z - Math.cos(yaw) * 7],
        [x + Math.sin(yaw) * 4, y + 1.2, z + Math.cos(yaw) * 4],
        56,
        0.3,
      );
    }
    case 'tilt':
      if (ev.phase === 'storm') {
        const c = (frame.world as unknown as { query(n: string): { cast: { plumb: number } }[] }).query('cast')[0];
        const p = feetOf(frame, c.cast.plumb);
        return ev.t < 700
          ? void set([p.x - 1.1, p.y + 2.6, p.z - 2.2], [p.x, p.y + 2.5, p.z], 40, 0.4)
          : void set([0, 40, 90], [0, 6, 0], 50, 2);
      }
      if (ev.phase === 'east') return void set([x - 12, y + 7, z], [x + 4, y + 1, z], 56, 0.4);
      if (ev.phase === 'carts') return void set([x - 2, y + 3, z + 7], [x, y + 1, z], 46);
      if (ev.phase === 'stone') return void set([34, 42, 92], [0, 6, 0], 52, 1);
      if (ev.t < 500) {
        const c = (frame.world as unknown as { query(n: string): { cast: { plumb: number } }[] }).query('cast')[0];
        const p = feetOf(frame, c.cast.plumb);
        return void set([p.x - 1.1, p.y + 2.6, p.z - 2.2], [p.x, p.y + 2.5, p.z], 40, 0.6);
      }
      return void set([Math.sin(t * 0.05) * 90, 26, Math.cos(t * 0.05) * 90], [0, 6, 0], 46, 1.5);
    default:
      return void set([x, y + 4, z + 8], [x, y + 1, z]);
  }
}

/** Sets this frame's shot; `t` is real seconds. */
export function updateShot(
  frame: EngineFrame,
  flow: Flow,
  guestId: number,
  t: number,
  reduced: boolean,
  tilt: { x: number; z: number; story: number },
): void {
  const guest = feetOf(frame, guestId);
  if (flow.mode === 'event' && flow.ev) eventShot(frame, flow.ev, guest, t);
  else if (flow.mode === 'credits')
    set(
      [STATIONS.east.x + Math.sin(t * 0.07) * 18, 10, STATIONS.east.z + Math.cos(t * 0.07) * 18],
      [STATIONS.east.x, 7.5, STATIONS.east.z],
      46,
      1.5,
    );
  else if (flow.mode === 'results' || flow.mode === 'evening')
    set([guest.x + 5, guest.y + 2.5, guest.z + 5], [guest.x, guest.y + 1, guest.z], 44, 1);
  else set([Math.sin(t * 0.03) * 150, 58, Math.cos(t * 0.03) * 150], [0, 6, 0], 42, 1.5);
  SHOT.roll = reduced
    ? 0
    : (flow.mode === 'event' && flow.ev?.id === 'tilt' ? (-tilt.x * Math.PI) / 180 : (tilt.story * Math.PI) / 180) *
      0.6;
}
