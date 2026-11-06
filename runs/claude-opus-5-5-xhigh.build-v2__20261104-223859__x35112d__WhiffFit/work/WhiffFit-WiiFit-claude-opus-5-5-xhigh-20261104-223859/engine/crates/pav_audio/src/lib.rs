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

/// Where a voice is mixed.
pub const BUS_SFX: usize = 0;
pub const BUS_VOICE: usize = 1;
pub const BUS_MUSIC: usize = 2;

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
    /// Two parallel band-pass filters (Hz, a vowel's formants); 0 = none.
    pub formant: [f32; 2],
    /// A slow wobble of the low-pass cutoff: rate (Hz) and depth (0..1 of the cutoff).
    pub lfo_rate: f32,
    pub lfo_depth: f32,
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
            formant: [0.0, 0.0],
            lfo_rate: 0.0,
            lfo_depth: 0.0,
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
    bus: usize,
    // Two state-variable band-pass filters.
    f_low: [f32; 2],
    f_band: [f32; 2],
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
        let mut cutoff = p.cutoff * (p.cutoff_end / p.cutoff.max(1.0)).powf((self.t / p.length().max(1e-3)).min(1.0));
        if p.lfo_rate > 0.0 {
            cutoff *= 1.0 + p.lfo_depth * (self.t * p.lfo_rate * std::f32::consts::TAU).sin();
        }
        let a = 1.0 - (-std::f32::consts::TAU * cutoff * dt).exp();
        self.lp += (raw - self.lp) * a;
        let mut out = self.lp;
        if p.formant[0] > 0.0 {
            out = 0.0;
            for i in 0..2 {
                let f = 2.0 * (std::f32::consts::PI * (p.formant[i] * dt).min(0.2)).sin();
                self.f_low[i] += f * self.f_band[i];
                let high = self.lp - self.f_low[i] - 0.28 * self.f_band[i];
                self.f_band[i] += f * high;
                out += self.f_band[i] * if i == 0 { 0.5 } else { 0.32 };
            }
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
    /// Gain per bus, applied to each voice as it mixes.
    pub bus: [f32; 3],
    seq: Option<music::Sequencer>,
    /// 1 while a song plays; falls to 0 as it fades out.
    fade: f32,
    fading: bool,
    /// The sequencer stands still (the game is paused).
    pub hold: bool,
    /// Samples into the song, for the rhythm clock.
    pub song_pos: Arc<AtomicU64>,
    notes: Vec<(Patch, f32)>,
}

const MAX_VOICES: usize = 128;
/// Seconds a song takes to fade to silence.
const FADE_SECONDS: f32 = 5.0;

