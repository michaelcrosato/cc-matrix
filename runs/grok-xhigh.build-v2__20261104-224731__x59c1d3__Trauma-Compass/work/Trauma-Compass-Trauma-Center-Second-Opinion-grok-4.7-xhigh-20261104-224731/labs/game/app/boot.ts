/**
 * @file The page. It starts the engine after the hub has connected, draws the screens, and feeds the operation.
 */
import { createAudio, createEngine, createStore, type Engine, type EngineFrame, type Input } from '../../../engine';
import { voiceOf } from '../op/voice';
import { ARENA_TEXT, play } from '../scenes/play';
import { main } from '../scenes/main';
import { FIELD_AT, OR_TEXT } from '../scenes/room';
import { followChart, liveOp } from '../scenes/bridge';
import { TUNE } from '../scenes/tune';
import { SURGEON_MAP } from '../input/map';
import { endSample, gloveSpots, readHands, samplePads, touchOnly, watchPointer, type Feel } from '../input/hands';
import { packHands } from '../op/codec';
import { usePrompt } from '../input/glyphs';
import { paintField } from '../view/field/sheet';
import '../view/looks';
import '../view/rain';
import '../audio/library';
import { createHud, paintHud, type Hud } from '../ui/hud';
import { renderShell, shellStamp, type ShellExtra } from '../ui/shell';
import {
  accept,
  act,
  browse,
  cancel,
  claimSeat,
  createCampaign,
  currentBox,
  desiredAttract,
  desiredRun,
  finishOp,
  move,
  noteInput,
  tickFront,
  type Campaign,
  type Progress,
} from './campaign';
import { countPress, ZERO, type HubInfo, type Sample } from '../net/hub';
import { startRound, type RoundView } from '../net/live';

/** The inspector calls this page uses. The engine's own type is an open bag of members. */
interface PageEngine {
  pause(): void;
  resume(): void;
  step(n?: number, intents?: { 'game:hands': number[] }): number;
  timeScale(k?: number): number;
  seed(n?: number): number;
  hash(): string;
  set(path: string, value: unknown): unknown;
  input: { axis(name: string, value: unknown): void; record(): unknown };
  actions: { run(name: string, args?: unknown): unknown };
  camera: { set(code: string, opts?: { blend?: boolean }): unknown };
  errors: readonly { code: string }[];
}

/** AI Hub, as the pasted client exposes it. */
interface Hub {
  active: boolean;
  connect(opts: { mode: string; seats: [number, number]; card?: boolean }): Promise<HubInfo | null>;
  ready(): void;
  answer(which: 'ready' | 'more'): void;
  time(): number;
  finish(body: unknown): void;
  send(data: unknown, opts?: { to?: number; reliable?: boolean }): boolean;
  on(event: string, fn: (data: unknown, from?: number) => void): () => void;
  fail(message: string): void;
}

/** The round info plus the card the players are looking at. */
interface Session {
  info: HubInfo;
  hub: Hub;
  round: RoundView | null;
  card: ShellExtra['card'];
  playing: boolean;
  sample: Sample;
  sent: number;
}

const DEV: Readonly<Record<string, (engine: PageEngine) => void>> = {
  win: (engine) => engine.actions.run('winPhase'),
  fail: (engine) => engine.actions.run('failPhase'),
  heal: (engine) => engine.actions.run('heal'),
  freezeVitals: (engine) => engine.actions.run('freezeVitals'),
  freezeClock: (engine) => engine.actions.run('freezeClock'),
  gift: (engine) => engine.actions.run('infiniteGift'),
  oneHit: (engine) => engine.actions.run('oneHit'),
  spawn: (engine) => engine.actions.run('spawnStrain', { kind: 'lull' }),
  auto: (engine) => engine.set('game.autoplay', true),
  step: (engine) => {
    engine.pause();
    engine.step(1);
  },
  slow: (engine) => engine.timeScale(0.25),
  fast: (engine) => engine.timeScale(4),
  fly: (engine) => engine.camera.set('cam3=fly'),
  copy: (engine) => {
    const text = JSON.stringify(engine.input.record());
    void navigator.clipboard?.writeText(text);
  },
  reset: (engine) => {
    for (const row of TUNE) engine.set(row.setting, row.fallback);
  },
};

