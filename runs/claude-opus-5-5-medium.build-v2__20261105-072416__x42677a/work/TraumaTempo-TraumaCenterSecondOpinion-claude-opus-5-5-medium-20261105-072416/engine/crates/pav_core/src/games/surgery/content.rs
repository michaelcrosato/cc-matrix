//! The game's text data: cases, story, plates, rigs and sets. Native builds read the file on
//! disk when running from the repository (edits show at the next load, or `reload`); every
//! build also embeds a copy (the browser has no files). A broken file names itself and its line.

use std::collections::BTreeMap;
use std::sync::{Arc, OnceLock, RwLock};

use anyhow::{Result, anyhow, bail};
use serde::Deserialize;

const DIR: &str = "crates/pav_core/src/games/surgery/content";

macro_rules! files {
    ($($p:literal),* $(,)?) => { &[$(($p, include_str!(concat!("content/", $p)))),*] };
}

/// Every content file, embedded. A test checks this list against the folder on disk.
pub const FILES: &[(&str, &str)] = files![
    "callouts.toml",
    "cases/case0.toml",
    "cases/case1.toml",
    "cases/case2.toml",
    "cases/case3.toml",
    "cases/case4.toml",
    "cases/case5.toml",
    "cases/case6.toml",
    "cases/case7.toml",
    "cases/codeblue.toml",
    "plates/abdomen.toml",
    "plates/bowel.toml",
    "plates/chest.toml",
    "plates/femur.toml",
    "plates/forearm.toml",
    "plates/heart.toml",
    "plates/liver.toml",
    "plates/lung.toml",
    "plates/pericardium.toml",
    "plates/torso.toml",
    "rigs/_face.toml",
    "rigs/bashir.toml",
    "rigs/mara.toml",
    "rigs/pet.toml",
    "rigs/teddy.toml",
    "rigs/vane.toml",
    "rigs/voss.toml",
    "sets/atrium.toml",
    "sets/cabin.toml",
    "sets/corridor.toml",
    "sets/depot.toml",
    "sets/nightward.toml",
    "sets/office.toml",
    "sets/recovery.toml",
    "sets/scrub.toml",
    "story/case0.toml",
    "story/case1.toml",
    "story/case2.toml",
    "story/case3.toml",
    "story/case4.toml",
    "story/case5.toml",
    "story/case6.toml",
    "story/case7.toml",
];

