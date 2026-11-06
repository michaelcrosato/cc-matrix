/**
 * @file Everything the page does each drawn frame: reads the sim's mode and events to choose the screens, the action map,
 * the camera, the HUD and the sound. It reads the run and never writes it: all picks go through scene actions.
 */
import { type createEngine, type createStore, type EngineFrame, type Inspector } from '../../../engine';
import type { createSound } from '../audio/sound';
import { runSession, type HubApi, type HubInfo, type Opening } from '../hub/session';
import { ACTIVITIES } from '../scenes/events';
import { flowOf, seatsOf, type W } from '../scenes/types';
import { type Screen, type Settings } from './ctx';
import { updateDevOverlay } from './dev/panel';
import { promptBar } from './glyphs';
import { createHud } from './hud';
import { attractBanner, pierScreen, titleScreen } from './screens/front';
import { sendSeatInput } from './screens/group';
import { pauseScreen, sessionPauseScreen } from './screens/pause';
import { GUEST_BUILDS, guestBody } from '../cast/people';
import { creditsScreen, eveningScreen, programmeScreen, resultsScreen } from './screens/programme';
import { createNav } from './nav';
import { createCtx } from './page-ctx';
import { createDevices } from './page-devices';
import { createEventReader } from './page-events';
import { drawNear } from './hud/near';
import { publishGame } from './page-publish';
import { updateShot } from './shots';

