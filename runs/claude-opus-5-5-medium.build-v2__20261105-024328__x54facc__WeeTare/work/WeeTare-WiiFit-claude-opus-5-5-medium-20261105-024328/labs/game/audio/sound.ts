/**
 * @file The page's sound: the audio runtime with music at 10% by default, the songs by activity, the sim's `cue` and other
 * events mapped to effects, ambience by place, and the Voices slider. Started by the first gesture, as the runtime does.
 */
import { createAudio, type Audio } from '../../../engine';
import '../sounds/songs';
import '../sounds/sfx';
import { babble } from './voice';
import type { Speaker } from '../sounds/sfx';

/** What a cue plays. */
const CUES: Readonly<Record<string, string>> = {
  creak: 'sfx:wtCreak', bell: 'sfx:wtBell', stamp: 'sfx:wtStamp', ding: 'sfx:wtDing', whistle: 'sfx:wtWhistle',
  repGood: 'sfx:wtSqueak', repMiss: 'sfx:wtCreak', gullLand: 'sfx:wtGull', gullOff: 'sfx:wtGull', rope: 'sfx:wtRope',
  stumble: 'sfx:wtCreak', splash: 'sfx:wtSplash', splashBig: 'sfx:wtSplashBig', paddle: 'sfx:wtSqueak', horn: 'sfx:wtHorn',
  turtle: 'sfx:wtFrog', marbleSink: 'sfx:wtSink', marbleLost: 'sfx:wtWhoosh', whoosh: 'sfx:wtWhoosh', hoopDrop: 'sfx:wtClack',
  hoopWhoosh: 'sfx:wtWhoosh', hoopCatch: 'sfx:wtDing', hoopWarn: 'sfx:wtWhistle', pace: 'sfx:wtSqueak', calmWave: 'sfx:wtOoh',
  crank: 'sfx:wtRope', groan: 'sfx:wtGroan', thunder: 'sfx:wtThunder', tick: 'sfx:wtClack', pebble: 'sfx:wtClack',
  gust: 'sfx:wtWhoosh', gustWarn: 'sfx:wtWhistle', stampJingle: 'sfx:wtStamp',
}; // prettier-ignore

export interface Sound {
  readonly audio: Audio;
  /** Plays a cue by name. */
  cue(name: string, extra?: Record<string, unknown>): void;
  /** Plays a sim event by type. */
  event(type: string): void;
  /** Babbles a line at the Voices level. */
  say(who: string, text: string): number;
  /** Changes the song; '' silence. */
  song(id: string): void;
  /** Sets the ambience: sea, wind, rain. */
  ambience(storm: number): void;
  voices: number;
  stop(): void;
}

/** Makes the sound. `volumes` is what the save holds. */
export function createSound(volumes: { music: number; effects: number; voices: number }): Sound {
  const audio = createAudio();
  audio.volume('music', volumes.music);
  audio.volume('effects', volumes.effects);
  audio.volume('ui', 1);
  let current = '';
  let last = 0;
  let birds = 0;
  const self: Sound = {
    audio,
    voices: volumes.voices,
    cue(name) {
      const id = CUES[name];
      if (id) audio.play(id);
    },
    event(type) {
      if (type === 'beat') {
        audio.play('sfx:wtClap', { vol: 0.8 } as never);
        audio.play('sfx:wtKick');
      } else if (type === 'topple') audio.play('sfx:wtCreak');
      else if (type === 'clack') audio.play('sfx:wtClack');
      else if (type === 'moved') audio.play('sfx:wtFrog');
      else if (type === 'results') audio.stinger?.('song:stamp', { vol: 1 } as never);
    },
    say(who, text) {
      return babble(audio, who as Speaker, text, self.voices);
    },
    song(id) {
      if (id === current) return;
      current = id;
      audio.music(id || null, { intensity: 0.2 } as never);
    },
    ambience(storm) {
      const now = performance.now() / 1000;
      if (now - last < 3.4) return;
      last = now;
      audio.play(storm > 0.3 ? 'sfx:wtWind' : 'sfx:wtSea');
      if (storm > 0.3) audio.play('sfx:wtRain');
      else if ((birds = (birds + 1) % 3) === 0) audio.play('sfx:wtBirds');
    },
    stop() {
      audio.music(null);
      void audio.close();
    },
  };
  return self;
}
