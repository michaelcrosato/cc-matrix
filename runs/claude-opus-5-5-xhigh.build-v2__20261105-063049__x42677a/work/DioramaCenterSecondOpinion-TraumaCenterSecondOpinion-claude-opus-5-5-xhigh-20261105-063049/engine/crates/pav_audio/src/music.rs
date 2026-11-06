//! A small note-event sequencer: it runs on the render thread and schedules ahead with `play`'s
//! delay, so tempo can follow the heart. Composed in code: title theme, two story beds, the OR loop
//! whose bass lands on the actual heartbeat, a crisis layer, a motif per strain in its own meter,
//! the Hush, the results fanfare, Code Blue's drive.

use crate::{Patch, Wave};

/// What the game wants from the music this frame.
#[derive(Clone, Debug, Default)]
pub struct MusicInput {
    pub track: String,
    pub bpm: f32,
    /// Heart position: beats so far plus the phase.
    pub heart: f64,
    pub crisis: f32,
    pub hush: f32,
    pub motif: u8,
    pub flat: bool,
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum Inst {
    Piano,
    Bass,
    Pad,
    Pluck,
    Strings,
    Bell,
    Kick,
    Hat,
    Brass,
    Lead,
}

fn hz(midi: f32) -> f32 {
    440.0 * 2f32.powf((midi - 69.0) / 12.0)
}

/// A note as patches: (patch, pan, gain).
fn note(inst: Inst, midi: f32, secs: f32, vel: f32, out: &mut Vec<(Patch, f32, f32)>) {
    let f = hz(midi);
    match inst {
        Inst::Piano => {
            out.push((
                Patch {
                    attack: 0.004,
                    decay: 0.5 + secs * 0.6,
                    sustain: 0.0,
                    volume: 0.36,
                    cutoff: 3200.0,
                    cutoff_end: 900.0,
                    ..Patch::new(Wave::Triangle, f)
                },
                -0.1,
                vel,
            ));
            out.push((Patch { attack: 0.003, decay: 0.22, volume: 0.12, ..Patch::new(Wave::Sine, f * 2.0) }, 0.05, vel));
            out.push((
                Patch { attack: 0.002, decay: 0.08, volume: 0.05, cutoff: 5000.0, ..Patch::new(Wave::Square, f * 3.0) },
                0.0,
                vel,
            ));
        }
        Inst::Bass => {
            out.push((
                Patch { attack: 0.008, decay: secs.max(0.12), sustain: 0.0, volume: 0.6, ..Patch::new(Wave::Sine, f) },
                0.0,
                vel,
            ));
            out.push((
                Patch {
                    attack: 0.006,
                    decay: secs.max(0.1) * 0.7,
                    volume: 0.22,
                    cutoff: 700.0,
                    cutoff_end: 260.0,
                    ..Patch::new(Wave::Saw, f)
                },
                0.0,
                vel,
            ));
        }
        Inst::Pad => {
            let rel = (secs * 0.4).clamp(0.3, 1.6);
            for (d, pan) in [(0.997, -0.5), (1.003, 0.5)] {
                out.push((
                    Patch {
                        attack: (secs * 0.3).clamp(0.08, 1.2),
                        decay: 0.2,
                        sustain: 0.8,
                        hold: secs * 0.6,
                        release: rel,
                        volume: 0.13,
                        cutoff: 1100.0,
                        cutoff_end: 800.0,
                        vibrato: (6.0, 4.3),
                        ..Patch::new(Wave::Saw, f * d)
                    },
                    pan,
                    vel,
                ));
            }
        }
        Inst::Strings => {
            for (d, pan) in [(0.996, -0.3), (1.004, 0.3)] {
                out.push((
                    Patch {
                        attack: 0.03,
                        decay: 0.05,
                        sustain: 0.9,
                        hold: secs * 0.8,
                        release: 0.08,
                        volume: 0.1,
                        cutoff: 2600.0,
                        vibrato: (12.0, 5.6),
                        ..Patch::new(Wave::Saw, f * d)
                    },
                    pan,
                    vel,
                ));
            }
        }
        Inst::Pluck => out.push((
            Patch {
                attack: 0.002,
                decay: 0.16,
                volume: 0.22,
                duty: 0.3,
                cutoff: 3200.0,
                cutoff_end: 700.0,
                ..Patch::new(Wave::Square, f)
            },
            0.25,
            vel,
        )),
        Inst::Bell => out.push((Patch { attack: 0.002, decay: 0.9, volume: 0.22, ..Patch::new(Wave::Sine, f) }, -0.2, vel)),
        Inst::Kick => {
            out.push((Patch { freq_end: 42.0, glide: 0.09, decay: 0.14, volume: 0.7, ..Patch::new(Wave::Sine, 130.0) }, 0.0, vel))
        }
        Inst::Hat => out.push((
            Patch { decay: 0.035, volume: 0.1, cutoff: 12000.0, cutoff_end: 7000.0, ..Patch::new(Wave::Noise, 1.0) },
            0.3,
            vel,
        )),
        Inst::Brass => {
            for d in [0.998, 1.002] {
                out.push((
                    Patch {
                        attack: 0.03,
                        decay: 0.15,
                        sustain: 0.7,
                        hold: secs * 0.7,
                        release: 0.12,
                        volume: 0.17,
                        cutoff: 800.0,
                        cutoff_end: 2600.0,
                        ..Patch::new(Wave::Saw, f * d)
                    },
                    0.0,
                    vel,
                ));
            }
        }
        Inst::Lead => out.push((
            Patch {
                attack: 0.02,
                decay: 0.2,
                sustain: 0.6,
                hold: secs * 0.7,
                release: 0.16,
                volume: 0.17,
                cutoff: 2400.0,
                vibrato: (10.0, 5.0),
                ..Patch::new(Wave::Triangle, f)
            },
            0.15,
            vel,
        )),
    }
}

/// A melody, written as (step, midi, steps long), on a grid of `len` steps.
struct Line {
    inst: Inst,
    len: u32,
    notes: &'static [(u32, f32, f32)],
    vel: f32,
}

// A minor. A tune you could hum: the title theme, in 16 bars of 8 steps (eighth notes at 58 bpm).
const TITLE_MELODY: Line = Line {
    inst: Inst::Piano,
    len: 128,
    vel: 1.0,
    notes: &[
        (0, 76.0, 3.0),
        (3, 72.0, 1.0),
        (4, 74.0, 2.0),
        (6, 71.0, 2.0),
        (8, 72.0, 3.0),
        (11, 69.0, 1.0),
        (12, 69.0, 4.0),
        (16, 77.0, 3.0),
        (19, 76.0, 1.0),
        (20, 74.0, 2.0),
        (22, 72.0, 2.0),
        (24, 71.0, 3.0),
        (27, 74.0, 1.0),
        (28, 76.0, 4.0),
        (32, 76.0, 3.0),
        (35, 72.0, 1.0),
        (36, 74.0, 2.0),
        (38, 71.0, 2.0),
        (40, 72.0, 2.0),
        (42, 71.0, 1.0),
        (43, 69.0, 1.0),
        (44, 67.0, 4.0),
        (48, 65.0, 2.0),
        (50, 69.0, 2.0),
        (52, 72.0, 2.0),
        (54, 77.0, 2.0),
        (56, 76.0, 3.0),
        (59, 74.0, 1.0),
        (60, 76.0, 4.0),
        (64, 81.0, 3.0),
        (67, 79.0, 1.0),
        (68, 77.0, 2.0),
        (70, 76.0, 2.0),
        (72, 74.0, 3.0),
        (75, 72.0, 1.0),
        (76, 71.0, 4.0),
        (80, 72.0, 2.0),
        (82, 74.0, 2.0),
        (84, 76.0, 2.0),
        (86, 77.0, 2.0),
        (88, 79.0, 3.0),
        (91, 76.0, 1.0),
        (92, 72.0, 4.0),
        (96, 74.0, 3.0),
        (99, 72.0, 1.0),
        (100, 71.0, 2.0),
        (102, 69.0, 2.0),
        (104, 68.0, 3.0),
        (107, 71.0, 1.0),
        (108, 76.0, 4.0),
        (112, 72.0, 2.0),
        (114, 71.0, 2.0),
        (116, 69.0, 4.0),
        (120, 69.0, 8.0),
    ],
};
const TITLE_LEFT: Line = Line {
    inst: Inst::Piano,
    len: 64,
    vel: 0.55,
    notes: &[
        (0, 45.0, 2.0),
        (2, 52.0, 2.0),
        (4, 57.0, 2.0),
        (6, 60.0, 2.0),
        (8, 41.0, 2.0),
        (10, 48.0, 2.0),
        (12, 53.0, 2.0),
        (14, 57.0, 2.0),
        (16, 38.0, 2.0),
        (18, 45.0, 2.0),
        (20, 50.0, 2.0),
        (22, 53.0, 2.0),
        (24, 40.0, 2.0),
        (26, 47.0, 2.0),
        (28, 52.0, 2.0),
        (30, 56.0, 2.0),
        (32, 45.0, 2.0),
        (34, 52.0, 2.0),
        (36, 57.0, 2.0),
        (38, 60.0, 2.0),
        (40, 43.0, 2.0),
        (42, 50.0, 2.0),
        (44, 55.0, 2.0),
        (46, 59.0, 2.0),
        (48, 41.0, 2.0),
        (50, 48.0, 2.0),
        (52, 53.0, 2.0),
        (54, 57.0, 2.0),
        (56, 40.0, 2.0),
        (58, 47.0, 2.0),
        (60, 52.0, 2.0),
        (62, 56.0, 2.0),
    ],
};
const TENDER_PAD: Line = Line {
    inst: Inst::Pad,
    len: 64,
    vel: 1.0,
    notes: &[
        (0, 53.0, 16.0),
        (0, 60.0, 16.0),
        (0, 65.0, 16.0),
        (16, 50.0, 16.0),
        (16, 57.0, 16.0),
        (16, 65.0, 16.0),
        (32, 46.0, 16.0),
        (32, 58.0, 16.0),
        (32, 62.0, 16.0),
        (48, 48.0, 16.0),
        (48, 55.0, 16.0),
        (48, 64.0, 16.0),
    ],
};
const TENDER_TUNE: Line = Line {
    inst: Inst::Piano,
    len: 128,
    vel: 0.8,
    notes: &[
        (0, 72.0, 4.0),
        (4, 74.0, 2.0),
        (6, 76.0, 2.0),
        (8, 77.0, 6.0),
        (14, 76.0, 2.0),
        (16, 74.0, 6.0),
        (22, 72.0, 2.0),
        (24, 69.0, 8.0),
        (32, 70.0, 4.0),
        (36, 72.0, 2.0),
        (38, 74.0, 2.0),
        (40, 77.0, 6.0),
        (46, 74.0, 2.0),
        (48, 72.0, 8.0),
        (56, 67.0, 8.0),
        (64, 72.0, 4.0),
        (68, 74.0, 2.0),
        (70, 76.0, 2.0),
        (72, 77.0, 4.0),
        (76, 79.0, 4.0),
        (80, 81.0, 8.0),
        (88, 77.0, 8.0),
        (96, 79.0, 4.0),
        (100, 77.0, 2.0),
        (102, 74.0, 2.0),
        (104, 76.0, 8.0),
        (112, 72.0, 16.0),
    ],
};
const TENSE_BASS: Line = Line {
    inst: Inst::Bass,
    len: 32,
    vel: 0.8,
    notes: &[
        (0, 38.0, 1.5),
        (3, 38.0, 1.0),
        (6, 38.0, 1.0),
        (8, 38.0, 1.5),
        (11, 41.0, 1.0),
        (14, 40.0, 1.0),
        (16, 37.0, 1.5),
        (19, 37.0, 1.0),
        (22, 37.0, 1.0),
        (24, 37.0, 1.5),
        (27, 40.0, 1.0),
        (30, 38.0, 1.0),
    ],
};
const TENSE_STRINGS: Line = Line {
    inst: Inst::Strings,
    len: 64,
    vel: 0.65,
    notes: &[
        (0, 62.0, 8.0),
        (8, 65.0, 8.0),
        (16, 64.0, 8.0),
        (24, 61.0, 8.0),
        (32, 62.0, 4.0),
        (36, 69.0, 4.0),
        (40, 70.0, 8.0),
        (48, 69.0, 8.0),
        (56, 61.0, 8.0),
    ],
};
const TENSE_DROPS: Line = Line {
    inst: Inst::Bell,
    len: 64,
    vel: 0.25,
    notes: &[(6, 86.0, 1.0), (22, 89.0, 1.0), (30, 85.0, 1.0), (46, 82.0, 1.0), (54, 86.0, 1.0)],
};

// The OR loop runs at 4 steps per heartbeat: what you hear is literally the patient.
const OR_PLUCK: Line = Line {
    inst: Inst::Pluck,
    len: 32,
    vel: 0.42,
    notes: &[
        (0, 69.0, 1.0),
        (2, 72.0, 1.0),
        (4, 76.0, 1.0),
        (6, 72.0, 1.0),
        (8, 69.0, 1.0),
        (10, 72.0, 1.0),
        (12, 77.0, 1.0),
        (14, 72.0, 1.0),
        (16, 67.0, 1.0),
        (18, 71.0, 1.0),
        (20, 74.0, 1.0),
        (22, 71.0, 1.0),
        (24, 68.0, 1.0),
        (26, 71.0, 1.0),
        (28, 76.0, 1.0),
        (30, 74.0, 1.0),
    ],
};
const OR_PAD: Line = Line {
    inst: Inst::Pad,
    len: 64,
    vel: 0.62,
    notes: &[
        (0, 57.0, 8.0),
        (0, 64.0, 8.0),
        (8, 53.0, 8.0),
        (8, 60.0, 8.0),
        (16, 55.0, 8.0),
        (16, 62.0, 8.0),
        (24, 52.0, 8.0),
        (24, 59.0, 8.0),
        (32, 57.0, 8.0),
        (32, 64.0, 8.0),
        (40, 50.0, 8.0),
        (40, 60.0, 8.0),
        (48, 52.0, 16.0),
        (48, 59.0, 16.0),
    ],
};
const OR_TUNE: Line = Line {
    inst: Inst::Lead,
    len: 64,
    vel: 0.5,
    notes: &[
        (8, 76.0, 4.0),
        (12, 77.0, 2.0),
        (14, 76.0, 2.0),
        (16, 74.0, 6.0),
        (22, 71.0, 2.0),
        (24, 72.0, 8.0),
        (40, 69.0, 2.0),
        (42, 72.0, 2.0),
        (44, 76.0, 4.0),
        (48, 74.0, 2.0),
        (50, 72.0, 2.0),
        (52, 71.0, 4.0),
        (56, 68.0, 8.0),
    ],
};
const CRISIS_STRINGS: Line = Line {
    inst: Inst::Strings,
    len: 16,
    vel: 0.8,
    notes: &[
        (0, 81.0, 1.0),
        (1, 80.0, 1.0),
        (2, 81.0, 1.0),
        (3, 80.0, 1.0),
        (4, 81.0, 1.0),
        (5, 80.0, 1.0),
        (6, 81.0, 1.0),
        (7, 80.0, 1.0),
        (8, 82.0, 1.0),
        (9, 81.0, 1.0),
        (10, 82.0, 1.0),
        (11, 81.0, 1.0),
        (12, 82.0, 1.0),
        (13, 81.0, 1.0),
        (14, 82.0, 1.0),
        (15, 81.0, 1.0),
    ],
};

// The strains' motifs, one heartbeat to the beat, four steps to the heartbeat: each loops in its own meter.
const WALTZ_3_4: Line = Line {
    inst: Inst::Bell,
    len: 48,
    vel: 0.7,
    notes: &[
        (0, 76.0, 4.0),
        (4, 81.0, 4.0),
        (8, 80.0, 4.0),
        (12, 76.0, 4.0),
        (16, 84.0, 4.0),
        (20, 83.0, 4.0),
        (24, 81.0, 4.0),
        (28, 77.0, 4.0),
        (32, 76.0, 4.0),
        (36, 74.0, 6.0),
        (42, 68.0, 2.0),
        (44, 69.0, 4.0),
    ],
};
const LULLABY_6_8: Line = Line {
    inst: Inst::Bell,
    len: 48,
    vel: 0.7,
    notes: &[
        (0, 72.0, 4.0),
        (4, 75.0, 2.0),
        (6, 79.0, 2.0),
        (8, 77.0, 4.0),
        (12, 75.0, 4.0),
        (16, 74.0, 2.0),
        (18, 72.0, 2.0),
        (20, 71.0, 4.0),
        (24, 72.0, 4.0),
        (28, 79.0, 2.0),
        (30, 84.0, 2.0),
        (32, 83.0, 4.0),
        (36, 79.0, 4.0),
        (40, 75.0, 8.0),
    ],
};
const FIVE_4: Line = Line {
    inst: Inst::Brass,
    len: 40,
    vel: 0.55,
    notes: &[
        (0, 50.0, 3.0),
        (3, 50.0, 1.0),
        (4, 53.0, 4.0),
        (8, 50.0, 3.0),
        (11, 50.0, 1.0),
        (12, 56.0, 4.0),
        (16, 55.0, 4.0),
        (20, 50.0, 3.0),
        (23, 50.0, 1.0),
        (24, 53.0, 4.0),
        (28, 58.0, 4.0),
        (32, 57.0, 4.0),
        (36, 49.0, 4.0),
    ],
};
const SEVEN_8: Line = Line {
    inst: Inst::Lead,
    len: 28,
    vel: 0.62,
    notes: &[
        (0, 74.0, 2.0),
        (2, 77.0, 2.0),
        (4, 81.0, 2.0),
        (6, 80.0, 2.0),
        (8, 77.0, 2.0),
        (10, 74.0, 2.0),
        (12, 73.0, 2.0),
        (14, 74.0, 2.0),
        (16, 77.0, 2.0),
        (18, 82.0, 2.0),
        (20, 81.0, 2.0),
        (22, 77.0, 2.0),
        (24, 76.0, 2.0),
        (26, 73.0, 2.0),
    ],
};
const RESULTS_FANFARE: Line = Line {
    inst: Inst::Brass,
    len: 64,
    vel: 0.8,
    notes: &[
        (0, 57.0, 2.0),
        (0, 64.0, 2.0),
        (2, 60.0, 2.0),
        (2, 69.0, 2.0),
        (4, 64.0, 4.0),
        (4, 72.0, 4.0),
        (8, 62.0, 2.0),
        (8, 71.0, 2.0),
        (10, 64.0, 2.0),
        (10, 72.0, 2.0),
        (12, 65.0, 2.0),
        (12, 74.0, 2.0),
        (14, 67.0, 2.0),
        (14, 76.0, 2.0),
        (16, 69.0, 8.0),
        (16, 72.0, 8.0),
        (16, 81.0, 8.0),
    ],
};
const RESULTS_PIANO: Line = Line {
    inst: Inst::Piano,
    len: 64,
    vel: 0.65,
    notes: &[
        (24, 69.0, 2.0),
        (26, 72.0, 2.0),
        (28, 76.0, 2.0),
        (30, 81.0, 2.0),
        (32, 79.0, 4.0),
        (36, 77.0, 4.0),
        (40, 76.0, 2.0),
        (42, 74.0, 2.0),
        (44, 72.0, 4.0),
        (48, 71.0, 4.0),
        (52, 72.0, 4.0),
        (56, 69.0, 8.0),
    ],
};
const DRIVE_BASS: Line = Line {
    inst: Inst::Bass,
    len: 32,
    vel: 0.8,
    notes: &[
        (0, 45.0, 1.0),
        (2, 45.0, 1.0),
        (4, 45.0, 1.0),
        (6, 48.0, 1.0),
        (8, 45.0, 1.0),
        (10, 45.0, 1.0),
        (12, 43.0, 1.0),
        (14, 44.0, 1.0),
        (16, 41.0, 1.0),
        (18, 41.0, 1.0),
        (20, 41.0, 1.0),
        (22, 44.0, 1.0),
        (24, 40.0, 1.0),
        (26, 40.0, 1.0),
        (28, 43.0, 1.0),
        (30, 44.0, 1.0),
    ],
};
const DRIVE_LEAD: Line = Line {
    inst: Inst::Lead,
    len: 64,
    vel: 0.6,
    notes: &[
        (0, 69.0, 3.0),
        (3, 72.0, 3.0),
        (6, 76.0, 2.0),
        (8, 77.0, 3.0),
        (11, 76.0, 3.0),
        (14, 72.0, 2.0),
        (16, 74.0, 3.0),
        (19, 72.0, 3.0),
        (22, 71.0, 2.0),
        (24, 68.0, 8.0),
        (32, 69.0, 3.0),
        (35, 72.0, 3.0),
        (38, 76.0, 2.0),
        (40, 81.0, 3.0),
        (43, 79.0, 3.0),
        (46, 76.0, 2.0),
        (48, 77.0, 3.0),
        (51, 76.0, 3.0),
        (54, 74.0, 2.0),
        (56, 76.0, 8.0),
    ],
};
const DRIVE_KICK: Line = Line { inst: Inst::Kick, len: 8, vel: 0.6, notes: &[(0, 0.0, 1.0), (4, 0.0, 1.0)] };
const DRIVE_HAT: Line = Line { inst: Inst::Hat, len: 2, vel: 0.4, notes: &[(1, 0.0, 1.0)] };

/// A track's lines and its own tempo (None = the heart's).
fn track_lines(name: &str) -> (&'static [&'static Line], Option<f32>) {
    match name {
        "title" => (&[&TITLE_MELODY, &TITLE_LEFT], Some(116.0)),
        "tender" => (&[&TENDER_PAD, &TENDER_TUNE], Some(120.0)),
        "tense" => (&[&TENSE_BASS, &TENSE_STRINGS, &TENSE_DROPS], Some(170.0)),
        "or" => (&[&OR_PLUCK, &OR_PAD, &OR_TUNE], None),
        "codeblue" => (&[&DRIVE_BASS, &DRIVE_LEAD, &DRIVE_KICK, &DRIVE_HAT, &OR_PAD], None),
        "results" => (&[&RESULTS_FANFARE, &RESULTS_PIANO, &TENDER_PAD], Some(200.0)),
        _ => (&[], None),
    }
}

