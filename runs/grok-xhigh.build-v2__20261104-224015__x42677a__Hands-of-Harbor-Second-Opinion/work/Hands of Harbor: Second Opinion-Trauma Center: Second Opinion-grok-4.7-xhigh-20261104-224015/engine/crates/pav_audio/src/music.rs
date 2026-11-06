//! Looping beds. Every track is oscillators on the music bus. No samples.

use super::{Mixer, Patch, Wave, BUS_MUSIC};

pub const TRACKS: &[&str] = &[
    "title",
    "story_ward",
    "story_night",
    "or",
    "crisis",
    "introit",
    "lacrimosa",
    "dies",
    "libera",
    "hush",
    "results",
    "code",
];

pub struct Note {
    pub patch: Patch,
    pub pan: f32,
    pub gain: f32,
    pub delay: f32,
}

/// Two bars of a bed, and how long they last. The product schedules this on the music bus.
pub fn phrase(name: &str, bpm: f32) -> (f32, Vec<Note>) {
    let (steps, scale, lead, bass_hz) = recipe(name);
    let beat = 60.0 / bpm.max(40.0);
    let step = beat * if steps >= 6 { 0.5 } else { 1.0 };
    let count = steps * 2;
    let mut notes = Vec::new();
    for i in 0..count {
        let t = i as f32 * step;
        let degree = scale[i % scale.len()];
        let freq = 220.0 * 2.0_f32.powf(degree as f32 / 12.0);
        let accent = if i % steps == 0 { 1.0 } else { 0.55 };
        notes.push(Note {
            patch: Patch {
                attack: 0.01,
                decay: step * 0.7,
                sustain: 0.2,
                volume: 0.55 * accent,
                cutoff: 1800.0,
                cutoff_end: 900.0,
                ..Patch::new(lead, freq)
            },
            pan: 0.15,
            gain: 1.0,
            delay: t,
        });
        if i % steps == 0 {
            notes.push(Note {
                patch: Patch {
                    attack: 0.005,
                    decay: step * steps as f32 * 0.8,
                    volume: 0.7,
                    ..Patch::new(Wave::Sine, bass_hz)
                },
                pan: -0.2,
                gain: 1.0,
                delay: t,
            });
        }
    }
    (count as f32 * step, notes)
}

/// Offline stereo render. `seconds` is how long to hear the bed; `bpm` sets the pulse.
pub fn render_track(name: &str, seconds: f32, bpm: f32) -> Vec<f32> {
    let sr = 22050.0;
    let mut mixer = Mixer::new(sr);
    let (_dur, notes) = phrase(name, bpm);
    for n in notes {
        if n.delay > seconds {
            continue;
        }
        mixer.play_on(n.patch, n.pan, n.gain, n.delay, BUS_MUSIC);
    }
    let frames = (seconds.max(0.05) * sr) as usize;
    let mut out = vec![0.0; frames * 2];
    mixer.render(&mut out);
    out
}

fn recipe(name: &str) -> (usize, &'static [i8], Wave, f32) {
    match name {
        "title" => (4, &[0, 3, 7, 10, 7, 3], Wave::Triangle, 110.0),
        "story_ward" => (4, &[0, 5, 7, 12, 7, 5], Wave::Sine, 98.0),
        "story_night" => (3, &[0, 3, 8, 7, 3, -2], Wave::Triangle, 82.0),
        "or" => (4, &[0, 7, 12, 7], Wave::Square, 130.0),
        "crisis" => (4, &[0, 1, 6, 7, 1, 0], Wave::Saw, 146.0),
        "introit" => (3, &[0, 4, 7, 11, 7, 4], Wave::Square, 123.0),
        "lacrimosa" => (6, &[0, 3, 5, 7, 10, 7], Wave::Sine, 92.0),
        "dies" => (5, &[0, 1, 6, 7, 13], Wave::Saw, 155.0),
        "libera" => (7, &[0, 2, 3, 7, 8, 10, 12], Wave::Square, 138.0),
        "hush" => (4, &[0, 5, 7, 12], Wave::Sine, 73.0),
        "results" => (4, &[0, 4, 7, 12, 16, 12], Wave::Triangle, 164.0),
        "code" => (4, &[0, 0, 1, 0, 6, 1], Wave::Square, 196.0),
        _ => (4, &[0, 7, 12, 7], Wave::Sine, 110.0),
    }
}
