//! The operative field: hazards, instruments and ratings. All logic is 2D in the field plane.

use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::Surgery;
use super::content::SpawnDef;
use super::cue;
use super::tune;
use crate::frame::SimEvent;
use crate::input::{SurgeonInput, hands};

/// The instruments. The numbers are their ids everywhere (tray, HUD, sound).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[repr(u8)]
pub enum Tool {
    #[default]
    Scalpel = 0,
    Forceps = 1,
    Suture = 2,
    Suction = 3,
    Laser = 4,
    Gel = 5,
    Scanner = 6,
    Iv = 7,
    Cryo = 8,
    Dressing = 9,
    Defib = 10,
}

impl Tool {
    pub const ALL: [Tool; 11] = [
        Tool::Scalpel,
        Tool::Forceps,
        Tool::Suture,
        Tool::Suction,
        Tool::Laser,
        Tool::Gel,
        Tool::Scanner,
        Tool::Iv,
        Tool::Cryo,
        Tool::Dressing,
        Tool::Defib,
    ];

    pub fn parse(s: &str) -> Option<Tool> {
        Some(match s {
            "scalpel" => Tool::Scalpel,
            "forceps" => Tool::Forceps,
            "suture" => Tool::Suture,
            "suction" => Tool::Suction,
            "laser" => Tool::Laser,
            "gel" => Tool::Gel,
            "scanner" => Tool::Scanner,
            "iv" => Tool::Iv,
            "cryo" => Tool::Cryo,
            "dressing" => Tool::Dressing,
            "defib" => Tool::Defib,
            _ => return None,
        })
    }

    pub fn name(self) -> &'static str {
        match self {
            Tool::Scalpel => "Scalpel",
            Tool::Forceps => "Forceps",
            Tool::Suture => "Suture",
            Tool::Suction => "Suction",
            Tool::Laser => "Laser",
            Tool::Gel => "Gel",
            Tool::Scanner => "Scanner",
            Tool::Iv => "IV Push",
            Tool::Cryo => "Cryoprobe",
            Tool::Dressing => "Dressing",
            Tool::Defib => "Defibrillator",
        }
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[repr(u8)]
pub enum HazardKind {
    #[default]
    Incision = 0,
    Laceration = 1,
    Pool = 2,
    Bleeder = 3,
    Foreign = 4,
    Polyp = 5,
    Tumor = 6,
    Burn = 7,
    Bone = 8,
    Nodule = 9,
    Sac = 10,
    Crown = 11,
    Eye = 12,
    Ember = 13,
    Tether = 14,
    Tendril = 15,
    Closure = 16,
    Furnace = 17,
}

impl HazardKind {
    pub const ALL: [HazardKind; 18] = [
        HazardKind::Incision,
        HazardKind::Laceration,
        HazardKind::Pool,
        HazardKind::Bleeder,
        HazardKind::Foreign,
        HazardKind::Polyp,
        HazardKind::Tumor,
        HazardKind::Burn,
        HazardKind::Bone,
        HazardKind::Nodule,
        HazardKind::Sac,
        HazardKind::Crown,
        HazardKind::Eye,
        HazardKind::Ember,
        HazardKind::Tether,
        HazardKind::Tendril,
        HazardKind::Closure,
        HazardKind::Furnace,
    ];

    pub fn parse(s: &str) -> Option<HazardKind> {
        Some(match s {
            "incision" => HazardKind::Incision,
            "laceration" => HazardKind::Laceration,
            "pool" => HazardKind::Pool,
            "bleeder" => HazardKind::Bleeder,
            "foreign" => HazardKind::Foreign,
            "polyp" => HazardKind::Polyp,
            "tumor" => HazardKind::Tumor,
            "burn" => HazardKind::Burn,
            "bone" => HazardKind::Bone,
            "nodule" => HazardKind::Nodule,
            "sac" => HazardKind::Sac,
            "crown" => HazardKind::Crown,
            "eye" => HazardKind::Eye,
            "ember" => HazardKind::Ember,
            "tether" => HazardKind::Tether,
            "tendril" => HazardKind::Tendril,
            "closure" => HazardKind::Closure,
            "furnace" => HazardKind::Furnace,
            _ => return None,
        })
    }

    pub fn name(self) -> &'static str {
        match self {
            HazardKind::Incision => "incision",
            HazardKind::Laceration => "laceration",
            HazardKind::Pool => "pool",
            HazardKind::Bleeder => "bleeder",
            HazardKind::Foreign => "foreign",
            HazardKind::Polyp => "polyp",
            HazardKind::Tumor => "tumor",
            HazardKind::Burn => "burn",
            HazardKind::Bone => "bone",
            HazardKind::Nodule => "nodule",
            HazardKind::Sac => "sac",
            HazardKind::Crown => "crown",
            HazardKind::Eye => "eye",
            HazardKind::Ember => "ember",
            HazardKind::Tether => "tether",
            HazardKind::Tendril => "tendril",
            HazardKind::Closure => "closure",
            HazardKind::Furnace => "furnace",
        }
    }
}

/// What work that doesn't advance the operation pays of a full award: a dose of the IV, a second
/// heat pass on the same target, or a wound that wasn't on the chart (a slip, or what a strain leaves
/// behind). Otherwise a slower player would have more to stitch, and so more to score.
const REPEAT_SHARE: f32 = 0.25;

/// How well an action went. Numbers are array indices.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[repr(u8)]
pub enum Rating {
    Immaculate = 0,
    Clean = 1,
    Good = 2,
    Sloppy = 3,
}

impl Rating {
    pub fn word(self) -> &'static str {
        match self {
            Rating::Immaculate => "IMMACULATE",
            Rating::Clean => "CLEAN",
            Rating::Good => "GOOD",
            Rating::Sloppy => "SLOPPY",
        }
    }
    pub fn points(self) -> f32 {
        match self {
            Rating::Immaculate => 400.0,
            Rating::Clean => 250.0,
            Rating::Good => 120.0,
            Rating::Sloppy => 10.0,
        }
    }
    /// Rates an error against three limits: Immaculate, Clean, Good; else Sloppy. A strictness
    /// above 1 shrinks the limits.
    pub fn from_error(err: f32, limits: [f32; 3], strict: f32) -> Rating {
        let e = err * strict.max(0.1);
        if e <= limits[0] {
            Rating::Immaculate
        } else if e <= limits[1] {
            Rating::Clean
        } else if e <= limits[2] {
            Rating::Good
        } else {
            Rating::Sloppy
        }
    }
}

/// Anything on the field: a data-spawned object with position, progress and a drain.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Hazard {
    pub id: u32,
    pub kind: HazardKind,
    pub pos: Vec2,
    /// A polyline, for what follows a line.
    pub pts: Vec<Vec2>,
    /// The pull axis, or the angle a bone must reach (radians).
    pub axis: f32,
    /// Current rotation (a bone fragment).
    pub angle: f32,
    pub r: f32,
    /// Tool progress: along a line in units, or 0..1.
    pub progress: f32,
    /// Heat or frost ring, 0..1.3.
    pub heat: f32,
    pub stage: u8,
    pub hidden: bool,
    /// Seconds a hidden thing stays revealed.
    pub reveal: f32,
    /// A nodule's next stop, a bone's home, a sac's stem anchor.
    pub to: Vec2,
    /// A timer: age, step, window.
    pub t: f32,
    /// Seconds until it times out (0 = never).
    pub life: f32,
    pub group: u16,
    pub parent: u32,
    pub required: bool,
    pub drain: f32,
    /// Deviation so far on a stroke.
    pub dev: f32,
    /// A stroke lifted partway (it can't rate above Good).
    pub broken: bool,
    /// Stitches, or strokes.
    pub count: u8,
    pub last_s: f32,
    pub last_t: f32,
    pub err: f32,
    /// A forceps pull's current offset, for drawing.
    pub drag: Vec2,
    /// Who is on it (slot + 1, 0 = nobody).
    pub by: u8,
    /// Look: 0 hook, 1 shard, 2 splinter, 3 ember shard, 4 cyst...
    pub tag: u8,
    /// Locked until its tethers are cut.
    pub locked: bool,
    /// A mark the Scanner or the first-time guide puts on it.
    pub lit: f32,
    /// A heat pass on it has already paid: a nodule that shelled over again pays less the next time.
    pub heat_paid: bool,
}

