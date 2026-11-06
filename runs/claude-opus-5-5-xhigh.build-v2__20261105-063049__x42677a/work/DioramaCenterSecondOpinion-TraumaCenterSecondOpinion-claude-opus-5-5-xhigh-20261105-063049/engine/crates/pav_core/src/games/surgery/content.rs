//! The game's data: cases, story, plates, rigs and sets, each a text file a designer edits. Read
//! from disk when the program runs from the repository's root (edits need no rebuild; `reload`
//! picks them up), and from the copies embedded here otherwise (the browser, tests elsewhere).

use std::collections::BTreeMap;
use std::sync::{Arc, RwLock};

use anyhow::{Result, anyhow};
use serde::Deserialize;

/// Every content file, embedded. `content_files_are_all_embedded` checks this list against disk.
pub const FILES: &[(&str, &str)] = &[
    ("cases/case0.toml", include_str!("content/cases/case0.toml")),
    ("cases/case1.toml", include_str!("content/cases/case1.toml")),
    ("cases/case2.toml", include_str!("content/cases/case2.toml")),
    ("cases/case3.toml", include_str!("content/cases/case3.toml")),
    ("cases/case4.toml", include_str!("content/cases/case4.toml")),
    ("cases/case5.toml", include_str!("content/cases/case5.toml")),
    ("cases/case6.toml", include_str!("content/cases/case6.toml")),
    ("cases/case7.toml", include_str!("content/cases/case7.toml")),
    ("cases/codeblue.toml", include_str!("content/cases/codeblue.toml")),
    ("story/case0_before.toml", include_str!("content/story/case0_before.toml")),
    ("story/case0_after.toml", include_str!("content/story/case0_after.toml")),
    ("story/case1_before.toml", include_str!("content/story/case1_before.toml")),
    ("story/case1_after.toml", include_str!("content/story/case1_after.toml")),
    ("story/case2_before.toml", include_str!("content/story/case2_before.toml")),
    ("story/case2_after.toml", include_str!("content/story/case2_after.toml")),
    ("story/case3_before.toml", include_str!("content/story/case3_before.toml")),
    ("story/case3_after.toml", include_str!("content/story/case3_after.toml")),
    ("story/case4_before.toml", include_str!("content/story/case4_before.toml")),
    ("story/case4_after.toml", include_str!("content/story/case4_after.toml")),
    ("story/case5_before.toml", include_str!("content/story/case5_before.toml")),
    ("story/case5_after.toml", include_str!("content/story/case5_after.toml")),
    ("story/case6_before.toml", include_str!("content/story/case6_before.toml")),
    ("story/case6_after.toml", include_str!("content/story/case6_after.toml")),
    ("story/case7_before.toml", include_str!("content/story/case7_before.toml")),
    ("story/case7_after.toml", include_str!("content/story/case7_after.toml")),
    ("plates/forearm.toml", include_str!("content/plates/forearm.toml")),
    ("plates/abdomen.toml", include_str!("content/plates/abdomen.toml")),
    ("plates/bowel.toml", include_str!("content/plates/bowel.toml")),
    ("plates/chest.toml", include_str!("content/plates/chest.toml")),
    ("plates/lung.toml", include_str!("content/plates/lung.toml")),
    ("plates/liver.toml", include_str!("content/plates/liver.toml")),
    ("plates/femur.toml", include_str!("content/plates/femur.toml")),
    ("plates/pericardium.toml", include_str!("content/plates/pericardium.toml")),
    ("plates/furnace.toml", include_str!("content/plates/furnace.toml")),
    ("plates/heart.toml", include_str!("content/plates/heart.toml")),
    ("plates/torso.toml", include_str!("content/plates/torso.toml")),
    ("rigs/mara.toml", include_str!("content/rigs/mara.toml")),
    ("rigs/pet.toml", include_str!("content/rigs/pet.toml")),
    ("rigs/bashir.toml", include_str!("content/rigs/bashir.toml")),
    ("rigs/teddy.toml", include_str!("content/rigs/teddy.toml")),
    ("rigs/voss.toml", include_str!("content/rigs/voss.toml")),
    ("rigs/vane.toml", include_str!("content/rigs/vane.toml")),
    ("sets/corridor.toml", include_str!("content/sets/corridor.toml")),
    ("sets/scrub.toml", include_str!("content/sets/scrub.toml")),
    ("sets/office.toml", include_str!("content/sets/office.toml")),
    ("sets/atrium.toml", include_str!("content/sets/atrium.toml")),
    ("sets/nightward.toml", include_str!("content/sets/nightward.toml")),
    ("sets/depot.toml", include_str!("content/sets/depot.toml")),
    ("sets/recovery.toml", include_str!("content/sets/recovery.toml")),
    ("sets/cabin.toml", include_str!("content/sets/cabin.toml")),
    ("level.toml", include_str!("content/level.toml")),
    ("callouts.toml", include_str!("content/callouts.toml")),
];

