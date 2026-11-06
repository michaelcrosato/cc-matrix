/**
 * @file What the page app does each frame, apart from the screens: seats' input, the camera, the HUD, what the Guest looks
 * at, the look and weather, the music, attract's clock, and a session's numbers. Each reads the sim and writes nothing back.
 *
 * Game code, a page's.
 *
 * @example
 * // updateCamera(app, flow, running, island, cast, inspector);
 */
import { MAT_OFFSETS, STATIONS } from '../scenes/data/stations';
import type { SeatView } from './hud/seatDiscs';
import type { EngineFrame, Input, Inspector } from '../../../engine';
import { setShot } from '../cameras/shot';
import type { ActivityData, Cast, Flow, IslandData, Seat, Wobble } from '../scenes/components';
import { ACTIVITIES } from '../scenes/events/index';
import { USABLES } from '../scenes/data/usables';
import type { App } from './app';
import { rumble } from './appInput';
import { promptHtml } from './glyphs';
import { getLine } from './lines/index';
import { joined, padSeat } from './screens/join';
import { shotFor, type ShotView } from './shots';

/** Seconds on a front-end menu before attract starts. */
const ATTRACT_AFTER = 10;

/** Mouse lean, the pointer's place, and each seat's input. */
export function sendInput(app: App, flow: Flow, running: ActivityData | null, input: Input): void {
  const scale = 0.0028 * app.settings.mouse;
  const leaning = flow.mode === 'event' && app.stack.length === 0;
  if (leaning) {
    const [dx, dy] = app.mouse;
    input.virtual.axis('game:mouse', [dx * scale, -dy * scale]);
  } else input.virtual.axis('game:mouse', [0, 0]);
  app.mouse = [0, 0];
  const free = running?.id === 'garden' && app.device_ === 'mouse';
  input.virtual.axis(
    'game:pointer',
    free ? [Math.max(-1, Math.min(1, app.point[0])), Math.max(-1, Math.min(1, app.point[1])), app.point[2]] : [0, 0, 0],
  );
  if (flow.mode === 'event' && running?.id === 'group' && joined.length > 1) {
    const pads = navigator.getGamepads?.() ?? [];
    const data: number[] = [];
    for (let i = 0; i < 4; i++) {
      const who = joined[i];
      const pad = who && who.pad >= 0 ? pads[who.pad] : null;
      if (pad) data.push(...padSeat(pad));
      else if (who) {
        const s = (name: string) => input.strength(name);
        data.push(s('right') - s('left'), s('forward') - s('back'), s('footl'), s('footr'), input.held('act') ? 1 : 0);
      } else data.push(0, 0, 0, 0, 0);
    }
    input.virtual.axis('game:seats', data);
  }
}

/** Chooses and aims the camera. */
export function updateCamera(
  app: App,
  flow: Flow,
  running: ActivityData | null,
  island: IslandData,
  cast: { actor: { x: number; y: number; z: number; yaw: number } } | undefined,
  inspector: Inspector,
): void {
  const walking =
    !app.attract &&
    (flow.mode === 'roam' ||
      (flow.mode === 'event' && (running?.id === 'jog' || (running?.id === 'tilt' && running.phase === 'east'))));
  const free = app.freeCamera && !app.session;
  const code = free ? 'cam3=fly' : walking ? 'cam3=chase' : 'cam3=shot';
  if (code !== app.camCode) {
    app.camCode = code;
    (inspector.camera as { set(c: string, o: unknown): void }).set(code, { blend: true });
  }
  if (code !== 'cam3=shot') return;
  const guest = cast?.actor ?? { x: 0, y: 8, z: 30, yaw: 0 };
  const innerPhase =
    running?.id === 'group' ? ((running.data as { inner?: ActivityData }).inner?.phase ?? '') : (running?.phase ?? '');
  const view: ShotView = {
    t: app.clock,
    phase: innerPhase,
    guest,
    tiltX: island.tiltX,
    tiltZ: island.tiltZ,
    reduced: app.settings.reduced,
    data: running?.data ?? {},
    round: app.session,
  };
  let name = 'title';
  if (app.sessionState && !app.sessionState.started) name = 'card';
  else if (flow.credits) name = 'credits';
  else if (running && (flow.mode === 'event' || flow.mode === 'results')) name = ACTIVITIES[running.id]?.shot ?? 'mat';
  else if (flow.mode === 'results') name = 'mat';
  setShot(shotFor(name, view));
}

/** The level direction to the right of a camera's heading (engine/gfx/cameras/pose.ts), as x and z. */
const RIGHT_OF = (yaw: number): [number, number] => [-Math.cos(yaw), Math.sin(yaw)];