impl Hazard {
    pub fn len(&self) -> f32 {
        polyline_len(&self.pts)
    }
    pub fn is_line(&self) -> bool {
        matches!(
            self.kind,
            HazardKind::Incision | HazardKind::Laceration | HazardKind::Tether | HazardKind::Closure | HazardKind::Tendril
        )
    }
    /// Can this instrument act on it now?
    pub fn accepts(&self, tool: Tool) -> bool {
        use HazardKind as K;
        if self.hidden && self.reveal <= 0.0 {
            return false;
        }
        if self.locked {
            return false;
        }
        match tool {
            Tool::Scalpel => matches!(self.kind, K::Incision | K::Tether),
            Tool::Forceps => match self.kind {
                K::Foreign | K::Tendril => true,
                K::Tumor => self.stage == 1,
                K::Nodule => self.stage == 1,
                K::Eye => self.stage == 2,
                K::Bone => self.stage == 0,
                K::Furnace => self.stage == 2,
                _ => false,
            },
            Tool::Suture => match self.kind {
                K::Laceration | K::Bleeder => true,
                K::Bone => self.stage == 1,
                K::Furnace => self.stage == 5,
                _ => false,
            },
            Tool::Suction => matches!(self.kind, K::Pool | K::Sac),
            Tool::Laser => match self.kind {
                K::Polyp | K::Sac => true,
                K::Nodule => self.stage == 0 && self.t <= 0.0,
                K::Furnace => self.stage == 3,
                _ => false,
            },
            Tool::Gel => match self.kind {
                K::Burn => true,
                K::Tumor => self.stage == 2,
                K::Eye => self.stage == 3,
                K::Furnace => self.stage == 4,
                _ => false,
            },
            Tool::Cryo => match self.kind {
                K::Ember => self.stage == 0,
                K::Furnace => self.stage == 0,
                _ => false,
            },
            Tool::Dressing => self.kind == K::Closure,
            Tool::Scanner | Tool::Iv | Tool::Defib => false,
        }
    }
    /// The next instrument this wants, for the guide and the bot.
    pub fn wants(&self) -> Option<Tool> {
        [Tool::Scalpel, Tool::Forceps, Tool::Suture, Tool::Suction, Tool::Laser, Tool::Gel, Tool::Cryo, Tool::Dressing]
            .into_iter()
            .find(|t| self.accepts(*t))
    }
    /// Where the instrument touches it now.
    pub fn touch_point(&self) -> Vec2 {
        if self.is_line() {
            polyline_at(&self.pts, self.progress).0
        } else if self.kind == HazardKind::Sac {
            self.pos.lerp(self.to, 0.5)
        } else {
            self.pos
        }
    }
}

/// Length of a polyline.
pub fn polyline_len(pts: &[Vec2]) -> f32 {
    pts.windows(2).map(|w| w[0].distance(w[1])).sum()
}

/// The point `s` along a polyline and the unit tangent there.
pub fn polyline_at(pts: &[Vec2], s: f32) -> (Vec2, Vec2) {
    if pts.is_empty() {
        return (Vec2::ZERO, Vec2::X);
    }
    let mut left = s.max(0.0);
    for w in pts.windows(2) {
        let l = w[0].distance(w[1]);
        if left <= l && l > 0.0 {
            return (w[0].lerp(w[1], left / l), (w[1] - w[0]) / l);
        }
        left -= l;
    }
    let n = pts.len();
    if n >= 2 { (pts[n - 1], (pts[n - 1] - pts[n - 2]).normalize_or_zero()) } else { (pts[0], Vec2::X) }
}

/// The nearest point on a polyline within `[from, to]` of its length: (s, distance).
pub fn polyline_project(pts: &[Vec2], p: Vec2, from: f32, to: f32) -> (f32, f32) {
    let (mut best_s, mut best_d) = (from, f32::MAX);
    let mut at = 0.0;
    for w in pts.windows(2) {
        let l = w[0].distance(w[1]);
        if l > 1e-5 {
            let t = ((p - w[0]).dot(w[1] - w[0]) / (l * l)).clamp(0.0, 1.0);
            let s = (at + t * l).clamp(from, to);
            let q = polyline_at(pts, s).0;
            let d = q.distance(p);
            if d < best_d {
                best_d = d;
                best_s = s;
            }
        }
        at += l;
    }
    (best_s, best_d)
}

/// What stays behind on the field.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Stain {
    /// 0 pool stain, 1 thread (sutures), 2 scar line, 3 frost, 4 gel sheen.
    pub kind: u8,
    pub pos: Vec2,
    pub r: f32,
    pub pts: Vec<Vec2>,
}

/// A rating in the air over the field.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Popup {
    pub pos: Vec2,
    pub rating: Rating,
    pub on_beat: bool,
    pub chain: u32,
    pub slot: u8,
    pub age: f32,
    /// The points it earned.
    pub points: u32,
}

/// One surgeon slot.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Surgeon {
    pub present: bool,
    /// Driven by the bot (partner, attract, dev).
    pub bot: bool,
    pub cursor: Vec2,
    pub raw: Vec2,
    pub tool: Tool,
    /// The hazard the tool is on.
    pub engaged: u32,
    pub using: bool,
    pub pressure: f32,
    pub grab: Vec2,
    pub side: i8,
    pub use_t: f32,
    pub moved: f32,
    pub flow: f32,
    pub waste: f32,
    pub dose: f32,
    pub iv_cool: f32,
    pub iv_on: bool,
    pub charge: f32,
    pub charging: bool,
    pub score: i32,
    pub chain: u32,
    pub chain_t: f32,
    pub best_chain: u32,
    pub gift: f32,
    pub gift_hold: bool,
    pub counts: [u32; 4],
    pub last_tool: Tool,
    pub last_rating: u8,
    /// Recoil on a good action, for drawing.
    pub kick: f32,
    pub ping_t: f32,
    pub assist: f32,
    /// Bone rotation asked for (for drawing and a test).
    pub rotate: i8,
    /// Tool actions finished.
    pub actions: u32,
    pub on_beats: u32,
    pub mistakes: u32,
    /// The clock at the last finished action (the bot thinks after one).
    pub last_action: f32,
    /// Seconds before a context tool comes back to hand, after picking another.
    pub away: f32,
}

/// A ghost hand of the Echo on its way to repeat an action.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GhostHand {
    pub slot: u8,
    pub tool: Tool,
    pub rating: Rating,
    pub target: u32,
    pub from: Vec2,
    pub t: f32,
}

/// Seconds a ghost hand takes to reach its target.
pub const GHOST_TRAVEL: f32 = 0.32;

impl Surgery {
    /// A hazard from data.
    pub fn spawn_def(&mut self, d: &SpawnDef) -> u32 {
        let kind = HazardKind::parse(&d.kind).unwrap_or(HazardKind::Foreign);
        let mut h = Hazard { kind, pos: Vec2::new(d.at[0], d.at[1]), ..Default::default() };
        h.pts = d.pts.iter().map(|p| Vec2::new(p[0], p[1])).collect();
        h.axis = d.axis.to_radians();
        h.angle = d.angle.to_radians();
        h.to = Vec2::new(d.to[0], d.to[1]);
        h.r = if d.r > 0.0 { d.r } else { default_radius(kind) };
        h.hidden = d.hidden;
        h.tag = match d.tag.as_str() {
            "hook" => 0,
            "shard" => 1,
            "splinter" => 2,
            "ember" => 3,
            "cyst" => 4,
            "inflammation" => 5,
            "seed" => 6,
            _ => 0,
        };
        h.required = !d.optional;
        let (pos, r) = (h.pos, h.r);
        let id = self.add_hazard(h);
        if kind == HazardKind::Tumor {
            // The ring cut around it: a closed line.
            let n = 14;
            let pts: Vec<Vec2> = (0..=n)
                .map(|i| {
                    let a = i as f32 / n as f32 * std::f32::consts::TAU - std::f32::consts::FRAC_PI_2;
                    pos + Vec2::new(a.cos() * (r + 0.55), a.sin() * (r * 0.8 + 0.5))
                })
                .collect();
            self.add_hazard(Hazard { kind: HazardKind::Incision, pts, pos, parent: id, required: true, ..Default::default() });
        }
        id
    }

    /// Adds a hazard, filling in the table's drain and what a kind always has.
    pub fn add_hazard(&mut self, mut h: Hazard) -> u32 {
        h.id = self.op.next_id;
        self.op.next_id += 1;
        let caustic = h.drain;
        h.drain = match h.kind {
            HazardKind::Pool => caustic,
            HazardKind::Laceration => 0.6,
            HazardKind::Bleeder => 3.0,
            HazardKind::Foreign => 0.2,
            HazardKind::Polyp => 0.1,
            HazardKind::Tumor => 0.4,
            HazardKind::Burn => 0.2,
            HazardKind::Nodule => 0.5,
            HazardKind::Sac => 0.2,
            HazardKind::Ember => 0.3,
            _ => 0.0,
        };
        if h.kind == HazardKind::Pool {
            h.required = false;
        }
        if h.kind == HazardKind::Crown {
            h.required = false;
        }
        if h.kind == HazardKind::Bleeder && h.pts.is_empty() {
            let d = Vec2::from_angle(h.axis) * 0.75;
            h.pts = vec![h.pos - d, h.pos + d];
        }
        if h.is_line() && h.pos == Vec2::ZERO && !h.pts.is_empty() {
            h.pos = polyline_at(&h.pts, h.len() * 0.5).0;
        }
        self.op.counters.spawned(h.kind);
        let id = h.id;
        self.op.hazards.push(h);
        id
    }

