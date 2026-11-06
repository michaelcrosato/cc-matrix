import { Mix } from './engine.js';
import { TRACKS, STINGS } from './tracks.js';
import { emitBar } from './sequencer.js';
import { INSTRUMENTS } from './instruments.js';
import { SFX } from './sfx.js';
import { speak, VOICES } from './voice.js';
import { mulberry32 } from '../core/rng.js';

/** Render anything with an OfflineAudioContext and read the signal. Used by the audio tests. */
export async function renderProbe(kind, name, seconds = 3, levels = [100, 100, 100]) {
  const rate = 22050;
  const ctx = new OfflineAudioContext(2, Math.ceil(rate * seconds), rate);
  const mix = new Mix(ctx);
  mix.setLevels(...levels);
  let blips = 0;
  if (kind === 'track') {
    const track = TRACKS[name], stepDur = 60 / track.bpm / 4;
    let bar = 0, t0 = 0.02;
    while (t0 < seconds) {
      emitBar(track, bar, t0, stepDur, (t, inst, midi, len, vel) => { if (t < seconds) INSTRUMENTS[inst](ctx, mix.musicIn, t, midi, len, vel, 0); });
      t0 += stepDur * 16; bar++;
    }
  } else if (kind === 'sting') mix.sting(name, 0.02);
  else if (kind === 'sfx') { SFX[name](mix, 0.02, {}); }
  else if (kind === 'voice') {
    const text = 'Please step on. Not on me. On the island! Do you trust your knees?';
    blips = speak(mix, mix.voice, name, text, 0.02, mulberry32(11)).blips;
  } else if (kind === 'instrument') INSTRUMENTS[name](ctx, mix.sfx, 0.02, 64, 0.5, 0.7, 0);
  else if (kind === 'note') INSTRUMENTS[name[0]](ctx, mix.sfx, 0.02, name[1], 0.5, 0.7, 0);
  const b = await ctx.startRendering();
  const d = b.getChannelData(0);
  let peak = 0, sum = 0, finite = true;
  for (let i = 0; i < d.length; i++) { const v = d[i]; if (!Number.isFinite(v)) finite = false; const a = Math.abs(v); if (a > peak) peak = a; sum += v * v; }
  return { peak, rms: Math.sqrt(sum / d.length), finite, blips, seconds, rate, samples: kind === 'note' ? Array.from(d) : undefined };
}
export const AUDIO_LISTS = { tracks: Object.keys(TRACKS), stings: Object.keys(STINGS), sfx: Object.keys(SFX), voices: Object.keys(VOICES), instruments: Object.keys(INSTRUMENTS) };