/// How the mix sits at its default level: music defaults to 10%, so the writing is forward.
const LOUD: f32 = 3.0;

#[derive(Default)]
pub struct Sequencer {
    track: String,
    /// Grid position in steps, for tracks with their own tempo.
    pos: f64,
    /// Step scheduled up to.
    next_step: i64,
    drone_t: f32,
}

impl Sequencer {
    pub fn new() -> Self {
        Self::default()
    }

    /// Runs one frame: appends notes due in the next moments as (patch, pan, gain, delay).
    pub fn update(&mut self, dt: f32, m: &MusicInput, out: &mut Vec<(Patch, f32, f32, f32)>) {
        const AHEAD: f64 = 0.28;
        if m.track != self.track {
            self.track = m.track.clone();
            self.pos = 0.0;
            self.next_step = i64::MIN;
        }
        let (lines, own_tempo) = track_lines(&self.track);
        let mut notes: Vec<(Patch, f32, f32)> = Vec::new();
        // The Hush: everything low, one held note and the heart.
        let hush = m.hush > 0.5;
        if hush {
            self.drone_t -= dt;
            if self.drone_t <= 0.0 {
                self.drone_t = 2.4;
                note(Inst::Pad, 57.0, 3.0, 1.2, &mut notes);
                note(Inst::Bell, 81.0, 1.0, 0.14, &mut notes);
                for (p, pan, g) in notes.drain(..) {
                    out.push((p, pan, g * LOUD, 0.0));
                }
            }
        } else {
            self.drone_t = 0.0;
        }
        if m.flat || (lines.is_empty() && m.motif == 0) {
            return;
        }
        // Where we are on the grid, and how long a step is.
        let (pos, step_secs) = match own_tempo {
            Some(bpm) => {
                self.pos += dt as f64 * bpm as f64 / 60.0;
                (self.pos, 60.0 / bpm)
            }
            None => {
                let bpm = m.bpm.max(30.0);
                (m.heart * 4.0, 60.0 / bpm / 4.0)
            }
        };
        if self.next_step == i64::MIN {
            self.next_step = pos.ceil() as i64;
        }
        // A rewind or a jump in position: don't try to catch up.
        if (self.next_step as f64 - pos).abs() > 64.0 {
            self.next_step = pos.ceil() as i64;
        }
        let horizon = pos + AHEAD / step_secs as f64;
        let quiet = if hush { 0.0 } else { 1.0 };
        while (self.next_step as f64) < horizon {
            let step = self.next_step;
            let delay = ((step as f64 - pos) * step_secs as f64).max(0.0) as f32;
            for line in lines {
                let s = step.rem_euclid(line.len as i64) as u32;
                for (at, midi, len) in line.notes {
                    if *at == s {
                        note(line.inst, *midi, *len * step_secs, line.vel * quiet, &mut notes);
                    }
                }
            }
            // The bass lands on the actual heartbeat.
            if own_tempo.is_none() && step.rem_euclid(4) == 0 && self.track == "or" {
                let bar = step.div_euclid(4).rem_euclid(8);
                let root = [33.0, 33.0, 29.0, 29.0, 31.0, 31.0, 28.0, 28.0][bar as usize];
                note(Inst::Bass, root + 12.0, step_secs * 1.6, if hush { 0.7 } else { 0.9 }, &mut notes);
            }
            // The crisis layer fades in as vitals fall.
            if m.crisis > 0.02 && own_tempo.is_none() {
                let s = step.rem_euclid(CRISIS_STRINGS.len as i64) as u32;
                for (at, midi, len) in CRISIS_STRINGS.notes {
                    if *at == s {
                        note(Inst::Strings, *midi, *len * step_secs, 0.8 * m.crisis * quiet, &mut notes);
                    }
                }
                if step.rem_euclid(2) == 0 {
                    note(Inst::Hat, 0.0, 0.1, m.crisis * quiet, &mut notes);
                }
            }
            // A strain's motif, in its own meter.
            let motif = match m.motif {
                3 => Some(&WALTZ_3_4),
                6 => Some(&LULLABY_6_8),
                5 => Some(&FIVE_4),
                7 => Some(&SEVEN_8),
                _ => None,
            };
            if let (Some(line), true) = (motif, own_tempo.is_none()) {
                let s = step.rem_euclid(line.len as i64) as u32;
                for (at, midi, len) in line.notes {
                    if *at == s {
                        note(line.inst, *midi, *len * step_secs, line.vel * quiet, &mut notes);
                    }
                }
            }
            for (p, pan, g) in notes.drain(..) {
                if g > 0.001 {
                    out.push((p, pan, g * LOUD, delay));
                }
            }
            self.next_step += 1;
        }
    }
}