    pub fn hazard(&self, id: u32) -> Option<&Hazard> {
        self.op.hazards.iter().find(|h| h.id == id)
    }

    pub fn hazard_mut(&mut self, id: u32) -> Option<&mut Hazard> {
        self.op.hazards.iter_mut().find(|h| h.id == id)
    }

    /// Is `h` under a pool of blood right now (a pool hides what lies under it)?
    pub fn covered(&self, h: &Hazard) -> bool {
        if !matches!(h.kind, HazardKind::Foreign | HazardKind::Polyp | HazardKind::Nodule) {
            return false;
        }
        self.op.hazards.iter().any(|p| p.kind == HazardKind::Pool && p.pos.distance(h.pos) < p.r * 0.92)
    }

    /// The valid target for `tool` nearest the point, if any is in reach.
    pub fn target_near(&self, tool: Tool, p: Vec2, reach: f32) -> Option<u32> {
        let mut best = None;
        let mut best_d = f32::MAX;
        for h in &self.op.hazards {
            if !h.accepts(tool) || self.covered(h) {
                continue;
            }
            let d = match h.kind {
                _ if h.is_line() => {
                    if tool == Tool::Forceps {
                        polyline_at(&h.pts, h.progress).0.distance(p)
                    } else {
                        polyline_project(&h.pts, p, h.progress, h.len()).1
                    }
                }
                HazardKind::Bleeder => polyline_project(&h.pts, p, 0.0, h.len()).1,
                HazardKind::Sac if tool == Tool::Laser => h.pos.lerp(h.to, 0.5).distance(p),
                _ => h.touch_point().distance(p) - h.r.min(1.6),
            };
            if d < reach && d < best_d {
                best = Some(h.id);
                best_d = d;
            }
        }
        best
    }

    fn cue(&self, events: &mut Vec<SimEvent>, id: u16, at: Vec2, gain: f32, pitch: f32) {
        events.push(SimEvent::Cue { id, pos: Vec3::new(at.x, 0.0, at.y), gain, pitch });
    }

    /// Pushes a cue (for the strains and the director too).
    pub fn cue_at(&self, events: &mut Vec<SimEvent>, id: u16, at: Vec2) {
        self.cue(events, id, at, 1.0, 1.0);
    }

    /// One tick of one surgeon's hands. `dt` is rule time; the cursor is real time.
    pub(super) fn hands(&mut self, slot: usize, inp: &SurgeonInput, dt: f32, real_dt: f32, events: &mut Vec<SimEvent>) {
        // The cursor: raw aim, plus the rail and the tremor, both from the sim so replays hold.
        let (mut cursor, raw_prev) = (inp.aim, self.surgeons[slot].raw);
        {
            let tremor_on = self.tremor_for(slot);
            let s = &mut self.surgeons[slot];
            s.raw = inp.aim;
            s.assist = inp.assist;
            s.rotate = inp.rotate;
            s.pressure = if inp.held & hands::USE != 0 { inp.pressure.clamp(0.05, 1.0) } else { 0.0 };
            if tremor_on && inp.held & hands::PRECISION == 0 {
                let t = self.op.clock;
                cursor +=
                    Vec2::new((t * 1.3).sin() + 0.5 * (t * 2.9).sin(), (t * 1.1 + 1.0).sin() + 0.5 * (t * 3.3).cos()) * 0.08;
            }
        }
        self.surgeons[slot].kick = (self.surgeons[slot].kick - real_dt * 4.0).max(0.0);
        // Rail assist while the scalpel is on a line.
        let engaged = self.surgeons[slot].engaged;
        if inp.assist > 0.0 && engaged != 0 && self.surgeons[slot].tool == Tool::Scalpel {
            if let Some(h) = self.hazard(engaged) {
                let (s_on, _) = polyline_project(&h.pts, cursor, h.progress, (h.progress + 2.0).min(h.len()));
                let on = polyline_at(&h.pts, s_on).0;
                cursor = on + (cursor - on) * (1.0 - 0.72 * inp.assist.min(1.0));
            }
        }
        let prev_cursor = self.surgeons[slot].cursor;
        self.surgeons[slot].cursor = cursor;
        let _ = raw_prev;

        // Tool pick: a flick or digit asks for a ring place. A context tool overrides.
        let ring_tool = (inp.tool >= 0).then(|| self.op.ring.get(inp.tool as usize).copied()).flatten();
        if let Some(t) = ring_tool {
            if t != self.surgeons[slot].tool {
                self.release(slot);
                self.surgeons[slot].tool = t;
                self.op.counters.picked(t);
                let at = self.surgeons[slot].cursor;
                self.cue(events, cue::PICK, at, 0.8, 1.0 + t as u8 as f32 * 0.05);
                // The dressing steps aside for a moment: the patient may need the IV first.
                self.surgeons[slot].away = 2.5;
            }
        }
        if let Some(t) = self.op.forced_tool {
            let s = &mut self.surgeons[slot];
            if s.using || s.iv_on {
                s.away = s.away.max(0.8);
            }
            s.away = (s.away - real_dt).max(0.0);
            if s.tool != t && s.away <= 0.0 {
                self.release(slot);
                self.surgeons[slot].tool = t;
            }
        }
        if inp.pressed & hands::CANCEL != 0 {
            self.release(slot);
            return;
        }

        let down = inp.held & hands::USE != 0;
        let just = inp.pressed & hands::USE != 0;
        let tool = self.surgeons[slot].tool;
        self.surgeons[slot].using = down;
        if just {
            self.wrong_tool_check(slot, tool, events);
        }
        match tool {
            Tool::Scalpel | Tool::Dressing => self.stroke(slot, tool, down, just, prev_cursor, events),
            Tool::Forceps => self.forceps(slot, down, just, inp.rotate, dt, events),
            Tool::Suture => self.suture(slot, down, dt, events),
            Tool::Suction => self.suction(slot, down, dt, events),
            Tool::Laser => self.heat_tool(slot, Tool::Laser, down, dt, events),
            Tool::Cryo => self.heat_tool(slot, Tool::Cryo, down, dt, events),
            Tool::Gel => self.gel(slot, down, dt, events),
            Tool::Scanner => self.scanner(slot, down, dt, events),
            Tool::Iv => self.iv(slot, down, just, dt, events),
            Tool::Defib => {}
        }
        // Meters refill and cool whatever is in hand.
        let s = &mut self.surgeons[slot];
        s.flow = (s.flow + dt * 0.4).min(1.0);
        s.iv_cool = (s.iv_cool - dt).max(0.0);
    }

    /// Lets go of whatever the tool is on.
    pub fn release(&mut self, slot: usize) {
        let id = self.surgeons[slot].engaged;
        self.surgeons[slot].engaged = 0;
        self.surgeons[slot].use_t = 0.0;
        self.surgeons[slot].moved = 0.0;
        self.surgeons[slot].iv_on = false;
        self.surgeons[slot].dose = 0.0;
        if let Some(h) = self.hazard_mut(id) {
            h.by = 0;
            h.drag = Vec2::ZERO;
            if h.kind == HazardKind::Incision || h.kind == HazardKind::Tether || h.kind == HazardKind::Closure {
                h.broken = h.progress > 0.0;
            }
        }
    }

    fn wrong_tool_check(&mut self, slot: usize, tool: Tool, events: &mut Vec<SimEvent>) {
        if matches!(tool, Tool::Suction | Tool::Scanner | Tool::Iv | Tool::Defib | Tool::Dressing) {
            return;
        }
        let at = self.surgeons[slot].cursor;
        if self.target_near(tool, at, 0.9).is_some() {
            return;
        }
        // Something is under the cursor that wants another instrument.
        let under = self.op.hazards.iter().any(|h| {
            if h.kind == HazardKind::Pool || h.kind == HazardKind::Crown || (h.hidden && h.reveal <= 0.0) || h.locked {
                return false;
            }
            let d = if h.pts.len() >= 2 { polyline_project(&h.pts, at, 0.0, h.len()).1 } else { h.pos.distance(at) - h.r };
            d < 0.45 && !h.accepts(tool) && h.wants().is_some()
        });
        if under {
            self.surgeons[slot].chain = 0;
            let penalty = self.tune.get(tune::WRONG_TOOL);
            self.hurt(penalty);
            self.cue(events, cue::CLINK, at, 1.0, 1.0);
            self.op.counters.bump("wrong_tool");
            self.callout("wrong_tool");
        }
    }

