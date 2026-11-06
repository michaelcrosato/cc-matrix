//! Synthesized sound: every sound is built from oscillators, noise, envelopes, pitch sweeps
//! and a filter. The mixer runs in the audio callback (cpal) or offline (to .wav). The game
//! runs fine without a sound device.

use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
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
    /// Two parallel band-passes when non-zero: a voice's formants (Hz).
    pub f1: f32,
    pub f2: f32,
    /// 0 sound effects, 1 music, 2 voice.
    pub bus: u8,
    /// A slow wobble of the low-pass (Hz; 0 = none): pads breathe with it.
    pub lfo: f32,
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
            f1: 0.0,
            f2: 0.0,
            bus: 0,
            lfo: 0.0,
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
    noise: u32,
    gain_l: f32,
    gain_r: f32,
    /// Formant band-pass states (low, band), one pair per formant.
    bp: [f32; 4],
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
        let cutoff = if p.lfo > 0.0 { cutoff * (1.0 + 0.55 * (std::f32::consts::TAU * p.lfo * self.t).sin()) } else { cutoff };
        let a = 1.0 - (-std::f32::consts::TAU * cutoff * dt).exp();
        self.lp += (raw - self.lp) * a;
        let mut out = self.lp;
        if p.f1 > 0.0 {
            // Two state-variable band-passes in parallel.
            let mut sum = 0.0;
            for (k, f) in [p.f1, p.f2].into_iter().enumerate() {
                let g = (std::f32::consts::TAU * f * dt).min(1.4);
                let q = 0.22;
                let (low, band) = (self.bp[k * 2], self.bp[k * 2 + 1]);
                let low = low + g * band;
                let high = out - low - q * band;
                let band = band + g * high;
                self.bp[k * 2] = low;
                self.bp[k * 2 + 1] = band;
                sum += band * if k == 0 { 1.0 } else { 0.7 };
            }
            out = sum * 0.7;
        }
        let s = out * self.env() * p.volume;
        self.t += dt;
        s
    }
}

/// Mixes voices into interleaved stereo.
pub struct Mixer {
    voices: Vec<Voice>,
    pub sample_rate: f32,
    pub master: f32,
    seed: u32,
    /// Sound effects, music, voice.
    pub bus: [f32; 3],
    seq: Option<music::Sequencer>,
    /// Multiplies the music bus while a fade to silence runs.
    fade: f32,
    fading: bool,
    /// Samples since the song started (read by the rhythm clock).
    pub clock: Arc<AtomicU64>,
}

const MAX_VOICES: usize = 96;

