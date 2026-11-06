//! Synthesized sound: every sound is built from oscillators, noise, envelopes, pitch sweeps
//! and a filter. The mixer runs in the audio callback (cpal) or offline (to .wav). The game
//! runs fine without a sound device.

use std::sync::mpsc::{Receiver, Sender, channel};

use glam::Vec3;
use pav_core::SimEvent;

pub mod music;
pub mod voice;

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Wave {
    Sine,
    Square,
    Saw,
    Triangle,
    Noise,
}

/// One synthesized sound.
#[derive(Clone, Copy, Debug)]
pub struct Patch {
    pub wave: Wave,
    /// Start / end frequency (Hz) and the glide time between them (s, exponential).
    pub freq: f32,
    pub freq_end: f32,
    pub glide: f32,
    pub attack: f32,
    pub decay: f32,
    pub sustain: f32,
    pub hold: f32,
    pub release: f32,
    pub volume: f32,
    /// One-pole low-pass cutoff (Hz) at start and end of the sound.
    pub cutoff: f32,
    pub cutoff_end: f32,
    /// Square-wave duty cycle.
    pub duty: f32,
    /// Resonant formant pair (Hz). Zero leaves the sound unchanged.
    pub formant_hz: f32,
    pub formant_hz2: f32,
}

impl Patch {
    pub const fn new(wave: Wave, freq: f32) -> Self {
        Self {
            wave,
            freq,
            freq_end: freq,
            glide: 0.1,
            attack: 0.002,
            decay: 0.1,
            sustain: 0.0,
            hold: 0.0,
            release: 0.05,
            volume: 0.3,
            cutoff: 12000.0,
            cutoff_end: 12000.0,
            duty: 0.5,
            formant_hz: 0.0,
            formant_hz2: 0.0,
        }
    }
    pub fn length(&self) -> f32 {
        self.attack + self.decay + self.hold + self.release
    }
}

struct Voice {
    p: Patch,
    t: f32,
    delay: f32,
    phase: f32,
    lp: f32,
    f1: f32,
    f2: f32,
    noise: u32,
    gain_l: f32,
    gain_r: f32,
}

impl Voice {
    fn env(&self) -> f32 {
        let p = &self.p;
        let t = self.t;
        if t < p.attack {
            return t / p.attack.max(1e-5);
        }
        let t = t - p.attack;
        if t < p.decay {
            return 1.0 + (p.sustain - 1.0) * (t / p.decay.max(1e-5));
        }
        let t = t - p.decay;
        if t < p.hold {
            return p.sustain;
        }
        let t = t - p.hold;
        let start = if p.decay > 0.0 || p.hold > 0.0 { p.sustain } else { 1.0 };
        (start * (1.0 - t / p.release.max(1e-5))).max(0.0)
    }

    fn done(&self) -> bool {
        self.t > self.p.length() + 0.01
    }

    fn next(&mut self, dt: f32) -> f32 {
        if self.delay > 0.0 {
            self.delay -= dt;
            return 0.0;
        }
        let p = self.p;
        let k = (self.t / p.glide.max(1e-4)).min(1.0);
        let freq = p.freq * (p.freq_end / p.freq.max(1.0)).powf(k);
        self.phase = (self.phase + freq * dt).fract();
        let ph = self.phase;
        let raw = match p.wave {
            Wave::Sine => (ph * std::f32::consts::TAU).sin(),
            Wave::Square => {
                if ph < p.duty {
                    1.0
                } else {
                    -1.0
                }
            }
            Wave::Saw => ph * 2.0 - 1.0,
            Wave::Triangle => 1.0 - 4.0 * (ph - 0.5).abs(),
            Wave::Noise => {
                self.noise ^= self.noise << 13;
                self.noise ^= self.noise >> 17;
                self.noise ^= self.noise << 5;
                (self.noise as f32 / u32::MAX as f32) * 2.0 - 1.0
            }
        };
        let cutoff = p.cutoff * (p.cutoff_end / p.cutoff.max(1.0)).powf((self.t / p.length().max(1e-3)).min(1.0));
        let a = 1.0 - (-std::f32::consts::TAU * cutoff * dt).exp();
        self.lp += (raw - self.lp) * a;
        let mut s = self.lp * self.env() * p.volume;
        if p.formant_hz > 0.0 {
            let a = 1.0 - (-std::f32::consts::TAU * p.formant_hz * dt).exp();
            self.f1 += (s - self.f1) * a;
            let hz2 = if p.formant_hz2 > 0.0 { p.formant_hz2 } else { p.formant_hz * 2.4 };
            let a2 = 1.0 - (-std::f32::consts::TAU * hz2 * dt).exp();
            self.f2 += (s - self.f2) * a2;
            s = s * 0.25 + self.f1 * 0.55 + (s - self.f2) * 0.35;
        }
        self.t += dt;
        s
    }
}

