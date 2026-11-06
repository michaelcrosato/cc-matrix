//! What is kept between sessions, and the sums over it: guests, settings, Balance Age, stars.

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};

use super::ghost::Sample;

pub const SAVE_VERSION: u32 = 1;
pub const STAR_AT: [u32; 3] = [400, 650, 850];
pub const SLOTS: usize = 4;
pub const CHECKOUT_AGE: i32 = 40;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub music: f32,
    pub sfx: f32,
    pub voice: f32,
    pub xbox: bool,
    pub lean_sensitivity: f32,
    pub wobble_assist: f32,
    pub rhythm_offset: f32,
    pub text_speed: f32,
}

impl Default for Settings {
    fn default() -> Self {
        Self { music: 0.10, sfx: 0.8, voice: 0.8, xbox: false, lean_sensitivity: 1.0, wobble_assist: 0.0, rhythm_offset: 0.10, text_speed: 1.0 }
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Best {
    pub score: u32,
    pub stars: u8,
}

/// What a guest has on: picked in the Wardrobe from what the Clam has unlocked.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Wear {
    pub hat: u8,
    pub extra: u8,
    pub gold_shoes: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Guest {
    pub name: String,
    pub skin: u8,
    pub outfit: u8,
    /// 1..=5, the day of the stay.
    pub day: u8,
    /// Banked today, and ever.
    pub minutes: u32,
    pub total_minutes: u32,
    pub bests: BTreeMap<String, Best>,
    pub ghosts: BTreeMap<String, Vec<Sample>>,
    pub ages: Vec<i32>,
    pub stamps: u8,
    pub flops: [bool; 5],
    pub wear: Wear,
    pub free_play: bool,
    pub checked_out: bool,
    /// The day number (days since 1970) last played, for absence comments.
    pub last_day: i64,
    pub real_stamps: u32,
    /// Events cleared today (the first clear of each banks more).
    pub done_today: BTreeSet<String>,
    pub checked_today: bool,
    pub goal_told: bool,
    pub tom_rewarded: bool,
    pub wobbles: u32,
    pub best_final: u32,
}

impl Guest {
    pub fn new(name: &str, skin: u8, outfit: u8) -> Self {
        Self { name: name.to_string(), skin, outfit, day: 1, ..Default::default() }
    }

    pub fn total_stars(&self) -> u32 {
        self.bests.values().map(|b| b.stars as u32).sum()
    }

    pub fn age(&self) -> Option<i32> {
        self.ages.last().copied()
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Save {
    pub version: u32,
    pub guests: [Option<Guest>; SLOTS],
    pub settings: Settings,
}

impl Default for Save {
    fn default() -> Self {
        Self { version: SAVE_VERSION, guests: Default::default(), settings: Settings::default() }
    }
}

impl Save {
    /// Reads a stored save. Another version's or a broken one starts afresh, keeping nothing.
    pub fn parse(text: &str) -> Self {
        match serde_json::from_str::<Save>(text) {
            Ok(s) if s.version == SAVE_VERSION => s,
            _ => Save::default(),
        }
    }
}

pub fn stars_for(score: u32) -> u8 {
    STAR_AT.iter().filter(|s| score >= **s).count() as u8
}

/// The Morning Check's sum. `skill` is 0..1.
pub fn balance_age(skill: f32, days_completed: u32, total_stars: u32) -> i32 {
    let raw = 24.0 + 56.0 * (1.0 - skill.clamp(0.0, 1.0)).powf(1.1) - 2.0 * days_completed as f32 - (total_stars as f32 / 3.0).min(8.0);
    raw.round().clamp(18.0, 99.0) as i32
}

/// The six skin tones.
pub const SKINS: [&str; 6] = ["#f6d7bd", "#eec09a", "#d39a70", "#a86f50", "#7a4e36", "#54352a"];
/// The eight outfits: name, shirt, shorts, shoes.
pub const OUTFITS: [(&str, &str, &str, &str); 8] = [
    ("Regulation Teal", "#46bec8", "#fbfaf6", "#fbfaf6"),
    ("Polite Coral", "#ff786e", "#fbfaf6", "#fbfaf6"),
    ("Mint Compliance", "#78dcaa", "#263e54", "#fbfaf6"),
    ("Sunny Disposition", "#ffd166", "#46bec8", "#fbfaf6"),
    ("Lobby Lilac", "#c7b1ec", "#fbfaf6", "#263e54"),
    ("Towel White", "#fdfcf8", "#fdfcf8", "#e8e2d4"),
    ("Evening Ink", "#263e54", "#46bec8", "#fbfaf6"),
    ("Flamingo Adjacent", "#ff9ec4", "#fbfaf6", "#ff9ec4"),
];

/// Wardrobe items and the total minutes that unlock them: (name, minutes).
pub const HATS: [(&str, u32); 5] = [("No Hat", 0), ("Sun Cap", 3), ("Towel Turban", 8), ("Modest Crown", 20), ("Unearned Halo", 34)];
pub const EXTRAS: [(&str, u32); 4] = [("Nothing Extra", 0), ("Sweatbands", 5), ("Very Serious Belt", 12), ("Arm Floaties", 26)];

/// The puppet for a guest's look.
pub fn guest_def(skin: u8, outfit: u8, wear: &Wear) -> crate::puppet::PuppetDef {
    use crate::puppet::{HelmKind, PuppetDef};
    let (_, shirt, pants, shoes) = OUTFITS[outfit as usize % OUTFITS.len()];
    let mut d = PuppetDef { skin: SKINS[skin as usize % SKINS.len()].into(), shirt: shirt.into(), pants: pants.into(), shoes: shoes.into(), ..Default::default() };
    if wear.gold_shoes {
        d.shoes = "#ffcf4d".into();
    }
    match wear.hat {
        1 => {
            d.gear.helm = HelmKind::Cap;
            d.gear.helm_color = "#ff786e".into();
        }
        2 => {
            d.gear.helm = HelmKind::Hood;
            d.gear.helm_color = "#f5f2ec".into();
        }
        3 => {
            d.gear.helm = HelmKind::Crown;
            d.gear.helm_color = "#ffd166".into();
        }
        4 => {
            d.gear.helm = HelmKind::Halo;
            d.gear.helm_color = "#ffe9a8".into();
            d.gear.glow = 0.6;
        }
        _ => {}
    }
    match wear.extra {
        1 => d.gear.gloves = "#ffffff".into(),
        2 => d.gear.belt = "#263e54".into(),
        3 => {
            d.gear.pauldrons = 1.0;
            d.gear.armor_color = "#ffd166".into();
        }
        _ => {}
    }
    d
}
