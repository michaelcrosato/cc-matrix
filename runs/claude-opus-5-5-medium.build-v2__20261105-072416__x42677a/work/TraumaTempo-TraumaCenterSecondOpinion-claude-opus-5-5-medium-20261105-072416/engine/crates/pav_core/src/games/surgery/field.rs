//! An operation: the field's hazards, the surgeon slots and their instruments, vitals and the
//! heart, ratings and chains, the Code and the gifts. Deterministic; all logic is 2D in the
//! field plane (x, z), held in `Vec2`.

use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::content::{Content, SpawnSpec, content};
use super::cue;
use super::tune::{Difficulty, Tune};
use crate::frame::SimEvent;
use crate::input::{SurgeonInput, surgeon_buttons as btn};
use crate::rng::Rng;

// ---------------------------------------------------------------------------------------------
// Instruments

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
    pub const DEFAULT_RING: [Tool; 8] =
        [Tool::Scalpel, Tool::Forceps, Tool::Suture, Tool::Suction, Tool::Laser, Tool::Gel, Tool::Scanner, Tool::Iv];

    pub fn key(self) -> &'static str {
        super::content::TOOLS[self as usize]
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
    pub fn from_key(k: &str) -> Option<Tool> {
        Tool::ALL.into_iter().find(|t| t.key() == k)
    }
    pub fn from_u8(v: u8) -> Tool {
        Tool::ALL[(v as usize).min(10)]
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum Rating {
    Sloppy = 0,
    Good = 1,
    Clean = 2,
    Immaculate = 3,
}

impl Rating {
    pub fn name(self) -> &'static str {
        match self {
            Rating::Sloppy => "SLOPPY",
            Rating::Good => "GOOD",
            Rating::Clean => "CLEAN",
            Rating::Immaculate => "IMMACULATE",
        }
    }
    pub fn points(self) -> i64 {
        match self {
            Rating::Sloppy => 10,
            Rating::Good => 120,
            Rating::Clean => 250,
            Rating::Immaculate => 400,
        }
    }
    pub fn from_u8(v: u8) -> Rating {
        match v {
            3 => Rating::Immaculate,
            2 => Rating::Clean,
            1 => Rating::Good,
            _ => Rating::Sloppy,
        }
    }
    /// Lower is better: `value` (scaled by strictness) against three thresholds.
    fn grade(value: f32, strict: f32, a: f32, b: f32, c: f32) -> Rating {
        let v = value * strict;
        if v <= a {
            Rating::Immaculate
        } else if v <= b {
            Rating::Clean
        } else if v <= c {
            Rating::Good
        } else {
            Rating::Sloppy
        }
    }
}

// ---------------------------------------------------------------------------------------------
// Hazards

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[repr(u8)]
pub enum Kind {
    #[default]
    Incision = 0,
    Lacer = 1,
    Pool = 2,
    Bleeder = 3,
    Object = 4,
    Polyp = 5,
    Tumor = 6,
    Patch = 7,
    Bone = 8,
    Closure = 9,
    Nodule = 10,
    Sac = 11,
    Eye = 12,
    Ember = 13,
    Furnace = 14,
    Tendril = 15,
}

impl Kind {
    pub const ALL: [Kind; 16] = [
        Kind::Incision,
        Kind::Lacer,
        Kind::Pool,
        Kind::Bleeder,
        Kind::Object,
        Kind::Polyp,
        Kind::Tumor,
        Kind::Patch,
        Kind::Bone,
        Kind::Closure,
        Kind::Nodule,
        Kind::Sac,
        Kind::Eye,
        Kind::Ember,
        Kind::Furnace,
        Kind::Tendril,
    ];
    pub fn from_u8(v: u8) -> Kind {
        Kind::ALL[(v as usize).min(15)]
    }
    pub fn key(self) -> &'static str {
        match self {
            Kind::Incision => "incision",
            Kind::Lacer => "lacer",
            Kind::Pool => "pool",
            Kind::Bleeder => "bleeder",
            Kind::Object => "object",
            Kind::Polyp => "polyp",
            Kind::Tumor => "tumor",
            Kind::Patch => "patch",
            Kind::Bone => "bone",
            Kind::Closure => "closure",
            Kind::Nodule => "nodule",
            Kind::Sac => "sac",
            Kind::Eye => "eye",
            Kind::Ember => "ember",
            Kind::Furnace => "furnace",
            Kind::Tendril => "tendril",
        }
    }
}

/// `Hazard::sub` for objects.
pub mod sub {
    pub const HOOK: u8 = 0;
    pub const SHARD: u8 = 1;
    pub const SPLINTER: u8 = 2;
    /// A piece of a cracked ember: pulling it cools the Fever.
    pub const COAL: u8 = 3;
    /// `Patch`: 0 inflammation, 1 burn.
    pub const BURN: u8 = 1;
    /// `Pool`: burning fluid from a sac.
    pub const CAUSTIC: u8 = 1;
    /// `Nodule`: small and quick, or the Amen.
    pub const SMALL: u8 = 1;
    pub const AMEN: u8 = 2;
    /// `Ember`: two merged, roaming.
    pub const ROAMING: u8 = 1;
    /// `Incision`: a stroke across the eye or a Soloist stroke.
    pub const STROKE: u8 = 1;
    /// `Incision`: a tether holding the Amen.
    pub const TETHER: u8 = 2;
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Hazard {
    pub id: u32,
    pub kind: Kind,
    /// Position; a path's start.
    pub a: Vec2,
    /// A path's end; a sac's stem root; a bone's target.
    pub b: Vec2,
    /// A path's control point; a grabbed thing's displacement.
    pub c: Vec2,
    pub r: f32,
    /// Progress 0..1 of whatever this hazard is doing or having done.
    pub prog: f32,
    pub stage: u8,
    pub sub: u8,
    pub ang: f32,
    pub hidden: bool,
    /// Seconds left of a Scanner's reveal.
    pub seen: f32,
    pub age: f32,
    /// Seconds left before it does something by itself (0 = none).
    pub deadline: f32,
    pub drain: f32,
    /// Stitches done and needed.
    pub n: u16,
    pub need: u16,
    /// Blocks the phase until it is dealt with.
    pub blocking: bool,
    /// Heat or frost held in it (0..1.3).
    pub fill: f32,
    /// Seconds a full heat takes (0 = the default).
    pub fill_time: f32,
    /// Beats counted toward its next step (fractional: strains clamp their speed-up).
    pub beats: f32,
    pub telegraph: bool,
}

impl Hazard {
    pub fn visible(&self) -> bool {
        !self.hidden || self.seen > 0.0
    }

    /// A point along this hazard's path, t in 0..1 (incisions and closures: a curve; a tumor
    /// ring: a circle).
    pub fn path(&self, t: f32) -> Vec2 {
        match self.kind {
            Kind::Tumor => {
                let a = t * std::f32::consts::TAU - std::f32::consts::FRAC_PI_2;
                self.a + Vec2::new(a.cos(), a.sin()) * self.r
            }
            _ => {
                let u = 1.0 - t;
                self.a * (u * u) + self.c * (2.0 * u * t) + self.b * (t * t)
            }
        }
    }

    pub fn has_path(&self) -> bool {
        matches!(self.kind, Kind::Incision | Kind::Closure) || (self.kind == Kind::Tumor && self.stage == 0)
    }

    pub fn path_len(&self) -> f32 {
        let mut l = 0.0;
        let mut p = self.path(0.0);
        for k in 1..=16 {
            let q = self.path(k as f32 / 16.0);
            l += p.distance(q);
            p = q;
        }
        l
    }

    /// The instrument this hazard takes now.
    pub fn takes(&self) -> Option<Tool> {
        Some(match (self.kind, self.stage) {
            (Kind::Incision, _) => Tool::Scalpel,
            (Kind::Lacer | Kind::Bleeder, _) => Tool::Suture,
            (Kind::Pool, _) => Tool::Suction,
            (Kind::Object, _) => Tool::Forceps,
            (Kind::Polyp, _) => Tool::Laser,
            (Kind::Tumor, 0) => Tool::Scalpel,
            (Kind::Tumor, 1) => Tool::Forceps,
            (Kind::Tumor, _) => Tool::Gel,
            (Kind::Patch, _) => Tool::Gel,
            (Kind::Bone, 0) => Tool::Forceps,
            (Kind::Bone, _) => Tool::Suture,
            (Kind::Closure, _) => Tool::Dressing,
            (Kind::Nodule, 0) => Tool::Laser,
            (Kind::Nodule, 1) => Tool::Forceps,
            (Kind::Nodule, _) => return None, // held by tethers
            (Kind::Sac, _) => Tool::Laser,
            (Kind::Eye, 1) => Tool::Forceps,
            (Kind::Eye, _) => return None,
            (Kind::Ember, 0) => Tool::Cryo,
            (Kind::Ember, _) => Tool::Scalpel,
            (Kind::Furnace, 0) => Tool::Cryo,
            (Kind::Furnace, 1) => Tool::Scalpel,
            (Kind::Furnace, 2) => Tool::Forceps,
            (Kind::Furnace, 3) => Tool::Laser,
            (Kind::Furnace, 4) => Tool::Suction,
            (Kind::Furnace, _) => Tool::Gel,
            (Kind::Tendril, _) => Tool::Forceps,
        })
    }

    /// The spot an instrument aims at.
    pub fn spot(&self) -> Vec2 {
        match self.kind {
            Kind::Sac => self.a.lerp(self.b, 0.55),
            Kind::Lacer | Kind::Bleeder => self.a.lerp(self.b, self.prog.clamp(0.0, 1.0)),
            Kind::Incision | Kind::Closure => self.path(self.prog),
            Kind::Tumor if self.stage == 0 => self.path(self.prog),
            Kind::Bone if self.stage == 1 => self.a.lerp(self.b, self.prog.clamp(0.0, 1.0)),
            _ => self.a,
        }
    }
}

// ---------------------------------------------------------------------------------------------
// The heart

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize)]
pub struct Heart {
    /// 0..1 through the beat; the R wave is at 0.
    pub phase: f32,
    pub bpm: f32,
    pub beats: u32,
    /// Beats to a bar of the ECG's meter, and where in the bar this beat is.
    pub meter: u8,
    pub bar: u8,
    /// The R wave happened this tick.
    pub r_wave: bool,
    pub stopped: bool,
}

impl Heart {
    pub fn period(&self) -> f32 {
        60.0 / self.bpm.max(20.0)
    }
    /// Seconds from the nearest R wave.
    pub fn from_r(&self) -> f32 {
        let p = self.period();
        (self.phase * p).min((1.0 - self.phase) * p)
    }
    /// Systole: the part of the beat when the heart squeezes.
    pub fn systole(&self) -> bool {
        self.phase < 0.35
    }
}

// ---------------------------------------------------------------------------------------------
// Surgeons