    /// Follows a line in one stroke: the Scalpel, and the Dressing at the close.
    fn stroke(&mut self, slot: usize, tool: Tool, down: bool, just: bool, prev: Vec2, events: &mut Vec<SimEvent>) {
        let cursor = self.surgeons[slot].cursor;
        if !down {
            if self.surgeons[slot].engaged != 0 {
                self.release(slot);
            }
            self.surgeons[slot].moved = 0.0;
            return;
        }
        let engaged = self.surgeons[slot].engaged;
        if engaged == 0 {
            // Engage on the point the line has reached.
            let on_line = self.op.hazards.iter().find(|h| {
                h.accepts(tool) && h.by == 0 && polyline_at(&h.pts, h.progress).0.distance(cursor) < if just { 1.1 } else { 0.8 }
            });
            if let Some(id) = on_line.map(|h| h.id) {
                self.surgeons[slot].engaged = id;
                self.surgeons[slot].moved = 0.0;
                let g = (slot + 1) as u8;
                if let Some(h) = self.hazard_mut(id) {
                    h.by = g;
                }
                self.cue(events, cue::SLICE, cursor, 0.7, 1.0);
                self.op.counters.used(tool);
            } else if tool == Tool::Scalpel {
                // Dragging over healthy tissue: a small laceration, and it costs the patient.
                let s = &mut self.surgeons[slot];
                s.moved += cursor.distance(prev);
                if s.moved > 1.3 && cursor.y < 5.0 {
                    s.moved = 0.0;
                    self.healthy_cut(slot, prev, cursor, events);
                }
            }
            return;
        }
        let Some(h) = self.hazard(engaged) else {
            self.surgeons[slot].engaged = 0;
            return;
        };
        let (len, from) = (h.len(), h.progress);
        let window = (from + 1.8).min(len);
        let (s_on, dist) = polyline_project(&h.pts, cursor, from, window);
        let limit = if tool == Tool::Dressing { 2.4 } else { 1.5 };
        if dist > limit {
            self.release(slot);
            if tool == Tool::Scalpel {
                self.healthy_cut(slot, prev, cursor, events);
            }
            return;
        }
        let power = self.tune.get(tune::TOOL_POWER);
        let h = self.hazard_mut(engaged).unwrap();
        if s_on > h.progress {
            let room = 8.0 * power / 60.0 * 1.0; // the blade can't teleport
            let step = (s_on - h.progress).min(room.max(0.15));
            h.progress += step;
            h.dev = h.dev.max(dist);
        }
        if h.progress >= len - 0.12 {
            let (dev, broken, kind, pos) = (h.dev, h.broken, h.kind, h.touch_point());
            let strict = self.tune.get(tune::STRICT);
            let mut rating = Rating::from_error(dev, [0.25, 0.5, 0.85], strict);
            if tool == Tool::Dressing {
                rating = Rating::from_error(dev, [0.8, 1.3, 1.8], strict);
            }
            if broken && rating < Rating::Good {
                rating = Rating::Good;
            }
            self.surgeons[slot].engaged = 0;
            self.award(slot, rating, tool, pos, false, events);
            self.finish_hazard(engaged, slot, rating, events);
            let _ = kind;
        }
    }

    fn healthy_cut(&mut self, slot: usize, from: Vec2, to: Vec2, events: &mut Vec<SimEvent>) {
        let d = (to - from).normalize_or(Vec2::X);
        let mid = to;
        let pts = vec![mid - d * 0.6, mid + d * 0.6];
        self.add_hazard(Hazard { kind: HazardKind::Laceration, pts, pos: mid, required: false, ..Default::default() });
        self.hurt(3.0);
        self.mistake(slot);
        self.surgeons[slot].chain = 0;
        self.cue(events, cue::TEAR, mid, 1.0, 1.0);
        self.callout("healthy");
    }

    /// Hold to grab, pull along the axis, it comes out. A bone fragment follows the hand instead.
    fn forceps(&mut self, slot: usize, down: bool, just: bool, rotate: i8, dt: f32, events: &mut Vec<SimEvent>) {
        let cursor = self.surgeons[slot].cursor;
        if !down {
            if self.surgeons[slot].engaged != 0 {
                self.release(slot);
            }
            return;
        }
        let mut engaged = self.surgeons[slot].engaged;
        if engaged == 0 {
            if !just {
                return;
            }
            let Some(id) = self.target_near(Tool::Forceps, cursor, 0.9) else { return };
            engaged = id;
            self.surgeons[slot].engaged = id;
            self.surgeons[slot].grab = cursor;
            let g = (slot + 1) as u8;
            if let Some(h) = self.hazard_mut(id) {
                h.by = g;
                h.count = 0;
            }
            self.cue(events, cue::GRAB, cursor, 0.9, 1.0);
            self.op.counters.used(Tool::Forceps);
        }
        let grab = self.surgeons[slot].grab;
        let Some(kind) = self.hazard(engaged).map(|h| h.kind) else {
            self.surgeons[slot].engaged = 0;
            return;
        };
        match kind {
            HazardKind::Bone => {
                let h = self.hazard_mut(engaged).unwrap();
                h.pos = cursor;
                h.angle += rotate as f32 * dt * 2.6;
                let home = h.pos.distance(h.to) < 0.35;
                let turned = angle_diff(h.angle, h.axis).abs() < 12f32.to_radians();
                if home && turned {
                    let (to, axis, tries) = (h.to, h.axis, h.count);
                    h.pos = to;
                    h.angle = axis;
                    h.stage = 1;
                    h.by = 0;
                    let d = Vec2::from_angle(axis + std::f32::consts::FRAC_PI_2) * 0.5;
                    h.pts = vec![to - d, to + d];
                    h.progress = 0.0;
                    self.surgeons[slot].engaged = 0;
                    self.cue(events, cue::SNAP, to, 1.0, 1.0);
                    self.op.counters.bump("bone_snap");
                    let rating = if tries == 0 { Rating::Immaculate } else { Rating::Clean };
                    self.award(slot, rating, Tool::Forceps, to, false, events);
                }
            }
            HazardKind::Tendril => self.tendril_pull(slot, engaged, dt, events),
            _ => {
                let d = cursor - grab;
                let pull = d.length();
                let h = self.hazard_mut(engaged).unwrap();
                h.drag = d.clamp_length_max(0.9);
                h.progress = (pull / 1.0).min(1.0);
                if pull >= 1.0 {
                    let axis = h.axis;
                    let err = angle_diff(d.y.atan2(d.x), axis).abs().to_degrees();
                    let pos = h.pos;
                    let strict = self.tune.get(tune::STRICT);
                    let rating = Rating::from_error(err, [16.0, 30.0, 52.0], strict);
                    self.surgeons[slot].engaged = 0;
                    if err * strict > 78.0 {
                        // Yanked off-axis: it tears.
                        let dir = d.normalize_or(Vec2::X);
                        let pts = vec![pos - dir * 0.8, pos + dir * 0.8];
                        self.add_hazard(Hazard { kind: HazardKind::Laceration, pts, pos, required: false, ..Default::default() });
                        self.mistake(slot);
                        self.cue(events, cue::TEAR, pos, 1.0, 1.0);
                        self.callout("off_axis");
                    }
                    self.cue(events, cue::POP, pos, 1.0, 1.0);
                    self.award(slot, rating, Tool::Forceps, pos, false, events);
                    self.finish_hazard(engaged, slot, rating, events);
                }
            }
        }
    }

