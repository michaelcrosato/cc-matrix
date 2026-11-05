// The named sound effects of the plan (§9.2), each a voice or a list of voices defined with audio.define, and the Animalese
// voice of §9.3: each typed character becomes a tone (a vowel, its pitch set by the speaker and the letter) or a tick of
// noise (a consonant). Capitals are louder; '!' is louder; punctuation falls silent. Gray Knight's voice doubles 7 semitones
// down. Monsters growl, chirp and roar instead of speaking. Everything goes through the engine's audio, so it follows
// volume and mute, and it is silent when there is no sound context.
(() => {
  const H = G;
  const T = (wave, freq, dur, vol, extra = {}) => Object.assign({ wave, freq, dur, vol }, extra);
  H.SFX_NAMED = {
    ui_move: T('square', 'A5', .03, .07), ui_confirm: T('square', 'E5', .08, .13, { to: 'A5' }), ui_cancel: T('triangle', 'A4', .09, .12, { to: 'E4' }),
    ui_error: T('square', 'C3', .18, .14, { vib: [30, .04] }), ui_open: T('triangle', 'E4', .14, .12, { to: 'A5' }),
    bell_toll: [T('sine', 'E4', .9, .22), T('sine', 'E5', .5, .08)],
    sword_clang: [T('noise', 2400, .05, .2), T('square', 'C6', .08, .08, { to: 'G5' })],
    slash_whoosh: T('noise', 900, .16, .16, { to: 300 }), bow_twang: T('saw', 520, .12, .14, { to: 180 }), arrow_hit: T('noise', 1600, .05, .15),
    cast_charge: T('sine', 300, .4, .1, { to: 900 }), spell_spring: [T('triangle', 'C6', .1, .1), T('triangle', 'E6', .1, .1), T('triangle', 'G6', .18, .1)],
    spell_summer: T('noise', 400, .45, .2, { to: 1200 }), spell_autumn: [T('triangle', 'C3', .5, .12), T('noise', 800, .4, .05)],
    spell_winter: [T('sine', 'A6', .3, .08, { vib: [12, .02] }), T('sine', 'E7', .25, .05)], spell_hour: [T('square', 'C5', .04, .1), T('square', 'C4', .04, .1)],
    heal: T('triangle', 'C5', .24, .13, { to: 'G6' }), buff: T('square', 'G5', .16, .09, { to: 'C6' }), debuff: T('saw', 'G4', .22, .1, { to: 'C3' }),
    poison: T('sine', 'G3', .3, .1, { vib: [6, .05] }), burn: T('noise', 1200, .25, .12, { to: 600 }), chill: T('sine', 'C7', .3, .07, { to: 'G6' }),
    sleep: T('triangle', 'E3', .6, .1, { to: 'C3' }), stop: [T('square', 'E4', .05, .1), T('square', 'C4', .12, .1)],
    crit: [T('noise', 3000, .03, .2), T('square', 'C7', .12, .1, { to: 'G6' })], miss: T('noise', 2000, .14, .05, { to: 800 }),
    ko_monster: T('triangle', 'A3', .4, .14, { to: 'A2' }), ko_knight: [T('saw', 'C3', .7, .16, { to: 'G2' }), T('square', 'G2', .7, .05)],
    capture: [T('square', 'C5', .07, .12), T('square', 'E5', .07, .12), T('square', 'G5', .16, .12)], summon_rise: T('sine', 220, .8, .14, { to: 880 }),
    roar_small: T('saw', 180, .35, .16, { to: 120 }), roar_large: [T('saw', 90, .9, .2, { to: 60 }), T('noise', 300, .9, .08)],
    growl: T('saw', 110, .3, .14, { vib: [14, .04] }), chirp: [T('sine', 'A6', .05, .08, { to: 'E7' }), T('sine', 'E6', .06, .08)],
    flap: T('noise', 1400, .12, .1, { to: 700 }),
    march_drums: [T('noise', 120, .08, .24), T('noise', 120, .08, .2)], banner_flip: T('triangle', 'E5', .2, .1, { to: 'A4' }),
    castle_taken: [T('square', 'C4', .2, .14), T('square', 'G4', .2, .14), T('square', 'C5', .4, .14)], candle_hiss: T('noise', 4000, .9, .06, { to: 2000 }),
    tide: T('sine', 'D3', 1.2, .1, { to: 'D2' }), timer_tick: T('square', 'G6', .02, .08)
  };
  // the voice: the profile of a speaker, and the sound of one character
  H.voice = {
    profileFor(knightId) {
      const k = H.get('knight', knightId), v = k.voice || {};
      const wave = k.cls === 'brigand' || k.cls === 'graynight' ? 'saw' : k.cls === 'archer' ? 'triangle' : k.cls === 'adept' || k.cls === 'hourmaiden' ? 'sine' : 'pulse';
      return { base: v.pitch || 200, range: Math.round(4 + (v.lilt || 1) * 3), wave, formant: 1, double: knightId === 'gray' ? -7 : 0 };
    },
    // the pitch of a letter within the speaker's range (the same letter always sounds the same)
    hash(ch) { let h = 0; for (const c of ch) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; },
    // one character's sound: a tone for a vowel, a tick of noise for a consonant, nothing for a space or a stop
    letter(profile, ch) {
      if (!ch || /\s/.test(ch) || /[.,;:!?…"'()\-]/.test(ch)) return null;
      const lower = ch.toLowerCase(), loud = ch !== lower ? 1.3 : 1;
      if (!/[a-z]/.test(lower)) return null;
      if ('aeiouy'.includes(lower)) {
        const formant = { a: 800, e: 1200, i: 2200, o: 600, u: 400, y: 1600 }[lower];
        const steps = (this.hash(lower) % profile.range) - profile.range / 2;
        const f = profile.base * Math.pow(2, steps / 12) * Math.pow(formant / 800, .3) * profile.formant;
        const voice = { wave: profile.wave, freq: Math.round(f), to: Math.round(f * 1.02), dur: .055, vol: .12 * loud, attack: .005 };
        return profile.double ? [voice, Object.assign({}, voice, { freq: Math.round(f * Math.pow(2, profile.double / 12)), vol: voice.vol * .7 })] : voice;
      }
      return { wave: 'noise', freq: 2200 + (this.hash(lower) % 800), dur: .022, vol: .05 * loud };
    },
    // the schedule of a line: the sound each character makes, in order (the tests use it; the dialog plays the same)
    plan(profile, text) { return [...text].map(ch => this.letter(profile, ch)); }
  };
  H.defineNamedSounds = game => {
    for (const [name, v] of Object.entries(H.SFX_NAMED)) game.audio.define(name, v);
  };
})();