/** Group Class's seats on this screen, each with how far across the screen its mat stands; a lone player keeps the big disc. */
function seatViews(
  seats: readonly { seat: Seat; wobble: Wobble }[],
  camera: EngineFrame['camera'],
): SeatView[] | undefined {
  const active = seats.filter((e) => e.seat.kind !== 'off');
  if (active.length < 2) return undefined;
  const { x, z } = STATIONS.pavilion;
  const [rx, rz] = RIGHT_OF(camera.yaw);
  return active.map(({ seat, wobble }) => {
    const [ox, oz] = MAT_OFFSETS[seat.index];
    return { seat, wobble, across: rx * (x + ox - camera.position[0]) + rz * (z + oz - camera.position[2]) };
  });
}

/** The HUD. */
export function updateHud(
  app: App,
  flow: Flow,
  running: ActivityData | null,
  seat: { seat: Seat; wobble: Wobble } | undefined,
  seats: readonly { seat: Seat; wobble: Wobble }[],
  camera: EngineFrame['camera'],
): void {
  if (flow.mode !== 'event' || !running) {
    app.hud.hide();
    return;
  }
  const groupData =
    running.id === 'group' ? (running.data as { inner?: ActivityData; totals?: number[]; win?: number }) : null;
  if (groupData && running.phase === 'podium') {
    const names = app.sessionState ? app.sessionState.info.players.map((p) => p.name) : ['You', 'Gerald', 'Bex', 'Nan'];
    app.hud.update({
      activity: running,
      hud: { title: 'Group Class', show: { totals: groupData.totals, win: groupData.win, names } },
      id: 'podium',
      phase: 'podium',
      device: app.device_,
      glyphs: app.settings.glyphs,
    });
    return;
  }
  const inner = groupData?.inner ?? running;
  app.hud.update({
    activity: inner,
    hud: inner.hud,
    id: inner.id,
    phase: inner.phase,
    wobble: seat?.wobble,
    seat: seat?.seat,
    seats: groupData ? seatViews(seats, camera) : undefined,
    device: app.device_,
    glyphs: app.settings.glyphs,
  });
  if (seat) {
    const r = Math.hypot(seat.wobble.x, seat.wobble.y);
    app.sound.creak(r);
    // A light rumble that grows as you near the edge.
    if (r > 0.72 && app.frameCount % 8 === 0) rumble(app, (r - 0.6) * 0.6, 90);
    // The breath, heard: in when both feet go down, out when they let go.
    const both = seat.seat.fl >= 0.5 && seat.seat.fr >= 0.5;
    if (both !== app.breathing) {
      app.breathing = both;
      if (seat.wobble.usesBreath) app.sound.play(both ? 'sfx:breathIn' : 'sfx:breathOut');
    }
  }
  const speed = Number((inner.hud.show as { speed?: number } | undefined)?.speed ?? 0);
  app.sound.marble(inner.id === 'garden' ? speed : 0);
}

/** What the Guest is looking at: a highlight and its prompt. */
export function updateFocus(app: App, flow: Flow): void {
  const on = flow.mode === 'roam' && flow.focus >= 0 && app.stack.length === 0 && !app.attract;
  app.reticle.style.display = flow.mode === 'roam' && app.stack.length === 0 && !app.attract ? '' : 'none';
  // Browsers grant pointer lock only in a click: the first time a mouse player needs the lean, say so.
  const wantsClick =
    app.device_ === 'mouse' &&
    flow.mode === 'event' &&
    app.stack.length === 0 &&
    !app.attract &&
    !document.pointerLockElement &&
    ACTIVITIES[flow.event]?.map === 'actionMap:balance';
  app.clickEl.style.display = wantsClick ? '' : 'none';
  app.focusEl.style.display = on ? '' : 'none';
  if (on) {
    const usable = USABLES[flow.focus];
    const key = `${usable.id}|${app.device_}|${app.settings.glyphs}`;
    if (app.dev !== key) {
      app.dev = key;
      app.focusEl.innerHTML = promptHtml('use', usable.label, app.device_, app.settings.glyphs);
    }
  }
}

/** The look and the weather, by the sim's sky. */
export function updateWorldLook(app: App, frame: EngineFrame, island: IslandData, flow: Flow): void {
  const evening = app.stack.some((s) => s.name === 'evening');
  const want =
    island.sky === 'storm'
      ? 'look:storm'
      : island.sky === 'dawn' || flow.credits
        ? 'look:retreatDawn'
        : evening
          ? 'look:retreatDusk'
          : 'look:retreat';
  if (want !== app.look && !app.session) {
    app.look = want;
    app.engine.inspector?.set('post.look', want);
  }
  if (island.sky === 'storm') {
    const c = frame.camera.position;
    frame.emit('emitter:teeterRain', [c[0], c[1] + 10, c[2]], 'rain');
    frame.emit('emitter:teeterSpray', [0, 3, 60], 'spray');
  }
}

