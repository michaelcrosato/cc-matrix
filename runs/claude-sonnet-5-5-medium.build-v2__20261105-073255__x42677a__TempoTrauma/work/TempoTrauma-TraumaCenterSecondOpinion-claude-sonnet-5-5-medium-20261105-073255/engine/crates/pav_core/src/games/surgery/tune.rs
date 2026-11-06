//! Every balance number the dev panel exposes as a live slider.

use serde::{Deserialize, Serialize};

/// (key, label, default, min, max)
pub const DEFS: &[(&str, &str, f32, f32, f32)] = &[
    ("drain", "Vitals drain x", 1.0, 0.0, 3.0),
    ("timer", "Timer x", 1.0, 0.25, 3.0),
    ("power", "Tool power x", 1.0, 0.3, 3.0),
    ("iv", "IV heal x", 1.0, 0.0, 3.0),
    ("strain_speed", "Strain speed x", 1.0, 0.3, 2.5),
    ("strain_tough", "Strain toughness x", 1.0, 0.3, 3.0),
    ("coupling", "Heart coupling", 1.0, 0.0, 1.5),
    ("beat_ms", "On-beat window (ms)", 110.0, 30.0, 300.0),
    ("cursor", "Cursor speed", 1.0, 0.4, 2.0),
    ("assist", "Aim assist", 1.0, 0.0, 1.0),
    ("gift_gain", "Gift gain x", 1.0, 0.0, 4.0),
    ("gift_dur", "Gift duration x", 1.0, 0.3, 3.0),
    ("hush_scale", "Hush time scale", 0.3, 0.05, 1.0),
    ("echo_dur", "Echo duration (s)", 10.0, 2.0, 30.0),
    ("chain_window", "Chain window (s)", 6.0, 1.0, 20.0),
    ("strict", "Rating strictness", 1.0, 0.5, 2.0),
    ("wrong_pen", "Wrong-tool penalty", 0.0, 0.0, 5.0),
    ("code_window", "Code window (s)", 5.0, 2.0, 15.0),
    ("score", "Score x", 1.0, 0.1, 5.0),
];

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Tune {
    pub v: Vec<f32>,
}

impl Default for Tune {
    fn default() -> Self {
        Self { v: DEFS.iter().map(|d| d.2).collect() }
    }
}

impl Tune {
    pub fn idx(key: &str) -> Option<usize> {
        DEFS.iter().position(|d| d.0 == key)
    }
    pub fn get(&self, key: &str) -> f32 {
        Self::idx(key).and_then(|i| self.v.get(i).copied()).unwrap_or(1.0)
    }
    pub fn set(&mut self, key: &str, val: f32) {
        if let Some(i) = Self::idx(key) {
            if i >= self.v.len() {
                self.v.resize(DEFS.len(), 0.0);
            }
            self.v[i] = val.clamp(DEFS[i].3, DEFS[i].4);
        }
    }
    pub fn reset(&mut self) {
        *self = Self::default();
    }
}
