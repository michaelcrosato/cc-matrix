//! Wii Fine's sound: the sound-effect bank (by id), the gibberish voices and the songs, all
//! synthesised from `Patch`es. No audio files. Everything here is data; to add a song, add a
//! `Song` and a line in `song()`.

use crate::{Patch, Wave};
use Wave::*;

/// Which bus a voice is on.
pub const BUS_MUSIC: u8 = 0;
pub const BUS_SFX: u8 = 1;
pub const BUS_VOICE: u8 = 2;

fn n(wave: Wave, f: f32) -> Patch {
    Patch::new(wave, f)
}

fn p(wave: Wave, f: f32, f_end: f32, glide: f32, dec: f32, vol: f32) -> Patch {
    Patch { freq_end: f_end, glide, decay: dec, volume: vol, ..n(wave, f) }
}

fn noise(dec: f32, vol: f32, c0: f32, c1: f32) -> Patch {
    Patch { decay: dec, volume: vol, cutoff: c0, cutoff_end: c1, ..n(Noise, 1.0) }
}

/// The patches (and delays) of sound effect `id` at `pitch` (a ratio) .
pub fn sfx(id: u16, pitch: f32) -> Vec<(Patch, f32)> {
    let k = pitch.clamp(0.25, 4.0);
    let tone = |f: f32, dec: f32, vol: f32| (Patch { decay: dec, release: dec * 0.5, volume: vol, ..n(Sine, f * k) }, 0.0);
    match id {
        1 => vec![(Patch { decay: 0.05, volume: 0.14, ..n(Triangle, 880.0 * k) }, 0.0)],
        2 => vec![(Patch { decay: 0.08, volume: 0.16, ..n(Triangle, 660.0 * k) }, 0.0), (Patch { decay: 0.12, volume: 0.14, ..n(Triangle, 990.0 * k) }, 0.05)],
        3 => vec![(Patch { freq_end: 330.0, glide: 0.08, decay: 0.09, volume: 0.14, ..n(Triangle, 520.0 * k) }, 0.0)],
        4 => vec![(p(Sine, 90.0, 40.0, 0.12, 0.25, 0.7), 0.0), (noise(0.12, 0.45, 2500.0, 300.0), 0.0)],
        5 => vec![(p(Sine, 200.0, 90.0, 0.25, 0.4, 0.4), 0.0), (noise(0.3, 0.25, 800.0, 150.0), 0.05), (p(Sine, 140.0, 280.0, 0.15, 0.2, 0.3), 0.3)],
        6 => vec![(Patch { decay: 0.03, volume: 0.12, ..n(Square, 1200.0 * k) }, 0.0)],
        7 => vec![(noise(0.05, 0.12, 2200.0, 600.0), 0.0)],
        8 => vec![(Patch { freq_end: 1500.0 * k, glide: 0.07, decay: 0.12, volume: 0.2, duty: 0.3, ..n(Square, 600.0 * k) }, 0.0)],
        9 => vec![(Patch { freq_end: 140.0, glide: 0.3, decay: 0.3, volume: 0.15, cutoff: 900.0, cutoff_end: 300.0, ..n(Saw, 180.0 * k) }, 0.0)],
        10 => vec![(noise(0.18, 0.28, 3500.0, 600.0), 0.0), (p(Sine, 500.0, 200.0, 0.1, 0.1, 0.15), 0.0)],
        11 => vec![(noise(0.8, 0.7, 5000.0, 200.0), 0.0), (p(Sine, 160.0, 40.0, 0.5, 0.8, 0.6), 0.0), (noise(0.5, 0.35, 3000.0, 400.0), 0.25)],
        12 => vec![(Patch { freq_end: 1200.0 * k, glide: 0.18, attack: 0.02, decay: 0.2, volume: 0.2, duty: 0.35, cutoff: 3000.0, cutoff_end: 2000.0, ..n(Square, 1700.0 * k) }, 0.0), (Patch { freq_end: 1500.0, glide: 0.15, decay: 0.18, volume: 0.18, duty: 0.35, ..n(Square, 2100.0 * k) }, 0.22)],
        13 => vec![(Patch { attack: 0.4, decay: 0.9, volume: 0.1, cutoff: 700.0, cutoff_end: 400.0, ..n(Noise, 1.0) }, 0.0)],
        14 => vec![(noise(0.06, 0.4, 5000.0, 2000.0), 0.0), (noise(0.07, 0.3, 4000.0, 1500.0), 0.03)],
        15 => vec![(Patch { decay: 1.3, release: 0.6, volume: 0.3, ..n(Sine, 196.0 * k) }, 0.0), (Patch { decay: 1.1, release: 0.5, volume: 0.15, ..n(Sine, 392.0 * k * 1.01) }, 0.0)],
        16 => vec![tone(300.0, 0.5, 0.35), (Patch { decay: 0.35, volume: 0.15, ..n(Sine, 900.0 * k) }, 0.0)],
        17 => vec![(Patch { attack: 0.08, decay: 0.2, volume: 0.15, cutoff: 600.0, cutoff_end: 5000.0, ..n(Noise, 1.0) }, 0.0)],
        18 => vec![(noise(0.06, 0.06, 1200.0, 500.0), 0.0)],
        19 => vec![(p(Sine, 700.0 * k, 250.0, 0.08, 0.1, 0.3), 0.0)],
        20 => vec![(Patch { decay: 0.09, volume: 0.25, ..n(Triangle, 2600.0 * k) }, 0.0), (p(Sine, 600.0, 200.0, 0.2, 0.2, 0.25), 0.05), (noise(0.1, 0.2, 4000.0, 800.0), 0.1)],
        21 => vec![(noise(0.06, 0.45, 4500.0, 900.0), 0.0), (p(Sine, 220.0, 120.0, 0.05, 0.08, 0.35), 0.0)],
        22 => vec![(Patch { attack: 0.4, decay: 0.5, volume: 0.2, cutoff: 500.0, cutoff_end: 1500.0, ..n(Noise, 1.0) }, 0.0)],
        23 => vec![(noise(0.6, 0.55, 3000.0, 200.0), 0.0), (p(Sine, 100.0, 40.0, 0.4, 0.5, 0.5), 0.0)],
        24 => vec![(Patch { attack: 0.8, decay: 1.2, volume: 0.1, cutoff: 800.0, cutoff_end: 300.0, ..n(Noise, 1.0) }, 0.0)],
        25 => vec![(Patch { attack: 0.01, decay: 0.12, volume: 0.28, ..n(Sine, 330.0 * k) }, 0.0)],
        26 => vec![(Patch { decay: 0.7, release: 0.3, volume: 0.2, ..n(Sine, 784.0 * k) }, 0.0), (Patch { decay: 0.55, volume: 0.1, ..n(Sine, 1568.0 * k) }, 0.0)],
        27 => vec![(p(Sine, 140.0, 45.0, 0.07, 0.2, 0.9), 0.0), (noise(0.02, 0.2, 2000.0, 300.0), 0.0)],
        28 => vec![(Patch { decay: 0.12, volume: 0.18, ..n(Triangle, 1318.5 * k) }, 0.0), (Patch { decay: 0.2, volume: 0.1, ..n(Sine, 2637.0) }, 0.0)],
        29 => vec![(Patch { decay: 0.1, volume: 0.15, ..n(Triangle, 988.0 * k) }, 0.0)],
        30 => vec![(Patch { freq_end: 120.0, glide: 0.1, decay: 0.12, volume: 0.15, cutoff: 800.0, cutoff_end: 300.0, ..n(Saw, 200.0 * k) }, 0.0)],
        31 => vec![(p(Sine, 340.0, 120.0, 0.25, 0.3, 0.35), 0.0), (noise(0.12, 0.2, 1800.0, 300.0), 0.0)],
        32 => vec![(Patch { decay: 0.2, volume: 0.22, ..n(Triangle, 523.0 * k) }, 0.0)],
        33 => vec![(Patch { decay: 0.3, volume: 0.25, ..n(Triangle, 1046.0 * k) }, 0.0), (Patch { decay: 0.4, volume: 0.15, ..n(Triangle, 1568.0 * k) }, 0.0)],
        34 => vec![(Patch { decay: 0.4, volume: 0.2, ..n(Sine, 1568.0 * k) }, 0.0), (Patch { decay: 0.3, volume: 0.12, ..n(Sine, 2093.0 * k) }, 0.08)],
        35 => vec![(p(Sine, 220.0, 60.0, 0.4, 0.45, 0.45), 0.0), (noise(0.2, 0.25, 1500.0, 200.0), 0.0)],
        36 => vec![(p(Sine, 600.0, 1100.0, 0.1, 0.15, 0.22), 0.0)],
        37 => vec![(p(Sine, 300.0 * k, 130.0, 0.1, 0.16, 0.45), 0.0), (noise(0.05, 0.12, 1500.0, 300.0), 0.0)],
        38 => vec![(Patch { decay: 0.04, volume: 0.3, ..n(Square, 1800.0 * k) }, 0.0)],
        39 => jingle(&[523.0, 659.0, 784.0, 1046.0, 1318.0]),
        40 => jingle(&[523.0, 659.0, 784.0]),
        41 => jingle(&[392.0, 349.0, 330.0]),
        _ => vec![],
    }
}

