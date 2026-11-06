//! The cue table: about forty sounds the surgery game names by id (`pav_core::games::surgery::cue`).

use pav_core::games::surgery::cue;

use crate::{Patch, Wave};

/// A cue's patches and delays.
pub fn sound(id: u16, gain: f32, pitch: f32) -> Vec<(Patch, f32)> {
    use Wave::*;
    let g = gain.max(0.0);
    let f = |hz: f32| hz * pitch.max(0.05);
    let n = |attack: f32, decay: f32, vol: f32, c0: f32, c1: f32| Patch {
        attack,
        decay,
        volume: vol * g,
        cutoff: c0,
        cutoff_end: c1,
        ..Patch::new(Noise, 1.0)
    };
    let t = |w: Wave, hz: f32, decay: f32, vol: f32| Patch { decay, volume: vol * g, ..Patch::new(w, f(hz)) };
    match id {
        cue::PICK => vec![
            (Patch { decay: 0.03, volume: 0.1 * g, cutoff: 7000.0, ..Patch::new(Square, f(2400.0)) }, 0.0),
            (Patch { decay: 0.06, volume: 0.08 * g, ..Patch::new(Triangle, f(3600.0)) }, 0.012),
        ],
        cue::SLICE => vec![
            (n(0.005, 0.12, 0.2, 7000.0, 2500.0), 0.0),
            (Patch { freq_end: f(900.0), glide: 0.1, decay: 0.1, volume: 0.05 * g, ..Patch::new(Sine, f(2400.0)) }, 0.0),
        ],
        cue::SQUISH => vec![
            (n(0.01, 0.16, 0.3, 900.0, 240.0), 0.0),
            (Patch { freq_end: f(70.0), glide: 0.14, decay: 0.16, volume: 0.2 * g, ..Patch::new(Sine, f(190.0)) }, 0.0),
        ],
        cue::GRAB => vec![(t(Square, 1500.0, 0.03, 0.09), 0.0), (t(Triangle, 950.0, 0.05, 0.1), 0.02)],
        cue::POP => vec![
            (Patch { freq_end: f(900.0), glide: 0.05, decay: 0.08, volume: 0.24 * g, ..Patch::new(Sine, f(240.0)) }, 0.0),
            (n(0.002, 0.05, 0.12, 2800.0, 900.0), 0.0),
        ],
        cue::ZIP => vec![(
            Patch {
                attack: 0.004,
                decay: 0.05,
                volume: 0.12 * g,
                cutoff: 5000.0,
                cutoff_end: 1800.0,
                freq_end: f(2400.0),
                glide: 0.05,
                ..Patch::new(Saw, f(900.0))
            },
            0.0,
        )],
        cue::GURGLE => vec![
            (
                Patch {
                    freq_end: f(160.0),
                    glide: 0.1,
                    attack: 0.01,
                    decay: 0.11,
                    volume: 0.14 * g,
                    cutoff: 1200.0,
                    ..Patch::new(Sine, f(260.0))
                },
                0.0,
            ),
            (n(0.01, 0.1, 0.1, 900.0, 300.0), 0.02),
            (Patch { freq_end: f(220.0), glide: 0.06, decay: 0.07, volume: 0.1 * g, ..Patch::new(Sine, f(340.0)) }, 0.07),
        ],
        cue::LASER => vec![
            (
                Patch {
                    attack: 0.02,
                    decay: 0.3,
                    sustain: 0.5,
                    hold: 0.4,
                    release: 0.2,
                    volume: 0.09 * g,
                    duty: 0.3,
                    cutoff: 3000.0,
                    ..Patch::new(Square, f(420.0))
                },
                0.0,
            ),
            (Patch { attack: 0.02, decay: 0.5, volume: 0.05 * g, ..Patch::new(Sine, f(1680.0)) }, 0.0),
        ],
        cue::SIZZLE => vec![(n(0.005, 0.3, 0.22, 9000.0, 3000.0), 0.0), (t(Sine, 1760.0, 0.1, 0.08), 0.0)],
        cue::GEL => vec![(
            Patch { attack: 0.015, decay: 0.16, volume: 0.1 * g, cutoff: 1400.0, cutoff_end: 2600.0, ..Patch::new(Noise, 1.0) },
            0.0,
        )],
        cue::IV => vec![
            (
                Patch {
                    attack: 0.03,
                    decay: 0.3,
                    volume: 0.09 * g,
                    cutoff: 3800.0,
                    cutoff_end: 6500.0,
                    ..Patch::new(Noise, 1.0)
                },
                0.0,
            ),
            (Patch { freq_end: f(990.0), glide: 0.25, decay: 0.26, volume: 0.05 * g, ..Patch::new(Sine, f(660.0)) }, 0.0),
        ],
        cue::PING => vec![
            (Patch { freq_end: f(1320.0), glide: 0.03, decay: 0.26, volume: 0.13 * g, ..Patch::new(Sine, f(1760.0)) }, 0.0),
            (Patch { decay: 0.18, volume: 0.04 * g, ..Patch::new(Sine, f(1760.0)) }, 0.14),
        ],
        cue::DEFIB_WHINE => vec![(
            Patch {
                attack: 0.05,
                freq_end: f(2600.0),
                glide: 1.2,
                decay: 1.2,
                sustain: 0.6,
                hold: 0.2,
                release: 0.1,
                volume: 0.09 * g,
                cutoff: 6000.0,
                ..Patch::new(Saw, f(300.0))
            },
            0.0,
        )],
        cue::DEFIB_THUMP => vec![
            (Patch { freq_end: f(30.0), glide: 0.2, decay: 0.42, volume: 0.9 * g, ..Patch::new(Sine, f(120.0)) }, 0.0),
            (n(0.002, 0.22, 0.5, 3800.0, 200.0), 0.0),
        ],
        cue::LUB => vec![
            (
                Patch {
                    freq_end: f(42.0),
                    glide: 0.1,
                    decay: 0.13,
                    volume: 0.42 * g,
                    cutoff: 400.0,
                    ..Patch::new(Sine, f(78.0))
                },
                0.0,
            ),
            (
                Patch { freq_end: f(50.0), glide: 0.08, decay: 0.1, volume: 0.3 * g, cutoff: 500.0, ..Patch::new(Sine, f(92.0)) },
                0.17,
            ),
        ],
        cue::BEEP => vec![(t(Sine, 1046.5, 0.08, 0.1), 0.0)],
        cue::ALARM => {
            vec![(t(Square, 880.0, 0.14, 0.1), 0.0), (t(Square, 660.0, 0.14, 0.1), 0.17), (t(Square, 880.0, 0.14, 0.1), 0.34)]
        }
        cue::IMMACULATE => vec![
            (t(Triangle, 1318.5, 0.12, 0.16), 0.0),
            (t(Triangle, 1760.0, 0.14, 0.16), 0.06),
            (t(Triangle, 2637.0, 0.3, 0.14), 0.12),
        ],
        cue::CLEAN => vec![(t(Triangle, 1046.5, 0.1, 0.14), 0.0), (t(Triangle, 1568.0, 0.18, 0.13), 0.06)],
        cue::GOOD => vec![(t(Triangle, 784.0, 0.13, 0.11), 0.0)],
        cue::SLOPPY => vec![(
            Patch { freq_end: f(180.0), glide: 0.2, decay: 0.22, volume: 0.13 * g, duty: 0.3, ..Patch::new(Square, f(300.0)) },
            0.0,
        )],
        cue::CHAIN => vec![
            (t(Triangle, 1760.0, 0.1, 0.13), 0.0),
            (t(Triangle, 2093.0, 0.1, 0.13), 0.05),
            (t(Triangle, 2637.0, 0.1, 0.13), 0.1),
            (t(Sine, 3520.0, 0.24, 0.1), 0.15),
        ],
        cue::ON_BEAT => vec![(t(Sine, 2093.0, 0.1, 0.12), 0.0)],
        cue::STINGER => vec![
            (
                Patch {
                    attack: 0.01,
                    decay: 0.7,
                    volume: 0.22 * g,
                    cutoff: 2200.0,
                    cutoff_end: 500.0,
                    ..Patch::new(Saw, f(110.0))
                },
                0.0,
            ),
            (
                Patch {
                    attack: 0.01,
                    decay: 0.7,
                    volume: 0.18 * g,
                    cutoff: 2200.0,
                    cutoff_end: 500.0,
                    ..Patch::new(Saw, f(116.5))
                },
                0.0,
            ),
            (Patch { attack: 0.01, decay: 0.6, volume: 0.12 * g, cutoff: 3000.0, ..Patch::new(Saw, f(622.3)) }, 0.0),
        ],
        cue::BURST => vec![
            (n(0.002, 0.24, 0.42, 2600.0, 280.0), 0.0),
            (Patch { freq_end: f(60.0), glide: 0.14, decay: 0.2, volume: 0.36 * g, ..Patch::new(Sine, f(220.0)) }, 0.0),
        ],
        cue::NAV => vec![(Patch { decay: 0.04, volume: 0.09 * g, cutoff: 6000.0, ..Patch::new(Triangle, f(1400.0)) }, 0.0)],
        cue::CONFIRM => vec![(t(Triangle, 880.0, 0.08, 0.14), 0.0), (t(Triangle, 1318.5, 0.14, 0.14), 0.06)],
        cue::BACK => vec![(t(Triangle, 880.0, 0.07, 0.11), 0.0), (t(Triangle, 587.0, 0.1, 0.11), 0.05)],
        cue::BANNER => vec![
            (Patch { freq_end: f(55.0), glide: 0.2, decay: 0.4, volume: 0.42 * g, ..Patch::new(Sine, f(130.0)) }, 0.0),
            (t(Saw, 220.0, 0.3, 0.06), 0.0),
        ],
        cue::FLATLINE => vec![(
            Patch {
                attack: 0.01,
                decay: 0.1,
                sustain: 0.8,
                hold: 2.2,
                release: 0.4,
                volume: 0.13 * g,
                ..Patch::new(Sine, f(987.8))
            },
            0.0,
        )],
        cue::CLINK => vec![
            (t(Square, 2600.0, 0.03, 0.12), 0.0),
            (t(Triangle, 3400.0, 0.1, 0.11), 0.015),
            (n(0.002, 0.03, 0.1, 9000.0, 5000.0), 0.0),
        ],
        cue::FROST => vec![(n(0.02, 0.36, 0.13, 8000.0, 6000.0), 0.0), (t(Sine, 3136.0, 0.3, 0.05), 0.04)],
        cue::SCORCH => vec![
            (n(0.005, 0.5, 0.34, 6000.0, 700.0), 0.0),
            (Patch { freq_end: f(70.0), glide: 0.3, decay: 0.3, volume: 0.2 * g, ..Patch::new(Saw, f(180.0)) }, 0.0),
        ],
        cue::SNAP => vec![(n(0.001, 0.03, 0.34, 9000.0, 3000.0), 0.0), (t(Sine, 1200.0, 0.05, 0.14), 0.0)],
        cue::RIPPLE => vec![(
            Patch { attack: 0.03, freq_end: f(220.0), glide: 0.3, decay: 0.34, volume: 0.13 * g, ..Patch::new(Sine, f(420.0)) },
            0.0,
        )],
        cue::GIFT_READY => {
            vec![(t(Sine, 1318.5, 0.3, 0.1), 0.0), (t(Sine, 1760.0, 0.3, 0.1), 0.1), (t(Sine, 2637.0, 0.6, 0.1), 0.2)]
        }
        cue::GIFT_FIRE => vec![
            (
                Patch { attack: 0.01, freq_end: f(55.0), glide: 0.5, decay: 0.9, volume: 0.42 * g, ..Patch::new(Sine, f(330.0)) },
                0.0,
            ),
            (Patch { attack: 0.05, decay: 1.2, volume: 0.13 * g, ..Patch::new(Sine, f(1760.0)) }, 0.05),
            (Patch { attack: 0.05, decay: 1.2, volume: 0.1 * g, ..Patch::new(Sine, f(2637.0)) }, 0.1),
        ],
        cue::RING => vec![
            (
                Patch {
                    attack: 0.05,
                    freq_end: f(900.0),
                    glide: 0.6,
                    decay: 0.7,
                    volume: 0.16 * g,
                    cutoff: 5000.0,
                    ..Patch::new(Saw, f(120.0))
                },
                0.0,
            ),
            (n(0.1, 0.5, 0.16, 3000.0, 800.0), 0.0),
        ],
        cue::TICK => vec![(t(Square, 1760.0, 0.03, 0.14), 0.0)],
        cue::SPURT => vec![(n(0.005, 0.1, 0.18, 1600.0, 500.0), 0.0)],
        cue::TEAR => vec![
            (n(0.003, 0.18, 0.3, 3200.0, 700.0), 0.0),
            (
                Patch {
                    freq_end: f(110.0),
                    glide: 0.14,
                    decay: 0.16,
                    volume: 0.15 * g,
                    duty: 0.3,
                    ..Patch::new(Square, f(320.0))
                },
                0.0,
            ),
        ],
        cue::THUNDER => vec![
            (n(0.02, 1.6, 0.42, 700.0, 90.0), 0.0),
            (Patch { freq_end: f(30.0), glide: 1.0, decay: 1.2, volume: 0.42 * g, ..Patch::new(Sine, f(70.0)) }, 0.05),
        ],
        cue::STAMP => vec![
            (Patch { freq_end: f(50.0), glide: 0.08, decay: 0.2, volume: 0.62 * g, ..Patch::new(Sine, f(180.0)) }, 0.0),
            (n(0.001, 0.08, 0.34, 3400.0, 600.0), 0.0),
        ],
        _ => Vec::new(),
    }
}