/// Renders a track offline for `secs`, on the music bus at unity: for tests.
pub fn render_track(track: &str, secs: f32, rate: f32) -> Vec<f32> {
    let mut mixer = crate::Mixer::new(rate);
    mixer.buses = [1.0, 1.0, 1.0];
    let mut seq = Sequencer::new();
    let frames = (secs * rate) as usize;
    let mut out = vec![0.0f32; frames * 2];
    let block = 512usize;
    let dt = block as f32 / rate;
    let mut notes = Vec::new();
    let mut i = 0;
    let mut heart = 0.0f64;
    let mut buf = vec![0.0f32; block * 2];
    while i < frames {
        heart += dt as f64 * 80.0 / 60.0;
        let m = MusicInput { track: track.to_string(), bpm: 80.0, heart, ..Default::default() };
        notes.clear();
        seq.update(dt, &m, &mut notes);
        for (p, pan, g, d) in notes.drain(..) {
            mixer.play_on(crate::BUS_MUSIC, p, pan, g, d);
        }
        let n = block.min(frames - i);
        mixer.render(&mut buf[..n * 2]);
        out[i * 2..(i + n) * 2].copy_from_slice(&buf[..n * 2]);
        i += n;
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn peak(b: &[f32]) -> f32 {
        b.iter().fold(0.0, |m, s| m.max(s.abs()))
    }

    #[test]
    fn every_track_renders_sound() {
        for t in ["title", "tender", "tense", "or", "codeblue", "results"] {
            let b = render_track(t, 6.0, 22050.0);
            assert!(peak(&b) > 0.02, "{t} is silent: {}", peak(&b));
        }
    }

    #[test]
    fn the_motifs_play_in_their_own_meters() {
        for meter in [3u8, 5, 6, 7] {
            let mut seq = Sequencer::new();
            let mut out = Vec::new();
            let mut heart = 0.0;
            for _ in 0..600 {
                heart += 1.0 / 60.0 * 80.0 / 60.0;
                let m = MusicInput { track: "or".into(), bpm: 80.0, heart, motif: meter, ..Default::default() };
                seq.update(1.0 / 60.0, &m, &mut out);
            }
            let plain = {
                let mut seq = Sequencer::new();
                let mut o = Vec::new();
                let mut heart = 0.0;
                for _ in 0..600 {
                    heart += 1.0 / 60.0 * 80.0 / 60.0;
                    let m = MusicInput { track: "or".into(), bpm: 80.0, heart, ..Default::default() };
                    seq.update(1.0 / 60.0, &m, &mut o);
                }
                o.len()
            };
            assert!(out.len() > plain, "meter {meter} added no notes");
        }
    }

    #[test]
    fn the_heart_sets_the_tempo_and_a_stopped_heart_stops_it() {
        let count = |bpm: f32| {
            let mut seq = Sequencer::new();
            let mut out = Vec::new();
            let mut heart = 0.0;
            for _ in 0..1200 {
                heart += 1.0 / 60.0 * bpm as f64 / 60.0;
                let m = MusicInput { track: "or".into(), bpm, heart, ..Default::default() };
                seq.update(1.0 / 60.0, &m, &mut out);
            }
            out.len()
        };
        assert!(count(140.0) > count(72.0), "a faster heart plays faster");
        let mut seq = Sequencer::new();
        let mut out = Vec::new();
        seq.update(0.1, &MusicInput { track: "or".into(), bpm: 80.0, heart: 0.0, flat: true, ..Default::default() }, &mut out);
        assert!(out.is_empty());
    }
}
