//! The sequencer: original songs written by hand as patterns over chord progressions. It runs inside
//! `Mixer::render`, so timing is sample-accurate and the rhythm clock is the music's own.

use crate::{Patch, Wave};

/// One line of a song. `steps` holds semitones above the bar's chord root; `R` is a rest.
#[derive(Clone, Copy)]
pub struct Track {
    pub patch: Patch,
    pub steps: &'static [i16],
    /// Semitone offset of the whole track.
    pub base: i16,
    /// Pitched by the chord (false: drums keep their own patch pitch).
    pub tuned: bool,
    pub pan: f32,
    /// Bars the pattern spans before repeating (the step list is divided among them).
    pub bars: u32,
}

pub const R: i16 = 999;

#[derive(Clone, Copy)]
pub struct Song {
    pub bpm: f32,
    pub steps_per_beat: u32,
    pub beats_per_bar: u32,
    /// The chord roots, one per bar, in semitones above A (220 Hz).
    pub chords: &'static [i16],
    pub tracks: &'static [Track],
}

const fn pluck(vol: f32) -> Patch {
    Patch { attack: 0.003, decay: 0.28, sustain: 0.0, hold: 0.0, release: 0.08, volume: vol, cutoff: 2600.0, cutoff_end: 700.0, ..Patch::new(Wave::Triangle, 220.0) }
}
const fn bass(vol: f32) -> Patch {
    Patch { attack: 0.004, decay: 0.2, sustain: 0.5, hold: 0.08, release: 0.1, volume: vol, cutoff: 900.0, cutoff_end: 400.0, ..Patch::new(Wave::Triangle, 110.0) }
}
const fn brush(vol: f32) -> Patch {
    Patch { attack: 0.01, decay: 0.07, release: 0.03, volume: vol, cutoff: 8000.0, cutoff_end: 5000.0, ..Patch::new(Wave::Noise, 1.0) }
}
const fn kick(vol: f32) -> Patch {
    Patch { freq_end: 46.0, glide: 0.07, attack: 0.001, decay: 0.16, release: 0.02, volume: vol, ..Patch::new(Wave::Sine, 130.0) }
}
const fn clap(vol: f32) -> Patch {
    Patch { attack: 0.002, decay: 0.09, release: 0.04, volume: vol, cutoff: 5200.0, cutoff_end: 1800.0, ..Patch::new(Wave::Noise, 1.0) }
}
const fn pad(vol: f32) -> Patch {
    Patch { attack: 1.1, decay: 0.8, sustain: 0.7, hold: 2.4, release: 1.6, volume: vol, cutoff: 500.0, cutoff_end: 1200.0, lfo: 0.22, ..Patch::new(Wave::Saw, 220.0) }
}
const fn bell(vol: f32) -> Patch {
    Patch { attack: 0.002, decay: 1.2, release: 0.5, volume: vol, ..Patch::new(Wave::Sine, 880.0) }
}
const fn tuba(vol: f32) -> Patch {
    Patch { attack: 0.03, decay: 0.2, sustain: 0.6, hold: 0.22, release: 0.12, volume: vol, cutoff: 700.0, cutoff_end: 420.0, duty: 0.4, ..Patch::new(Wave::Square, 110.0) }
}
const fn pizz(vol: f32) -> Patch {
    Patch { attack: 0.002, decay: 0.2, release: 0.06, volume: vol, cutoff: 1100.0, cutoff_end: 300.0, ..Patch::new(Wave::Triangle, 110.0) }
}
const fn stab(vol: f32) -> Patch {
    Patch { attack: 0.004, decay: 0.12, sustain: 0.0, release: 0.05, volume: vol, cutoff: 2800.0, cutoff_end: 900.0, duty: 0.3, ..Patch::new(Wave::Square, 220.0) }
}
const fn marimba(vol: f32) -> Patch {
    Patch { attack: 0.001, decay: 0.2, release: 0.05, volume: vol, cutoff: 3500.0, cutoff_end: 1200.0, ..Patch::new(Wave::Triangle, 440.0) }
}
const fn brass(vol: f32) -> Patch {
    Patch { attack: 0.05, decay: 0.15, sustain: 0.7, hold: 0.3, release: 0.15, volume: vol, cutoff: 1700.0, cutoff_end: 1100.0, ..Patch::new(Wave::Saw, 220.0) }
}
const fn snare(vol: f32) -> Patch {
    Patch { attack: 0.001, decay: 0.08, release: 0.03, volume: vol, cutoff: 6500.0, cutoff_end: 2800.0, ..Patch::new(Wave::Noise, 1.0) }
}

