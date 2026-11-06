//! What persists: settings, guest slots, personal bests, ghosts. Versioned JSON the page keeps
//! in `localStorage`.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use super::ghost::GFrame;
use crate::puppet::PuppetDef;

pub const SAVE_VERSION: u32 = 1;
pub const SLOTS: usize = 4;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub music: f32,
    pub sfx: f32,
    pub voice: f32,
    pub xbox: bool,
    pub lean_sens: f32,
    pub assist: f32,
    pub rhythm_offset: f32,
    pub text_speed: u8,
}

impl Default for Settings {
    fn default() -> Self {
        Self { music: 0.10, sfx: 0.80, voice: 0.80, xbox: false, lean_sens: 1.0, assist: 0.0, rhythm_offset: 0.10, text_speed: 1 }
    }
}

/// What the guest wears beyond the outfit.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Wear {
    pub hat: u8,
    pub bands: u8,
    pub belt: u8,
    pub floaties: u8,
    pub shirt: u8,
    pub pants: u8,
    pub shoes: u8,
}

/// One guest's stay.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Guest {
    pub name: String,
    pub skin: u8,
    pub outfit: u8,
    pub wear: Wear,
    /// The day of the stay, 1 to 5.
    pub day: u8,
    /// Days finished (stamps).
    pub stamps: u8,
    pub minutes: u32,
    pub minutes_today: u32,
    /// Stars and scores per event key.
    pub stars: BTreeMap<String, u8>,
    pub bests: BTreeMap<String, u32>,
    pub best_ghost: BTreeMap<String, Vec<GFrame>>,
    /// Events cleared today.
    pub today: Vec<String>,
    /// Morning ages, one per day checked.
    pub ages: Vec<u8>,
    /// Morning check done today.
    pub checked: bool,
    /// Lost flip-flops found (bits), and given to Tom.
    pub flipflops: u8,
    pub golden: bool,
    /// 0 still on the stay; 1 checked out; 2 extended stay. Both open Free Play.
    pub ending: u8,
    pub final_age: u8,
    /// The day number (days since 1970) last played.
    pub last_date: i64,
    pub total_wobbles: u32,
    pub played: Vec<String>,
    /// Talked to these people today (keys).
    pub talked: Vec<String>,
    pub titles: u32,
    pub free_days: u32,
}

