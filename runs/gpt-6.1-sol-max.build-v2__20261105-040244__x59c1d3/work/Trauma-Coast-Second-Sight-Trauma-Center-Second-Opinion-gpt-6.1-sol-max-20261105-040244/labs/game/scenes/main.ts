/** @file The one engine scene: title and story sets, or a deterministic surgical operation. */
import {
  defineScene,
  defineComponent,
  createCharacter,
  spawnActor,
  actOn,
  physicsOf,
  type World,
} from '../../../engine/sim-api';
import { BALANCE, GAME_SETTINGS } from '../data/balance';
import { getCase } from '../data/cases';
import { storyFor } from '../data/story';
import type { Difficulty, Hand, Operation, Rules } from '../data/types';
import { stage } from '../cast/props';
import '../cast/actions';
import '../cast/build';
import { botHand, botHands } from '../bot';
import { createOperation } from './op/state';
import { stepOperation } from './op/step';
import './op/dev';
void GAME_SETTINGS;
defineComponent('operation', {
  description: 'The complete deterministic surgery state.',
  fields: {
    data: { type: 'object', default: {}, description: 'Case, patients, instruments, targets and checkpoints.' },
  },
});
defineComponent('theatre', {
  description: 'A staged hospital scene.',
  fields: {
    run: { type: 'string', default: 'title', description: 'Scene identifier.' },
    beat: { type: 'integer', default: -1, description: 'Current dialogue beat.' },
    actors: { type: 'object', default: {}, description: 'Cast actor ids.' },
  },
});
export interface GameComponents {
  operation: { data: Operation };
  theatre: { run: string; beat: number; actors: Record<string, number> };
}
export function readRules<C extends object>(w: World<C>): Rules {
  return {
    balance: Object.fromEntries(Object.keys(BALANCE).map((k) => [k, w.settings.get<number>(`game.${k}`)])),
    difficulty: w.settings.get<Difficulty>('game.difficulty'),
    simpleGift: w.settings.get<boolean>('game.simpleGift'),
    attract: w.settings.get<boolean>('game.attract'),
    freezeVitals: w.settings.get<boolean>('game.freezeVitals'),
    freezeClock: w.settings.get<boolean>('game.freezeClock'),
    infiniteGift: w.settings.get<boolean>('game.infiniteGift'),
    oneHit: w.settings.get<boolean>('game.oneHit'),
  };
}
export const main = defineScene<GameComponents>('game:main', {
  description: 'Harbor Light: story drama and first-person surgical action.',
  physics: true,
  setup(w) {
    const run = w.settings.get<string>('game.run'),
      isOp = run.startsWith('op:');
    physicsOf(w).addBody({
      type: 'fixed',
      position: [0, -0.5, 0],
      colliders: [{ shape: { type: 'box', size: [50, 1, 50] } }],
    });
    if (isOp) {
      stage(w, 'field');
      spawnActor(w, { at: [0, -8, 0], character: createCharacter({ speed: 0 }), player: true });
      const s = createOperation(
        run.slice(3),
        w.rng('operation').int(1, 999999),
        w.settings.get<number>('game.seats'),
        w.settings.get<number>('game.phase'),
        readRules(w),
      );
      const gift = w.settings.get<string>('game.giftChoice');
      if (gift !== 'case') {
        s.seats[0].giftKind = gift === 'pulse' ? 'pulse' : 'still';
        s.seats[0].gift = 1;
        if (s.seats[1] && s.seats[1].giftKind !== 'none') s.seats[1].giftKind = gift === 'pulse' ? 'still' : 'pulse';
      }
      s.retry ||= w.settings.get<boolean>('game.retry');
      w.spawn({ operation: { data: s } });
    } else {
      const parts = run.split(':'),
        story = run.startsWith('story:') ? storyFor(Number(parts[1]), parts[2] === 'after' ? 'after' : 'before') : null;
      stage(w, story?.set ?? 'or');
      const actors: Record<string, number> = {};
      const cast = story ? [...new Set(story.beats.map((b) => b.who))] : ['wren', 'odie'];
      for (let i = 0; i < cast.length; i++) {
        const who = cast[i];
        actors[who] = spawnActor(w, {
          at: [-3.5 + i * 1.45, 0, 3.7 + (i % 2) * 0.4],
          character: createCharacter({ speed: 0 }),
          player: i === 0,
          yaw: Math.PI,
          body: `body:${who}`,
          anim: { build: 'build:drama' },
        });
      }
      w.spawn({ theatre: { run, beat: -1, actors } });
    }
  },
  step(w, intents) {
    const entity = w.query('operation')[0];
    if (entity) {
      const s = entity.operation.data,
        r = readRules(w);
      let hands = intents['game:hands'] as unknown as Hand[] | undefined;
      if (w.settings.get<boolean>('game.autoplay') || r.attract) hands = botHands(s, r);
      else if (getCase(s.caseId).ai && w.settings.get<number>('game.seats') === 1) {
        hands = hands ? [...hands] : [];
        hands[1] = botHand(s, 1, r, true);
      }
      if (!w.settings.get<boolean>('game.autoplay'))
        for (const p of s.seats)
          if (p.id >= s.humans && !(getCase(s.caseId).ai && p.id === 1)) {
            hands ??= [];
            hands[p.id] = botHand(s, p.id, r);
          }
      stepOperation(
        s,
        hands ??
          s.seats.map((p) => [
            p.x,
            p.z,
            p.tool,
            p.held ? 1 : 0,
            p.giftCounter,
            p.shockCounter,
            p.site,
            p.swapCounter,
            0,
          ]),
        r,
      );
    } else {
      const theatre = w.query('theatre')[0]?.theatre,
        beat = intents['game:beat'];
      if (theatre && typeof beat === 'number' && beat !== theatre.beat && theatre.run.startsWith('story:')) {
        theatre.beat = beat;
        const p = theatre.run.split(':'),
          story = storyFor(Number(p[1]), p[2] === 'after' ? 'after' : 'before'),
          b = story.beats[beat];
        if (b && theatre.actors[b.who]) actOn(w, theatre.actors[b.who], (a) => a.play(`action:${b.act}`));
      }
    }
  },
});
export default main;