/// What a slot is engaged with.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum Eng {
    #[default]
    None,
    Cut,
    Pull,
    Stitch,
    Suck,
    Heat,
    Paint,
    Scan,
    Iv,
    Dress,
    Bone,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Slot {
    pub active: bool,
    /// Played by the bot (the Case 7 partner, attract).
    pub bot: bool,
    /// The cursor the player steers.
    pub aim: Vec2,
    /// Where the instrument really is (with a tremor).
    pub cursor: Vec2,
    pub held: u8,
    pub pressed: u8,
    pub pressure: f32,
    /// Ring position.
    pub tool: u8,
    pub eng: Eng,
    pub eng_id: u32,
    pub eng_t: f32,
    pub eng_a: f32,
    pub eng_b: f32,
    pub eng_start: Vec2,
    /// Which side of the wound the needle was last on.
    pub side: i8,
    pub score: i64,
    pub chain: u32,
    pub best_chain: u32,
    pub chain_t: f32,
    pub gift: f32,
    /// 0 none, 1 Hush, 2 Echo, 3 Duet.
    pub gift_kind: u8,
    pub arming: bool,
    pub tally: [u32; 4],
    pub on_beats: u32,
    pub since_action: f32,
    /// Gel flow left (0..1).
    pub flow: f32,
    pub ping_t: f32,
    /// Instrument motion for the view: last action's recoil.
    pub recoil: f32,
    /// A wrong-instrument flash.
    pub clink: f32,
    pub hover: u32,
    pub charge: f32,
}

// ---------------------------------------------------------------------------------------------
// Things left on the field

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq)]
pub struct Stain {
    pub at: Vec2,
    pub r: f32,
    /// 0 blood, 1 scorch, 2 gel.
    pub kind: u8,
}

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq)]
pub struct Thread {
    pub a: Vec2,
    pub b: Vec2,
    pub n: u16,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq)]
pub struct Float {
    pub at: Vec2,
    pub text: String,
    /// Rating (0..3), 4 = plain.
    pub rating: u8,
    pub on_beat: bool,
    pub slot: u8,
    pub age: f32,
}

/// An extracted thing flying to the tray.
#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq)]
pub struct Flight {
    pub from: Vec2,
    pub sub: u8,
    pub kind: Kind,
    pub t: f32,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq)]
pub struct Callout {
    pub who: String,
    pub text: String,
    pub age: f32,
}

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq)]
pub struct Code {
    /// Seconds to defibrillate.
    pub left: f32,
    pub window: f32,
    /// 0..1 ghost beat position; it crosses the centre at 0.5.
    pub ghost: f32,
    /// A scripted stop's shocks still to land (0 = an ordinary Code).
    pub shocks: u8,
    pub scripted: bool,
    pub last_good: f32,
}

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq)]
pub struct Gifts {
    /// Heartbeats of Hush left.
    pub hush: f32,
    /// Seconds of Echo left.
    pub echo: f32,
    /// Hush and Echo together.
    pub duet: bool,
    pub locked: bool,
    /// The ghost hands: where they are and how far through an action.
    pub ghost: Vec2,
    pub ghost_t: f32,
    pub ripple: f32,
}

/// Numbers that come from outside an operation.
#[derive(Clone, Copy, Debug)]
pub struct Rules {
    pub tune: Tune,
    pub diff: Difficulty,
    pub immortal: bool,
    pub freeze_timer: bool,
    pub full_gift: bool,
    pub one_hit: bool,
    pub tremor: bool,
    pub bot_skill: f32,
    /// The tick, for the bots' noise.
    pub tick: u64,
    /// The sim's simulated seconds.
    pub time: f32,
}

// ---------------------------------------------------------------------------------------------
// The operation

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Op {
    pub case: u8,
    pub phase: u16,
    pub phase_t: f32,
    pub phase_beats: u32,
    pub timer: f32,
    pub timer_max: f32,
    pub elapsed: f32,
    pub vitals: f32,
    pub heart: Heart,
    pub hazards: Vec<Hazard>,
    pub next_id: u32,
    pub slots: [Slot; 4],
    pub ring: [Tool; 8],
    pub plate: u8,
    pub plate_prev: u8,
    pub reveal: f32,
    pub reveal_at: Vec2,
    pub stains: Vec<Stain>,
    pub threads: Vec<Thread>,
    pub floats: Vec<Float>,
    pub flights: Vec<Flight>,
    pub callout: Option<Callout>,
    pub say_done: u32,
    pub trig_done: u32,
    pub banner: String,
    pub banner_t: f32,
    pub mistakes: u32,
    pub codes_left: u8,
    pub code: Option<Code>,
    pub gifts: Gifts,
    pub strain: Option<super::strain::Strain>,
    pub fever: Option<f32>,
    /// A heat ring's radius while it sweeps; seconds until the next one when counting in.
    pub heat_ring: Option<f32>,
    pub ring_warn: f32,
    pub linger: f32,
    pub lingering: bool,
    /// The phase's spawn list still to come: next entry, seconds until it, rounds left, this round.
    pub spawn_i: u16,
    pub spawn_t: f32,
    pub rounds_left: u8,
    pub round: u8,
    pub iv_cd: f32,
    pub rng: Rng,
    pub won: bool,
    pub dead: bool,
    pub shake: f32,
    pub flash: f32,
    /// The camera leans in for a moment.
    pub push: f32,
    pub crit_called: bool,
    pub callout_cd: f32,
    pub time_scale: f32,
    #[serde(skip)]
    pub ev: Vec<SimEvent>,
    pub cov: Vec<u32>,
    pub checkpoint: Option<Box<Op>>,
    /// Attract: the bot wins nothing, it only shows.
    pub showing: bool,
}

pub fn v3(p: Vec2) -> Vec3 {
    Vec3::new(p.x, 0.3, p.y)
}

impl Op {
    pub fn new(case: usize, rules: &Rules, seed: u64) -> Op {
        let c = content();
        let data = &c.cases[case];
        let mut ring = Tool::DEFAULT_RING;
        if data.ring.len() == 8 {
            for (k, t) in data.ring.iter().enumerate() {
                if let Some(t) = Tool::from_key(t) {
                    ring[k] = t;
                }
            }
        }
        let plate = plate_id(&c, &data.plate);
        let timer = data.timer * rules.diff.timer();
        let mut slots: [Slot; 4] = Default::default();
        let (gift0, locked) = match data.gift.as_str() {
            "hush" => (1, data.gift_locked),
            "echo" => (2, data.gift_locked),
            "duet" => (3, false),
            _ => (0, false),
        };
        for (i, s) in slots.iter_mut().enumerate() {
            s.flow = 1.0;
            s.aim = Vec2::new(-1.0 + i as f32 * 0.8, 0.5);
            s.cursor = s.aim;
            s.gift_kind = if case == super::content::CODE_BLUE { (i % 2 + 1) as u8 } else { gift0 };
        }
        slots[0].active = true;
        let mut op = Op {
            case: case as u8,
            phase: 0,
            phase_t: 0.0,
            phase_beats: 0,
            timer,
            timer_max: timer,
            elapsed: 0.0,
            vitals: if data.vitals > 0.0 { data.vitals } else { 100.0 },
            heart: Heart { phase: 0.0, bpm: 72.0, beats: 0, meter: 4, bar: 0, r_wave: false, stopped: false },
            hazards: Vec::new(),
            next_id: 1,
            slots,
            ring,
            plate,
            plate_prev: plate,
            reveal: 1.0,
            reveal_at: Vec2::ZERO,
            stains: Vec::new(),
            threads: Vec::new(),
            floats: Vec::new(),
            flights: Vec::new(),
            callout: None,
            say_done: 0,
            trig_done: 0,
            banner: String::new(),
            banner_t: 0.0,
            mistakes: 0,
            codes_left: rules.diff.codes(),
            code: None,
            gifts: Gifts { locked, ghost: Vec2::new(0.0, -2.0), ..Default::default() },
            strain: None,
            fever: None,
            heat_ring: None,
            ring_warn: 0.0,
            linger: 0.0,
            lingering: false,
            spawn_i: 0,
            spawn_t: 0.0,
            rounds_left: 0,
            round: 0,
            iv_cd: 0.0,
            rng: Rng::new(seed ^ 0x51_72_47),
            won: false,
            dead: false,
            shake: 0.0,
            flash: 0.0,
            push: 0.0,
            crit_called: false,
            callout_cd: 0.0,
            time_scale: 1.0,
            ev: Vec::new(),
            cov: vec![0; super::cover::NAMES.len()],
            checkpoint: None,
            showing: false,
        };
        op.enter_phase(0, rules);
        op
    }

    pub fn cue(&mut self, id: u16, at: Vec2, gain: f32, pitch: f32) {
        self.ev.push(SimEvent::Cue { id, pos: v3(at), gain, pitch });
    }

    pub fn mark(&mut self, name: &str) {
        super::cover::mark(&mut self.cov, name);
    }

    pub fn say(&mut self, who: &str, text: &str) {
        self.callout = Some(Callout { who: who.to_string(), text: text.to_string(), age: 0.0 });
    }

    /// A callout from the table (`callouts.toml`), not too often.
    pub fn call(&mut self, key: &str) {
        if self.callout_cd > 0.0 {
            return;
        }
        let c = content();
        if let Some(entry) = c.callouts.get(key) {
            if !entry.text.is_empty() {
                let k = self.rng.below(entry.text.len() as u32) as usize;
                let (who, text) = (entry.who.clone(), entry.text[k].clone());
                // With the scrub nurse on the table, the anaesthesiologist calls it.
                let who = if self.case == 7 && who == "bashir" { "teddy".to_string() } else { who };
                self.say(&who, &text);
                self.callout_cd = 3.0;
            }
        }
    }

    pub fn set_banner(&mut self, text: &str) {
        self.banner = text.to_string();
        self.banner_t = 0.0;
        self.cue(cue::BANNER, Vec2::ZERO, 1.0, 1.0);
    }

    // -----------------------------------------------------------------------------------------
    // Spawning

    pub fn add(&mut self, mut h: Hazard) -> u32 {
        h.id = self.next_id;
        self.next_id += 1;
        let id = h.id;
        self.mark(&format!("hazard:{}", h.kind.key()));
        self.hazards.push(h);
        id
    }

    pub fn spawn_spec(&mut self, s: &SpawnSpec) {
        self.spawn_varied(s, 1.0, Vec2::ZERO);
    }

