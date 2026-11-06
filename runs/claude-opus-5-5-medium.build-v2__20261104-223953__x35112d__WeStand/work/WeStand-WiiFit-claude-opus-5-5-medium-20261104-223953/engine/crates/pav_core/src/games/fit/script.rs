//! All the words, from `script.toml`.

use std::collections::BTreeMap;
use std::sync::OnceLock;

use serde::Deserialize;

#[derive(Debug, Default, Deserialize)]
pub struct Script {
    pub lines: BTreeMap<String, Vec<String>>,
    pub names: Vec<String>,
    pub titles: Vec<String>,
}

static SCRIPT: OnceLock<Script> = OnceLock::new();

pub fn script() -> &'static Script {
    SCRIPT.get_or_init(|| {
        let text = super::super::level_text("fit/script", include_str!("script.toml"));
        toml::from_str(&text).unwrap_or_else(|e| panic!("fit/script.toml: {e}"))
    })
}

/// Lines under `key` (none: empty).
pub fn lines(key: &str) -> &'static [String] {
    script().lines.get(key).map(|v| v.as_slice()).unwrap_or(&[])
}

/// A line under `key`, chosen by `pick`.
pub fn line(key: &str, pick: u32) -> String {
    let l = lines(key);
    if l.is_empty() { String::new() } else { l[pick as usize % l.len()].clone() }
}

/// The deadpan title for a score: the list runs from worst to best.
pub fn title(score: u32) -> String {
    let t = &script().titles;
    if t.is_empty() {
        return String::new();
    }
    t[((score as usize).min(1000) * (t.len() - 1)) / 1000].clone()
}

/// Who speaks: name, base pitch.
pub const SPEAKERS: [&str; 10] = ["Pip", "Posey", "Big Kettle", "Bounce", "Commodore Gull", "Marjorie", "Two-Towel Tom", "The Twins", "A Guest", ""];
pub const PIP: u8 = 0;
pub const POSEY: u8 = 1;
pub const KETTLE: u8 = 2;
pub const BOUNCE: u8 = 3;
pub const GULL: u8 = 4;
pub const MARJORIE: u8 = 5;
pub const TOM: u8 = 6;
pub const TWINS: u8 = 7;
pub const GUEST: u8 = 8;
