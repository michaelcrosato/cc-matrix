/** @file Event-driven spatial sound and gibberish speech, using the engine's code-only mixer. */
import { createAudio, type EngineFrame, type AudioBus, type QueryView } from '../../../engine';
import type { Campaign, Person } from '../scenes/state';
import './score';
export const audio = createAudio();
audio.volume('music', 0.1);
let last = -1,
  seq = -1,
  world: object | null = null,
  currentSong = '';
export let voiceVolume = 0.8;
export function setVoiceVolume(v: number): void {
  voiceVolume = v;
}
export function voice(text: string, speaker: string): void {
  if (!audio.context) return;
  const syllables = 'aeiou',
    words = text.split(/\s+/),
    base = audio.context.currentTime;
  const h = [...speaker].reduce((a, c) => a + c.charCodeAt(0), 0),
    pitch = 0.88 + (h % 7) * 0.045;
  words.slice(0, 42).forEach((word, k) => {
    const hash = [...word].reduce((a, c) => a * 31 + c.charCodeAt(0), 0) >>> 0;
    audio.play(`sfx:field-voice-${syllables[hash % 5]}`, {
      bus: 'ui',
      when: base + k * 0.115,
      vol: voiceVolume * 0.45,
      pitch,
    });
  });
  audio.duck(Math.min(6, words.length * 0.115));
}
const eventSound: Record<string, string> = {
  gunshot: 'shot',
  reload: 'reload',
  rack: 'rack',
  jam: 'jam',
  use: 'use',
  melee: 'melee',
  'melee-hit': 'rack',
  throw: 'melee',
  explosion: 'explosion',
  flare: 'flare',
  bark: 'bark',
  thunder: 'thunder',
  'body-action': 'medicine',
  rescue: 'medicine',
  footstep: 'footstep',
  'engine-start': 'engine',
};
export function soundFrame(frame: EngineFrame, c: Campaign, p: Person | undefined): void {
  if (world !== frame.world) {
    world = frame.world;
    last = -1;
    seq = -1;
  }
  const queries: QueryView | undefined = frame.queries
    ? {
        ...frame.queries,
        raycast: (from, dir, options) => {
          if (
            options?.maxDistance !== undefined &&
            (!(options.maxDistance > 0) || !Number.isFinite(options.maxDistance))
          )
            return null;
          return frame.queries!.raycast(from, dir, options);
        },
      }
    : undefined;
  audio.update(frame.camera, queries);
  const song = c.ending
    ? 'song:field-3'
    : c.mode === 'title'
      ? 'song:field-0'
      : p?.seat?.data.fever
        ? 'song:field-3'
        : c.flags.noise && frame.world.tick - c.flags.noise < 240
          ? 'song:field-2'
          : 'song:field-1';
  if (currentSong !== song) {
    audio.music(song, { at: 'now', fade: 1 });
    currentSong = song;
  }
  for (const event of frame.world.events.trace()) {
    if (event.seq <= seq) continue;
    seq = event.seq;
    const data = event.payload as Record<string, unknown>;
    if (event.type === 'say') voice(String(data.message), String(data.speaker));
    const key = eventSound[event.type];
    if (key)
      audio.play(`sfx:field-${key}`, {
        position: (data.from ?? data.at) as [number, number, number] | undefined,
        vol: event.type === 'footstep' ? 0.4 : 0.8,
      });
    if (event.type === 'locator' && p?.seat?.data.locator)
      audio.play('sfx:field-tick', { bus: 'ui', vol: 0.15 + 0.4 * (1 - Number(data.distance) / 120) });
  }
  if (Math.floor(frame.world.tick / 60) > Math.floor(last / 60)) {
    if (p?.health.hp && p.health.hp <= 20) audio.play('sfx:field-heartbeat', { bus: 'ui' });
    const close = p
      ? Object.keys(c.flames).some((i) => {
          const x = ((Number(i) % 192) + 0.5) * 8,
            z = (Math.floor(Number(i) / 192) + 0.5) * 8;
          return Math.hypot(x - p.actor.x, z - p.actor.z) < 35;
        })
      : false;
    if (close) audio.play('sfx:field-fire', { bus: 'ambience' });
    if (frame.world.tick % 180 === 0) audio.play('sfx:field-wind', { bus: 'ambience' });
    if (p && p.seat && p.seat.data.vehicle >= 0)
      audio.play('sfx:field-engine', {
        bus: 'ambience',
        pitch:
          0.7 +
          Number(
            (frame.world.get(p.seat.data.vehicle)?.ride as { data: { speed: number } } | undefined)?.data.speed ?? 0,
          ) /
            30,
      });
  }
  last = frame.world.tick;
}
export const setBus = (bus: AudioBus | 'master', v: number): void => {
  audio.volume(bus, v);
};