    /// A spawn, mirrored across the field (`flip` -1) and shifted: a repeat isn't a copy.
    fn spawn_varied(&mut self, s: &SpawnSpec, flip: f32, shift: Vec2) {
        let place = |p: [f32; 2]| (Vec2::new(p[0] * flip, p[1]) + shift).clamp(Vec2::new(-8.5, -3.9), Vec2::new(8.5, 4.1));
        let a = s.a.map(place).unwrap_or(Vec2::ZERO);
        let b = s.b.map(place).unwrap_or(a + Vec2::new(2.0, 0.0));
        let ang = s.ang.unwrap_or(0.0).to_radians();
        let mut h = Hazard {
            a,
            b,
            c: s.c.map(place).unwrap_or(if matches!(s.kind.as_str(), "incision" | "closure") { (a + b) * 0.5 } else { Vec2::ZERO }),
            r: s.r.unwrap_or(1.0),
            ang: if flip < 0.0 { std::f32::consts::PI - ang } else { ang },
            hidden: s.hidden,
            sub: s.sub,
            stage: s.stage,
            blocking: !s.optional,
            ..Default::default()
        };
        match s.kind.as_str() {
            "incision" => {
                h.kind = Kind::Incision;
            }
            "closure" => {
                h.kind = Kind::Closure;
            }
            "lacer" => {
                h.kind = Kind::Lacer;
                h.drain = 0.6;
                h.need = stitches_for(a.distance(b));
            }
            "bleeder" => {
                h.kind = Kind::Bleeder;
                h.drain = 3.0;
                h.need = 3;
                let d = Vec2::from_angle(h.ang) * 0.7;
                h.b = a + d;
                h.a = a - d;
            }
            "pool" => {
                h.kind = Kind::Pool;
            }
            "object" => {
                h.kind = Kind::Object;
                h.drain = 0.2;
                h.r = s.r.unwrap_or(0.45);
            }
            "polyp" => {
                h.kind = Kind::Polyp;
                h.drain = 0.1;
                h.r = s.r.unwrap_or(0.5);
            }
            "tumor" => {
                h.kind = Kind::Tumor;
                h.drain = 0.4;
                h.r = s.r.unwrap_or(1.3);
            }
            "patch" => {
                h.kind = Kind::Patch;
                h.drain = 0.2;
            }
            "burn" => {
                h.kind = Kind::Patch;
                h.sub = sub::BURN;
                h.drain = 0.2;
            }
            "bone" => {
                h.kind = Kind::Bone;
                h.r = s.r.unwrap_or(0.9);
                h.need = 2;
            }
            _ => return,
        }
        if let Some(d) = s.drain {
            h.drain = d;
        }
        self.add(h);
    }

    pub fn find(&self, id: u32) -> Option<usize> {
        self.hazards.iter().position(|h| h.id == id)
    }

    fn remove(&mut self, id: u32) -> Option<Hazard> {
        self.find(id).map(|i| self.hazards.remove(i))
    }

    // -----------------------------------------------------------------------------------------
    // The phase machine

    pub fn enter_phase(&mut self, k: usize, rules: &Rules) {
        let c = content();
        let case = &c.cases[self.case as usize];
        let Some(p) = case.phase.get(k) else {
            self.won = true;
            return;
        };
        self.phase = k as u16;
        self.phase_t = 0.0;
        self.phase_beats = 0;
        self.say_done = 0;
        self.trig_done = 0;
        self.lingering = false;
        self.linger = 0.0;
        if let Some(m) = p.meter {
            self.heart.meter = m;
            self.heart.bar = 0;
        }
        if let Some(r) = &p.reveal_plate {
            self.plate_prev = self.plate;
            self.plate = plate_id(&c, r);
            self.reveal = 0.0;
            self.push = 1.0;
            self.stains.clear();
            self.threads.clear();
            self.cue(cue::SQUISH, self.reveal_at, 1.0, 0.7);
        }
        if let Some(b) = &p.banner {
            let b = b.clone();
            self.set_banner(&b);
        }
        if p.checkpoint {
            let mut copy = self.clone();
            copy.checkpoint = None;
            copy.ev = Vec::new();
            self.checkpoint = Some(Box::new(copy));
        }
        self.spawn_i = 0;
        self.spawn_t = 0.0;
        self.round = 0;
        self.rounds_left = p.repeat;
        if p.stagger <= 0.0 {
            for s in &p.spawn {
                self.spawn_spec(s);
            }
            self.spawn_i = p.spawn.len() as u16;
        }
        if let Some(name) = &p.strain {
            self.strain = Some(super::strain::Strain::start(name, &p.params));
            self.start_strain(rules);
            self.mark(&format!("strain:{name}"));
        }
        if p.code_shocks > 0 {
            self.start_code(p.code_shocks, rules);
        }
        self.mark(&format!("phase:{}:{}", self.case, k.min(15)));
    }

    /// Restores the last checkpoint (or the case's start, when there is none). Under 2 seconds:
    /// it is instant.
    pub fn retry_checkpoint(&mut self, rules: &Rules) -> bool {
        if let Some(cp) = self.checkpoint.take() {
            let cov = std::mem::take(&mut self.cov);
            let mut op = (*cp).clone();
            op.checkpoint = Some(cp);
            op.cov = cov;
            op.dead = false;
            op.banner.clear();
            *self = op;
            let _ = rules;
            true
        } else {
            false
        }
    }

    /// The hazards still holding the phase open.
    pub fn blockers(&self) -> usize {
        self.hazards.iter().filter(|h| h.blocking).count()
    }

    fn phase_tick(&mut self, dt: f32, rules: &Rules) {
        let c = content();
        let case = &c.cases[self.case as usize];
        let Some(p) = case.phase.get(self.phase as usize) else { return };
        self.phase_t += dt;
        // The spawn list arrives over time, and comes round again once the field is clear.
        let mut more = (self.spawn_i as usize) < p.spawn.len();
        let (flip, shift) = if self.round == 0 {
            (1.0, Vec2::ZERO)
        } else {
            let k = self.round as f32;
            (if self.round % 2 == 1 { -1.0 } else { 1.0 }, Vec2::new((k * 2.3).sin() * 0.7, (k * 1.7).cos() * 0.5))
        };
        if more {
            self.spawn_t -= dt * self.time_scale;
            while self.spawn_t <= 0.0 && (self.spawn_i as usize) < p.spawn.len() {
                self.spawn_varied(&p.spawn[self.spawn_i as usize], flip, shift);
                self.spawn_i += 1;
                self.spawn_t += p.stagger;
            }
            more = (self.spawn_i as usize) < p.spawn.len();
        } else if self.rounds_left > 0 && self.blockers() == 0 && self.strain.is_none() && self.code.is_none() {
            self.rounds_left -= 1;
            self.round += 1;
            self.spawn_i = 0;
            self.spawn_t = 0.6;
            more = true;
        }
        for (k, s) in p.say.iter().enumerate() {
            if self.say_done & (1 << k) == 0 && self.phase_t >= s.at {
                self.say_done |= 1 << k;
                self.say(&s.who, &s.text);
            }
        }
        let mut hold = false;
        for (k, t) in p.trigger.iter().enumerate() {
            if self.trig_done & (1 << k) != 0 {
                continue;
            }
            let strain_done = self.strain.is_none();
            let fire = t.at_time.is_some_and(|x| self.phase_t >= x)
                || t.vitals_below.is_some_and(|x| self.vitals < x)
                || t.on_beat.is_some_and(|x| self.phase_beats >= x)
                || (t.on_clear && !more && self.rounds_left == 0 && self.blockers() == 0 && strain_done && self.code.is_none());
            if fire {
                self.trig_done |= 1 << k;
                for s in &t.spawn {
                    self.spawn_spec(s);
                }
                for s in &t.say {
                    self.say(&s.who, &s.text);
                }
                if let Some(id) = t.cue.as_deref().and_then(cue::id) {
                    self.cue(id, Vec2::ZERO, 1.0, 1.0);
                }
                if let Some(b) = &t.banner {
                    self.set_banner(b);
                }
                if t.vitals_hit > 0.0 {
                    self.vitals -= t.vitals_hit;
                    self.shake = self.shake.max(0.5);
                    self.cue(cue::ALARM, Vec2::ZERO, 0.8, 1.0);
                }
                if t.gift_full {
                    self.gifts.locked = false;
                    for s in &mut self.slots {
                        s.gift = 100.0;
                    }
                }
                if t.on_clear {
                    hold = true;
                }
            }
        }
        if hold || more || self.rounds_left > 0 || self.code.is_some() || self.strain.is_some() || self.blockers() > 0 {
            return;
        }
        // Clear: a moment of drama, then the next phase.
        if !self.lingering {
            self.lingering = true;
            self.linger = p.linger.max(0.35);
        }
        self.linger -= dt;
        if self.linger <= 0.0 {
            if let Some(h) = self.hazards.iter().rev().find(|h| h.has_path()) {
                self.reveal_at = h.b;
            }
            let next = self.phase as usize + 1;
            if next >= case.phase.len() {
                self.won = true;
            } else {
                self.enter_phase(next, rules);
            }
        }
    }

    // -----------------------------------------------------------------------------------------
    // One tick

    pub fn tick(&mut self, inputs: &[SurgeonInput; 4], rules: &Rules, dt: f32) {
        // The world slows inside a Hush; hands never do.
        let hushed = self.gifts.hush > 0.0;
        let scale = if hushed { rules.tune.hush_scale.clamp(0.05, 1.0) } else { 1.0 };
        self.time_scale = scale;
        let world = dt * scale;
        self.elapsed += dt;
        self.banner_t += dt;
        self.callout_cd = (self.callout_cd - dt).max(0.0);
        self.shake = (self.shake - dt * 2.5).max(0.0);
        self.flash = (self.flash - dt * 3.0).max(0.0);
        self.push = (self.push - dt * 0.8).max(0.0);
        self.reveal = (self.reveal + dt / 0.8).min(1.0);
        self.iv_cd = (self.iv_cd - world).max(0.0);
        self.gifts.ripple = (self.gifts.ripple - dt * 1.5).max(0.0);
        if let Some(c) = &mut self.callout {
            c.age += dt;
            if c.age > 4.5 {
                self.callout = None;
            }
        }
        for f in &mut self.floats {
            f.age += dt;
        }
        self.floats.retain(|f| f.age < 1.5);
        for f in &mut self.flights {
            f.t += dt * 1.6;
        }
        self.flights.retain(|f| f.t < 1.0);

        self.apply_inputs(inputs, rules, dt);
        self.heart_tick(rules, dt, scale);
        self.gift_tick(rules, dt);

        if !self.heart.stopped || self.code.is_none() {
            if !rules.freeze_timer {
                // The slider is live: it changes how fast the clock runs.
                self.timer -= world / rules.tune.timer.max(0.05);
            }
            if self.timer <= 0.0 && !self.showing {
                if self.is_director_case() {
                    // Code Blue: the team held on.
                    self.won = true;
                    return;
                }
                if !rules.immortal {
                    self.timer = 0.0;
                    self.dead = true;
                    self.mark("death:time");
                    return;
                }
                self.timer = self.timer_max;
            }
        }

        // Tools run for each surgeon, in seat order.
        for i in 0..4 {
            if self.slots[i].active {
                self.tool_tick(i, rules, dt, world);
            }
        }
        self.ghost_tick(rules, dt);
        if self.code.is_none() {
            self.hazards_tick(world, rules);
            self.strain_tick(world, rules);
            self.drain_tick(world, rules);
        }
        self.code_tick(rules, dt);
        if self.code.is_none() {
            self.phase_tick(dt, rules);
        }
        self.fx_limits();
    }

