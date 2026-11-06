//! Dialogue, names, titles, and looks. Loaded once from `script.toml`.

use std::sync::OnceLock;

use serde::Deserialize;

const SCRIPT: &str = include_str!("script.toml");

#[derive(Clone, Debug, Deserialize)]
struct RawLine {
    speaker: String,
    tag: String,
    text: String,
}

#[derive(Clone, Debug, Deserialize)]
struct Raw {
    #[serde(default)]
    names: Vec<String>,
    #[serde(default)]
    titles: Vec<String>,
    #[serde(default)]
    skins: Vec<String>,
    #[serde(default)]
    outfits: Vec<String>,
    #[serde(default)]
    lines: Vec<RawLine>,
}

#[derive(Clone, Debug)]
pub struct Script {
    pub names: Vec<String>,
    pub titles: Vec<String>,
    pub skins: Vec<String>,
    pub outfits: Vec<String>,
    lines: Vec<RawLine>,
}

impl Script {
    pub fn line(&self, speaker: &str, tag: &str, i: usize) -> Option<&str> {
        self.lines.iter().filter(|l| l.speaker == speaker && l.tag == tag).nth(i).map(|l| l.text.as_str())
    }

    pub fn count(&self, speaker: &str, tag: &str) -> usize {
        self.lines.iter().filter(|l| l.speaker == speaker && l.tag == tag).count()
    }

    pub fn speaker_count(&self, speaker: &str) -> usize {
        self.lines.iter().filter(|l| l.speaker == speaker).count()
    }
}

pub fn script() -> &'static Script {
    static CELL: OnceLock<Script> = OnceLock::new();
    CELL.get_or_init(|| {
        let text = crate::games::level_text("fit/script", SCRIPT);
        let raw: Raw = toml::from_str(&text).unwrap_or(Raw {
            names: vec!["Avery".into()],
            titles: vec!["Acceptable Human".into()],
            skins: vec!["Sand".into()],
            outfits: vec!["Linen".into()],
            lines: vec![RawLine { speaker: "Pip".into(), tag: "intro".into(), text: "Welcome ashore.".into() }],
        });
        Script { names: raw.names, titles: raw.titles, skins: raw.skins, outfits: raw.outfits, lines: raw.lines }
    })
}

pub fn rank_title(score: f32) -> String {
    let s = script();
    if s.titles.is_empty() {
        return "Acceptable Human".into();
    }
    let t = (score / 1000.0).clamp(0.0, 0.999);
    let i = (t * s.titles.len() as f32) as usize;
    s.titles[i.min(s.titles.len() - 1)].clone()
}