fn jingle(notes: &[f32]) -> Vec<(Patch, f32)> {
    notes
        .iter()
        .enumerate()
        .flat_map(|(i, f)| {
            let t = i as f32 * 0.11;
            [
                (Patch { decay: 0.35, release: 0.2, volume: 0.2, ..n(Triangle, *f) }, t),
                (Patch { decay: 0.3, volume: 0.07, ..n(Sine, *f * 2.0) }, t),
            ]
        })
        .collect()
}

/// A speaker's voice: base pitch (Hz), formant stretch, timbre (the wave) and the blip's length.
struct Speaker {
    pitch: f32,
    stretch: f32,
    wave: Wave,
    len: f32,
    click: f32,
}

fn speaker(id: u8) -> Speaker {
    match id {
        0 => Speaker { pitch: 520.0, stretch: 1.25, wave: Square, len: 0.07, click: 0.0 }, // Pip: high, rubbery
        1 => Speaker { pitch: 220.0, stretch: 1.0, wave: Triangle, len: 0.09, click: 0.5 }, // Posey: soft, wood-block attack
        2 => Speaker { pitch: 65.0, stretch: 0.7, wave: Saw, len: 0.13, click: 0.0 },       // Big Kettle: very low
        3 => Speaker { pitch: 400.0, stretch: 1.15, wave: Saw, len: 0.045, click: 0.1 },    // Bounce: fast, breathless
        4 => Speaker { pitch: 330.0, stretch: 1.4, wave: Square, len: 0.05, click: 0.3 },   // Gull: nasal, clipped
        5 => Speaker { pitch: 260.0, stretch: 1.0, wave: Saw, len: 0.08, click: 0.0 },      // Marjorie
        6 => Speaker { pitch: 170.0, stretch: 0.9, wave: Saw, len: 0.08, click: 0.0 },      // Tom
        7 => Speaker { pitch: 300.0, stretch: 1.1, wave: Triangle, len: 0.07, click: 0.0 }, // The Twins
        _ => Speaker { pitch: 240.0, stretch: 1.0, wave: Saw, len: 0.08, click: 0.0 },
    }
}