    pub fn is_director_case(&self) -> bool {
        self.case as usize == super::content::CODE_BLUE
    }

    fn fx_limits(&mut self) {
        let n = self.stains.len();
        if n > 40 {
            self.stains.drain(..n - 40);
        }
        let n = self.threads.len();
        if n > 24 {
            self.threads.drain(..n - 24);
        }
    }

    fn apply_inputs(&mut self, inputs: &[SurgeonInput; 4], rules: &Rules, dt: f32) {
        let time = rules.time;
        for i in 0..4 {
            let inp = inputs[i];
            let s = &mut self.slots[i];
            if !inp.active && !s.bot && i > 0 {
                s.held = 0;
                s.pressed = 0;
                continue;
            }
            if inp.active {
                s.active = true;
            }
            s.pressed = inp.pressed | (inp.held & !s.held);
            s.held = inp.held;
            s.pressure = if inp.pressure > 0.0 { inp.pressure } else if inp.held & btn::USE != 0 { 1.0 } else { 0.0 };
            if inp.tool > 0 && inp.tool <= 8 {
                self.select(i, inp.tool - 1);
            }
            if inp.cycle != 0 {
                let t = (self.slots[i].tool as i32 + inp.cycle as i32).rem_euclid(8) as u8;
                self.select(i, t);
            }
            if inp.abs {
                self.slots[i].aim = inp.aim;
            } else if inp.aim != Vec2::ZERO {
                self.stick_move(i, inp.aim, rules, dt);
            }
            let pet_case = self.is_pet_case();
            let echoing = self.gifts.echo > 0.0;
            let s = &mut self.slots[i];
            s.aim = s.aim.clamp(Vec2::new(-10.6, -5.6), Vec2::new(10.6, 5.9));
            // Pet's tremor: a slow wander, gone in Precision and during the Echo.
            let tremor = s.gift_kind == 2
                && rules.tremor
                && s.held & btn::PRECISION == 0
                && !echoing
                && pet_case;
            let wander = if tremor {
                Vec2::new((time * 3.1 + i as f32).sin() + (time * 7.3).sin() * 0.5, (time * 4.3).cos() + (time * 5.9).sin() * 0.5)
                    * 0.08
            } else {
                Vec2::ZERO
            };
            s.cursor = s.aim + wander;
            s.recoil = (s.recoil - dt * 4.0).max(0.0);
            s.clink = (s.clink - dt * 3.0).max(0.0);
            s.since_action += dt;
            if s.chain > 0 {
                s.chain_t += dt;
                if s.chain_t > rules.tune.chain_window {
                    s.chain = 0;
                }
            }
            s.hover = 0;
        }
        for i in 0..4 {
            if self.slots[i].active {
                let tool = self.tool_of(i);
                let p = self.slots[i].cursor;
                self.slots[i].hover = self.target_near(tool, p, 1.0, i).map(|k| self.hazards[k].id).unwrap_or(0);
            }
        }
    }

    pub fn is_pet_case(&self) -> bool {
        let c = content();
        c.cases[self.case as usize].surgeon == "pet"
    }

    pub fn select(&mut self, i: usize, ring_pos: u8) {
        if self.slots[i].tool != ring_pos {
            self.release(i);
            self.slots[i].tool = ring_pos;
            let p = self.slots[i].cursor;
            self.cue(cue::TOOL_PICK, p, 0.8, 1.0 + ring_pos as f32 * 0.04);
        }
    }

    /// Drops what the hand holds.
    fn release(&mut self, i: usize) {
        let s = &mut self.slots[i];
        let id = s.eng_id;
        s.eng = Eng::None;
        s.eng_id = 0;
        s.eng_a = 0.0;
        s.eng_b = 0.0;
        if let Some(k) = self.find(id) {
            let h = &mut self.hazards[k];
            if h.kind != Kind::Bone && h.kind != Kind::Tendril {
                h.c = if h.has_path() { h.c } else { Vec2::ZERO };
            }
        }
    }

    /// Stick steering: speed curve, Precision, and aim assist (slowdown and pull near a valid
    /// target, a rail along a cut, the needle's creep along a wound).
    fn stick_move(&mut self, i: usize, stick: Vec2, rules: &Rules, dt: f32) {
        let s = &self.slots[i];
        let (aim, eng, eng_id, tool, held) = (s.aim, s.eng, s.eng_id, self.tool_of(i), s.held);
        let mag = stick.length().min(1.0);
        let dir = stick.normalize_or_zero();
        let mut speed = 15.0 * mag.powf(2.2) * rules.tune.cursor_speed;
        if held & btn::PRECISION != 0 {
            speed *= 0.35;
        }
        let assist = rules.tune.aim_assist;
        let mut pull = Vec2::ZERO;
        if assist > 0.0 {
            if let Some(k) = self.target_near(tool, aim, 1.2, i) {
                let spot = self.hazards[k].spot();
                let d = spot.distance(aim);
                let t = 1.0 - (d / 1.2).clamp(0.0, 1.0);
                speed *= 1.0 - 0.5 * assist * t;
                pull = (spot - aim).normalize_or_zero() * (3.0 * assist * t) * dt;
            }
        }
        let mut next = aim + dir * speed * dt + pull;
        if assist > 0.0 {
            if let Some(h) = self.find(eng_id).map(|k| &self.hazards[k]) {
                match eng {
                    Eng::Cut | Eng::Dress => {
                        // Rail: sideways error is damped.
                        let (near, _) = nearest_on_path(h, h.prog, 0.3, next);
                        next += (near - next) * (0.25 * assist);
                    }
                    Eng::Stitch => {
                        // The needle creeps along by itself, so the stick only flicks across it.
                        let (ax, along, _) = wound_frame(h, next);
                        let want = h.a.distance(h.b) * h.prog + 0.1;
                        next += ax * (want - along).clamp(-1.0, 1.0) * (8.0 * assist * dt);
                    }
                    _ => {}
                }
            }
        }
        self.slots[i].aim = next;
    }

    fn heart_tick(&mut self, rules: &Rules, dt: f32, scale: f32) {
        let coupling = rules.tune.coupling;
        let want = 72.0 + (148.0 - 72.0) * (1.0 - self.vitals / 100.0).clamp(0.0, 1.0) * coupling;
        let h = &mut self.heart;
        h.bpm += (want.clamp(40.0, 200.0) - h.bpm) * (1.0 - (-dt * 1.5).exp());
        h.r_wave = false;
        if h.stopped {
            return;
        }
        // Inside a Hush the heart slows, but less than the world: it is what the player counts.
        let rate = if scale < 1.0 { 0.5 } else { 1.0 };
        h.phase += dt * rate / h.period();
        if h.phase >= 1.0 {
            h.phase -= 1.0;
            h.beats += 1;
            h.r_wave = true;
            h.bar = (h.bar + 1) % h.meter.max(1);
            self.phase_beats += 1;
            let accent = if h.bar == 0 { 1.0 } else { 0.7 };
            self.cue(cue::LUB, Vec2::ZERO, accent, 1.0);
            self.cue(cue::MONITOR, Vec2::ZERO, 0.5, if self.heart.bar == 0 { 1.2 } else { 1.0 });
            if self.gifts.hush > 0.0 {
                self.gifts.hush -= 1.0 / rules.tune.gift_dur.max(0.1);
                if self.gifts.hush <= 0.0 {
                    self.gifts.duet = self.gifts.echo > 0.0;
                }
            }
        }
    }

    fn drain_tick(&mut self, world: f32, rules: &Rules) {
        let mut d = content().cases[self.case as usize].base_drain;
        for h in &self.hazards {
            d += match h.kind {
                Kind::Pool => (0.2 + h.drain) * std::f32::consts::PI * h.r * h.r,
                _ => h.drain,
            };
        }
        if let Some(f) = self.fever {
            if f > 100.0 {
                d += 6.0;
            }
        }
        let before = self.vitals;
        self.vitals -= d * world * rules.tune.drain * rules.diff.drain();
        if before >= 40.0 && self.vitals < 40.0 {
            self.call("vitals_low");
            if !self.crit_called {
                self.crit_called = true;
                self.set_banner("VITALS CRITICAL");
                self.cue(cue::ALARM, Vec2::ZERO, 1.0, 1.0);
            }
        }
        if self.vitals > 55.0 {
            self.crit_called = false;
        }
        if self.vitals <= 0.0 {
            self.vitals = 0.0;
            if rules.immortal {
                self.vitals = 60.0;
            } else if self.codes_left > 0 {
                self.codes_left -= 1;
                self.start_code(0, rules);
            } else {
                self.dead = true;
                self.mark("death:vitals");
            }
        }
    }

    pub fn start_code(&mut self, shocks: u8, rules: &Rules) {
        let window = rules.tune.code_window;
        self.code = Some(Code { left: window, window, ghost: 0.0, shocks, scripted: shocks > 0, last_good: 0.0 });
        self.heart.stopped = true;
        self.mark("code");
        if shocks > 0 {
            self.mark("code:scripted");
        }
        self.set_banner("CODE");
        self.cue(cue::FLATLINE, Vec2::ZERO, 1.0, 1.0);
        self.shake = 0.6;
        self.push = 1.0;
        for s in &mut self.slots {
            s.eng = Eng::None;
            s.eng_id = 0;
        }
    }

    fn code_tick(&mut self, rules: &Rules, dt: f32) {
        let Some(mut c) = self.code else { return };
        c.left -= dt;
        c.ghost = (c.ghost + dt / 0.9).fract();
        c.last_good = (c.last_good - dt).max(0.0);
        let mut landed = false;
        let mut missed = false;
        for i in 0..4 {
            if !self.slots[i].active {
                continue;
            }
            let s = &mut self.slots[i];
            let holding = s.held & btn::DEFIB != 0;
            if holding {
                let before = s.charge;
                s.charge = (s.charge + dt / 1.2).min(1.0);
                if before == 0.0 {
                    self.ev.push(SimEvent::Cue { id: cue::DEFIB_WHINE, pos: Vec3::ZERO, gain: 1.0, pitch: 1.0 });
                }
            } else if s.charge > 0.0 {
                // Let go: on the ghost beat, or nothing.
                let good = s.charge >= 1.0 && (c.ghost - 0.5).abs() * 0.9 <= 0.2;
                s.charge = 0.0;
                if good {
                    landed = true;
                } else {
                    missed = true;
                }
            }
        }
        if missed {
            self.cue(cue::CLINK, Vec2::ZERO, 1.0, 0.7);
        }
        if landed {
            self.cue(cue::DEFIB_THUMP, Vec2::ZERO, 1.0, 1.0);
            self.shake = 1.0;
            self.flash = 1.0;
            self.mark("tool:defib");
            self.award(0, Vec2::ZERO, Tool::Defib, Rating::Clean, rules);
            if c.shocks > 1 {
                c.shocks -= 1;
                c.left = c.window;
                c.last_good = 1.0;
                self.code = Some(c);
                self.say("teddy", "Again! Charge it again!");
                return;
            }
            self.code = None;
            self.heart.stopped = false;
            self.heart.phase = 0.0;
            if !c.scripted {
                self.vitals = 30.0;
            } else {
                self.vitals = self.vitals.max(45.0);
            }
            self.cue(cue::LUB, Vec2::ZERO, 1.0, 1.0);
            return;
        }
        if c.left <= 0.0 {
            if rules.immortal {
                self.code = None;
                self.heart.stopped = false;
                self.vitals = 60.0;
                return;
            }
            self.dead = true;
            self.code = None;
            self.mark("death:code");
            return;
        }
        self.code = Some(c);
    }

