/* ---- THE VOICES (plan §12.3): gibberish in the Animalese / Simlish manner. A line becomes syllables (a consonant cluster
 * and a vowel); each syllable is an oscillator through two band-pass filters at the vowel's formants, with a consonant
 * burst; the pitch follows the profile, the sentence's downdrift, a rise on '?' and a lift on '!'. The same line always
 * sounds the same (a hash seeds the contour). Captions always show with the voice. ---- */
const VOWEL_F = { a: [800, 1200], e: [400, 2000], i: [300, 2500], o: [500, 900], u: [350, 700], y: [300, 2200] };
const VOICE_PROFILES = {
  vinnie: { base: 110, wave: 'sawtooth', rate: 14, formant: 1, punch: 1.2 }, deedee: { base: 230, wave: 'square', rate: 15, formant: 1.1, punch: 1.1 },
  gigawatt: { base: 140, wave: 'sawtooth', rate: 9, formant: .85, nasal: true, slides: true }, roscoe: { base: 150, wave: 'sawtooth', rate: 12, formant: 1 },
  volt: { base: 220, wave: 'square', rate: 14, formant: 1.1 }, rumble: { base: 85, wave: 'sawtooth', rate: 7, formant: .9 }, pixel: { base: 270, wave: 'square', rate: 15, formant: 1.2 },
  riptide: { base: 170, wave: 'sine', rate: 7, formant: .95, drawl: true }, shellshock: { base: 200, wave: 'triangle', rate: 10, formant: 1.05, sing: true },
  longboard: { base: 120, wave: 'sawtooth', rate: 6, formant: .9 }, torque: { base: 95, wave: 'sawtooth', rate: 9, formant: .9, gravel: true }, sparkplug: { base: 300, wave: 'square', rate: 16, formant: 1.15 },
  hubcap: { base: 130, wave: 'sawtooth', rate: 8, formant: .95, grumpy: true }, obsidian: { base: 78, wave: 'sawtooth', rate: 6, formant: .85 }, ember: { base: 230, wave: 'triangle', rate: 12, formant: 1.05 },
  pumice: { base: 190, wave: 'square', rate: 11, formant: 1, bounce: true }, blammo: { base: 60, wave: 'sawtooth', rate: 8, formant: .8, growl: true },
  dunkatron: { base: 95, wave: 'square', rate: 12, robot: 50, quant: true }, swatbot: { base: 120, wave: 'square', rate: 12, robot: 50, quant: true }, spareparts: { base: 150, wave: 'square', rate: 12, robot: 60, glitch: true, quant: true },
  cleanbot: { base: 200, wave: 'square', rate: 12, robot: 50, quant: true }, intern: { base: 160, wave: 'triangle', rate: 10, formant: 1 }, crowd: { base: 170, wave: 'sawtooth', rate: 10, formant: 1, chant: true }
};
/** a line into syllables: each a consonant (or none), a vowel, a length; spaces are short gaps, punctuation longer ones */
const voicePlan = (text, profile) => {
  const out = []; let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  const rnd = () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
  const low = text.toLowerCase(), n = low.length;
  let cons = '', t = 0, step = 0, sylN = 0;
  for (let i = 0; i < n; i++) {
    const c = low[i];
    if (/[a-z]/.test(c)) {
      if (VOWEL_F[c]) {
        const dur = .055 + rnd() * .035, pitch = profile.base * (1 + (rnd() - .5) * .12) * Math.pow(2, -(sylN * .004)) * (profile.robot ? 1 : 1);
        out.push({ t, dur, vowel: c, cons, f0: pitch, excl: false, quest: false });
        t += dur; cons = ''; sylN++;
      } else cons += c;
    } else if (c === ' ') { if (cons) { out.push({ t, dur: .03, vowel: null, cons, f0: profile.base, gap: true }); t += .03; cons = ''; } t += .05; }
    else if (c === '!' || c === '?' || c === '.' || c === ',') { const last = out[out.length - 1]; if (last) { if (c === '!') last.excl = true; if (c === '?') last.quest = true; } t += c === '.' ? .18 : .1; }
    else if (/[0-9]/.test(c)) { t += .04; }
  }
  for (const s of out) { if (s.excl) s.f0 *= 1.06; if (s.quest) s.f0 *= 1.12; if (profile.quant) s.f0 = Math.round(s.f0 / 12) * 12; }
  return out;
};
/** speak a text as a profile: builds the syllable plan and, when audio runs, schedules its nodes on the sfx bus */
const voiceSay = (text, who, o = {}) => {
  const profile = VOICE_PROFILES[who] || VOICE_PROFILES.crowd;
  const plan = voicePlan(text, profile);
  const vv = Number(setting('voiceVol') ?? 1);   // the Voice volume slider
  if (A.ctx && A.sfxBus && vv > 0) {
    const c = A.ctx, t0 = c.currentTime + .02, bus = A.sfxBus;
    for (const syl of plan) {
      if (!syl.vowel) continue;   // a gap (a space or a stop before a word) is silence in the synth
      const at = t0 + syl.t;
      const o2 = c.createOscillator(), g = c.createGain();
      o2.type = profile.wave === 'sawtooth' ? 'sawtooth' : profile.wave === 'square' ? 'square' : profile.wave === 'triangle' ? 'triangle' : 'sine';
      o2.frequency.setValueAtTime(syl.f0, at); o2.frequency.linearRampToValueAtTime(syl.f0 * (profile.slides ? .9 : .97), at + syl.dur);
      const [f1, f2] = VOWEL_F[syl.vowel];
      const bp1 = c.createBiquadFilter(), bp2 = c.createBiquadFilter(); bp1.type = bp2.type = 'bandpass';
      bp1.frequency.value = f1 * (profile.formant || 1) * (profile.nasal ? .8 : 1); bp2.frequency.value = f2 * (profile.formant || 1);
      bp1.Q.value = 5; bp2.Q.value = 6;
      const amp = (syl.excl ? 1.4 : 1) * (o.volume || .2) * (profile.punch || 1) * vv;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(amp, at + .01); g.gain.linearRampToValueAtTime(0, at + syl.dur);
      o2.connect(bp1); o2.connect(bp2); bp1.connect(g); bp2.connect(g); g.connect(bus);
      o2.start(at); o2.stop(at + syl.dur + .02);
    }
  }
  return plan;
};
/** the letter a Dialog types: one syllable for it (the typed line is the voice's timing, the same as the caption's) */
const voiceLetter = (ch, who) => { if (!/[a-zA-Z]/.test(ch || '')) return; if (!A.ctx || !A.sfxBus) return; voiceSay(ch, who, { volume: .08 }); };
/** the crowd's ambience: a looping pink-ish noise through a band-pass, its level from the excitement (0..1) */
const crowdAmb = { node: null, gain: null, exc: 0 };
const crowdStart = () => {
  if (!A.ctx || crowdAmb.node || !A.musicBus) return;
  const c = A.ctx, len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  let b0 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = .98 * b0 + .02 * w; d[i] = b0 * 6; }
  const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = .6;
  crowdAmb.gain = c.createGain(); crowdAmb.gain.gain.value = .04;
  src.connect(bp); bp.connect(crowdAmb.gain); crowdAmb.gain.connect(A.musicBus); src.start(); crowdAmb.node = src;
};
const crowdSet = exc => { crowdAmb.exc = clamp(exc, 0, 1); if (crowdAmb.gain && A.ctx) crowdAmb.gain.gain.value = .02 + .08 * crowdAmb.exc; };