/// Formant pairs (F1, F2) for the five vowels a e i o u.
pub const FORMANTS: [(f32, f32); 5] = [(800.0, 1200.0), (500.0, 1900.0), (300.0, 2300.0), (500.0, 900.0), (350.0, 700.0)];

/// One syllable: a saw through two parallel band-pass filters, plus a tiny noise click.
pub fn syllable(speaker_id: u8, vowel: u8, pitch: f32) -> Vec<(Patch, f32)> {
    let s = speaker(speaker_id);
    let (f1, f2) = FORMANTS[(vowel % 5) as usize];
    let f0 = s.pitch * pitch.clamp(0.5, 2.0);
    let mut v = vec![(
        Patch {
            freq_end: f0 * 0.96,
            glide: s.len,
            attack: 0.008,
            decay: s.len,
            release: 0.02,
            volume: 0.5,
            f1: f1 * s.stretch,
            f2: f2 * s.stretch,
            fq: 4.0,
            ..n(s.wave, f0)
        },
        0.0,
    )];
    if s.click > 0.0 {
        v.push((noise(0.012, 0.08 * s.click, 3000.0, 900.0), 0.0));
    }
    v
}

// ---------------------------------------------------------------- songs

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Voice {
    Pluck,
    Bass,
    Pad,
    Bell,
    Kick,
    Snare,
    Clap,
    Hat,
    Brush,
    Marimba,
    Tuba,
    Brass,
    Stab,
}