/// Mixes voices into interleaved stereo.
pub const BUS_MUSIC: u8 = 0;
pub const BUS_EFFECTS: u8 = 1;
pub const BUS_VOICES: u8 = 2;

pub struct Mixer {
    voices: Vec<Voice>,
    pub sample_rate: f32,
    pub master: f32,
    pub music: f32,
    pub effects: f32,
    pub voices_gain: f32,
    seed: u32,
}

const MAX_VOICES: usize = 64;

impl Mixer {
    pub fn new(sample_rate: f32) -> Self {
        Self { voices: Vec::new(), sample_rate, master: 0.8, music: 0.10, effects: 0.80, voices_gain: 0.70, seed: 0x9e37_79b9 }
    }

    /// pan -1 (left) .. 1 (right); delay in seconds. Effects bus.
    pub fn play(&mut self, p: Patch, pan: f32, gain: f32, delay: f32) {
        self.play_on(p, pan, gain, delay, BUS_EFFECTS);
    }

    pub fn play_on(&mut self, p: Patch, pan: f32, gain: f32, delay: f32, bus: u8) {
        let bus_gain = match bus {
            BUS_MUSIC => self.music,
            BUS_VOICES => self.voices_gain,
            _ => self.effects,
        };
        self.play_raw(p, pan, gain * bus_gain, delay);
    }

    fn play_raw(&mut self, p: Patch, pan: f32, gain: f32, delay: f32) {
        if self.voices.len() >= MAX_VOICES {
            // Drop the oldest.
            self.voices.remove(0);
        }
        self.seed = self.seed.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
        let pan = pan.clamp(-1.0, 1.0);
        let a = (pan + 1.0) * std::f32::consts::FRAC_PI_4;
        self.voices.push(Voice {
            p,
            t: 0.0,
            delay,
            phase: 0.0,
            lp: 0.0,
            f1: 0.0,
            f2: 0.0,
            noise: self.seed | 1,
            gain_l: a.cos() * gain,
            gain_r: a.sin() * gain,
        });
    }

    /// Renders into an interleaved stereo buffer (overwrites).
    pub fn render(&mut self, out: &mut [f32]) {
        let dt = 1.0 / self.sample_rate;
        for frame in out.chunks_mut(2) {
            let (mut l, mut r) = (0.0, 0.0);
            for v in &mut self.voices {
                let s = v.next(dt);
                l += s * v.gain_l;
                r += s * v.gain_r;
            }
            // Soft clip.
            let m = self.master;
            frame[0] = (l * m).tanh();
            if frame.len() > 1 {
                frame[1] = (r * m).tanh();
            }
        }
        self.voices.retain(|v| !v.done());
    }

    pub fn active(&self) -> usize {
        self.voices.len()
    }
}

/// Where the ears are: position and the camera's right vector (for panning).
#[derive(Clone, Copy, Debug)]
pub struct Listener {
    pub pos: Vec3,
    pub right: Vec3,
}

impl Default for Listener {
    fn default() -> Self {
        Self { pos: Vec3::ZERO, right: Vec3::X }
    }
}

