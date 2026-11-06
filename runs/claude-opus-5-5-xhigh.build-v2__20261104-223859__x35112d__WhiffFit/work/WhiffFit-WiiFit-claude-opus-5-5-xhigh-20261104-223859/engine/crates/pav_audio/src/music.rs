//! The sequencer: runs inside `Mixer::render`, so timing is sample-accurate. A song is a tempo,
//! steps per beat, a chord progression, and tracks of a patch plus a pattern written by hand as
//! scale degrees. New song: add a function below and a line in `song`.

use crate::{Patch, Wave};

/// One part of a song, looped.
pub struct Track {
    pub patch: Patch,
    pub gain: f32,
    /// One entry per step: scale degree (1-based, 8 = an octave up), 0 for a rest.
    pub steps: Vec<i8>,
    /// Octave offset, in semitones.
    pub transpose: i32,
    /// Follows the chord root; drums and drones don't.
    pub follow: bool,
    /// Note length in steps.
    pub len: f32,
}

pub struct Song {
    pub bpm: f32,
    pub steps_per_beat: u32,
    pub beats_per_bar: u32,
    /// Root note of the key, as a MIDI number.
    pub root: i32,
    /// Semitones above the root, per scale degree.
    pub scale: &'static [i32],
    /// Semitones the chord root sits above the key's, per bar.
    pub chords: &'static [i32],
    pub tracks: Vec<Track>,
}

const MAJOR: &[i32] = &[0, 2, 4, 5, 7, 9, 11];
const PENTA: &[i32] = &[0, 2, 4, 7, 9];
const DORIAN: &[i32] = &[0, 2, 3, 5, 7, 9, 10];

fn pat(text: &str) -> Vec<i8> {
    text.chars()
        .filter(|c| !c.is_whitespace() && *c != '|')
        .map(|c| match c {
            '.' => 0,
            '1'..='9' => c as i8 - b'0' as i8,
            'x' => 1,
            _ => 0,
        })
        .collect()
}

/// A plucked nylon-like string.
fn pluck(vol: f32) -> Patch {
    Patch { attack: 0.003, decay: 0.32, volume: vol, cutoff: 2800.0, cutoff_end: 900.0, ..Patch::new(Wave::Triangle, 220.0) }
}
fn bass(vol: f32) -> Patch {
    Patch { attack: 0.004, decay: 0.22, sustain: 0.3, hold: 0.05, release: 0.08, volume: vol, cutoff: 700.0, cutoff_end: 400.0, ..Patch::new(Wave::Sine, 110.0) }
}
fn brush(vol: f32) -> Patch {
    Patch { attack: 0.002, decay: 0.06, volume: vol, cutoff: 9000.0, cutoff_end: 5000.0, ..Patch::new(Wave::Noise, 1.0) }
}
fn kick(vol: f32) -> Patch {
    Patch { freq_end: 46.0, glide: 0.09, attack: 0.001, decay: 0.16, volume: vol, cutoff: 2000.0, cutoff_end: 500.0, ..Patch::new(Wave::Sine, 150.0) }
}
fn clap(vol: f32) -> Patch {
    Patch { attack: 0.001, decay: 0.09, volume: vol, cutoff: 5200.0, cutoff_end: 2200.0, ..Patch::new(Wave::Noise, 1.0) }
}
fn snare(vol: f32) -> Patch {
    Patch { attack: 0.001, decay: 0.07, volume: vol, cutoff: 6800.0, cutoff_end: 3000.0, ..Patch::new(Wave::Noise, 1.0) }
}
fn pad(vol: f32) -> Patch {
    Patch {
        attack: 1.4,
        decay: 0.6,
        sustain: 0.8,
        hold: 1.6,
        release: 1.8,
        volume: vol,
        cutoff: 700.0,
        cutoff_end: 500.0,
        lfo_rate: 0.17,
        lfo_depth: 0.5,
        ..Patch::new(Wave::Saw, 220.0)
    }
}
fn bell(vol: f32) -> Patch {
    Patch { attack: 0.002, decay: 1.4, volume: vol, ..Patch::new(Wave::Sine, 880.0) }
}
fn mallet(vol: f32) -> Patch {
    Patch { attack: 0.002, decay: 0.2, volume: vol, cutoff: 4200.0, cutoff_end: 1200.0, ..Patch::new(Wave::Triangle, 440.0) }
}
fn tuba(vol: f32) -> Patch {
    Patch { attack: 0.03, decay: 0.2, sustain: 0.6, hold: 0.1, release: 0.1, volume: vol, cutoff: 800.0, cutoff_end: 500.0, duty: 0.4, ..Patch::new(Wave::Square, 110.0) }
}
fn brass(vol: f32) -> Patch {
    Patch { attack: 0.03, decay: 0.12, sustain: 0.7, hold: 0.1, release: 0.08, volume: vol, cutoff: 1800.0, cutoff_end: 1200.0, ..Patch::new(Wave::Saw, 220.0) }
}
fn stab(vol: f32) -> Patch {
    Patch { attack: 0.004, decay: 0.12, volume: vol, cutoff: 2600.0, cutoff_end: 900.0, duty: 0.3, ..Patch::new(Wave::Square, 330.0) }
}