    // -----------------------------------------------------------------------------------------
    // Hazard behaviour

    fn hazards_tick(&mut self, world: f32, _rules: &Rules) {
        let mut feed = 0.0;
        for h in &mut self.hazards {
            h.age += world;
            if h.seen > 0.0 {
                h.seen -= world;
            }
            match h.kind {
                Kind::Lacer | Kind::Bleeder => feed += h.drain * world,
                Kind::Patch | Kind::Polyp | Kind::Nodule | Kind::Sac | Kind::Ember | Kind::Furnace => {}
                _ => {}
            }
            // Heat that nobody is holding fades.
            if h.fill > 0.0 && !matches!(h.kind, Kind::Bone) {
                h.fill = (h.fill - world * 0.25).max(0.0);
            }
        }
        // Open wounds feed pools.
        if feed > 0.0 {
            let wound = self
                .hazards
                .iter()
                .filter(|h| matches!(h.kind, Kind::Lacer | Kind::Bleeder))
                .map(|h| h.a.lerp(h.b, 0.5))
                .next();
            if let Some(at) = wound {
                let near = self.hazards.iter().position(|h| h.kind == Kind::Pool && h.a.distance(at) < h.r + 1.0);
                match near {
                    Some(k) => {
                        let p = &mut self.hazards[k];
                        p.r = (p.r + feed * 0.03).min(1.7);
                    }
                    None => {
                        if self.pool_count() < 4 && self.rng.f32() < feed * 0.06 {
                            let offset = Vec2::new(self.rng.range(-0.5, 0.5), self.rng.range(-0.4, 0.4));
                            self.add(Hazard { kind: Kind::Pool, a: at + offset, r: 0.42, blocking: false, ..Default::default() });
                        }
                    }
                }
            }
        }
    }

    fn pool_count(&self) -> usize {
        self.hazards.iter().filter(|h| h.kind == Kind::Pool).count()
    }

    pub fn covered(&self, h: &Hazard) -> bool {
        h.kind != Kind::Pool
            && !matches!(h.kind, Kind::Incision | Kind::Closure | Kind::Sac | Kind::Eye)
            && self.hazards.iter().any(|p| p.kind == Kind::Pool && p.a.distance(h.spot()) < p.r * 0.85)
    }

    /// Can `tool` act on this hazard now?
    pub fn valid(&self, h: &Hazard, tool: Tool) -> bool {
        if !h.visible() || self.covered(h) {
            return false;
        }
        if h.kind == Kind::Sac {
            return tool == Tool::Laser || tool == Tool::Suction;
        }
        h.takes() == Some(tool)
    }

    /// The nearest hazard `tool` can act on within `reach` of `p`, not held by another surgeon.
    pub fn target_near(&self, tool: Tool, p: Vec2, reach: f32, me: usize) -> Option<usize> {
        let mut best: Option<(usize, f32)> = None;
        for (k, h) in self.hazards.iter().enumerate() {
            if !self.valid(h, tool) || self.held_by_other(h.id, me) {
                continue;
            }
            let d = self.dist_to(h, tool, p);
            if d <= reach + hit_slop(h) && best.is_none_or(|(_, b)| d < b) {
                best = Some((k, d));
            }
        }
        best.map(|(k, _)| k)
    }

    pub fn held_by_other(&self, id: u32, me: usize) -> bool {
        self.slots.iter().enumerate().any(|(i, s)| i != me && s.active && s.eng_id == id && s.eng != Eng::None)
    }

    pub fn dist_to(&self, h: &Hazard, tool: Tool, p: Vec2) -> f32 {
        match h.kind {
            Kind::Lacer | Kind::Bleeder => dist_segment(p, h.a, h.b),
            Kind::Sac if tool == Tool::Suction => (p.distance(h.a) - h.r).max(0.0),
            Kind::Bone if h.stage == 1 => dist_segment(p, h.a, h.b),
            Kind::Tumor if h.stage == 2 => (p.distance(h.a) - h.r).max(0.0),
            Kind::Pool | Kind::Patch => (p.distance(h.a) - h.r).max(0.0),
            _ if h.has_path() => p.distance(h.spot()),
            _ => p.distance(h.spot()),
        }
    }

    pub fn tool_of(&self, i: usize) -> Tool {
        if self.code.is_some() {
            return Tool::Defib;
        }
        // The closing dressing comes to hand by itself when it is all that's left.
        let picked = self.ring[(self.slots[i].tool as usize).min(7)];
        if picked != Tool::Iv && self.hazards.iter().any(|h| h.kind == Kind::Closure) && self.hazards.iter().all(|h| h.kind == Kind::Closure) {
            return Tool::Dressing;
        }
        picked
    }

    // -----------------------------------------------------------------------------------------
    // Instruments

    fn wrong_tool(&mut self, i: usize, rules: &Rules) {
        let s = &mut self.slots[i];
        if s.clink > 0.2 {
            return;
        }
        s.chain = 0;
        s.clink = 1.0;
        let p = s.cursor;
        self.cue(cue::CLINK, p, 1.0, 1.0);
        self.call("wrong_tool");
        self.vitals -= rules.tune.wrong_penalty;
        self.mark("wrong_tool");
    }

    /// A slip: a small laceration here.
    fn lacerate(&mut self, at: Vec2, ang: f32, rules: &Rules) {
        let d = Vec2::from_angle(ang) * 0.6;
        let h = Hazard {
            kind: Kind::Lacer,
            a: at - d,
            b: at + d,
            drain: 0.6,
            need: 3,
            blocking: false,
            ..Default::default()
        };
        self.add(h);
        self.mistakes += 1;
        self.vitals -= 2.0 * rules.diff.drain();
        self.shake = self.shake.max(0.3);
        self.cue(cue::TEAR, at, 1.0, 1.0);
        self.mark("mistake:lacerate");
    }

    fn burn_at(&mut self, at: Vec2) {
        let h = Hazard { kind: Kind::Patch, sub: sub::BURN, a: at, r: 0.7, drain: 0.25, blocking: false, ..Default::default() };
        self.add(h);
        self.mistakes += 1;
        self.cue(cue::SIZZLE, at, 1.0, 0.8);
        self.mark("mistake:burn");
    }

    fn tool_tick(&mut self, i: usize, rules: &Rules, dt: f32, world: f32) {
        if self.code.is_some() {
            return;
        }
        let tool = self.tool_of(i);
        let s = &self.slots[i];
        let held = s.held & btn::USE != 0;
        let pressed = s.pressed & btn::USE != 0 || (held && s.eng == Eng::None && tool_is_continuous(tool));
        let p = s.cursor;
        let cancel = s.held & btn::CANCEL != 0;
        if cancel {
            self.release(i);
            return;
        }
        // The gel's flow refills whenever the trigger is up.
        if tool != Tool::Gel || !held {
            let s = &mut self.slots[i];
            s.flow = (s.flow + dt / 2.0).min(1.0);
        }
        // Heat rings scorch a hand that stays down.
        if held {
            if let Some(radius) = self.heat_ring {
                let d = p.length();
                if (d - radius).abs() < 0.55 {
                    self.scorch(i, rules);
                    return;
                }
            }
        }
        self.slots[i].eng_t += dt;
        match tool {
            Tool::Scalpel | Tool::Dressing => self.cut_tick(i, tool, held, pressed, rules),
            Tool::Forceps => self.forceps_tick(i, held, pressed, rules, dt),
            Tool::Suture => self.suture_tick(i, held, pressed, rules),
            Tool::Suction => self.suction_tick(i, held, rules, world.max(dt * 0.6)),
            Tool::Laser | Tool::Cryo => self.heat_tick(i, tool, held, rules, dt),
            Tool::Gel => self.gel_tick(i, held, rules, dt),
            Tool::Scanner => self.scanner_tick(i, held, dt),
            Tool::Iv => self.iv_tick(i, held, rules, dt),
            Tool::Defib => {}
        }
    }

    fn scorch(&mut self, i: usize, rules: &Rules) {
        let p = self.slots[i].cursor;
        if self.slots[i].clink > 0.0 {
            return;
        }
        self.release(i);
        let s = &mut self.slots[i];
        s.chain = 0;
        s.clink = 1.0;
        self.vitals -= 2.0 * rules.diff.drain();
        self.burn_at(p);
        self.call("lift_off");
        self.mark("scorch");
    }