impl Guest {
    pub fn total_stars(&self) -> u32 {
        self.stars.values().map(|&s| s as u32).sum()
    }
    pub fn free_play(&self) -> bool {
        self.ending != 0
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct SaveData {
    pub version: u32,
    pub settings: Settings,
    pub slots: Vec<Option<Guest>>,
}

impl Default for SaveData {
    fn default() -> Self {
        Self { version: SAVE_VERSION, settings: Settings::default(), slots: vec![None; SLOTS] }
    }
}

impl SaveData {
    /// Reads a save, or `None` when it isn't one (or comes from a newer version).
    pub fn parse(text: &str) -> Option<SaveData> {
        let mut s: SaveData = serde_json::from_str(text).ok()?;
        if s.version > SAVE_VERSION {
            return None;
        }
        s.version = SAVE_VERSION;
        s.slots.resize(SLOTS, None);
        Some(s)
    }
    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_default()
    }
}

pub const SKINS: [&str; 6] = ["#f6d7b8", "#eebd94", "#d9a074", "#b97f54", "#8c5a3a", "#5f3d29"];

/// Name, shirt, pants, shoes.
pub const OUTFITS: [(&str, &str, &str, &str); 8] = [
    ("Resort Mint", "#78dcaa", "#f4f1e8", "#46bec8"),
    ("Tide Blue", "#46bec8", "#263e54", "#f4f1e8"),
    ("Coral Reef", "#ff786e", "#f4f1e8", "#ffd166"),
    ("Sun Yellow", "#ffd166", "#46bec8", "#ff786e"),
    ("Towel White", "#fbfaf6", "#fbfaf6", "#d9d4c5"),
    ("Lavender Calm", "#c4b1e8", "#f4f1e8", "#8a78b8"),
    ("Sand Dollar", "#e8d4a8", "#a08a60", "#f4f1e8"),
    ("Ink Sensible", "#3c5a78", "#263e54", "#fbfaf6"),
];

/// One wardrobe row's options: a label and the minutes that unlock it.
pub struct WearOption {
    pub label: &'static str,
    pub minutes: u32,
}

const fn w(label: &'static str, minutes: u32) -> WearOption {
    WearOption { label, minutes }
}

pub const HATS: [WearOption; 5] = [w("None", 0), w("Sun Cap", 3), w("Towel Turban", 10), w("Resort Crown", 24), w("Modest Halo", 36)];
pub const BANDS: [WearOption; 3] = [w("None", 0), w("Sweatbands", 6), w("Golden Sweatbands", 30)];
pub const BELTS: [WearOption; 3] = [w("None", 0), w("Towel Belt", 8), w("Champion Belt", 28)];
pub const FLOATIES: [WearOption; 2] = [w("None", 0), w("Arm Floaties", 14)];
pub const COLOURS: [(&str, &str, u32); 8] = [
    ("Outfit's Own", "", 0),
    ("Mint", "#78dcaa", 2),
    ("Tide", "#46bec8", 4),
    ("Coral", "#ff786e", 6),
    ("Sun", "#ffd166", 9),
    ("Lavender", "#c4b1e8", 12),
    ("Ink", "#3c5a78", 16),
    ("Towel", "#fbfaf6", 20),
];

/// The guest's figure.
pub fn guest_look(g: &Guest) -> PuppetDef {
    let (_, shirt, pants, shoes) = OUTFITS[g.outfit as usize % OUTFITS.len()];
    let skin = SKINS[g.skin as usize % SKINS.len()];
    let pick = |i: u8, own: &str| {
        let c = COLOURS[i as usize % COLOURS.len()].1;
        if c.is_empty() { own.to_string() } else { c.to_string() }
    };
    let mut def = PuppetDef {
        skin: skin.into(),
        shirt: pick(g.wear.shirt, shirt),
        pants: pick(g.wear.pants, pants),
        shoes: if g.golden && g.wear.shoes == 0 { "#ffcf4a".into() } else { pick(g.wear.shoes, shoes) },
        ..PuppetDef::default()
    };
    use crate::puppet::HelmKind as H;
    def.gear.helm = match g.wear.hat {
        1 => H::Cap,
        2 => H::Hood,
        3 => H::Crown,
        4 => H::Halo,
        _ => H::None,
    };
    def.gear.helm_color = match g.wear.hat {
        1 => "#ff786e".into(),
        2 => "#f5f2ec".into(),
        3 => "#ffd166".into(),
        4 => "#ffe9a0".into(),
        _ => def.gear.helm_color.clone(),
    };
    def.gear.gloves = match g.wear.bands {
        1 => "#fbfaf6".into(),
        2 => "#ffcf4a".into(),
        _ => String::new(),
    };
    def.gear.belt = match g.wear.belt {
        1 => "#f5f2ec".into(),
        2 => "#ffcf4a".into(),
        _ => String::new(),
    };
    if g.wear.floaties > 0 {
        def.gear.pauldrons = 1.0;
        def.gear.armor_color = "#ffd166".into();
    }
    def
}

/// The Balance Age formula (plan section 5).
pub fn balance_age(skill: f32, days_completed: u32, total_stars: u32, r: &super::rules::CheckRules) -> u8 {
    let skill = skill.clamp(0.0, 1.0);
    let age = r.age_base + r.age_range * (1.0 - skill).powf(r.age_curve)
        - r.age_per_day * days_completed as f32
        - (total_stars as f32 / r.age_stars_div).min(r.age_stars_cap);
    age.round().clamp(18.0, 99.0) as u8
}
