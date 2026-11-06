import { scheduleTrack, TRACK_IDS } from './music.js';
import { scheduleEffect, EFFECT_IDS } from './sfx.js';
import { scheduleVoice, VOICE_IDS } from './voice.js';

export { TRACK_IDS, EFFECT_IDS, VOICE_IDS, scheduleTrack, scheduleEffect, scheduleVoice };

export function createAudio() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  const ctx = AC ? new AC() : null;
  const master = ctx ? ctx.createGain() : { gain: { value: 1 } };
  const music = ctx ? ctx.createGain() : { gain: { value: 0.1 } };
  const sfx = ctx ? ctx.createGain() : { gain: { value: 0.8 } };
  const voice = ctx ? ctx.createGain() : { gain: { value: 0.8 } };
  const hush = ctx ? ctx.createBiquadFilter() : null;
  music.gain.value = 0.1;
  sfx.gain.value = 0.8;
  voice.gain.value = 0.8;
  if (ctx) {
    hush.type = 'lowpass';
    hush.frequency.value = 18000;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 8;
    comp.ratio.value = 2.5;
    music.connect(hush);
    hush.connect(master);
    sfx.connect(master);
    voice.connect(master);
    master.connect(comp);
    comp.connect(ctx.destination);
  }
  let current = null;
  let unlocked = ctx ? ctx.state === 'running' : false;

  function resume() {
    if (!ctx) return;
    if (ctx.state !== 'running') ctx.resume();
    unlocked = ctx.state === 'running';
  }

  function playTrack(id, bpm) {
    if (!ctx) return;
    stopMusic();
    const specBpm = bpm || 80;
    current = { id, next: ctx.currentTime + 0.05, bpm: specBpm };
    scheduleAhead();
  }

  function scheduleAhead() {
    if (!ctx || !current) return;
    const horizon = ctx.currentTime + 0.12;
    while (current.next < horizon) {
      scheduleTrack(ctx, music, current.id, current.next, 60 / current.bpm);
      current.next += 60 / current.bpm;
    }
  }

  function stopMusic() {
    current = null;
  }

  function effect(id) {
    if (!ctx) return;
    scheduleEffect(ctx, sfx, id, ctx.currentTime);
  }

  function say(who, text) {
    if (!ctx || !text) return 0;
    return scheduleVoice(ctx, voice, who, text, ctx.currentTime);
  }

  function setHush(on) {
    if (!hush || !ctx) return;
    hush.frequency.setTargetAtTime(on ? 300 : 18000, ctx.currentTime, 0.08);
  }

  function setMusicGain(v) {
    music.gain.value = v;
  }

  async function renderOffline(kind, id, text) {
    const OAC = globalThis.OfflineAudioContext;
    if (!OAC) return 0;
    const off = new OAC(1, 44100, 44100);
    const bus = off.createGain();
    bus.connect(off.destination);
    if (kind === 'music') scheduleTrack(off, bus, id, 0, 1);
    else if (kind === 'effect') scheduleEffect(off, bus, id, 0.05);
    else scheduleVoice(off, bus, id, text || 'Count with me, Doctor.', 0.02);
    const buf = await off.startRendering();
    const data = buf.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < data.length; i += 8) peak = Math.max(peak, Math.abs(data[i]));
    return peak;
  }

  return {
    ctx, music, sfx, voice, master,
    get unlocked() { return unlocked || (ctx && ctx.state === 'running'); },
    resume, playTrack, scheduleAhead, stopMusic, effect, say, setHush, setMusicGain, renderOffline,
  };
}
