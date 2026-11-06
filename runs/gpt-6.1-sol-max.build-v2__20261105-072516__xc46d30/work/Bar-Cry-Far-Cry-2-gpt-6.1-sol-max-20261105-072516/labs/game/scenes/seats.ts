/** @file Human input routing and body restrictions shared by local, remote and headless players. */
import { tuneCharacter, type Intents } from '../../../engine/sim-api';
import { campaign, players, mark, value, type GW } from './state';
import { cellAt } from './fire';
export function seats(w: GW, intents: Intents): void {
  const c = campaign(w),
    others = (intents['game:seats'] ?? {}) as Record<string, Intents>;
  for (const p of players(w)) {
    const s = p.seat!.data,
      raw = p.actor.player ? intents : (others[s.n] ?? {}),
      b = [...(raw.b ?? [])];
    const pressed = [...new Set([...(raw.p ?? []), ...b.filter((key) => !s.previous.includes(key))])];
    s.wants = {
      ...(raw.move ? { move: [...raw.move] as [number, number] } : {}),
      ...(raw.look ? { look: [...raw.look] as [number, number] } : {}),
      ...(raw.aim ? { aim: [...raw.aim] as [number, number, number] } : {}),
      b,
      p: pressed,
    };
    s.released = s.previous.filter((key) => !b.includes(key));
    s.previous = [...b];
    if (!p.actor.player) p.actor.intents = JSON.parse(JSON.stringify(s.wants)) as Intents;
    if (pressed.includes('map')) {
      s.map = !s.map;
      if (!s.map && !p.gunState.data.guns[p.weapons.last]?.broken) p.weapons.slot = p.weapons.last;
      mark(w, 'map');
    }
    if (pressed.includes('locator')) {
      s.locator = !s.locator;
      mark(w, 'locator');
    }
    const grass = c.fire[cellAt(p.actor.x, p.actor.z)] === 1;
    let factor = s.down !== 0 || s.vehicle >= 0 || s.action ? 0 : s.map || s.carrying ? 0.5 : 1;
    if (s.fever > 0) factor *= Math.max(0.35, 1 - 0.3 * value(w, 'fever.severity'));
    if (grass) factor *= 0.9;
    if (Math.abs(p.actor.z - 902) < 23) factor *= 0.5;
    p.actor.character = tuneCharacter(p.actor.character, [
      ['gaits', 'run', value(w, 'move.run') * factor],
      ['gaits', 'sprint', value(w, 'move.sprint') * factor],
      ['gaits', 'crouch', value(w, 'move.crouch') * factor],
      ['gaits', 'walk', 2.2 * factor],
    ]);
  }
}