pub struct Track {
    pub voice: Voice,
    pub oct: i32,
    pub vol: f32,
    /// One token per step: `-` rest, `1`-`7` a scale degree, `'` after it an octave up, `,` down;
    /// `k s c h` for drums. Loops over the song.
    pub notes: &'static str,
}

pub struct Song {
    pub bpm: f32,
    pub spb: u32,
    pub beats_per_bar: u32,
    /// Root of each bar in semitones from C.
    pub prog: &'static [i32],
    pub scale: &'static [i32],
    pub tracks: &'static [Track],
}

const MAJOR: [i32; 7] = [0, 2, 4, 5, 7, 9, 11];
const PENT: [i32; 7] = [0, 2, 4, 7, 9, 12, 14];
const MINOR: [i32; 7] = [0, 2, 3, 5, 7, 8, 10];

static LOBBY: Song = Song {
    bpm: 84.0,
    spb: 4,
    beats_per_bar: 4,
    prog: &[0, -3, 2, -5],
    scale: &MAJOR,
    tracks: &[
        Track { voice: Voice::Pluck, oct: 1, vol: 0.9, notes: "5 - - 3 - - 5 - 6 - - 5 - 3 - -  4 - - 6 - - 4 - 3 - - 1 - - - -  2 - - 4 - - 6 - 5 - - 4 - 2 - -  7,- - 2 - - 5 - 4 - - 2 - 7, - -" },
        Track { voice: Voice::Bass, oct: -2, vol: 0.8, notes: "1 - - - 5 - - - 1 - - - 5 - 3 -  1 - - - 5 - - - 1 - - - 5 - 3 -" },
        Track { voice: Voice::Brush, oct: 0, vol: 0.5, notes: "h - h h - h h - h - h h - h h h" },
        Track { voice: Voice::Pad, oct: 0, vol: 0.5, notes: "1 - - - - - - - 3 - - - - - - - " },
    ],
};

static TIDE: Song = Song {
    bpm: 58.0,
    spb: 2,
    beats_per_bar: 4,
    prog: &[0, 5, -3, 2],
    scale: &PENT,
    tracks: &[
        Track { voice: Voice::Pad, oct: 0, vol: 0.9, notes: "1 - - - - - - -  3 - - - - - - -" },
        Track { voice: Voice::Pad, oct: -1, vol: 0.6, notes: "5 - - - - - - - 1 - - - - - - -" },
        Track { voice: Voice::Bell, oct: 2, vol: 0.5, notes: "- - - - 3 - - -  - - 5 - - - - -  - - - - - - 4 -  2 - - - - - - -" },
    ],
};

