/**
 * @file The page's game: the flow around the sim. It owns the save and settings, the screens (title, programme, noticeboard,
 * results, evening, pause, settings, About), what the guest can use on the island, the cameras and input maps for each
 * activity, the fades, st.attract mode and the touch-only rule. The sim does the rules; this sends menu picks as scene
 * actions and reads components and events back. Page-side.
 * @example
 * const app = createApp(deps); app.frame(frameFromEngine);
 */
import type { Engine, EngineFrame } from '../../../engine';
import { createAudio, type Audio } from '../../../engine';
import { ACTIVITY_INFO, DAYS } from '../scenes/data/days';
import { groundAt } from '../scenes/data/world';
import { PEBBLE_SITES } from '../scenes/dress';
import { say as babble } from '../audio/voice';
import '../audio/sound';
import { createHud } from './hud';
import { hudFor } from './hudfor';
import type { Device, GlyphSet } from './glyphs';
import { LINES, lineText } from './lines';
import { Screens, SCREENS, type ScreenCtx, type ScreenSpec } from './screens';
import { loadSave, loadSettings, writeSave, writeSettings, makeStore } from './store';
import { stageFx } from '../cameras/stage';
import { lineOf } from './speech';
import { insOf } from './ins';
import { evening, onResult, openBoard, openProgramme } from './appscreens';
import { choose, maxColour, nextColour, ORDER, settingsRows, TITLES } from './settingsui';
import { type Env, sim, type St } from './appenv';
import { ambience, events, idleTick, island, stopAttract } from './appparts';
import { consumeEdge, markScreenChange, pollPads } from './edges';

export interface Deps {
  device: () => Device;
  engine: () => Engine | null;
  session: boolean;
  touchOnly: boolean;
}
type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const CAMERA_OF: Record<string, string> = {
  morning: 'front',
  ring: 'mat',
  pond: 'portrait',
  poseA: 'mat',
  poseB: 'mat',
  poseC: 'mat',
  poseH: 'mat',
  reps: 'side',
  step: 'behind',
  line: 'line',
  paddle: 'wide',
  garden: 'topdown',
  cliff: 'dive',
  hoop: 'front',
  jog: 'wide',
  tilt: 'tilt',
};