    /// Zigzag across the wound: each crossing near the needle is a stitch.
    fn suture(&mut self, slot: usize, down: bool, dt: f32, events: &mut Vec<SimEvent>) {
        let cursor = self.surgeons[slot].cursor;
        if !down {
            if self.surgeons[slot].engaged != 0 {
                self.release(slot);
            }
            self.surgeons[slot].side = 0;
            return;
        }
        let mut engaged = self.surgeons[slot].engaged;
        if engaged == 0 {
            let Some(id) = self.target_near(Tool::Suture, cursor, 1.1) else { return };
            engaged = id;
            self.surgeons[slot].engaged = id;
            self.surgeons[slot].side = 0;
            let (g, clock) = ((slot + 1) as u8, self.op.clock);
            if let Some(h) = self.hazard_mut(id) {
                h.by = g;
                h.last_t = clock;
            }
            self.op.counters.used(Tool::Suture);
        }
        let assist = self.surgeons[slot].assist;
        let clock = self.op.clock;
        let Some(h) = self.hazard(engaged) else {
            self.surgeons[slot].engaged = 0;
            return;
        };
        let len = h.len();
        let (needle, tangent) = polyline_at(&h.pts, h.progress);
        let normal = Vec2::new(-tangent.y, tangent.x);
        let rel = cursor - needle;
        let across = rel.dot(normal);
        let along = rel.dot(tangent);
        // The needle creeps along by itself on a pad or keys.
        let creep = 0.42 * assist.min(1.0) * dt;
        let side_now = if across > 0.05 {
            1
        } else if across < -0.05 {
            -1
        } else {
            0
        };
        let near = (along.abs() < 1.5 || assist > 0.0) && across.abs() < 2.2;
        let was = self.surgeons[slot].side;
        if side_now != 0 {
            self.surgeons[slot].side = side_now;
        }
        let h = self.hazard_mut(engaged).unwrap();
        h.progress = (h.progress + creep).min(len);
        if was != 0 && side_now != 0 && was != side_now && near {
            // A stitch. Where it lands is where the hand was along the wound, at the needle's
            // pace; a pad or keys stitch at the needle.
            let s_here =
                if assist > 0.0 { h.last_s + 0.5 } else { (h.progress + along).clamp(h.progress + 0.25, h.progress + 1.2) };
            let spacing = s_here - h.last_s;
            let pace = clock - h.last_t;
            let mut e = ((spacing - 0.5).abs() / 0.5).min(1.5);
            if pace > 0.75 {
                e += ((pace - 0.75) * 0.5).min(0.6);
            }
            h.err += e;
            h.count = h.count.saturating_add(1);
            h.last_s = s_here;
            h.last_t = clock;
            h.progress = h.progress.max(s_here).min(len);
            let done = h.progress >= len - 0.24 && h.count >= 2;
            let (count, err, pts, pos) = (h.count, h.err, h.pts.clone(), h.touch_point());
            let share = if h.required { 1.0 } else { REPEAT_SHARE };
            self.cue(events, cue::ZIP, pos, 0.9, 1.0 + count as f32 * 0.02);
            if done {
                let strict = self.tune.get(tune::STRICT);
                let rating = Rating::from_error(err / count as f32, [0.28, 0.55, 0.95], strict);
                self.surgeons[slot].engaged = 0;
                self.op.stains.push(Stain { kind: 1, pos, r: 0.0, pts });
                self.award_share(slot, rating, Tool::Suture, pos, false, share, events);
                if rating == Rating::Sloppy {
                    // Sloppy spacing leaves a slow bleed.
                    self.add_hazard(Hazard { kind: HazardKind::Pool, pos, r: 0.45, ..Default::default() });
                    self.callout("sloppy_suture");
                }
                self.finish_hazard(engaged, slot, rating, events);
            }
        }
    }

    fn suction(&mut self, slot: usize, down: bool, dt: f32, events: &mut Vec<SimEvent>) {
        if !down {
            self.surgeons[slot].engaged = 0;
            return;
        }
        let cursor = self.surgeons[slot].cursor;
        let press = self.surgeons[slot].pressure;
        let rate = 1.5 * self.tune.get(tune::TOOL_POWER) * (0.35 + 0.65 * press);
        let mut cleared = Vec::new();
        let mut sac_done = Vec::new();
        let mut any = false;
        for h in &mut self.op.hazards {
            match h.kind {
                HazardKind::Pool if h.pos.distance(cursor) < h.r + 0.55 => {
                    // Area drains, so a big pool takes longer than a small one.
                    let area = (h.r * h.r - rate * dt).max(0.0);
                    h.r = area.sqrt();
                    any = true;
                    if h.r < 0.3 {
                        cleared.push((h.id, h.pos));
                    }
                }
                HazardKind::Sac if h.pos.distance(cursor) < h.r + 0.5 && !h.locked => {
                    // Slowly: a whole sac, for a lower rating.
                    h.count = 1;
                    h.heat = (h.heat + dt * 0.33 * (0.35 + 0.65 * press)).min(1.0);
                    any = true;
                    if h.heat >= 1.0 {
                        sac_done.push((h.id, h.pos));
                    }
                }
                _ => {}
            }
        }
        if any {
            let s = &mut self.surgeons[slot];
            s.use_t += dt;
            if s.use_t > 0.22 {
                s.use_t = 0.0;
                self.cue(events, cue::GURGLE, cursor, 0.45 + 0.5 * press, 0.8 + 0.4 * press);
            }
            self.op.counters.used(Tool::Suction);
        }
        for (id, pos) in cleared {
            self.op.hazards.retain(|h| h.id != id);
            self.op.stains.push(Stain { kind: 0, pos, r: 0.5, pts: Vec::new() });
            self.op.counters.cleared(HazardKind::Pool);
            self.award(slot, Rating::Good, Tool::Suction, pos, false, events);
        }
        for (id, pos) in sac_done {
            self.award(slot, Rating::Good, Tool::Suction, pos, false, events);
            self.finish_hazard(id, slot, Rating::Good, events);
        }
    }

    /// The Laser and the Cryoprobe: hold on a target, the ring fills, let go at 80 to 100%.
    fn heat_tool(&mut self, slot: usize, tool: Tool, down: bool, dt: f32, events: &mut Vec<SimEvent>) {
        let cursor = self.surgeons[slot].cursor;
        let engaged = self.surgeons[slot].engaged;
        if !down {
            if engaged != 0 {
                self.surgeons[slot].engaged = 0;
                let strict = self.tune.get(tune::STRICT);
                let Some(h) = self.hazard_mut(engaged) else { return };
                h.by = 0;
                let (heat, pos) = (h.heat, h.touch_point());
                if heat >= 0.8 {
                    h.heat = 0.0;
                    let share = if h.heat_paid { REPEAT_SHARE } else { 1.0 };
                    h.heat_paid = true;
                    let rating =
                        if heat <= 1.0 { Rating::from_error(1.0 - heat, [0.08, 0.14, 0.2], strict) } else { Rating::Sloppy };
                    let snd = if tool == Tool::Laser { cue::SIZZLE } else { cue::FROST };
                    self.cue(events, snd, pos, 1.0, 1.0);
                    self.award_share(slot, rating, tool, pos, false, share, events);
                    self.finish_hazard(engaged, slot, rating, events);
                }
            }
            self.surgeons[slot].use_t = 0.0;
            return;
        }
        // Fill rate: about 1.2 s for the laser (0.6 s on a sac's stem), 1 s for the probe.
        let tough = self.op.strain_tough;
        let power = self.tune.get(tune::TOOL_POWER);
        let press = self.surgeons[slot].pressure;
        if engaged == 0 {
            if let Some(id) = self.target_near(tool, cursor, 0.8) {
                self.surgeons[slot].engaged = id;
                let g = (slot + 1) as u8;
                if let Some(h) = self.hazard_mut(id) {
                    h.by = g;
                }
                self.op.counters.used(tool);
                let snd = if tool == Tool::Laser { cue::LASER } else { cue::FROST };
                self.cue(events, snd, cursor, 0.8, 1.0);
            } else {
                // On healthy tissue the heat builds up too.
                let s = &mut self.surgeons[slot];
                s.use_t += dt;
                if s.use_t > 1.1 && cursor.y < 4.8 {
                    s.use_t = 0.0;
                    self.add_hazard(Hazard {
                        kind: HazardKind::Burn,
                        pos: cursor,
                        r: 0.55,
                        required: false,
                        ..Default::default()
                    });
                    self.mistake(slot);
                    self.hurt(2.0);
                    self.cue(events, cue::SCORCH, cursor, 1.0, 1.0);
                    self.op.counters.bump("burn_from_tool");
                    self.callout("healthy");
                }
                return;
            }
        }
        let engaged = self.surgeons[slot].engaged;
        let one_hit = self.cheats.one_hit;
        let Some(h) = self.hazard_mut(engaged) else {
            self.surgeons[slot].engaged = 0;
            return;
        };
        if !h.accepts(tool) {
            h.by = 0;
            self.surgeons[slot].engaged = 0;
            return;
        }
        let base = match (tool, h.kind) {
            (Tool::Laser, HazardKind::Sac) => 1.0 / 0.6,
            (Tool::Laser, HazardKind::Nodule) => 1.0 / (1.2 * tough),
            (Tool::Laser, _) => 1.0 / 1.2,
            _ => 1.0 / (1.0 * tough.sqrt()),
        };
        h.heat += dt * base * power * (0.55 + 0.45 * press);
        if one_hit {
            h.heat = h.heat.max(0.9);
        }
        if h.heat > 1.3 {
            // Overheated: a burn (or frostbite), and the target goes anyway, badly.
            let pos = h.touch_point();
            h.heat = 0.0;
            h.by = 0;
            self.surgeons[slot].engaged = 0;
            self.add_hazard(Hazard { kind: HazardKind::Burn, pos, r: 0.7, required: false, ..Default::default() });
            self.mistake(slot);
            self.cue(events, cue::SCORCH, pos, 1.0, 1.0);
            self.op.counters.bump("overheat");
            self.callout("overheat");
            self.award(slot, Rating::Sloppy, tool, pos, false, events);
            self.finish_hazard(engaged, slot, Rating::Sloppy, events);
        }
    }