static IRON: Song = Song {
    bpm: 126.0,
    spb: 2,
    beats_per_bar: 3,
    prog: &[0, 0, 5, -5, 0, 0, 7, 0],
    scale: &MAJOR,
    tracks: &[
        Track { voice: Voice::Bass, oct: -2, vol: 0.9, notes: "1 - 5 - 5 -" },
        Track { voice: Voice::Tuba, oct: -1, vol: 0.55, notes: "- - 3 - 3 -  - - 4 - 2 -" },
        Track { voice: Voice::Pluck, oct: 0, vol: 0.5, notes: "5 - - - 3 -  - - 1 - - -  6 - - - 4 -  - - 2 - - -" },
    ],
};

static STEP: Song = Song {
    bpm: 96.0,
    spb: 4,
    beats_per_bar: 4,
    prog: &[0, 0, -3, -3, 5, 5, -5, -5],
    scale: &PENT,
    tracks: &[
        Track { voice: Voice::Kick, oct: 0, vol: 1.0, notes: "k - - - k - - - k - - - k - - -" },
        Track { voice: Voice::Clap, oct: 0, vol: 0.7, notes: "- - - - c - - - - - - - c - - -" },
        Track { voice: Voice::Hat, oct: 0, vol: 0.5, notes: "- - h - - - h - - - h - - h h -" },
        Track { voice: Voice::Bass, oct: -2, vol: 0.8, notes: "1 - - 1 - - 3 - 1 - - 5 - - 3 -" },
        Track { voice: Voice::Stab, oct: 0, vol: 0.5, notes: "- - 5 - - 3 - - - - 5 - - 6 - -  - - 6 - - 5 - - - - 3 - - 2 - -" },
    ],
};

static LAGOON: Song = Song {
    bpm: 110.0,
    spb: 4,
    beats_per_bar: 4,
    prog: &[0, 5, -3, 2],
    scale: &MAJOR,
    tracks: &[
        Track { voice: Voice::Marimba, oct: 1, vol: 0.8, notes: "1 3 5 3 6 5 3 5  4 6 1' 6 5 4 3 4  2 4 6 4 7 6 4 6  5 - 3 - 1 - - -" },
        Track { voice: Voice::Bass, oct: -2, vol: 0.8, notes: "1 - - - 5 - - - 4 - - - 1 - 5 -" },
        Track { voice: Voice::Brush, oct: 0, vol: 0.4, notes: "- - h - - - h - - h - - h - h h" },
    ],
};

static BAND: Song = Song {
    bpm: 100.0,
    spb: 4,
    beats_per_bar: 4,
    prog: &[0, 0, 5, 0, -5, -5, 5, 0],
    scale: &MAJOR,
    tracks: &[
        Track { voice: Voice::Brass, oct: 0, vol: 0.55, notes: "1 - - 1 3 - 5 - 5 - - 5 4 - 3 - 4 - - 4 6 - 4 - 5 - - - 2 - 7, -" },
        Track { voice: Voice::Snare, oct: 0, vol: 0.7, notes: "s - s - s - s s s - s - s - s s" },
        Track { voice: Voice::Bass, oct: -2, vol: 0.9, notes: "1 - - - 5 - - - 1 - - - 5 - - -" },
        Track { voice: Voice::Kick, oct: 0, vol: 0.7, notes: "k - - - - - k - k - - - - - k -" },
    ],
};

/// Songs 1..=6 (`SimEvent::Music`); 0 is silence.
pub fn song(id: u8) -> Option<&'static Song> {
    Some(match id {
        1 => &LOBBY,
        2 => &TIDE,
        3 => &IRON,
        4 => &STEP,
        5 => &LAGOON,
        6 => &BAND,
        _ => return None,
    })
}

pub fn _minor() -> &'static [i32; 7] {
    &MINOR
}

fn freq(semis: i32) -> f32 {
    261.63 * 2f32.powf(semis as f32 / 12.0)
}