/// A shorthand for a track.
const fn t(patch: Patch, steps: &'static [i16], base: i16, tuned: bool, pan: f32, bars: u32) -> Track {
    Track { patch, steps, base, tuned, pan, bars }
}

// 1 Lobby Bossa: resort lounge, not gym. Nylon-like plucks, brushes, a walking bass.
const BOSSA: Song = Song {
    bpm: 84.0,
    steps_per_beat: 2,
    beats_per_bar: 4,
    chords: &[0, 5, -2, 3, 0, 5, 7, -5],
    tracks: &[
        t(bass(0.5), &[0, R, 7, R, 12, R, 7, R], -12, true, 0.0, 1),
        t(pluck(0.24), &[R, 10, R, R, 3, R, 7, R, R, 10, R, 3, R, R, 7, R], 12, true, -0.3, 2),
        t(pluck(0.2), &[R, 3, R, R, 7, R, 10, R, R, 7, R, 10, R, R, 14, R], 12, true, 0.3, 2),
        t(pluck(0.26), &[12, R, 10, 7, R, 3, R, 5, R, R, 7, R, R, R, 3, R, 0, R, 3, 5, R, 7, R, 10, R, R, 12, R, R, R, R, R], 24, true, 0.15, 4),
        t(brush(0.11), &[0, 0, 0, R, 0, 0, 0, 0], 0, false, -0.2, 1),
    ],
};
// 2 Tide Pad: slow pads and sparse bells, no beat.
const TIDEPAD: Song = Song {
    bpm: 52.0,
    steps_per_beat: 1,
    beats_per_bar: 4,
    chords: &[0, -4, -7, -2],
    tracks: &[
        t(pad(0.14), &[0, R, R, R], 0, true, -0.3, 1),
        t(pad(0.12), &[7, R, R, R], 0, true, 0.3, 1),
        t(pad(0.1), &[15, R, R, R], 0, true, 0.0, 1),
        t(bell(0.13), &[R, R, 12, R, R, 19, R, R, R, R, 24, R, R, 15, R, R], 12, true, 0.4, 4),
        t(bell(0.09), &[R, R, R, R, 7, R, R, R, R, R, R, 19, R, R, R, R, R, 12, R, R, R, R, R, R], 24, true, -0.4, 6),
    ],
};
// 3 Iron Waltz: 3/4, low pizzicato bass and a dignified tuba.
const WALTZ: Song = Song {
    bpm: 108.0,
    steps_per_beat: 1,
    beats_per_bar: 3,
    chords: &[0, 0, 5, 0, 7, 7, 0, 0],
    tracks: &[
        t(pizz(0.5), &[0, R, R], -12, true, 0.0, 1),
        t(pluck(0.14), &[R, 7, 7], 0, true, -0.25, 1),
        t(pluck(0.12), &[R, 15, 15], 0, true, 0.25, 1),
        t(tuba(0.34), &[12, 14, 15, 19, R, 15, 14, R, 12, 15, 14, 12, 7, R, R, 12, 14, 15, 19, 22, 24, 19, R, 15, 14, R, 12, 12, R, R], -12, true, 0.0, 10),
    ],
};
// 4 Step Party: 96 BPM funk-pop, clear kick and clap for timing.
const PARTY: Song = Song {
    bpm: 96.0,
    steps_per_beat: 4,
    beats_per_bar: 4,
    chords: &[0, 0, 5, 7],
    tracks: &[
        t(kick(0.62), &[0, R, R, R, 0, R, R, R, 0, R, R, R, 0, R, R, R], 0, false, 0.0, 1),
        t(clap(0.34), &[R, R, R, R, 0, R, R, R, R, R, R, R, 0, R, R, R], 0, false, 0.05, 1),
        t(brush(0.12), &[R, R, 0, R, R, R, 0, R, R, R, 0, R, R, R, 0, 0], 0, false, -0.2, 1),
        t(bass(0.46), &[0, R, R, 0, R, R, 12, R, R, 0, R, R, 10, R, 7, R], -12, true, 0.0, 1),
        t(stab(0.14), &[R, R, 15, R, R, 15, R, R, R, R, 19, R, R, 15, R, R], 12, true, 0.3, 1),
        t(stab(0.14), &[R, R, 7, R, R, 7, R, R, R, R, 10, R, R, 7, R, R], 12, true, -0.3, 1),
        t(marimba(0.2), &[R, R, R, R, R, R, R, R, 24, R, 22, R, 19, R, 15, R, R, R, R, R, R, R, R, R, 12, R, 15, R, 19, R, 22, R], 12, true, 0.1, 2),
    ],
};
// 5 Lagoon Mallets: 110 BPM, marimba-like and playful.
const LAGOON: Song = Song {
    bpm: 110.0,
    steps_per_beat: 2,
    beats_per_bar: 4,
    chords: &[0, 3, 5, 3],
    tracks: &[
        t(marimba(0.3), &[0, 7, 12, 7, 15, 12, 7, 12, 0, 7, 12, 15, 19, 15, 12, 7], 12, true, -0.2, 2),
        t(marimba(0.22), &[R, R, 24, R, R, 22, R, 19, R, R, 24, 27, R, 24, R, R], 24, true, 0.3, 2),
        t(bass(0.4), &[0, R, R, 7, R, R, 5, R], -12, true, 0.0, 1),
        t(brush(0.08), &[0, R, 0, 0, 0, R, 0, 0], 0, false, 0.2, 1),
    ],
};
// 6 Band of Guests: marching brass and snare.
const BAND: Song = Song {
    bpm: 96.0,
    steps_per_beat: 4,
    beats_per_bar: 4,
    chords: &[0, 5, 7, 0],
    tracks: &[
        t(snare(0.2), &[0, R, 0, 0, 0, R, 0, R, 0, R, 0, 0, 0, 0, 0, R], 0, false, -0.15, 1),
        t(kick(0.5), &[0, R, R, R, R, R, R, R, 0, R, R, R, R, R, R, R], 0, false, 0.0, 1),
        t(tuba(0.32), &[0, R, R, R, 7, R, R, R, 0, R, R, R, 7, R, R, R], -12, true, 0.0, 1),
        t(brass(0.16), &[R, R, R, R, 12, R, 15, R, R, R, R, R, 19, R, 15, R], 0, true, 0.3, 1),
        t(brass(0.13), &[R, R, R, R, 7, R, 12, R, R, R, R, R, 15, R, 12, R], 0, true, -0.3, 1),
        t(brass(0.2), &[12, R, R, 12, 15, R, R, 19, 24, R, R, R, 22, R, 19, R, 19, R, R, 15, 12, R, R, 15, 19, R, R, R, R, R, R, R], 12, true, 0.1, 2),
    ],
};