export function createApp(deps: Deps) {
  const store = makeStore(sessionStorage.getItem('ww-throwaway') === '1' ? 'sandbox' : 'play');
  let save = loadSave(store);
  let settings = loadSettings(store);
  let audio: Audio | null = null;
  let hud: ReturnType<typeof createHud> | null = null;
  let screens: Screens | null = null;
  let root: HTMLElement | null = null;
  let fadeEl: HTMLElement | null = null;
  const st: St = {
    current: '',
    said: 0,
    world: null,
    lastSeq: 0,
    pebbleMsg: 0,
    freePlay: false,
    idle: 0,
    bannerEl: null,
    attract: false,
    scr: 'boot',
    paused: false,
    seenUse: 0,
    page: 0,
  };
  let finalCheck = false;
  let seenPlan = 0,
    seenWave = 0;
  let lastScr = '';
  let aboutPage = 0;
  let lastFlowMode = '';
  let lastDevice: Device = 'keyboard';
  const eng = () => deps.engine();
  const insNow = () => {
    const e = eng();
    return e ? insOf(e) : null;
  };
  const act = (name: string, args?: object) => {
    const e = eng();
    if (e) insOf(e).actions.run(name, args);
  };
  /** The device used last, tracked by the page's own listeners (keys, pointer, pad polling): prompts follow it the same frame. */
  const device = (): Device => deps.device();
  const glyphs = (): GlyphSet => settings.glyphs;
  const sfx = (id: string, vol = 0.8) => {
    try {
      audio?.play(`sfx:retreat.${id}`, { vol: vol * settings.effects } as never);
    } catch {
      /* sound is a bonus */
    }
  };
  const ctx: ScreenCtx = {
    settings: () => settings,
    device,
    set: glyphs,
    pick: (s, id) => pick(s, id),
    cancel: (s) => cancel(s),
  };
  const persist = () => {
    writeSave(store, save);
    writeSettings(store, settings);
  };
  const applyAudio = () => {
    if (!audio) return;
    audio.volume('music', settings.music);
    audio.volume('effects', settings.effects);
    audio.volume('ui', settings.voices);
  };
  function setCamera(code: string): void {
    try {
      const e = eng();
      if (e) insOf(e).camera.set(code, { blend: true });
    } catch {
      /* cameras are presentation */
    }
  }
  function fade(then: () => void): void {
    if (!fadeEl) return then();
    fadeEl.classList.add('on');
    setTimeout(() => {
      then();
      setTimeout(() => fadeEl?.classList.remove('on'), 60);
    }, 380);
  }
  function speak(who: string, id: string, vars: Record<string, string | number> = {}): void {
    const text = lineText(id, vars, st.said++);
    const sec = babble(audio, who === 'guest' ? 'tare' : who, text, settings.voices);
    hud?.say(who === 'tare' ? 'Tare' : who[0].toUpperCase() + who.slice(1), text, sec);
  }
  const open = (spec: ScreenSpec) => {
    screens?.open(spec as never);
    markScreenChange();
    st.scr = (spec as { id: string }).id;
  };
  const closeScreen = () => {
    screens?.close();
    markScreenChange(); // the key that closed a screen must not also act on the island
    st.scr = st.attract ? 'attract' : 'play';
  };

  // ---- the flow -------------------------------------------------------------------------------------------------
  function titleScreen(): void {
    setCamera('cam3=stage,title');
    open(SCREENS.title(ctx, save.started, save.day > 1 || save.finished));
  }
  function begin(free = false): void {
    st.freePlay = free;
    closeScreen();
    fade(() => {
      act('game.look', { colour: Math.min(settings.colour, maxColour(save.pebbles)) });
      act('game.begin', {
        day: free ? 6 : save.day,
        finds: save.finds,
        pebbles: save.pebbles,
        age: save.ages[save.ages.length - 1] ?? 18,
      });
      toIsland(!save.started);
      save.started = true;
      persist();
    });
  }
  function toIsland(intro: boolean): void {
    st.current = '';
    act('game.leave');
    act('game.go', { station: save.started ? 'plaza' : 'pier' });
    setMap('actionMap:roam');
    setCamera('cam3=stage,roam');
    st.scr = 'play';
    if (intro) {
      speak('tare', 'tare.intro.1');
      setTimeout(() => speak('tare', 'tare.intro.2'), 5500);
      setTimeout(() => speak('tare', 'tare.intro.3'), 11500);
    } else if (save.day > 1 || save.done.length) speak('tare', 'tare.back');
  }
  let currentMap = 'actionMap:menu';
  /** The engine reads the map through `createEngine({ actionMap })` every sample, so the st.page only names it. */
  function setMap(id: string): void {
    currentMap = id;
  }
  function startActivity(id: string, round = false): void {
    if (id === 'board') return openBoard(env);
    closeScreen();
    fade(() => {
      st.current = id === 'group' ? 'group' : id;
      if (id === 'group') {
        act('game.round', { players: 1, cpu: settings.cpu });
        setMap('actionMap:balance');
        setCamera('cam3=stage,mat');
      } else {
        act('game.start', { event: id, short: round });
        setMap(id === 'garden' ? 'actionMap:garden' : 'actionMap:balance');
        setCamera(id === 'garden' ? 'cam=topdown' : `cam3=stage,${CAMERA_OF[id] ?? 'mat'}`);
      }
      stageFx.t = 0;
      st.scr = 'play';
    });
  }
  function goStation(where: string, id: string): void {
    closeScreen();
    fade(() => {
      act('game.leave');
      act('game.go', { station: where });
      setMap('actionMap:roam');
      setCamera('cam3=stage,roam');
      st.scr = 'play';
      setTimeout(() => startActivity(id), 350);
    });
  }
  function sleep(): void {
    fade(() => {
      closeScreen();
      const last = save.day >= 5;
      if (last) {
        save.day = 6;
        save.finished = true;
        persist();
        act('game.day', { day: 6 });
        credits();
        return;
      }
      save.day += 1;
      persist();
      act('game.day', { day: save.day });
      act('game.leave');
      act('game.go', { station: 'plaza' });
      setMap('actionMap:roam');
      setCamera('cam3=stage,roam');
      st.scr = 'play';
      if (save.day === 4) setTimeout(() => speak('tare', 'tare.rock'), 4000);
      else speak('tare', 'tare.keep');
    });
  }
  const credits = (): void => (setCamera('cam3=stage,title'), open(SCREENS.credits(ctx)));
  const dayDone = () =>
    DAYS[Math.min(save.day, 5) - 1].acts.every((a) => a === 'board' || save.done.includes(`${save.day}:${a}`));

  function pick(s: string, id: string): void {
    sfx('tick');
    if (s === 'title') {
      if (id === 'begin') begin(false);
      else if (id === 'free') begin(true);
      else if (id === 'group') {
        closeScreen();
        fade(() => {
          act('game.begin', { day: save.day, finds: save.finds, pebbles: save.pebbles });
          startActivity('group');
        });
      } else if (id === 'settings') openSettings('title');
      else if (id === 'about') openAbout('title');
    } else if (s === 'programme') {
      if (id === 'close') closeScreen();
      else if (id === 'board') openBoard(env);
      else goStation(ACTIVITY_INFO[id].where, id);
    } else if (s === 'board') {
      if (id === 'close') closeScreen();
      else goStation(ACTIVITY_INFO[id].where, id);
    } else if (s === 'results') {
      if (id === 'again') startActivity(st.current);
      else {
        closeScreen();
        fade(() => {
          act('game.leave');
          if (st.current === 'tilt') {
            // dawn: the last Morning Check, then the credits
            finalCheck = true;
            setTimeout(() => startActivity('morning'), 400);
            return;
          }
          if (finalCheck && st.current === 'morning') {
            finalCheck = false;
            credits();
            return;
          }
          act('game.go', { station: 'plaza' });
          setMap('actionMap:roam');
          setCamera('cam3=stage,roam');
          st.scr = 'play';
          if (dayDone()) hud?.toast('The day is done. Go to your hut to sleep, or open the Programme.', 5);
        });
      }
    } else if (s === 'evening') sleep();
    else if (s === 'credits') {
      closeScreen();
      fade(() => {
        save.finished = true;
        persist();
        toIsland(false);
        speak('tare', 'tare.free');
      });
    } else if (s === 'pause') pausePick(id);
    else if (s === 'more') {
      if (id === 'controls') openControls();
      else if (id === 'dev') openDev();
      else if (id === 'about') openAbout('more');
      else openPause();
    } else if (s === 'settings') settingsPick(id);
    else if (s.startsWith('sub-')) subPick(s, id);
    else if (s === 'about') {
      if (id === 'next') {
        aboutPage++;
        open(SCREENS.about(ctx, aboutPage));
      } else back();
    } else if (s === 'controls') back();
    else if (s === 'confirm') {
      if (id === 'yes') {
        store.clear();
        save = loadSave(store);
        settings = loadSettings(store);
        persist();
        applyAudio();
      }
      openSettings(origin);
    } else if (s === 'touch') openSettings('title');
  }
  let origin = 'title';
  function back(): void {
    if (origin === 'title') titleScreen();
    else if (origin === 'more') openMore();
    else openPause();
  }
  function cancel(s: string): void {
    if (s === 'title' || s === 'evening' || s === 'credits' || s === 'results') return;
    if (s === 'programme' || s === 'board') closeScreen();
    else if (s === 'pause') resume();
    else if (s === 'more') openPause();
    else if (s === 'settings' || s === 'about' || s === 'controls' || s.startsWith('sub-')) {
      if (s.startsWith('sub-')) openSettings(origin);
      else back();
    } else if (s === 'confirm') openSettings(origin);
  }
  function openPause(): void {
    st.paused = true;
    insNow()?.pause();
    open(SCREENS.pause(ctx, (st.current !== '' && st.current !== 'group') || st.current === 'group', deps.session));
  }
  const openMore = (): void => open(SCREENS.more(ctx, !deps.session));
  const resume = (): void => ((st.paused = false), closeScreen(), insNow()?.resume());
  function pausePick(id: string): void {
    if (id === 'resume') resume();
    else if (id === 'restart') {
      resume();
      startActivity(st.current);
    } else if (id === 'island') {
      resume();
      closeScreen();
      fade(() => {
        act('game.leave');
        act('game.go', { station: 'plaza' });
        setMap('actionMap:roam');
        setCamera('cam3=stage,roam');
        st.current = '';
        st.scr = 'play';
      });
    } else if (id === 'settings') openSettings('pause');
    else if (id === 'more') openMore();
    else if (id === 'icons') {
      settings.glyphs = settings.glyphs === 'ps' ? 'xbox' : 'ps';
      persist();
      hud?.toast(`Button icons: ${settings.glyphs === 'ps' ? 'PlayStation' : 'Xbox'}`);
    } else if (id === 'quit') {
      resume();
      fade(() => {
        act('game.leave');
        st.current = '';
        titleScreen();
      });
    }
  }
  function openSettings(from: string): void {
    origin = from;
    open(SCREENS.settings(ctx, settings));
  }
  function openAbout(from: string): void {
    origin = from;
    aboutPage = 0;
    open(SCREENS.about(ctx, 0));
  }
  function openControls(): void {
    origin = 'more';
    open(SCREENS.controls(ctx, [{ label: 'Back', id: 'back' }]));
  }
  let openDev = () => hud?.toast('Dev Mode is not loaded');
  function settingsPick(id: string): void {
    if (id === 'back') return back();
    if (id === 'erase') return open(SCREENS.confirm(ctx, 'Erase Save', 'Everything you have done on the island will be forgotten. The island will not mind.', 'Erase')); // prettier-ignore
    open(SCREENS.group(ctx, TITLES[id] ?? 'Display', settingsRows(id, settings)));
  }
  function subPick(s: string, id: string): void {
    if (id === 'back') return openSettings(origin);
    if (id === 'expert' && !settings.expert && save.pebbles < 10) {
      hud?.toast('Expert variants unlock at 10 pebbles.', 3);
      return;
    }
    if (id === 'colour') {
      settings.colour = nextColour(settings.colour, save.pebbles);
      act('game.look', { colour: settings.colour });
      setTimeout(() => act('game.go', { station: 'plaza' }), 200);
    }
    choose(id, settings);
    insNow()?.set('game.expert', settings.expert);
    persist();
    applyAudio();
    stageFx.reduced = settings.reduced;
    insNow()?.set('game.assist', settings.steady ? 1 : 0);
    settingsPick(s === 'sub-Sound' ? 'sound' : s === 'sub-Play' ? 'play' : 'display');
    screens?.select(ORDER.indexOf(id) % 6);
  }
  // ---- per frame ------------------------------------------------------------------------------------------------
  function frame(f: EngineFrame): void {
    const e = eng();
    if (!e || !hud || !screens) return;
    pollPads();
    if ((screens.current || '') !== lastScr) {
      lastScr = screens.current || '';
      markScreenChange();
    }
    const s = sim(f);
    const dt = f.dt;
    events(env, f, s);
    stageFx.t += dt;
    lastDevice = device();
    if (screens.current) screens.update(dt);
    hud.update(dt);
    const mode = s.flow.mode ?? 'roam';
    // pause and shortcuts
    if (!screens.current && !st.attract && st.scr === 'play') {
      if (consumeEdge('pause')) openPause();
      else if (mode === 'roam' && s.flow.nPlan !== seenPlan) openProgramme(env);
      else if (mode === 'roam' && s.flow.nWave !== seenWave) {
        sfx('squeak');
        hud.toast('You wave. Nothing waves back. That is also a wave.', 2.5);
      }
    }
    if (screens.current === 'pause' && consumeEdge('pause')) resume();
    seenPlan = s.flow.nPlan;
    seenWave = s.flow.nWave; // consumed this frame
    // HUD
    const inEvent = mode === 'event' && s.run?.id;
    if (inEvent && s.guest) {
      const w = s.guest.wobble;
      const ex = hudFor(s.run!.id, s.run as never, w, 3);
      hud.disc({
        x: w.x,
        y: w.y,
        calm: w.calm,
        lungs: w.lungs,
        guide: w.guide,
        fl: s.seat?.fl ?? 0,
        fr: s.seat?.fr ?? 0,
        breath: ex.breath,
        ring: ex.ring,
        target: ex.target,
        guideDot: ex.guideDot,
        show: ex.disc && !st.attract,
      });
      hud.strip(ex.left, ex.right);
    } else {
      hud.disc({ x: 0, y: 0, calm: 0, lungs: 0, guide: 0, fl: 0, fr: 0, breath: false, show: false });
      hud.strip('', '');
    }
    if (mode !== lastFlowMode) {
      lastFlowMode = mode;
      if (mode === 'roam') hud.clear();
    }
    // island prompts
    if (mode === 'roam' && s.guest && !screens.current && !st.attract) island(env, f, s);
    else if (!inEvent) hud.prompt('');
    // st.attract
    if (!deps.touchOnly || true) idleTick(env);
    // tilt: the camera banks
    const isl = (f.world.query('island')[0] as Rec | undefined)?.island;
    stageFx.roll = isl ? Math.atan2(isl.tiltX * 0.12, 1) : 0;
    try {
      audio?.update(f.camera as never, f.queries ?? undefined);
    } catch {
      /* audio is optional */
    }
    ambience(env, mode, isl?.storm ?? 0);
    st.seenUse = s.flow.nUse;
  }
  function anyInput(): void {
    st.idle = 0;
    if (st.attract) stopAttract(env);
  }
  const env: Env = {
    st,
    ctx,
    settings: () => settings,
    hud: () => hud,
    save: () => save,
    audio: () => audio,
    screens: () => screens,
    root: () => root,
    eng,
    device,
    glyphs,
    sfx,
    speak,
    act,
    persist,
    open,
    startActivity,
    openBoard: () => openBoard(env),
    evening: () => evening(env),
    dayDone,
    titleScreen,
    setMap,
    onResult: (r) => onResult(env, r),
    insNow,
    setCamera,
    closeScreen,
  };
  return {
    store,
    ctx,
    frame,
    mapId: () => currentMap,
    anyInput,
    speak,
    sfx,
    setCamera,
    setMap,
    fade,
    get save() {
      return save;
    },
    get settings() {
      return settings;
    },
    get audio() {
      return audio;
    },
    get attract() {
      return st.attract;
    },
    get lastDevice() {
      return lastDevice;
    },
    get modal() {
      return () => !!screens?.current || st.paused;
    },
    get screenName() {
      return st.scr;
    },
    mount(rootEl: HTMLElement, engine: Engine): void {
      root = rootEl;
      hud = createHud(rootEl);
      screens = new Screens(rootEl, engine.input!, ctx);
      fadeEl = document.createElement('div');
      fadeEl.className = 'fade';
      rootEl.appendChild(fadeEl);
      audio = createAudio();
      audio.volume('music', settings.music);
      applyAudio();
      stageFx.reduced = settings.reduced;
      try {
        audio.music('song:retreat.lobby');
      } catch {
        /* optional */
      }
      setMap('actionMap:menu');
      if (deps.touchOnly) {
        open(SCREENS.touch());
        st.scr = 'touch';
      } else titleScreen();
    },
    setOpenDev(fn: () => void) {
      openDev = fn;
    },
    openPause,
    titleScreen,
    resume,
    hud: () => hud,
    lineOf,
    LINES,
    groundAt,
    PEBBLE_SITES,
  };
}
export type App = ReturnType<typeof createApp>;
