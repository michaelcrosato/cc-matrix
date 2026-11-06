use super::events::GhostPoint;
use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub music: f32,
    pub sfx: f32,
    pub voice: f32,
    pub xbox: bool,
    pub sensitivity: f32,
    pub assist: f32,
    pub rhythm: f32,
    pub text_speed: f32,
}
impl Default for Settings {
    fn default() -> Self {
        Self { music: 0.10, sfx: 0.8, voice: 0.8, xbox: false, sensitivity: 1., assist: 0., rhythm: 0.10, text_speed: 45. }
    }
}
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Best {
    pub score: u32,
    pub stars: u8,
    pub ghost: Vec<GhostPoint>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct Guest {
    pub name: String,
    pub skin: u8,
    pub outfit: u8,
    pub gear: u8,
    pub day: u8,
    pub minutes: u32,
    pub total_minutes: u32,
    pub stars: u32,
    pub stamps: u8,
    pub ages: Vec<u8>,
    pub age: u8,
    pub today: u32,
    pub clears: Vec<u8>,
    pub bests: Vec<Best>,
    pub flipflops: Vec<u8>,
    pub free_play: bool,
    pub check_done: bool,
    pub titles: Vec<String>,
}
impl Default for Guest {
    fn default() -> Self {
        Self {
            name: "Sunny Sideup".into(),
            skin: 2,
            outfit: 0,
            gear: 0,
            day: 1,
            minutes: 0,
            total_minutes: 0,
            stars: 0,
            stamps: 0,
            ages: vec![],
            age: 61,
            today: 0,
            clears: vec![],
            bests: vec![Best::default(); 13],
            flipflops: vec![],
            free_play: false,
            check_done: false,
            titles: vec![],
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct Save {
    pub version: u32,
    pub active: usize,
    pub guests: Vec<Option<Guest>>,
    pub settings: Settings,
}
impl Default for Save {
    fn default() -> Self {
        Self { version: 1, active: 0, guests: vec![None; 4], settings: Settings::default() }
    }
}
pub const NAMES: [&str; 40] = [
    "Sunny Sideup",
    "Pat Balance",
    "Olive Still",
    "Robin Wobbles",
    "Sandy Knees",
    "Bea Present",
    "Lou Sway",
    "Finn Floating",
    "Penny Loafer",
    "Art Standing",
    "Kit Nap",
    "Terry Towels",
    "Al Fresco",
    "Dee Breeze",
    "Sal T. Air",
    "Joy Stick",
    "Gail Force",
    "Sid Down",
    "Anita Rest",
    "Mo Mentum",
    "Ray O'Sun",
    "Cora Reef",
    "Bo Breathe",
    "Nora Rush",
    "Mel Low",
    "Ari Relax",
    "Lee N. Left",
    "Will Sway",
    "Dot Centre",
    "Tina Tiptoe",
    "Stu D. O",
    "May B. Later",
    "Cam Down",
    "Rae D. O",
    "Aqua Velva",
    "Drew A. Breath",
    "Clam Chowder",
    "Pearl Diver",
    "Wade Ashore",
    "Ira Gently",
];
pub const SKINS: [&str; 6] = ["#f3d5bc", "#e4b58e", "#cf946e", "#ac765a", "#86583e", "#5d3c30"];
pub const OUTFITS: [(&str, &str); 8] = [
    ("Lagoon club", "#46bec8"),
    ("Coral society", "#ff8b7f"),
    ("Lemon lounge", "#edca69"),
    ("Palm reader", "#92bc80"),
    ("Lilac hour", "#b9a9d8"),
    ("Cloud guest", "#faf6ec"),
    ("Deep sea", "#4d7998"),
    ("Sunset stay", "#ce997d"),
];
pub fn age(skill: [f32; 4], days: u8, stars: u32) -> u8 {
    let s = skill[0] * 0.30 + skill[1] * 0.25 + skill[2] * 0.25 + skill[3] * 0.20;
    (24. + 56. * (1. - s.clamp(0., 1.)).powf(1.1) - 2. * days as f32 - (stars as f32 / 3.).min(8.)).round().clamp(18., 99.) as u8
}
pub fn stars(score: u32) -> u8 {
    if score >= 850 {
        3
    } else if score >= 650 {
        2
    } else if score >= 400 {
        1
    } else {
        0
    }
}
pub fn goal(day: u8) -> u32 {
    [3, 5, 7, 9, 0][(day.saturating_sub(1) as usize).min(4)]
}