    fn gel(&mut self, slot: usize, down: bool, dt: f32, events: &mut Vec<SimEvent>) {
        if !down || self.surgeons[slot].flow <= 0.02 {
            return;
        }
        let cursor = self.surgeons[slot].cursor;
        let power = self.tune.get(tune::TOOL_POWER);
        self.surgeons[slot].flow = (self.surgeons[slot].flow - dt * 0.75).max(0.0);
        let mut done = Vec::new();
        let mut any = false;
        for h in &mut self.op.hazards {
            if h.accepts(Tool::Gel) && h.pos.distance(cursor) < h.r + 0.7 {
                let need = (0.35 + h.r * h.r * 0.5).max(0.3);
                h.progress = (h.progress + dt * power / need).min(1.0);
                any = true;
                if h.progress >= 1.0 {
                    done.push((h.id, h.pos));
                }
            }
        }
        let s = &mut self.surgeons[slot];
        if !any {
            s.waste += dt;
        }
        s.use_t += dt;
        if s.use_t > 0.3 {
            s.use_t = 0.0;
            self.cue(events, cue::GEL, cursor, 0.6, 1.0);
        }
        if any {
            self.op.counters.used(Tool::Gel);
        }
        for (id, pos) in done {
            let strict = self.tune.get(tune::STRICT);
            let rating = Rating::from_error(self.surgeons[slot].waste, [0.25, 0.6, 1.2], strict);
            self.surgeons[slot].waste = 0.0;
            let share = if self.hazard(id).is_some_and(|h| h.required) { 1.0 } else { REPEAT_SHARE };
            self.award_share(slot, rating, Tool::Gel, pos, false, share, events);
            self.op.stains.push(Stain { kind: 4, pos, r: 0.8, pts: Vec::new() });
            self.finish_hazard(id, slot, rating, events);
        }
    }

    fn scanner(&mut self, slot: usize, down: bool, dt: f32, events: &mut Vec<SimEvent>) {
        if !down {
            self.surgeons[slot].ping_t = 0.0;
            return;
        }
        let s = &mut self.surgeons[slot];
        s.ping_t -= dt;
        if s.ping_t > 0.0 {
            return;
        }
        s.ping_t = 0.42;
        let cursor = s.cursor;
        let mut found = 0;
        for h in &mut self.op.hazards {
            if h.pos.distance(cursor) < 3.2 && h.hidden {
                if h.reveal <= 0.0 {
                    found += 1;
                }
                h.reveal = 8.0;
                h.lit = 1.0;
            }
            if h.kind == HazardKind::Nodule && h.pos.distance(cursor) < 3.2 {
                h.lit = 1.0;
            }
        }
        self.op.pings.push((cursor, 0.0));
        self.op.counters.used(Tool::Scanner);
        self.cue(events, cue::PING, cursor, 0.9, if found > 0 { 1.5 } else { 1.0 });
        if found > 0 {
            self.op.counters.bump("revealed");
            self.callout("found");
        }
    }

    fn iv(&mut self, slot: usize, down: bool, just: bool, dt: f32, events: &mut Vec<SimEvent>) {
        const PORT: Vec2 = Vec2::new(8.3, 3.9);
        let (cool, on) = (self.surgeons[slot].iv_cool, self.surgeons[slot].iv_on);
        if just && cool <= 0.0 && !on {
            self.surgeons[slot].iv_on = true;
            self.surgeons[slot].dose = 0.0;
            self.op.counters.used(Tool::Iv);
            self.cue(events, cue::IV, PORT, 0.9, 1.0);
        }
        if !self.surgeons[slot].iv_on {
            return;
        }
        if down {
            let s = &mut self.surgeons[slot];
            s.dose += dt / 1.25;
            if s.dose > 1.25 {
                // Overdose: a spike, then the fall.
                s.dose = 0.0;
                s.iv_on = false;
                s.iv_cool = 4.0;
                self.mistake(slot);
                self.op.vitals = (self.op.vitals + 4.0).min(self.op.vitals_max);
                self.op.overdose = 1.0;
                self.cue(events, cue::ALARM, PORT, 0.7, 1.2);
                self.op.counters.bump("overdose");
                self.callout("overdose");
                self.award(slot, Rating::Sloppy, Tool::Iv, PORT, false, events);
            }
        } else {
            let s = &mut self.surgeons[slot];
            let dose = s.dose;
            s.dose = 0.0;
            s.iv_on = false;
            if dose < 0.12 {
                return;
            }
            s.iv_cool = 4.0;
            let strict = self.tune.get(tune::STRICT);
            // The green band runs from 75% to 100% of a dose.
            let (heal, rating) = if dose < 0.75 {
                (18.0 * dose * 0.6, Rating::Good)
            } else if dose <= 1.0 {
                (18.0, Rating::from_error((dose - 0.9).abs(), [0.06, 0.15, 0.3], strict))
            } else {
                (18.0, Rating::Sloppy)
            };
            let heal = heal * self.tune.get(tune::IV_HEAL);
            let before = self.op.vitals;
            self.op.vitals = (before + heal).min(self.op.vitals_max);
            let used = ((self.op.vitals - before) / heal.max(0.01)).clamp(0.0, 1.0);
            self.cue(events, cue::IV, PORT, 1.0, 1.3);
            self.award_share(slot, rating, Tool::Iv, PORT, false, REPEAT_SHARE * used, events);
        }
    }

    /// Takes vitals (cheats and difficulty don't apply: this is a mistake's cost).
    pub fn hurt(&mut self, amount: f32) {
        if !self.cheats.immortal {
            self.op.vitals -= amount;
        }
    }

    pub fn mistake(&mut self, slot: usize) {
        self.op.mistakes += 1;
        self.surgeons[slot].mistakes += 1;
    }

    /// A rated action: score, chain, gift, popup, sound.
    pub fn award(&mut self, slot: usize, rating: Rating, tool: Tool, pos: Vec2, ghost: bool, events: &mut Vec<SimEvent>) {
        self.award_share(slot, rating, tool, pos, ghost, 1.0, events);
    }

    /// An award for work that doesn't advance the operation: a dose keeps the patient alive, a
    /// repeated heat pass redoes what slipped away. It is still rated, but with a `share` below 1
    /// it pays that part of the points and the gift and builds no chain, so stalling never pays.
    #[allow(clippy::too_many_arguments)]
    pub fn award_share(
        &mut self,
        slot: usize,
        rating: Rating,
        tool: Tool,
        pos: Vec2,
        ghost: bool,
        share: f32,
        events: &mut Vec<SimEvent>,
    ) {
        let window = self.tune.get(tune::BEAT_WINDOW);
        let on_beat = self.heart.on_beat(window);
        let gain = self.tune.get(tune::GIFT_GAIN);
        let chain_window = self.tune.get(tune::CHAIN_WINDOW);
        let score_scale = self.tune.get(tune::SCORE);
        let clock = self.op.clock;
        let s = &mut self.surgeons[slot];
        s.counts[rating as usize] += 1;
        s.actions += 1;
        s.last_action = clock;
        s.last_tool = tool;
        s.last_rating = rating as u8;
        match rating {
            Rating::Immaculate | Rating::Clean if share >= 1.0 => {
                s.chain += 1;
                s.chain_t = chain_window;
                s.best_chain = s.best_chain.max(s.chain);
            }
            Rating::Sloppy => s.chain = 0,
            _ => s.chain_t = s.chain_t.max(chain_window * 0.5),
        }
        let mult = if share < 1.0 {
            1.0
        } else if s.chain >= 20 {
            2.0
        } else if s.chain >= 10 {
            1.5
        } else if s.chain >= 5 {
            1.25
        } else {
            1.0
        };
        let points = rating.points() * mult * if on_beat { 1.25 } else { 1.0 } * score_scale * share;
        s.score += points as i32;
        let mut charge = match rating {
            Rating::Immaculate => 8.0,
            Rating::Clean => 4.0,
            _ => 0.0,
        };
        if on_beat {
            charge += 2.0;
            s.on_beats += 1;
        }
        if rating <= Rating::Clean {
            s.kick = 1.0;
        }
        let chain = s.chain;
        let was_ready = s.gift >= 100.0;
        s.gift = (s.gift + charge * gain * share).min(100.0);
        let now_ready = s.gift >= 100.0;
        if self.op.gift_awake && !was_ready && now_ready {
            self.cue(events, cue::GIFT_READY, pos, 1.0, 1.0);
        }
        self.op.popups.push(Popup { pos, rating, on_beat, chain, slot: slot as u8, age: 0.0, points: points as u32 });
        if self.op.popups.len() > 12 {
            self.op.popups.remove(0);
        }
        let snd = [cue::IMMACULATE, cue::CLEAN, cue::GOOD, cue::SLOPPY][rating as usize];
        self.cue(events, snd, pos, 1.0, 1.0);
        if on_beat {
            self.cue(events, cue::ON_BEAT, pos, 0.8, 1.0);
            self.op.counters.bump("on_beat");
        }
        if chain == 5 || chain == 10 || chain == 20 {
            self.cue(events, cue::CHAIN, pos, 1.0, 1.0 + chain as f32 * 0.02);
        }
        self.op.counters.rated(rating);
        self.op.counters.used(tool);
        // Short callouts, some of the time.
        if !ghost {
            match rating {
                Rating::Immaculate if self.op.since_callout > 6.0 => self.callout("immaculate"),
                Rating::Clean if self.op.since_callout > 9.0 => self.callout("clean"),
                _ => {}
            }
        }
        // The Hush: an on-beat action buys another heartbeat.
        if self.gifts.hush_beats > 0.0 && on_beat && !ghost {
            self.gifts.hush_beats += 1.0;
            self.op.counters.bump("hush_extended");
        }
        // The Echo: ghost hands repeat it on the next valid target for that tool.
        if self.gifts.echo_t > 0.0 && !ghost {
            self.queue_ghost(slot, tool, rating, pos);
        }
    }