/// The sound bank: which patches play for a simulation event.
pub fn sounds_for(ev: &SimEvent) -> Vec<(Patch, f32)> {
    use Wave::*;
    match ev {
        SimEvent::Jump { .. } => vec![(
            Patch {
                freq_end: 640.0,
                glide: 0.11,
                decay: 0.12,
                volume: 0.18,
                cutoff: 3500.0,
                cutoff_end: 2500.0,
                duty: 0.3,
                ..Patch::new(Square, 280.0)
            },
            0.0,
        )],
        SimEvent::Land { speed, .. } => {
            let v = (speed / 14.0).clamp(0.15, 1.0);
            vec![
                (Patch { decay: 0.12, volume: 0.35 * v, cutoff: 1100.0, cutoff_end: 200.0, ..Patch::new(Noise, 1.0) }, 0.0),
                (Patch { freq_end: 45.0, glide: 0.1, decay: 0.14, volume: 0.45 * v, ..Patch::new(Sine, 110.0) }, 0.0),
            ]
        }
        SimEvent::Step { .. } => {
            vec![(Patch { decay: 0.045, volume: 0.07, cutoff: 1800.0, cutoff_end: 500.0, ..Patch::new(Noise, 1.0) }, 0.0)]
        }
        SimEvent::Throw { .. } => vec![(
            Patch { attack: 0.03, decay: 0.16, volume: 0.1, cutoff: 900.0, cutoff_end: 4500.0, ..Patch::new(Noise, 1.0) },
            0.0,
        )],
        SimEvent::Explosion { radius, .. } => {
            let v = (radius / 1.35).clamp(0.5, 2.0);
            vec![
                (
                    Patch {
                        attack: 0.004,
                        decay: 0.25,
                        sustain: 0.35,
                        hold: 0.1,
                        release: 0.6,
                        volume: 0.6 * v,
                        cutoff: 4000.0,
                        cutoff_end: 120.0,
                        ..Patch::new(Noise, 1.0)
                    },
                    0.0,
                ),
                (Patch { freq_end: 28.0, glide: 0.5, decay: 0.7, volume: 0.7 * v, ..Patch::new(Sine, 85.0) }, 0.0),
            ]
        }
        SimEvent::EnterRoom { .. } => vec![
            (Patch { decay: 0.25, volume: 0.12, ..Patch::new(Triangle, 659.3) }, 0.0),
            (Patch { decay: 0.35, volume: 0.12, ..Patch::new(Triangle, 987.8) }, 0.09),
        ],
        SimEvent::Hit { strength, .. } => {
            let v = (strength / 8.0).clamp(0.4, 1.2);
            vec![
                (Patch { decay: 0.09, volume: 0.3 * v, cutoff: 2500.0, cutoff_end: 300.0, ..Patch::new(Noise, 1.0) }, 0.0),
                (
                    Patch { freq_end: 90.0, glide: 0.12, decay: 0.16, volume: 0.3 * v, duty: 0.4, ..Patch::new(Square, 220.0) },
                    0.0,
                ),
            ]
        }
        // Shardfall.
        SimEvent::Swing { heavy, .. } => {
            let h = if *heavy { 1.4 } else { 1.0 };
            vec![(
                Patch {
                    attack: 0.02,
                    decay: 0.12 * h,
                    volume: 0.16 * h,
                    cutoff: 1800.0,
                    cutoff_end: 5200.0,
                    ..Patch::new(Noise, 1.0)
                },
                0.0,
            )]
        }
        SimEvent::Strike { power, element, crit, .. } => {
            let v = (power.sqrt() / 4.0).clamp(0.35, 1.2) * if *crit { 1.3 } else { 1.0 };
            let tone = [150.0, 120.0, 520.0, 900.0, 260.0][(*element as usize).min(4)];
            let mut out = vec![
                (Patch { decay: 0.07, volume: 0.24 * v, cutoff: 3200.0, cutoff_end: 400.0, ..Patch::new(Noise, 1.0) }, 0.0),
                (
                    Patch {
                        freq_end: tone * 0.5,
                        glide: 0.08,
                        decay: 0.1,
                        volume: 0.2 * v,
                        duty: 0.35,
                        ..Patch::new(Square, tone)
                    },
                    0.0,
                ),
            ];
            if *crit {
                out.push((Patch { decay: 0.18, volume: 0.12, ..Patch::new(Triangle, 1760.0) }, 0.01));
            }
            out
        }
        SimEvent::Slain { size, .. } => {
            let k = size.clamp(0.3, 1.5);
            vec![
                (
                    Patch {
                        freq_end: 60.0,
                        glide: 0.3,
                        decay: 0.3,
                        volume: 0.22 * k,
                        duty: 0.5,
                        ..Patch::new(Square, 180.0 / k)
                    },
                    0.0,
                ),
                (Patch { decay: 0.25, volume: 0.15, cutoff: 1500.0, cutoff_end: 200.0, ..Patch::new(Noise, 1.0) }, 0.02),
            ]
        }
        SimEvent::Slam { radius, .. } => {
            let k = (radius / 2.5).clamp(0.6, 1.5);
            vec![
                (Patch { freq_end: 40.0, glide: 0.35, decay: 0.4, volume: 0.45 * k, ..Patch::new(Sine, 110.0) }, 0.0),
                (Patch { decay: 0.3, volume: 0.3 * k, cutoff: 2200.0, cutoff_end: 150.0, ..Patch::new(Noise, 1.0) }, 0.0),
            ]
        }
        SimEvent::Blast { element, .. } => {
            let cut = [2500.0, 3500.0, 6000.0, 8000.0, 2000.0][(*element as usize).min(4)];
            vec![
                (
                    Patch { attack: 0.003, decay: 0.3, volume: 0.35, cutoff: cut, cutoff_end: 200.0, ..Patch::new(Noise, 1.0) },
                    0.0,
                ),
                (Patch { freq_end: 50.0, glide: 0.25, decay: 0.3, volume: 0.25, ..Patch::new(Sine, 140.0) }, 0.0),
            ]
        }
        SimEvent::Spell { element, .. } => {
            let f = [300.0, 260.0, 900.0, 1400.0, 420.0][(*element as usize).min(4)];
            vec![(
                Patch {
                    freq_end: f * 1.8,
                    glide: 0.15,
                    attack: 0.02,
                    decay: 0.18,
                    volume: 0.12,
                    duty: 0.25,
                    ..Patch::new(Saw, f)
                },
                0.0,
            )]
        }
        SimEvent::Coin { .. } => vec![
            (Patch { decay: 0.08, volume: 0.1, ..Patch::new(Triangle, 1980.0) }, 0.0),
            (Patch { decay: 0.12, volume: 0.09, ..Patch::new(Triangle, 2640.0) }, 0.05),
        ],
        // Drops chime by rarity: rares ring, uniques ring a chord.
        SimEvent::Loot { rarity, .. } => match rarity {
            0 => vec![(Patch { decay: 0.05, volume: 0.05, cutoff: 2500.0, ..Patch::new(Triangle, 880.0) }, 0.0)],
            1 => vec![(Patch { decay: 0.12, volume: 0.08, ..Patch::new(Triangle, 1320.0) }, 0.0)],
            2 => vec![
                (Patch { decay: 0.25, volume: 0.12, ..Patch::new(Triangle, 1568.0) }, 0.0),
                (Patch { decay: 0.35, volume: 0.1, ..Patch::new(Sine, 2093.0) }, 0.08),
            ],
            _ => vec![
                (Patch { decay: 0.5, volume: 0.14, ..Patch::new(Triangle, 784.0) }, 0.0),
                (Patch { decay: 0.5, volume: 0.13, ..Patch::new(Triangle, 988.0) }, 0.06),
                (Patch { decay: 0.6, volume: 0.13, ..Patch::new(Triangle, 1175.0) }, 0.12),
                (Patch { decay: 0.9, volume: 0.12, ..Patch::new(Sine, 1568.0) }, 0.2),
            ],
        },
        SimEvent::Pickup { .. } => {
            vec![(Patch { freq_end: 1400.0, glide: 0.06, decay: 0.07, volume: 0.08, ..Patch::new(Triangle, 700.0) }, 0.0)]
        }
        SimEvent::Travel { .. } => vec![
            (Patch { freq_end: 1200.0, glide: 0.5, decay: 0.6, volume: 0.12, ..Patch::new(Sine, 200.0) }, 0.0),
            (Patch { freq_end: 2400.0, glide: 0.4, decay: 0.5, volume: 0.06, ..Patch::new(Triangle, 600.0) }, 0.1),
        ],
        SimEvent::Potion { .. } => {
            vec![(Patch { freq_end: 700.0, glide: 0.3, decay: 0.3, volume: 0.14, ..Patch::new(Sine, 300.0) }, 0.0)]
        }
        SimEvent::Block { .. } => {
            vec![(Patch { decay: 0.2, volume: 0.2, cutoff: 6000.0, cutoff_end: 3000.0, ..Patch::new(Square, 1200.0) }, 0.0)]
        }
        SimEvent::LevelUp { .. } => vec![
            (Patch { decay: 0.2, volume: 0.16, ..Patch::new(Triangle, 523.0) }, 0.0),
            (Patch { decay: 0.2, volume: 0.16, ..Patch::new(Triangle, 659.0) }, 0.1),
            (Patch { decay: 0.2, volume: 0.16, ..Patch::new(Triangle, 784.0) }, 0.2),
            (Patch { decay: 0.5, volume: 0.18, ..Patch::new(Triangle, 1047.0) }, 0.3),
        ],
        SimEvent::Respawn { .. } => vec![
            (Patch { freq_end: 880.0, glide: 0.18, decay: 0.2, volume: 0.12, ..Patch::new(Sine, 220.0) }, 0.0),
            (Patch { decay: 0.15, volume: 0.08, ..Patch::new(Triangle, 1320.0) }, 0.16),
        ],
        SimEvent::CourseStart { .. } => vec![(Patch { decay: 0.12, volume: 0.14, ..Patch::new(Square, 880.0) }, 0.0)],
        SimEvent::Gate { ok, .. } => {
            if *ok {
                vec![(Patch { decay: 0.1, volume: 0.12, ..Patch::new(Triangle, 1046.5) }, 0.0)]
            } else {
                vec![(
                    Patch { freq_end: 160.0, glide: 0.2, decay: 0.25, volume: 0.14, duty: 0.3, ..Patch::new(Square, 330.0) },
                    0.0,
                )]
            }
        }
        SimEvent::CourseFinish { new_best, .. } => {
            let mut v = vec![
                (Patch { decay: 0.18, volume: 0.13, ..Patch::new(Triangle, 523.3) }, 0.0),
                (Patch { decay: 0.18, volume: 0.13, ..Patch::new(Triangle, 659.3) }, 0.1),
                (Patch { decay: 0.4, volume: 0.14, ..Patch::new(Triangle, 784.0) }, 0.2),
            ];
            if *new_best {
                v.push((Patch { decay: 0.5, volume: 0.13, ..Patch::new(Triangle, 1046.5) }, 0.34));
            }
            v
        }
        SimEvent::Checkpoint { .. } => vec![
            (Patch { decay: 0.12, volume: 0.1, ..Patch::new(Sine, 1174.7) }, 0.0),
            (Patch { decay: 0.2, volume: 0.1, ..Patch::new(Sine, 1568.0) }, 0.07),
        ],
        SimEvent::Splash { .. } => vec![(
            Patch { attack: 0.01, decay: 0.35, volume: 0.25, cutoff: 3000.0, cutoff_end: 400.0, ..Patch::new(Noise, 1.0) },
            0.0,
        )],
        SimEvent::Pad { .. } => {
            vec![(Patch { freq_end: 1200.0, glide: 0.08, decay: 0.12, volume: 0.1, ..Patch::new(Sine, 600.0) }, 0.0)]
        }
        SimEvent::Grab { .. } => {
            vec![(Patch { decay: 0.05, volume: 0.12, cutoff: 1500.0, cutoff_end: 600.0, ..Patch::new(Noise, 1.0) }, 0.0)]
        }
        SimEvent::Break { .. } => vec![
            (Patch { decay: 0.18, volume: 0.3, cutoff: 6000.0, cutoff_end: 900.0, ..Patch::new(Noise, 1.0) }, 0.0),
            (Patch { freq_end: 70.0, glide: 0.15, decay: 0.2, volume: 0.25, ..Patch::new(Sine, 160.0) }, 0.0),
        ],
        SimEvent::Crack { .. } => {
            vec![(Patch { decay: 0.04, volume: 0.12, cutoff: 5000.0, cutoff_end: 2000.0, ..Patch::new(Noise, 1.0) }, 0.0)]
        }
        SimEvent::Bounce { .. } => {
            vec![(Patch { freq_end: 900.0, glide: 0.18, decay: 0.22, volume: 0.16, ..Patch::new(Sine, 180.0) }, 0.0)]
        }
        SimEvent::Roll { .. } => vec![(
            Patch { attack: 0.02, decay: 0.2, volume: 0.1, cutoff: 600.0, cutoff_end: 2400.0, ..Patch::new(Noise, 1.0) },
            0.0,
        )],
        SimEvent::Spotted { .. } => vec![
            (Patch { decay: 0.18, volume: 0.16, ..Patch::new(Square, 990.0) }, 0.0),
            (Patch { decay: 0.25, volume: 0.16, ..Patch::new(Square, 660.0) }, 0.16),
        ],
        SimEvent::Shot { .. } => {
            vec![(Patch { freq_end: 420.0, glide: 0.06, decay: 0.06, volume: 0.05, ..Patch::new(Square, 1500.0) }, 0.0)]
        }
        SimEvent::Damage { .. } => {
            vec![(Patch { decay: 0.03, volume: 0.08, cutoff: 3500.0, cutoff_end: 1200.0, ..Patch::new(Noise, 1.0) }, 0.0)]
        }
        SimEvent::Destroyed { size, .. } => {
            let v = size.clamp(0.4, 2.0);
            vec![
                (
                    Patch {
                        attack: 0.003,
                        decay: 0.3,
                        volume: 0.35 * v,
                        cutoff: 5000.0,
                        cutoff_end: 200.0,
                        ..Patch::new(Noise, 1.0)
                    },
                    0.0,
                ),
                (Patch { freq_end: 40.0, glide: 0.35, decay: 0.4, volume: 0.4 * v, ..Patch::new(Sine, 140.0) }, 0.0),
            ]
        }
        SimEvent::Cue { id, gain, pitch, .. } => cue_patch(*id, *gain, *pitch),
        _ => Vec::new(),
    }
}

