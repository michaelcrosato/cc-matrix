//! Live balance sliders. Defaults are what a fresh game and Reset All restore.

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct Tune {
    pub drain: f32,
    pub timer: f32,
    pub tool_power: f32,
    pub iv_heal: f32,
    pub strain_speed: f32,
    pub strain_tough: f32,
    pub heart_coupling: f32,
    pub beat_window_ms: f32,
    pub cursor_speed: f32,
    pub aim_assist: f32,
    pub gift_gain: f32,
    pub gift_duration: f32,
    pub hush_scale: f32,
    pub echo_duration: f32,
    pub chain_window: f32,
    pub rating_strict: f32,
    pub wrong_penalty: f32,
    pub code_window: f32,
    pub score_mul: f32,
    pub tremor: f32,
    pub music: f32,
    pub effects: f32,
    pub voices: f32,
}

impl Default for Tune {
    fn default() -> Self {
        Self {
            drain: 1.0,
            timer: 1.0,
            tool_power: 1.0,
            iv_heal: 1.0,
            strain_speed: 1.0,
            strain_tough: 1.0,
            heart_coupling: 1.0,
            beat_window_ms: 110.0,
            cursor_speed: 15.0,
            aim_assist: 1.0,
            gift_gain: 1.0,
            gift_duration: 1.0,
            hush_scale: 0.30,
            echo_duration: 10.0,
            chain_window: 8.0,
            rating_strict: 1.0,
            wrong_penalty: 1.0,
            code_window: 5.0,
            score_mul: 1.0,
            tremor: 1.0,
            music: 0.10,
            effects: 0.80,
            voices: 0.70,
        }
    }
}

impl Tune {
    pub const FIELDS: &'static [(&'static str, f32, f32, f32)] = &[
        ("vitals drain", 1.0, 0.0, 3.0),
        ("timer", 1.0, 0.2, 3.0),
        ("tool power", 1.0, 0.2, 3.0),
        ("IV heal", 1.0, 0.0, 3.0),
        ("strain speed", 1.0, 0.2, 2.5),
        ("strain toughness", 1.0, 0.2, 3.0),
        ("heart coupling", 1.0, 0.25, 2.0),
        ("on-beat window ms", 110.0, 20.0, 250.0),
        ("cursor speed", 15.0, 4.0, 30.0),
        ("aim assist", 1.0, 0.0, 2.0),
        ("gift gain", 1.0, 0.0, 4.0),
        ("gift duration", 1.0, 0.2, 3.0),
        ("Hush time scale", 0.30, 0.05, 1.0),
        ("Echo duration", 10.0, 1.0, 30.0),
        ("chain window", 8.0, 1.0, 20.0),
        ("rating strictness", 1.0, 0.4, 2.0),
        ("wrong-tool penalty", 1.0, 0.0, 3.0),
        ("Code window s", 5.0, 1.0, 12.0),
        ("score", 1.0, 0.2, 3.0),
    ];

    pub fn get(&self, id: u8) -> f32 {
        let v = [
            self.drain,
            self.timer,
            self.tool_power,
            self.iv_heal,
            self.strain_speed,
            self.strain_tough,
            self.heart_coupling,
            self.beat_window_ms,
            self.cursor_speed,
            self.aim_assist,
            self.gift_gain,
            self.gift_duration,
            self.hush_scale,
            self.echo_duration,
            self.chain_window,
            self.rating_strict,
            self.wrong_penalty,
            self.code_window,
            self.score_mul,
        ];
        v.get(id as usize).copied().unwrap_or(0.0)
    }

    pub fn set(&mut self, id: u8, value: f32) {
        let value = if let Some((_, _, lo, hi)) = Self::FIELDS.get(id as usize) {
            value.clamp(*lo, *hi)
        } else {
            value
        };
        match id {
            0 => self.drain = value,
            1 => self.timer = value,
            2 => self.tool_power = value,
            3 => self.iv_heal = value,
            4 => self.strain_speed = value,
            5 => self.strain_tough = value,
            6 => self.heart_coupling = value,
            7 => self.beat_window_ms = value,
            8 => self.cursor_speed = value,
            9 => self.aim_assist = value,
            10 => self.gift_gain = value,
            11 => self.gift_duration = value,
            12 => self.hush_scale = value,
            13 => self.echo_duration = value,
            14 => self.chain_window = value,
            15 => self.rating_strict = value,
            16 => self.wrong_penalty = value,
            17 => self.code_window = value,
            18 => self.score_mul = value,
            _ => {}
        }
    }
}
