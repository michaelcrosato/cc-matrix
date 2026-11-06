//! What is kept between sessions: settings, progress and ranks. A versioned JSON the app stores
//! (a file natively, localStorage in the browser).

use serde::{Deserialize, Serialize};

pub const VERSION: u32 = 1;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub music: f32,
    pub effects: f32,
    pub voices: f32,
    pub xbox: bool,
    pub cursor_speed: f32,
    pub aim_assist: f32,
    pub rumble: bool,
    pub tremor: bool,
    pub shake: bool,
    pub reduce_flashes: bool,
    pub clinical: bool,
    pub text_speed: f32,
    pub fullscreen: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            music: 0.10,
            effects: 0.80,
            voices: 0.70,
            xbox: false,
            cursor_speed: 15.0,
            aim_assist: 1.0,
            rumble: true,
            tremor: true,
            shake: true,
            reduce_flashes: false,
            clinical: false,
            text_speed: 45.0,
            fullscreen: false,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Save {
    pub version: u32,
    pub settings: Settings,
    /// The furthest case reached in a campaign, and the one Continue resumes.
    pub furthest: u8,
    pub last_case: u8,
    pub started: bool,
    pub difficulty: u8,
    /// Best rank per case; empty = none yet. The last entry is Code Blue.
    pub ranks: Vec<String>,
}

impl Default for Save {
    fn default() -> Self {
        Self {
            version: VERSION,
            settings: Settings::default(),
            furthest: 0,
            last_case: 0,
            started: false,
            difficulty: 1,
            ranks: vec![String::new(); 9],
        }
    }
}

pub fn rank_value(r: &str) -> i32 {
    match r {
        "ENCORE" => 5,
        "S" => 4,
        "A" => 3,
        "B" => 2,
        "C" => 1,
        _ => 0,
    }
}

impl Save {
    pub fn parse(text: &str) -> Option<Self> {
        let mut s: Save = serde_json::from_str(text).ok()?;
        if s.version != VERSION {
            return None;
        }
        s.ranks.resize(9, String::new());
        Some(s)
    }

    pub fn to_text(&self) -> String {
        serde_json::to_string(self).unwrap_or_default()
    }

    /// Records a finished case's rank if it is better. Case 255 is Code Blue.
    pub fn record(&mut self, case: u8, rank: &str) -> bool {
        let i = if case == 255 { 8 } else { (case as usize).min(7) };
        if rank_value(rank) > rank_value(&self.ranks[i]) {
            self.ranks[i] = rank.to_string();
            return true;
        }
        false
    }
}