fn cue_patch(id: u16, gain: f32, pitch: f32) -> Vec<(Patch, f32)> {
    use Wave::*;
    let g = gain.clamp(0.05, 1.0);
    let p = pitch.clamp(0.5, 2.0);
    let one = |wave, freq, decay, volume, cutoff| {
        vec![(
            Patch {
                freq_end: freq * p,
                decay,
                volume: volume * g,
                cutoff,
                cutoff_end: cutoff * 0.5,
                ..Patch::new(wave, freq * p)
            },
            0.0,
        )]
    };
    match id {
        1 => one(Square, 1400.0, 0.04, 0.16, 5000.0),
        2 => one(Noise, 800.0, 0.06, 0.2, 4000.0),
        3 => one(Noise, 300.0, 0.08, 0.18, 1200.0),
        4 => one(Square, 900.0, 0.03, 0.14, 3000.0),
        5 => one(Sine, 420.0, 0.07, 0.2, 2000.0),
        6 => one(Saw, 1800.0, 0.05, 0.12, 6000.0),
        7 => one(Noise, 180.0, 0.16, 0.22, 700.0),
        8 => one(Saw, 660.0, 0.12, 0.1, 2500.0),
        9 => one(Noise, 2400.0, 0.08, 0.16, 7000.0),
        10 => one(Sine, 520.0, 0.09, 0.16, 1800.0),
        11 => one(Noise, 1400.0, 0.1, 0.12, 5000.0),
        12 => one(Sine, 880.0, 0.12, 0.18, 4000.0),
        13 => one(Saw, 240.0, 0.4, 0.12, 1600.0),
        14 => one(Sine, 70.0, 0.2, 0.4, 400.0),
        15 => one(Sine, 90.0, 0.08, 0.22, 500.0),
        16 => one(Sine, 60.0, 0.1, 0.2, 400.0),
        17 => one(Square, 1040.0, 0.05, 0.1, 3000.0),
        18 => one(Square, 740.0, 0.18, 0.16, 2000.0),
        19 => one(Square, 1320.0, 0.1, 0.16, 4000.0),
        20 => one(Square, 990.0, 0.08, 0.14, 3500.0),
        21 => one(Sine, 1600.0, 0.03, 0.08, 5000.0),
        22 => one(Saw, 220.0, 0.3, 0.2, 900.0),
        23 => one(Noise, 200.0, 0.2, 0.28, 1500.0),
        24 => one(Square, 700.0, 0.04, 0.1, 2500.0),
        25 => one(Sine, 880.0, 0.08, 0.14, 3000.0),
        26 => one(Square, 300.0, 0.06, 0.12, 1200.0),
        27 => one(Square, 440.0, 0.2, 0.2, 1800.0),
        28 => one(Saw, 110.0, 0.6, 0.18, 800.0),
        29 => one(Square, 180.0, 0.1, 0.16, 900.0),
        30 => one(Sine, 1400.0, 0.12, 0.1, 5000.0),
        31 => vec![(
            Patch {
                decay: 0.05,
                hold: 0.02,
                volume: 0.2 * g,
                formant_hz: 700.0 * p,
                formant_hz2: 1400.0 * p,
                ..Patch::new(Saw, 180.0 * p)
            },
            0.0,
        )],
        _ => one(Sine, 440.0, 0.08, 0.12, 2000.0),
    }
}