/// Song `n`, or none.
pub fn song(n: u8) -> Option<Song> {
    match n {
        1 => Some(lobby_bossa()),
        2 => Some(tide_pad()),
        3 => Some(iron_waltz()),
        4 => Some(step_party()),
        5 => Some(lagoon_mallets()),
        6 => Some(band_of_guests()),
        _ => None,
    }
}

pub const SONG_COUNT: u8 = 6;

fn tr(patch: Patch, gain: f32, steps: &str, transpose: i32, follow: bool, len: f32) -> Track {
    Track { patch, gain, steps: pat(steps), transpose, follow, len }
}

/// Resort lounge, not gym.
fn lobby_bossa() -> Song {
    Song {
        bpm: 84.0,
        steps_per_beat: 2,
        beats_per_bar: 4,
        root: 55,
        scale: MAJOR,
        chords: &[0, 0, 5, 5, 2, 7, 0, 0],
        tracks: vec![
            tr(pluck(0.34), 1.0, "1.35 .3.5 1.35 .3.5", 0, true, 1.0),
            tr(bass(0.5), 1.0, "1..5 ..5. 1..5 ..3.", -12, true, 1.4),
            tr(brush(0.05), 1.0, "x.xx x.xx x.xx x.xx", 0, false, 1.0),
            tr(pluck(0.3), 1.0, "........ 5.6.8... ........ 8.6.5.3. ........ 3.5.6... ........ 5.3.1... ", 12, false, 2.0),
        ],
    }
}

/// Slow pads and sparse bells, no beat.
fn tide_pad() -> Song {
    Song {
        bpm: 50.0,
        steps_per_beat: 1,
        beats_per_bar: 4,
        root: 50,
        scale: PENTA,
        chords: &[0, 0, -2, -2, 3, 3, 5, 5],
        tracks: vec![
            tr(pad(0.2), 1.0, "1...", 0, true, 4.0),
            tr(pad(0.14), 1.0, "3...", 12, true, 4.0),
            tr(pad(0.12), 1.0, "4...", 0, true, 4.0),
            tr(bell(0.17), 1.0, ".... ..5. .... .... ...3 .... .... .4.. .... 2... .... ....", 24, false, 2.0),
        ],
    }
}

/// 3/4, low pizzicato bass, a dignified tuba-like square.
fn iron_waltz() -> Song {
    Song {
        bpm: 108.0,
        steps_per_beat: 1,
        beats_per_bar: 3,
        root: 43,
        scale: MAJOR,
        chords: &[0, 5, 7, 0, 0, 9, 2, 7],
        tracks: vec![
            tr(pluck(0.48), 1.0, "1..", -12, true, 0.8),
            tr(mallet(0.14), 1.0, ".35", 12, true, 0.6),
            tr(tuba(0.2), 1.0, "...... 3.2 1.. ...... 5.6 5.. ...... 8.7 6.5 ...... 3.2 1..", 0, false, 1.3),
        ],
    }
}

/// 96 BPM funk-pop, clear kick and clap for timing.
fn step_party() -> Song {
    Song {
        bpm: 96.0,
        steps_per_beat: 4,
        beats_per_bar: 4,
        root: 45,
        scale: DORIAN,
        chords: &[0, 0, 3, 5],
        tracks: vec![
            tr(kick(0.75), 1.0, "x... x... x... x...", 0, false, 1.0),
            tr(clap(0.32), 1.0, ".... x... .... x...", 0, false, 1.0),
            tr(brush(0.09), 1.0, "..x. ..x. ..x. ..x.", 0, false, 1.0),
            tr(bass(0.46), 1.0, "1.1. ..1. 7.1. ..5.", -12, true, 1.5),
            tr(stab(0.17), 1.0, "..5. .5.. ..3. .5.. ..5. .5.. ..6. .7..", 12, true, 1.0),
            tr(stab(0.13), 1.0, "................ ................ 1.3.5.8.. .8.5.3. ................ ", 24, false, 1.0),
        ],
    }
}

