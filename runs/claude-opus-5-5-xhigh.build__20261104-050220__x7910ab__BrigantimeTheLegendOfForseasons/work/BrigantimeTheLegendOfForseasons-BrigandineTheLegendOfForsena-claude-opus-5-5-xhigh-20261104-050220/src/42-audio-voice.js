// VOICES: Animalese-style babble. Each typed letter of a line makes a sound: a vowel a short tone burst through a
// band-pass formant (a 800 Hz, e 1200, i 2200, o 600, u 400, x the profile's formant), a consonant a short high-passed
// noise tick, capitals a little louder, '?' bends the last syllables up, '!' is louder and faster; '.' ',' '...' pause.
// G.voice.plan(profile, text) is the pure schedule (tests use it); G.voice.letter(profile, ch, i, text) plays one
// letter as the dialog types it (the engine's per-letter Dialog voice hook). Everything goes through audio.sfxBus, so it
// follows volume and mute; it is silent headless and when Settings > Voices is Off. Monsters don't babble.

const FORMANT = { a: 800, e: 1200, i: 2200, o: 600, u: 400, y: 1800 };
const V = G.voice = {};
V.profileOf = id => {
  if (id === 'narrator') return null;
  if (id === 'herald') return { base: 160, range: 5, wave: 'square', formant: 1, rate: 1.1 };
  if (id === 'keeper') return { base: 120, range: 4, wave: 'triangle', formant: .9, rate: .8, breath: .4 };
  if (G.has('knight', id)) return G.get('knight', id).voice || { base: 180, range: 6, wave: 'pulse', formant: 1, rate: 1 };
  return { base: 180, range: 6, wave: 'pulse', formant: 1, rate: 1 };
};
/** the schedule of syllables for a line: [{ t, dur, kind: 'v' | 'c', freq, formant, gain }] (pure) */
V.plan = (p, text) => {
  if (!p) return [];
  const out = [], clean = String(text).replace(/\{[^}]*\}/g, ''); let t = 0;
  const q = clean.trim().endsWith('?'), ex = clean.includes('!');
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i], lo = ch.toLowerCase();
    if (ch === '.' && clean.slice(i, i + 3) === '...') { t += .25; i += 2; continue; }
    if (ch === '.') { t += .12; continue; } if (ch === ',') { t += .08; continue; }
    if (!/[a-z]/i.test(ch)) { t += .02; continue; }
    const step = .055 / (p.rate || 1) / (ex ? 1.15 : 1);
    if (FORMANT[lo]) {
      const h = G.hashStr(lo + i % 3), semis = (h % (p.range || 6)) - (p.range || 6) / 2 + (q && i > clean.length - 8 ? 3 : 0);
      out.push({ t, dur: .045 + (h % 25) / 1000, kind: 'v', freq: p.base * Math.pow(2, semis / 12), formant: FORMANT[lo] * (p.formant || 1), gain: (ch !== lo ? 1.25 : 1) * (ex ? 1.2 : 1) });
    } else out.push({ t, dur: .015 + (G.hashStr(lo) % 15) / 1000, kind: 'c', freq: 3000 + (G.hashStr(lo) % 2000), gain: .3 });
    t += step;
  }
  return out;
};
/** play one syllable now through the effects bus */
V.play = (p, syl) => {
  const a = G.game && G.game.audio; if (!a || !a.ctx || !a.sfxBus || !p) return;
  if (G.game.settings && G.game.settings.voices === 'Off') return;
  const c = a.ctx, t0 = c.currentTime + .005, g = c.createGain(); g.connect(a.sfxBus);
  const vol = .09 * syl.gain;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .005); g.gain.exponentialRampToValueAtTime(.0005, t0 + syl.dur);
  if (syl.kind === 'v') {
    const voices = [p.double ? [1, Math.pow(2, p.double / 12)] : [1]].flat();
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = syl.formant; bp.Q.value = 2.2; bp.connect(g);
    const dry = c.createGain(); dry.gain.value = .55; dry.connect(g);
    for (const m of voices) {
      const o = c.createOscillator(); o.type = p.wave === 'saw' ? 'sawtooth' : p.wave === 'pulse' ? 'square' : ['sine', 'square', 'triangle'].includes(p.wave) ? p.wave : 'square';
      o.frequency.setValueAtTime(syl.freq * m, t0);
      if (p.vibrato) o.frequency.linearRampToValueAtTime(syl.freq * m * (1 + p.vibrato), t0 + syl.dur);
      o.connect(bp); o.connect(dry); o.start(t0); o.stop(t0 + syl.dur + .02);
    }
  } else {
    const src = c.createBufferSource(); src.buffer = a._noise; if (!src.buffer) return;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = syl.freq; src.connect(hp); hp.connect(g); src.start(t0, Math.random() * .3); src.stop(t0 + syl.dur + .02);
  }
};
/** the Dialog's per-letter hook: plays the syllable for letter i of the page */
V.letter = (p, ch, i) => {
  if (!p || !/[a-z]/i.test(ch)) return;
  const lo = ch.toLowerCase();
  if (FORMANT[lo]) { const h = G.hashStr(lo + i % 3), semis = (h % (p.range || 6)) - (p.range || 6) / 2; V.play(p, { dur: .045 + (h % 25) / 1000, kind: 'v', freq: p.base * Math.pow(2, semis / 12), formant: FORMANT[lo] * (p.formant || 1), gain: ch !== lo ? 1.25 : 1 }); }
  else if (i % 2 === 0) V.play(p, { dur: .02, kind: 'c', freq: 3000 + (G.hashStr(lo) % 2000), gain: .3 });
};
