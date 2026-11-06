/**
 * @file Reads the sim's events each frame and turns them into lines, sound, rumble and the odd screen. New records only, by number.
 */
import type { EngineFrame } from '../../../engine';
import { UNLOCKS } from '../scenes/data/days';
import type { Flow } from '../scenes/types';
import type { Ctx } from './ctx';
import { LINES } from './lines';
import { boardScreen } from './screens/programme';

export function createEventReader(ctx: Ctx) {
  const { sound, settings } = ctx;
  const seen: { world: unknown; seq: number } = { world: null, seq: 0 };
  function read(frame: EngineFrame, flow: Flow): void {
    if (seen.world !== frame.world) [seen.world, seen.seq] = [frame.world, 0];
    for (const record of frame.world.events.trace()) {
      if (record.seq <= seen.seq) continue;
      seen.seq = record.seq;
      const payload = record.payload as Record<string, unknown>;
      switch (record.type) {
        case 'say': {
          if (LINES[payload.line as string]) ctx.say(payload.line as string, payload.who as string);
          break;
        }
        case 'cue':
          sound.cue(payload.name as string, payload);
          break;
        case 'moved':
          sound.event('moved');
          break;
        case 'topple':
          sound.event('topple');
          rumble(0.6, 200);
          break;
        case 'beat':
          sound.event('beat');
          rumble(0.15, 60);
          break;
        case 'clack':
          sound.event('clack');
          break;
        case 'results':
          ctx.saveGame();
          sound.event('results');
          for (const unlock of UNLOCKS) {
            const paid = Number(payload.pebbles ?? 0);
            if (flow.pebbles >= unlock.at && flow.pebbles - paid < unlock.at) ctx.say(`unlock.${unlock.id}`, 'tare');
          }
          break;
        case 'openBoard':
          ctx.push(boardScreen(ctx, false));
          break;
        case 'morning':
          ctx.saveGame();
          if (LINES[`morning.${flow.day}`]) ctx.say(`morning.${flow.day}`, 'tare');
          break;
        case 'stepJudge':
          sound.audio.play(payload.grade === 'miss' ? 'sfx:wtCreak' : 'sfx:wtHat');
          break;
        default:
      }
    }
  }

  function rumble(strength: number, ms: number): void {
    if (!settings.rumble) return;
    const pad = (navigator.getGamepads?.() ?? []).find((p) => p) as
      (Gamepad & { vibrationActuator?: { playEffect?(t: string, o: object): Promise<unknown> } }) | undefined;
    try {
      void pad?.vibrationActuator?.playEffect?.('dual-rumble', {
        duration: ms,
        strongMagnitude: strength,
        weakMagnitude: strength,
      });
    } catch {
      // no rumble here
    }
  }

  return { read, rumble };
}