impl Mixer {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            voices: Vec::new(),
            sample_rate,
            master: 0.8,
            seed: 0x9e37_79b9,
            bus: [1.0, 1.0, 1.0],
            seq: None,
            fade: 1.0,
            fading: false,
            clock: Arc::new(AtomicU64::new(0)),
        }
    }

    /// Starts a song from its beginning; 255 fades out over three seconds; 0 stops at once.
    pub fn set_song(&mut self, id: u8) {
        if id == 255 {
            self.fading = true;
            return;
        }
        self.fading = false;
        self.fade = 1.0;
        self.voices.retain(|v| v.p.bus != 1);
        self.seq = music::song(id).map(music::Sequencer::new);
        self.clock.store(0, Ordering::Relaxed);
    }

    /// pan -1 (left) .. 1 (right); delay in seconds.
    pub fn play(&mut self, p: Patch, pan: f32, gain: f32, delay: f32) {
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
            noise: self.seed | 1,
            gain_l: a.cos() * gain,
            gain_r: a.sin() * gain,
            bp: [0.0; 4],
        });
    }

    /// Renders into an interleaved stereo buffer (overwrites).
    pub fn render(&mut self, out: &mut [f32]) {
        let dt = 1.0 / self.sample_rate;
        for frame in out.chunks_mut(2) {
            if let Some(mut seq) = self.seq.take() {
                let rate = self.sample_rate;
                seq.tick(rate, |p, pan| self.play(p, pan, 1.0, 0.0));
                self.clock.store(seq.at, Ordering::Relaxed);
                self.seq = Some(seq);
            }
            if self.fading {
                self.fade = (self.fade - dt / 3.0).max(0.0);
                if self.fade <= 0.0 {
                    self.seq = None;
                }
            }
            let (mut l, mut r) = (0.0, 0.0);
            for v in &mut self.voices {
                let b = self.bus[(v.p.bus as usize).min(2)] * if v.p.bus == 1 { self.fade } else { 1.0 };
                let s = v.next(dt) * b;
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
        SimEvent::Sfx { id, gain, pitch } => fit_sfx(*id, *gain, *pitch),
        SimEvent::Syllable { speaker, vowel, pitch } => voice::syllable(*speaker, *vowel, *pitch),
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
        _ => Vec::new(),
    }
}

/// We Stand's sound bank, by number (`pav_core::games::fit::sfx`). Every sound is synthesized.
pub fn fit_sfx(id: u8, gain: f32, pitch: f32) -> Vec<(Patch, f32)> {
    use Wave::*;
    use pav_core::games::fit::sfx::*;
    let mut v: Vec<(Patch, f32)> = match id {
        MOVE => vec![(Patch { decay: 0.04, volume: 0.1, cutoff: 3000.0, ..Patch::new(Sine, 880.0) }, 0.0)],
        CONFIRM => vec![(Patch { decay: 0.08, volume: 0.14, ..Patch::new(Triangle, 880.0) }, 0.0), (Patch { decay: 0.12, volume: 0.14, ..Patch::new(Triangle, 1318.0) }, 0.06)],
        BACK => vec![(Patch { decay: 0.1, volume: 0.13, freq_end: 440.0, glide: 0.1, ..Patch::new(Triangle, 660.0) }, 0.0)],
        STAMP => vec![(Patch { freq_end: 40.0, glide: 0.1, decay: 0.22, volume: 0.6, ..Patch::new(Sine, 150.0) }, 0.0), (Patch { decay: 0.1, volume: 0.35, cutoff: 1500.0, cutoff_end: 300.0, ..Patch::new(Noise, 1.0) }, 0.0)],
        GULP => vec![(Patch { freq_end: 90.0, glide: 0.2, attack: 0.02, decay: 0.2, volume: 0.45, ..Patch::new(Sine, 260.0) }, 0.0), (Patch { freq_end: 70.0, glide: 0.2, attack: 0.02, decay: 0.2, volume: 0.4, ..Patch::new(Sine, 200.0) }, 0.2)],
        TICK => vec![(Patch { decay: 0.025, volume: 0.2, ..Patch::new(Square, 1400.0) }, 0.0)],
        STEP => vec![(Patch { decay: 0.05, volume: 0.22, cutoff: 1800.0, cutoff_end: 500.0, ..Patch::new(Noise, 1.0) }, 0.0)],
        SQUEAK => vec![(Patch { freq_end: 1400.0, glide: 0.12, attack: 0.01, decay: 0.14, volume: 0.22, f1: 900.0, f2: 2200.0, ..Patch::new(Saw, 620.0) }, 0.0)],
        CREAK => vec![(Patch { freq_end: 95.0, glide: 0.4, attack: 0.03, decay: 0.4, volume: 0.2, cutoff: 900.0, duty: 0.1, ..Patch::new(Square, 140.0) }, 0.0)],
        SPLASH_S => vec![(Patch { attack: 0.01, decay: 0.25, volume: 0.25, cutoff: 3000.0, cutoff_end: 500.0, ..Patch::new(Noise, 1.0) }, 0.0)],
        SPLASH_B => vec![(Patch { attack: 0.005, decay: 0.7, sustain: 0.2, hold: 0.1, release: 0.7, volume: 0.65, cutoff: 5000.0, cutoff_end: 250.0, ..Patch::new(Noise, 1.0) }, 0.0), (Patch { freq_end: 36.0, glide: 0.3, decay: 0.45, volume: 0.6, ..Patch::new(Sine, 120.0) }, 0.0)],
        GULL => vec![(Patch { freq_end: 720.0, glide: 0.15, attack: 0.01, decay: 0.2, volume: 0.17, f1: 1100.0, f2: 2600.0, ..Patch::new(Saw, 1100.0) }, 0.0), (Patch { freq_end: 640.0, glide: 0.2, attack: 0.01, decay: 0.26, volume: 0.17, f1: 1100.0, f2: 2600.0, ..Patch::new(Saw, 980.0) }, 0.2)],
        MURMUR => vec![(Patch { attack: 0.4, decay: 0.6, sustain: 0.5, hold: 0.6, release: 0.7, volume: 0.1, cutoff: 700.0, cutoff_end: 500.0, ..Patch::new(Noise, 1.0) }, 0.0)],
        CLAP => vec![(Patch { attack: 0.001, decay: 0.07, release: 0.03, volume: 0.3, cutoff: 5000.0, cutoff_end: 1800.0, ..Patch::new(Noise, 1.0) }, 0.0)],
        GONG => vec![(Patch { attack: 0.004, decay: 1.8, release: 0.6, volume: 0.28, ..Patch::new(Sine, 160.0) }, 0.0), (Patch { attack: 0.004, decay: 1.2, volume: 0.14, ..Patch::new(Sine, 437.0) }, 0.0), (Patch { attack: 0.004, decay: 0.7, volume: 0.08, ..Patch::new(Sine, 1011.0) }, 0.0)],
        BELL => vec![(Patch { attack: 0.002, decay: 0.8, release: 0.2, volume: 0.22, ..Patch::new(Sine, 660.0) }, 0.0), (Patch { attack: 0.002, decay: 0.4, volume: 0.1, ..Patch::new(Sine, 1660.0) }, 0.0)],
        WHOOSH => vec![(Patch { attack: 0.08, decay: 0.25, volume: 0.22, cutoff: 700.0, cutoff_end: 4200.0, ..Patch::new(Noise, 1.0) }, 0.0)],
        ROLL => vec![(Patch { attack: 0.01, decay: 0.09, volume: 0.1, cutoff: 900.0, cutoff_end: 500.0, ..Patch::new(Noise, 1.0) }, 0.0)],
        PLOP => vec![(Patch { freq_end: 900.0, glide: 0.1, decay: 0.12, volume: 0.3, ..Patch::new(Sine, 260.0) }, 0.0)],
        GLASS => vec![(Patch { decay: 0.3, volume: 0.15, ..Patch::new(Sine, 2100.0) }, 0.0), (Patch { freq_end: 700.0, glide: 0.12, decay: 0.15, volume: 0.3, ..Patch::new(Sine, 300.0) }, 0.25)],
        POP => vec![(Patch { freq_end: 1100.0, glide: 0.04, decay: 0.05, volume: 0.3, ..Patch::new(Sine, 420.0) }, 0.0), (Patch { decay: 0.04, volume: 0.1, ..Patch::new(Noise, 1.0) }, 0.0)],
        GUST => vec![(Patch { attack: 0.4, decay: 0.9, release: 0.5, volume: 0.22, cutoff: 500.0, cutoff_end: 1500.0, ..Patch::new(Noise, 1.0) }, 0.0)],
        WAVE => vec![(Patch { attack: 0.2, decay: 0.8, release: 0.4, volume: 0.32, cutoff: 1700.0, cutoff_end: 500.0, ..Patch::new(Noise, 1.0) }, 0.0)],
        SEA => vec![(Patch { attack: 1.4, decay: 1.8, release: 1.4, volume: 0.07, cutoff: 900.0, cutoff_end: 500.0, ..Patch::new(Noise, 1.0) }, 0.0)],
        TONE => vec![(Patch { attack: 0.01, decay: 0.15, release: 0.03, volume: 0.22, ..Patch::new(Sine, 440.0) }, 0.0)],
        CHIME => vec![(Patch { attack: 0.002, decay: 0.7, release: 0.2, volume: 0.22, ..Patch::new(Sine, 880.0) }, 0.0), (Patch { attack: 0.002, decay: 0.35, volume: 0.09, ..Patch::new(Sine, 1760.0) }, 0.0)],
        STAR => vec![(Patch { decay: 0.3, volume: 0.18, ..Patch::new(Triangle, 1046.0) }, 0.0)],
        GROAN => vec![(Patch { freq_end: 90.0, glide: 0.8, attack: 0.15, decay: 0.8, release: 0.3, volume: 0.17, f1: 450.0, f2: 900.0, ..Patch::new(Saw, 150.0) }, 0.0), (Patch { freq_end: 110.0, glide: 0.8, attack: 0.15, decay: 0.8, release: 0.3, volume: 0.15, f1: 500.0, f2: 1000.0, ..Patch::new(Saw, 185.0) }, 0.05)],
        CHEER => vec![(Patch { attack: 0.15, decay: 1.1, release: 0.5, volume: 0.25, cutoff: 3200.0, cutoff_end: 1500.0, ..Patch::new(Noise, 1.0) }, 0.0)],
        BURP => vec![(Patch { freq_end: 60.0, glide: 0.3, attack: 0.02, decay: 0.3, volume: 0.45, f1: 500.0, f2: 900.0, ..Patch::new(Saw, 95.0) }, 0.35)],
        BOING => vec![(Patch { freq_end: 460.0, glide: 0.16, decay: 0.2, volume: 0.25, ..Patch::new(Sine, 150.0) }, 0.0)],
        WOOD => vec![(Patch { decay: 0.05, volume: 0.32, cutoff: 3200.0, ..Patch::new(Square, 760.0) }, 0.0), (Patch { decay: 0.05, volume: 0.2, ..Patch::new(Square, 540.0) }, 0.08)],
        PERFECT => vec![(Patch { decay: 0.14, volume: 0.13, ..Patch::new(Triangle, 1568.0) }, 0.0)],
        GOOD => vec![(Patch { decay: 0.1, volume: 0.11, ..Patch::new(Triangle, 1046.0) }, 0.0)],
        COUNT => vec![(Patch { decay: 0.14, volume: 0.2, ..Patch::new(Square, 660.0) }, 0.0)],
        GO => vec![(Patch { decay: 0.4, volume: 0.22, ..Patch::new(Square, 1320.0) }, 0.0)],
        FANFARE => vec![
            (Patch { decay: 0.14, volume: 0.17, ..Patch::new(Triangle, 523.0) }, 0.0),
            (Patch { decay: 0.14, volume: 0.17, ..Patch::new(Triangle, 659.0) }, 0.11),
            (Patch { decay: 0.14, volume: 0.17, ..Patch::new(Triangle, 784.0) }, 0.22),
            (Patch { decay: 0.5, volume: 0.2, ..Patch::new(Triangle, 1047.0) }, 0.33),
        ],
        REVEAL => vec![(Patch { attack: 0.4, decay: 2.4, release: 0.3, volume: 0.1, freq_end: 880.0, glide: 2.8, ..Patch::new(Saw, 110.0) }, 0.0)],
        _ => Vec::new(),
    };
    for (p, _) in &mut v {
        p.volume *= gain;
        p.freq *= pitch;
        p.freq_end *= pitch;
    }
    v
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
        | SimEvent::Block { pos } => Some(*pos),
        _ => None,
    }
}