    fn cut_tick(&mut self, i: usize, tool: Tool, held: bool, pressed: bool, rules: &Rules) {
        let s = &self.slots[i];
        let (p, eng, eng_id) = (s.cursor, s.eng, s.eng_id);
        let want = if tool == Tool::Dressing { Eng::Dress } else { Eng::Cut };
        if eng == want {
            let Some(k) = self.find(eng_id) else {
                self.release(i);
                return;
            };
            if !held {
                // Let go mid-stroke: the cut stays, the rating suffers.
                self.hazards[k].fill += 1.0;
                self.release(i);
                return;
            }
            let h = &self.hazards[k];
            let (near, t) = nearest_on_path(h, h.prog, 0.28, p);
            let d = near.distance(p);
            if d > 1.15 && tool == Tool::Scalpel {
                let ang = (p - near).to_angle();
                self.release(i);
                self.call("healthy");
                self.lacerate(p, ang, rules);
                return;
            }
            let adv = (t - h.prog).max(0.0);
            let s = &mut self.slots[i];
            if adv > 0.0 {
                s.eng_a += d * adv;
                s.eng_b += adv;
            }
            let h = &mut self.hazards[k];
            h.prog = h.prog.max(t);
            if adv > 0.002 && self.slots[i].eng_t > 0.12 {
                self.slots[i].eng_t = 0.0;
                let tool_cue = if tool == Tool::Scalpel { cue::SLICE } else { cue::GEL };
                self.cue(tool_cue, near, 0.6, 1.0);
            }
            let h = &self.hazards[k];
            if h.prog >= 0.975 {
                let breaks = h.fill.floor();
                let s = &self.slots[i];
                let mean = s.eng_a / s.eng_b.max(0.2);
                let rating = Rating::grade(mean + breaks * 0.18, rules.tune.strictness, 0.25, 0.42, 0.7);
                let at = h.b;
                let id = h.id;
                self.release(i);
                self.complete(i, id, tool, rating, at, rules);
            }
            return;
        }
        if !pressed {
            return;
        }
        if let Some(k) = self.target_near(tool, p, 0.75, i) {
            let id = self.hazards[k].id;
            match (self.hazards[k].kind, self.hazards[k].stage) {
                // A brittle ember takes one stroke through it.
                (Kind::Ember, _) | (Kind::Furnace, _) => {
                    let at = self.hazards[k].a;
                    self.cue(cue::CRACK, at, 1.0, 1.0);
                    let rating = if self.hazards[k].fill > 0.0 { Rating::Clean } else { Rating::Immaculate };
                    self.complete(i, id, tool, rating, at, rules);
                }
                _ => {
                    let s = &mut self.slots[i];
                    s.eng = want;
                    s.eng_id = id;
                    s.eng_a = 0.0;
                    s.eng_b = 0.0;
                    s.eng_t = 0.0;
                    self.mark(&format!("tool:{}", tool.key()));
                }
            }
        } else if tool == Tool::Scalpel {
            if self.wrong_tool_here(i, tool, p, rules) {
                return;
            }
            // Cutting what was never meant to be cut.
            self.slots[i].eng_start = p;
            self.call("healthy");
            self.lacerate(p, 0.7, rules);
        }
    }

    /// A press on a hazard this instrument can't touch: true when it was one.
    fn wrong_tool_here(&mut self, i: usize, tool: Tool, p: Vec2, rules: &Rules) -> bool {
        let hit = self.hazards.iter().any(|h| {
            h.visible()
                && h.takes().is_some()
                && h.takes() != Some(tool)
                && !matches!(h.kind, Kind::Pool)
                && self.dist_to(h, tool, p) < 0.6
        });
        if hit {
            self.wrong_tool(i, rules);
        }
        hit
    }

    fn forceps_tick(&mut self, i: usize, held: bool, pressed: bool, rules: &Rules, dt: f32) {
        let s = &self.slots[i];
        let (p, eng, eng_id, start) = (s.cursor, s.eng, s.eng_id, s.eng_start);
        if eng == Eng::Pull {
            let Some(k) = self.find(eng_id) else {
                self.release(i);
                return;
            };
            if !held {
                if self.hazards[k].kind != Kind::Tendril {
                    self.hazards[k].prog = 0.0;
                }
                self.release(i);
                return;
            }
            let h = &self.hazards[k];
            if h.kind == Kind::Tendril {
                self.tendril_pull(i, k, rules, dt);
                return;
            }
            let disp = p - start;
            let axis = Vec2::from_angle(h.ang);
            let along = disp.dot(axis);
            let m = disp.length();
            let err = if m > 0.05 { axis.angle_to(disp).abs().to_degrees() } else { 0.0 };
            let need = 1.0;
            let at = h.a;
            let id = h.id;
            let hazard = &mut self.hazards[k];
            hazard.c = disp;
            hazard.prog = (along / need).clamp(0.0, 1.0);
            if m > 0.55 && err > 60.0 {
                // Yanked off the axis: it tears.
                self.hazards[k].c = Vec2::ZERO;
                self.hazards[k].prog = 0.0;
                self.release(i);
                self.call("off_axis");
                self.lacerate(at, axis.to_angle(), rules);
                return;
            }
            if along >= need {
                let rating = Rating::grade(err, rules.tune.strictness, 12.0, 24.0, 40.0);
                self.release(i);
                self.cue(cue::PULL_POP, at, 1.0, 1.0);
                self.complete(i, id, Tool::Forceps, rating, at, rules);
            }
            return;
        }
        if eng == Eng::Bone {
            let Some(k) = self.find(eng_id) else {
                self.release(i);
                return;
            };
            let s = &self.slots[i];
            let (rot_l, rot_r) = (s.held & btn::ROT_L != 0, s.held & btn::ROT_R != 0);
            let spin = (rot_r as i32 - rot_l as i32) as f32;
            let h = &mut self.hazards[k];
            h.a = p;
            h.ang += spin * 2.2 * dt;
            let err = angle_diff(h.ang, 0.0).abs().to_degrees();
            let d = h.a.distance(h.b);
            if d < 0.35 && err < 12.0 {
                h.a = h.b;
                h.ang = 0.0;
                let id = h.id;
                let at = h.b;
                let t = self.slots[i].eng_a;
                let rating = Rating::grade(t, rules.tune.strictness, 3.0, 6.0, 12.0);
                self.release(i);
                self.cue(cue::SNAP, at, 1.0, 1.0);
                self.complete(i, id, Tool::Forceps, rating, at, rules);
                return;
            }
            self.slots[i].eng_a += dt;
            if !held {
                self.release(i);
            }
            return;
        }
        if !pressed {
            return;
        }
        if let Some(k) = self.target_near(Tool::Forceps, p, 0.7, i) {
            let id = self.hazards[k].id;
            let kind = self.hazards[k].kind;
            let s = &mut self.slots[i];
            s.eng = if kind == Kind::Bone { Eng::Bone } else { Eng::Pull };
            s.eng_id = id;
            s.eng_start = p;
            s.eng_a = 0.0;
            s.eng_t = 0.0;
            self.mark("tool:forceps");
            self.cue(cue::FORCEPS, p, 1.0, 1.0);
        } else {
            self.wrong_tool_here(i, Tool::Forceps, p, rules);
        }
    }

    fn tendril_pull(&mut self, i: usize, k: usize, rules: &Rules, dt: f32) {
        let s = &self.slots[i];
        let p = s.cursor;
        let moved = p - s.eng_start;
        let h = &self.hazards[k];
        let axis = Vec2::from_angle(h.ang);
        let along = moved.dot(axis);
        self.slots[i].eng_start = p;
        let (at, id) = (h.a, h.id);
        if along > 0.001 {
            // The squeeze proper: a tick either side of it is forgiven.
            let squeezing = self.heart.phase > 0.05 && self.heart.phase < 0.3;
            if squeezing {
                // Pulling against the squeeze: it snaps back.
                let h = &mut self.hazards[k];
                h.prog = (h.prog - 0.12).max(0.0);
                h.fill += 1.0;
                self.slots[i].chain = 0;
                self.cue(cue::TEAR, at, 0.7, 1.2);
                self.vitals -= 1.0 * rules.diff.drain();
                self.call("tendril_systole");
                self.release(i);
                return;
            }
            if self.heart.systole() {
                return;
            }
            let h = &mut self.hazards[k];
            h.prog = (h.prog + along * 0.04 * rules.tune.tool_power / rules.tune.strain_tough.max(0.2)).min(1.0);
            h.c = axis * h.prog * 1.6;
        }
        let _ = dt;
        if self.hazards[k].prog >= 1.0 {
            let breaks = self.hazards[k].fill;
            let rating = Rating::grade(breaks, rules.tune.strictness, 0.5, 2.0, 4.0);
            self.release(i);
            self.cue(cue::PULL_POP, at, 1.0, 0.7);
            self.complete(i, id, Tool::Forceps, rating, at, rules);
        }
    }

    fn suture_tick(&mut self, i: usize, held: bool, pressed: bool, rules: &Rules) {
        let s = &self.slots[i];
        let (p, eng, eng_id) = (s.cursor, s.eng, s.eng_id);
        if eng == Eng::Stitch {
            let Some(k) = self.find(eng_id) else {
                self.release(i);
                return;
            };
            if !held {
                self.release(i);
                return;
            }
            let h = &self.hazards[k];
            let (_, along, perp) = wound_frame(h, p);
            let side = if perp > 0.07 {
                1
            } else if perp < -0.07 {
                -1
            } else {
                0
            };
            let last = self.slots[i].side;
            if side != 0 {
                self.slots[i].side = side;
            }
            if side != 0 && last != 0 && side != last {
                // A crossing: near the needle it is a stitch.
                let len = h.a.distance(h.b).max(0.1);
                let need = h.need.max(1) as f32;
                let needle = len * (h.n as f32 + 0.5) / need;
                let off = (along - needle).abs();
                if off < 1.2 {
                    let at = h.a.lerp(h.b, (h.n as f32 + 0.5) / need);
                    let h = &mut self.hazards[k];
                    h.n += 1;
                    h.prog = (h.n as f32 / need).min(1.0);
                    let done = h.n >= h.need;
                    let id = h.id;
                    let s = &mut self.slots[i];
                    s.eng_a += off;
                    s.eng_b += 1.0;
                    s.eng_t = 0.0;
                    self.cue(cue::SUTURE, at, 0.8, 0.9 + (self.hazards[k].n as f32) * 0.03);
                    if done {
                        let s = &self.slots[i];
                        let mean = s.eng_a / s.eng_b.max(1.0);
                        let rating = Rating::grade(mean, rules.tune.strictness, 0.32, 0.55, 0.85);
                        self.release(i);
                        self.complete(i, id, Tool::Suture, rating, at, rules);
                    }
                }
            }
            return;
        }
        if !pressed {
            return;
        }
        if let Some(k) = self.target_near(Tool::Suture, p, 0.85, i) {
            let id = self.hazards[k].id;
            let (_, _, perp) = wound_frame(&self.hazards[k], p);
            let s = &mut self.slots[i];
            s.eng = Eng::Stitch;
            s.eng_id = id;
            s.side = if perp >= 0.0 { 1 } else { -1 };
            s.eng_a = 0.0;
            s.eng_b = 0.0;
            s.eng_t = 0.0;
            self.mark("tool:suture");
        } else {
            self.wrong_tool_here(i, Tool::Suture, p, rules);
        }
    }