/** Good breathing warms the picture slightly and softens the sound (PLAN.md section 3): in steps, so settings change rarely. */
export function updateCalm(app: App, flow: Flow, seat: { wobble: Wobble } | undefined): void {
  const calm = flow.mode === 'event' && seat ? Math.round(seat.wobble.calm * 4) / 4 : 0;
  if (calm === app.calmStep) return;
  app.calmStep = calm;
  app.engine.inspector?.set('post.filters', calm > 0 ? { grade: { temperature: calm * 0.12 } } : {});
  app.sound.setCalm(calm);
}

/** The song and ambience. */
export function updateMusic(app: App, flow: Flow, running: ActivityData | null, island: IslandData): void {
  const inner = running?.id === 'group' ? (running.data as { inner?: ActivityData }).inner : running;
  const phrase = running?.id === 'step' ? stepPhrase(running) : 1;
  app.sound.setMusic({
    event: inner?.id ?? flow.event,
    mode: flow.mode,
    day: flow.day,
    sky: island.sky,
    front: flow.mode === 'front',
    phrase,
    tilt: Math.abs(island.tiltX),
    credits: flow.credits,
  });
}

/** Which of Step Class's three phrases is on. */
function stepPhrase(a: ActivityData): number {
  const data = a.data as { end?: number };
  const u = (a.t / (data.end ?? 1)) * 3;
  return Math.min(2, Math.floor(u));
}

/** Idle on a front-end menu starts attract. */
export function updateAttract(app: App, dt: number, flow: Flow): void {
  if (app.session) return;
  const onFront = flow.mode === 'front' && app.stack.length > 0 && app.stack.every((s) => s === app.title);
  if (app.attract) {
    app.attractEl.innerHTML = `<b>Teeter Fit</b><span>DEMO</span>${promptHtml('any', 'Press any button', app.device_, app.settings.glyphs)}`;
    return;
  }
  if (onFront) {
    app.idle += dt;
    if (app.idle >= ATTRACT_AFTER) app.startAttract();
  } else app.idle = 0;
}

/** The session's numbers. */
export function updateSession(
  app: App,
  frame: EngineFrame,
  flow: Flow,
  running: ActivityData | null,
  seat: { seat: Seat; wobble: Wobble } | undefined,
): void {
  const s = app.sessionState;
  if (!s) return;
  const data = (running?.data ?? {}) as {
    index?: number;
    totals?: number[];
    perClass?: number[][];
    classes?: string[];
    inner?: ActivityData;
  };
  const me = s.info.me;
  const inner = data.inner;
  let live = 0;
  if (inner && running?.phase === 'class') {
    try {
      live = Math.max(0, Math.min(1000, ACTIVITIES[inner.id]?.score({ a: inner } as never, me) ?? 0));
    } catch {
      live = 0; // a class's first steps may have nothing to score yet
    }
  }
  const total = Math.round((data.totals?.[me] ?? 0) + live);
  const index = data.index ?? 0;
  const cast = seat
    ? (frame.world as unknown as { get(id: number): { cast?: Cast } | undefined }).get(seat.seat.actor)?.cast
    : undefined;
  const label =
    flow.mode === 'results' ? `Finished · ${total}` : running ? `Class ${index + 1} · ${total}` : 'Breathing in';
  s.now = {
    classIndex: index,
    x: seat?.wobble.x ?? 0,
    y: seat?.wobble.y ?? 0,
    pose: cast?.pose.startsWith('~') ? '' : (cast?.pose ?? ''),
    total,
    label,
    done: flow.mode === 'results',
    stats: sessionStats(data, me),
    awards: sessionAwards(data, me),
  };
  s.frame();
  if (flow.mode === 'results' && !app.ending) {
    app.ending = true;
    app.speech.show('plumb', getLine('group.podium')?.text ?? '', 3);
  }
}

/** sessionStats. */
function sessionStats(
  data: { perClass?: number[][]; classes?: string[] },
  me: number,
): Record<string, string | number> {
  const list = data.perClass?.[me] ?? [];
  const stats: Record<string, string | number> = {};
  list.forEach((score, i) => {
    stats[`Class ${i + 1}`] = score;
  });
  if (list.length) stats['Best hold'] = Math.max(...list);
  return stats;
}

/** sessionAwards. */
function sessionAwards(data: { perClass?: number[][] }, me: number): { title: string; detail: string }[] {
  const list = data.perClass?.[me] ?? [];
  if (list.some((v) => v >= 900)) return [{ title: 'Unnervingly Still', detail: 'A class at Unsettling' }];
  return [];
}
