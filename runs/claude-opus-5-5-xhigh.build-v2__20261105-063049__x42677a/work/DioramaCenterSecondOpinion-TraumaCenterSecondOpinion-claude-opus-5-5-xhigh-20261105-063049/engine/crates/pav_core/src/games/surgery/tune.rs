//! Every balance number a designer wants under a live slider, and the difficulty table.

use serde::{Deserialize, Serialize};

/// One live slider of the dev panel.
pub struct Slider {
    pub key: &'static str,
    pub label: &'static str,
    pub min: f32,
    pub max: f32,
    pub default: f32,
}

const fn s(key: &'static str, label: &'static str, min: f32, max: f32, default: f32) -> Slider {
    Slider { key, label, min, max, default }
}

pub const DRAIN: usize = 0;
pub const TIMER: usize = 1;
pub const TOOL_POWER: usize = 2;
pub const IV_HEAL: usize = 3;
pub const STRAIN_SPEED: usize = 4;
pub const STRAIN_TOUGH: usize = 5;
pub const COUPLING: usize = 6;
pub const BEAT_WINDOW: usize = 7;
pub const CURSOR_SPEED: usize = 8;
pub const AIM_ASSIST: usize = 9;
pub const GIFT_GAIN: usize = 10;
pub const GIFT_TIME: usize = 11;
pub const HUSH_SCALE: usize = 12;
pub const ECHO_TIME: usize = 13;
pub const CHAIN_WINDOW: usize = 14;
pub const STRICT: usize = 15;
pub const WRONG_TOOL: usize = 16;
pub const CODE_WINDOW: usize = 17;
pub const SCORE: usize = 18;

/// The sliders, in panel order.
pub const SLIDERS: [Slider; 19] = [
    s("drain", "Vitals drain", 0.0, 3.0, 1.0),
    s("timer", "Timer", 0.25, 3.0, 1.0),
    s("tool_power", "Tool power", 0.25, 3.0, 1.0),
    s("iv_heal", "IV heal", 0.0, 3.0, 1.0),
    s("strain_speed", "Strain speed", 0.25, 2.5, 1.0),
    s("strain_tough", "Strain toughness", 0.25, 3.0, 1.0),
    s("coupling", "Heart coupling", 0.0, 1.5, 1.0),
    s("beat_window", "On-beat window (ms)", 30.0, 300.0, 110.0),
    s("cursor_speed", "Cursor speed", 5.0, 30.0, 15.0),
    s("aim_assist", "Aim assist", 0.0, 1.0, 1.0),
    s("gift_gain", "Gift gain", 0.0, 4.0, 1.0),
    s("gift_time", "Gift duration", 0.25, 3.0, 1.0),
    s("hush_scale", "Hush time scale", 0.05, 1.0, 0.3),
    s("echo_time", "Echo duration (s)", 2.0, 30.0, 10.0),
    s("chain_window", "Chain window (s)", 2.0, 20.0, 8.0),
    s("strict", "Rating strictness", 0.5, 2.0, 1.0),
    s("wrong_tool", "Wrong-tool penalty", 0.0, 10.0, 0.0),
    s("code_window", "Code window (s)", 1.0, 15.0, 5.0),
    s("score", "Score", 0.0, 5.0, 1.0),
];

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Tune {
    pub v: [f32; SLIDERS.len()],
}

impl Default for Tune {
    fn default() -> Self {
        let mut v = [0.0; SLIDERS.len()];
        let mut i = 0;
        while i < SLIDERS.len() {
            v[i] = SLIDERS[i].default;
            i += 1;
        }
        Self { v }
    }
}

impl Tune {
    pub fn get(&self, i: usize) -> f32 {
        self.v[i]
    }
    pub fn set(&mut self, i: usize, value: f32) {
        if let Some(s) = SLIDERS.get(i) {
            self.v[i] = value.clamp(s.min, s.max);
        }
    }
}

/// Resident, Attending, Chief.
#[derive(Clone, Copy, Debug)]
pub struct Difficulty {
    pub name: &'static str,
    pub drain: f32,
    pub timer: f32,
    pub strain: f32,
    pub codes: u8,
}

pub const DIFFICULTIES: [Difficulty; 3] = [
    Difficulty { name: "Resident", drain: 0.72, timer: 1.25, strain: 0.85, codes: 2 },
    Difficulty { name: "Attending", drain: 1.0, timer: 1.0, strain: 1.0, codes: 1 },
    Difficulty { name: "Chief", drain: 1.3, timer: 0.85, strain: 1.18, codes: 0 },
];

/// Dev switches and one-shot tools (`SurgeryCmd::Cheat`).
pub mod cheat {
    pub const IMMORTAL: u16 = 0;
    pub const FREEZE_TIMER: u16 = 1;
    pub const FULL_GIFT: u16 = 2;
    pub const ONE_HIT: u16 = 3;
    pub const TIME_SCALE: u16 = 4;
    pub const SKIP_PHASE: u16 = 5;
    pub const WIN_CASE: u16 = 6;
    pub const FORCE_CODE: u16 = 7;
    pub const KILL_PATIENT: u16 = 8;
    pub const OVERLAYS: u16 = 9;
    pub const BOT_SKILL: u16 = 10;
}