    fn suction_tick(&mut self, i: usize, held: bool, rules: &Rules, dt: f32) {
        if !held {
            self.slots[i].eng = Eng::None;
            self.slots[i].eng_id = 0;
            return;
        }
        let s = &self.slots[i];
        let (p, pressure) = (s.cursor, s.pressure.clamp(0.2, 1.0));
        let Some(k) = self.target_near(Tool::Suction, p, 0.4, i) else {
            self.slots[i].eng = Eng::None;
            self.slots[i].eng_id = 0;
            return;
        };
        let power = rules.tune.tool_power * pressure;
        let id = self.hazards[k].id;
        self.slots[i].eng = Eng::Suck;
        self.slots[i].eng_id = id;
        self.mark("tool:suction");
        if self.slots[i].eng_t > 0.18 {
            self.slots[i].eng_t = 0.0;
            let pitch = 0.8 + self.rng.f32() * 0.4;
            self.cue(cue::GURGLE, p, 0.35 + pressure * 0.6, pitch);
        }
        let h = &mut self.hazards[k];
        let at = h.a;
        if h.kind == Kind::Sac {
            // Draining a sac whole: slow, and it never rates better than Good.
            h.fill = (h.fill + dt / 2.4 * power).min(1.0);
            h.r = (0.8 * (1.0 - h.fill) + 0.1) * (0.5 + 0.5 * h.prog);
            if h.fill >= 1.0 {
                self.release(i);
                self.complete(i, id, Tool::Suction, Rating::Good, at, rules);
            }
        } else if matches!(h.kind, Kind::Furnace) {
            h.fill = (h.fill + dt / 1.0 * power).min(1.0);
            if h.fill >= 1.0 {
                h.fill = 0.0;
                self.release(i);
                self.complete(i, id, Tool::Suction, Rating::Good, at, rules);
            }
        } else {
            h.r -= dt * 1.1 * power;
            if h.r <= 0.14 {
                let r = 0.5;
                self.stains.push(Stain { at, r, kind: 0 });
                self.release(i);
                self.complete(i, id, Tool::Suction, Rating::Good, at, rules);
            }
        }
    }

    fn heat_tick(&mut self, i: usize, tool: Tool, held: bool, rules: &Rules, dt: f32) {
        let s = &self.slots[i];
        let (p, eng, eng_id) = (s.cursor, s.eng, s.eng_id);
        let engaged = eng == Eng::Heat;
        if engaged && !held {
            // The release decides everything.
            let k = self.find(eng_id);
            self.release(i);
            if let Some(k) = k {
                let h = &self.hazards[k];
                let (fill, at, id) = (h.fill, h.spot(), h.id);
                if fill >= 0.8 {
                    let off = if fill <= 1.0 { 1.0 - fill } else { fill - 1.0 + 0.05 };
                    let rating = Rating::grade(off, rules.tune.strictness, 0.07, 0.13, 0.22);
                    self.hazards[k].fill = 0.0;
                    self.complete(i, id, tool, rating, at, rules);
                }
            }
            return;
        }
        if !held {
            return;
        }
        let target = self.target_near(tool, p, 0.55, i);
        match target {
            Some(k) => {
                let id = self.hazards[k].id;
                if eng_id != id {
                    let s = &mut self.slots[i];
                    s.eng = Eng::Heat;
                    s.eng_id = id;
                    self.mark(&format!("tool:{}", tool.key()));
                }
                let time = {
                    let h = &self.hazards[k];
                    let base = if h.fill_time > 0.0 {
                        h.fill_time
                    } else if tool == Tool::Cryo {
                        1.0
                    } else {
                        1.2
                    };
                    let tough = if matches!(h.kind, Kind::Nodule | Kind::Sac | Kind::Ember | Kind::Furnace) {
                        rules.tune.strain_tough
                    } else {
                        1.0
                    };
                    base * tough / rules.tune.tool_power.max(0.1)
                };
                let h = &mut self.hazards[k];
                h.fill += dt / time.max(0.05) + dt * 0.25;
                let (fill, at) = (h.fill, h.spot());
                if self.slots[i].eng_t > 0.2 {
                    self.slots[i].eng_t = 0.0;
                    let id = if tool == Tool::Laser { cue::LASER } else { cue::FROST };
                    self.cue(id, at, 0.5, 0.7 + fill * 0.6);
                }
                if fill > 1.28 {
                    self.hazards[k].fill = 0.0;
                    self.release(i);
                    if tool == Tool::Laser {
                        self.call("overheat");
                    } else {
                        self.call("frostbite");
                    }
                    self.burn_at(at);
                    self.slots[i].chain = 0;
                }
            }
            None => {
                let s = &mut self.slots[i];
                s.eng = Eng::None;
                s.eng_id = 0;
                // Holding a beam on healthy tissue: it burns, eventually.
                s.eng_a += dt;
                if s.eng_a > 1.6 {
                    s.eng_a = 0.0;
                    if !self.wrong_tool_here(i, tool, p, rules) {
                        self.burn_at(p);
                    }
                }
            }
        }
    }

    fn gel_tick(&mut self, i: usize, held: bool, rules: &Rules, dt: f32) {
        if !held {
            self.slots[i].eng = Eng::None;
            self.slots[i].eng_id = 0;
            return;
        }
        let s = &mut self.slots[i];
        let p = s.cursor;
        s.flow -= dt / 2.4;
        if s.flow <= 0.0 {
            s.flow = 0.0;
            return;
        }
        if s.eng_t > 0.16 {
            s.eng_t = 0.0;
            let pitch = 1.0 + self.rng.f32() * 0.2;
            self.cue(cue::GEL, p, 0.5, pitch);
        }
        let Some(k) = self.target_near(Tool::Gel, p, 0.2, i) else {
            self.slots[i].eng_b += dt;
            return;
        };
        let id = self.hazards[k].id;
        let s = &mut self.slots[i];
        if s.eng_id != id {
            s.eng = Eng::Paint;
            s.eng_id = id;
            self.mark("tool:gel");
        }
        let h = &mut self.hazards[k];
        let area = (h.r * h.r).max(0.5);
        h.prog += dt * 1.25 * rules.tune.tool_power / area;
        let at = h.a;
        if h.prog >= 1.0 {
            h.prog = 0.0;
            let over = self.slots[i].eng_b;
            let rating = Rating::grade(over, rules.tune.strictness, 0.25, 0.6, 1.1);
            self.slots[i].eng_b = 0.0;
            self.slots[i].eng_id = 0;
            self.stains.push(Stain { at, r: 0.6, kind: 2 });
            self.complete(i, id, Tool::Gel, rating, at, rules);
        }
    }

    fn scanner_tick(&mut self, i: usize, held: bool, dt: f32) {
        if !held {
            self.slots[i].eng = Eng::None;
            return;
        }
        let s = &mut self.slots[i];
        s.eng = Eng::Scan;
        s.ping_t -= dt;
        let p = s.cursor;
        if s.ping_t <= 0.0 {
            s.ping_t = 0.45;
            self.mark("tool:scanner");
            self.cue(cue::SONAR, p, 0.7, 1.0);
        }
        let mut found = Vec::new();
        for h in &mut self.hazards {
            if h.hidden && h.a.distance(p) < 2.2 {
                if h.seen <= 0.0 {
                    found.push(h.a);
                }
                h.seen = 8.0;
            }
        }
        for at in found {
            self.cue(cue::SONAR, at, 1.0, 1.5);
            let floats = Float { at, text: "FOUND".into(), rating: 4, on_beat: false, slot: i as u8, age: 0.0 };
            self.floats.push(floats);
        }
    }

    fn iv_tick(&mut self, i: usize, held: bool, rules: &Rules, dt: f32) {
        let s = &self.slots[i];
        let (engaged, dose) = (s.eng == Eng::Iv, s.eng_a);
        if engaged && !held {
            self.release(i);
            self.iv_cd = 4.0;
            if dose >= 0.25 {
                let off = if dose <= 1.0 { 1.0 - dose } else { dose - 1.0 + 0.04 };
                let rating = Rating::grade(off, rules.tune.strictness, 0.08, 0.18, 0.5);
                let at = iv_port();
                self.award(i, at, Tool::Iv, rating, rules);
            }
            return;
        }
        if !held {
            return;
        }
        if !engaged {
            if self.iv_cd > 0.0 {
                return;
            }
            let s = &mut self.slots[i];
            s.eng = Eng::Iv;
            s.eng_a = 0.0;
            s.eng_id = 0;
            self.mark("tool:iv");
            self.cue(cue::IV, iv_port(), 1.0, 1.0);
        }
        let step = dt / 1.2;
        let s = &mut self.slots[i];
        s.eng_a += step;
        let dose = s.eng_a;
        if dose <= 1.0 {
            self.vitals = (self.vitals + 18.0 * rules.tune.iv_heal * step).min(100.0);
        }
        if dose > 1.3 {
            // Overdose: a spike, then the fall.
            self.release(i);
            self.iv_cd = 4.0;
            self.vitals = (self.vitals - 8.0).max(1.0);
            self.mistakes += 1;
            self.shake = self.shake.max(0.4);
            self.call("overdose");
            self.cue(cue::ALARM, iv_port(), 0.7, 1.3);
            self.mark("mistake:overdose");
        }
    }

    // -----------------------------------------------------------------------------------------
    // Finishing things

    /// Scores a rated action: chain, on-beat, gift charge, the big text.
    pub fn award(&mut self, i: usize, at: Vec2, tool: Tool, rating: Rating, rules: &Rules) {
        let beat_window = rules.tune.beat_ms / 1000.0;
        let on_beat = !self.heart.stopped && self.heart.from_r() <= beat_window;
        let chain_up = rating as u8 >= Rating::Clean as u8;
        let s = &mut self.slots[i];
        s.tally[rating as usize] += 1;
        s.since_action = 0.0;
        s.recoil = 1.0;
        if chain_up {
            s.chain += 1;
            s.chain_t = 0.0;
            s.best_chain = s.best_chain.max(s.chain);
        } else if rating == Rating::Sloppy {
            s.chain = 0;
        }
        let mult = match s.chain {
            0..=4 => 1.0,
            5..=9 => 1.25,
            10..=19 => 1.5,
            _ => 2.0,
        };
        let beat = if on_beat { 1.25 } else { 1.0 };
        let pts = rating.points() as f32 * mult * beat * rules.tune.score;
        s.score += pts as i64;
        if on_beat {
            s.on_beats += 1;
        }
        let charge = match rating {
            Rating::Immaculate => 8.0,
            Rating::Clean => 4.0,
            Rating::Good => 1.0,
            Rating::Sloppy => 0.0,
        } + if on_beat { 2.0 } else { 0.0 };
        let shared = self.slots[0].gift_kind == 3;
        let meter = if shared { 0 } else { i };
        if !self.gifts.locked {
            let m = &mut self.slots[meter];
            m.gift = (m.gift + charge * rules.tune.gift_gain).min(100.0);
        }
        // Inside a Hush each on-beat action adds a heartbeat.
        if on_beat && self.gifts.hush > 0.0 {
            self.gifts.hush += 1.0;
        }
        let chain = self.slots[i].chain;
        let cue_id = [cue::RATE_SLOPPY, cue::RATE_GOOD, cue::RATE_CLEAN, cue::RATE_IMMACULATE][rating as usize];
        self.cue(cue_id, at, 1.0, 1.0);
        if on_beat {
            self.cue(cue::ON_BEAT, at, 1.0, 1.0);
            self.mark("on_beat");
        }
        if chain_up && matches!(chain, 5 | 10 | 20) {
            self.cue(cue::CHAIN_UP, at, 1.0, 1.0);
            self.mark("chain");
        }
        self.mark(&format!("rating:{}", rating.name().to_lowercase()));
        self.mark(&format!("rated:{}", tool.key()));
        self.floats.push(Float { at, text: rating.name().into(), rating: rating as u8, on_beat, slot: i as u8, age: 0.0 });
        if self.floats.len() > 8 {
            self.floats.remove(0);
        }
        // The Echo copies each action onto the next target.
        if self.gifts.echo > 0.0 && i != 3 && tool != Tool::Iv && tool != Tool::Defib {
            self.echo_action(tool, rating, rules);
        }
    }