pub const CASES: usize = 8;
pub const DIR: &str = "crates/pav_core/src/games/surgery/content";

fn yes() -> bool {
    true
}

// ------------------------------------------------------------------ cases

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CaseDef {
    pub name: String,
    /// `mara`, `pet` or `both`.
    pub surgeon: String,
    pub plate: String,
    /// The instruments on the ring, clockwise from up.
    pub ring: Vec<String>,
    /// Seconds.
    pub timer: f32,
    /// The score the ranks are percentages of (`pav balance` suggests it).
    pub par: f32,
    #[serde(default = "full")]
    pub vitals: f32,
    pub patient: String,
    pub life: String,
    pub diagnosis: String,
    pub fate: String,
    pub fate_lost: String,
    #[serde(default)]
    pub before: String,
    #[serde(default)]
    pub after: String,
    /// Early cases highlight the target on the field.
    #[serde(default)]
    pub guided: bool,
    /// The surgeon's gift is awake from the start of this case.
    #[serde(default)]
    pub gift: bool,
    /// The tremor applies (Pet's hand).
    #[serde(default)]
    pub tremor: bool,
    /// How fast this patient loses vitals: a multiplier on every hazard's drain.
    #[serde(default = "one_f")]
    pub drain: f32,
    #[serde(default)]
    pub phase: Vec<PhaseDef>,
}