/// Plays an event's sounds with distance attenuation and panning.
pub fn play_event(mixer: &mut Mixer, ev: &SimEvent, l: &Listener, sfx: f32) {
    if let SimEvent::Music { song } = ev {
        mixer.set_song(*song);
        return;
    }
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
    Play(Patch, f32, f32, f32),
    Master(f32),
    Song(u8),
    Bus([f32; 3]),
}

/// Live output through the default sound device.
pub struct AudioOut {
    _stream: cpal::Stream,
    tx: Sender<Cmd>,
    pub sample_rate: u32,
    pub device: String,
    clock: Arc<AtomicU64>,
}

impl AudioOut {
    pub fn start() -> anyhow::Result<Self> {
        use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
        let host = cpal::default_host();
        let device = host.default_output_device().ok_or_else(|| anyhow::anyhow!("no sound output device"))?;
        let name = device.description().map(|d| d.to_string()).unwrap_or_else(|_| "default".into());
        let supported = device.default_output_config()?;
        let format = supported.sample_format();
        let mut config: cpal::StreamConfig = supported.config();
        // Snappier effects in the browser: half cpal's default buffer there.
        #[cfg(target_arch = "wasm32")]
        {
            config.buffer_size = cpal::BufferSize::Fixed(1024);
        }
        let rate = config.sample_rate as u32;
        let clock = Arc::new(AtomicU64::new(0));
        let channels = config.channels as usize;
        let (tx, rx) = channel::<Cmd>();
        let stream = match format {
            cpal::SampleFormat::F32 => build::<f32>(&device, config, rx, channels, clock.clone())?,
            cpal::SampleFormat::I16 => build::<i16>(&device, config, rx, channels, clock.clone())?,
            cpal::SampleFormat::U16 => build::<u16>(&device, config, rx, channels, clock.clone())?,
            other => anyhow::bail!("unsupported sample format {other:?}"),
        };
        stream.play()?;
        Ok(Self { _stream: stream, tx, sample_rate: rate, device: name, clock })
    }

