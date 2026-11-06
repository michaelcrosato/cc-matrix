//! All the game's words, in `script.toml`: named lists of lines. Tests lint them.

use std::collections::BTreeMap;
use std::sync::{OnceLock, RwLock};

/// Named lists of lines.
pub type Lines = BTreeMap<String, Vec<String>>;

static SCRIPT: OnceLock<RwLock<Lines>> = OnceLock::new();

fn cell() -> &'static RwLock<Lines> {
    SCRIPT.get_or_init(|| RwLock::new(parse(include_str!("script.toml"))))
}

fn parse(text: &str) -> Lines {
    toml::from_str(text).unwrap_or_else(|e| {
        log::error!("script.toml: {e}");
        Lines::new()
    })
}

/// Re-reads the words (the disk's copy when running from the repository).
pub fn reload() {
    let text = super::super::level_text("fit/script", include_str!("script.toml"));
    *cell().write().unwrap() = parse(&text);
}

/// The whole table (tests).
pub fn all() -> Lines {
    cell().read().unwrap().clone()
}

/// Line `i` (wrapping) of list `key`.
pub fn line(key: &str, i: usize) -> String {
    let s = cell().read().unwrap();
    match s.get(key) {
        Some(list) if !list.is_empty() => list[i % list.len()].clone(),
        _ => {
            log::error!("script: no lines for {key}");
            String::new()
        }
    }
}

/// How many lines a list has.
pub fn count(key: &str) -> usize {
    cell().read().unwrap().get(key).map(|l| l.len()).unwrap_or(0)
}

/// A whole list.
pub fn list(key: &str) -> Vec<String> {
    cell().read().unwrap().get(key).cloned().unwrap_or_default()
}

/// A line with `{word}`s filled in.
pub fn fill(text: &str, vars: &[(&str, String)]) -> String {
    let mut s = text.to_string();
    for (k, v) in vars {
        s = s.replace(&format!("{{{k}}}"), v);
    }
    singulars(&s)
}

/// "1 minutes" reads badly even from a cushion: a count of exactly one takes the singular.
/// (11 minutes and 21 days are left alone.)
pub fn singulars(text: &str) -> String {
    let mut s = text.to_string();
    for (many, one) in [
        ("1 minutes", "1 minute"),
        ("1 more minutes", "1 more minute"),
        ("1 days", "1 day"),
        ("1 real days", "1 real day"),
        ("1 shells", "1 shell"),
    ] {
        let mut from = 0;
        while let Some(at) = s[from..].find(many).map(|i| i + from) {
            let digit_before = s[..at].chars().next_back().is_some_and(|c| c.is_ascii_digit() || c == '.');
            if digit_before {
                from = at + many.len();
            } else {
                s.replace_range(at..at + many.len(), one);
                from = at + one.len();
            }
        }
    }
    s
}
