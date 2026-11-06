/**
 * @file The page's sound: creates the audio with music at 10% (PLAN.md section 12), plays each new sim event by `seq`,
 * picks the song and ambience for what is on, and speaks lines through the voice module.
 *
 * Game code, a page's.
 *
 * @example
 * // const sound = createSound(settings); sound.frame(frame, state);
 */
import { createAudio, type Audio, type EngineFrame } from '../../../engine';
import { getLine } from '../ui/lines/index';
import '../sounds/effects';
import '../sounds/songs';
import { say } from './voice';

/** The volumes a player sets, 0 to 1. */
export interface Volumes {
  music: number;
  effects: number;
  voices: number;
}

/** A sim event to a sound id, for those with nothing more to them. */
const SIMPLE: Readonly<Record<string, string>> = {
  topple: 'sfx:creak',
  splash: 'sfx:splash',
  splashBig: 'sfx:splashBig',
  moved: 'sfx:moved',
  clack: 'sfx:clack',
  rep: 'sfx:squeak',
  reachHit: 'sfx:good',
  lineStep: 'sfx:rope',
  stumble: 'sfx:creak',
  gustWarn: 'sfx:ambWind',
  gullLands: 'sfx:gull',
  gullFlicked: 'sfx:gull',
  gate: 'sfx:coin',
  turtle: 'sfx:plop',
  wake: 'sfx:splash',
  marbleSunk: 'sfx:plop',
  marbleTap: 'sfx:tap',
  marbleLost: 'sfx:miss',
  hoopWarn: 'sfx:whistle',
  hoopFly: 'sfx:hoopWhoosh',
  hoopCatch: 'sfx:good',
  hoopDrop: 'sfx:miss',
  launch: 'sfx:hoopWhoosh',
  slip: 'sfx:ooh',
  jogFlag: 'sfx:squeak',
  jogBoost: 'sfx:hoopWhoosh',
  calmCall: 'sfx:breathOut',
  guestDelivered: 'sfx:good',
  crank: 'sfx:rope',
  cartHome: 'sfx:clack',
  lurch: 'sfx:groan',
  thunder: 'sfx:thunder',
  ferryHorn: 'sfx:ferryHorn',
  pebbleFound: 'sfx:coin',
  stepMiss: 'sfx:miss',
  plaqueRead: 'sfx:squeak',
  used: 'sfx:select',
};

/** What a song choice depends on. */
export interface MusicState {
  event: string;
  mode: string;
  day: number;
  sky: string;
  front: boolean;
  phrase?: number;
  tilt?: number;
  credits?: boolean;
}

/** The song for what is on. */
function songFor(m: MusicState): string {
  if (m.credits) return 'song:dawn';
  if (m.sky === 'storm') return 'song:tilt';
  switch (m.event && m.mode === 'event' ? m.event : '') {
    case 'poseA':
    case 'poseB':
    case 'poseC':
    case 'heron':
    case 'ring':
    case 'morning':
    case 'pond':
    case 'group':
      return 'song:stillness';
    case 'line':
    case 'paddle':
    case 'plunge':
      return 'song:water';
    case 'step':
      return `song:stepBed${[104, 112, 120][m.phrase ?? 0] ?? 112}`;
    case 'hoop':
    case 'garden':
      return 'song:hoop';
    default:
      return 'song:lobby';
  }
}

/** The page's sound. */
export class Sound {
  readonly audio: Audio;
  private seq = 0;
  private world: object | null = null;
  private song = '';
  private ambience: { stop?: () => void }[] = [];
  private ambKind = '';
  private rolling: { stop?: () => void; volume?: (v: number) => void } | null = null;
  private lastCreak = 0;
  private speechUntil = 0;
  onSpeech: (who: string, text: string, seconds: number, id: string) => void = () => {};
  volumes: Volumes = { music: 0.1, effects: 1, voices: 1 };
  private calm = 0;

  constructor(context?: BaseAudioContext) {
    this.audio = createAudio(context ? { context } : {});
    this.audio.volume('music', 0.1);
  }