fn full() -> f32 {
    100.0
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PhaseDef {
    pub name: String,
    pub objective: String,
    #[serde(default)]
    pub checkpoint: bool,
    /// Cross-fade to this plate when the phase starts.
    #[serde(default)]
    pub plate: Option<String>,
    #[serde(default)]
    pub spawn: Vec<SpawnDef>,
    #[serde(default)]
    pub event: Vec<EventDef>,
    #[serde(default)]
    pub strain: Option<StrainDef>,
    /// The meter on the monitor during this phase.
    #[serde(default)]
    pub meter: Option<u8>,
    /// The phase also lasts at least this long (seconds).
    #[serde(default)]
    pub hold: f32,
}

/// A hazard to spawn.
#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct SpawnDef {
    pub kind: String,
    pub at: [f32; 2],
    /// Polylines: incisions, wounds, closures.
    pub pts: Vec<[f32; 2]>,
    pub r: f32,
    /// Degrees: the pull axis, or a bone's snap angle.
    pub axis: f32,
    /// Degrees: where a bone fragment starts turned.
    pub angle: f32,
    /// Where a bone fragment snaps home.
    pub to: [f32; 2],
    pub hidden: bool,
    /// Look: hook, shard, splinter...
    pub tag: String,
    /// Doesn't have to be cleared for the phase to end.
    pub optional: bool,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct EventDef {
    pub at_time: Option<f32>,
    pub vitals_below: Option<f32>,
    /// When the phase's tasks are all done (before it ends).
    pub on_clear: bool,
    /// On this many-th heartbeat of the phase.
    pub on_beat: Option<u32>,
    /// When this many tasks of the phase remain.
    pub remaining: Option<u32>,
    pub spawn: Vec<SpawnDef>,
    /// `[speaker, line]`.
    pub say: Vec<String>,
    pub cue: Option<String>,
    pub banner: Option<String>,
    /// A scripted Code: the heart stops, and it doesn't count against the patient's allowance.
    pub code: bool,
    pub shake: f32,
    pub plate: Option<String>,
    /// Wakes the gift.
    pub gift: bool,
    /// Vitals change (negative hurts).
    pub vitals: f32,
    /// Camera push: seconds, zoom.
    pub push: f32,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StrainDef {
    /// `introit`, `lacrimosa`, `dies_irae`, `shocks`, `soloist`.
    pub kind: String,
    /// How many waves (kills, sac waves, embers...).
    #[serde(default = "one")]
    pub waves: u32,
    #[serde(default = "one_f")]
    pub speed: f32,
    #[serde(default = "one_f")]
    pub tough: f32,
    /// Beats a sac swells before it bursts, or a soloist stroke lasts.
    #[serde(default = "ten")]
    pub beats: f32,
    /// The Introit's last act: merged, with tethers.
    #[serde(default = "yes")]
    pub amen: bool,
    /// How many of it (embers, sacs, strokes, shocks).
    #[serde(default = "six")]
    pub count: u32,
    /// Heat rings sweep every this many beats (0 = none).
    #[serde(default)]
    pub rings: u32,
    /// Fever meter filling per second (0 = none).
    #[serde(default)]
    pub fever: f32,
    /// What it uses as its centre.
    #[serde(default)]
    pub at: [f32; 2],
    /// The furnace beneath, at the end of Dies Irae.
    #[serde(default)]
    pub furnace: bool,
    /// Nodules stay visible (Case 7): no Scanner needed.
    #[serde(default)]
    pub visible: bool,
}

fn one() -> u32 {
    1
}
fn one_f() -> f32 {
    1.0
}
fn ten() -> f32 {
    10.0
}
fn six() -> u32 {
    6
}

// ------------------------------------------------------------------ story

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StoryDef {
    #[serde(default)]
    pub line: Vec<LineDef>,
}

/// One step of a story scene: stage commands, and a line if it has `who` and `text`.
#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct LineDef {
    pub who: String,
    pub expr: String,
    pub text: String,
    /// Change the set.
    pub set: String,
    /// Bring a character on: name, and `at` = left, right, centre, farleft, farright.
    pub enter: String,
    pub at: String,
    pub exit: String,
    pub music: String,
    pub cue: String,
    /// `paper` (the staged cards), `or` (the 3D wide shot).
    pub camera: String,
    pub flash: f32,
    pub shake: f32,
}

// ------------------------------------------------------------------ plates

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PlateDef {
    pub name: String,
    /// Ellipses of tissue: x, z, a, b, h (`h * max(0, 1 - dx²/a - dz²/b)^0.55`).
    pub lobes: Vec<[f32; 5]>,
    pub bed: [u8; 3],
    pub flesh: [u8; 3],
    pub top: [u8; 3],
    pub vein: [u8; 3],
    /// How far the tissue lifts on a beat.
    #[serde(default = "beat_lift")]
    pub pulse: f32,
    /// Breathing swell.
    #[serde(default = "breathe")]
    pub breathe: f32,
    /// How many veins (0..1).
    #[serde(default = "half")]
    pub veins: f32,
    /// Roughness of the surface noise.
    #[serde(default = "half")]
    pub noise: f32,
    /// Wet highlight strength (0..1).
    #[serde(default = "half")]
    pub wet: f32,
    /// Big vessels: polylines of [x, z].
    #[serde(default)]
    pub vessels: Vec<Vec<[f32; 2]>>,
    #[serde(default = "vessel_color")]
    pub vessel_color: [u8; 3],
    /// Ribs and other pale ridges: polylines of [x, z].
    #[serde(default)]
    pub ridges: Vec<Vec<[f32; 2]>>,
    /// Half-size of the opening in the drape: x, z.
    #[serde(default = "opening")]
    pub opening: [f32; 2],
}

fn beat_lift() -> f32 {
    0.06
}
fn breathe() -> f32 {
    0.05
}
fn half() -> f32 {
    0.5
}
fn vessel_color() -> [u8; 3] {
    [120, 26, 60]
}
fn opening() -> [f32; 2] {
    [9.6, 5.4]
}

// ------------------------------------------------------------------ rigs

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RigDef {
    pub name: String,
    /// What the character is called in the dialogue box.
    pub title: String,
    /// The voice: base pitch (Hz), waveform (`square`, `saw`, `triangle`), seconds per syllable.
    pub pitch: f32,
    pub wave: String,
    pub pace: f32,
    /// Random pitch wobble, in semitones.
    #[serde(default)]
    pub jitter: f32,
    /// The name's colour on the dialogue box, and the cameo's backing.
    pub accent: [u8; 3],
    pub palette: BTreeMap<String, [u8; 3]>,
    pub part: Vec<PartDef>,
    pub expr: BTreeMap<String, ExprDef>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PartDef {
    pub name: String,
    /// The layer number (`z = n * 0.035`).
    pub z: f32,
    /// A palette name, or an sRGB triple through `rgb`.
    pub color: String,
    pub points: Vec<[f32; 2]>,
    #[serde(default = "two")]
    pub chaikin: u32,
    /// Also draw it mirrored in x.
    #[serde(default)]
    pub mirror: bool,
    /// `brow`, `lid`, `eye`, `pupil`, `hair`, `head` (moves with the head), `body`.
    #[serde(default)]
    pub role: String,
    /// Depth of the card.
    #[serde(default = "depth")]
    pub depth: f32,
    /// Hair cards hang on springs.
    #[serde(default)]
    pub spring: f32,
}

fn two() -> u32 {
    2
}
fn depth() -> f32 {
    0.03
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct ExprDef {
    /// How far the brows move up, inner and outer ends.
    pub brow_inner: f32,
    pub brow_outer: f32,
    /// How far the upper lids close (0..1) and how big the irises are (scale).
    pub lid: f32,
    pub iris: f32,
    /// Mouth polygons: at rest and talking.
    pub closed: Vec<[f32; 2]>,
    pub open: Vec<[f32; 2]>,
    /// Head tilt in degrees, and a nod down.
    pub tilt: f32,
    pub drop: f32,
}

// ------------------------------------------------------------------ sets

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SetDef {
    pub name: String,
    pub sky: [u8; 3],
    /// Cold, warm...: ambient sky and ground, sun colour.
    #[serde(default = "amb_sky")]
    pub ambient_sky: [f32; 3],
    #[serde(default = "amb_ground")]
    pub ambient_ground: [f32; 3],
    #[serde(default)]
    pub rain: bool,
    #[serde(default)]
    pub layer: Vec<CardDef>,
    /// Lamps: x, y, z, r, g, b, radius.
    #[serde(default)]
    pub lamp: Vec<[f32; 7]>,
}

fn amb_sky() -> [f32; 3] {
    [0.74, 0.74, 0.78]
}
fn amb_ground() -> [f32; 3] {
    [0.6, 0.56, 0.56]
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CardDef {
    /// Distance behind the stage (0 = beside the characters, negative = behind).
    pub z: f32,
    pub color: [u8; 3],
    pub points: Vec<[f32; 2]>,
    #[serde(default)]
    pub chaikin: u32,
    #[serde(default)]
    pub emissive: f32,
    /// A monitor's green line runs across this card.
    #[serde(default)]
    pub monitor: bool,
    /// Copies of this card along x: count, spacing.
    #[serde(default)]
    pub repeat: [f32; 2],
}

// ------------------------------------------------------------------ all of it

#[derive(Debug, Default)]
pub struct Content {
    pub cases: Vec<CaseDef>,
    pub codeblue: Option<CaseDef>,
    pub stories: BTreeMap<String, StoryDef>,
    pub plates: BTreeMap<String, PlateDef>,
    pub rigs: BTreeMap<String, RigDef>,
    pub sets: BTreeMap<String, SetDef>,
    pub level: String,
    /// In-op callouts by trigger.
    pub callouts: BTreeMap<String, CalloutDef>,
}

/// A trigger's lines: `[speaker, line]`, one picked at random. `nurse` is whoever is calling it.
#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CalloutDef {
    pub lines: Vec<Vec<String>>,
}

/// A content file's text: from disk when the program runs from the repository's root.
pub fn content_text(path: &str, built_in: &'static str) -> std::borrow::Cow<'static, str> {
    #[cfg(not(target_arch = "wasm32"))]
    if let Ok(text) = std::fs::read_to_string(format!("{DIR}/{path}")) {
        return text.into();
    }
    #[cfg(target_arch = "wasm32")]
    let _ = path;
    built_in.into()
}

fn parse<T: serde::de::DeserializeOwned>(path: &str, text: &str) -> Result<T> {
    toml::from_str(text).map_err(|e| anyhow!("{path}: {e}"))
}

impl Content {
    /// Reads every content file; the first bad one is the error, naming the file and line.
    pub fn read() -> Result<Self> {
        let mut c = Content::default();
        let mut cases: BTreeMap<String, CaseDef> = BTreeMap::new();
        for (path, built_in) in FILES {
            let text = content_text(path, built_in);
            let stem = path.rsplit('/').next().unwrap_or(path).trim_end_matches(".toml").to_string();
            match path.split('/').next().unwrap_or("") {
                "cases" => {
                    cases.insert(stem, parse(path, &text)?);
                }
                "story" => {
                    c.stories.insert(stem, parse(path, &text)?);
                }
                "plates" => {
                    c.plates.insert(stem, parse(path, &text)?);
                }
                "rigs" => {
                    c.rigs.insert(stem, parse(path, &text)?);
                }
                "sets" => {
                    c.sets.insert(stem, parse(path, &text)?);
                }
                _ if path.starts_with("callouts") => c.callouts = parse(path, &text)?,
                _ => c.level = text.into_owned(),
            }
        }
        c.codeblue = cases.remove("codeblue");
        for i in 0..CASES {
            let key = format!("case{i}");
            c.cases.push(cases.remove(&key).ok_or_else(|| anyhow!("cases/{key}.toml is missing"))?);
        }
        Ok(c)
    }

    /// Case by number; 255 is Code Blue.
    pub fn case(&self, i: u8) -> Option<&CaseDef> {
        if i == CODE_BLUE { self.codeblue.as_ref() } else { self.cases.get(i as usize) }
    }

    /// Every problem a designer can make that parsing doesn't catch.
    pub fn lint(&self) -> Vec<String> {
        let mut bad = Vec::new();
        let cue_ok = |c: &str| super::cue::id(c).is_some();
        let speaker = |who: &str, bad: &mut Vec<String>, at: &str| {
            if !who.is_empty() && who != "narrator" && !self.rigs.contains_key(who) {
                bad.push(format!("{at}: unknown speaker '{who}'"));
            }
        };
        let mut check_case = |name: String, case: &CaseDef| {
            if !self.plates.contains_key(&case.plate) {
                bad.push(format!("{name}: unknown plate '{}'", case.plate));
            }
            if case.ring.len() != 8 {
                bad.push(format!("{name}: the ring needs 8 instruments, has {}", case.ring.len()));
            }
            for t in &case.ring {
                if super::field::Tool::parse(t).is_none() {
                    bad.push(format!("{name}: unknown instrument '{t}'"));
                }
            }
            for key in [&case.before, &case.after] {
                if !key.is_empty() && !self.stories.contains_key(key) {
                    bad.push(format!("{name}: unknown story '{key}'"));
                }
            }
            if case.phase.is_empty() {
                bad.push(format!("{name}: no phases"));
            }
            for (i, p) in case.phase.iter().enumerate() {
                let at = format!("{name} phase {i}");
                if let Some(pl) = &p.plate {
                    if !self.plates.contains_key(pl) {
                        bad.push(format!("{at}: unknown plate '{pl}'"));
                    }
                }
                if p.objective.trim().is_empty() {
                    bad.push(format!("{at}: empty objective"));
                }
                for s in &p.spawn {
                    if super::field::HazardKind::parse(&s.kind).is_none() {
                        bad.push(format!("{at}: unknown hazard '{}'", s.kind));
                    }
                }
                if let Some(st) = &p.strain {
                    if !["introit", "lacrimosa", "dies_irae", "shocks", "soloist"].contains(&st.kind.as_str()) {
                        bad.push(format!("{at}: unknown strain '{}'", st.kind));
                    }
                }
                for e in &p.event {
                    for s in &e.spawn {
                        if super::field::HazardKind::parse(&s.kind).is_none() {
                            bad.push(format!("{at}: unknown hazard '{}'", s.kind));
                        }
                    }
                    if !e.say.is_empty() {
                        if e.say.len() != 2 {
                            bad.push(format!("{at}: say = [speaker, line]"));
                        } else {
                            speaker(&e.say[0], &mut bad, &at);
                            if e.say[1].trim().is_empty() {
                                bad.push(format!("{at}: empty line"));
                            }
                        }
                    }
                    if let Some(c) = &e.cue {
                        if !cue_ok(c) {
                            bad.push(format!("{at}: unknown cue '{c}'"));
                        }
                    }
                    if let Some(pl) = &e.plate {
                        if !self.plates.contains_key(pl) {
                            bad.push(format!("{at}: unknown plate '{pl}'"));
                        }
                    }
                }
            }
        };
        for (i, case) in self.cases.iter().enumerate() {
            check_case(format!("case{i}"), case);
        }
        if let Some(cb) = &self.codeblue {
            check_case("codeblue".into(), cb);
        } else {
            bad.push("codeblue: missing".into());
        }
        for (key, c) in &self.callouts {
            for l in &c.lines {
                if l.len() != 2 || l[1].trim().is_empty() {
                    bad.push(format!("callouts {key}: each line is [speaker, text]"));
                } else if l[0] != "nurse" {
                    speaker(&l[0], &mut bad, &format!("callouts {key}"));
                }
            }
        }
        for (key, story) in &self.stories {
            for (i, l) in story.line.iter().enumerate() {
                let at = format!("story {key} line {i}");
                speaker(&l.who, &mut bad, &at);
                if !l.who.is_empty() && l.text.trim().is_empty() {
                    bad.push(format!("{at}: empty text"));
                }
                if !l.expr.is_empty() {
                    match self.rigs.get(&l.who) {
                        Some(r) if !r.expr.contains_key(&l.expr) => {
                            bad.push(format!("{at}: {} has no expression '{}'", l.who, l.expr))
                        }
                        _ => {}
                    }
                }
                if !l.set.is_empty() && !self.sets.contains_key(&l.set) {
                    bad.push(format!("{at}: unknown set '{}'", l.set));
                }
                if !l.enter.is_empty() && !self.rigs.contains_key(&l.enter) {
                    bad.push(format!("{at}: unknown character '{}'", l.enter));
                }
                if !l.exit.is_empty() && l.exit != "all" && !self.rigs.contains_key(&l.exit) {
                    bad.push(format!("{at}: unknown character '{}'", l.exit));
                }
                if !l.cue.is_empty() && !cue_ok(&l.cue) {
                    bad.push(format!("{at}: unknown cue '{}'", l.cue));
                }
                if !l.camera.is_empty() && !["paper", "or"].contains(&l.camera.as_str()) {
                    bad.push(format!("{at}: unknown camera '{}'", l.camera));
                }
            }
        }
        for (key, rig) in &self.rigs {
            for need in ["neutral", "alarmed", "stern", "soft"] {
                if !rig.expr.contains_key(need) {
                    bad.push(format!("rig {key}: no '{need}' expression"));
                }
            }
            for p in &rig.part {
                if p.points.len() < 3 {
                    bad.push(format!("rig {key} part {}: fewer than 3 points", p.name));
                }
                if !rig.palette.contains_key(&p.color) {
                    bad.push(format!("rig {key} part {}: no colour '{}' in the palette", p.name, p.color));
                }
            }
        }
        for (key, set) in &self.sets {
            for (i, l) in set.layer.iter().enumerate() {
                if l.points.len() < 3 {
                    bad.push(format!("set {key} layer {i}: fewer than 3 points"));
                }
            }
        }
        for f in FILES {
            if f.1.contains("TODO") || f.1.contains("FIXME") {
                bad.push(format!("{}: leftover TODO", f.0));
            }
        }
        bad
    }
}

/// The case number of Code Blue.
pub const CODE_BLUE: u8 = 255;

static CACHE: RwLock<Option<Arc<Content>>> = RwLock::new(None);

/// The game's content, read once (or again after `reload`).
pub fn get() -> Arc<Content> {
    if let Some(c) = CACHE.read().unwrap_or_else(|e| e.into_inner()).as_ref() {
        return c.clone();
    }
    let c = Arc::new(Content::read().unwrap_or_else(|e| {
        log::error!("content: {e:#}");
        panic!("content: {e:#}");
    }));
    *CACHE.write().unwrap_or_else(|e| e.into_inner()) = Some(c.clone());
    c
}

/// Re-reads the files (dev mode, native): a bad file keeps the old content and returns the error.
pub fn reload() -> Result<()> {
    let c = Arc::new(Content::read()?);
    *CACHE.write().unwrap_or_else(|e| e.into_inner()) = Some(c);
    Ok(())
}

impl PartDef {
    /// The card's outline, rounded.
    pub fn outline(&self) -> Vec<glam::Vec2> {
        super::paper::chaikin(&self.points.iter().map(|p| glam::Vec2::new(p[0], p[1])).collect::<Vec<_>>(), self.chaikin)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn content_files_are_all_embedded() {
        // Run from the crate's folder under `cargo test`.
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src/games/surgery/content");
        let mut on_disk = Vec::new();
        for dir in ["cases", "story", "plates", "rigs", "sets"] {
            for f in std::fs::read_dir(root.join(dir)).unwrap() {
                let n = f.unwrap().file_name().to_string_lossy().to_string();
                if n.ends_with(".toml") {
                    on_disk.push(format!("{dir}/{n}"));
                }
            }
        }
        for f in on_disk {
            assert!(FILES.iter().any(|(p, _)| *p == f), "{f} isn't in content::FILES");
        }
    }

    #[test]
    fn content_passes_the_lint() {
        let c = Content::read().unwrap();
        let bad = c.lint();
        assert!(bad.is_empty(), "{bad:#?}");
    }
}
