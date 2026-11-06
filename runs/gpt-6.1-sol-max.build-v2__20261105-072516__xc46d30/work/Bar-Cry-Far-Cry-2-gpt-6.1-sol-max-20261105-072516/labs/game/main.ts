/** @file Bar Cry's page: boot, presentation, saved accounts, real-time menus and the network pump. */
import { info, hub } from './net/session';
import { boot } from './boot';
import { createStore, type EngineFrame, type CameraInput } from '../../engine';
import { campaign, players, type GW } from './scenes/state';
import { makeSave } from './scenes/save';
import { contractPreset } from './scenes/preset';
import { audio, soundFrame } from './sounds/page';
import { renderScreen } from './ui/screens';
import { navigation, refreshGlyphs } from './ui/controls';
import { inspector, type Context } from './ui/context';
import { createHud } from './ui/hud';
import { makeMap } from './ui/map';
import { startLockstep, result, BUTTONS, type Wire } from './net/lockstep';
import { Attract } from './attract';
import { publish } from './ui/public';
import { aimInput } from './ui/aim';
import './art/world';
import './art/guns';
import './art/bodies';
import { setDriveHeading } from './art/cameras';
import './ui/style.css';

const store = createStore({ prefix: 'bar-cry:', mode: info ? 'demo' : 'play' });
let cameraCode = '',
  chase = false,
  saveVersion = -1,
  seenWorld: object | null = null,
  dialogueSeen = 0,
  endingSeen = '',
  feverLook = -1,
  netStop: (() => void) | null = null,
  ended = false;
const root = document.getElementById('front')!;
const latched = new Set<string>();
const ctx: Context = {
  engine: null,
  frame: null,
  c: null,
  p: undefined,
  screen:
    info ||
    ['story', 'contract'].includes(new URLSearchParams(location.search).get('game.mode') ?? '') ||
    new URLSearchParams(location.search).has('replay')
      ? 'play'
      : 'title',
  parent: 'title',
  inHub: !!info,
  hubSession: !!info,
  device: 'keyboard',
  glyphs: store.get('glyphs', 'PlayStation'),
  store,
  root,
  me: info?.me ?? 0,
  seed: info?.seed ?? Number(new URLSearchParams(location.search).get('seed') ?? 1947),
  net: null,
  inspector: () => inspector(ctx),
  open(name) {
    const e = ctx.inspector(),
      previous = ctx.screen;
    if (name === 'map') {
      if (ctx.inHub) latched.add('map');
      else if (e) e.step(1, { p: ['map'] });
      name = 'play';
    }
    if ((info && ['title', 'dev', 'lobby'].includes(name)) || (ctx.inHub && name === 'dev')) return;
    if (['title', 'pause', 'ending'].includes(ctx.screen)) ctx.parent = ctx.screen;
    else if (['dialogue', 'shop', 'sleep'].includes(name)) ctx.parent = 'play';
    ctx.screen = name;
    if ((name === 'pause' || (name === 'ending' && ctx.c?.mode === 'contract')) && !ctx.inHub) e?.pause();
    if (name === 'play' && !ctx.inHub && !director?.active) e?.resume();
    if (name === 'play' && ['dialogue', 'shop', 'sleep'].includes(previous)) ctx.send({ kind: 'dismiss' });
    if (name !== 'play') {
      latched.clear();
      document.exitPointerLock?.();
      ctx.engine?.input?.clear();
    }
    renderScreen(ctx);
    refreshGlyphs(ctx);
  },
  back() {
    if (ctx.screen === 'lobby' && !ctx.inHub) {
      const old = ctx.net;
      ctx.net = null;
      old?.close();
      ctx.open('title');
      return;
    }
    if (ctx.screen === 'ending' && ctx.inHub) {
      ctx.quit();
      return;
    }
    if (ctx.screen === 'play') {
      if (ctx.p?.seat?.data.map) {
        if (ctx.inHub) latched.add('map');
        else ctx.inspector()?.step(1, { p: ['map'] });
        return;
      }
      ctx.open(info ? 'settings' : 'pause');
    } else if (ctx.screen === 'pause') ctx.open('play');
    else if (ctx.screen === 'title') return;
    else {
      const target =
        ctx.parent === 'pause'
          ? 'pause'
          : ctx.parent === 'ending'
            ? 'ending'
            : ctx.c?.mode === 'story' || ctx.c?.mode === 'contract'
              ? 'play'
              : 'title';
      ctx.open(target);
    }
  },
  start(mode, merc = 0, load = false) {
    if (!navigator.gpu) {
      document.getElementById('msg')!.textContent = 'WebGPU is required. Use a WebGPU-enabled Chrome or Edge.';
      return;
    }
    const e = ctx.inspector();
    if (!e) {
      if (!navigator.gpu)
        document.getElementById('msg')!.textContent =
          'WebGPU is required. Open this file in a WebGPU-enabled Chrome or Edge.';
      return;
    }
    if (info) return;
    if (mode !== 'attract') netStop?.();
    for (const [key, v] of Object.entries({ 'game.mode': mode, 'game.merc': merc, 'game.me': 0, 'game.seats': 1 }))
      e.set(key, v);
    if (mode === 'story' && !load) {
      for (const [path, , v] of TUNING) e.set(`game.${path}`, v);
      for (const key of ['god', 'ammo', 'noWear', 'noFever', 'invisible', 'oneShot', 'noclip'])
        e.set(`game.${key}`, false);
    }
    if (mode === 'contract') for (const [key, v] of Object.entries(contractPreset())) e.set(key, v);
    ctx.me = 0;
    ctx.seed++;
    const reuse = ['title', 'attract'].includes(mode) && ['title', 'attract'].includes(ctx.c?.mode ?? '');
    const saved = load ? store.get<import('./scenes/save').Save | null>('save', null) : null;
    if (reuse) e.actions.run('mode', { mode });
    else e.seed(saved?.seed ?? ctx.seed);
    if (load) {
      const data = store.get('save', null);
      if (data) e.actions.run('load', data);
    }
    ctx.screen = mode === 'title' ? 'title' : 'play';
    ctx.parent = mode === 'title' ? 'title' : 'pause';
    seenWorld = null;
    endingSeen = '';
    dialogueSeen = 0;
    e.resume();
    ctx.engine?.input?.clear();
    cameraCode = '';
    if (mode === 'title') e.camera.set('cam3=fixed,548,18,730,156,-7', { blend: false });
    else
      e.camera.set(
        store.get('camera', 'First person') === 'First person' ? 'cam3=first,180,0' : 'cam3=shoulder,180,-10,3',
        { blend: true },
      );
    renderScreen(ctx);
  },
  quit() {
    if (info) return;
    netStop?.();
    netStop = null;
    ctx.net?.close();
    ctx.net = null;
    ctx.inHub = false;
    audio.mute(false);
    ctx.start('title');
  },
  send(cmd) {
    ctx.inspector()?.step(1, { 'game:command': { ...cmd, seat: ctx.me } as never });
  },
  startNet() {
    const net = ctx.net,
      e = ctx.inspector();
    if (!net || !e) return;
    ctx.inHub = true;
    ctx.me = net.me;
    ended = false;
    for (const [key, v] of Object.entries(contractPreset(net.players.length, net.me))) e.set(key, v);
    for (const [key, v] of Object.entries({
      'game.mode': 'contract',
      'game.seats': net.players.length,
      'game.me': net.me,
      'game.detail': 0.08,
    }))
      e.set(key, v);
    e.seed(net.seed);
    e.pause();
    ctx.screen = 'play';
    cameraCode = '';
    renderScreen(ctx);
    netStop = startLockstep(net, e, {
      sample: sampleWire,
      onMismatch: () => {
        document.getElementById('msg')!.textContent = 'Connection out of sync.';
      },
      onEnd: () => {
        audio.mute(true);
        ctx.open('ending');
      },
      finish: (won) => {
        if (!ended) {
          ended = true;
          net.finish(result(e, net, won));
        }
      },
    });
  },
};
import { TUNING } from './scenes/settings';
const director = new Attract(ctx),
  hud = createHud(ctx),
  map = makeMap(ctx);
