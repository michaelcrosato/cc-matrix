/**
 * @file The page app's parts that read the frame: the event handler (sounds, subtitles, results, rumble), the ambience loops, the
 * island's prompts and pickups, and attract mode (starts after 10 s idle on a front-end screen, any input leaves it). They
 * take the app's `Env`. Page-side.
 * @example
 * events(env, frame, sim(frame));
 */
import type { EngineFrame } from '../../../engine';
import { STATIONS } from '../scenes/data/world';
import { ACTIVITY_INFO, DAYS } from '../scenes/data/days';
import { hint } from './glyphs';
import { lineText } from './lines';
import { SCREENS } from './screens';
import { insOf } from './ins';
import { type Env, type Rec, sim } from './appenv';

const IDLE_S = 10;
type Loop = { volume(v: number): void };
const amb: { sea?: Loop | null; wind?: Loop | null; rain?: Loop | null } = {};
export function events(env: Env, frame: EngineFrame, s: ReturnType<typeof sim>): void {
  const settings = env.settings();
  const hud = env.hud();
  const sfx = env.sfx;
  const speak = env.speak;
  const open = env.open;
  const onResult = env.onResult;
  const ctx = env.ctx;
  const st = env.st;
  if (frame.world !== st.world) {
    st.world = frame.world;
    st.lastSeq = 0;
  }
  for (const r of frame.world.events.trace() as { seq: number; type: string; payload: Rec }[]) {
    if (r.seq <= st.lastSeq) continue;
    st.lastSeq = r.seq;
    const p = r.payload ?? {};
    if (st.attract && r.type === 'result') continue;
    switch (r.type) {
      case 'say':
        if (!st.attract || r.payload.who === 'tare') speak(p.who, p.id);
        break;
      case 'result':
        onResult(p as never);
        break;
      case 'topple':
        sfx('creak', 0.7);
        if (settings.rumble) rumble(env, 0.5);
        break;
      case 'splash':
        sfx(p.big ? 'splashHuge' : 'splashSmall');
        break;
      case 'moved':
        sfx('ooh', 0.4);
        hud?.toast('You moved.', 1.6);
        break;
      case 'lure':
        hud?.lure(lineText(p.line));
        if (p.kind === 'gull') sfx('gull');
        if (p.kind === 'frog') sfx('ribbit');
        break;
      case 'lureEnd':
        hud?.lure('');
        break;
      case 'beat':
        sfx(p.grade === 'perfect' ? 'perfect' : 'clap');
        if (settings.rumble) rumble(env, 0.2);
        break;
      case 'miss':
        sfx('miss', 0.5);
        break;
      case 'rep':
        sfx('clack');
        break;
      case 'gate':
        sfx('tick');
        break;
      case 'sink':
        sfx('sink');
        break;
      case 'lineStep':
        sfx('rope', 0.5);
        break;
      case 'gull':
        sfx('gull');
        break;
      case 'gustWarn':
        sfx('whoosh', 0.5);
        break;
      case 'storm':
        sfx('thunder');
        sfx('horn', 0.6);
        break;
      case 'lurch':
        sfx('groan');
        break;
      case 'delivered':
        sfx('ooh');
        break;
      case 'calm':
        sfx('breathOut');
        break;
      case 'hoopCaught':
        sfx('whoosh');
        break;
      case 'cards':
        sfx('ooh');
        break;
      case 'classDone':
        sfx('stamp');
        break;
      case 'roundDone': {
        st.current = 'group';
        const t = p.total as number[];
        open(
          SCREENS.results(
            ctx,
            'Group Class',
            t[0] >= Math.max(...t.slice(0, 4)) ? 'Least Wobbly' : 'Composed',
            Math.round(t[0]),
            3,
            st.said++,
          ),
        );
        break;
      }
      default:
        break;
    }
  }
  void s;
}

export function rumble(env: Env, strength: number): void {
  try {
    const pads = navigator.getGamepads?.() ?? [];
    for (const p of pads)
      (
        p as unknown as { vibrationActuator?: { playEffect?(k: string, o: object): void } } | null
      )?.vibrationActuator?.playEffect?.('dual-rumble', {
        duration: 120,
        strongMagnitude: strength,
        weakMagnitude: strength,
      });
  } catch {
    /* optional */
  }
}

export function ambience(env: Env, mode: string, storm: number): void {
  const settings = env.settings();
  const audio = env.audio();
  if (!audio || audio.state === ('blocked' as never)) return;
  try {
    if (!amb.sea) {
      amb.sea = audio.play('sfx:retreat.seaLoop', { loop: true, vol: 0.5 * settings.effects });
      amb.wind = audio.play('sfx:retreat.windLoop', { loop: true, vol: 0.2 * settings.effects });
      amb.rain = audio.play('sfx:retreat.rainLoop', { loop: true, vol: 0 });
    }
    amb.rain?.volume(storm * 0.6 * settings.effects);
    amb.wind?.volume((0.2 + storm * 0.6) * settings.effects);
  } catch {
    /* optional */
  }
  void mode;
}