    /// Finishes a stage of a hazard with a rating: points and what it does to the hazard.
    pub fn complete(&mut self, i: usize, id: u32, tool: Tool, rating: Rating, at: Vec2, rules: &Rules) {
        // The hazard goes first: the Echo, inside the award, wants the next target.
        self.apply_done(id, rating, rules);
        self.award(i, at, tool, rating, rules);
    }

    /// The effect of a finished action on its hazard. The Echo and dev tools use it too.
    pub fn apply_done(&mut self, id: u32, rating: Rating, rules: &Rules) {
        let Some(k) = self.find(id) else { return };
        let (kind, stage, a) = {
            let h = &self.hazards[k];
            (h.kind, h.stage, h.a)
        };
        self.mark(&format!("done:{}", kind.key()));
        match kind {
            Kind::Incision | Kind::Closure => {
                let h = self.remove(id).unwrap();
                self.reveal_at = h.b;
                if h.sub == sub::TETHER || h.sub == sub::STROKE {
                    self.strain_stroke_done(rules);
                }
            }
            Kind::Lacer | Kind::Bleeder => {
                let h = self.remove(id).unwrap();
                self.threads.push(Thread { a: h.a, b: h.b, n: h.need });
                if rating == Rating::Sloppy {
                    // Sloppy spacing leaves a slow bleed.
                    self.add(Hazard { kind: Kind::Pool, a: h.a.lerp(h.b, 0.5), r: 0.5, blocking: false, ..Default::default() });
                }
            }
            Kind::Pool => {
                self.remove(id);
            }
            Kind::Object => {
                let h = self.remove(id).unwrap();
                self.flights.push(Flight { from: a, sub: h.sub, kind, t: 0.0 });
                if h.sub == sub::COAL {
                    if let Some(f) = &mut self.fever {
                        *f = (*f - 6.0).max(0.0);
                    }
                }
            }
            Kind::Polyp => {
                self.remove(id);
                self.stains.push(Stain { at: a, r: 0.45, kind: 1 });
                self.cue(cue::SIZZLE, a, 1.0, 1.0);
            }
            Kind::Tumor => {
                if stage >= 2 {
                    self.remove(id);
                } else {
                    let h = &mut self.hazards[k];
                    h.stage += 1;
                    h.prog = 0.0;
                    h.c = Vec2::ZERO;
                    if stage == 1 {
                        self.flights.push(Flight { from: a, sub: 4, kind, t: 0.0 });
                        self.hazards[k].drain = 0.3;
                    }
                }
            }
            Kind::Patch => {
                self.remove(id);
            }
            Kind::Bone => {
                if stage >= 1 {
                    let h = self.remove(id).unwrap();
                    self.threads.push(Thread { a: h.a, b: h.b, n: h.need });
                } else {
                    let h = &mut self.hazards[k];
                    h.stage = 1;
                    h.n = 0;
                    h.prog = 0.0;
                    // The wire runs across the seat of the fragment.
                    let at = h.b;
                    let d = Vec2::new(0.9, 0.0);
                    h.c = at;
                    h.a = at - d;
                    h.b = at + d;
                }
            }
            Kind::Nodule | Kind::Sac | Kind::Eye | Kind::Ember | Kind::Furnace | Kind::Tendril => {
                self.strain_done(id, kind, stage, rating, rules);
            }
        }
    }

    /// A rating as the bot or dev sees it: nothing left to do with this hazard now.
    pub fn resolve_now(&mut self, id: u32, rules: &Rules) {
        self.apply_done(id, Rating::Clean, rules);
    }

    fn gift_tick(&mut self, rules: &Rules, dt: f32) {
        if rules.full_gift && !self.gifts.locked {
            for s in &mut self.slots {
                s.gift = 100.0;
            }
        }
        self.gifts.echo = (self.gifts.echo - dt).max(0.0);
        if self.gifts.hush <= 0.0 {
            self.gifts.hush = 0.0;
        }
        if self.gifts.echo <= 0.0 && self.gifts.hush <= 0.0 {
            self.gifts.duet = false;
        }
        for i in 0..4 {
            if !self.slots[i].active {
                continue;
            }
            let shared = self.slots[0].gift_kind == 3;
            let meter = if shared { 0 } else { i };
            let ready = self.slots[meter].gift >= 100.0 && self.slots[i].gift_kind != 0 && !self.gifts.locked;
            let held = self.slots[i].held & btn::GIFT != 0;
            let was = self.slots[i].arming;
            if held && ready && self.gifts.hush <= 0.0 && self.gifts.echo <= 0.0 {
                self.slots[i].arming = true;
                if !was {
                    self.cue(cue::GIFT_ARM, Vec2::ZERO, 1.0, 1.0);
                }
            } else if !held && was {
                self.slots[i].arming = false;
                // Let go on the heartbeat, or it was only a held breath.
                if self.heart.from_r() <= 0.18 {
                    let kind = self.slots[i].gift_kind;
                    self.fire_gift(i, meter, kind, rules);
                } else {
                    self.cue(cue::CLINK, Vec2::ZERO, 0.5, 0.6);
                }
            } else if !held {
                self.slots[i].arming = false;
            }
        }
    }

    pub fn fire_gift(&mut self, i: usize, meter: usize, kind: u8, rules: &Rules) {
        self.slots[meter].gift = 0.0;
        self.gifts.ripple = 1.0;
        self.flash = 0.5;
        let beats = 6.0;
        let echo = rules.tune.echo_secs * rules.tune.gift_dur;
        match kind {
            1 => {
                self.gifts.hush = beats;
                self.mark("gift:hush");
                self.cue(cue::HUSH, Vec2::ZERO, 1.0, 1.0);
                self.set_banner("THE HUSH");
            }
            2 => {
                self.gifts.echo = echo;
                self.gifts.ghost = self.slots[i].cursor;
                self.mark("gift:echo");
                self.cue(cue::ECHO, Vec2::ZERO, 1.0, 1.0);
                self.set_banner("THE ECHO");
                self.say("pet", "There you are. Thirty years late, and steady as a bell.");
            }
            _ => {
                self.gifts.hush = beats;
                self.gifts.echo = echo;
                self.gifts.duet = true;
                self.mark("gift:duet");
                self.mark("gift:hush");
                self.mark("gift:echo");
                self.cue(cue::DUET, Vec2::ZERO, 1.0, 1.0);
                self.set_banner("THE DUET");
            }
        }
    }

    fn echo_action(&mut self, tool: Tool, rating: Rating, rules: &Rules) {
        // The next valid target for that instrument, nearest the ghost hands.
        let from = self.gifts.ghost;
        let target = self.target_near(tool, from, 40.0, 3);
        let Some(k) = target else { return };
        let id = self.hazards[k].id;
        let at = self.hazards[k].spot();
        self.gifts.ghost = at;
        self.gifts.ghost_t = 1.0;
        self.cue(cue::ECHO, at, 0.5, 1.4);
        self.mark("echo:repeat");
        // Score goes to the player whose hands they are.
        let chain_kept = self.gifts.echo;
        self.gifts.echo = 0.0; // don't echo the echo
        self.complete(0, id, tool, rating, at, rules);
        self.gifts.echo = chain_kept;
    }

    fn ghost_tick(&mut self, _rules: &Rules, dt: f32) {
        self.gifts.ghost_t = (self.gifts.ghost_t - dt * 2.0).max(0.0);
        if self.gifts.echo > 0.0 && self.gifts.ghost_t <= 0.0 {
            // The hands drift back toward where they'd be useful.
            let want = self.slots[0].cursor + Vec2::new(1.2, -0.8);
            let g = &mut self.gifts.ghost;
            *g += (want - *g) * (1.0 - (-dt * 3.0).exp());
        }
    }

    /// Reads strain data the view wants.
    pub fn content(&self) -> std::sync::Arc<Content> {
        content()
    }
}

pub fn plate_id(c: &Content, name: &str) -> u8 {
    c.plate_order.iter().position(|p| p == name).unwrap_or(0) as u8
}

pub fn stitches_for(len: f32) -> u16 {
    ((len / 0.5).round() as u16).max(2)
}

/// Where each ring position's instrument lies on the tray (field coordinates): click targets.
pub fn tray_slot(k: usize) -> Vec2 {
    Vec2::new(-5.95 + k as f32 * 1.7, 5.3)
}

/// The tray's row: a click below this line is on the tray, not the field.
pub const TRAY_Z: f32 = 4.45;

/// Where the IV port is on the field.
pub fn iv_port() -> Vec2 {
    Vec2::new(8.9, 3.0)
}

/// The tools that start by holding the trigger over a target, without a fresh press.
fn tool_is_continuous(t: Tool) -> bool {
    matches!(t, Tool::Suction | Tool::Laser | Tool::Gel | Tool::Scanner | Tool::Iv | Tool::Cryo)
}

fn hit_slop(h: &Hazard) -> f32 {
    match h.kind {
        Kind::Nodule | Kind::Ember | Kind::Tumor => 0.25,
        _ => 0.0,
    }
}

pub fn dist_segment(p: Vec2, a: Vec2, b: Vec2) -> f32 {
    let ab = b - a;
    let t = ((p - a).dot(ab) / ab.length_squared().max(1e-5)).clamp(0.0, 1.0);
    p.distance(a + ab * t)
}

/// A wound's axis, and a point's along-wound and across-wound coordinates.
pub fn wound_frame(h: &Hazard, p: Vec2) -> (Vec2, f32, f32) {
    let ax = (h.b - h.a).normalize_or_zero();
    let d = p - h.a;
    (ax, d.dot(ax), d.perp_dot(ax))
}

/// The nearest point on a path within `[from, from + window]`, and its parameter.
pub fn nearest_on_path(h: &Hazard, from: f32, window: f32, p: Vec2) -> (Vec2, f32) {
    let mut best = (h.path(from), from, f32::MAX);
    for k in 0..=14 {
        let t = (from + window * k as f32 / 14.0).min(1.0);
        let q = h.path(t);
        let d = q.distance_squared(p);
        if d < best.2 {
            best = (q, t, d);
        }
    }
    (best.0, best.1)
}

pub fn angle_diff(a: f32, b: f32) -> f32 {
    let mut d = (a - b) % std::f32::consts::TAU;
    if d > std::f32::consts::PI {
        d -= std::f32::consts::TAU;
    }
    if d < -std::f32::consts::PI {
        d += std::f32::consts::TAU;
    }
    d
}