/// The song for a number. 0 and unknowns: silence. Song 7, the stingers, are one-shot sounds.
pub fn song(id: u8) -> Option<Song> {
    match id {
        1 => Some(BOSSA),
        2 => Some(TIDEPAD),
        3 => Some(WALTZ),
        4 => Some(PARTY),
        5 => Some(LAGOON),
        6 => Some(BAND),
        _ => None,
    }
}

pub const SONG_IDS: [u8; 6] = [1, 2, 3, 4, 5, 6];

/// The sequencer's place in a song.
#[derive(Clone, Copy)]
pub struct Sequencer {
    pub song: Song,
    pub step: u64,
    /// Samples into the song.
    pub at: u64,
    pub next_at: f64,
}

impl Sequencer {
    pub fn new(song: Song) -> Self {
        Self { song, step: 0, at: 0, next_at: 0.0 }
    }

    /// Advances one sample; calls `play` for each note due.
    pub fn tick(&mut self, rate: f32, mut play: impl FnMut(Patch, f32)) {
        if self.at as f64 >= self.next_at {
            let s = &self.song;
            let per_step = 60.0 / (s.bpm as f64 * s.steps_per_beat as f64) * rate as f64;
            let steps_per_bar = (s.steps_per_beat * s.beats_per_bar) as u64;
            let bar = (self.step / steps_per_bar) as usize;
            let root = s.chords[bar % s.chords.len()];
            for tr in s.tracks {
                let span = steps_per_bar * tr.bars as u64;
                let n = tr.steps.len() as u64;
                // A pattern is spread evenly over its bars.
                let pos = self.step % span;
                if pos * n % span != 0 {
                    continue;
                }
                let v = tr.steps[((pos * n / span) % n) as usize];
                if v == R {
                    continue;
                }
                let mut p = tr.patch;
                if tr.tuned {
                    let f = 220.0 * 2f32.powf((root + tr.base + v) as f32 / 12.0);
                    p.freq = f;
                    p.freq_end = f;
                }
                p.bus = 1;
                play(p, tr.pan);
            }
            self.step += 1;
            self.next_at += per_step;
        }
        self.at += 1;
    }
}
