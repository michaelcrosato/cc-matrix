import { detuneCents } from '../physics/island.js';
import { INSTRUMENTS, midiHz, epiano, slapBass, kick, snare, shaker, woodblock } from './instruments.js';
import { TRACKS, TITLE_MOTIF, STINGS } from './tracks.js';
import { SFX, footClick } from './sfx.js';
import { speak, VOICES } from './voice.js';

function analyserOf(ctx) {
  const node = ctx.createAnalyser();
  node.fftSize = 1024;
  return node;
}

export function createMixer(ctx, gains = { music: 0.1, sfx: 0.8, voice: 0.8 }) {
  const master = ctx.createDynamicsCompressor();
  master.threshold.value = -3;
  master.knee.value = 6;
  master.ratio.value = 4;
  master.attack.value = 0.005;
  master.release.value = 0.15;
  const music = ctx.createGain();
  const sfx = ctx.createGain();
  const voice = ctx.createGain();
  music.gain.value = gains.music;
  sfx.gain.value = gains.sfx;
  voice.gain.value = gains.voice;
  const musicEar = analyserOf(ctx);
  const sfxEar = analyserOf(ctx);
  const voiceEar = analyserOf(ctx);
  music.connect(musicEar); musicEar.connect(master);
  sfx.connect(sfxEar); sfxEar.connect(master);
  voice.connect(voiceEar); voiceEar.connect(master);
  master.connect(ctx.destination);
  return { master, music, sfx, voice, musicEar, sfxEar, voiceEar };
}

function scheduleTrack(ctx, dest, trackId, start, seconds, tiltAt) {
  const track = TRACKS[trackId] || TRACKS.title;
  const beat = 60 / track.bpm;
  const step = beat / 4;
  const lead = INSTRUMENTS[track.lead] || epiano;
  const bars = track.motif ? TITLE_MOTIF : null;
  const end = start + seconds;
  let bar = 0;
  for (let time = start; time < end; time += step * 16) {
    const chord = track.bass[bar % track.bass.length];
    slapBass(ctx, dest, time, midiHz(chord - 12), beat * 2, 0.22);
    if (bar % 2 === 0) kick(ctx, dest, time, 0.2);
    shaker(ctx, dest, time + beat, 0.08);
    if (bars) {
      const notes = bars[bar % bars.length];
      for (const [at, note, len] of notes) {
        const when = time + at * step;
        const cents = tiltAt ? tiltAt(when) : 0;
        const hz = midiHz(note) * 2 ** (cents / 1200);
        lead(ctx, dest, when, hz, Math.max(0.12, len * step), 0.22);
        epiano(ctx, dest, when, hz, Math.max(0.1, len * step * 0.8), 0.12);
      }
    } else {
      const cents = tiltAt ? tiltAt(time) : 0;
      const hz = midiHz(chord + 12) * 2 ** (cents / 1200);
      lead(ctx, dest, time, hz, beat * 2, 0.18);
      woodblock(ctx, dest, time + beat, 700, 0.08);
    }
    bar += 1;
  }
}

export function createAudio() {
  let ctx = null;
  let mix = null;
  let musicGain = 0.1;
  let sfxGain = 0.8;
  let voiceGain = 0.8;
  let tilt = 0;
  let track = 'title';
  let stopped = false;
  let nextAt = 0;
  const ears = { music: null, sfx: null, voice: null };

  function ensure() {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return false;
    if (!ctx) {
      ctx = new AC();
      mix = createMixer(ctx, { music: musicGain, sfx: sfxGain, voice: voiceGain });
      ears.music = mix.musicEar;
      ears.sfx = mix.sfxEar;
      ears.voice = mix.voiceEar;
      nextAt = ctx.currentTime + 0.05;
    }
    return true;
  }

  function tiltAt(time) {
    return detuneCents(tilt, time);
  }

  return {
    unlock() {
      if (stopped) return;
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    setGains(music, sfx, voice) {
      musicGain = music;
      sfxGain = sfx;
      voiceGain = voice;
      if (!mix) return;
      mix.music.gain.value = music;
      mix.sfx.gain.value = sfx;
      mix.voice.gain.value = voice;
    },
    setTilt(rad) { tilt = rad || 0; },
    detune(time = 0) { return detuneCents(tilt, time); },
    play(id) { track = id || 'title'; },
    tick() {
      if (stopped || !ctx || !mix) return;
      const horizon = ctx.currentTime + 0.15;
      while (nextAt < horizon) {
        scheduleTrack(ctx, mix.music, track, nextAt, 0.5, tiltAt);
        nextAt += 0.5;
      }
    },
    sfx(name, when = 0) {
      if (stopped || !ensure()) return;
      const fn = SFX[name];
      if (fn) fn(ctx, mix.sfx, ctx.currentTime + when);
    },
    say(text, who) {
      if (stopped || !ensure()) return 1.2;
      return speak(ctx, mix.voice, ctx.currentTime, text, who);
    },
    foot() { if (!stopped && ensure()) footClick(ctx, mix.sfx, ctx.currentTime); },
    sting(name) {
      if (stopped || !ensure()) return;
      const notes = STINGS[name] || STINGS.adequate;
      notes.forEach((note, i) => epiano(ctx, mix.music, ctx.currentTime + i * 0.12, midiHz(note), 0.3, 0.3));
    },
    stop() {
      stopped = true;
      if (ctx && ctx.state !== 'closed') ctx.suspend().catch(() => {});
    },
    ears() { return ears; },
    snapshot() {
      return {
        state: ctx ? ctx.state : 'silent',
        music: musicGain,
        sfx: sfxGain,
        voice: voiceGain,
        track,
        detune: detuneCents(tilt, 0),
      };
    },
  };
}

export async function renderProbe(kind, id = 'title') {
  const rate = 44100;
  const seconds = kind === 'voice' ? 1.4 : kind === 'sfx' ? 0.6 : 2.2;
  const ctx = new OfflineAudioContext(1, Math.floor(rate * seconds), rate);
  const mix = createMixer(ctx, { music: 0.1, sfx: 0.8, voice: 0.8 });
  if (kind === 'track') scheduleTrack(ctx, mix.music, id, 0.05, 2, () => 0);
  else if (kind === 'sting') {
    const notes = STINGS[id] || STINGS.reveal;
    notes.forEach((note, i) => epiano(ctx, mix.music, 0.05 + i * 0.1, midiHz(note), 0.35, 0.4));
  } else if (kind === 'sfx') {
    const fn = SFX[id] || footClick;
    fn(ctx, mix.sfx, 0.05, id === 'splash' ? true : undefined);
  } else if (kind === 'voice') {
    speak(ctx, mix.voice, 0.02, 'Hold still. The island is taking notes.', id in VOICES ? id : 'trudy');
  }
  const audio = await ctx.startRendering();
  const samples = audio.getChannelData(0);
  let peak = 0;
  let sum = 0;
  let finite = true;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (!Number.isFinite(s)) finite = false;
    const a = Math.abs(s);
    if (a > peak) peak = a;
    sum += s * s;
  }
  return { peak, rms: Math.sqrt(sum / samples.length), finite, clipped: peak >= 0.999 };
}

export { TRACKS, STINGS, SFX, VOICES };