export function island(env: Env, f: EngineFrame, s: ReturnType<typeof sim>): void {
  const hud = env.hud();
  const save = env.save();
  const device = (): ReturnType<typeof env.device> => env.device();
  const glyphs = (): ReturnType<typeof env.glyphs> => env.glyphs();
  const sfx = env.sfx;
  const speak = env.speak;
  const act = env.act;
  const persist = env.persist;
  const startActivity = env.startActivity;
  const openBoard = env.openBoard;
  const evening = env.evening;
  const dayDone = env.dayDone;
  const st = env.st;
  const a = s.guest!.actor;
  const near = (x: number, z: number, r: number) => Math.hypot(a.x - x, a.z - z) < r;
  for (const p of f.world.query('pebble') as Rec[])
    if (!p.pebble.found && near(p.pebble.x, p.pebble.z, 1.4)) {
      save.finds.push(p.pebble.no);
      save.pebbles += 1;
      persist();
      act('game.found', { no: p.pebble.no });
      act('game.cairn', { count: save.pebbles, age: save.ages[save.ages.length - 1] ?? 18 });
      sfx('clack');
      speak('tare', 'tare.pebble');
    }
  let target: { label: string; run: () => void } | null = null;
  const dev = device();
  const set = glyphs();
  const people: [string, string][] = [
    ['plumb', 'Plumb'],
    ['tare', 'Tare'],
    ['gerald', 'Gerald'],
    ['bex', 'Bex'],
    ['nan', 'Nan'],
    ['gull', 'the Gull'],
    ['frog', 'the Frog'],
  ];
  for (const c of f.world.query('cast', 'actor') as Rec[]) {
    const who = c.cast.who;
    const hit = people.find((p) => p[0] === who);
    if (hit && near(c.actor.x, c.actor.z, 3.2))
      target = { label: `Talk to ${hit[1]}`, run: () => speak(who, `${who}.talk.${1 + (st.said++ % 4)}`) };
  }
  for (const [id, stn] of Object.entries(STATIONS)) {
    if (near(stn.at[0], stn.at[1], 5) && id !== 'pier' && id !== 'stone' && id !== 'east') {
      const list = Object.entries(ACTIVITY_INFO).filter(
        ([k, v]) => v.where === id && !(k === 'tilt') && (st.freePlay || save.day >= 1) && k !== 'tilt',
      );
      const fit =
        list.find(
          ([k]) => DAYS[Math.min(save.day, 5) - 1].acts.includes(k) && !save.done.includes(`${save.day}:${k}`),
        ) ?? list[0];
      if (fit) target = { label: `Play ${fit[1].title}`, run: () => startActivity(fit[0]) };
    }
  }
  if (near(STATIONS.plaza.at[0] + 9, STATIONS.plaza.at[1] - 4, 4)) target = { label: 'Noticeboard', run: openBoard };
  if (near(STATIONS.huts.at[0], STATIONS.huts.at[1], 6))
    target = {
      label: dayDone() ? 'Sleep' : 'Your hut',
      run: () => (dayDone() ? (evening(), void 0) : hud?.toast('The day is not done yet. Open the Programme.', 3)),
    };
  if (save.day === 5 && dayDone() === false && near(STATIONS.stone.at[0], STATIONS.stone.at[1], 3)) target = null;
  if (target) {
    hud!.prompt(hint('use', target.label, dev, set));
    if (s.flow.nUse !== st.seenUse) target.run();
  } else hud!.prompt(hint('programme', 'Programme', dev, set));
  for (const p of f.world.query('plaque') as Rec[])
    if (
      near(p.plaque.x, p.plaque.z, 2.2) &&
      st.pebbleMsg !== p.plaque.no + 1 &&
      !save.finds.includes(100 + p.plaque.no)
    ) {
      st.pebbleMsg = p.plaque.no + 1;
      save.finds.push(100 + p.plaque.no);
      persist();
      speak('tare', `plaque.${p.plaque.no % 12}`);
    }
}

/** Idle time is wall-clock (a slow frame must not stretch the 10 s). `st.idle` holds the moment the idling began (0: not idle). */
export function idleTick(env: Env): void {
  const screens = env.screens();
  const st = env.st;
  const front = !!screens?.current && st.scr !== 'play' && st.scr !== 'pause' && !st.attract && !st.paused;
  if (st.attract) return;
  if (!front) st.idle = 0;
  else if (st.idle === 0) st.idle = performance.now();
  else if (performance.now() - st.idle > IDLE_S * 1000) startAttract(env);
}

export function startAttract(env: Env): void {
  const hud = env.hud();
  const screens = env.screens();
  const root = env.root();
  const device = (): ReturnType<typeof env.device> => env.device();
  const glyphs = (): ReturnType<typeof env.glyphs> => env.glyphs();
  const act = env.act;
  const setMap = env.setMap;
  const eng = env.eng;
  const st = env.st;
  st.attract = true;
  st.scr = 'attract';
  screens?.close();
  const e = eng();
  if (e) {
    insOf(e).set('game.auto', true);
    insOf(e).set('game.noTopple', true);
  }
  act('game.begin', { day: 5, finds: [], pebbles: 0 });
  setMap('actionMap:balance');
  hud!.clear();
  st.bannerEl = document.createElement('div');
  st.bannerEl.className = 'banner';
  st.bannerEl.dataset.attract = '1';
  st.bannerEl.innerHTML = `<div class="panel" style="display:inline-block"><h2>Well Wobbled · DEMO</h2><div>${hint('any', 'Press any button', device(), glyphs())}</div></div>`;
  root?.appendChild(st.bannerEl);
}

export function stopAttract(env: Env): void {
  const save = env.save();
  const act = env.act;
  const titleScreen = env.titleScreen;
  const setMap = env.setMap;
  const eng = env.eng;
  const st = env.st;
  if (!st.attract) return;
  st.attract = false;
  st.idle = 0;
  st.bannerEl?.remove();
  st.bannerEl = null;
  const e = eng();
  if (e) {
    insOf(e).set('game.auto', false);
    insOf(e).set('game.noTopple', false);
  }
  act('game.leave');
  act('game.begin', {
    day: save.day,
    finds: save.finds,
    pebbles: save.pebbles,
    age: save.ages[save.ages.length - 1] ?? 18,
  });
  act('game.go', { station: 'pier' });
  setMap('actionMap:menu');
  titleScreen();
}
