//! Voices in the Animalese manner: a formant-filtered blip per syllable and a tiny consonant click.
//! No real words are ever spoken. Each speaker has a base pitch, rate and timbre.

use crate::{Patch, Wave};

/// Formant pairs (Hz) for five vowels: ah, eh, ee, oh, oo.
pub const FORMANTS: [(f32, f32); 5] = [(800.0, 1200.0), (560.0, 1800.0), (320.0, 2300.0), (500.0, 900.0), (340.0, 800.0)];

/// (base Hz, wave, length s, attack s, click) per speaker: Pip, Posey, Kettle, Bounce, Commodore,
/// Marjorie, Tom, the Twins, a guest.
const SPEAKERS: [(f32, Wave, f32, f32, f32); 9] = [
    (430.0, Wave::Saw, 0.075, 0.006, 0.05),
    (250.0, Wave::Triangle, 0.1, 0.002, 0.16),
    (92.0, Wave::Saw, 0.14, 0.015, 0.04),
    (560.0, Wave::Saw, 0.05, 0.004, 0.05),
    (360.0, Wave::Square, 0.06, 0.002, 0.1),
    (290.0, Wave::Saw, 0.09, 0.01, 0.04),
    (170.0, Wave::Saw, 0.09, 0.01, 0.05),
    (380.0, Wave::Saw, 0.07, 0.005, 0.04),
    (240.0, Wave::Saw, 0.08, 0.008, 0.04),
];

pub fn syllable(speaker: u8, vowel: u8, pitch: f32) -> Vec<(Patch, f32)> {
    let (base, wave, len, attack, click) = SPEAKERS[speaker as usize % SPEAKERS.len()];
    let (f1, f2) = FORMANTS[vowel as usize % FORMANTS.len()];
    let f = base * pitch;
    // Rubber on Pip: the pitch slides up through the blip.
    let end = if speaker == 0 { f * 1.12 } else { f * 0.97 };
    let body = Patch {
        freq_end: end,
        glide: len,
        attack,
        decay: len,
        sustain: 0.0,
        release: 0.02,
        volume: 0.5,
        f1,
        f2,
        bus: 2,
        cutoff: 9000.0,
        cutoff_end: 6000.0,
        ..Patch::new(wave, f)
    };
    let tick = Patch { attack: 0.0005, decay: 0.012, release: 0.004, volume: click, cutoff: 7000.0, cutoff_end: 3000.0, bus: 2, ..Patch::new(Wave::Noise, 1.0) };
    vec![(tick, 0.0), (body, 0.004)]
}
