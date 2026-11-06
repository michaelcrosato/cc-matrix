//! Every number a designer balances live: the dev panel's sliders, each with its default.

use serde::{Deserialize, Serialize};

/// One slider of the dev panel.
pub struct Slider {
    pub key: &'static str,
    pub label: &'static str,
    pub min: f32,
    pub max: f32,
    pub default: f32,
}

macro_rules! tune {
    ($($field:ident : $label:literal, $min:literal, $max:literal, $def:literal;)*) => {
        /// The live balance numbers (plain floats: part of the game's state).
        #[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
        pub struct Tune { $(pub $field: f32,)* }

        impl Default for Tune {
            fn default() -> Self { Self { $($field: $def,)* } }
        }

        pub const SLIDERS: &[Slider] = &[
            $(Slider { key: stringify!($field), label: $label, min: $min, max: $max, default: $def },)*
        ];

        impl Tune {
            pub fn get(&self, key: &str) -> Option<f32> {
                match key { $(stringify!($field) => Some(self.$field),)* _ => None }
            }
            pub fn set(&mut self, key: &str, v: f32) -> bool {
                match key { $(stringify!($field) => { self.$field = v; true })* _ => false }
            }
        }
    };
}

tune! {
    drain: "Vitals drain ×", 0.0, 3.0, 1.0;
    timer: "Timer ×", 0.25, 3.0, 1.0;
    tool_power: "Tool power ×", 0.25, 3.0, 1.0;
    iv_heal: "IV heal ×", 0.0, 3.0, 1.0;
    strain_speed: "Strain speed ×", 0.25, 2.5, 1.0;
    strain_tough: "Strain toughness ×", 0.25, 3.0, 1.0;
    coupling: "Heart coupling", 0.0, 2.0, 1.0;
    beat_ms: "On-beat window (ms)", 20.0, 300.0, 110.0;
    cursor_speed: "Cursor speed ×", 0.3, 2.5, 1.0;
    aim_assist: "Aim assist", 0.0, 1.0, 1.0;
    gift_gain: "Gift gain ×", 0.0, 4.0, 1.0;
    gift_dur: "Gift duration ×", 0.25, 3.0, 1.0;
    hush_scale: "Hush time scale", 0.1, 1.0, 0.3;
    echo_secs: "Echo duration (s)", 2.0, 30.0, 10.0;
    chain_window: "Chain window (s)", 2.0, 30.0, 9.0;
    strictness: "Rating strictness ×", 0.25, 3.0, 1.0;
    wrong_penalty: "Wrong-tool penalty", 0.0, 10.0, 0.0;
    code_window: "Code window (s)", 1.0, 15.0, 5.0;
    score: "Score ×", 0.25, 4.0, 1.0;
}

/// Case difficulty: multipliers on drains, timer and strain speed, plus the Codes allowed.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum Difficulty {
    Resident,
    #[default]
    Attending,
    Chief,
}

impl Difficulty {
    pub const ALL: [Difficulty; 3] = [Difficulty::Resident, Difficulty::Attending, Difficulty::Chief];
    pub fn name(self) -> &'static str {
        match self {
            Difficulty::Resident => "Resident",
            Difficulty::Attending => "Attending",
            Difficulty::Chief => "Chief",
        }
    }
    pub fn from_name(n: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|d| d.name().eq_ignore_ascii_case(n))
    }
    pub fn drain(self) -> f32 {
        match self {
            Difficulty::Resident => 0.75,
            Difficulty::Attending => 1.0,
            Difficulty::Chief => 1.3,
        }
    }
    pub fn timer(self) -> f32 {
        match self {
            Difficulty::Resident => 1.3,
            Difficulty::Attending => 1.0,
            Difficulty::Chief => 0.85,
        }
    }
    pub fn strain(self) -> f32 {
        match self {
            Difficulty::Resident => 0.85,
            Difficulty::Attending => 1.0,
            Difficulty::Chief => 1.15,
        }
    }
    pub fn codes(self) -> u8 {
        match self {
            Difficulty::Resident => 2,
            Difficulty::Attending => 1,
            Difficulty::Chief => 0,
        }
    }
}
