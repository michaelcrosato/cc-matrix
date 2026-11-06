//! Animalese-style voices: each syllable of the text is a short pitched blip through two resonant
//! formant filters chosen from the vowel. Per-character base pitch, waveform and speed; falling
//! pitch at full stops, rising at question marks.

use crate::{Patch, Wave};

/// How a character sounds.
#[derive(Clone, Copy, Debug)]
pub struct VoiceDef {
    pub pitch: f32,
    pub wave: Wave,
    pub pace: f32,
    /// Random wobble, in semitones.
    pub jitter: f32,
}

pub fn wave_named(s: &str) -> Wave {
    match s {
        "square" => Wave::Square,
        "saw" => Wave::Saw,
        "sine" => Wave::Sine,
        _ => Wave::Triangle,
    }
}

fn formants(v: char) -> [(f32, f32); 2] {
    match v {
        'a' => [(800.0, 7.0), (1250.0, 8.0)],
        'e' => [(520.0, 7.0), (1900.0, 9.0)],
        'i' => [(320.0, 7.0), (2300.0, 10.0)],
        'o' => [(520.0, 7.0), (900.0, 8.0)],
        'u' => [(340.0, 7.0), (800.0, 8.0)],
        _ => [(500.0, 6.0), (1500.0, 7.0)],
    }
}

fn is_vowel(c: char) -> bool {
    matches!(c, 'a' | 'e' | 'i' | 'o' | 'u' | 'y')
}

/// The syllables of a text: (character index, vowel, inflection).
pub fn syllables(text: &str) -> Vec<(usize, char, f32)> {
    let chars: Vec<char> = text.chars().map(|c| c.to_ascii_lowercase()).collect();
    let mut out = Vec::new();
    let mut i = 0;
    while i < chars.len() {
        if is_vowel(chars[i]) {
            let at = i;
            let v = chars[i];
            while i < chars.len() && is_vowel(chars[i]) {
                i += 1;
            }
            // How the sentence turns: look ahead to its end.
            let mut j = i;
            while j < chars.len() && !matches!(chars[j], '.' | '?' | '!') {
                j += 1;
            }
            let near = j.saturating_sub(i) < 7;
            let turn = if near {
                match chars.get(j) {
                    Some('.') => -2.5,
                    Some('?') => 3.0,
                    Some('!') => 1.2,
                    _ => 0.0,
                }
            } else {
                0.0
            };
            out.push((at, v, turn));
        } else {
            i += 1;
        }
    }
    out
}

fn hash(x: usize) -> f32 {
    let n = (x as u32).wrapping_mul(2_654_435_761);
    ((n >> 16) & 0xffff) as f32 / 65535.0
}

/// The blip for one syllable.
pub fn blip(v: &VoiceDef, vowel: char, turn: f32, seed: usize) -> Patch {
    let wob = (hash(seed) - 0.5) * 2.0 * (v.jitter + 0.5);
    let semis = wob + turn;
    let freq = v.pitch * 2f32.powf(semis / 12.0);
    Patch {
        attack: 0.006,
        decay: 0.05,
        sustain: 0.35,
        hold: 0.012,
        release: 0.02,
        volume: 0.75,
        duty: 0.34,
        cutoff: 7000.0,
        cutoff_end: 5000.0,
        formants: formants(vowel),
        ..Patch::new(v.wave, freq)
    }
}

/// Follows a line as it reveals and says the syllables it passes.
#[derive(Default)]
pub struct Speaker {
    serial: u64,
    said: usize,
    syl: Vec<(usize, char, f32)>,
    last_at: f32,
}

impl Speaker {
    /// New text starts over. `shown` is how many characters are on screen; returns blips due.
    pub fn update(&mut self, serial: u64, text: &str, shown: usize, now: f32, v: &VoiceDef, out: &mut Vec<Patch>) {
        if serial != self.serial {
            self.serial = serial;
            self.said = 0;
            self.syl = syllables(text);
        }
        while self.said < self.syl.len() && self.syl[self.said].0 < shown {
            let (at, vowel, turn) = self.syl[self.said];
            self.said += 1;
            // Pace: a typed-through line doesn't machine-gun.
            if now - self.last_at >= v.pace * 0.7 {
                self.last_at = now;
                out.push(blip(v, vowel, turn, at + serial as usize * 31));
            }
        }
    }
}
