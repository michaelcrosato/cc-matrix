//! Animalese-style voices: one formant-filtered saw blip per syllable, plus a tiny noise click for
//! the consonant. No real words are ever spoken. Each speaker has its own pitch and timbre.

use crate::{Patch, Wave};

/// Formant pairs for the five vowels (Hz).
pub const FORMANTS: [(f32, f32); 5] = [(800.0, 1150.0), (420.0, 1950.0), (300.0, 2300.0), (480.0, 820.0), (340.0, 700.0)];

struct Speaker {
    pitch: f32,
    /// Formants scaled for size.
    formant: f32,
    wave: Wave,
    decay: f32,
    glide: f32,
    click: f32,
    /// Sings in unison with itself.
    double: bool,
    /// A wood-block knock on each syllable.
    wood: bool,
}

const SPEAKERS: [Speaker; 8] = [
    // Pip: high and rubbery; each syllable squeaks up.
    Speaker { pitch: 560.0, formant: 1.25, wave: Wave::Saw, decay: 0.085, glide: 1.22, click: 0.05, double: false, wood: false },
    // Posey: soft, wood-block attack.
    Speaker { pitch: 290.0, formant: 1.0, wave: Wave::Triangle, decay: 0.13, glide: 0.98, click: 0.0, double: false, wood: true },
    // Big Kettle: very low.
    Speaker { pitch: 92.0, formant: 0.72, wave: Wave::Saw, decay: 0.16, glide: 0.96, click: 0.06, double: false, wood: false },
    // Bounce: fast and breathless.
    Speaker { pitch: 430.0, formant: 1.15, wave: Wave::Saw, decay: 0.06, glide: 1.12, click: 0.1, double: false, wood: false },
    // Commodore Gull: nasal and clipped.
    Speaker { pitch: 640.0, formant: 1.35, wave: Wave::Square, decay: 0.055, glide: 0.92, click: 0.05, double: false, wood: false },
    // Marjorie: warm and unhurried.
    Speaker { pitch: 245.0, formant: 1.05, wave: Wave::Saw, decay: 0.13, glide: 0.97, click: 0.03, double: false, wood: false },
    // Two-Towel Tom.
    Speaker { pitch: 165.0, formant: 0.9, wave: Wave::Saw, decay: 0.11, glide: 0.99, click: 0.05, double: false, wood: false },
    // The Twins: two of them, slightly apart.
    Speaker { pitch: 350.0, formant: 1.1, wave: Wave::Saw, decay: 0.09, glide: 1.03, click: 0.04, double: true, wood: false },
];

/// The patches of one syllable.
pub fn syllable(speaker: u8, vowel: u8, pitch: f32) -> Vec<(Patch, f32)> {
    let sp = &SPEAKERS[(speaker as usize).min(SPEAKERS.len() - 1)];
    let (a, b) = FORMANTS[(vowel as usize).min(4)];
    // A little melody from the vowel, so a line isn't one note.
    let wiggle = [1.0, 1.06, 1.12, 0.94, 0.89][(vowel as usize).min(4)];
    let f = sp.pitch * pitch * wiggle;
    let blip = Patch {
        freq_end: f * sp.glide,
        glide: sp.decay,
        attack: 0.006,
        decay: sp.decay,
        volume: 0.42,
        formant: [a * sp.formant, b * sp.formant],
        ..Patch::new(sp.wave, f)
    };
    let mut out = vec![(blip, 0.0)];
    if sp.click > 0.0 {
        out.push((Patch { attack: 0.001, decay: 0.012, volume: sp.click, cutoff: 7000.0, cutoff_end: 3000.0, ..Patch::new(Wave::Noise, 1.0) }, 0.0));
    }
    if sp.wood {
        out.push((Patch { attack: 0.001, decay: 0.03, volume: 0.16, freq_end: 620.0, glide: 0.02, ..Patch::new(Wave::Sine, 780.0) }, 0.0));
    }
    if sp.double {
        let mut second = blip;
        second.freq = f * 1.012;
        second.freq_end = f * sp.glide * 1.012;
        out.push((second, 0.012));
    }
    out
}
