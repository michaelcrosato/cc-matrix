/** @file Native humanoid builds, original clip layers, and input-controlled pose scrubbing. */
import { createCharacter, defineBuild, spawnActor, playClip, type World } from '../../../engine/sim-api';
import type { GameComponents } from '../scenes/state';
import type { Wobble } from '../scenes/wobble';
import './clips';
defineBuild('build:guest', {
  headRadius: 0.19,
  torso: 0.48,
  legUpper: 0.43,
  legLower: 0.43,
  hipHeight: 0.83,
  shoulderHalf: 0.2,
});
defineBuild('build:guestTall', {
  headRadius: 0.17,
  torso: 0.52,
  legUpper: 0.48,
  legLower: 0.48,
  hipHeight: 0.92,
  shoulderHalf: 0.18,
});
defineBuild('build:guestSmall', {
  size: 0.9,
  headRadius: 0.19,
  torso: 0.45,
  legUpper: 0.4,
  legLower: 0.4,
  hipHeight: 0.77,
});
defineBuild('build:plumb', {
  size: 1.06,
  headRadius: 0.16,
  torso: 0.57,
  legUpper: 0.56,
  legLower: 0.56,
  hipHeight: 1.08,
  shoulderHalf: 0.17,
});
export function spawnGuest(
  w: World<GameComponents>,
  x: number,
  y: number,
  z: number,
  seat = 0,
  plumb = false,
  buildOverride?: string,
  bodyOverride?: string,
  extraComponents: Record<string, object> = {},
): number {
  return spawnActor(w, {
    at: [x, y + 0.15, z],
    yaw: 0,
    player: false,
    character: createCharacter({ speed: 8, jumpSpeed: 6 }),
    anim: {
      build:
        buildOverride ??
        (plumb ? 'build:plumb' : seat === 3 ? 'build:guestSmall' : seat === 1 ? 'build:guestTall' : 'build:guest'),
      weapon: 'none',
    },
    body: bodyOverride ?? (plumb ? 'body:plumb' : `body:guest${seat % 5}`),
    clips: {
      sets: ['clipset:retreat'],
      ik: true,
      play: { clip: 'RETREAT/Stand', speed: 0, hold: true, loop: false, walk: true },
    },
    components: {
      guest: { seat, pose: 'Stand', initial: false },
      ...(plumb ? { secondary: { hair: 'ponytail', color: '#3f5143' } } : {}),
      ...extraComponents,
    },
  });
}
export function poseGuest(w: World<GameComponents>, id: number, pose: string, progress: number, wobble: Wobble): void {
  const e = w.get(id);
  if (!e?.guest || !e.clips) return;
  if (e.guest.pose !== pose || !e.guest.initial) {
    playClip(w, id, `RETREAT/${pose}`, { speed: 0, hold: true, walk: true, loop: false, fade: 0.2 });
    for (const lean of ['LeanR', 'LeanL', 'LeanF', 'LeanB'])
      playClip(w, id, `RETREAT/${lean}`, { speed: 0, hold: true, walk: true, loop: false, additive: true, fade: 0.2 });
    e.guest.pose = pose;
    e.guest.initial = true;
  }
  for (const slot of e.clips.state.slots) {
    if (slot.clip === `RETREAT/${pose}`) slot.t = Math.max(0, Math.min(0.999, progress));
    if (slot.clip.endsWith('/LeanR')) slot.t = Math.max(0, wobble.x);
    if (slot.clip.endsWith('/LeanL')) slot.t = Math.max(0, -wobble.x);
    if (slot.clip.endsWith('/LeanF')) slot.t = Math.max(0, wobble.y);
    if (slot.clip.endsWith('/LeanB')) slot.t = Math.max(0, -wobble.y);
  }
}
