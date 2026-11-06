//! One heartbeat clock. Vitals, the ECG, strain steps and on-beat all read it.

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Heart {
    pub vitals: f32,
    pub phase: f32,
    pub bpm: f32,
    pub since_r: f32,
    pub period: f32,
    pub beats: u32,
    pub flat: bool,
    pub ghost: f32,
}

impl Heart {
    pub fn new(vitals: f32) -> Self {
        let mut h = Self { vitals, phase: 0.0, bpm: 80.0, since_r: 1.0, period: 0.75, beats: 0, flat: false, ghost: 0.0 };
        h.recompute(1.0);
        h
    }

    pub fn recompute(&mut self, coupling: f32) {
        let t = (1.0 - self.vitals.clamp(0.0, 100.0) / 100.0).clamp(0.0, 1.0);
        let c = coupling.clamp(0.25, 2.0);
        self.bpm = (72.0 + (148.0 - 72.0) * t) * c;
        self.period = 60.0 / self.bpm.max(40.0);
    }

    /// Advances the clock. Returns true on an R-wave (world time; a flatline has none).
    pub fn tick(&mut self, dt: f32, coupling: f32) -> bool {
        self.recompute(coupling);
        self.vitals = self.vitals.clamp(0.0, 100.0);
        if self.flat {
            self.ghost = (self.ghost + dt / self.period).fract();
            self.since_r += dt;
            return false;
        }
        self.phase += dt / self.period;
        if self.phase >= 1.0 {
            self.phase = self.phase.fract();
            self.since_r = self.phase * self.period;
            self.beats = self.beats.wrapping_add(1);
            self.ghost = self.phase;
            true
        } else {
            self.since_r += dt;
            self.ghost = self.phase;
            false
        }
    }

    pub fn on_beat(&self, window_ms: f32) -> bool {
        let w = (window_ms / 1000.0).clamp(0.02, 0.4);
        self.since_r <= w || (self.period - self.since_r) <= w
    }

    /// Diastole: the quiet half, when a tendril can be pulled.
    pub fn diastole(&self) -> bool {
        self.phase > 0.28 && self.phase < 0.72
    }

    /// The ghost QRS during a flatline. `ghost` is the phase in 0..1.
    pub fn ghost_on_beat(&self, window_ms: f32) -> bool {
        let w = (window_ms / 1000.0).clamp(0.02, 0.4);
        let g = self.ghost.rem_euclid(1.0);
        let since = g * self.period;
        let until = (1.0 - g) * self.period;
        since <= w || until <= w
    }
}