navigation(ctx, () => director.activity());
renderScreen(ctx);
for (const bus of ['master', 'music', 'effects', 'ui', 'ambience'] as const)
  audio.volume(bus, store.get(`audio.${bus}`, audio.volume(bus)));
document.getElementById('touch-settings')!.onclick = () => {
  document.getElementById('touch-notice')!.classList.add('dismissed');
  ctx.open('settings');
};
if ((window as unknown as { __settingsRequested?: boolean }).__settingsRequested) {
  document.getElementById('touch-notice')!.classList.add('dismissed');
  ctx.open('settings');
}
function sampleWire(): Wire {
  const input = ctx.engine?.input,
    pose = ctx.frame?.camera;
  if (!input || !pose || ctx.screen !== 'play')
    return { m: [0, 0], l: [pose?.yaw ?? Math.PI, pose?.pitch ?? 0], b: [] };
  const forward = input.strength('forward') - input.strength('back'),
    right = input.strength('right') - input.strength('left'),
    yaw = pose.yaw;
  const m: [number, number] = [
    Math.sin(yaw) * forward - Math.cos(yaw) * right,
    Math.cos(yaw) * forward + Math.sin(yaw) * right,
  ];
  const b = [...BUTTONS].filter((key) => input.held(key) || latched.has(key));
  latched.clear();
  return {
    m,
    l: [pose.yaw, pose.pitch],
    a: [
      pose.position[0] + Math.sin(yaw) * Math.cos(pose.pitch) * 150,
      pose.position[1] + Math.sin(pose.pitch) * 150,
      pose.position[2] + Math.cos(yaw) * Math.cos(pose.pitch) * 150,
    ],
    b,
  };
}
function frame(f: EngineFrame): void {
  ctx.frame = f;
  const w = f.world as unknown as GW;
  ctx.c = campaign(w);
  ctx.p = players(w).find((p) => p.seat!.data.n === ctx.me);
  const c = ctx.c,
    p = ctx.p,
    s = p?.seat?.data,
    e = ctx.inspector();
  if (seenWorld !== f.world) {
    seenWorld = f.world;
    saveVersion = c.save;
  }
  if (!ctx.inHub && c.mode === 'story' && saveVersion !== c.save) {
    saveVersion = c.save;
    store.set('save', makeSave(w));
  }
  if (ctx.engine?.input && ctx.screen === 'play' && (!ctx.inHub || (ctx.net?.time() ?? hub?.time() ?? -Infinity) >= 0))
    for (const key of BUTTONS) if (ctx.engine.input.pressed(key)) latched.add(key);
  if (ctx.screen === 'play' && s && e) {
    if (s.vehicle >= 0) setDriveHeading(w.get(s.vehicle)?.ride?.data.yaw ?? 0);
    const desired =
      s.down > 0
        ? 'cam3=fieldDown'
        : s.meleeUntil > f.world.tick
          ? 'cam3=first'
          : s.action
            ? 'cam3=fieldBody'
            : s.vehicle >= 0
              ? chase
                ? 'cam3=fieldChase'
                : 'cam3=fieldDrive'
              : p!.weapons.slot < 0
                ? 'cam3=fieldWalk'
                : store.get('camera', 'First person') === 'First person'
                  ? 'cam3=first'
                  : 'cam3=shoulder';
    if (cameraCode !== desired) {
      cameraCode = desired;
      e.camera.set(desired, { blend: true });
    }
    if (c.flags.gameover && !ctx.inHub) ctx.open('gameover');
    else if (c.ending && endingSeen !== c.ending) {
      endingSeen = c.ending;
      ctx.open('ending');
    } else if (c.flags.sleep) {
      ctx.open('sleep');
      ctx.send({ kind: 'dismiss' });
      e.actions.run('command', { kind: 'clearPanel', key: 'sleep' });
    } else if (c.flags.dialogue && c.flags.dialogue !== dialogueSeen) {
      dialogueSeen = c.flags.dialogue;
      ctx.open(c.flags.shop ? 'shop' : 'dialogue');
    }
  }
  if (ctx.screen !== 'play' && c.flags.dialogue === 0) dialogueSeen = 0;
  const feverAmount = s?.fever
    ? Math.round(Math.min(1, (f.world.tick - s.fever) / 120) * Number(store.get('feverIntensity', 0.7)) * 20) / 20
    : 0.0001;
  if (feverLook !== feverAmount && e) {
    feverLook = feverAmount;
    e.set('post.combine', [{ look: 'look:fever', amount: Math.max(0.0001, feverAmount) }]);
  }
  hud.update();
  map.update();
  soundFrame(f, c, p);
  const clusters = Object.keys(c.flames)
    .map(Number)
    .sort((a, b) => {
      const ax = (a % 192) * 8,
        az = Math.floor(a / 192) * 8,
        bx = (b % 192) * 8,
        bz = Math.floor(b / 192) * 8;
      return (
        Math.hypot(ax - (p?.actor.x ?? 550), az - (p?.actor.z ?? 700)) -
        Math.hypot(bx - (p?.actor.x ?? 550), bz - (p?.actor.z ?? 700))
      );
    })
    .slice(0, 24);
  if (c.rain && p) f.emit('emitter:field-rain', [p.actor.x, p.actor.y + 12, p.actor.z], 'rain');
  for (const i of clusters) {
    const x = ((i % 192) + 0.5) * 8,
      z = (Math.floor(i / 192) + 0.5) * 8;
    f.emit(
      `emitter:smoke-${((Math.round(c.wind / (Math.PI / 4)) % 8) + 8) % 8}`,
      [x, ground(x, z) + 1, z],
      `fire-${i}`,
    );
  }
}
import { ground } from './scenes/map';
const cameraInput = (): CameraInput | undefined => aimInput(ctx, director.view);

publish(ctx, director);

function viewAction(action: string): void {
  if (action === 'mapMark') dispatchEvent(new Event('field-map-mark'));
  if (action === 'mapZoom') dispatchEvent(new Event('field-map-zoom'));
  if (action === 'ledger') ctx.open('ledger');
  if (action === 'viewCamera') {
    if ((ctx.p?.seat?.data.vehicle ?? -1) >= 0) chase = !chase;
    else {
      store.set('camera', store.get('camera', 'First person') === 'First person' ? 'Over shoulder' : 'First person');
      cameraCode = '';
    }
  }
}

await boot(ctx, {
  frame,
  sample: sampleWire,
  cameraInput,
  onView: viewAction,
  ready: () => {
    director.last = performance.now();
  },
});
