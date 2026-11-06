//! Case and story files (text a designer edits) and the hazards they spawn.

use std::sync::{Arc, RwLock};

use glam::Vec2;
use serde::{Deserialize, Serialize};

pub const CASES_TOML: &str = include_str!("content/cases.toml");
pub const STORY_TOML: &str = include_str!("content/story.toml");
pub const RIGS_TOML: &str = include_str!("content/rigs.toml");

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(default)]
pub struct Rig {
    pub id: String,
    pub skin: String,
    pub shade: String,
    pub hair: String,
    pub cloth: String,
    pub accent: String,
    pub hair_style: u8,
    pub glasses: bool,
    pub beard: bool,
}

#[derive(Clone, Debug, Default, Deserialize)]
pub struct Rigs {
    pub face: Vec<[f32; 2]>,
    pub rig: Vec<Rig>,
}

/// The character rigs (text: content/rigs.toml; disk first when native).
pub fn rigs() -> &'static Rigs {
    static R: std::sync::OnceLock<Rigs> = std::sync::OnceLock::new();
    R.get_or_init(|| toml::from_str(&text("rigs.toml", RIGS_TOML)).unwrap_or_else(|e| panic!("rigs.toml: {e}")))
}

pub fn rig_of(who: &str) -> Rig {
    let r = rigs();
    r.rig.iter().find(|x| x.id == who).or_else(|| r.rig.iter().find(|x| x.id == "vane")).cloned().unwrap_or_default()
}

pub fn hex_rgb(h: &str) -> [u8; 3] {
    let v = u32::from_str_radix(h.trim_start_matches('#'), 16).unwrap_or(0x808080);
    [(v >> 16) as u8, (v >> 8) as u8, v as u8]
}

// Tool kinds (what a hazard stage needs).
pub const SCALPEL: u8 = 1;
pub const FORCEPS: u8 = 2;
pub const SUTURE: u8 = 3;
pub const SUCTION: u8 = 4;
pub const LASER: u8 = 5;
pub const GEL: u8 = 6;
pub const SCAN: u8 = 7;
pub const IV: u8 = 8;
pub const CRYO: u8 = 9;
pub const DRESS: u8 = 10;
pub const TOOL_NAMES: [&str; 11] =
    ["none", "Scalpel", "Forceps", "Suture", "Suction", "Laser", "Gel", "Scanner", "IV Push", "Cryoprobe", "Dressing"];

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(default)]
pub struct Phase {
    pub name: String,
    pub now: String,
    pub say: Vec<String>,
    pub spawn: Vec<String>,
    pub checkpoint: bool,
    pub beats: u32,
    pub hush_wake: bool,
    pub echo_wake: bool,
    pub rings: u32,
    pub fever: bool,
    pub shocks: u32,
    pub scripted: bool,
    pub rhythm: bool,
    pub plate_next: Option<String>,
    pub drop_vitals: Option<f32>,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(default)]
pub struct Case {
    pub id: u8,
    pub name: String,
    pub surgeon: String,
    pub plate: String,
    pub timer: f32,
    pub par: i64,
    pub patient: String,
    pub dx: String,
    pub fate: String,
    pub guided: bool,
    pub ring: Vec<u8>,
    pub strain: String,
    pub silent: bool,
    pub cryo: bool,
    pub director: bool,
    pub phase: Vec<Phase>,
}

#[derive(Clone, Debug, Default, Deserialize)]
pub struct Line {
    pub who: String,
    pub expr: String,
    pub text: String,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(default)]
pub struct Scene {
    pub id: String,
    pub set: String,
    pub music: String,
    pub line: Vec<Line>,
}

#[derive(Clone, Debug, Default)]
pub struct Content {
    pub cases: Vec<Case>,
    pub scenes: Vec<Scene>,
}

#[derive(Deserialize)]
struct CaseFile {
    case: Vec<Case>,
}
#[derive(Deserialize)]
struct StoryFile {
    scene: Vec<Scene>,
}

static CONTENT: RwLock<Option<Arc<Content>>> = RwLock::new(None);