/// Position of an event (None = not spatial).
pub fn event_pos(ev: &SimEvent) -> Option<Vec3> {
    match ev {
        SimEvent::Jump { pos }
        | SimEvent::Land { pos, .. }
        | SimEvent::Step { pos }
        | SimEvent::Throw { pos }
        | SimEvent::Explosion { pos, .. }
        | SimEvent::Impact { pos, .. }
        | SimEvent::Hit { pos, .. }
        | SimEvent::Splash { pos }
        | SimEvent::Grab { pos }
        | SimEvent::Roll { pos }
        | SimEvent::Break { pos }
        | SimEvent::Crack { pos }
        | SimEvent::Bounce { pos }
        | SimEvent::Shot { pos }
        | SimEvent::Damage { pos }
        | SimEvent::Destroyed { pos, .. }
        | SimEvent::Swing { pos, .. }
        | SimEvent::Strike { pos, .. }
        | SimEvent::Slain { pos, .. }
        | SimEvent::Slam { pos, .. }
        | SimEvent::Blast { pos, .. }
        | SimEvent::Spell { pos, .. }
        | SimEvent::Coin { pos }
        | SimEvent::Loot { pos, .. }
        | SimEvent::Pickup { pos, .. }
        | SimEvent::Block { pos }
        | SimEvent::Cue { pos, .. } => Some(*pos),
        _ => None,
    }
}