  /** Applies the player's volumes. */
  setVolumes(v: Volumes): void {
    this.volumes = v;
    this.audio.volume('music', v.music);
    // Calm softens the world's sound, never the music or the voices you need.
    const soft = 1 - 0.3 * this.calm;
    this.audio.volume('effects', v.effects * soft);
    this.audio.volume('ambience', v.effects * soft);
    this.audio.volume('ui', Math.max(v.effects, v.voices));
  }

  /** How calm the player is, 0 to 1: it softens the sound. */
  setCalm(calm: number): void {
    this.calm = calm;
    this.setVolumes(this.volumes);
  }

  /** Plays an effect. */
  play(id: string, vol = 1): void {
    this.audio.play(id, { vol });
  }

  /** Speaks a line by id; n picks among its variants. */
  speak(who: string, line: string, n = 0): void {
    const entry = getLine(line, n);
    if (!entry) return;
    const speaker = entry.who ?? who;
    const seconds = say(this.audio, speaker, entry.text, this.volumes.voices);
    this.speechUntil = performance.now() + seconds * 1000;
    this.onSpeech(speaker, entry.text, seconds, line);
  }

  /** Whether a line is being spoken. */
  get speaking(): boolean {
    return performance.now() < this.speechUntil;
  }

  /** Sets the song and intensity for what is on. */
  setMusic(m: MusicState): void {
    const song = songFor(m);
    if (song !== this.song) {
      this.song = song;
      this.audio.music(song, { intensity: song === 'song:lobby' ? Math.min(1, 0.05 + (m.day - 1) * 0.22) : 0.6 });
    }
    if (m.sky === 'storm') this.audio.intensity(Math.min(1, 0.2 + (m.tilt ?? 0) / 8));
    const amb = m.sky === 'storm' ? 'storm' : 'calm';
    if (amb !== this.ambKind) {
      this.ambKind = amb;
      for (const s of this.ambience) s.stop?.();
      this.ambience = [];
      const list = amb === 'storm' ? ['sfx:ambRain', 'sfx:ambWind', 'sfx:ambSea'] : ['sfx:ambSea', 'sfx:ambBirds'];
      for (const id of list) {
        const played = this.audio.play(id, { loop: true }) as unknown as { stop?: () => void } | null;
        if (played) this.ambience.push(played);
      }
    }
  }

  /** The marble roll: a loop with its level by speed; 0 stops it. */
  marble(speed: number): void {
    const on = speed > 0.08;
    if (on && !this.rolling)
      this.rolling = this.audio.play('sfx:marble', { loop: true, vol: 0.2 }) as unknown as {
        stop?: () => void;
        volume?: (v: number) => void;
      } | null;
    if (!on && this.rolling) {
      this.rolling.stop?.();
      this.rolling = null;
    }
    this.rolling?.volume?.(Math.min(1, speed * 0.45));
  }

  /** The wobble creak, its pitch and level by how near the edge. */
  creak(r: number): void {
    const now = performance.now();
    if (r < 0.75 || now - this.lastCreak < 340) return;
    this.lastCreak = now;
    this.audio.play('sfx:creak', { pitch: 0.7 + r * 0.7, vol: (r - 0.7) * 2.2 });
  }

  /** One frame: the listener, and each new sim event by `seq`. */
  frame(frame: EngineFrame, onEvent: (type: string, payload: Record<string, unknown>) => void): void {
    this.audio.update(frame.camera, frame.queries ?? undefined);
    if (frame.world !== this.world) {
      this.world = frame.world;
      this.seq = 0;
      const trace = frame.world.events.trace();
      this.seq = trace.length ? trace[trace.length - 1].seq - 0 : 0;
      for (const record of trace)
        if (record.seq >= this.seq) onEvent(record.type, record.payload as Record<string, unknown>);
      return;
    }
    for (const record of frame.world.events.trace()) {
      if (record.seq <= this.seq) continue;
      this.seq = record.seq;
      const payload = (record.payload ?? {}) as Record<string, unknown>;
      const id = SIMPLE[record.type];
      if (id) this.audio.play(id);
      onEvent(record.type, payload);
    }
  }
}