    fn queue_ghost(&mut self, slot: usize, tool: Tool, rating: Rating, from: Vec2) {
        if matches!(tool, Tool::Iv | Tool::Scanner | Tool::Suction | Tool::Defib) {
            return;
        }
        let busy: Vec<u32> = self.op.ghosts.iter().map(|g| g.target).collect();
        let target = self
            .op
            .hazards
            .iter()
            .filter(|h| h.accepts(tool) && h.by == 0 && !busy.contains(&h.id) && !self.covered(h))
            .min_by(|a, b| a.pos.distance(from).total_cmp(&b.pos.distance(from)))
            .map(|h| h.id);
        if let Some(target) = target {
            self.op.ghosts.push(GhostHand { slot: slot as u8, tool, rating, target, from, t: 0.0 });
        }
    }

    /// The ghost hands' flight, then the repeat at the same rating.
    pub(super) fn ghosts_tick(&mut self, real_dt: f32, events: &mut Vec<SimEvent>) {
        let mut arrived = Vec::new();
        for g in &mut self.op.ghosts {
            g.t += real_dt;
            if g.t >= GHOST_TRAVEL {
                arrived.push(g.clone());
            }
        }
        self.op.ghosts.retain(|g| g.t < GHOST_TRAVEL);
        for g in arrived {
            let slot = g.slot as usize;
            let (pos, ok) = match self.hazard(g.target) {
                Some(h) if h.accepts(g.tool) && h.by == 0 => (h.touch_point(), true),
                _ => (g.from, false),
            };
            if !ok {
                continue;
            }
            self.op.counters.bump("echo_repeat");
            if g.tool == Tool::Suture {
                if let Some(h) = self.hazard(g.target) {
                    let pts = h.pts.clone();
                    self.op.stains.push(Stain { kind: 1, pos, r: 0.0, pts });
                }
            }
            self.cue(events, cue::RIPPLE, pos, 0.7, 1.4);
            self.award(slot, g.rating, g.tool, pos, true, events);
            self.finish_hazard(g.target, slot, g.rating, events);
        }
    }

    /// A task done on a hazard: it goes, or moves to its next stage.
    pub fn finish_hazard(&mut self, id: u32, slot: usize, rating: Rating, events: &mut Vec<SimEvent>) {
        let Some(i) = self.op.hazards.iter().position(|h| h.id == id) else { return };
        self.surgeons.iter_mut().for_each(|s| {
            if s.engaged == id {
                s.engaged = 0;
            }
        });
        let (kind, stage, pos, r, parent, pts) = {
            let h = &self.op.hazards[i];
            (h.kind, h.stage, h.pos, h.r, h.parent, h.pts.clone())
        };
        self.op.counters.progress(kind, stage);
        match kind {
            HazardKind::Tumor => {
                let h = &mut self.op.hazards[i];
                match stage {
                    1 => {
                        // Lifted out: the bed takes gel.
                        h.stage = 2;
                        h.progress = 0.0;
                        h.drag = Vec2::ZERO;
                        h.by = 0;
                        return;
                    }
                    2 => {}
                    _ => return,
                }
            }
            HazardKind::Bone if stage == 0 => return,
            HazardKind::Nodule if stage == 0 => {
                // The shell pops; the forceps have two beats.
                let period = self.heart.period();
                let h = &mut self.op.hazards[i];
                h.stage = 1;
                h.heat = 0.0;
                h.t = 0.0;
                h.life = period * 2.8 * self.op.grace_beats;
                h.by = 0;
                self.cue(events, cue::BURST, pos, 0.6, 1.3);
                return;
            }
            HazardKind::Eye => {
                let h = &mut self.op.hazards[i];
                h.drag = Vec2::ZERO;
                h.by = 0;
                if stage == 2 {
                    h.stage = 3;
                    h.progress = 0.0;
                    h.r = 1.2;
                    return;
                }
            }
            HazardKind::Ember if stage == 0 => {
                // Brittle now: a crack to cut.
                let h = &mut self.op.hazards[i];
                h.stage = 1;
                h.heat = 0.0;
                h.by = 0;
                let d = Vec2::from_angle(id as f32 * 1.7) * (r + 0.5);
                let pts = vec![pos - d, pos + d];
                self.add_hazard(Hazard {
                    kind: HazardKind::Incision,
                    pts,
                    pos,
                    parent: id,
                    required: true,
                    tag: 3,
                    ..Default::default()
                });
                self.op.counters.bump("ember_frozen");
                return;
            }
            HazardKind::Furnace => {
                self.furnace_step(i, events);
                return;
            }
            _ => {}
        }
        // Children done: tell the parent.
        self.op.counters.cleared(kind);
        let h = self.op.hazards.remove(i);
        match kind {
            HazardKind::Incision | HazardKind::Tether => {
                self.op.stains.push(Stain { kind: 2, pos, r: 0.0, pts });
                self.child_done(parent, kind, slot, rating, events);
            }
            HazardKind::Foreign if h.tag == 3 => {
                self.child_done(parent, kind, slot, rating, events);
            }
            HazardKind::Sac | HazardKind::Ember | HazardKind::Nodule => {
                self.strain_killed(&h, events);
            }
            HazardKind::Eye => self.strain_killed(&h, events),
            _ => {}
        }
        if kind == HazardKind::Incision && parent == 0 {
            self.op.incisions_done += 1;
        }
    }

    /// A child (a ring cut, a tether, a crack, a shard) of `parent` was finished.
    fn child_done(&mut self, parent: u32, kind: HazardKind, slot: usize, _rating: Rating, events: &mut Vec<SimEvent>) {
        if parent == 0 {
            return;
        }
        let siblings = self.op.hazards.iter().filter(|h| h.parent == parent).count();
        let Some(p) = self.hazard(parent).cloned() else { return };
        match p.kind {
            HazardKind::Tumor if siblings == 0 => {
                let h = self.hazard_mut(parent).unwrap();
                h.stage = 1;
                h.progress = 0.0;
            }
            HazardKind::Nodule if siblings == 0 => {
                // The Amen's tethers are all cut.
                let h = self.hazard_mut(parent).unwrap();
                h.locked = false;
                h.t = 0.0;
                self.cue_at(events, cue::STINGER, p.pos);
            }
            HazardKind::Eye => self.eye_cut(parent, events),
            HazardKind::Ember => {
                if kind == HazardKind::Incision {
                    // Cracked: three pieces to lift out.
                    let h = self.hazard_mut(parent).unwrap();
                    h.stage = 2;
                    h.locked = true;
                    for k in 0..3 {
                        let a = k as f32 * std::f32::consts::TAU / 3.0 + p.id as f32;
                        let at = p.pos + Vec2::from_angle(a) * (p.r * 0.7 + 0.2);
                        self.add_hazard(Hazard {
                            kind: HazardKind::Foreign,
                            pos: at,
                            axis: a,
                            r: 0.28,
                            tag: 3,
                            parent,
                            required: true,
                            ..Default::default()
                        });
                    }
                    self.cue_at(events, cue::SNAP, p.pos);
                } else if siblings == 0 {
                    // Every piece out: the ember is gone.
                    self.finish_ember(parent, slot, events);
                }
            }
            HazardKind::Furnace => {
                let i = self.op.hazards.iter().position(|h| h.id == parent).unwrap();
                self.furnace_step(i, events);
            }
            _ => {}
        }
    }