/// The patches a track plays for one token at `bar_root` semitones; None for a rest.
pub fn step_patches(song: &Song, tr: &Track, token: &str, bar_root: i32) -> Vec<Patch> {
    let t = token.trim();
    if t == "-" || t.is_empty() {
        return vec![];
    }
    let beat = 60.0 / song.bpm;
    match t {
        "k" => return vec![Patch { volume: 0.5 * tr.vol, ..p(Sine, 150.0, 45.0, 0.06, 0.22, 0.6) }, noise(0.015, 0.1 * tr.vol, 2000.0, 300.0)],
        "s" => return vec![Patch { volume: 0.3 * tr.vol, ..noise(0.1, 0.3, 4500.0, 1500.0) }, p(Triangle, 220.0, 150.0, 0.05, 0.08, 0.2 * tr.vol)],
        "c" => return vec![noise(0.07, 0.28 * tr.vol, 5200.0, 2000.0), Patch { attack: 0.012, ..noise(0.08, 0.2 * tr.vol, 4000.0, 1500.0) }],
        "h" => return vec![noise(0.03, 0.1 * tr.vol, 9000.0, 5000.0)],
        _ => {}
    }
    // a scale degree
    let mut chars = t.chars();
    let d = chars.next().and_then(|c| c.to_digit(10)).unwrap_or(1) as i32 - 1;
    let mut oct = tr.oct;
    for c in chars {
        match c {
            '\'' => oct += 1,
            ',' => oct -= 1,
            _ => {}
        }
    }
    let semis = song.scale[(d.rem_euclid(7)) as usize] + bar_root + 12 * oct;
    let f = freq(semis);
    let v = tr.vol;
    match tr.voice {
        Voice::Pluck => vec![Patch { decay: 0.35, volume: 0.16 * v, cutoff: 3500.0, cutoff_end: 900.0, ..n(Triangle, f) }, Patch { decay: 0.12, volume: 0.05 * v, ..n(Sine, f * 2.0) }],
        Voice::Bass => vec![Patch { decay: beat * 0.9, release: 0.05, volume: 0.28 * v, cutoff: 700.0, cutoff_end: 300.0, ..n(Triangle, f) }],
        Voice::Pad => vec![Patch { attack: beat * 1.2, decay: beat * 3.0, sustain: 0.5, hold: beat * 2.0, release: beat * 1.5, volume: 0.07 * v, cutoff: 900.0, cutoff_end: 500.0, lfo_hz: 0.3, lfo_depth: 0.5, ..n(Saw, f) }, Patch { attack: beat * 1.2, decay: beat * 3.0, sustain: 0.5, hold: beat * 2.0, release: beat * 1.5, volume: 0.06 * v, cutoff: 900.0, cutoff_end: 500.0, lfo_hz: 0.21, lfo_depth: 0.5, ..n(Saw, f * 1.005) }],
        Voice::Bell => vec![Patch { decay: 1.2, release: 0.4, volume: 0.12 * v, ..n(Sine, f) }, Patch { decay: 0.7, volume: 0.05 * v, ..n(Sine, f * 2.76) }],
        Voice::Marimba => vec![Patch { decay: 0.22, volume: 0.2 * v, ..n(Triangle, f) }, Patch { decay: 0.06, volume: 0.1 * v, ..n(Sine, f * 4.0) }],
        Voice::Tuba => vec![Patch { attack: 0.02, decay: beat * 0.8, volume: 0.13 * v, duty: 0.25, cutoff: 900.0, cutoff_end: 500.0, ..n(Square, f) }],
        Voice::Brass => vec![Patch { attack: 0.02, decay: beat * 0.7, sustain: 0.4, release: 0.08, volume: 0.1 * v, cutoff: 1800.0, cutoff_end: 1200.0, ..n(Saw, f) }],
        Voice::Stab => vec![Patch { decay: 0.12, volume: 0.1 * v, duty: 0.3, cutoff: 2500.0, cutoff_end: 800.0, ..n(Square, f) }],
        _ => vec![],
    }
}
