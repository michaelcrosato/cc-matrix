//! Tempo Trauma's shell and HUD: plain Rust plus egui, drawn by `pav_app` and by the headless
//! tools alike. It takes an abstract input and emits commands.

pub mod glyphs;
pub mod shell;

pub use shell::{NavIn, Screen, Shell, ShellCmd};

use serde::{Deserialize, Serialize};

pub const SAVE_VERSION: u32 = 1;

/// Settings (saved).
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub music: f32,
    pub sfx: f32,
    pub voices: f32,
    pub xbox: bool,
    pub cursor_speed: f32,
    pub aim_assist: f32,
    pub rumble: bool,
    pub tremor: bool,
    pub shake: f32,
    pub reduce_flashes: bool,
    pub clinical: bool,
    pub text_speed: f32,
    pub fullscreen: bool,
    pub difficulty: u8,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            music: 0.10,
            sfx: 0.8,
            voices: 0.7,
            xbox: false,
            cursor_speed: 1.0,
            aim_assist: 1.0,
            rumble: true,
            tremor: true,
            shake: 1.0,
            reduce_flashes: false,
            clinical: false,
            text_speed: 1.0,
            fullscreen: false,
            difficulty: 1,
        }
    }
}

/// Progress (saved): where Continue goes, which cases are unlocked and the best ranks.
#[derive(Clone, Debug, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Progress {
    pub step: u16,
    pub unlocked: u8,
    pub best: Vec<String>,
    pub total: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SaveFile {
    pub version: u32,
    pub settings: Settings,
    pub progress: Progress,
}

impl Default for SaveFile {
    fn default() -> Self {
        Self { version: SAVE_VERSION, settings: Settings::default(), progress: Progress::default() }
    }
}

impl SaveFile {
    pub fn from_json(s: &str) -> Self {
        serde_json::from_str::<SaveFile>(s).ok().filter(|f| f.version == SAVE_VERSION).unwrap_or_default()
    }
    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_default()
    }
}

pub fn rank_value(r: &str) -> u8 {
    match r {
        "C" => 1,
        "B" => 2,
        "A" => 3,
        "S" => 4,
        "ENCORE" => 5,
        _ => 0,
    }
}
