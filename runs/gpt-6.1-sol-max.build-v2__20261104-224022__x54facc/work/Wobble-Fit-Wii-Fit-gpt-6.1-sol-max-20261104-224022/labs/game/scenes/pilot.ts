/** @file One input owner for walk, balance, bots and the island-scale finale. */
import { held, pressed, placeActor, type Intents, type World } from '../../../engine/sim-api';
import { flowOf, type GameComponents } from './state';
import { stepEvent, botFor, guideFor } from './events/registry';
import { activity, ACTIVITIES, DAYS } from './data/days';
import { heightAt } from './terrain';
import { finishEvent, leaveEvent, sleep, startEvent } from './flow';
import { DEFAULT_WOBBLE, clamp, type Lean, type WobbleConfig } from './wobble';
import { poseGuest } from '../cast/guest';
import type { EventConfig } from './events/types';
import { rhythmNote } from './events/motion';
import { ambience } from './ambience';
import { dialogue, PLAQUES } from '../ui/lines/cast';
type W = World<GameComponents>;
export function configOf(w: W): EventConfig {
  const f = flowOf(w),
    get = (key: string) => w.settings.get<number>(`game.${key}`);
  const wobble = { ...DEFAULT_WOBBLE };
  for (const key of ['gain', 'instability', 'damping', 'noise', 'noiseRate', 'reach'] as const)
    wobble[key] = get(`wobble.${key}`);
  wobble.period = get('breath.period');
  wobble.calmEffect = get('breath.calmEffect');
  if (w.settings.get<boolean>('game.assist')) wobble.noise *= 0.5;
  if (f.expert) wobble.noise *= 1.2;
  if (w.settings.get<boolean>('game.noTopple')) {
    wobble.noise = 0;
    wobble.instability = 0;
  }
  return { wobble, get, auto: w.settings.get<boolean>('game.auto') || f.demo, day: f.day, expert: f.expert };
}
function readLean(i: Intents): Lean {
  const n = (key: string) => Number(i[`game:${key}`] ?? 0);
  const mouse = i['game:mouse'] as number[] | undefined;
  const gentle = held(i, 'gentle') ? 0.4 : 1;
  return {
    x: clamp((n('r') - n('l') + (mouse?.[0] ?? 0)) * gentle),
    y: clamp((n('f') - n('b') + (mouse?.[1] ?? 0)) * gentle),
    l: n('fl'),
    r: n('fr'),
    act: pressed(i, 'act'),
  };
}
function walking(w: W, i: Intents): void {
  const f = flowOf(w),
    hero = w.get(f.hero);
  if (!hero?.actor) return;
  hero.actor.intents = {
    move: [...(i.move ?? [0, 0])] as [number, number],
    b: [...(i.b ?? [])],
    p: [...(i.p ?? [])],
    cam: i.cam ?? 0,
  };
  const { x, z } = hero.actor;
  if (Math.hypot(x, z) > 106 || hero.actor.y < 1.8)
    placeActor(w, f.hero, [x * 0.92, heightAt(x * 0.92, z * 0.92) + 0.2, z * 0.92]);
  let nearest = 10,
    focus = '';
  for (const a of ACTIVITIES) {
    const d = Math.hypot(a.x - x, a.z - z);
    if (d < nearest) {
      nearest = d;
      focus = a.id;
    }
  }
  const hut = Math.hypot(x - 62, z - 55),
    board = Math.hypot(x - 8, z - 35);
  if (hut < 7 && hut < nearest) {
    focus = 'sleep';
    nearest = hut;
  }
  if (board < 5 && board < nearest) {
    focus = 'board';
    nearest = board;
  }
  for (const e of w.query('find'))
    if (Math.hypot(e.find.x - x, e.find.z - z) < 2 && !f.finds.includes(e.find.index)) {
      f.finds.push(e.find.index);
      f.pebbles++;
      f.serial++;
      w.despawn(e.id);
      f.message = 'A pebble. It was waiting for someone to take responsibility.';
      w.emit('pebble', {});
    }
  for (const e of w.query('plaque')) {
    const distance = Math.hypot((e.sceneProp?.x ?? e.plaque.x) - x, (e.sceneProp?.z ?? e.plaque.z) - z);
    if (distance < 3 && distance < nearest) {
      focus = `plaque${e.plaque.index}`;
      nearest = distance;
    }
  }
  for (const [id, name] of [
    [f.plumb, 'Plumb'],
    ...f.others.map((id, n) => [id, ['Gerald', 'Bex', 'Nan'][n]]),
    [f.tare, 'Tare'],
  ] as [number, string][]) {
    const e = w.get(id),
      pos = e?.actor ?? e?.sceneProp;
    if (!pos) continue;
    const distance = Math.hypot(pos.x - x, pos.z - z);
    if (distance < 3 && distance < nearest) {
      focus = `cast:${name}`;
      nearest = distance;
    }
  }
  for (const e of w.query('sceneProp')) {
    const distance = Math.hypot(e.sceneProp.x - x, e.sceneProp.z - z);
    if (e.sceneProp.prop === 'prop:benchRetreat' && distance < 2 && distance < nearest) {
      focus = 'bench';
      nearest = distance;
    }
  }
  f.focus = focus;
  if (pressed(i, 'use') && focus) {
    if (focus === 'sleep') sleep(w);
    else if (focus === 'board') {
      f.message = 'Every activity is available from the Noticeboard.';
      f.speaker = 'Tare';
      w.emit('noticeboard', {});
      f.serial++;
    } else if (focus.startsWith('plaque')) {
      f.message = PLAQUES[Number(focus.slice(6)) % PLAQUES.length];
      f.speaker = 'Tare';
      f.serial++;
    } else if (focus.startsWith('cast:')) {
      const speaker = focus.slice(5);
      f.message = dialogue(speaker, f.day, f.talks[speaker] ?? 0);
      f.talks[speaker] = (f.talks[speaker] ?? 0) + 1;
      f.speaker = speaker;
      f.serial++;
    } else if (focus === 'bench') {
      f.mode = 'sit';
      f.message = 'A little time to do nothing. Use the bench again to stand.';
      f.serial++;
    } else startEvent(w, activity(focus).id);
  }
  if (pressed(i, 'wave')) {
    f.message = 'Gerald: Morning.';
    f.speaker = 'Gerald';
    f.serial++;
    w.emit('wave', {});
  }
  poseGuest(w, f.hero, 'Stand', 0, f.wobble);
}
function animate(w: W, input: Lean, c: EventConfig): void {
  const f = flowOf(w),
    r = f.event,
    g = guideFor(r, c),
    hero = w.get(f.hero);
  if (!hero?.actor) return;
  const heroBody = hero.actor;
  heroBody.intents = {};
  let pose = g.pose,
    progress = 1;
  if (r.id === 'pose') progress = r.progress;
  if (r.id === 'reps') progress = clamp(Math.abs(r.phase === 2 ? f.wobble.tx : f.wobble.ty), 0, 1);
  if (r.id === 'hoop') progress = (((r.angle / (Math.PI * 2)) % 1) + 1) % 1;
  if (r.id === 'dive') progress = (((r.angle / (Math.PI * 4)) % 1) + 1) % 1;
  if (r.id === 'step') {
    pose = input.r > 0.5 && input.l < 0.5 ? 'StepUpR' : 'Step';
    progress = input.l > 0.5 || input.r > 0.5 ? 1 : 0;
  }
  if (r.id === 'tilt' && r.phase === 1) progress = clamp(r.hold / 120, 0, 1);
  if (r.id === 'tilt' && r.phase === 2) progress = r.count % 2 ? 0.2 : 0.9;
  if (r.id === 'hoop')
    f.props.forEach((id, i) => {
      const hoop = w.get(id)?.sceneProp;
      if (hoop) {
        hoop.x = heroBody.x + Math.sin(r.angle) * 0.08;
        hoop.z = heroBody.z + Math.cos(r.angle) * 0.08;
        hoop.y = i < r.count ? heroBody.y + 0.6 + r.velocity * 0.4 + i * 0.1 : -30;
      }
    });
  if (r.id === 'paddle' || r.id === 'line' || r.id === 'jog') progress = 0.5 + 0.5 * Math.sin(r.tick / 15);
  const wobble = r.id === 'group' ? r.seats[0] : f.wobble;
  if (r.id === 'group') pose = guideFor(r.children[0], c).pose;
  if (r.id === 'pose' && g.foot) progress *= g.foot === 1 ? input.l : Math.min(input.l, input.r);
  if (r.id === 'check' && g.pose === 'Heron') progress = input.l;
  poseGuest(w, f.hero, pose, progress, wobble);
  poseGuest(
    w,
    f.plumb,
    r.id === 'pose' || r.id === 'group' ? pose : 'Stand',
    r.id === 'pose' || r.id === 'group' ? 1 : 0,
    { ...f.wobble, x: 0, y: 0 },
  );
  f.others.forEach((id, n) => {
    const e = w.get(id),
      ghost = e?.ghost;
    const wob =
      r.id === 'group'
        ? r.seats[n + 1]
        : { ...f.wobble, x: Math.sin(r.tick / 80 + n) * 0.1, y: Math.cos(r.tick / 90 + n) * 0.08 };
    if (ghost && r.id === 'group') {
      if (!ghost.active || ghost.phase !== r.phase) {
        placeActor(w, id, [-150, 8, 18]);
        return;
      }
      placeActor(w, id, [-53.8 + n * 3.6, 8.2, 20]);
    }
    poseGuest(
      w,
      id,
      pose,
      r.id === 'step' ? 0.5 + 0.5 * Math.sin(r.tick / 12 + n) : 1,
      ghost?.active ? { ...wob, x: ghost.x, y: ghost.y } : wob,
    );
  });
  const a = activity(r.id);
  if (r.id === 'paddle') {
    const angle = (r.progress / 96) * Math.PI * 2;
    const x = -57 + Math.cos(angle) * 22,
      z = 92 + Math.sin(angle) * 12;
    placeActor(w, f.hero, [x, 2.25, z], -angle);
    const board = w.get(f.props[0]);
    if (board?.sceneProp) {
      board.sceneProp.x = x;
      board.sceneProp.z = z;
    }
  }
  if (r.id === 'line') placeActor(w, f.hero, [-65 + wobble.x * 0.3, 5.1, 42 + r.progress], 0);
  if (r.id === 'jog') {
    const a = (r.tick / r.length) * Math.PI * 2;
    const x = Math.sin(a) * 78,
      z = Math.cos(a) * 78;
    placeActor(w, f.hero, [x, heightAt(x, z) + 0.2, z], a + Math.PI / 2);
    placeActor(
      w,
      f.others[0],
      [
        Math.sin(a + 0.055) * 78,
        heightAt(Math.sin(a + 0.055) * 78, Math.cos(a + 0.055) * 78) + 0.2,
        Math.cos(a + 0.055) * 78,
      ],
      a + Math.PI / 2,
    );
  }
  if (r.id === 'dive') {
    const local = r.tick % 1080,
      fall = local > 720 ? Math.min(1, (local - 720) / 180) : 0;
    placeActor(w, f.hero, [a.x, 14.2 + Math.sin(fall * Math.PI) * 2 - fall * fall * 12, a.z - fall * 26], r.velocity);
  }
  if (r.id === 'tilt' && r.phase === 1) {
    if (r.offset === 0) {
      placeActor(w, f.hero, [-12, 8.2, 34]);
      r.offset = 1;
    }
    heroBody.intents = { move: [input.x * 0.7 - 0.08, -input.y * 0.6] };
    if (heroBody.x > 80 || heroBody.x < -25 || heroBody.z > 45 || heroBody.z < -10) {
      const x = clamp(heroBody.x, -25, 80),
        z = clamp(heroBody.z, -10, 45);
      placeActor(w, f.hero, [x, heightAt(x, z) + 0.2, z]);
    }
  }
  if (r.id === 'tilt' && r.phase === 3) placeActor(w, f.hero, [0, 18.5, 0], 0);
  f.feet = [heroBody.x, heroBody.y, heroBody.z];
}
export function pilot(w: W, i: Intents): void {
  const f = flowOf(w);
  f.clock++;
  for (const entity of w.query('actor')) entity.actor.intents = {};
  ambience(w);
  if (f.mode === 'sit') {
    poseGuest(w, f.hero, 'Nothing', 1, f.wobble);
    if (pressed(i, 'use') || pressed(i, 'jump')) {
      f.mode = 'roam';
      f.serial++;
    }
    return;
  }
  if (f.mode === 'roam') {
    if (w.settings.get<boolean>('game.auto') && f.clock % 60 === 0) {
      const next = DAYS[Math.min(4, f.day - 1)].events.find((id) => !f.done.includes(id));
      if (next) startEvent(w, next);
      else sleep(w);
      return;
    }
    walking(w, i);
    const hero = w.get(f.hero);
    if (hero?.actor) f.feet = [hero.actor.x, hero.actor.y, hero.actor.z];
    return;
  }
  if (f.mode === 'front' || f.mode === 'credits') {
    poseGuest(w, f.hero, f.mode === 'credits' ? 'Heron' : 'Heron', 1, {
      ...f.wobble,
      x: Math.sin(w.tick / 120) * 0.05,
    });
    poseGuest(w, f.plumb, 'Nothing', 1, { ...f.wobble, x: 0, y: 0 });
    if (f.mode === 'credits')
      f.others.forEach((id, i) =>
        poseGuest(w, id, ['Heron', 'Archer', 'Lighthouse'][i], 1, { ...f.wobble, x: 0, y: 0 }),
      );
    f.feet = [-57.4, 8.2, 20];
    return;
  }
  const c = configOf(w);
  if (f.mode === 'results') {
    f.resultsTick++;
    if (c.auto && !f.demo && f.resultsTick > 30) {
      leaveEvent(w);
      if (String(f.mode) === 'roam') {
        const next = DAYS[Math.min(4, f.day - 1)].events.find((id) => !f.done.includes(id));
        if (next) startEvent(w, next);
        else sleep(w);
      }
    }
    return;
  }
  if (f.mode !== 'event') return;
  const r = f.event;
  let input = readLean(i);
  if (c.auto) input = botFor(r, f.wobble, c);
  const seats = i['game:seats'] as number[] | undefined;
  if (seats && r.id === 'group')
    for (let seat = 0; seat < 4; seat++) {
      const j = seat * 5;
      r.inputs[seat] =
        seats[j + 4] > 0
          ? { x: seats[j], y: seats[j + 1], l: seats[j + 2], r: seats[j + 3], act: seats[j + 4] > 1 }
          : null;
    }
  f.bank += w.settings.get<number>('game.pace');
  while (f.bank >= 1) {
    f.bank--;
    if (c.auto) {
      input = botFor(r, f.wobble, c);
      if (r.id === 'group') r.inputs[0] = input;
    }
    if (r.id !== 'group') r.inputs[0] = input;
    stepEvent(r, f.wobble, input, c);
  }
  if (w.settings.get<boolean>('game.noTopple')) f.wobble.topples = 0;
  animate(w, input, c);
  if (r.id === 'dive' && r.tick % 1080 === 901) w.emit('diveSplash', {});
  if (r.id === 'step') {
    const n = rhythmNote(r, c);
    if (Math.abs(n.delta) < 0.6 && n.beat !== f.lastBeat) {
      f.lastBeat = n.beat;
      w.emit('beat', { accent: n.beat % 4 === 0 });
    }
  }
  if (f.wobble.topples > f.topples) {
    f.topples = f.wobble.topples;
    w.emit('topple', {});
    f.message =
      r.id === 'line' ? 'You have left the line. The line is fine.' : 'Again, please. The mat has not complained.';
  }
  if (r.mistakes > f.lastMistakes) {
    f.lastMistakes = r.mistakes;
    w.emit('moved', {});
  }
  if (f.demo && f.clock - f.demoStart >= 900) {
    const loop = ['pose', 'pond', 'line', 'paddle', 'garden', 'step', 'hoop', 'dive', 'tilt', 'jog'] as const;
    const n = (loop.indexOf(r.id as (typeof loop)[number]) + 1) % loop.length;
    startEvent(w, loop[n]);
    if (loop[n] === 'tilt') f.event.tick = 140 * 60;
  } else if (r.tick >= r.length) finishEvent(w);
}
export type { WobbleConfig };