    /// Seconds since the song started, by the samples rendered.
    pub fn song_seconds(&self) -> f32 {
        self.clock.load(Ordering::Relaxed) as f32 / self.sample_rate.max(1) as f32
    }

    pub fn set_buses(&self, bus: [f32; 3]) {
        let _ = self.tx.send(Cmd::Bus(bus));
    }

    pub fn play_event(&self, ev: &SimEvent, l: &Listener, sfx: f32) {
        if let SimEvent::Music { song } = ev {
            let _ = self.tx.send(Cmd::Song(*song));
            return;
        }
        let (pan, gain) = match event_pos(ev) {
            Some(p) => {
                let d = p - l.pos;
                ((d.dot(l.right) / 12.0).clamp(-0.85, 0.85), 1.0 / (1.0 + d.length() / 14.0))
            }
            None => (0.0, 1.0),
        };
        for (patch, delay) in sounds_for(ev) {
            let _ = self.tx.send(Cmd::Play(patch, pan, gain * sfx, delay));
        }
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

fn build<T>(
    device: &cpal::Device,
    config: cpal::StreamConfig,
    rx: Receiver<Cmd>,
    channels: usize,
    clock: Arc<AtomicU64>,
) -> anyhow::Result<cpal::Stream>
where
    T: cpal::SizedSample + cpal::FromSample<f32>,
{
    use cpal::traits::DeviceTrait;
    let mut mixer = Mixer::new(config.sample_rate as f32);
    mixer.clock = clock;
    let mut buf: Vec<f32> = Vec::new();
    let stream = device.build_output_stream::<T, _, _>(
        config,
        move |data: &mut [T], _| {
            while let Ok(c) = rx.try_recv() {
                match c {
                    Cmd::Play(p, pan, gain, delay) => mixer.play(p, pan, gain, delay),
                    Cmd::Master(v) => mixer.master = v,
                    Cmd::Song(id) => mixer.set_song(id),
                    Cmd::Bus(b) => mixer.bus = b,
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

    fn rms(buf: &[f32]) -> f32 {
        (buf.iter().map(|s| s * s).sum::<f32>() / buf.len().max(1) as f32).sqrt()
    }

    fn song_rms(id: u8, music: f32, seconds: f32) -> f32 {
        let mut m = Mixer::new(24000.0);
        m.bus = [1.0, music, 1.0];
        m.set_song(id);
        let mut out = vec![0.0; (seconds * 24000.0) as usize * 2];
        m.render(&mut out);
        rms(&out)
    }

    #[test]
    fn every_song_sounds_and_music_at_ten_percent_is_a_tenth() {
        for id in music::SONG_IDS {
            let full = song_rms(id, 1.0, 12.0);
            assert!(full > 0.005, "song {id} is silent: {full}");
            let low = song_rms(id, 0.1, 12.0);
            // The soft clip bends a loud full-scale mix a little.
            let ratio = low / full;
            assert!((0.08..0.135).contains(&ratio), "song {id}: {ratio}");
        }
    }

    #[test]
    fn every_sfx_sounds_and_speakers_differ() {
        for id in 1..=pav_core::games::fit::sfx::LAST {
            let ev = SimEvent::Sfx { id, gain: 1.0, pitch: 1.0 };
            let out = render_events(&[(0.0, ev)], 3.0, 24000.0, &Listener::default());
            let peak = out.iter().fold(0.0f32, |m, s| m.max(s.abs()));
            assert!(peak > 0.01, "sfx {id} is silent: {peak}");
        }
        let voice = |speaker: u8| {
            let ev = SimEvent::Syllable { speaker, vowel: 0, pitch: 1.0 };
            render_events(&[(0.0, ev)], 0.3, 24000.0, &Listener::default())
        };
        for s in 0..9 {
            assert!(rms(&voice(s)) > 0.001, "speaker {s} is silent");
        }
        // The strongest repeat in the sound is its pitch period: Kettle's is far longer than Pip's.
        let period = |b: &[f32]| {
            let left: Vec<f32> = b.iter().step_by(2).copied().take(2400).collect();
            let score = |lag: usize| left.iter().zip(&left[lag..]).map(|(a, b)| a * b).sum::<f32>();
            (20..400).max_by(|a, b| score(*a).total_cmp(&score(*b))).unwrap()
        };
        let (pip, kettle) = (period(&voice(0)), period(&voice(2)));
        assert!(kettle > pip * 2, "Kettle's period {kettle} against Pip's {pip}");
    }

    #[test]
    fn the_music_clock_counts_and_fades_to_silence() {
        let mut m = Mixer::new(24000.0);
        m.set_song(4);
        let mut out = vec![0.0; 24000 * 2];
        m.render(&mut out);
        assert_eq!(m.clock.load(Ordering::Relaxed), 24000);
        m.set_song(255);
        let mut out = vec![0.0; 24000 * 8];
        m.render(&mut out);
        let tail = rms(&out[out.len() - 12000..]);
        assert!(tail < 1e-3, "faded: {tail}");
    }

    #[test]
    fn explosion_is_loud_then_silent() {
        let ev = SimEvent::Explosion { pos: Vec3::ZERO, radius: 1.35 };
        let out = render_events(&[(0.0, ev)], 2.0, 22050.0, &Listener::default());
        let peak_early = out[..22050].iter().fold(0.0f32, |m, s| m.max(s.abs()));
        let peak_late = out[out.len() - 2000..].iter().fold(0.0f32, |m, s| m.max(s.abs()));
        assert!(peak_early > 0.1, "audible: {peak_early}");
        assert!(peak_late < 1e-3, "decays: {peak_late}");
    }
}