/// Plays an event's sounds with distance attenuation and panning.
pub fn play_event(mixer: &mut Mixer, ev: &SimEvent, l: &Listener, sfx: f32) {
    let (pan, gain) = match event_pos(ev) {
        Some(p) => {
            let d = p - l.pos;
            let dist = d.length();
            ((d.dot(l.right) / 12.0).clamp(-0.85, 0.85), 1.0 / (1.0 + dist / 14.0))
        }
        None => (0.0, 1.0),
    };
    for (patch, delay) in sounds_for(ev) {
        mixer.play(patch, pan, gain * sfx, delay);
    }
}

/// Renders timed events offline: (time in seconds, event). Returns interleaved stereo.
pub fn render_events(events: &[(f32, SimEvent)], duration: f32, sample_rate: f32, l: &Listener) -> Vec<f32> {
    let mut mixer = Mixer::new(sample_rate);
    let total = (duration * sample_rate) as usize;
    let mut out = vec![0.0f32; total * 2];
    let block = 256;
    let mut i = 0;
    let mut ev = events.iter().peekable();
    while i < total {
        let t = i as f32 / sample_rate;
        while let Some((et, e)) = ev.peek() {
            if *et > t {
                break;
            }
            play_event(&mut mixer, e, l, 1.0);
            ev.next();
        }
        let n = block.min(total - i);
        mixer.render(&mut out[i * 2..(i + n) * 2]);
        i += n;
    }
    out
}