/** Query keys the engine already understands, plus this game's settings. */
function searchFrom(info: HubInfo | null, autoplay: boolean): string {
  const incoming = new URLSearchParams(location.search);
  const search = new URLSearchParams();
  search.set('touch', 'off');
  search.set('post.look', 'look:harbor');
  if (!incoming.has('cam') && !incoming.has('cam3')) {
    search.set('cam3', `fixed,${FIELD_AT.x},${FIELD_AT.y + 11},${FIELD_AT.z},0,-78,46`);
  }
  for (const [key, value] of incoming) {
    if (key.startsWith('aihub')) continue;
    if (key === 'touch') continue;
    if (
      key.startsWith('game.') ||
      key === 'seed' ||
      key === 'cam' ||
      key === 'cam3' ||
      key.startsWith('post.') ||
      key.startsWith('gfx.')
    ) {
      search.set(key, value);
    }
  }
  if (info) {
    search.set('seed', String(info.seed));
    search.set('game.seed', String(info.seed));
    search.set('game.run', 'op:case:gala-shift');
    search.set('game.seats', String(Math.max(1, info.players.length)));
    search.set('game.colleague', info.players.length === 1 ? '1' : '0');
    search.set('gfx.warmUp', 'asked');
  }
  if (autoplay) search.set('game.autoplay', '1');
  return `?${search}`;
}

/** Saved night, or a fresh one. */
function loadProgress(store: ReturnType<typeof createStore>): Progress {
  return store.get('progress', createCampaign().progress);
}

/** Keep a night. Attract and a hub round do not. */
function saveProgress(store: ReturnType<typeof createStore>, c: Campaign, session: boolean): void {
  if (session || c.screen === 'attract' || !c.record) return;
  store.set('progress', c.progress);
}

/** Overhead on an operation, the harbour shot otherwise. */
function placeCamera(engine: PageEngine, run: string): void {
  const at = FIELD_AT;
  const code = run.startsWith('op:')
    ? `cam3=fixed,${at.x},${at.y + 9},${at.z + 0.4},0,-80,42`
    : `cam3=fixed,${at.x - 1},${at.y + 4},${at.z + 6},20,-18,48`;
  engine.camera.set(code, { blend: true });
}

/** Stillpoint, Second Pulse, and a low line, laid over the field. */
function layLooks(engine: PageEngine, run: string): void {
  const op = liveOp();
  engine.set('post.look', run.startsWith('op:') ? 'look:field' : 'look:harbor');
  const layers: { look: string; amount: number }[] = [];
  if (op?.seats.some((seat) => seat.giftLeft > 0 && seat.giftKind === 'still'))
    layers.push({ look: 'look:still', amount: 0.8 });
  if (op?.seats.some((seat) => seat.giftLeft > 0 && seat.giftKind === 'pulse'))
    layers.push({ look: 'look:pulse', amount: 0.7 });
  if ((op?.patients[0]?.vitals ?? 100) < 30 && run.startsWith('op:')) layers.push({ look: 'look:low', amount: 0.55 });
  engine.set('post.combine', layers);
}

/** A few syllables of the line, through the page's own gain. */
function speak(audio: ReturnType<typeof createAudio>, who: string, text: string, volume: number): void {
  const ctx = audio.context;
  if (!ctx || ctx.state !== 'running') return;
  const gain = ctx.createGain();
  gain.gain.value = Math.max(0, Math.min(1, volume));
  gain.connect(ctx.destination);
  const indexes = voiceOf(who, text).slice(0, 18);
  indexes.forEach((syllable, index) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 180 + syllable * 28;
    osc.connect(gain);
    const at = ctx.currentTime + index * 0.08;
    osc.start(at);
    osc.stop(at + 0.07);
  });
  audio.duck(0.4);
}

