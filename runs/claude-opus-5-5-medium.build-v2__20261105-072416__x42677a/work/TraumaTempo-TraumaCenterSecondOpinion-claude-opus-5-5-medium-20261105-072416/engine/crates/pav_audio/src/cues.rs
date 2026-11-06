//! The surgery game's sound table: one recipe per cue (`pav_core::games::surgery::cue`).

use pav_core::games::surgery::cue as c;

use crate::Patch;
use crate::Wave::*;

/// What a cue plays: patches and their delays, at this gain and pitch.
pub fn sounds(id: u16, gain: f32, pitch: f32) -> Vec<(Patch, f32)> {
    let mut v = recipe(id, pitch.max(0.1));
    for (p, _) in &mut v {
        p.volume *= gain;
    }
    v
}

fn recipe(id: u16, k: f32) -> Vec<(Patch, f32)> {
    let noise = Patch::new(Noise, 1.0);
    match id {
        c::TOOL_PICK => vec![
            (Patch { decay: 0.03, volume: 0.22, cutoff: 9000.0, cutoff_end: 4000.0, ..noise }, 0.0),
            (Patch { decay: 0.1, volume: 0.14, ..Patch::new(Triangle, 2100.0 * k) }, 0.0),
            (Patch { decay: 0.08, volume: 0.1, ..Patch::new(Triangle, 3150.0 * k) }, 0.03),
        ],
        c::SLICE => vec![(Patch { attack: 0.01, decay: 0.09, volume: 0.13, cutoff: 3000.0, cutoff_end: 9000.0, ..noise }, 0.0)],
        c::SQUISH => vec![
            (Patch { attack: 0.01, decay: 0.16, volume: 0.28, cutoff: 900.0 * k, cutoff_end: 200.0, ..noise }, 0.0),
            (Patch { freq_end: 70.0 * k, glide: 0.12, decay: 0.14, volume: 0.2, ..Patch::new(Sine, 170.0 * k) }, 0.0),
        ],
        c::FORCEPS => vec![
            (Patch { decay: 0.015, volume: 0.26, cutoff: 11000.0, ..noise }, 0.0),
            (Patch { decay: 0.05, volume: 0.1, ..Patch::new(Square, 2600.0) }, 0.0),
        ],
        c::PULL_POP => vec![
            (Patch { freq_end: 720.0 * k, glide: 0.07, decay: 0.08, volume: 0.28, ..Patch::new(Sine, 220.0 * k) }, 0.0),
            (Patch { decay: 0.05, volume: 0.15, cutoff: 3000.0, cutoff_end: 800.0, ..noise }, 0.03),
        ],
        c::SUTURE => vec![
            (Patch { attack: 0.005, decay: 0.05, volume: 0.17, cutoff: 3000.0, cutoff_end: 9000.0, ..noise }, 0.0),
            (Patch { freq_end: 1300.0 * k, glide: 0.05, decay: 0.06, volume: 0.08, ..Patch::new(Saw, 600.0 * k) }, 0.0),
        ],
        c::GURGLE => vec![
            (Patch { freq_end: 340.0 * k, glide: 0.09, attack: 0.01, decay: 0.12, volume: 0.22, cutoff: 900.0, ..Patch::new(Square, 120.0 * k) }, 0.0),
            (Patch { attack: 0.02, decay: 0.14, volume: 0.16, cutoff: 700.0, cutoff_end: 1500.0, ..noise }, 0.0),
        ],
        c::LASER => vec![
            (Patch { attack: 0.02, decay: 0.2, volume: 0.1, cutoff: 3500.0, ..Patch::new(Saw, 560.0 * k) }, 0.0),
            (Patch { attack: 0.02, decay: 0.2, volume: 0.1, ..Patch::new(Sine, 1120.0 * k) }, 0.0),
        ],
        c::SIZZLE => vec![(Patch { attack: 0.01, decay: 0.35, volume: 0.24, cutoff: 9000.0 * k, cutoff_end: 3000.0, ..noise }, 0.0)],
        c::GEL => vec![
            (Patch { attack: 0.005, decay: 0.1, volume: 0.14, cutoff: 1800.0 * k, cutoff_end: 500.0, ..noise }, 0.0),
            (Patch { freq_end: 260.0 * k, glide: 0.08, decay: 0.08, volume: 0.1, ..Patch::new(Sine, 520.0 * k) }, 0.0),
        ],
        c::IV => vec![(Patch { attack: 0.08, decay: 0.3, sustain: 0.4, hold: 0.4, release: 0.2, volume: 0.13, cutoff: 7000.0, cutoff_end: 3000.0, ..noise }, 0.0)],
        c::SONAR => vec![
            (Patch { freq_end: 1800.0 * k, glide: 0.04, decay: 0.3, volume: 0.17, ..Patch::new(Sine, 1500.0 * k) }, 0.0),
            (Patch { decay: 0.4, volume: 0.07, ..Patch::new(Sine, 2400.0 * k) }, 0.06),
        ],
        c::DEFIB_WHINE => vec![(Patch { freq_end: 3800.0, glide: 1.2, attack: 0.05, decay: 1.15, sustain: 0.8, hold: 0.0, release: 0.1, volume: 0.1, ..Patch::new(Saw, 700.0) }, 0.0)],
        c::DEFIB_THUMP => vec![
            (Patch { freq_end: 34.0, glide: 0.2, decay: 0.45, volume: 0.9, ..Patch::new(Sine, 120.0) }, 0.0),
            (Patch { decay: 0.2, volume: 0.45, cutoff: 7000.0, cutoff_end: 300.0, ..noise }, 0.0),
        ],
        c::LUB => vec![
            (Patch { freq_end: 46.0, glide: 0.09, attack: 0.006, decay: 0.13, volume: 0.62, cutoff: 500.0, ..Patch::new(Sine, 74.0) }, 0.0),
            (Patch { freq_end: 62.0, glide: 0.07, attack: 0.006, decay: 0.1, volume: 0.42, cutoff: 500.0, ..Patch::new(Sine, 96.0) }, 0.16),
        ],
        c::MONITOR => vec![(Patch { decay: 0.1, volume: 0.05, ..Patch::new(Sine, 1050.0 * k) }, 0.0)],
        c::ALARM => vec![
            (Patch { decay: 0.14, volume: 0.15, duty: 0.4, ..Patch::new(Square, 960.0 * k) }, 0.0),
            (Patch { decay: 0.14, volume: 0.15, duty: 0.4, ..Patch::new(Square, 760.0 * k) }, 0.18),
            (Patch { decay: 0.14, volume: 0.15, duty: 0.4, ..Patch::new(Square, 960.0 * k) }, 0.36),
        ],
        c::RATE_SLOPPY => vec![(Patch { freq_end: 150.0, glide: 0.2, decay: 0.24, volume: 0.13, duty: 0.3, ..Patch::new(Square, 240.0) }, 0.0)],
        c::RATE_GOOD => vec![(Patch { decay: 0.16, volume: 0.15, ..Patch::new(Triangle, 660.0 * k) }, 0.0)],
        c::RATE_CLEAN => vec![
            (Patch { decay: 0.16, volume: 0.16, ..Patch::new(Triangle, 784.0 * k) }, 0.0),
            (Patch { decay: 0.22, volume: 0.15, ..Patch::new(Triangle, 1175.0 * k) }, 0.07),
        ],
        c::RATE_IMMACULATE => vec![
            (Patch { decay: 0.2, volume: 0.17, ..Patch::new(Triangle, 880.0 * k) }, 0.0),
            (Patch { decay: 0.2, volume: 0.17, ..Patch::new(Triangle, 1318.0 * k) }, 0.06),
            (Patch { decay: 0.45, volume: 0.17, ..Patch::new(Sine, 1760.0 * k) }, 0.12),
        ],
        c::CHAIN_UP => vec![
            (Patch { freq_end: 1800.0, glide: 0.14, decay: 0.2, volume: 0.13, ..Patch::new(Triangle, 800.0) }, 0.0),
            (Patch { decay: 0.3, volume: 0.1, ..Patch::new(Sine, 2100.0) }, 0.12),
        ],
        c::ON_BEAT => vec![(Patch { decay: 0.07, volume: 0.2, ..Patch::new(Sine, 2640.0) }, 0.0)],
        c::STING => vec![
            (Patch { attack: 0.01, decay: 0.6, volume: 0.2, cutoff: 2500.0, cutoff_end: 500.0, ..Patch::new(Saw, 92.5 * k) }, 0.0),
            (Patch { attack: 0.01, decay: 0.6, volume: 0.16, cutoff: 2500.0, cutoff_end: 500.0, ..Patch::new(Saw, 130.8 * k) }, 0.0),
            (Patch { attack: 0.02, decay: 0.7, volume: 0.14, ..Patch::new(Triangle, 1046.5 * k) }, 0.04),
        ],
        c::BURST => vec![
            (Patch { decay: 0.3, volume: 0.42, cutoff: 3400.0 * k, cutoff_end: 200.0, ..noise }, 0.0),
            (Patch { freq_end: 44.0, glide: 0.2, decay: 0.3, volume: 0.4, ..Patch::new(Sine, 150.0 * k) }, 0.0),
        ],
        c::UI_NAV => vec![(Patch { decay: 0.05, volume: 0.13, ..Patch::new(Triangle, 1240.0 * k) }, 0.0)],
        c::UI_CONFIRM => vec![
            (Patch { decay: 0.08, volume: 0.15, ..Patch::new(Triangle, 880.0) }, 0.0),
            (Patch { decay: 0.14, volume: 0.15, ..Patch::new(Triangle, 1318.0) }, 0.05),
        ],
        c::UI_BACK => vec![(Patch { freq_end: 480.0, glide: 0.08, decay: 0.1, volume: 0.14, ..Patch::new(Triangle, 820.0) }, 0.0)],
        c::BANNER => vec![
            (Patch { freq_end: 40.0, glide: 0.2, decay: 0.3, volume: 0.32, ..Patch::new(Sine, 110.0) }, 0.0),
            (Patch { decay: 0.25, volume: 0.11, cutoff: 4000.0, cutoff_end: 900.0, ..noise }, 0.0),
        ],
        c::FLATLINE => vec![(Patch { attack: 0.01, decay: 0.2, sustain: 0.85, hold: 2.6, release: 0.4, volume: 0.15, ..Patch::new(Sine, 1050.0) }, 0.0)],
        c::CLINK => vec![
            (Patch { decay: 0.11, volume: 0.17, ..Patch::new(Square, 2900.0 * k) }, 0.0),
            (Patch { decay: 0.16, volume: 0.12, ..Patch::new(Triangle, 4100.0 * k) }, 0.01),
        ],
        c::FROST => vec![
            (Patch { attack: 0.02, decay: 0.3, volume: 0.14, cutoff: 12000.0, cutoff_end: 5000.0, ..noise }, 0.0),
            (Patch { decay: 0.3, volume: 0.07, ..Patch::new(Sine, 3200.0 * k) }, 0.03),
        ],
        c::CRACK => vec![
            (Patch { decay: 0.04, volume: 0.42, cutoff: 9000.0, cutoff_end: 2000.0, ..noise }, 0.0),
            (Patch { decay: 0.12, volume: 0.2, cutoff: 3000.0, cutoff_end: 800.0, ..noise }, 0.03),
        ],
        c::SNAP => vec![
            (Patch { decay: 0.03, volume: 0.42, cutoff: 7000.0, cutoff_end: 2000.0, ..noise }, 0.0),
            (Patch { freq_end: 110.0, glide: 0.07, decay: 0.1, volume: 0.3, ..Patch::new(Square, 280.0) }, 0.0),
        ],
        c::LIFT_OFF => vec![
            (Patch { decay: 0.08, volume: 0.17, duty: 0.3, ..Patch::new(Square, 1320.0) }, 0.0),
            (Patch { decay: 0.08, volume: 0.17, duty: 0.3, ..Patch::new(Square, 1320.0) }, 0.14),
        ],
        c::RING => vec![
            (Patch { attack: 0.01, decay: 0.6, volume: 0.3, cutoff: 700.0, cutoff_end: 7000.0, ..noise }, 0.0),
            (Patch { freq_end: 880.0, glide: 0.5, decay: 0.55, volume: 0.1, ..Patch::new(Saw, 180.0) }, 0.0),
        ],
        c::HUSH => vec![
            (Patch { freq_end: 110.0, glide: 0.5, attack: 0.01, decay: 0.7, volume: 0.3, ..Patch::new(Sine, 440.0 * k) }, 0.0),
            (Patch { attack: 0.3, decay: 1.2, volume: 0.1, ..Patch::new(Sine, 880.0 * k) }, 0.1),
        ],
        c::ECHO => vec![
            (Patch { decay: 0.3, volume: 0.14, ..Patch::new(Triangle, 1046.0 * k) }, 0.0),
            (Patch { decay: 0.3, volume: 0.1, ..Patch::new(Triangle, 1046.0 * k) }, 0.14),
            (Patch { decay: 0.3, volume: 0.06, ..Patch::new(Triangle, 1046.0 * k) }, 0.28),
        ],
        c::DUET => vec![
            (Patch { attack: 0.03, decay: 1.2, volume: 0.15, ..Patch::new(Triangle, 440.0) }, 0.0),
            (Patch { attack: 0.03, decay: 1.2, volume: 0.15, ..Patch::new(Triangle, 660.0) }, 0.05),
            (Patch { attack: 0.03, decay: 1.2, volume: 0.15, ..Patch::new(Triangle, 880.0) }, 0.1),
            (Patch { attack: 0.03, decay: 1.4, volume: 0.13, ..Patch::new(Sine, 1320.0) }, 0.15),
        ],
        c::STAMP => vec![
            (Patch { freq_end: 40.0, glide: 0.1, decay: 0.2, volume: 0.65, ..Patch::new(Sine, 150.0) }, 0.0),
            (Patch { decay: 0.1, volume: 0.35, cutoff: 3200.0, cutoff_end: 500.0, ..noise }, 0.0),
        ],
        c::THUNDER => vec![
            (Patch { attack: 0.03, decay: 1.6, volume: 0.55, cutoff: 900.0, cutoff_end: 70.0, ..noise }, 0.0),
            (Patch { freq_end: 28.0, glide: 1.0, decay: 1.2, volume: 0.45, ..Patch::new(Sine, 60.0) }, 0.05),
        ],
        c::TEAR => vec![
            (Patch { attack: 0.005, decay: 0.2, volume: 0.32, cutoff: 2600.0 * k, cutoff_end: 500.0, ..noise }, 0.0),
            (Patch { freq_end: 90.0, glide: 0.14, decay: 0.16, volume: 0.2, duty: 0.3, ..Patch::new(Square, 240.0) }, 0.0),
        ],
        c::GIFT_ARM => vec![(Patch { attack: 0.2, decay: 0.8, volume: 0.1, ..Patch::new(Sine, 1760.0) }, 0.0)],
        c::GASP => vec![(Patch { attack: 0.08, decay: 0.3, volume: 0.2, cutoff: 1200.0, cutoff_end: 3600.0, ..noise }, 0.0)],
        c::LIFT => vec![
            (Patch { decay: 0.3, volume: 0.13, ..Patch::new(Sine, 880.0) }, 0.0),
            (Patch { attack: 0.4, decay: 0.9, volume: 0.13, cutoff: 500.0, ..Patch::new(Saw, 58.0) }, 0.0),
        ],
        c::PHONE => vec![
            (Patch { decay: 0.26, sustain: 0.7, hold: 0.14, volume: 0.1, ..Patch::new(Sine, 440.0) }, 0.0),
            (Patch { decay: 0.26, sustain: 0.7, hold: 0.14, volume: 0.1, ..Patch::new(Sine, 480.0) }, 0.0),
        ],
        c::GLASS => vec![
            (Patch { decay: 0.12, volume: 0.28, cutoff: 12000.0, cutoff_end: 5000.0, ..noise }, 0.0),
            (Patch { decay: 0.2, volume: 0.1, ..Patch::new(Triangle, 3400.0) }, 0.02),
        ],
        _ => Vec::new(),
    }
}