/// Writes interleaved stereo f32 samples as a 16-bit PCM WAV file.
pub fn write_wav(path: &std::path::Path, samples: &[f32], sample_rate: u32) -> std::io::Result<()> {
    let data_len = (samples.len() * 2) as u32;
    let mut b = Vec::with_capacity(44 + data_len as usize);
    b.extend_from_slice(b"RIFF");
    b.extend_from_slice(&(36 + data_len).to_le_bytes());
    b.extend_from_slice(b"WAVEfmt ");
    b.extend_from_slice(&16u32.to_le_bytes());
    b.extend_from_slice(&1u16.to_le_bytes()); // PCM
    b.extend_from_slice(&2u16.to_le_bytes()); // stereo
    b.extend_from_slice(&sample_rate.to_le_bytes());
    b.extend_from_slice(&(sample_rate * 4).to_le_bytes());
    b.extend_from_slice(&4u16.to_le_bytes());
    b.extend_from_slice(&16u16.to_le_bytes());
    b.extend_from_slice(b"data");
    b.extend_from_slice(&data_len.to_le_bytes());
    for s in samples {
        b.extend_from_slice(&((s.clamp(-1.0, 1.0) * 32767.0) as i16).to_le_bytes());
    }
    if let Some(d) = path.parent().filter(|d| !d.as_os_str().is_empty()) {
        std::fs::create_dir_all(d)?;
    }
    std::fs::write(path, b)
}

enum Cmd {
    Play(Patch, f32, f32, f32, u8),
    Master(f32),
    Buses(f32, f32, f32),
}

/// Live output through the default sound device.
pub struct AudioOut {
    _stream: cpal::Stream,
    tx: Sender<Cmd>,
    pub sample_rate: u32,
    pub device: String,
}

impl AudioOut {
    pub fn start() -> anyhow::Result<Self> {
        use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
        let host = cpal::default_host();
        let device = host.default_output_device().ok_or_else(|| anyhow::anyhow!("no sound output device"))?;
        let name = device.description().map(|d| d.to_string()).unwrap_or_else(|_| "default".into());
        let supported = device.default_output_config()?;
        let format = supported.sample_format();
        let config: cpal::StreamConfig = supported.config();
        let rate = config.sample_rate as u32;
        let channels = config.channels as usize;
        let (tx, rx) = channel::<Cmd>();
        let stream = match format {
            cpal::SampleFormat::F32 => build::<f32>(&device, config, rx, channels)?,
            cpal::SampleFormat::I16 => build::<i16>(&device, config, rx, channels)?,
            cpal::SampleFormat::U16 => build::<u16>(&device, config, rx, channels)?,
            other => anyhow::bail!("unsupported sample format {other:?}"),
        };
        stream.play()?;
        Ok(Self { _stream: stream, tx, sample_rate: rate, device: name })
    }