impl Mixer {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            voices: Vec::new(),
            sample_rate,
            master: 0.8,
            seed: 0x9e37_79b9,
            bus: [1.0, 1.0, 0.1],
            seq: None,
            fade: 1.0,
            fading: false,
            hold: false,
            song_pos: Arc::new(AtomicU64::new(0)),
            notes: Vec::new(),
        }
    }

    /// Starts song `n` from its beginning; 0 fades the music to silence.
    pub fn set_song(&mut self, n: u8) {
        if n == 0 {
            self.fading = true;
            return;
        }
        if let Some(song) = music::song(n) {
            self.seq = Some(music::Sequencer::new(song, n, self.sample_rate));
            self.fading = false;
            self.fade = 1.0;
            self.song_pos.store(0, Ordering::Relaxed);
        }
    }

    pub fn song(&self) -> u8 {
        self.seq.as_ref().map(|s| s.song_id).unwrap_or(0)
    }

    /// pan -1 (left) .. 1 (right); delay in seconds.
    pub fn play(&mut self, p: Patch, pan: f32, gain: f32, delay: f32) {
        self.play_on(BUS_SFX, p, pan, gain, delay);
    }

    pub fn play_on(&mut self, bus: usize, p: Patch, pan: f32, gain: f32, delay: f32) {
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
            bus,
            f_low: [0.0; 2],
            f_band: [0.0; 2],
        });
    }

    /// Renders into an interleaved stereo buffer (overwrites).
    pub fn render(&mut self, out: &mut [f32]) {
        let dt = 1.0 / self.sample_rate;
        let mut retire = false;
        for frame in out.chunks_mut(2) {
            if !self.hold {
                if let Some(seq) = &mut self.seq {
                    seq.advance(&mut self.notes);
                    self.song_pos.store(seq.samples, Ordering::Relaxed);
                }
                if !self.notes.is_empty() {
                    let notes = std::mem::take(&mut self.notes);
                    for (p, g) in &notes {
                        self.play_on(BUS_MUSIC, *p, 0.0, *g, 0.0);
                    }
                    self.notes = notes;
                    self.notes.clear();
                }
            }
            if self.fading {
                self.fade = (self.fade - dt / FADE_SECONDS).max(0.0);
                retire |= self.fade <= 0.0;
            }
            let (mut l, mut r) = (0.0, 0.0);
            let bus = [self.bus[0], self.bus[1], self.bus[2] * self.fade];
            for v in &mut self.voices {
                let s = v.next(dt) * bus[v.bus];
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
        if retire {
            self.seq = None;
            self.voices.retain(|v| v.bus != BUS_MUSIC);
        }
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
        SimEvent::Sfx { id, gain, pitch } => {
            let mut v = sfx_bank(*id, *pitch);
            for (p, _) in &mut v {
                p.volume *= *gain;
            }
            v
        }
        SimEvent::Syllable { speaker, vowel, pitch } => voice::syllable(*speaker, *vowel, *pitch),
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

/// The game's sound bank (ids in `pav_core::games::fit::world::sound`). `pitch` scales pitched
/// sounds and the tone of noises.
pub fn sfx_bank(id: u16, pitch: f32) -> Vec<(Patch, f32)> {
    use pav_core::games::fit::world::sound as s;
    use Wave::*;
    let k = pitch.max(0.05);
    let note = |w: Wave, f: f32, decay: f32, vol: f32| Patch { decay, volume: vol, ..Patch::new(w, f * k) };
    let noise = |decay: f32, vol: f32, c0: f32, c1: f32| Patch { decay, volume: vol, cutoff: c0 * k, cutoff_end: c1 * k, ..Patch::new(Noise, 1.0) };
    match id {
        s::UI_MOVE => vec![(Patch { freq_end: 980.0 * k, glide: 0.03, ..note(Triangle, 720.0, 0.05, 0.14) }, 0.0)],
        s::UI_CONFIRM => vec![(note(Triangle, 660.0, 0.08, 0.16), 0.0), (note(Triangle, 990.0, 0.12, 0.15), 0.06)],
        s::UI_BACK => vec![(Patch { freq_end: 330.0 * k, glide: 0.08, ..note(Triangle, 560.0, 0.1, 0.14) }, 0.0)],
        s::STAMP => vec![
            (Patch { freq_end: 50.0, glide: 0.09, ..note(Sine, 170.0, 0.2, 0.7) }, 0.0),
            (noise(0.06, 0.42, 3200.0, 500.0), 0.0),
        ],
        s::CLAM => vec![
            (Patch { freq_end: 80.0 * k, glide: 0.2, formant: [420.0, 900.0], ..note(Saw, 150.0, 0.22, 0.6) }, 0.0),
            (Patch { freq_end: 180.0 * k, glide: 0.12, formant: [340.0, 700.0], ..note(Saw, 95.0, 0.18, 0.5) }, 0.2),
        ],
        s::AGE_TICK => vec![(note(Square, 880.0, 0.022, 0.09), 0.0)],
        s::STEP => vec![(noise(0.05, 0.16, 1800.0, 500.0), 0.0), (Patch { freq_end: 70.0, glide: 0.05, ..note(Sine, 130.0, 0.06, 0.18) }, 0.0)],
        s::PIP_SQUEAK => vec![(Patch { freq_end: 1300.0 * k, glide: 0.1, formant: [900.0, 2300.0], ..note(Saw, 620.0, 0.14, 0.6) }, 0.0)],
        s::CREAK => vec![(Patch { freq_end: 210.0 * k, glide: 0.3, duty: 0.2, cutoff: 1400.0, ..note(Square, 150.0, 0.32, 0.14) }, 0.0)],
        s::SPLASH_S => vec![(Patch { attack: 0.01, ..noise(0.24, 0.3, 3400.0, 500.0) }, 0.0)],
        s::SPLASH_B => vec![
            (Patch { attack: 0.01, sustain: 0.3, hold: 0.25, release: 0.5, ..noise(0.3, 0.8, 5200.0, 300.0) }, 0.0),
            (Patch { freq_end: 40.0, glide: 0.35, ..note(Sine, 120.0, 0.45, 0.7) }, 0.0),
        ],
        s::GULL => vec![
            (Patch { freq_end: 900.0 * k, glide: 0.1, formant: [900.0, 2600.0], ..note(Saw, 1300.0, 0.12, 0.42) }, 0.0),
            (Patch { freq_end: 800.0 * k, glide: 0.1, formant: [900.0, 2600.0], ..note(Saw, 1200.0, 0.1, 0.34) }, 0.16),
        ],
        s::CROWD => vec![(Patch { attack: 0.5, sustain: 0.6, hold: 1.0, release: 0.9, lfo_rate: 2.0, lfo_depth: 0.4, ..noise(0.3, 0.2, 700.0, 500.0) }, 0.0)],
        s::CLAP => (0..5)
            .map(|i| (noise(0.05, 0.14, 4200.0, 1800.0), i as f32 * 0.025 + (i % 2) as f32 * 0.01))
            .collect(),
        s::GONG => vec![
            (Patch { lfo_rate: 5.0, lfo_depth: 0.3, ..note(Sine, 180.0, 1.6, 0.34) }, 0.0),
            (note(Sine, 271.0, 1.2, 0.2), 0.0),
            (note(Sine, 433.0, 0.8, 0.12), 0.0),
        ],
        s::BELL => vec![(note(Sine, 620.0, 0.9, 0.3), 0.0), (note(Sine, 1240.0, 0.5, 0.12), 0.0)],
        s::WHOOSH => vec![(Patch { attack: 0.05, ..noise(0.3, 0.26, 700.0, 4800.0) }, 0.0)],
        s::SHELL_ROLL => vec![(noise(0.08, 0.2, 2300.0, 900.0), 0.0)],
        s::SHELL_PLOP => vec![(Patch { freq_end: 880.0 * k, glide: 0.08, ..note(Sine, 300.0, 0.11, 0.5) }, 0.0), (noise(0.08, 0.12, 2500.0, 800.0), 0.02)],
        s::GLASS_PLOP => vec![
            (note(Sine, 1760.0, 0.05, 0.22), 0.0),
            (Patch { freq_end: 720.0 * k, glide: 0.1, ..note(Sine, 240.0, 0.14, 0.5) }, 0.3),
            (noise(0.1, 0.16, 2600.0, 700.0), 0.3),
        ],
        s::CONFETTI => vec![
            (noise(0.04, 0.5, 6000.0, 2000.0), 0.0),
            (note(Triangle, 1320.0, 0.2, 0.14), 0.05),
            (note(Triangle, 1760.0, 0.2, 0.14), 0.11),
            (note(Triangle, 2093.0, 0.3, 0.14), 0.17),
        ],
        s::GUST => vec![(Patch { attack: 0.25, lfo_rate: 3.0, lfo_depth: 0.6, ..noise(0.8, 0.26, 1200.0, 500.0) }, 0.0)],
        s::WAVE => vec![(Patch { attack: 0.3, sustain: 0.4, hold: 0.2, release: 0.8, ..noise(0.4, 0.42, 2200.0, 400.0) }, 0.0)],
        s::SEA => vec![(Patch { attack: 1.6, sustain: 0.7, hold: 1.0, release: 2.6, lfo_rate: 0.3, lfo_depth: 0.5, ..noise(0.6, 0.12, 1100.0, 700.0) }, 0.0)],
        s::TONE => vec![(Patch { attack: 0.03, release: 0.05, ..note(Sine, 440.0, 0.1, 0.4) }, 0.0)],
        s::CHIME => vec![(note(Sine, 784.0, 1.3, 0.3), 0.0), (note(Sine, 1568.0, 0.8, 0.12), 0.01)],
        s::TICK => vec![(note(Square, 1400.0, 0.02, 0.14), 0.0)],
        s::STAR => vec![(note(Triangle, 1046.0, 0.13, 0.22), 0.0), (note(Triangle, 1568.0, 0.24, 0.2), 0.08)],
        s::FANFARE => vec![
            (note(Triangle, 523.0, 0.14, 0.26), 0.0),
            (note(Triangle, 659.0, 0.14, 0.26), 0.11),
            (note(Triangle, 784.0, 0.14, 0.26), 0.22),
            (note(Triangle, 1046.0, 0.5, 0.3), 0.33),
            (Patch { cutoff: 2000.0, ..note(Saw, 523.0, 0.5, 0.12) }, 0.33),
        ],
        s::SAD => vec![
            (Patch { cutoff: 1400.0, ..note(Square, 392.0, 0.2, 0.15) }, 0.0),
            (Patch { cutoff: 1400.0, ..note(Square, 370.0, 0.2, 0.15) }, 0.2),
            (Patch { cutoff: 1400.0, freq_end: 300.0, glide: 0.5, ..note(Square, 349.0, 0.6, 0.15) }, 0.4),
        ],
        s::REVEAL => vec![
            (Patch { freq_end: 880.0 * k, glide: 1.8, attack: 0.2, ..note(Triangle, 220.0, 2.0, 0.14) }, 0.0),
            (Patch { freq_end: 1320.0 * k, glide: 1.8, attack: 0.2, ..note(Triangle, 330.0, 2.0, 0.1) }, 0.0),
        ],
        s::GROAN => (0..6)
            .map(|i| {
                let f = [150.0, 180.0, 210.0, 130.0, 240.0, 165.0][i];
                let p = Patch { freq_end: f * 0.7 * k, glide: 0.8, attack: 0.08, formant: [520.0, 1000.0], ..note(Saw, f, 0.9, 0.2) };
                (p, i as f32 * 0.04)
            })
            .collect(),
        s::CATCH => vec![(Patch { freq_end: 1200.0 * k, glide: 0.07, ..note(Triangle, 500.0, 0.12, 0.3) }, 0.0)],
        s::HIT_GOOD => vec![(note(Triangle, 880.0, 0.07, 0.22), 0.0)],
        s::HIT_PERFECT => vec![(note(Triangle, 1318.0, 0.09, 0.26), 0.0), (note(Sine, 2637.0, 0.1, 0.1), 0.0)],
        s::MISS => vec![(Patch { freq_end: 150.0 * k, glide: 0.12, duty: 0.3, cutoff: 1200.0, ..note(Square, 240.0, 0.13, 0.12) }, 0.0)],
        s::COUNT => vec![(note(Square, 660.0, 0.1, 0.14), 0.0)],
        s::GO => vec![(note(Square, 1320.0, 0.26, 0.16), 0.0)],
        s::BOARD => vec![(Patch { freq_end: 340.0 * k, glide: 0.12, ..note(Sine, 120.0, 0.17, 0.42) }, 0.0)],
        s::STITCH => vec![(Patch { freq_end: 320.0, glide: 0.1, ..note(Saw, 640.0, 0.14, 0.2) }, 0.0)],
        s::RIBBON => vec![(note(Triangle, 1175.0, 0.1, 0.2), 0.0), (note(Triangle, 1760.0, 0.16, 0.18), 0.05)],
        s::BUMP => vec![(Patch { freq_end: 60.0, glide: 0.08, ..note(Sine, 140.0, 0.12, 0.5) }, 0.0), (noise(0.06, 0.2, 1400.0, 300.0), 0.0)],
        s::HEARTBEAT => vec![(Patch { freq_end: 40.0, glide: 0.06, ..note(Sine, 80.0, 0.1, 0.5) }, 0.0), (Patch { freq_end: 40.0, glide: 0.06, ..note(Sine, 70.0, 0.1, 0.4) }, 0.2)],
        _ => Vec::new(),
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
        | SimEvent::Block { pos } => Some(*pos),
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
    Play(usize, Patch, f32, f32, f32),
    Master(f32),
    Buses([f32; 3]),
    Song(u8),
    Hold(bool),
}

/// Live output through the default sound device.
pub struct AudioOut {
    _stream: cpal::Stream,
    tx: Sender<Cmd>,
    pub sample_rate: u32,
    pub device: String,
    song_pos: Arc<AtomicU64>,
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
        let song_pos = Arc::new(AtomicU64::new(0));
        // A smaller buffer than the web backend's default: snappier effects.
        #[cfg(target_arch = "wasm32")]
        let config = cpal::StreamConfig { buffer_size: cpal::BufferSize::Fixed(1024), ..config };
        let stream = match format {
            cpal::SampleFormat::F32 => build::<f32>(&device, config, rx, channels, song_pos.clone())?,
            cpal::SampleFormat::I16 => build::<i16>(&device, config, rx, channels, song_pos.clone())?,
            cpal::SampleFormat::U16 => build::<u16>(&device, config, rx, channels, song_pos.clone())?,
            other => anyhow::bail!("unsupported sample format {other:?}"),
        };
        stream.play()?;
        Ok(Self { _stream: stream, tx, sample_rate: rate, device: name, song_pos })
    }

    /// Music, effects and voice levels (0..1).
    pub fn set_buses(&self, music: f32, sfx: f32, voice: f32) {
        let mut b = [0.0; 3];
        b[BUS_MUSIC] = music;
        b[BUS_SFX] = sfx;
        b[BUS_VOICE] = voice;
        let _ = self.tx.send(Cmd::Buses(b));
    }

    /// Holds or releases the sequencer (and so the rhythm clock).
    pub fn hold_music(&self, on: bool) {
        let _ = self.tx.send(Cmd::Hold(on));
    }

    /// Seconds into the song, as far as the sound device has rendered.
    pub fn song_seconds(&self) -> f64 {
        self.song_pos.load(Ordering::Relaxed) as f64 / self.sample_rate.max(1) as f64
    }

    pub fn play_event(&self, ev: &SimEvent, l: &Listener, sfx: f32) {
        if let SimEvent::Music { song } = ev {
            let _ = self.tx.send(Cmd::Song(*song));
            return;
        }
        let bus = if matches!(ev, SimEvent::Syllable { .. }) { BUS_VOICE } else { BUS_SFX };
        let (pan, gain) = match event_pos(ev) {
            Some(p) => {
                let d = p - l.pos;
                ((d.dot(l.right) / 12.0).clamp(-0.85, 0.85), 1.0 / (1.0 + d.length() / 14.0))
            }
            None => (0.0, 1.0),
        };
        for (patch, delay) in sounds_for(ev) {
            let _ = self.tx.send(Cmd::Play(bus, patch, pan, gain * sfx, delay));
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
    song_pos: Arc<AtomicU64>,
) -> anyhow::Result<cpal::Stream>
where
    T: cpal::SizedSample + cpal::FromSample<f32>,
{
    use cpal::traits::DeviceTrait;
    let mut mixer = Mixer::new(config.sample_rate as f32);
    mixer.song_pos = song_pos;
    let mut buf: Vec<f32> = Vec::new();
    let stream = device.build_output_stream::<T, _, _>(
        config,
        move |data: &mut [T], _| {
            while let Ok(c) = rx.try_recv() {
                match c {
                    Cmd::Play(bus, p, pan, gain, delay) => mixer.play_on(bus, p, pan, gain, delay),
                    Cmd::Master(v) => mixer.master = v,
                    Cmd::Buses(b) => mixer.bus = b,
                    Cmd::Song(n) => mixer.set_song(n),
                    Cmd::Hold(h) => mixer.hold = h,
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

/// Renders `seconds` of song `n` at a music level, offline (tests).
pub fn render_song(n: u8, seconds: f32, rate: f32, music: f32) -> Vec<f32> {
    let mut m = Mixer::new(rate);
    m.bus = [1.0, 1.0, music];
    m.master = 1.0;
    m.set_song(n);
    let mut out = vec![0.0; (seconds * rate) as usize * 2];
    for chunk in out.chunks_mut(512) {
        m.render(chunk);
    }
    out
}

/// Root-mean-square of a buffer.
pub fn rms(v: &[f32]) -> f32 {
    (v.iter().map(|x| x * x).sum::<f32>() / v.len().max(1) as f32).sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn music_at_ten_percent_is_a_tenth_of_full_scale() {
        for n in 1..=music::SONG_COUNT {
            let full = rms(&render_song(n, 8.0, 22050.0, 1.0));
            let low = rms(&render_song(n, 8.0, 22050.0, 0.1));
            assert!(full > 0.01, "song {n} is silent: {full}");
            let ratio = low / full;
            assert!((0.085..0.125).contains(&ratio), "song {n}: at 10% it's {ratio} of full ({full})");
        }
    }

    #[test]
    fn every_sound_in_the_bank_makes_noise() {
        use pav_core::games::fit::world::sound;
        for id in 0..sound::TOTAL {
            let ev = SimEvent::Sfx { id, gain: 1.0, pitch: 1.0 };
            let out = render_events(&[(0.0, ev)], 3.0, 22050.0, &Listener::default());
            let peak = out.iter().fold(0.0f32, |m, s| m.max(s.abs()));
            assert!(peak > 0.005, "sound {id} is silent");
        }
    }

    #[test]
    fn speakers_differ() {
        let render = |speaker| {
            let ev = SimEvent::Syllable { speaker, vowel: 0, pitch: 1.0 };
            render_events(&[(0.0, ev)], 0.3, 22050.0, &Listener::default())
        };
        let mut sounds = Vec::new();
        for s in 0..8 {
            let out = render(s);
            assert!(rms(&out) > 0.001, "speaker {s} is silent");
            // Crossings per second: a rough pitch.
            let zc = out.chunks(2).map(|c| c[0]).collect::<Vec<_>>().windows(2).filter(|w| w[0] * w[1] < 0.0).count();
            sounds.push(zc);
        }
        for a in 0..8 {
            for b in a + 1..8 {
                assert_ne!(render(a as u8), render(b as u8), "speakers {a} and {b} sound the same");
            }
        }
        // Kettle is far lower than Pip.
        assert!(sounds[2] < sounds[0], "Kettle {} Pip {}", sounds[2], sounds[0]);
    }

    #[test]
    fn every_song_makes_noise() {
        for n in 1..=music::SONG_COUNT {
            let mut m = Mixer::new(22050.0);
            m.bus = [1.0, 1.0, 1.0];
            m.set_song(n);
            let mut b = vec![0.0; 22050 * 8];
            m.render(&mut b);
            assert!(rms(&b) > 0.002, "song {n} is silent: {}", rms(&b));
        }
    }

    #[test]
    fn a_song_fades_to_silence_and_holds_still() {
        let mut m = Mixer::new(22050.0);
        m.bus = [1.0, 1.0, 1.0];
        m.set_song(6);
        let mut b = vec![0.0; 22050 * 2];
        m.render(&mut b);
        assert!(rms(&b) > 0.01);
        let at = m.song_pos.load(Ordering::Relaxed);
        assert!(at > 20000);
        m.hold = true;
        m.render(&mut b);
        assert_eq!(m.song_pos.load(Ordering::Relaxed), at);
        m.hold = false;
        m.set_song(0);
        for _ in 0..7 {
            m.render(&mut b);
        }
        assert!(rms(&b) < 1e-3, "faded: {}", rms(&b));
        assert_eq!(m.song(), 0);
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