/// A content file's text: the copy on disk when there is one, else the embedded one.
pub fn content_text(path: &str, built_in: &'static str) -> std::borrow::Cow<'static, str> {
    #[cfg(not(target_arch = "wasm32"))]
    if let Ok(text) = std::fs::read_to_string(format!("{DIR}/{path}")) {
        return text.into();
    }
    let _ = (path, DIR);
    built_in.into()
}

// ------------------------------------------------------------------------------------------
// Cases

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct SpawnSpec {
    pub kind: String,
    pub a: Option<[f32; 2]>,
    pub b: Option<[f32; 2]>,
    pub c: Option<[f32; 2]>,
    pub r: Option<f32>,
    pub ang: Option<f32>,
    pub hidden: bool,
    pub sub: u8,
    pub drain: Option<f32>,
    /// Not needed to clear the phase (it still drains until dealt with).
    pub optional: bool,
    pub stage: u8,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Say {
    pub who: String,
    pub text: String,
    /// Seconds after the phase starts.
    pub at: f32,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Trigger {
    pub at_time: Option<f32>,
    pub vitals_below: Option<f32>,
    /// Fires once the phase's blocking hazards are gone, and holds the phase open for its spawns.
    pub on_clear: bool,
    /// The n-th heartbeat of this phase.
    pub on_beat: Option<u32>,
    pub spawn: Vec<SpawnSpec>,
    pub say: Vec<Say>,
    pub cue: Option<String>,
    pub banner: Option<String>,
    /// The case's locked gift wakes, its meter full.
    pub gift_full: bool,
    /// A sudden drop in vitals.
    pub vitals_hit: f32,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Phase {
    pub name: String,
    /// The HUD's NOW line.
    pub now: String,
    /// Highlight the targets on the field and let Bashir teach.
    pub guide: bool,
    pub checkpoint: bool,
    pub spawn: Vec<SpawnSpec>,
    pub say: Vec<Say>,
    pub trigger: Vec<Trigger>,
    pub strain: Option<String>,
    /// Strain numbers: `waves`, `count`, `mini`, `meter`...
    pub params: BTreeMap<String, f32>,
    /// The ECG's meter while this phase runs (beats to a bar).
    pub meter: Option<u8>,
    pub reveal_plate: Option<String>,
    /// The heart stops on purpose: this many shocks, which don't use up the case's Codes.
    pub code_shocks: u8,
    /// Seconds to hold before the next phase (a beat of drama after clearing).
    pub linger: f32,
    /// Seconds between this phase's spawns: they arrive over time, not all at once.
    pub stagger: f32,
    /// Plays the spawn list this many more times, mirrored and shifted, once the field is clear.
    pub repeat: u8,
    pub banner: Option<String>,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Case {
    pub name: String,
    pub surgeon: String,
    pub plate: String,
    /// The instrument on each of the 8 ring directions, clockwise from up.
    pub ring: Vec<String>,
    pub timer: f32,
    pub par: f32,
    pub vitals: f32,
    pub patient: String,
    pub life: String,
    pub diagnosis: String,
    pub fate: String,
    pub before: Option<String>,
    pub after: Option<String>,
    /// none | hush | echo | duet
    pub gift: String,
    /// The gift wakes during the case (it has no meter until then).
    pub gift_locked: bool,
    pub music: String,
    /// The patient is failing by this much a second, whatever is on the field.
    pub base_drain: f32,
    pub phase: Vec<Phase>,
}

// ------------------------------------------------------------------------------------------
// Story

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Line {
    pub who: Option<String>,
    pub expr: Option<String>,
    pub text: Option<String>,
    pub set: Option<String>,
    /// Bring a rig on stage: `enter = "mara"`, at `x`.
    pub enter: Option<String>,
    pub x: Option<f32>,
    pub exit: Option<String>,
    pub music: Option<String>,
    pub cue: Option<String>,
    /// `paper` or `or_wide`.
    pub camera: Option<String>,
    pub flash: Option<f32>,
    pub shake: Option<f32>,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Scene {
    pub id: String,
    pub line: Vec<Line>,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct StoryFile {
    pub scene: Vec<Scene>,
}

// ------------------------------------------------------------------------------------------
// Plates

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Lobe {
    pub x: f32,
    pub z: f32,
    pub a: f32,
    pub b: f32,
    pub h: f32,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Vessel {
    pub points: Vec<[f32; 2]>,
    pub w: f32,
    pub h: f32,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Plate {
    pub name: String,
    pub lobes: Vec<Lobe>,
    pub vessels: Vec<Vessel>,
    pub bed: String,
    pub flesh: String,
    pub top: String,
    pub vein: String,
    pub pulse: f32,
    pub noise: f32,
    /// Vein amount (0..1).
    pub veins: f32,
    /// A hard band like bone (a long lobe's top, ivory colour).
    pub bone: bool,
}

// ------------------------------------------------------------------------------------------
// Rigs

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct RigPart {
    pub name: String,
    pub z: f32,
    /// A colour name from `[colors]`, or "#rrggbb".
    pub color: String,
    pub chaikin: u8,
    pub points: Vec<[f32; 2]>,
    /// Also draw a copy mirrored across x = 0.
    pub mirror: bool,
    /// Which animation moves it: "" (body), head, eyes, brow, hair, lid
    pub layer: String,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Expr {
    pub brow_y: f32,
    pub brow_rot: f32,
    /// How open the eyes are (1 = neutral).
    pub eye: f32,
    /// Pupil size (1 = neutral).
    pub pupil: f32,
    /// closed | smile | frown | flat | open
    pub mouth: String,
    pub tilt: f32,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Voice {
    pub base: f32,
    /// sine | triangle | square | saw
    pub wave: String,
    pub speed: f32,
    pub jitter: f32,
    pub bright: f32,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Rig {
    pub id: String,
    pub name: String,
    pub colors: BTreeMap<String, String>,
    pub part: Vec<RigPart>,
    pub expr: BTreeMap<String, Expr>,
    pub voice: Voice,
    pub scale: f32,
}

// ------------------------------------------------------------------------------------------
// Sets

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Card {
    pub z: f32,
    pub color: String,
    pub points: Vec<[f32; 2]>,
    /// A rectangle `[x0, y0, x1, y1]` instead of points.
    pub rect: Option<[f32; 4]>,
    pub emissive: f32,
    pub chaikin: u8,
    /// Blinks (monitors).
    pub blink: f32,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Set {
    pub id: String,
    pub name: String,
    pub back: String,
    pub rain: f32,
    pub lamp: String,
    pub card: Vec<Card>,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Callout {
    pub who: String,
    pub text: Vec<String>,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(default)]
pub struct Callouts {
    pub callout: BTreeMap<String, Callout>,
}

// ------------------------------------------------------------------------------------------

/// Everything loaded. Read-only during play; game state holds indices into it.
#[derive(Debug, Default)]
pub struct Content {
    /// Cases 0..=7 in order, then Code Blue.
    pub cases: Vec<Case>,
    pub scenes: Vec<Scene>,
    pub plates: BTreeMap<String, Plate>,
    pub plate_order: Vec<String>,
    pub rigs: BTreeMap<String, Rig>,
    pub rig_order: Vec<String>,
    pub sets: BTreeMap<String, Set>,
    pub set_order: Vec<String>,
    pub callouts: BTreeMap<String, Callout>,
    /// Shared face parts of every rig (`rigs/_face.toml`).
    pub face: Rig,
}

/// The case index of Code Blue.
pub const CODE_BLUE: usize = 8;

pub const MUSIC: &[&str] =
    &["none", "title", "tender", "tense", "or", "introit", "lacrimosa", "dies", "libera", "codeblue", "results"];

pub fn music_id(name: &str) -> u8 {
    MUSIC.iter().position(|m| *m == name).unwrap_or(0) as u8
}

fn parse<T: serde::de::DeserializeOwned>(path: &str, text: &str) -> Result<T> {
    toml::from_str(text).map_err(|e| {
        let line = e.span().map(|s| text[..s.start.min(text.len())].lines().count().max(1));
        anyhow!("{path}{}: {}", line.map(|l| format!(" line {l}")).unwrap_or_default(), e.message())
    })
}

/// Loads every file (disk first, embedded otherwise).
pub fn load() -> Result<Content> {
    let mut c = Content::default();
    let mut cases: BTreeMap<String, Case> = BTreeMap::new();
    for (path, built_in) in FILES {
        let text = content_text(path, built_in);
        let (dir, file) = path.split_once('/').unwrap_or(("", path));
        let stem = file.trim_end_matches(".toml").to_string();
        match dir {
            "cases" => {
                cases.insert(stem, parse(path, &text)?);
            }
            "story" => {
                let s: StoryFile = parse(path, &text)?;
                c.scenes.extend(s.scene);
            }
            "plates" => {
                let p: Plate = parse(path, &text)?;
                c.plate_order.push(stem.clone());
                c.plates.insert(stem, p);
            }
            "rigs" => {
                let mut r: Rig = parse(path, &text)?;
                r.id = stem.clone();
                if stem == "_face" {
                    c.face = r;
                } else {
                    c.rig_order.push(stem.clone());
                    c.rigs.insert(stem, r);
                }
            }
            "sets" => {
                let mut s: Set = parse(path, &text)?;
                s.id = stem.clone();
                c.set_order.push(stem.clone());
                c.sets.insert(stem, s);
            }
            "" => {
                let cs: Callouts = parse(path, &text)?;
                c.callouts = cs.callout;
            }
            other => bail!("{path}: unknown content folder '{other}'"),
        }
    }
    for k in 0..8 {
        let name = format!("case{k}");
        c.cases.push(cases.remove(&name).ok_or_else(|| anyhow!("cases/{name}.toml is missing"))?);
    }
    c.cases.push(cases.remove("codeblue").ok_or_else(|| anyhow!("cases/codeblue.toml is missing"))?);
    Ok(c)
}

static CONTENT: OnceLock<RwLock<Arc<Content>>> = OnceLock::new();

/// The loaded content (loads on first use; a broken embedded file is a programming error).
pub fn content() -> Arc<Content> {
    let lock = CONTENT.get_or_init(|| RwLock::new(Arc::new(load().unwrap_or_else(|e| panic!("surgery content: {e:#}")))));
    lock.read().unwrap().clone()
}

/// Reads the files again (the dev panel's "reload content", native only). Keeps the old content
/// and returns the error when a file is broken.
pub fn reload() -> Result<()> {
    let fresh = load()?;
    lint(&fresh).map_err(|e| anyhow!(e.join("\n")))?;
    let _ = content();
    *CONTENT.get().unwrap().write().unwrap() = Arc::new(fresh);
    Ok(())
}

pub const SPAWN_KINDS: &[&str] = &[
    "incision", "lacer", "pool", "bleeder", "object", "polyp", "tumor", "patch", "burn", "bone", "closure",
];

pub const TOOLS: &[&str] = &["scalpel", "forceps", "suture", "suction", "laser", "gel", "scanner", "iv", "cryo", "dressing", "defib"];

pub const STRAINS: &[&str] = &["introit", "lacrimosa", "dies", "soloist", "tendril", "director"];

/// Every reference and required field in the content; empty when clean.
pub fn lint(c: &Content) -> Result<(), Vec<String>> {
    let mut e = Vec::new();
    let speaker = |who: &str| c.rigs.contains_key(who);
    for (i, case) in c.cases.iter().enumerate() {
        let tag = format!("case {i} ({})", case.name);
        if !c.plates.contains_key(&case.plate) {
            e.push(format!("{tag}: unknown plate '{}'", case.plate));
        }
        if !speaker(&case.surgeon) {
            e.push(format!("{tag}: unknown surgeon '{}'", case.surgeon));
        }
        if !case.ring.is_empty() && case.ring.len() != 8 {
            e.push(format!("{tag}: the ring needs 8 instruments"));
        }
        for t in &case.ring {
            if !TOOLS.contains(&t.as_str()) {
                e.push(format!("{tag}: unknown instrument '{t}'"));
            }
        }
        if case.phase.is_empty() {
            e.push(format!("{tag}: no phases"));
        }
        for (name, kind) in [(&case.before, "before"), (&case.after, "after")] {
            if let Some(n) = name {
                if !c.scenes.iter().any(|s| s.id == *n) {
                    e.push(format!("{tag}: {kind} names unknown scene '{n}'"));
                }
            }
        }
        if !MUSIC.contains(&case.music.as_str()) {
            e.push(format!("{tag}: unknown music '{}'", case.music));
        }
        if !["none", "hush", "echo", "duet"].contains(&case.gift.as_str()) {
            e.push(format!("{tag}: unknown gift '{}'", case.gift));
        }
        for p in &case.phase {
            let ptag = format!("{tag} phase '{}'", p.name);
            let says = p.say.iter().chain(p.trigger.iter().flat_map(|t| t.say.iter()));
            for s in says {
                if !speaker(&s.who) {
                    e.push(format!("{ptag}: unknown speaker '{}'", s.who));
                }
                if s.text.trim().is_empty() {
                    e.push(format!("{ptag}: empty line"));
                }
            }
            for s in p.spawn.iter().chain(p.trigger.iter().flat_map(|t| t.spawn.iter())) {
                if !SPAWN_KINDS.contains(&s.kind.as_str()) {
                    e.push(format!("{ptag}: unknown hazard '{}'", s.kind));
                }
            }
            if let Some(r) = &p.reveal_plate {
                if !c.plates.contains_key(r) {
                    e.push(format!("{ptag}: unknown plate '{r}'"));
                }
            }
            if let Some(s) = &p.strain {
                if !STRAINS.contains(&s.as_str()) {
                    e.push(format!("{ptag}: unknown strain '{s}'"));
                }
            }
            for t in &p.trigger {
                if let Some(cue) = &t.cue {
                    if super::cue::id(cue).is_none() {
                        e.push(format!("{ptag}: unknown cue '{cue}'"));
                    }
                }
            }
        }
    }
    for s in &c.scenes {
        for (n, l) in s.line.iter().enumerate() {
            let tag = format!("scene '{}' line {}", s.id, n + 1);
            if let Some(who) = &l.who {
                match c.rigs.get(who) {
                    None if who != "narrator" => e.push(format!("{tag}: unknown speaker '{who}'")),
                    Some(r) => {
                        if let Some(x) = &l.expr {
                            if !r.expr.contains_key(x) {
                                e.push(format!("{tag}: {who} has no expression '{x}'"));
                            }
                        }
                    }
                    _ => {}
                }
                if l.text.as_deref().unwrap_or("").trim().is_empty() {
                    e.push(format!("{tag}: empty text"));
                }
            }
            if let Some(t) = &l.text {
                if t.contains("TODO") {
                    e.push(format!("{tag}: leftover TODO"));
                }
            }
            if let Some(x) = &l.set {
                if !c.sets.contains_key(x) {
                    e.push(format!("{tag}: unknown set '{x}'"));
                }
            }
            for r in [&l.enter, &l.exit].into_iter().flatten() {
                if !c.rigs.contains_key(r) {
                    e.push(format!("{tag}: unknown rig '{r}'"));
                }
            }
            if let Some(m) = &l.music {
                if !MUSIC.contains(&m.as_str()) {
                    e.push(format!("{tag}: unknown music '{m}'"));
                }
            }
            if let Some(cue) = &l.cue {
                if super::cue::id(cue).is_none() {
                    e.push(format!("{tag}: unknown cue '{cue}'"));
                }
            }
        }
    }
    for (id, r) in &c.rigs {
        for need in ["neutral", "alarmed", "stern", "soft"] {
            if !r.expr.contains_key(need) {
                e.push(format!("rig '{id}': missing expression '{need}'"));
            }
        }
        for p in &r.part {
            if !p.color.starts_with('#') && !r.colors.contains_key(&p.color) {
                e.push(format!("rig '{id}': part '{}' has unknown colour '{}'", p.name, p.color));
            }
        }
        for p in &c.face.part {
            if !p.color.starts_with('#') && !r.colors.contains_key(&p.color) {
                e.push(format!("rig '{id}': face part '{}' needs colour '{}'", p.name, p.color));
            }
        }
    }
    for (_, callout) in c.callouts.iter() {
        if !speaker(&callout.who) {
            e.push(format!("callout: unknown speaker '{}'", callout.who));
        }
    }
    if e.is_empty() { Ok(()) } else { Err(e) }
}