    pub fn play_event(&self, ev: &SimEvent, l: &Listener, sfx: f32) {
        let (pan, gain) = match event_pos(ev) {
            Some(p) => {
                let d = p - l.pos;
                ((d.dot(l.right) / 12.0).clamp(-0.85, 0.85), 1.0 / (1.0 + d.length() / 14.0))
            }
            None => (0.0, 1.0),
        };
        for (patch, delay) in sounds_for(ev) {
            let _ = self.tx.send(Cmd::Play(patch, pan, gain * sfx, delay, BUS_EFFECTS));
        }
    }

    pub fn play_bus(&self, patch: Patch, pan: f32, gain: f32, delay: f32, bus: u8) {
        let _ = self.tx.send(Cmd::Play(patch, pan, gain, delay, bus));
    }

    pub fn set_buses(&self, music: f32, effects: f32, voices: f32) {
        let _ = self.tx.send(Cmd::Buses(music, effects, voices));
    }

    pub fn set_master(&self, v: f32) {
        let _ = self.tx.send(Cmd::Master(v));
    }

    /// Starts output again. Browsers keep sound off until the page gets a click or key press,
    /// so the browser build calls this on the first input.
    pub fn resume(&self) {
        use cpal::traits::StreamTrait;
        let _ = self._stream.play();
    }
}

fn build<T>(device: &cpal::Device, config: cpal::StreamConfig, rx: Receiver<Cmd>, channels: usize) -> anyhow::Result<cpal::Stream>
where
    T: cpal::SizedSample + cpal::FromSample<f32>,
{
    use cpal::traits::DeviceTrait;
    let mut mixer = Mixer::new(config.sample_rate as f32);
    let mut buf: Vec<f32> = Vec::new();
    let stream = device.build_output_stream::<T, _, _>(
        config,
        move |data: &mut [T], _| {
            while let Ok(c) = rx.try_recv() {
                match c {
                    Cmd::Play(p, pan, gain, delay, bus) => mixer.play_on(p, pan, gain, delay, bus),
                    Cmd::Master(v) => mixer.master = v,
                    Cmd::Buses(m, e, v) => {
                        mixer.music = m;
                        mixer.effects = e;
                        mixer.voices_gain = v;
                    }
                }
            }
            let frames = data.len() / channels.max(1);
            buf.resize(frames * 2, 0.0);
            mixer.render(&mut buf);
            for (i, frame) in data.chunks_mut(channels.max(1)).enumerate() {
                for (c, s) in frame.iter_mut().enumerate() {
                    *s = T::from_sample(buf[i * 2 + c.min(1)]);
                }
            }
        },
        |e| log::warn!("audio stream error: {e}"),
        None,
    )?;
    Ok(stream)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn explosion_is_loud_then_silent() {
        let ev = SimEvent::Explosion { pos: Vec3::ZERO, radius: 1.35 };
        let out = render_events(&[(0.0, ev)], 2.0, 22050.0, &Listener::default());
        let peak_early = out[..22050].iter().fold(0.0f32, |m, s| m.max(s.abs()));
        let peak_late = out[out.len() - 2000..].iter().fold(0.0f32, |m, s| m.max(s.abs()));
        assert!(peak_early > 0.1, "audible: {peak_early}");
        assert!(peak_late < 1e-3, "decays: {peak_late}");
    }

    #[test]
    fn music_bus_defaults_quiet_and_every_cue_speaks() {
        let mixer = Mixer::new(48000.0);
        assert!((mixer.music - 0.10).abs() < 1e-6);
        assert!((mixer.effects - 0.80).abs() < 1e-6);
        assert!((mixer.voices_gain - 0.70).abs() < 1e-6);
        for id in 1..32 {
            let ev = SimEvent::Cue { id, pos: Vec3::ZERO, gain: 0.8, pitch: 1.0 };
            let out = render_events(&[(0.0, ev)], 0.4, 22050.0, &Listener::default());
            let peak = out.iter().fold(0.0f32, |m, s| m.max(s.abs()));
            assert!(peak > 0.001, "cue {id} silent {peak}");
        }
        for name in music::TRACKS {
            let out = music::render_track(name, 1.2, 90.0);
            let peak = out.iter().fold(0.0f32, |m, s| m.max(s.abs()));
            assert!(peak > 0.001, "{name} silent {peak}");
        }
        let voice = voice::render_line("Mara Quill", "Hold the line.");
        let peak = voice.iter().fold(0.0f32, |m, s| m.max(s.abs()));
        assert!(peak > 0.001, "voice silent {peak}");
    }
}
