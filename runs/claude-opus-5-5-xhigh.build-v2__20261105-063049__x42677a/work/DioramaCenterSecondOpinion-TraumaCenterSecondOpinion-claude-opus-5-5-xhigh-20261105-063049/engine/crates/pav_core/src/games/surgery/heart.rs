//! The heart: one beat clock that the ECG, the sound, the rumble, the tissue, the music and the
//! strains all read.

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Heart {
    /// 0..1 through the beat, 0 at the R wave.
    pub phase: f32,
    pub bpm: f32,
    /// R waves so far.
    pub beats: u32,
    /// Heart-seconds since the last R wave.
    pub since_r: f32,
    /// A stopped heart (Code): the trace goes flat.
    pub stopped: bool,
    /// The strain's meter: beats to the bar (0 = plain sinus).
    pub meter: u8,
    /// Beat in the bar, 0-based.
    pub bar_beat: u8,
}

impl Default for Heart {
    fn default() -> Self {
        Self { phase: 0.0, bpm: 72.0, beats: 0, since_r: 0.0, stopped: false, meter: 0, bar_beat: 0 }
    }
}

pub fn bpm_for(vitals: f32, coupling: f32) -> f32 {
    let k = (1.0 - vitals / 100.0).clamp(0.0, 1.0) * coupling;
    72.0 + (148.0 - 72.0) * k
}

impl Heart {
    /// Seconds in one beat right now.
    pub fn period(&self) -> f32 {
        60.0 / self.bpm.max(20.0)
    }

    /// Advances by `dt` of heart time; true on the tick an R wave lands.
    pub fn tick(&mut self, dt: f32, vitals: f32, coupling: f32) -> bool {
        if self.stopped {
            self.since_r += dt;
            return false;
        }
        // Tempo follows the vitals, smoothly enough not to jitter.
        let target = bpm_for(vitals, coupling);
        self.bpm += (target - self.bpm) * (1.0 - (-dt * 2.0).exp());
        self.phase += dt / self.period();
        self.since_r += dt;
        if self.phase >= 1.0 {
            self.phase -= 1.0;
            self.since_r = self.phase * self.period();
            self.beats += 1;
            if self.meter > 0 {
                self.bar_beat = (self.bar_beat + 1) % self.meter;
            } else {
                self.bar_beat = 0;
            }
            return true;
        }
        false
    }

    /// Seconds to the nearest R wave.
    pub fn off_beat(&self) -> f32 {
        let p = self.period();
        let next = (1.0 - self.phase) * p;
        self.since_r.min(next)
    }

    pub fn on_beat(&self, window_ms: f32) -> bool {
        !self.stopped && self.off_beat() <= window_ms / 1000.0
    }

    /// Diastole: the relaxed part of the beat, when a tendril gives.
    pub fn diastole(&self) -> bool {
        self.phase > 0.38 && self.phase < 0.95
    }

    /// Strain speed from the heart, clamped so failure doesn't spiral unfairly.
    pub fn strain_factor(&self) -> f32 {
        (self.bpm / 72.0).clamp(1.0, 1.4)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn falling_vitals_raise_the_tempo_and_the_beat_window_works() {
        assert_eq!(bpm_for(100.0, 1.0), 72.0);
        assert_eq!(bpm_for(0.0, 1.0), 148.0);
        assert_eq!(bpm_for(0.0, 0.0), 72.0);
        let mut h = Heart::default();
        let mut beats = 0;
        for _ in 0..620 {
            if h.tick(1.0 / 60.0, 100.0, 1.0) {
                beats += 1;
                assert!(h.on_beat(110.0));
            }
        }
        assert_eq!(beats, 12, "72 bpm for ten seconds");
    }
}