/// Disk first when native and run from the repository (edits need no rebuild), else embedded.
fn text(file: &str, built_in: &'static str) -> std::borrow::Cow<'static, str> {
    #[cfg(not(target_arch = "wasm32"))]
    if let Ok(t) = std::fs::read_to_string(format!("crates/pav_core/src/games/surgery/content/{file}")) {
        return t.into();
    }
    #[cfg(target_arch = "wasm32")]
    let _ = file;
    built_in.into()
}

pub fn parse(cases: &str, story: &str) -> Result<Content, String> {
    let c: CaseFile = toml::from_str(cases).map_err(|e| format!("cases.toml: {e}"))?;
    let s: StoryFile = toml::from_str(story).map_err(|e| format!("story.toml: {e}"))?;
    Ok(Content { cases: c.case, scenes: s.scene })
}

pub fn load() -> Arc<Content> {
    if let Some(c) = CONTENT.read().unwrap().as_ref() {
        return c.clone();
    }
    reload().unwrap_or_else(|e| panic!("{e}"))
}

/// Re-read the content files (native: from disk) and replace the cache.
pub fn reload() -> Result<Arc<Content>, String> {
    let c = Arc::new(parse(&text("cases.toml", CASES_TOML), &text("story.toml", STORY_TOML))?);
    *CONTENT.write().unwrap() = Some(c.clone());
    Ok(c)
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Kind {
    Line,
    Lace,
    Pool,
    Bleeder,
    Hook,
    Polyp,
    Tumor,
    Burn,
    Bone,
    Nodule,
    Sac,
    Eye,
    Ember,
    Tendril,
    Dress,
}

pub const KINDS: &[(&str, Kind)] = &[
    ("line", Kind::Line),
    ("lace", Kind::Lace),
    ("pool", Kind::Pool),
    ("bleeder", Kind::Bleeder),
    ("hook", Kind::Hook),
    ("polyp", Kind::Polyp),
    ("tumor", Kind::Tumor),
    ("burn", Kind::Burn),
    ("bone", Kind::Bone),
    ("nodule", Kind::Nodule),
    ("sac", Kind::Sac),
    ("eye", Kind::Eye),
    ("ember", Kind::Ember),
    ("tendril", Kind::Tendril),
    ("dress", Kind::Dress),
];

/// A thing on the field that wants work: a list of stages, each `(tool kind, count)`.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Hz {
    pub id: u32,
    pub k: Kind,
    pub p: Vec2,
    /// Second point (lines) or axis direction (pulled objects), or target slot (bones).
    pub q: Vec2,
    pub r: f32,
    pub stages: Vec<(u8, u8)>,
    pub si: u8,
    pub cnt: u8,
    pub prog: f32,
    pub hidden: bool,
    pub covered: bool,
    pub reveal: f32,
    pub t: f32,
    /// Pulled object's current angle (rad) and its goal angle (bones).
    pub ang: f32,
    pub goal: f32,
    pub lvl: u8,
    pub aux: f32,
    pub dev: f32,
    pub dev_n: f32,
    /// Stitch positions along a lace (fractions) for the thread.
    pub stitches: Vec<f32>,
    pub last_side: i8,
    pub last_cross: f32,
    pub over: f32,
    pub grabbed: Option<u8>,
    pub frost: f32,
    pub window: f32,
    pub born: f32,
    pub grown: f32,
}

impl Hz {
    pub fn new(id: u32, k: Kind, p: Vec2) -> Self {
        Self {
            id,
            k,
            p,
            q: Vec2::X,
            r: 0.8,
            stages: vec![],
            si: 0,
            cnt: 0,
            prog: 0.0,
            hidden: false,
            covered: false,
            reveal: 0.0,
            t: 0.0,
            ang: 0.0,
            goal: 0.0,
            lvl: 0,
            aux: 0.0,
            dev: 0.0,
            dev_n: 0.0,
            stitches: vec![],
            last_side: 0,
            last_cross: -9.0,
            over: 0.0,
            grabbed: None,
            frost: 0.0,
            window: 0.0,
            born: 0.0,
            grown: 0.0,
        }
    }
    pub fn need(&self) -> u8 {
        self.stages.get(self.si as usize).map(|s| s.0).unwrap_or(0)
    }
    pub fn count(&self) -> u8 {
        self.stages.get(self.si as usize).map(|s| s.1).unwrap_or(1)
    }
    pub fn len(&self) -> f32 {
        (self.q - self.p).length()
    }
    pub fn is_line(&self) -> bool {
        matches!(self.k, Kind::Line | Kind::Lace | Kind::Dress)
    }
    /// Distance from `c` to this hazard's body.
    pub fn dist(&self, c: Vec2) -> f32 {
        if self.is_line() {
            seg_dist(c, self.p, self.q)
        } else {
            (c - self.p).length() - self.r
        }
    }
    /// Vitals drained per second while it is on the field.
    pub fn drain(&self) -> f32 {
        match self.k {
            Kind::Lace => 0.6,
            Kind::Pool => 0.2 * self.r * self.r,
            Kind::Bleeder => 3.0,
            Kind::Hook => 0.2,
            Kind::Polyp => 0.1,
            Kind::Tumor => 0.4,
            Kind::Burn => 0.2,
            Kind::Nodule => 0.35,
            Kind::Ember => 0.5,
            Kind::Sac => 0.15,
            Kind::Tendril => 0.3,
            Kind::Eye => 0.1,
            _ => 0.0,
        }
    }
}

pub fn seg_dist(c: Vec2, a: Vec2, b: Vec2) -> f32 {
    let ab = b - a;
    let l2 = ab.length_squared();
    if l2 < 1e-6 {
        return (c - a).length();
    }
    let t = ((c - a).dot(ab) / l2).clamp(0.0, 1.0);
    (c - (a + ab * t)).length()
}

pub fn kind_of_name(n: &str) -> Option<Kind> {
    KINDS.iter().find(|k| k.0 == n).map(|k| k.1)
}

/// Builds a hazard from a spawn string `"kind x z [a b] [flags]"`.
pub fn make(id: u32, s: &str, tough: f32) -> Result<Hz, String> {
    let mut it = s.split_whitespace();
    let name = it.next().ok_or("empty spawn")?;
    let k = kind_of_name(name).ok_or_else(|| format!("unknown hazard kind '{name}'"))?;
    let mut nums = Vec::new();
    let mut flags = Vec::new();
    for t in it {
        match t.parse::<f32>() {
            Ok(v) => nums.push(v),
            Err(_) => flags.push(t),
        }
    }
    let n = |i: usize, d: f32| nums.get(i).copied().unwrap_or(d);
    let mut h = Hz::new(id, k, Vec2::new(n(0, 0.0), n(1, 0.0)));
    h.hidden = flags.contains(&"hidden");
    h.covered = flags.contains(&"covered");
    match k {
        Kind::Line => {
            h.q = Vec2::new(n(2, h.p.x + 4.0), n(3, h.p.y));
            h.stages = vec![(SCALPEL, 1)];
        }
        Kind::Dress => {
            h.q = Vec2::new(n(2, h.p.x + 4.0), n(3, h.p.y));
            h.stages = vec![(DRESS, 1)];
        }
        Kind::Lace => {
            h.q = Vec2::new(n(2, h.p.x + 3.0), n(3, h.p.y));
            let cnt = ((h.len() / 0.5).ceil() as u8).clamp(3, 20);
            h.stages = vec![(SUTURE, cnt)];
        }
        Kind::Pool => {
            h.r = n(2, 1.0);
            h.stages = vec![(SUCTION, 1)];
        }
        Kind::Bleeder => {
            h.r = 0.6;
            h.stages = vec![(SUTURE, 3)];
            h.q = Vec2::X;
        }
        Kind::Hook => {
            h.r = 0.35;
            h.ang = n(2, 0.0).to_radians();
            h.q = Vec2::from_angle(h.ang);
            h.stages = vec![(FORCEPS, 1)];
        }
        Kind::Polyp => {
            h.r = 0.5;
            h.stages = vec![(LASER, 1)];
        }
        Kind::Tumor => {
            h.r = n(2, 1.2);
            h.stages = vec![(SCALPEL, 1), (FORCEPS, 1), (GEL, 1)];
            h.q = Vec2::Y;
            h.ang = std::f32::consts::FRAC_PI_2;
        }
        Kind::Burn => {
            h.r = n(2, 1.0);
            h.stages = vec![(GEL, 1)];
        }
        Kind::Bone => {
            h.r = 0.55;
            h.ang = n(2, 0.0).to_radians();
            h.q = Vec2::new(n(3, 0.0), n(4, 0.0));
            h.goal = 0.0;
            h.stages = vec![(FORCEPS, 1), (SUTURE, 2)];
        }
        Kind::Nodule => {
            h.lvl = n(2, 0.0) as u8;
            h.r = if h.lvl >= 2 && h.lvl != 3 { 0.45 } else if h.lvl == 3 { 0.9 } else { 0.6 };
            h.ang = 0.0;
            h.q = Vec2::X;
            h.stages = match h.lvl {
                3 => vec![(SCALPEL, 3), (LASER, 1), (FORCEPS, 1)],
                _ => vec![(LASER, 1), (FORCEPS, 1)],
            };
            h.hidden = flags.contains(&"hidden") || (h.lvl == 0 && !flags.contains(&"seen"));
        }
        Kind::Sac => {
            h.r = 0.7;
            h.aux = n(2, 10.0) / tough.max(0.1); // beats to full size
            h.stages = vec![(LASER, 1)];
        }
        Kind::Eye => {
            h.r = 1.5;
            h.q = Vec2::X;
            h.stages = vec![(SCALPEL, 2)];
            h.window = 4.0;
        }
        Kind::Ember => {
            h.r = 0.7;
            h.stages = vec![(CRYO, 1), (SCALPEL, 1), (FORCEPS, 3)];
            h.q = Vec2::X;
        }
        Kind::Tendril => {
            h.r = 0.6;
            h.ang = 0.0;
            h.q = Vec2::Y;
            h.stages = vec![(FORCEPS, 1)];
        }
    }
    Ok(h)
}

pub const PLATES_TOML: &str = include_str!("content/plates.toml");

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(default)]
pub struct PlateDef {
    pub id: String,
    pub bed: String,
    pub flesh: String,
    pub top: String,
    pub vein: String,
    pub veins: f32,
    pub ridges: f32,
    pub lobes: Vec<[f32; 5]>,
}

#[derive(Clone, Debug, Default, Deserialize)]
pub struct Plates {
    pub plate: Vec<PlateDef>,
}

/// The tissue plates (text: content/plates.toml; disk first when native).
pub fn plates() -> &'static Plates {
    static R: std::sync::OnceLock<Plates> = std::sync::OnceLock::new();
    R.get_or_init(|| toml::from_str(&text("plates.toml", PLATES_TOML)).unwrap_or_else(|e| panic!("plates.toml: {e}")))
}
