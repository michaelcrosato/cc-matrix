//! Saves, settings, the script (all text) and the small tables the game reads.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use super::events::Kind;

pub const SAVE_VERSION: u32 = 1;

pub const SKINS: [(&str, &str); 6] =
    [("Oat", "#f1d3b0"), ("Honey", "#e0b07c"), ("Almond", "#c68e5a"), ("Cocoa", "#8d5a3b"), ("Espresso", "#5b3a29"), ("Peach", "#f7c6a8")];

/// Outfit: name, shirt, pants, shoes.
pub const OUTFITS: [(&str, &str, &str, &str); 8] = [
    ("Resort Mint", "#78dcaa", "#fbfaf6", "#46bec8"),
    ("Coral Reef", "#ff786e", "#fbfaf6", "#ffd166"),
    ("Sky Terry", "#8fdde0", "#e8f4f8", "#fbfaf6"),
    ("Sunny Side", "#ffd166", "#6a8caf", "#fbfaf6"),
    ("Lagoon Navy", "#3d5a80", "#fbfaf6", "#ff786e"),
    ("Sorbet", "#f7a8c8", "#c9f0dd", "#fbfaf6"),
    ("Lemon Zest", "#f2e66b", "#fbfaf6", "#78dcaa"),
    ("Plain White", "#fbfaf6", "#e8e2d4", "#c9c2b0"),
];

pub const NAMES: [&str; 40] = [
    "Wobbly Pat", "Sir Tilts-a-Lot", "Dot", "Gentle Greg", "Mx. Sway", "Not Dave", "Aunt Plank", "Tiny Tim", "Brenda B.", "Captain Lean",
    "Doc Teeter", "Old Reliable", "Nan", "Pebble", "Lil' Wibble", "Quiet Quentin", "Professor Pose", "Jelly Jo", "Big Stan", "Mild Mildred",
    "Mostly Fine", "Steady Eddie", "Bendy Bev", "Sleepy Sal", "The Guest", "Chair Person", "Lou Cushion", "Marcy Mat", "Rolo", "Fidget Fran",
    "Beau Balance", "Ms. Upright", "Wanda Wait", "Gus the Grounded", "Tipsy Tess", "Hank Hold", "Pippa Pending", "Norm", "Zen Ken", "Guest 4,017",
];

pub const GEAR: [(&str, &str); 8] = [
    ("sun_cap", "Sun Cap"),
    ("turban", "Towel Turban"),
    ("crown", "Crown of Mild Success"),
    ("halo", "Halo (Complimentary)"),
    ("bands", "Sweatbands"),
    ("belt", "Belt of Reasonable Support"),
    ("floaties", "Arm Floaties"),
    ("golden", "Golden Flip-Flops"),
];