export function createPage(args: {
  engine: Awaited<ReturnType<typeof createEngine>>;
  store: ReturnType<typeof createStore>;
  sound: ReturnType<typeof createSound>;
  settings: Settings;
  info: HubInfo | null;
  opening: Opening | null;
  root: HTMLElement;
}) {
  const { engine, store, sound, settings, info, opening, root } = args;
  const inspector = engine.inspector as Inspector;
  const input = engine.input!;
  root.dataset.pad = settings.icons;
  const hud = createHud(root);
  const near = document.createElement('div');
  near.className = 'wt-near';
  near.dataset.ui = 'near';
  near.style.display = 'none';
  const roamBar = document.createElement('div');
  roamBar.innerHTML = promptBar([
    ['plan', 'Programme'],
    ['pause', 'Pause'],
  ]);
  roamBar.dataset.ui = 'roam-bar';
  root.append(roamBar, near);
  const clickHint = document.createElement('div');
  clickHint.className = 'wt-near';
  clickHint.style.cssText = 'display:none;bottom:auto;top:21vh';
  clickHint.dataset.ui = 'click-hint';
  clickHint.textContent = 'Click to lean with the mouse';
  root.append(clickHint);
  const hubApi = (window as unknown as { AIHub?: HubApi }).AIHub;
  const inHub = !!info;
  let worldNow: W | null = null;

  const nav = createNav();
  const stack: Screen[] = [];
  const { ctx, tickSpeech } = createCtx({
    engine,
    inspector,
    input,
    nav,
    store,
    sound,
    root,
    settings,
    stack,
    inHub,
    world: () => worldNow as W,
  });
  const devices = createDevices(
    root,
    () => currentMap,
    () => stack.length,
  );
  const { setDevice, askedFor, mouseTotal } = devices;
  devices.settingsOf.mouse = settings.mouse;
  const reader = createEventReader(ctx);
  const { rumble } = reader;

  let lastMode = '';
  let currentMap = 'actionMap:wtMenu';
  let title: Screen | null = null;
  let banner: HTMLElement | null = null;
  let attract = false;
  let quietUntil = 0;
  let menuQuiet = 0; // the press that closed a menu is not a press in play
  let idle = 0;
  let realT = 0;
  let touchOnly = matchMedia('(hover: none) and (pointer: coarse)').matches;
  let session: ReturnType<typeof runSession> | null = null;
  let camera = '';
  let lastTiltLook = '';
  let shakeRumble = 0;
  let lastFrame: EngineFrame | null = null;
  const fixedLook = location.search.includes('post.look');
  const touchScreen = () => touchOnly;

  const seenInput = (event: Event) => {
    idle = 0;
    if (event.type === 'keydown') touchOnly = false;
    if (attract && !(touchOnly && event.type.startsWith('pointer')) && !(touchOnly && event.type === 'touchstart'))
      exitAttract();
  };
  for (const type of ['keydown', 'pointerdown', 'wheel']) addEventListener(type, seenInput);
  addEventListener('pointermove', (event) => {
    if (Math.abs(event.movementX) + Math.abs(event.movementY) > 1 && event.pointerType === 'mouse') seenInput(event);
  });

  function exitAttract(): void {
    attract = false;
    quietUntil = realT + 0.5;
    banner?.remove();
    banner = null;
    ctx.run('game.attract', { on: false });
    ctx.run('game.front');
    idle = 0;
  }

  function hasSave(): boolean {
    return store.get<{ day?: number } | null>('game', null) !== null;
  }

  function begin(fresh: boolean): void {
    if (fresh) store.remove('game');
    const save = store.get<Record<string, unknown>>('game', {});
    const start = () => {
      closeTitle();
      ctx.fade(() => {
        ctx.run('game.begin', {
          day: 1,
          done: [],
          ages: [],
          pebbles: 0,
          found: [],
          plaques: [],
          bests: {},
          free: false,
          ...save,
          steadier: settings.steadier,
          outfit: guestBody(settings.look, settings.colour, settings.headband),
          outfitBuild: GUEST_BUILDS[settings.look],
        });
        if (!save.day) ctx.say('arrive.1', 'tare');
      });
    };
    if (!save.day) ctx.push(pierScreen(ctx, start));
    else start();
  }

  function closeTitle(): void {
    if (title) {
      const at = stack.indexOf(title);
      if (at >= 0) stack.splice(at, 1);
      title.close?.();
      title = null;
    }
  }

  function openTitle(): void {
    if (title) return;
    title = titleScreen(ctx, { touch: touchScreen, onBegin: begin, hasSave });
    ctx.push(title);
    idle = 0;
  }

  /** Which device the prompts show. */
  function deviceFrame(): void {
    if (input.lastDevice === 'gamepad') {
      setDevice('pad');
      touchOnly = false;
    }
    const pad = (navigator.getGamepads?.() ?? []).find((p) => p);
    const any = !!pad && (pad.buttons.some((b) => b.pressed) || pad.axes.some((a) => Math.abs(a) > 0.3));
    if (any) {
      setDevice('pad');
      idle = 0;
      touchOnly = false;
      if (attract) exitAttract();
    }
  }

  function guestFeet(frame: EngineFrame): { x: number; y: number; z: number } {
    const seat = seatsOf(frame.world as unknown as W).find((e) => e.seat.index === (inHub ? ctx.flow().meSeat : 0));
    const entity = seat
      ? (frame.world as unknown as { get(i: number): { actor: { x: number; y: number; z: number } } | undefined }).get(
          seat.seat.actor,
        )
      : undefined;
    return entity?.actor ?? { x: 0, y: 8, z: 0 };
  }

  /** The engine asks for the map at every sample, so the page answers rather than switching it. */
  function useMap(id: string): void {
    currentMap = id;
  }

  return {
    map: () => currentMap,
    modal: () => stack.some((s) => s !== title || !attract) || realT < menuQuiet,
    cameraFollow() {
      const f = worldNow ? guestFollow() : undefined;
      return f ? { follow: f } : undefined;
    },
    frame(frame: EngineFrame) {
      lastFrame = frame;
      if (stack.length && !attract) menuQuiet = realT + 0.7;
      devices.settingsOf.mouse = settings.mouse;
      nav.frame();
      const dt = frame.dt;
      realT += dt;
      worldNow = frame.world as unknown as W;
      const flow = flowOf(worldNow);
      const paused = stack.some((s) => s.el.dataset.ui === 'pause' || s.el.dataset.ui === 'dev');
      deviceFrame();
      reader.read(frame, flow);
      // session
      if (inHub) {
        if (!session && info && hubApi && opening) session = runSession(ctx, hubApi, info, opening);
        session?.frame();
      }
      // modes
      const mode = flow.auto ? 'attract' : flow.mode;
      if (mode !== lastMode) {
        lastMode = mode;
        if (!inHub) {
          if (mode === 'front') openTitle();
          else if (mode !== 'attract') closeTitle();
          if (mode === 'results' && !flow.drive && !flow.auto)
            ctx.push(resultsScreen(ctx, () => ctx.fade(() => ctx.run('game.leave'))));
          if (mode === 'evening') ctx.push(eveningScreen(ctx));
          if (mode === 'credits')
            ctx.push(
              creditsScreen(ctx, () => {
                ctx.run('game.after');
                ctx.say('after', 'tare');
                ctx.saveGame();
              }),
            );
          if (mode === 'roam' && flow.done.length === 0) ctx.saveGame();
        }
      }
      // pause
      const asked = askedFor();
      if (!inHub && asked.pause && !stack.length && flow.mode !== 'front' && !flow.auto) {
        quietUntil = realT + 0.001; // the same Esc would close it again this frame
        inspector.pause();
        ctx.push(
          pauseScreen(
            ctx,
            () => {
              inspector.resume();
              ctx.saveGame();
              ctx.clear();
              ctx.run('game.front');
              lastMode = '';
            },
            () => inspector.resume(),
          ),
        );
      } else if (
        inHub &&
        stack.length === 0 &&
        asked.pause &&
        !(navigator.getGamepads?.() ?? []).some((pad) => pad?.buttons[8]?.pressed)
      ) {
        quietUntil = realT + 0.001;
        ctx.push(sessionPauseScreen(ctx));
      }
      if (paused) updateDevOverlay(ctx);
      // programme
      if (flow.mode === 'roam' && !stack.length && asked.plan) ctx.push(programmeScreen(ctx));
      // screens
      if (realT >= quietUntil) stack[stack.length - 1]?.update(dt); // the press that left attract picks nothing
      // attract's clock
      if (flow.mode === 'front' && !attract && !inHub && stack.length >= 1) {
        idle += dt;
        if (idle >= 10) {
          attract = true;
          banner = attractBanner(ctx);
          ctx.run('game.attract', { on: true });
        }
      } else if (!attract) idle = 0;
      stack.forEach((one, i) => {
        one.el.style.display = (attract && !touchOnly) || i < stack.length - 1 ? 'none' : '';
      });
      // maps
      const ev = flow.ev;
      if (stack.length && !attract) useMap('actionMap:wtMenu');
      else if (ev && flow.mode === 'event')
        useMap(ACTIVITIES[ev.id]?.map === 'pointer' ? 'actionMap:wtPointer' : 'actionMap:balance');
      else if (flow.mode === 'roam') useMap('actionMap:roam');
      else useMap('actionMap:wtMenu');
      if (ev?.id === 'garden' && flow.mode === 'event') {
        const place = devices.pointer();
        if (place) input.virtual.axis('game:pointer', place);
      }
      if (ev && flow.mode === 'event') input.virtual.axis('game:mouse', [...mouseTotal]);
      if (flow.mode === 'event' && flow.group) sendSeatInput(ctx);
      // camera
      const wanted =
        flow.mode === 'roam' && !(window as unknown as { __wtFly?: boolean }).__wtFly ? 'cam3=chase' : 'cam3=stage';
      if (wanted !== camera && !(window as unknown as { __wtFly?: boolean }).__wtFly) {
        camera = wanted;
        (inspector as unknown as { camera: { set(c: string, o?: object): void } }).camera.set(wanted, { blend: true });
      }
      const isl = (
        worldNow.query('island')[0] as unknown as {
          island: { tiltX: number; tiltZ: number; tilt: number; storm: number };
        }
      ).island;
      const seat = seatsOf(worldNow).find((e) => e.seat.index === (inHub ? flow.meSeat : 0));
      if (seat)
        updateShot(frame, flow, seat.seat.actor, realT, settings.reduced, {
          x: isl.tiltX,
          z: isl.tiltZ,
          story: isl.tilt * 0.1,
        });
      // the look follows the weather and the hour
      const look =
        isl.storm > 0.3
          ? 'look:storm'
          : flow.mode === 'evening'
            ? 'look:dusk'
            : ev?.id === 'pond' || (ev?.id === 'tilt' && ev.phase === 'dawn') || flow.mode === 'credits'
              ? 'look:dawn'
              : 'look:retreat';
      if (look !== lastTiltLook && !inHub && !fixedLook) {
        lastTiltLook = look;
        inspector.set('post.look', look);
      }
      if (isl.storm > 0.3) {
        const g = guestFeet(frame);
        frame.emit('emitter:wtRain', [g.x, g.y + 12, g.z], 'rain', isl.storm);
        frame.emit('emitter:wtSpray', [g.x, 2.5, g.z], 'spray', isl.storm);
      }
      // music
      const song = stack.some((s) => s.el.dataset.ui === 'evening')
        ? 'song:dawn'
        : flow.mode === 'credits'
          ? 'song:dawn'
          : ev && flow.mode === 'event'
            ? (ACTIVITIES[ev.id]?.song ?? '')
            : 'song:lobby';
      sound.song(song);
      if (ev?.id === 'tilt') sound.audio.intensity(Math.min(1, Math.abs(isl.tiltX) / 7));
      else if (flow.mode === 'roam') sound.audio.intensity(0.1 + flow.day * 0.15);
      sound.audio.update(frame.camera, frame.queries ?? undefined);
      sound.ambience(isl.storm);
      // HUD
      const wobblePath = seat ? { seat: seat.seat, wobble: seat.wobble } : null;
      const period = frame.setting('game.breath.period') as number;
      hud.update(flow, wobblePath, worldNow.tick, period, 0, frame.setting('game.pose.ring') as number);
      roamBar.style.display = flow.mode === 'roam' && !stack.length ? '' : 'none';
      drawNear(near, flow, !stack.length);
      if (seat && Math.hypot(seat.wobble.x, seat.wobble.y) > 0.85 && flow.mode === 'event') {
        shakeRumble -= dt;
        if (shakeRumble <= 0) {
          shakeRumble = 0.4;
          rumble(0.2, 120);
        }
      }
      tickSpeech(dt);
      const wantsClick =
        root.dataset.device === 'mouse' &&
        flow.mode === 'event' &&
        ev &&
        ACTIVITIES[ev.id]?.map === 'balance' &&
        !document.pointerLockElement &&
        !stack.length;
      clickHint.style.display = wantsClick ? '' : 'none';
      publishGame({
        screen: stack[stack.length - 1]?.el.dataset.ui ?? flow.mode,
        attract,
        touchOnly,
        focusIn: stack[stack.length - 1]?.el ?? root,
        root,
        settings,
        sound,
        flow,
        setting: (key) => lastFrame?.setting(key),
      });
    },
  };

  function guestFollow(): [number, number, number] | undefined {
    const seat = seatsOf(worldNow as W).find((e) => e.seat.index === (inHub ? flowOf(worldNow as W).meSeat : 0));
    const entity = seat ? (worldNow as unknown as { get(i: number): { actor: { x: number; y: number; z: number } } | undefined }).get(seat.seat.actor) : undefined; // prettier-ignore
    return entity ? [entity.actor.x, entity.actor.y, entity.actor.z] : undefined;
  }
}