/** Start the game. `info` is null when there is no hub. */
export async function start(info: HubInfo | null, hub: Hub | null): Promise<void> {
  if (!navigator.gpu) return;
  const canvas = document.querySelector<HTMLCanvasElement>('#view');
  const shell = document.querySelector<HTMLElement>('#shell');
  if (!canvas || !shell) return;
  if (info?.server) canvas.hidden = true;
  watchPointer(canvas);
  const autoplay = new URLSearchParams(location.search).get('game.autoplay') === '1';
  const store = createStore({ prefix: 'trauma-compass:', mode: 'play' });
  const campaign = createCampaign(info ? createCampaign().progress : loadProgress(store));
  if (info) campaign.screen = 'op';
  const audio = createAudio();
  audio.volume('master', campaign.progress.master / 100);
  audio.volume('music', campaign.progress.music / 100);
  audio.volume('effects', campaign.progress.effects / 100);
  const hud = createHud(document.body);
  const session: Session | null =
    info && hub ? { info, hub, round: null, card: null, playing: false, sample: { ...ZERO }, sent: 0 } : null;
  let engine: Engine | null = null;
  let page: PageEngine | null = null;
  let stamp = '';
  let line = '';
  let spoken = '';
  let song = '';
  let sig = '';
  let touchHold = true;
  const mismatches: string[] = [];
  const sliderValues = TUNE.map((row) => row.fallback);

  const feel = (frame: EngineFrame, input: Input): Feel => ({
    speed: Number(frame.setting('game.cursorSpeed') ?? 8),
    curve: Number(frame.setting('game.cursorCurve') ?? 2.2),
    magnet: Number(frame.setting('game.magnet') ?? 0.55),
    precision: input.held('precision'),
  });

  const extra = (): ShellExtra => ({
    prompt: page ? usePrompt(engine?.input?.lastDevice ?? 'gamepad', campaign.progress.glyphs === 'xbox') : '',
    hash: liveOp() ? (page?.hash() ?? '') : '',
    cursor: `${gloveSpots(1)[0]?.x.toFixed(2) ?? 0}, ${gloveSpots(1)[0]?.z.toFixed(2) ?? 0}`,
    sliders: TUNE.map((row, index) => ({
      setting: row.setting,
      label: row.label,
      value: sliderValues[index] ?? row.fallback,
    })),
    touch: touchOnly() && touchHold && !session,
    card: session?.card ?? null,
  });

  const drawShell = (): void => {
    const next = shellStamp(campaign, extra());
    if (next === stamp) return;
    stamp = next;
    renderShell(shell, campaign, extra());
  };

  const pick = (id: string): void => {
    if (session && (id === 'hub-ready' || id === 'hub-more')) {
      hub?.answer(id === 'hub-ready' ? 'ready' : 'more');
      return;
    }
    if (session && id !== 'settings') return;
    noteInput(campaign);
    touchHold = false;
    const dev = DEV[id];
    act(campaign, id);
    if (id === 'reset') TUNE.forEach((row, index) => (sliderValues[index] = row.fallback));
    if (dev && page) dev(page);
    saveProgress(store, campaign, !!session);
    stamp = '';
  };

  shell.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-act]');
    if (!target?.dataset.act) return;
    pick(target.dataset.act);
  });
  shell.addEventListener('pointerover', (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-act]');
    if (!target) return;
    const rows = [...shell.querySelectorAll<HTMLElement>('[data-game="row"]')];
    const index = rows.indexOf(target);
    if (index >= 0) campaign.focus = index;
  });
  shell.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement | null;
    const setting = target?.dataset.set;
    if (!setting || !page || session) return;
    const value = Number(target.value);
    page.set(setting, value);
    const index = TUNE.findIndex((row) => row.setting === setting);
    if (index >= 0) sliderValues[index] = value;
    const name = TUNE[index]?.label ?? setting;
    if (target.parentElement?.firstChild) target.parentElement.firstChild.textContent = `${name} ${value}`;
  });
  addEventListener('keydown', (event) => {
    touchHold = false;
    if (campaign.screen === 'attract') noteInput(campaign);
    if (!session) return;
    if (event.key === 't' || event.key === 'T') session.hub.answer('more');
    // The card key can arrive while the GPU is still warming, before a frame samples it.
    if (event.key === 'Enter' || event.key === ' ' || event.code === 'NumpadEnter') session.hub.answer('ready');
  });
  addEventListener('pointerdown', (event) => {
    const node = event.target instanceof Element ? event.target : null;
    // A control's click is still coming. Hiding the gate here replaces the button before that click lands.
    if (node?.closest('[data-act], input, label.slider')) return;
    touchHold = false;
    if (campaign.screen === 'attract') noteInput(campaign);
  });
  addEventListener('pointermove', () => {
    if (campaign.screen === 'attract') noteInput(campaign);
  });

  const compass: Compass = {
    campaign,
    screen: campaign.screen,
    mismatches,
    audio,
    live: liveOp,
    gloves: () => gloveSpots(4),
  };
  (window as unknown as { __compass: Compass }).__compass = compass;

  if (session && hub) {
    // Ready is "the page is here", not "the GPU is warm". Two software copies miss a 20s card if it waits.
    hub.on('card', (data) => {
      const card = data as { left?: number | null; ready?: number[]; asked?: boolean };
      const left = card.left == null ? 'Starting' : `${Math.ceil(card.left / 1000)}s`;
      session.card = {
        names: (info?.players ?? []).map((player) => player.name),
        ready: card.ready ?? [],
        left,
        asked: !!card.asked,
      };
      stamp = '';
    });
    hub.on('start', () => {
      session.card = null;
      session.playing = false;
      stamp = '';
      // The field may still be warming. One presence message puts traffic on the table before the first tick.
      hub.send({ t: 'here' }, { reliable: true });
    });
    hub.on('time-up', () => {
      // Grace is a few seconds. If the sequencer is already up, it answers. Otherwise the host still must.
      if (session.round || !session.info.isHost) return;
      const ids = session.info.players.map((player) => player.id);
      const scores: Record<string, number> = {};
      for (const id of ids) scores[String(id)] = 0;
      hub.finish({ standings: [ids], scores, won: false, stats: {}, awards: [] });
    });
    hub.on('end', () => {
      audio.mute(true);
      session.card = null;
    });
    hub.ready();
  }

  // The night is saved only by saveProgress. The engine's own store would write a quality tier during attract.
  engine = await createEngine({
    canvas,
    scenes: [main.id, play.id],
    levels: {
      'level:or': { text: OR_TEXT, file: 'labs/game/scenes/room.ts' },
      'level:arena': { text: ARENA_TEXT, file: 'labs/game/scenes/play.ts' },
    },
    search: searchFrom(info, autoplay),
    actionMap: SURGEON_MAP,
    modal: () => campaign.screen !== 'op' || !!session?.card,
    onFrame: (frame) => onFrame(frame, hud),
  });
  page = engine.inspector as PageEngine | null;
  const msg = document.querySelector<HTMLElement>('#msg');
  if (msg) msg.hidden = true;

  if (session && page && hub) {
    const enginePage = page;
    const wait = async (): Promise<void> => {
      while (typeof (window as unknown as { __engine?: { step?: unknown } }).__engine?.step !== 'function') {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    };
    void wait().then(() => {
      const roundInfo = info as HubInfo;
      enginePage.pause();
      enginePage.seed(roundInfo.seed);
      enginePage.pause();
      session.round = startRound(hub, roundInfo, enginePage, Math.max(1, roundInfo.players.length));
    });
  }

  function syncRun(enginePage: PageEngine): void {
    if (session) return;
    const run = desiredRun(campaign);
    const attract = desiredAttract(campaign);
    const next = [
      run,
      attract,
      campaign.progress.seats,
      campaign.progress.difficulty,
      campaign.progress.simple,
      campaign.boot,
    ].join('|');
    if (next === sig) return;
    const phase = campaign.keepPhase ? (liveOp()?.phase ?? 0) : 0;
    campaign.keepPhase = false;
    enginePage.set('game.run', run);
    enginePage.set('game.attract', attract);
    enginePage.set('game.seats', campaign.progress.seats);
    enginePage.set('game.difficulty', campaign.progress.difficulty);
    enginePage.set('game.simple', campaign.progress.simple);
    enginePage.set('game.phase', phase);
    enginePage.set('game.colleague', false);
    enginePage.set('game.autoplay', autoplay && campaign.screen === 'op');
    enginePage.seed(1);
    placeCamera(enginePage, run);
    sig = next;
  }

  function menus(input: Input): void {
    const pads = samplePads();
    if (campaign.screen === 'attract') {
      if (pads.any || input.pressed('pause') || input.pressed('uiAccept')) noteInput(campaign);
      return;
    }
    let joined = false;
    if (pads.claim >= 0 && campaign.screen === 'scrub') {
      joined = !campaign.claimed[pads.claim];
      claimSeat(campaign, pads.claim);
    }
    if (session?.card) {
      if (pads.accept || input.pressed('uiAccept')) hub?.answer('ready');
      if (input.pressed('uiCancel')) hub?.answer('more');
      return;
    }
    if (campaign.screen === 'op') {
      if (pads.pause || input.pressed('pause')) {
        if (session) {
          campaign.back = 'op';
          campaign.screen = 'settings';
        } else cancel(campaign);
      }
      return;
    }
    if (pads.up || input.pressed('uiUp')) move(campaign, -1);
    if (pads.down || input.pressed('uiDown')) move(campaign, 1);
    if (pads.left || input.pressed('uiLeft')) browse(campaign, -1);
    if (pads.right || input.pressed('uiRight')) browse(campaign, 1);
    if (!joined && (pads.accept || input.pressed('uiAccept'))) {
      accept(campaign);
      saveProgress(store, campaign, !!session);
    }
    if (pads.cancel || input.pressed('uiCancel')) {
      cancel(campaign);
      saveProgress(store, campaign, !!session);
    }
    if (pads.any) noteInput(campaign);
  }

  function onFrame(frame: EngineFrame, bar: Hud): void {
    const enginePage = page;
    const input = engine?.input;
    if (!enginePage || !input || !canvas || !shell) return;
    const blob = (frame.world.query('chart')[0] as { chart?: { blob?: string } } | undefined)?.chart?.blob ?? '';
    if (blob) followChart(blob);
    menus(input);
    tickFront(campaign, frame.dt * 1000, !!session);
    syncRun(enginePage);
    const run = session ? 'op:case:gala-shift' : desiredRun(campaign);
    const op = liveOp();
    if (!session && campaign.screen === 'op' && op && op.status !== 'playing') {
      finishOp(campaign, op.status === 'won', op.score, op.slips, op.fail);
      saveProgress(store, campaign, false);
      audio.play(op.status === 'won' ? 'sfx:compass-rank' : 'sfx:compass-alarm');
    }
    if (
      autoplay &&
      !session &&
      campaign.screen !== 'op' &&
      campaign.screen !== 'credits' &&
      campaign.screen !== 'attract'
    ) {
      accept(campaign);
    }
    const busy = !session && ['pause', 'debrief', 'settings', 'dev', 'handbook'].includes(campaign.screen);
    if (session || busy) enginePage.pause();
    else enginePage.resume();
    // A software frame is long, and the clock keeps only time.maxSteps of it. Autoplay raises that cap so the bot finishes.
    if (!session && autoplay && campaign.screen === 'op') {
      enginePage.timeScale(8);
      enginePage.set('time.maxSteps', 48);
    } else if (!session && campaign.screen !== 'dev') {
      enginePage.timeScale(1);
      enginePage.set('time.maxSteps', 6);
    }
    layLooks(enginePage, run);
    const sites = Math.max(1, op?.sites.length ?? 1);
    const seats = op?.seats.length ?? campaign.progress.seats;
    const hands = readHands(input, canvas, frame.camera, frame.dt, 4, sites, feel(frame, input));
    if (campaign.screen === 'op' && !session && !op?.attract && !autoplay) {
      enginePage.input.axis('game:hands', packHands(hands.slice(0, seats)));
    }
    if (session?.round && session.playing === false && hub && hub.time() >= 0) session.playing = true;
    if (session && session.playing && !session.round?.ended && op && !session.info.server) {
      const local = gloveSpots(1)[0];
      const hand = {
        x: local?.x ?? 0,
        z: local?.z ?? 0,
        tool: op.seats[session.info.me]?.tool ?? 1,
        use: input.held('use'),
        gift: input.pressed('gift'),
        drop: input.pressed('drop'),
        swap: input.pressed('swap'),
        hint: input.pressed('hint'),
        paddle: input.held('precision') && input.held('use'),
        site: -1,
      };
      session.sample = countPress(session.sample, hand, input.pressed('siteNext') || input.pressed('sitePrev'));
      const now = performance.now();
      if (session.info.isHost) session.round?.book.hear(session.info.me, { t: 'i', ...session.sample });
      else if (now - session.sent > 55) {
        hub?.send({ t: 'i', ...session.sample }, { reliable: false });
        session.sent = now;
      }
    }
    paintField(op, performance.now() / 1000, campaign.progress.blood, gloveSpots(seats));
    for (const event of op?.events ?? []) {
      const sound =
        event.type === 'nick'
          ? 'sfx:compass-alarm'
          : event.type === 'code' || event.type === 'shock'
            ? 'sfx:compass-beep'
            : event.type === 'rating'
              ? 'sfx:compass-stitch'
              : event.type === 'gift'
                ? 'sfx:compass-gel'
                : '';
      if (sound) audio.play(sound);
    }
    const said = op?.events.find((event) => event.type === 'hint' || event.type === 'phase' || event.type === 'drama');
    if (said?.text) line = said.text;
    paintHud(bar, campaign.screen === 'op' || campaign.screen === 'attract' ? op : null, campaign.hideHud, line);
    if (!run.startsWith('op:')) frame.emit('emitter:squall', [FIELD_AT.x, 8, FIELD_AT.z - 2], 'squall');
    const nextSong = run.startsWith('op:')
      ? op?.id === 'case:mercy'
        ? 'song:compass-mercy'
        : 'song:compass-or'
      : campaign.screen === 'story'
        ? 'song:compass-story'
        : 'song:compass-title';
    if (nextSong !== song) {
      song = nextSong;
      audio.music(song, { intensity: 0.4 });
    }
    audio.volume('master', campaign.progress.master / 100);
    audio.volume('music', campaign.progress.music / 100);
    audio.volume('effects', campaign.progress.effects / 100);
    audio.update(frame.camera);
    const boxKey = campaign.screen === 'story' ? `${campaign.storyId}:${campaign.box}` : '';
    if (boxKey && boxKey !== spoken) {
      spoken = boxKey;
      const box = currentBox(campaign);
      if (box?.text) speak(audio, box.who, box.text, campaign.progress.voice / 100);
    }
    drawShell();
    const hashNode = shell.querySelector('[data-game="hash"]');
    if (hashNode) hashNode.textContent = page?.hash() ?? '';
    const cursorNode = shell.querySelector('[data-game="cursor"]');
    const spot = gloveSpots(1)[0];
    if (cursorNode && spot) cursorNode.textContent = `${spot.x.toFixed(2)}, ${spot.z.toFixed(2)}`;
    endSample();
    const found = enginePage.errors.some((error) => error.code === 'GFX_NO_WEBGPU');
    if (found && msg) {
      msg.hidden = false;
      msg.textContent = 'This game needs a browser with WebGPU.';
    }
    const view = (window as unknown as { __compass?: Compass }).__compass;
    if (view) {
      view.screen = campaign.screen;
      view.mismatches = session?.round?.mismatches ?? mismatches;
    }
  }

  drawShell();
}

/** What a test reads from the page. */
export interface Compass {
  campaign: Campaign;
  screen: string;
  mismatches: string[];
  audio: ReturnType<typeof createAudio>;
  live: typeof liveOp;
  gloves: () => { x: number; z: number }[];
}

export type { HubInfo };
