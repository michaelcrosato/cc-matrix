/** @file Scene actions own all menu transitions and persistence boundaries. */
import { placeActor, removeProp, type World } from '../../../engine/sim-api';
import { activity, ageFor, DAYS, pebblesFor, type EventId } from './data/days';
import { createRun } from './events/registry';
import { makeWobble } from './wobble';
import { flowOf, freshProgress, type GameComponents, type Progress } from './state';
import { heightAt } from './terrain';
import { put } from './world';
import { spawnGuest } from '../cast/guest';
import { REMARKS } from '../ui/lines/cast';
type W = World<GameComponents>;
export function startEvent(w: W, id: EventId): void {
  const f = flowOf(w),
    a = activity(id),
    rng = w.rng('sway');
  for (const prop of f.props) removeProp(w, prop);
  f.props = [];
  f.demoStart = f.clock;
  f.event = createRun(id, w.rng('activity').int(1, 10000));
  if (f.demo && id === 'dive') {
    f.event.tick = 360;
    f.event.hold = 1;
  }
  f.wobble = makeWobble(Array.from({ length: 6 }, () => rng.range(0, Math.PI * 2)));
  f.mode = 'event';
  f.serial++;
  f.topples = 0;
  f.lastMistakes = 0;
  f.lastBeat = -1;
  f.message = a.verbs;
  f.speaker = id === 'pond' ? 'Plumb' : 'Tare';
  let x: number = a.x,
    z: number = a.z,
    y = f.roundOnly ? 8.2 : heightAt(x, z) + 0.2;
  if (id === 'pose' || id === 'group') {
    x = -57.4;
    z = 20;
    y = 8.2;
  }
  if (id === 'pond') {
    x = -70;
    z = -12;
    y = 4.25;
  }
  if (id === 'paddle') {
    x = -60;
    z = 85;
    y = 2.3;
  }
  if (id === 'line') {
    x = -65;
    z = 42;
    y = 5.1;
  }
  if (id === 'garden') {
    x = 30;
    z = -44.8;
    y = 11.2;
  }
  placeActor(w, f.hero, [x, y, z], 0);
  if (id === 'hoop') for (let i = 0; i < 8; i++) f.props.push(put(w, 'hoopRetreat', x, z, y + 0.4 + i * 0.08));
  if (id === 'line') f.props.push(put(w, 'board', -62, 42, 2.05));
  if (id === 'paddle') f.props.push(put(w, 'board', x, z, 2.05));
  if (!f.roundOnly && (id === 'pose' || id === 'group'))
    f.others.forEach((actor, i) => placeActor(w, actor, [-53.8 + i * 3.6, 8.2, 20], 0));
  w.emit('activity', { id });
}
export function finishEvent(w: W, score?: number): void {
  const f = flowOf(w),
    r = f.event;
  if (f.mode !== 'event') return;
  if (score !== undefined) r.score = score;
  f.mode = 'results';
  f.resultsTick = 0;
  f.serial++;
  const normalized = r.id === 'group' ? r.score / 3 : r.score;
  if (!f.demo) {
    f.pebbles += Math.round(pebblesFor(normalized) * w.settings.get<number>('game.pebbles.mult'));
    const first = !f.done.includes(r.id);
    if (first) f.done.push(r.id);
    f.bests[r.id] = Math.max(f.bests[r.id] ?? 0, r.score);
    if (r.id === 'check') {
      const age = ageFor(normalized, w.settings.get<number>('game.age.k'));
      if (first || (f.complete && !f.endingSeen && f.ages.length < 6)) f.ages.push(age);
      else f.ages[f.ages.length - 1] = age;
    }
  }
  f.message = REMARKS[w.rng('remarks').int(0, REMARKS.length - 1)];
  f.speaker = 'Plumb';
  w.emit('result', { score: r.score });
}
export function leaveEvent(w: W): void {
  const f = flowOf(w);
  for (const prop of f.props) removeProp(w, prop);
  f.props = [];
  if (f.event.id === 'tilt' && f.done.includes('tilt')) {
    if (!f.complete) {
      f.complete = true;
      startEvent(w, 'check');
      f.message = 'The final Morning Check. Everything feels a little more level.';
      return;
    }
  }
  if (f.complete && !f.endingSeen && f.event.id === 'check' && f.mode === 'results') {
    f.endingSeen = true;
    placeActor(w, f.hero, [-57.4, 8.2, 20], 0);
    placeActor(w, f.plumb, [-52, 8.2, 13], 0);
    f.others.forEach((id, i) => placeActor(w, id, [-53.8 + i * 3.6, 8.2, 20], 0));
    f.mode = 'credits';
    f.serial++;
    return;
  }
  f.mode = 'roam';
  f.serial++;
  placeActor(w, f.hero, [0, 8.25, 40], Math.PI);
  f.message = DAYS[Math.min(4, f.day - 1)].line;
}
export function sleep(w: W): void {
  const f = flowOf(w);
  if (!DAYS[Math.min(4, f.day - 1)].events.every((id) => f.done.includes(id)) && !f.complete) {
    f.message = 'Your programme has a little standing left in it.';
    f.serial++;
    return;
  }
  f.day++;
  f.done = [];
  f.mode = 'roam';
  f.serial++;
  f.message =
    f.day === 5
      ? 'The sky has made a decision. Please begin your programme.'
      : f.complete
        ? 'You may stay as long as you like. The ferry does not return.'
        : DAYS[Math.min(4, f.day - 1)].line;
  placeActor(w, f.hero, [0, 8.25, 40], Math.PI);
}
export function progressOf(f: Progress): Progress {
  return {
    day: f.day,
    done: [...f.done],
    ages: [...f.ages],
    pebbles: f.pebbles,
    finds: [...f.finds],
    bests: { ...f.bests },
    complete: f.complete,
    endingSeen: f.endingSeen,
    look: f.look,
    colour: f.colour,
    headband: f.headband,
  };
}
export const ACTIONS = {
  'game.begin': (w: W, args: unknown) => {
    const f = flowOf(w),
      save = args as Partial<Progress> | null;
    Object.assign(f, freshProgress(), save ?? {});
    for (const e of w.query('find')) if (f.finds.includes(e.find.index)) w.despawn(e.id);
    for (const id of f.cairn) if (w.has(id)) removeProp(w, id);
    f.cairn = [];
    const hero = w.get(f.hero);
    if (hero?.puppet) hero.puppet.body = `body:guest${f.colour}look${f.look}${f.headband ? 'band' : ''}`;
    f.mode = 'roam';
    f.demo = false;
    f.serial++;
    placeActor(w, f.hero, [0, 8.25, 40], Math.PI);
    f.message =
      f.day === 1
        ? 'Welcome to Little Fulcrum. I am Tare. I measure only wobble.'
        : 'You came back. A lot of people say they will.';
  },
  'game.start': (w: W, args: unknown) => {
    const id = (args as { event?: EventId })?.event;
    if (id && activity(id).id === id) startEvent(w, id);
  },
  'game.leave': leaveEvent,
  'game.sleep': sleep,
  'game.front': (w: W) => {
    const f = flowOf(w);
    f.mode = 'front';
    f.demo = false;
    const hero = w.get(f.hero);
    if (hero?.puppet) hero.puppet.body = `body:guest${f.colour}look${f.look}${f.headband ? 'band' : ''}`;
    f.others.forEach((id, i) => placeActor(w, id, [-53.8 + i * 3.6, 8.2, 20], 0));
    f.serial++;
    placeActor(w, f.hero, [-57.4, 8.2, 20], 0);
  },
  'game.finish': (w: W, args: unknown) => finishEvent(w, (args as { score?: number })?.score),
  'game.demo': (w: W) => {
    const f = flowOf(w);
    f.demo = true;
    startEvent(w, 'pose');
  },
  'game.day': (w: W, args: unknown) => {
    const f = flowOf(w);
    f.day = Math.max(1, Math.min(5, Number((args as { day: number }).day)));
    f.done = [];
    f.mode = 'roam';
    f.serial++;
  },
  'game.unlock': (w: W) => {
    const f = flowOf(w);
    f.complete = true;
    f.endingSeen = true;
    f.day = Math.max(6, f.day);
    f.pebbles = Math.max(40, f.pebbles);
    f.serial++;
  },
  'game.pebbles': (w: W) => {
    const f = flowOf(w);
    f.pebbles += 20;
    f.serial++;
  },
  'game.look': (w: W, args: unknown) => {
    const f = flowOf(w);
    const data = args as { look?: number; colour?: number; headband?: boolean };
    if (data.look !== undefined) f.look = data.look;
    if (data.headband !== undefined) f.headband = data.headband;
    if (data.colour !== undefined) f.colour = data.colour;
    const hero = w.get(f.hero);
    if (hero?.puppet) hero.puppet.body = `body:guest${f.colour}look${f.look}${f.headband ? 'band' : ''}`;
    f.serial++;
  },
  'game.finale': (w: W, args: unknown) => {
    startEvent(w, 'tilt');
    flowOf(w).event.tick = Number((args as { tick: number }).tick ?? 0);
  },
  'game.expert': (w: W) => {
    const f = flowOf(w);
    f.expert = !f.expert;
    f.serial++;
  },
  'round.decorate': (w: W) => {
    const f = flowOf(w);
    if (!f.roundOnly || f.plumb >= 0) return;
    const me = w.settings.get<number>('game.sessionSeat'),
      count = w.settings.get<number>('game.sessionCount');
    const slots = Array.from({ length: count }, (_, i) => i).filter((i) => i !== me);
    f.plumb = spawnGuest(w, -52, 8.2, 13, 0, true, 'build:guest');
    f.others = slots.map((seat, n) => {
      const ghost = w.get(f.ghostIds[n])?.ghost;
      return spawnGuest(
        w,
        -53.8 + n * 3.6,
        8.2,
        20,
        n + 1,
        false,
        'build:guest',
        `body:seat${seat}`,
        ghost ? { ghost: { ...ghost } } : {},
      );
    });
    for (const id of f.ghostIds) w.despawn(id);
    f.ghostIds = [];
  },
  'round.colours': (w: W, args: unknown) => {
    const f = flowOf(w),
      colours = (args as { items: number[] }).items;
    [f.hero, ...f.others].forEach((id, n) => {
      const e = w.get(id);
      if (e?.puppet && colours[n] !== undefined) e.puppet.body = `body:seat${colours[n]}`;
    });
  },
  'round.go': (w: W) => startEvent(w, 'group'),
  'round.ghosts': (w: W, args: unknown) => {
    const f = flowOf(w),
      list = (
        args as { items: { seat: number; x: number; y: number; phase: number; active: boolean; score?: number }[] }
      ).items;
    for (const g of list) {
      const id = f.others[g.seat - 1] ?? f.ghostIds[g.seat - 1];
      if (id) {
        w.add(id, 'ghost', g);
        f.remoteScores[g.seat] = g.score ?? 0;
        f.remoteDots[g.seat] = [g.x, g.y];
      }
    }
  },
};