/// Minutes needed to unlock each wardrobe item (the golden flip-flops need all five found).
pub const GEAR_COST: [i32; 8] = [0, 2, 6, 14, 4, 9, 12, 0];

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Best {
    pub score: i32,
    pub stars: u8,
    /// Ghost: the best run's dot, sampled every 6 ticks, in 1/100ths.
    pub ghost: Vec<[i16; 2]>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Guest {
    pub used: bool,
    pub name: usize,
    pub skin: usize,
    pub outfit: usize,
    pub day: i32,
    pub minutes: i32,
    pub banked_today: i32,
    pub ages: Vec<i32>,
    pub bests: BTreeMap<String, Best>,
    pub flips: Vec<bool>,
    pub gear_on: Vec<bool>,
    pub done_today: Vec<String>,
    pub stamps: i32,
    pub finished: bool,
    pub checked_out: bool,
    pub free_play: bool,
    pub last_day: i64,
    pub intro_done: bool,
    pub checked_today: bool,
    pub told: Vec<String>,
    pub final_age: i32,
    pub real_stamps: Vec<i64>,
}

impl Default for Guest {
    fn default() -> Self {
        Self {
            used: false,
            name: 0,
            skin: 0,
            outfit: 0,
            day: 1,
            minutes: 0,
            banked_today: 0,
            ages: vec![],
            bests: BTreeMap::new(),
            flips: vec![false; 5],
            gear_on: vec![false; 8],
            done_today: vec![],
            stamps: 0,
            finished: false,
            checked_out: false,
            free_play: false,
            last_day: 0,
            intro_done: false,
            checked_today: false,
            told: vec![],
            final_age: 0,
            real_stamps: vec![],
        }
    }
}

impl Guest {
    pub fn total_stars(&self) -> i32 {
        self.bests.values().map(|b| b.stars as i32).sum()
    }
    pub fn flips_found(&self) -> usize {
        self.flips.iter().filter(|f| **f).count()
    }
    pub fn gear_unlocked(&self, i: usize) -> bool {
        if i == 7 {
            return self.flips_found() >= 5;
        }
        (self.day >= 2 || self.free_play) && self.minutes >= GEAR_COST[i]
    }
    pub fn best(&self, k: Kind) -> Option<&Best> {
        self.bests.get(super::events::spec(k).key)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Settings {
    pub music: f32,
    pub sfx: f32,
    pub voice: f32,
    pub xbox: bool,
    pub lean_sens: f32,
    pub assist: f32,
    pub rhythm_offset: f32,
    pub text_speed: f32,
    pub fullscreen: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self { music: 0.10, sfx: 0.8, voice: 0.8, xbox: false, lean_sens: 1.0, assist: 0.0, rhythm_offset: 0.10, text_speed: 1.0, fullscreen: false }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Save {
    pub version: u32,
    pub guests: Vec<Guest>,
    pub slot: usize,
    pub settings: Settings,
    /// Bumped on every change, so the app knows when to write `localStorage`.
    pub serial: u64,
}

impl Default for Save {
    fn default() -> Self {
        Self { version: SAVE_VERSION, guests: vec![Guest::default(); 4], slot: 0, settings: Settings::default(), serial: 0 }
    }
}

impl Save {
    pub fn guest(&self) -> &Guest {
        &self.guests[self.slot.min(3)]
    }
    pub fn guest_mut(&mut self) -> &mut Guest {
        let s = self.slot.min(3);
        &mut self.guests[s]
    }
    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_default()
    }
    /// Reads a saved game; a different version or broken JSON gives None.
    pub fn from_json(s: &str) -> Option<Save> {
        let v: Save = serde_json::from_str(s).ok()?;
        (v.version == SAVE_VERSION && v.guests.len() == 4).then_some(v)
    }
}

/// All the game's text: dotted keys to lists of lines, from `script.toml`.
#[derive(Clone, Debug, Default)]
pub struct Script {
    pub lines: BTreeMap<String, Vec<String>>,
}

impl Script {
    pub fn parse(text: &str) -> Result<Script, String> {
        let t: toml::Table = toml::from_str(text).map_err(|e| e.to_string())?;
        let mut lines = BTreeMap::new();
        fn walk(prefix: &str, t: &toml::Table, out: &mut BTreeMap<String, Vec<String>>) {
            for (k, v) in t {
                let key = if prefix.is_empty() { k.clone() } else { format!("{prefix}.{k}") };
                match v {
                    toml::Value::Table(t) => walk(&key, t, out),
                    toml::Value::Array(a) => {
                        out.insert(key, a.iter().filter_map(|x| x.as_str().map(String::from)).collect());
                    }
                    toml::Value::String(s) => {
                        out.insert(key, vec![s.clone()]);
                    }
                    _ => {}
                }
            }
        }
        walk("", &t, &mut lines);
        Ok(Script { lines })
    }

    pub fn all(&self, key: &str) -> &[String] {
        self.lines.get(key).map(|v| v.as_slice()).unwrap_or(&[])
    }

    /// One line of `key`, chosen by `n`.
    pub fn pick(&self, key: &str, n: usize) -> String {
        let l = self.all(key);
        if l.is_empty() {
            return String::new();
        }
        l[n % l.len()].clone()
    }
}

/// Fills {name}-style placeholders.
pub fn fill(s: &str, pairs: &[(&str, String)]) -> String {
    let mut out = s.to_string();
    for (k, v) in pairs {
        out = out.replace(&format!("{{{k}}}"), v);
    }
    out
}