/// 110 BPM marimba-like triangle, playful.
fn lagoon_mallets() -> Song {
    Song {
        bpm: 110.0,
        steps_per_beat: 2,
        beats_per_bar: 4,
        root: 60,
        scale: MAJOR,
        chords: &[0, 5, 7, 5, 0, 9, 5, 7],
        tracks: vec![
            tr(mallet(0.34), 1.0, "1358 5315 1358 6531", 0, true, 0.9),
            tr(mallet(0.2), 1.0, "..8. .6.. 5..3 ..5.", 12, false, 0.9),
            tr(bass(0.4), 1.0, "1..1 .5.. 1..1 .5..", -24, true, 1.2),
            tr(brush(0.05), 1.0, ".x.x .x.x .x.x .x.x", 0, false, 1.0),
        ],
    }
}

/// Marching brass and snare; the game fades it to silence for the last phase.
fn band_of_guests() -> Song {
    Song {
        bpm: 96.0,
        steps_per_beat: 2,
        beats_per_bar: 4,
        root: 46,
        scale: MAJOR,
        chords: &[0, 0, 7, 0, 5, 0, 7, 0],
        tracks: vec![
            tr(snare(0.2), 1.0, "x.xx x.xx x.xx xxxx", 0, false, 1.0),
            tr(kick(0.42), 1.0, "x... x... x... x...", 0, false, 1.0),
            tr(tuba(0.3), 1.0, "1.5. 1.5. 1.5. 1.5.", -12, true, 1.0),
            tr(brass(0.17), 1.0, "5.5. 5.65 8.8. 8.75 6.6. 6.75 5... ....", 12, false, 1.4),
            tr(brass(0.12), 1.0, "3.3. 3.43 5.5. 5.53 4.4. 4.53 3... ....", 12, false, 1.4),
        ],
    }
}

/// A running song.
pub struct Sequencer {
    pub song: Song,
    pub song_id: u8,
    step: u64,
    /// Samples into the song.
    pub samples: u64,
    next_step_at: f64,
    pub steps_per_sample: f64,
}

impl Sequencer {
    pub fn new(song: Song, id: u8, rate: f32) -> Self {
        let steps_per_second = song.bpm as f64 / 60.0 * song.steps_per_beat as f64;
        Self { song, song_id: id, step: 0, samples: 0, next_step_at: 0.0, steps_per_sample: steps_per_second / rate as f64 }
    }

    /// One sample's worth of time: the notes that start now, as (patch, gain).
    pub fn advance(&mut self, out: &mut Vec<(Patch, f32)>) {
        let at = self.samples as f64 * self.steps_per_sample;
        self.samples += 1;
        if at < self.next_step_at {
            return;
        }
        self.next_step_at += 1.0;
        let s = self.step;
        self.step += 1;
        let song = &self.song;
        let per_bar = (song.steps_per_beat * song.beats_per_bar) as u64;
        let bar = s / per_bar;
        let chord = song.chords[bar as usize % song.chords.len().max(1)];
        let step_secs = 60.0 / song.bpm / song.steps_per_beat as f32;
        for t in &song.tracks {
            if t.steps.is_empty() {
                continue;
            }
            let d = t.steps[(s % t.steps.len() as u64) as usize];
            if d <= 0 {
                continue;
            }
            let mut p = t.patch;
            if p.wave != Wave::Noise {
                let n = song.scale.len() as i32;
                let deg = d as i32 - 1;
                let semis = song.scale[(deg % n) as usize] + 12 * (deg / n);
                let midi = song.root + t.transpose + semis + if t.follow { chord } else { 0 };
                let f = 440.0 * 2f32.powf((midi as f32 - 69.0) / 12.0);
                let k = p.freq_end / p.freq.max(1.0);
                // A pitched drum keeps its own glide; everything else plays the note.
                if p.glide == 0.1 || (k - 1.0).abs() < 1e-3 {
                    p.freq = f;
                    p.freq_end = f;
                }
            }
            if t.len > 1.2 && p.hold == 0.0 && p.sustain == 0.0 {
                p.decay = p.decay.max(t.len * step_secs);
            }
            out.push((p, t.gain));
        }
    }
}