    /// Whatever hazards do each tick: bleed, drain, feed pools.
    pub(super) fn hazards_tick(&mut self, dt: f32, events: &mut Vec<SimEvent>) {
        let mut drain = 0.0;
        let mut feed: Vec<(Vec2, f32)> = Vec::new();
        let mut expired = Vec::new();
        for h in &mut self.op.hazards {
            drain += match h.kind {
                HazardKind::Pool => 0.2 * h.r * h.r + h.drain,
                _ => h.drain,
            };
            if h.reveal > 0.0 {
                h.reveal -= dt;
            }
            h.lit = (h.lit - dt * 0.8).max(0.0);
            if h.by == 0 && h.heat > 0.0 && h.kind != HazardKind::Sac {
                h.heat = (h.heat - dt * 0.4).max(0.0);
            }
            match h.kind {
                HazardKind::Laceration => feed.push((h.touch_point(), 0.05)),
                HazardKind::Bleeder => feed.push((h.pos, 0.13)),
                _ => {}
            }
            if h.life > 0.0 {
                h.life -= dt;
                if h.life <= 0.0 {
                    expired.push(h.id);
                }
            }
        }
        for (at, rate) in feed {
            let near = self
                .op
                .hazards
                .iter_mut()
                .filter(|h| h.kind == HazardKind::Pool && h.pos.distance(at) < 1.5 + h.r)
                .min_by(|a, b| a.pos.distance(at).total_cmp(&b.pos.distance(at)));
            match near {
                Some(p) => p.r = (p.r + rate * dt).min(2.1),
                None => {
                    let jitter = Vec2::new(self.jitter(at.x * 13.0), self.jitter(at.y * 17.0)) * 0.5;
                    self.add_hazard(Hazard { kind: HazardKind::Pool, pos: at + jitter, r: 0.42, ..Default::default() });
                }
            }
        }
        self.op.drain_now = drain;
        let k = self.tune.get(tune::DRAIN) * self.difficulty().drain * self.op.drain_scale;
        if !self.cheats.immortal {
            self.op.vitals -= drain * k * dt;
        }
        if self.op.overdose > 0.0 {
            // The spike's aftermath.
            let before = self.op.overdose;
            self.op.overdose = (before - dt).max(0.0);
            if before > 0.4 && self.op.overdose <= 0.4 {
                self.hurt(12.0);
            }
        }
        for id in expired {
            self.hazard_expired(id, events);
        }
        for p in &mut self.op.popups {
            p.age += dt.max(1.0 / 60.0);
        }
        self.op.popups.retain(|p| p.age < 1.3);
        for p in &mut self.op.pings {
            p.1 += dt;
        }
        self.op.pings.retain(|p| p.1 < 0.8);
        if self.op.stains.len() > 48 {
            self.op.stains.remove(0);
        }
    }

    fn jitter(&self, seed: f32) -> f32 {
        let x = (seed * 12.9898 + self.op.clock * 78.233).sin() * 43758.547;
        (x - x.floor()) * 2.0 - 1.0
    }
}

fn default_radius(kind: HazardKind) -> f32 {
    match kind {
        HazardKind::Pool => 0.9,
        HazardKind::Foreign => 0.3,
        HazardKind::Polyp => 0.42,
        HazardKind::Tumor => 1.1,
        HazardKind::Burn => 0.8,
        HazardKind::Bone => 0.8,
        HazardKind::Nodule => 0.55,
        HazardKind::Sac => 0.45,
        HazardKind::Eye => 0.8,
        HazardKind::Ember => 0.6,
        HazardKind::Furnace => 1.7,
        HazardKind::Bleeder => 0.3,
        _ => 0.2,
    }
}

/// The signed shortest difference between two angles.
pub fn angle_diff(a: f32, b: f32) -> f32 {
    let d = (a - b + std::f32::consts::PI).rem_euclid(std::f32::consts::TAU) - std::f32::consts::PI;
    d
}

/// Counts what the campaign exercised: the coverage test reads these.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Counters {
    pub tools: [u32; 11],
    pub picked: [u32; 11],
    pub spawned: [u32; 18],
    pub cleared: [u32; 18],
    pub ratings: [u32; 4],
    pub notes: std::collections::BTreeMap<String, u32>,
}

impl Counters {
    pub fn used(&mut self, t: Tool) {
        self.tools[t as usize] += 1;
    }
    pub fn picked(&mut self, t: Tool) {
        self.picked[t as usize] += 1;
    }
    pub fn spawned(&mut self, k: HazardKind) {
        self.spawned[k as usize] += 1;
    }
    pub fn cleared(&mut self, k: HazardKind) {
        self.cleared[k as usize] += 1;
    }
    pub fn progress(&mut self, k: HazardKind, stage: u8) {
        self.bump(&format!("{}_{}", k.name(), stage));
    }
    pub fn rated(&mut self, r: Rating) {
        self.ratings[r as usize] += 1;
    }
    pub fn bump(&mut self, what: &str) {
        match self.notes.get_mut(what) {
            Some(n) => *n += 1,
            None => {
                self.notes.insert(what.to_string(), 1);
            }
        }
    }
    pub fn add(&mut self, o: &Counters) {
        for i in 0..11 {
            self.tools[i] += o.tools[i];
            self.picked[i] += o.picked[i];
        }
        for i in 0..18 {
            self.spawned[i] += o.spawned[i];
            self.cleared[i] += o.cleared[i];
        }
        for i in 0..4 {
            self.ratings[i] += o.ratings[i];
        }
        for (k, v) in &o.notes {
            *self.notes.entry(k.clone()).or_insert(0) += v;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rating_thresholds() {
        assert_eq!(Rating::from_error(0.2, [0.25, 0.5, 0.85], 1.0), Rating::Immaculate);
        assert_eq!(Rating::from_error(0.4, [0.25, 0.5, 0.85], 1.0), Rating::Clean);
        assert_eq!(Rating::from_error(0.8, [0.25, 0.5, 0.85], 1.0), Rating::Good);
        assert_eq!(Rating::from_error(0.9, [0.25, 0.5, 0.85], 1.0), Rating::Sloppy);
        // Stricter: the same error rates lower.
        assert_eq!(Rating::from_error(0.2, [0.25, 0.5, 0.85], 2.0), Rating::Clean);
    }

    #[test]
    fn polylines_project_and_walk() {
        let pts = [Vec2::new(0.0, 0.0), Vec2::new(2.0, 0.0), Vec2::new(2.0, 2.0)];
        assert_eq!(polyline_len(&pts), 4.0);
        assert_eq!(polyline_at(&pts, 3.0).0, Vec2::new(2.0, 1.0));
        let (s, d) = polyline_project(&pts, Vec2::new(1.0, 0.5), 0.0, 4.0);
        assert!((s - 1.0).abs() < 1e-5 && (d - 0.5).abs() < 1e-5);
        // The window keeps the cursor from skipping ahead.
        let (s, _) = polyline_project(&pts, Vec2::new(2.0, 2.0), 0.0, 1.5);
        assert!(s <= 1.5);
    }

    #[test]
    fn tools_accept_only_what_they_should() {
        let foreign = Hazard { kind: HazardKind::Foreign, ..Default::default() };
        assert!(foreign.accepts(Tool::Forceps) && !foreign.accepts(Tool::Scalpel));
        let hidden = Hazard { kind: HazardKind::Foreign, hidden: true, ..Default::default() };
        assert!(!hidden.accepts(Tool::Forceps));
        let found = Hazard { kind: HazardKind::Foreign, hidden: true, reveal: 2.0, ..Default::default() };
        assert!(found.accepts(Tool::Forceps));
        let t0 = Hazard { kind: HazardKind::Tumor, stage: 0, ..Default::default() };
        let t1 = Hazard { kind: HazardKind::Tumor, stage: 1, ..Default::default() };
        let t2 = Hazard { kind: HazardKind::Tumor, stage: 2, ..Default::default() };
        assert!(!t0.accepts(Tool::Forceps) && t1.accepts(Tool::Forceps) && t2.accepts(Tool::Gel));
        let pool = Hazard { kind: HazardKind::Pool, ..Default::default() };
        assert!(pool.accepts(Tool::Suction) && !pool.accepts(Tool::Gel));
    }
}
