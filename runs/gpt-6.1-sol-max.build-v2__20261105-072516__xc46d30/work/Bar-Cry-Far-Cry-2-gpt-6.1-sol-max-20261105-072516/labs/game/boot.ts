/** @file Renderer and AI Hub startup. Simulation readiness is reported before GPU warm-up completes. */
import { createEngine, createHeadless, type EngineFrame, type CameraInput } from '../../engine';
import { hub, info, ownCard } from './net/session';
import { world } from './scenes/world';
import { contractPreset } from './scenes/preset';
import openingReplay from './replays/bot.replay.json?raw';
import { audio } from './sounds/page';
import { startLockstep, result, type Wire } from './net/lockstep';
import type { Context } from './ui/context';
export async function boot(
  ctx: Context,
  options: {
    frame: (f: EngineFrame) => void;
    sample: () => Wire;
    cameraInput: () => CameraInput | undefined;
    onView: (action: string) => void;
    ready: () => void;
  },
): Promise<void> {
  const search = new URLSearchParams(location.search),
    store = ctx.store;
  search.delete('aihub');
  let ended = false,
    netStop: (() => void) | null = null;
  if (info && hub) ownCard();

  if (info?.server && hub) {
    const e = await createHeadless({
      scene: world,
      seed: info.seed,
      settings: contractPreset(info.players.length, -1),
    });
    Object.assign(window, { __engine: e });
    const stop = startLockstep(hub, e, {
      sample: () => ({ m: [0, 0], l: [0, 0], b: [] }),
      finish: (won) => {
        if (!ended) {
          ended = true;
          hub!.finish(result(e, info!, won));
        }
      },
    });
    hub.on('time-up', () => {
      if (!ended) {
        ended = true;
        hub!.finish(result(e, info!, false));
      }
    });
    hub.on('end', () => {
      stop();
      audio.mute(true);
    });
    hub.ready();
  } else if (navigator.gpu) {
    if (info)
      for (const [key, v] of Object.entries(contractPreset(info.players.length, info.me))) search.set(key, String(v));
    search.set('touch', 'off');
    search.set('gfx.warmUp', 'asked');
    search.set('post.look', 'look:dry-season');
    search.set('post.combine', JSON.stringify([{ look: 'look:fever', amount: 0.0001 }]));
    search.set('cam.fov', String(store.get('cam.fov', 76)));
    search.set('game.mode', info ? 'contract' : (search.get('game.mode') ?? 'title'));
    search.set('game.seats', String(info?.players.length ?? 1));
    search.set('game.me', String(ctx.me));
    search.set('seed', String(ctx.seed));
    search.set('cam3', ctx.screen === 'play' ? 'first' : 'fixed,548,18,730,156,-7');
    {
      let fallback = true;
      try {
        const adapter = await navigator.gpu.requestAdapter();
        fallback = adapter?.info?.isFallbackAdapter ?? true;
      } catch {}
      if (!search.has('game.detail')) search.set('game.detail', info ? '0.08' : fallback ? '0.16' : '1');
      if (!search.has('quality')) search.set('quality', store.get('quality', fallback ? 'low' : 'high'));
      if (fallback && !search.has('gfx.featuresOff'))
        search.set(
          'gfx.featuresOff',
          JSON.stringify([
            'feature:gpuCrowds',
            'feature:cascadedShadows',
            'feature:gi',
            'feature:ssr',
            'feature:ao',
            'feature:air',
            'feature:tiledLighting',
            'feature:timestamps',
            'feature:traa',
          ]),
        );
    }
    for (const key of [
      'input.sensitivity',
      'input.stickSensitivity',
      'input.invert',
      'input.stickInvert',
      'input.crouch',
    ]) {
      const v = store.get(key, null);
      if (v !== null) search.set(key, String(v));
    }
    let sentReady = false;
    const early = setInterval(() => {
      const e = ctx.inspector();
      if (!e || !info || !hub || sentReady) return;
      sentReady = true;
      e.pause();
      netStop = startLockstep(hub, e, {
        sample: options.sample,
        onEnd: () => {
          audio.mute(true);
          ended = true;
        },
        onMismatch: () => {
          document.getElementById('msg')!.textContent = 'Connection out of sync.';
        },
        finish: (won) => {
          if (hub!.isHost && !ended) {
            ended = true;
            hub!.finish(result(e, info!, won));
          }
        },
      });
      hub.on('time-up', () => {
        if (hub!.isHost && !ended) {
          ended = true;
          hub!.finish(result(e, info!, false));
        }
      });
      hub.on('end', () => {
        netStop?.();
        audio.mute(true);
      });
      hub.ready();
    }, 20);
    ctx.engine = await createEngine({
      canvas: document.querySelector('#view')!,
      scenes: [world.id],
      replays: { bot: async () => openingReplay },
      search: `?${search}`,
      store,
      modal: () => !['play', 'attract'].includes(ctx.screen),
      actionMap: () =>
        ctx.p?.seat?.data.map
          ? ctx.p.seat.data.vehicle >= 0
            ? 'actionMap:field-drive-map'
            : 'actionMap:field-map'
          : (ctx.p?.seat?.data.vehicle ?? -1) >= 0
            ? 'actionMap:field-drive'
            : ctx.p?.seat?.data.prompt.toLowerCase().includes('hold')
              ? 'actionMap:field-use'
              : 'actionMap:field',
      onView: options.onView,
      onFrame: options.frame,
      cameraInput: options.cameraInput,
    });
    clearInterval(early);
    options.ready();
    document.getElementById('loading')!.hidden = true;
    if (info && ctx.inspector() && !sentReady) hub!.ready();
  } else {
    document.getElementById('loading')!.hidden = true;
    const message = document.createElement('div');
    message.className = 'gpu-notice';
    message.textContent = 'WebGPU is required for the 3D world. Use a WebGPU-enabled Chrome or Edge.';
    document.body.append(message);
    if (info) hub?.fail('WebGPU is required');
    else {
      const e = await createHeadless({
        scene: world,
        seed: 1947,
        settings: { 'game.mode': 'title', 'game.detail': 0.05 },
      });
      Object.assign(window, { __engine: e });
      setInterval(() => e.step(4), 67);
    }
  }
}
