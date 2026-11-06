//! The events: each one is plain code over the Balance Core, stepped by sim time, with a bot.
//! A `Run` holds one event in progress. To add an event, add a `Kind`, a `Spec`, and arms in
//! `Run::new`, `step`, `bot`, `hud`, `sprites` and `pose` (see README.md).

use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::core::BalanceCore;
use super::rules::Rules;
use super::ui_model::{Act, Hud, Meter, Prompt, Puck};
use crate::rng::Rng;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Kind {
    Breath,
    Pose,
    Squats,
    Plank,
    Step,
    Floatie,
    Lap,
    Tide,
    Paddle,
    Tray,
    Dive,
    /// The Long Stillness (finale only).
    Still,
}

pub const ALL_KINDS: [Kind; 11] = [
    Kind::Breath,
    Kind::Pose,
    Kind::Squats,
    Kind::Plank,
    Kind::Step,
    Kind::Floatie,
    Kind::Lap,
    Kind::Tide,
    Kind::Paddle,
    Kind::Tray,
    Kind::Dive,
];

/// Static facts about an event.
pub struct Spec {
    pub key: &'static str,
    pub name: &'static str,
    pub set: &'static str,
    pub coach: &'static str,
    pub goal: &'static str,
    pub pavilion: usize,
    /// camera: tilt, yaw, distance, fov
    pub cam: [f32; 4],
    pub puck_top: bool,
    /// Day the event opens.
    pub day: i32,
    pub song: u8,
}

pub fn spec(k: Kind) -> Spec {
    let s = |key, name, set, coach, goal, pavilion, cam, puck_top, day, song| Spec {
        key,
        name,
        set,
        coach,
        goal,
        pavilion,
        cam,
        puck_top,
        day,
        song,
    };
    match k {
        Kind::Breath => s("breath_bloom", "Breath Bloom", "studio", "posey", "Hold to breathe in, release to breathe out. Follow the ring.", 0, [12.0, 0.0, 8.5, 36.0], true, 1, 2),
        Kind::Pose => s("pose_parade", "Pose Parade", "studio", "posey", "Hold each pose. Keep the dot inside the drifting ring.", 0, [12.0, 0.0, 8.5, 36.0], true, 1, 2),
        Kind::Squats => s("tempo_squats", "Tempo Squats", "gazebo", "kettle", "Hold to go down, release to rise. Keep to the tempo and the middle.", 1, [14.0, 25.0, 8.5, 36.0], true, 2, 3),
        Kind::Plank => s("plank_standoff", "Plank Standoff", "gazebo", "kettle", "Hold both steps to brace. Stay in the ring as long as you can.", 1, [10.0, 35.0, 8.5, 36.0], true, 2, 3),
        Kind::Step => s("step_party", "Step Party", "boardwalk", "bounce", "Step left, right or both as the notes land on the footprints.", 2, [18.0, 0.0, 8.0, 38.0], false, 3, 4),
        Kind::Floatie => s("floatie_spin", "Floatie Spin", "boardwalk", "bounce", "Circle the lean to spin the rings. Catch the ones guests throw.", 2, [14.0, 0.0, 8.5, 36.0], true, 3, 4),
        Kind::Lap => s("morning_lap", "Morning Lap", "hub", "bounce", "Alternate left and right steps. Keep a pace inside the zone.", 2, [20.0, 180.0, 9.0, 40.0], true, 3, 4),
        Kind::Tide => s("tide_table", "Tide Table", "tide", "gull", "Tilt the raft. Roll every shell into a tide pool.", 3, [62.0, 0.0, 12.0, 36.0], true, 4, 5),
        Kind::Paddle => s("paddle_slalom", "Paddle Slalom", "channel", "gull", "Steer through the buoy gates. Lean forward for speed.", 3, [22.0, 180.0, 10.0, 40.0], true, 4, 5),
        Kind::Tray => s("tray_trek", "Tray Trek", "pier", "gull", "Walk the pier with the smoothies. Tilt to keep the glasses on.", 3, [20.0, 180.0, 9.0, 40.0], true, 4, 5),
        Kind::Dive => s("cannonball_cup", "Cannonball Cup", "tower", "gull", "Press at the bottom of the bounce. Tuck in the air. Splash big.", 3, [6.0, 0.0, 14.0, 40.0], true, 4, 5),
        Kind::Still => s("long_stillness", "The Long Stillness", "bay", "pip", "Do nothing.", 4, [8.0, 0.0, 9.0, 36.0], true, 5, 0),
    }
}

pub fn kind_by_key(key: &str) -> Option<Kind> {
    ALL_KINDS.iter().copied().chain([Kind::Still]).find(|k| spec(*k).key == key)
}

/// The player's controls this tick, whatever device they came from.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Intent {
    pub lean: Vec2,
    pub act: bool,
    pub act_p: bool,
    pub l: bool,
    pub r: bool,
    pub l_p: bool,
    pub r_p: bool,
    /// Any button pressed at all (the Long Stillness).
    pub any_p: bool,
}

impl Intent {
    pub fn brace(&self) -> bool {
        self.l && self.r
    }
}

/// Things an event wants the game to do: sounds, words, effects.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum Fx {
    Sfx(u16, f32, f32),
    Say(String),
    Splash(f32),
    Confetti,
    Stumble,
    Flop,
    Gull,
    Cheer,
    Tip,
    /// A paddle's wake: a silent dent in the water.
    Wake,
}

/// A thing to draw: the game spawns and moves one entity per key.
#[derive(Clone, Debug, PartialEq)]
pub struct Sprite {
    pub key: u32,
    pub shape: SpriteShape,
    pub pos: Vec3,
    pub color: &'static str,
    pub emissive: f32,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum SpriteShape {
    Ball(f32),
    Disc(f32),
    Box(f32, f32, f32),
}

/// How the player's figure should look this tick.
#[derive(Clone, Debug, PartialEq)]
pub struct Pose {
    pub clip: &'static str,
    /// Scrub the clip to this time (0..1 of its length) instead of playing it.
    pub scrub: Option<f32>,
    /// Tilt of the body in radians: x = toward local +X, y = toward local +Z.
    pub tilt: Vec2,
    pub offset: Vec3,
    pub facing: f32,
    pub flail: bool,
    /// Where the Puck says the figure is in the set (events that move set this).
    pub down: f32,
}

impl Default for Pose {
    fn default() -> Self {
        Pose { clip: "", scrub: None, tilt: Vec2::ZERO, offset: Vec3::ZERO, facing: 0.0, flail: false, down: 0.0 }
    }
}

pub const POSES: [(&str, &str, &str); 6] = [
    ("The Patient Heron", "FIT/Tree", "Be the heron. The heron does not check the score."),
    ("The Apologetic Lunge", "FIT/Warrior", "Lunge as if you are sorry about it."),
    ("The Tired Lighthouse", "FIT/Lighthouse", "Shine. Gently. Nobody is out there."),
    ("The Folded Deck Chair", "FIT/DeckChair", "Fold. Do not creak."),
    ("The Reluctant Bridge", "FIT/Bridge", "Be a bridge. Nobody has asked to cross."),
    ("Seated Disappointment", "FIT/Seated", "Sit. Be disappointed. Quietly."),
];

pub mod sfx {
    pub const UI_MOVE: u16 = 1;
    pub const UI_OK: u16 = 2;
    pub const UI_BACK: u16 = 3;
    pub const STAMP: u16 = 4;
    pub const CLAM: u16 = 5;
    pub const AGE_TICK: u16 = 6;
    pub const STEP: u16 = 7;
    pub const SQUEAK: u16 = 8;
    pub const CREAK: u16 = 9;
    pub const SPLASH_S: u16 = 10;
    pub const SPLASH_B: u16 = 11;
    pub const GULL: u16 = 12;
    pub const MURMUR: u16 = 13;
    pub const CLAP: u16 = 14;
    pub const GONG: u16 = 15;
    pub const BELL: u16 = 16;
    pub const WHOOSH: u16 = 17;
    pub const SHELL: u16 = 18;
    pub const PLOP: u16 = 19;
    pub const GLASS: u16 = 20;
    pub const POP: u16 = 21;
    pub const GUST: u16 = 22;
    pub const CRASH: u16 = 23;
    pub const SEA: u16 = 24;
    pub const TONE: u16 = 25;
    pub const CHIME: u16 = 26;
    pub const KICK: u16 = 27;
    pub const PERFECT: u16 = 28;
    pub const GOOD: u16 = 29;
    pub const MISS: u16 = 30;
    pub const TIP: u16 = 31;
    pub const COUNT: u16 = 32;
    pub const GO: u16 = 33;
    pub const STAR: u16 = 34;
    pub const FLOP: u16 = 35;
    pub const RING: u16 = 36;
    pub const BOUNCE: u16 = 37;
    pub const TICK: u16 = 38;
    pub const STINGER_WIN: u16 = 39;
    pub const STINGER_OK: u16 = 40;
    pub const STINGER_LOW: u16 = 41;
    pub const MAX: u16 = 41;
}
use sfx::*;

fn clamp01(x: f32) -> f32 {
    x.clamp(0.0, 1.0)
}

fn smooth(a: f32, b: f32, x: f32) -> f32 {
    let t = clamp01((x - a) / (b - a));
    t * t * (3.0 - 2.0 * t)
}

// ---------------------------------------------------------------- the Run

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Shell {
    pub p: Vec2,
    pub v: Vec2,
    pub potted: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Glass {
    pub p: Vec2,
    pub v: Vec2,
    pub gone: bool,
    pub delivered: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Note {
    pub t: f32,
    pub lane: u8,
    pub hit: u8,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Run {
    pub kind: Kind,
    pub t: f32,
    /// Seconds the event lasts (or can last).
    pub total: f32,
    pub done: bool,
    pub acc: f32,
    pub norm: f32,
    pub tips: u32,
    pub tip_cool: f32,
    pub inring_t: f32,
    pub line: String,
    pub big: String,
    pub bonus: bool,
    pub no_tip: bool,
    // generic scalars, named per event below
    pub a: f32,
    pub b: f32,
    pub c: f32,
    pub d: f32,
    pub n: i32,
    pub m: i32,
    pub stage: i32,
    pub shells: Vec<Shell>,
    pub glasses: Vec<Glass>,
    pub notes: Vec<Note>,
    pub rings: i32,
    pub fx: Vec<Fx>,
    pub seed_a: f32,
    pub seed_b: f32,
    pub pace_steps: Vec<f32>,
    pub last_step: i8,
    pub pos: Vec2,
    pub scores: Vec<f32>,
    pub judge: Vec<String>,
    pub cards: Vec<String>,
    pub fake: bool,
    pub pressed_still: bool,
    pub pose_first: usize,
    pub prev_lean: Vec2,
    pub ring_cd: Vec<f32>,
    pub finale: bool,
}

const TAU: f32 = std::f32::consts::TAU;

/// Dive stages.
const D_BOUNCE: i32 = 0;
const D_AIR: i32 = 1;
const D_SPLASH: i32 = 2;

impl Run {
    pub fn new(kind: Kind, rules: &Rules, rng: &mut Rng, charts: &[Note]) -> Run {
        let mut r = Run {
            kind,
            t: 0.0,
            total: 45.0,
            done: false,
            acc: 0.0,
            norm: 1.0,
            tips: 0,
            tip_cool: 0.0,
            inring_t: 0.0,
            line: String::new(),
            big: String::new(),
            bonus: true,
            no_tip: false,
            a: 0.0,
            b: 0.0,
            c: 0.0,
            d: 0.0,
            n: 0,
            m: 0,
            stage: 0,
            shells: vec![],
            glasses: vec![],
            notes: vec![],
            rings: 0,
            fx: vec![],
            seed_a: rng.range(0.0, TAU),
            seed_b: rng.range(0.0, TAU),
            pace_steps: vec![],
            last_step: 0,
            pos: Vec2::ZERO,
            scores: vec![],
            judge: vec![],
            cards: vec![],
            fake: false,
            pressed_still: false,
            pose_first: 0,
            prev_lean: Vec2::ZERO,
            ring_cd: vec![],
            finale: false,
        };
        match kind {
            Kind::Breath => {
                let i = rules.breath.inhale;
                r.total = 4.0 * 2.0 * i + 2.0 * (i + 2.0);
            }
            Kind::Pose => r.total = 3.0 * rules.pose.pose_seconds,
            Kind::Squats => r.total = rules.squat.reps as f32 * Self::rep_len(rules) + 1.0,
            Kind::Plank => r.total = rules.plank.max_secs,
            Kind::Step => {
                r.total = rules.step.seconds;
                r.notes = charts.to_vec();
            }
            Kind::Floatie => {
                r.total = rules.floatie.seconds;
                r.rings = 2;
                r.a = 1.0; // required direction
                r.b = 4.0; // next toss
            }
            Kind::Lap => {
                r.total = rules.lap.seconds + 20.0;
                r.pos = Vec2::ZERO;
            }
            Kind::Tide => {
                r.total = rules.tide.seconds;
                r.stage = 0;
                r.begin_board(rng);
            }
            Kind::Paddle => {
                r.total = 120.0;
                r.pos = Vec2::new(0.0, 0.0);
            }
            Kind::Tray => {
                r.total = rules.tray.seconds;
                for i in 0..5 {
                    r.glasses.push(Glass { p: Vec2::new(0.0, (i as f32 - 2.0) * 0.1), v: Vec2::ZERO, gone: false, delivered: false });
                }
            }
            Kind::Dive => {
                r.total = 60.0;
                r.stage = D_BOUNCE;
                r.scores.clear();
            }
            Kind::Still => r.total = rules.stand.stillness,
        }
        r
    }

    pub fn rep_len(rules: &Rules) -> f32 {
        rules.squat.down_secs + 0.4 + rules.squat.up_secs + 1.2
    }

    // ------------------------------------------------------------ guides

    /// Breath guide 0..1 at time `t`, and the cycle index.
    pub fn breath_guide(rules: &Rules, t: f32) -> (f32, usize, bool) {
        let i = rules.breath.inhale;
        let mut s = 0.0;
        for c in 0..5 {
            let len = if c == 4 { i + 2.0 } else { i };
            if t < s + len {
                return (smooth(0.0, 1.0, (t - s) / len), c, true);
            }
            s += len;
            if t < s + len {
                return (1.0 - smooth(0.0, 1.0, (t - s) / len), c, false);
            }
            s += len;
        }
        (0.0, 5, false)
    }

    /// Squat guide 0..1 at time `t` within a rep.
    pub fn squat_guide(rules: &Rules, tr: f32) -> f32 {
        let d = rules.squat.down_secs;
        let u = rules.squat.up_secs;
        if tr < d {
            smooth(0.0, 1.0, tr / d)
        } else if tr < d + 0.4 {
            1.0
        } else if tr < d + 0.4 + u {
            1.0 - smooth(0.0, 1.0, (tr - d - 0.4) / u)
        } else {
            0.0
        }
    }

    /// The Pose Parade ring: centre and radius at time `t`.
    pub fn pose_ring(&self, rules: &Rules, t: f32) -> (Vec2, f32) {
        let r = &rules.pose;
        let ph = (t / r.pose_seconds).floor();
        let local = t - ph * r.pose_seconds;
        let rad = r.ring_start + (r.ring_end - r.ring_start) * clamp01(local / r.pose_seconds);
        let w = TAU * r.drift_hz;
        let c = Vec2::new((w * t + self.seed_a).sin(), (w * 1.37 * t + self.seed_b).sin()) * r.drift_amp;
        (c, rad)
    }

    pub fn plank_ring(&self, rules: &Rules) -> f32 {
        let p = &rules.plank;
        p.ring_start + (p.ring_end - p.ring_start) * clamp01(self.t / p.max_secs)
    }

    // ------------------------------------------------------------ tide boards

    fn begin_board(&mut self, rng: &mut Rng) {
        let n = [3, 5, 7][self.stage.clamp(0, 2) as usize];
        self.shells.clear();
        for i in 0..n {
            let a = rng.range(0.0, TAU);
            let r = rng.range(0.15, 0.55);
            let _ = i;
            self.shells.push(Shell { p: Vec2::new(a.cos() * r, a.sin() * r) - Vec2::new(0.0, 0.2), v: Vec2::ZERO, potted: false });
        }
        self.a = 0.0; // pool phase
        self.b = 0.0; // tide level
    }

    /// Pools of the current board: centre and radius.
    pub fn pools(&self) -> Vec<(Vec2, f32)> {
        match self.stage {
            0 => vec![(Vec2::new(0.55, 0.45), 0.24)],
            1 => vec![(Vec2::new(-0.6, 0.5), 0.22), (Vec2::new(0.45 * (self.t * 0.7).sin(), -0.62), 0.22)],
            _ => vec![(Vec2::new(-0.55, 0.0), 0.2), (Vec2::new(0.55, 0.1), 0.2), (Vec2::new(0.0, 0.6 * (self.t * 0.9).sin()), 0.2)],
        }
    }

    // ------------------------------------------------------------ the step

    pub fn step(&mut self, c: &mut BalanceCore, rules: &Rules, rng: &mut Rng, it: &Intent, song: Option<f32>, dt: f32) {
        if self.done {
            return;
        }
        self.t += dt;
        self.tip_cool = (self.tip_cool - dt).max(0.0);
        match self.kind {
            Kind::Breath => self.step_breath(c, rules, rng, it, dt),
            Kind::Pose => self.step_pose(c, rules, rng, it, dt),
            Kind::Squats => self.step_squats(c, rules, rng, it, dt),
            Kind::Plank => self.step_plank(c, rules, rng, it, dt),
            Kind::Step => self.step_step(c, rules, rng, it, song, dt),
            Kind::Floatie => self.step_floatie(c, rules, rng, it, dt),
            Kind::Lap => self.step_lap(c, rules, rng, it, dt),
            Kind::Tide => self.step_tide(c, rules, rng, it, dt),
            Kind::Paddle => self.step_paddle(c, rules, rng, it, dt),
            Kind::Tray => self.step_tray(c, rules, rng, it, dt),
            Kind::Dive => self.step_dive(c, rules, rng, it, dt),
            Kind::Still => self.step_still(c, rules, rng, it, dt),
        }
        if self.t >= self.total && !self.done && !matches!(self.kind, Kind::Plank | Kind::Paddle | Kind::Dive | Kind::Lap) {
            self.done = true;
        }
    }

    fn core_step(&mut self, c: &mut BalanceCore, rules: &Rules, rng: &mut Rng, lean: Vec2, nudge: Vec2, dt: f32) -> bool {
        let tip = c.step(&rules.core, lean, nudge, dt, rng);
        let tip = tip && !self.no_tip;
        if tip {
            self.tips += 1;
            self.tip_cool = self.tip_cool.max(0.9);
            self.fx.push(Fx::Tip);
            self.fx.push(Fx::Sfx(TIP, 0.8, 1.0));
        }
        if self.no_tip && c.cob.length() > 1.0 {
            c.cob = c.cob.normalize() * 1.0;
            c.vel *= 0.5;
        }
        tip
    }

    fn step_breath(&mut self, c: &mut BalanceCore, rules: &Rules, rng: &mut Rng, it: &Intent, dt: f32) {
        c.wobble_scale = rules.breath.wobble;
        self.core_step(c, rules, rng, it.lean * 0.6, Vec2::ZERO, dt);
        let i = rules.breath.inhale;
        // lungs: self.a
        self.a = clamp01(self.a + if it.act { dt / i } else { -dt / i });
        let (g, cyc, _) = Self::breath_guide(rules, self.t);
        let err = (self.a - g).abs();
        let tick = 0.7 * (1.0 - clamp01(err / 0.35)) + 0.3 * if c.cob.length() < rules.breath.ring { 1.0 } else { 0.0 };
        self.acc += tick * dt;
        self.b += tick * dt; // this cycle's accumulated
        self.c += dt;
        if cyc as i32 != self.n {
            // a cycle ended
            let mean = self.b / self.c.max(0.1);
            if mean > 0.7 {
                self.m += 1;
                self.fx.push(Fx::Sfx(CHIME, 0.7, 1.0 + 0.2 * self.m as f32));
            } else {
                self.bonus = false;
            }
            self.b = 0.0;
            self.c = 0.0;
            self.n = cyc as i32;
        }
        if self.t >= self.total {
            if self.m >= 5 {
                self.fx.push(Fx::Confetti);
            }
            self.done = true;
        }
        self.norm = self.acc / self.total.max(1.0);
    }

    fn step_pose(&mut self, c: &mut BalanceCore, rules: &Rules, rng: &mut Rng, it: &Intent, dt: f32) {
        let p = &rules.pose;
        let ph = ((self.t / p.pose_seconds).floor() as i32).clamp(0, 2);
        let local = self.t - ph as f32 * p.pose_seconds;
        if ph != self.stage {
            self.stage = ph;
            self.inring_t = 0.0;
            self.fx.push(Fx::Sfx(GONG, 0.6, 1.0));
        }
        let gull = ph == 1 && local >= 12.0 && local < 17.0;
        if ph == 1 && local >= 12.0 && local - dt < 12.0 {
            self.fx.push(Fx::Gull);
            self.fx.push(Fx::Say("There is a bird on you. Accept the bird.".into()));
        }
        c.wobble_scale = p.wobble * if gull { p.gull_wobble } else { 1.0 };
        if self.tip_cool > 0.0 {
            c.cob *= 0.9;
        }
        if self.core_step(c, rules, rng, it.lean, Vec2::ZERO, dt) {
            self.tip_cool = 1.5;
            self.inring_t = 0.0;
        }
        let (centre, rad) = self.pose_ring(rules, self.t);
        let inside = self.tip_cool <= 0.0 && (c.cob - centre).length() < rad;
        if inside {
            let before = (self.inring_t / p.step_secs).floor();
            self.inring_t += dt;
            let mult = (1.0 + (self.inring_t / p.step_secs).floor()).min(4.0);
            if (self.inring_t / p.step_secs).floor() > before && mult <= 4.0 {
                self.fx.push(Fx::Sfx(CHIME, 0.4, 0.8 + 0.15 * mult));
            }
            self.acc += mult * dt;
        } else {
            self.inring_t = 0.0;
        }
        self.d = (1.0 + (self.inring_t / p.step_secs).floor()).min(4.0);
        self.norm = self.acc / 180.0;
        self.big = POSES[ph as usize + self.pose_first].0.to_string();
        if self.t >= self.total {
            self.done = true;
        }
    }

    fn step_squats(&mut self, c: &mut BalanceCore, rules: &Rules, rng: &mut Rng, it: &Intent, dt: f32) {
        let s = &rules.squat;
        let rl = Self::rep_len(rules);
        let rep = ((self.t / rl).floor() as i32).min(s.reps);
        c.wobble_scale = 0.9 * (1.0 + s.growth * rep as f32);
        let lean = Vec2::new(it.lean.x, 0.0);
        self.core_step(c, rules, rng, lean, Vec2::ZERO, dt);
        // depth: self.a
        let before = self.a;
        self.a = clamp01(self.a + if it.act { dt / s.down_secs } else { -dt / s.up_secs });
        if before < 0.97 && self.a >= 0.97 {
            self.fx.push(Fx::Sfx(BELL, 0.8, 0.7));
        }
        let tr = self.t - rep.min(s.reps - 1) as f32 * rl;
        if rep < s.reps {
            let g = Self::squat_guide(rules, tr);
            self.b += (1.0 - clamp01((self.a - g).abs() / 0.3)) * dt;
            self.c += if c.cob.x.abs() < s.band { dt } else { 0.0 };
            self.d += dt;
            if rep != self.n {
                let timing = self.b / self.d.max(0.1);
                let band = self.c / self.d.max(0.1);
                let sc = 0.7 * timing + 0.3 * band;
                self.scores.push(sc);
                self.b = 0.0;
                self.c = 0.0;
                self.d = 0.0;
                self.n = rep;
                self.fx.push(Fx::Sfx(CHIME, 0.5, 0.8 + sc));
                if rep == s.reps {
                    self.fx.push(Fx::Say("Ten. Also eleven.".into()));
                }
            }
        }
        self.norm = if self.scores.is_empty() { 0.0 } else { self.scores.iter().sum::<f32>() / s.reps as f32 };
        if rep >= s.reps && self.t >= s.reps as f32 * rl {
            self.done = true;
        }
    }

    fn step_plank(&mut self, c: &mut BalanceCore, rules: &Rules, rng: &mut Rng, it: &Intent, dt: f32) {
        let p = &rules.plank;
        let fat = 1.0 + p.fatigue * (self.t / 30.0);
        c.wobble_scale = 0.8 * fat;
        let mut nudge = Vec2::ZERO;
        if self.t > 30.0 {
            nudge += Vec2::new((self.t * 31.0).sin(), (self.t * 27.0).cos()) * 3.0 * ((self.t - 30.0) / 30.0).min(1.0);
        }
        if self.t > 45.0 && ((self.t * 2.0) as i32) % 4 == 0 && ((self.t - dt) * 2.0) as i32 != (self.t * 2.0) as i32 {
            self.fx.push(Fx::Say("Kettle laughs at his own joke.".into()));
        }
        self.core_step(c, rules, rng, it.lean, nudge, dt);
        let ring = self.plank_ring(rules);
        if c.cob.length() > ring {
            self.a += dt;
        } else {
            self.a = (self.a - dt).max(0.0);
        }
        if !it.brace() && self.t > 0.5 {
            self.collapse();
        } else if self.a > p.leave_secs {
            self.collapse();
        }
        if self.t >= self.total {
            self.done = true;
        }
        self.norm = (self.t * 16.25 / 1000.0).min(1.0);
    }

    fn collapse(&mut self) {
        self.fx.push(Fx::Flop);
        self.fx.push(Fx::Sfx(FLOP, 0.9, 1.0));
        self.done = true;
    }

    fn step_step(&mut self, c: &mut BalanceCore, rules: &Rules, rng: &mut Rng, it: &Intent, song: Option<f32>, dt: f32) {
        c.wobble_scale = 0.5;
        self.core_step(c, rules, rng, Vec2::ZERO, Vec2::ZERO, dt);
        let now = song.unwrap_or(self.t) - 2.5; // four beats of lead-in
        self.pos.x = now;
        let st = &rules.step;
        let perfect = st.perfect_ms / 1000.0;
        let good = st.good_ms / 1000.0;
        // Presses: left, right. Both at once counts for a "both" note.
        let press = [it.l_p, it.r_p];
        for lane in 0..2u8 {
            if !press[lane as usize] {
                continue;
            }
            // nearest unhit note that wants this lane (lane 0 left, 1 right, 2 both)
            let mut best: Option<(usize, f32)> = None;
            for (i, n) in self.notes.iter().enumerate() {
                if n.hit != 0 || (n.lane != lane && n.lane != 2) {
                    continue;
                }
                let d = (n.t - now).abs();
                if d <= good && best.map(|b| d < b.1).unwrap_or(true) {
                    best = Some((i, d));
                }
            }
            if let Some((i, d)) = best {
                let both = self.notes[i].lane == 2;
                if both {
                    // wait for the other half: mark half hit
                    let half = &mut self.notes[i];
                    half.hit = if half.hit == 0 { 10 } else { half.hit };
                }
                let grade = if d <= perfect { 1 } else { 2 };
                if !both {
                    self.notes[i].hit = grade;
                    self.settle(grade);
                } else if self.pace_steps.iter().any(|t| (*t - now).abs() < good && self.last_step != lane as i8) {
                    self.notes[i].hit = grade;
                    self.settle(grade);
                }
                self.pace_steps.push(now);
                self.last_step = lane as i8;
                self.pace_steps.retain(|t| now - *t < 0.15);
            } else {
                self.fx.push(Fx::Sfx(MISS, 0.3, 1.0));
            }
        }
        // misses
        for n in self.notes.iter_mut() {
            if (n.hit == 0 || n.hit == 10) && n.t < now - good {
                n.hit = 3;
                self.n += 1; // miss
                self.m = 0;
                self.fx.push(Fx::Sfx(MISS, 0.3, 0.7));
            }
        }
        let total = self.notes.len() as f32;
        self.norm = self.acc / total.max(1.0);
        if now > self.notes.last().map(|n| n.t).unwrap_or(0.0) + 1.5 {
            self.done = true;
        }
    }

    fn settle(&mut self, grade: u8) {
        self.m += 1;
        if grade == 1 {
            self.acc += 1.0;
            self.fx.push(Fx::Sfx(PERFECT, 0.7, 1.0));
        } else {
            self.acc += 0.6;
            self.fx.push(Fx::Sfx(GOOD, 0.6, 1.0));
        }
        self.line = if grade == 1 { "Perfect".into() } else { "Good".into() };
    }

    fn step_floatie(&mut self, c: &mut BalanceCore, rules: &Rules, rng: &mut Rng, it: &Intent, dt: f32) {
        let f = &rules.floatie;
        c.wobble_scale = 0.3;
        self.core_step(c, rules, rng, it.lean * 0.9, Vec2::ZERO, dt);
        // angular velocity of the lean, smoothed
        let l = it.lean;
        if l.length() > 0.4 && self.prev_lean.length() > 0.4 {
            let a0 = self.prev_lean.y.atan2(self.prev_lean.x);
            let a1 = l.y.atan2(l.x);
            let mut d = a1 - a0;
            while d > std::f32::consts::PI {
                d -= TAU;
            }
            while d < -std::f32::consts::PI {
                d += TAU;
            }
            let w = d / dt;
            self.b += (w - self.b) * (1.0 - (-8.0 * dt).exp());
        } else {
            self.b *= (-6.0 * dt).exp();
        }
        self.prev_lean = l;
        let w = self.b * self.a; // signed by the required direction
        let scale = f.spin_band_scale;
        let mid = (f.band_lo + f.band_hi) * 0.5;
        let half = (f.band_hi - f.band_lo) * 0.5 * scale;
        let inband = w > mid - half && w < mid + half;
        if self.t >= 0.0 && (self.t % f.switch_secs) < dt && self.t > 1.0 {
            self.a = -self.a;
            self.fx.push(Fx::Say("Switch!".into()));
            self.big = "Switch!".into();
            self.c = 1.5;
        }
        self.c = (self.c - dt).max(0.0);
        if self.c <= 0.0 {
            self.big.clear();
        }
        if inband {
            self.acc += self.rings as f32 * dt;
            self.d = 0.0;
        } else {
            self.d += dt;
            if self.d > 2.5 && self.rings > 0 {
                self.rings -= 1;
                self.d = 1.0;
                self.fx.push(Fx::Sfx(PLOP, 0.5, 1.2));
            }
        }
        // the guide spinner the bot (and a hint ring) follows
        self.pos.x += self.a * mid * dt;
        // guests toss rings: `ring_cd` holds seconds until each arrives (negative = late)
        for x in self.ring_cd.iter_mut() {
            *x -= dt;
        }
        self.ring_cd.retain(|x| *x > -f.catch_window);
        self.seed_b -= dt;
        if self.seed_b <= 0.0 && self.t < f.seconds - 4.0 {
            self.seed_b = 5.0 + rng.range(0.0, 1.5);
            self.ring_cd.push(0.9);
            self.fx.push(Fx::Sfx(WHOOSH, 0.5, 1.0));
        }
        if (it.l_p || it.r_p) && !self.ring_cd.is_empty() {
            let caught = self.ring_cd.iter().position(|x| x.abs() <= f.catch_window);
            if let Some(i) = caught {
                self.ring_cd.remove(i);
                if self.rings < 7 {
                    self.rings += 1;
                }
                self.fx.push(Fx::Sfx(RING, 0.7, 1.0));
            }
        }
        self.norm = self.acc / 150.0;
        if self.t >= f.seconds {
            self.done = true;
        }
    }

    fn step_lap(&mut self, c: &mut BalanceCore, rules: &Rules, rng: &mut Rng, it: &Intent, dt: f32) {
        let l = &rules.lap;
        c.wobble_scale = 0.4;
        let stumble = self.c > 0.0;
        self.c = (self.c - dt).max(0.0);
        self.core_step(c, rules, rng, it.lean, Vec2::ZERO, dt);
        let now = self.t;
        for (side, p) in [(-1i8, it.l_p), (1i8, it.r_p)] {
            if p && self.last_step != side {
                self.pace_steps.push(now);
                self.last_step = side;
                self.fx.push(Fx::Sfx(STEP, 0.4, 1.0));
            }
        }
        self.pace_steps.retain(|t| now - *t <= 2.0);
        let pace = if self.t < 2.0 { self.pace_steps.len() as f32 / self.t.max(0.5) } else { self.pace_steps.len() as f32 / 2.0 };
        self.d = pace;
        let in_zone = pace >= l.zone_lo && pace <= l.zone_hi;
        if pace > l.zone_hi {
            self.b = (self.b + l.stitch_rate * (pace - l.zone_hi) * dt).min(1.0);
        } else {
            self.b = (self.b - 0.25 * dt).max(0.0);
        }
        if self.b >= 1.0 && !stumble {
            self.c = 1.5;
            self.b = 0.4;
            self.fx.push(Fx::Stumble);
            self.m += 1;
        }
        let speed = if stumble { 0.0 } else { pace * 0.62 };
        self.pos.y += speed * dt; // distance along the lap
        // lateral
        let lat = (self.pos.x + (it.lean.x * 1.2 - self.pos.x) * (1.0 - (-6.0 * dt).exp())).clamp(-1.2, 1.2); // + is screen right
        self.pos.x = lat;
        if in_zone {
            self.acc += dt;
        }
        // ribbons every 14 m at lateral offsets; obstacles every 17 m
        let dist = self.pos.y;
        let ribbon = ((dist / 14.0).floor() as i32).max(0);
        if ribbon > self.n && dist - ribbon as f32 * 14.0 < 0.4 {
            self.n = ribbon;
            let off = Self::ribbon_off(ribbon);
            if (off - lat).abs() < 0.5 {
                self.a += 1.0;
                self.fx.push(Fx::Sfx(CHIME, 0.6, 1.4));
            }
        }
        let obs = (((dist - 7.0) / 17.0).floor() as i32).max(-1);
        if obs > self.stage && (dist - 7.0) - obs as f32 * 17.0 < 0.4 {
            self.stage = obs;
            let off = Self::obstacle_off(obs);
            if (off - lat).abs() < 0.55 {
                self.tips += 1;
                self.c = 1.0;
                self.fx.push(Fx::Stumble);
            }
        }
        let lap_len = Self::lap_len(rules);
        // Bounce the pacer rolls ahead at fixed speed; too far behind ends the lap early
        self.pos.x = lat;
        self.norm = (self.acc / (l.seconds * 0.8)) * 0.7 + (self.a / 6.0).min(1.0) * 0.2 + 0.1 * (self.acc / (l.seconds * 0.8)).min(1.0) - (self.tips as f32) * 0.03;
        if dist >= lap_len || self.t >= self.total {
            self.done = true;
        }
    }

    pub fn lap_len(rules: &Rules) -> f32 {
        rules.lap.seconds * 2.0 * 0.62 * 0.95
    }

    pub fn ribbon_off(i: i32) -> f32 {
        [0.8, -0.8, 0.0, 1.0, -1.0, 0.5, -0.4, 0.9][(i.rem_euclid(8)) as usize]
    }

    pub fn obstacle_off(i: i32) -> f32 {
        [-0.9, 0.9, 0.0, -0.3, 0.7][(i.rem_euclid(5)) as usize]
    }

    fn step_tide(&mut self, c: &mut BalanceCore, rules: &Rules, rng: &mut Rng, it: &Intent, dt: f32) {
        let tr = &rules.tide;
        c.wobble_scale = 0.4;
        self.core_step(c, rules, rng, it.lean, Vec2::ZERO, dt);
        let tilt = c.cob;
        let pools = self.pools();
        let mut potted_now = 0;
        for s in self.shells.iter_mut().filter(|s| !s.potted) {
            let a = tilt * tr.gravity - s.v * tr.friction;
            s.v += a * dt;
            s.p += s.v * dt;
            let lim = 0.97;
            if s.p.x.abs() > lim {
                s.p.x = s.p.x.signum() * lim;
                s.v.x *= -0.5;
            }
            if s.p.y.abs() > lim {
                s.p.y = s.p.y.signum() * lim;
                s.v.y *= -0.5;
            }
            for (pc, pr) in &pools {
                if (s.p - *pc).length() < *pr * 0.85 && s.v.length() < 1.6 {
                    s.potted = true;
                    potted_now += 1;
                    break;
                }
            }
            if s.v.length() > 0.2 {
                self.a += s.v.length() * dt;
            }
        }
        // bumpers on board 3 are the raft's walls; rising tide scales gravity slightly
        for _ in 0..potted_now {
            self.m += 1;
            self.fx.push(Fx::Sfx(PLOP, 0.7, 1.0 + 0.05 * self.m as f32));
        }
        if self.shells.iter().all(|s| s.potted) {
            self.fx.push(Fx::Sfx(CHIME, 0.7, 1.2));
            self.stage += 1;
            if self.stage >= 3 {
                self.done = true;
            } else {
                self.begin_board(rng);
            }
        }
        let total_shells = 15.0;
        let left = (self.total - self.t).max(0.0) / self.total;
        self.norm = (self.m as f32 / total_shells) * 0.85 + if self.stage >= 3 { left * 0.15 } else { 0.0 };
        if self.t >= self.total {
            self.done = true;
        }
    }

    fn step_paddle(&mut self, c: &mut BalanceCore, rules: &Rules, rng: &mut Rng, it: &Intent, dt: f32) {
        let p = &rules.paddle;
        c.wobble_scale = 0.6;
        // gusts: ripple streaks push the dot
        let g = ((self.t * 0.6 + self.seed_a).sin() * (self.t * 1.7).cos()) * p.gust;
        c.gust = Vec2::new(g * 9.0, 0.0);
        let remount = self.c > 0.0;
        self.c = (self.c - dt).max(0.0);
        let tip = self.core_step(c, rules, rng, it.lean, Vec2::ZERO, dt);
        if tip && !remount {
            self.c = 2.0;
            self.tips += 1;
            self.fx.push(Fx::Splash(1.0));
            c.reset();
        }
        let fwd = it.lean.y.clamp(-1.0, 1.0);
        let speed = if remount { 0.0 } else { p.speed * (1.0 + 0.55 * fwd.max(0.0) - 0.6 * (-fwd).max(0.0)) };
        self.pos.y += speed * dt;
        if !remount {
            self.pos.x -= (c.cob.x * 3.0) * dt;
        }
        self.pos.x = self.pos.x.clamp(-5.5, 5.5);
        // gates every 12 m
        let n = Self::gate_count();
        let next = self.n;
        if next < n {
            let gz = Self::gate_z(next);
            if self.pos.y >= gz {
                let gx = Self::gate_x(next);
                if (self.pos.x - gx).abs() <= 1.6 {
                    self.fx.push(Fx::Sfx(CHIME, 0.6, 1.0 + 0.04 * next as f32));
                } else {
                    self.d += p.gate_penalty;
                    self.fx.push(Fx::Sfx(MISS, 0.5, 0.6));
                    self.line = "Gate missed".into();
                }
                self.n += 1;
            }
        }
        if self.pos.y >= Self::course_len() {
            self.done = true;
        }
        let tt = self.t + self.d;
        self.norm = clamp01((1.6 * p.par - tt) / (0.8 * p.par));
        if self.t > 100.0 {
            self.done = true;
        }
        if self.t % 0.2 < dt && !remount {
            self.fx.push(Fx::Wake);
        }
    }

    pub fn gate_count() -> i32 {
        10
    }
    pub fn gate_z(i: i32) -> f32 {
        14.0 + i as f32 * 11.0
    }
    pub fn gate_x(i: i32) -> f32 {
        [0.0, 2.6, -2.6, 1.2, -3.2, 3.2, 0.0, -1.8, 2.2, -0.6][(i.rem_euclid(10)) as usize]
    }
    pub fn course_len() -> f32 {
        14.0 + 10.0 * 11.0 + 6.0
    }

    /// Scheduled jolts on the pier: (time, strength vector, name).
    pub fn jolts() -> [(f32, Vec2, &'static str); 8] {
        [
            (6.0, Vec2::new(14.0, 0.0), "Wave"),
            (11.0, Vec2::new(0.0, -13.0), "Plank gap"),
            (17.0, Vec2::new(-15.0, 3.0), "Gull"),
            (23.0, Vec2::new(13.0, 5.0), "Wave"),
            (29.0, Vec2::new(0.0, 12.0), "Plank gap"),
            (35.0, Vec2::new(16.0, -4.0), "Gull"),
            (41.0, Vec2::new(-14.0, 0.0), "Wave"),
            (46.0, Vec2::new(10.0, 8.0), "Gull"),
        ]
    }

    fn step_tray(&mut self, c: &mut BalanceCore, rules: &Rules, rng: &mut Rng, it: &Intent, dt: f32) {
        let tr = &rules.tray;
        c.wobble_scale = 0.6;
        let mut nudge = Vec2::ZERO;
        for (t0, v, name) in Self::jolts() {
            if self.t >= t0 && self.t - dt < t0 {
                nudge = v * tr.jolt / dt * 0.02;
                self.fx.push(Fx::Say(format!("{name}!")));
                self.fx.push(Fx::Sfx(if name == "Gull" { GULL } else { SPLASH_S }, 0.5, 1.0));
            }
        }
        // jolts act as a short shove on the dot
        if nudge != Vec2::ZERO {
            c.vel += nudge * dt * 20.0;
        }
        self.core_step(c, rules, rng, it.lean, Vec2::ZERO, dt);
        let tilt = c.cob;
        for g in self.glasses.iter_mut().filter(|g| !g.gone && !g.delivered) {
            g.v += (tilt * 2.2 * tr.slide - g.v * 0.5) * dt;
            g.p += g.v * dt;
            if g.p.length() > 1.0 {
                g.gone = true;
                self.n += 1;
                self.bonus = false;
                self.fx.push(Fx::Sfx(GLASS, 0.7, 1.0));
                self.fx.push(Fx::Splash(0.3));
            }
        }
        self.pos.y += 3.2 * dt;
        if self.t >= self.total {
            for g in self.glasses.iter_mut().filter(|g| !g.gone) {
                g.delivered = true;
            }
            self.done = true;
        }
        let ok = self.glasses.iter().filter(|g| !g.gone).count() as f32;
        self.norm = (ok * 160.0 + if self.bonus { 200.0 } else { 0.0 }) / 1000.0;
        if self.done {
            self.fx.push(Fx::Cheer);
        }
    }

    pub fn dive_bottom(&self, rules: &Rules) -> f32 {
        // time of the next bounce bottom
        let p = rules.dive.period;
        (self.a / p).ceil() * p
    }

    fn step_dive(&mut self, c: &mut BalanceCore, rules: &Rules, rng: &mut Rng, it: &Intent, dt: f32) {
        let d = &rules.dive;
        c.wobble_scale = 0.3;
        self.core_step(c, rules, rng, it.lean * 0.5, Vec2::ZERO, dt);
        match self.stage {
            D_BOUNCE => {
                self.a += dt; // bounce clock
                let p = d.period;
                let ph = (self.a % p) / p; // 0 at bottom
                if it.act_p {
                    // nearest bottom
                    let to_bottom = (self.a - (self.a / p).round() * p).abs();
                    if self.b < 3.0 {
                        if to_bottom <= 0.14 {
                            self.b += 1.0;
                            self.fx.push(Fx::Sfx(BOUNCE, 0.8, 1.0 + 0.1 * self.b));
                        } else {
                            self.b = (self.b - 1.0).max(0.0);
                            self.fx.push(Fx::Sfx(MISS, 0.4, 0.8));
                        }
                    } else if to_bottom <= 0.18 {
                        // the leap
                        self.stage = D_AIR;
                        self.c = 0.0; // air time
                        self.d = 0.0; // tuck
                        self.pos = Vec2::new(0.0, 0.0);
                        self.n = 0;
                        self.fx.push(Fx::Sfx(BOUNCE, 1.0, 1.6));
                        self.pos.y = to_bottom; // timing error
                    } else {
                        self.fx.push(Fx::Sfx(MISS, 0.4, 0.8));
                    }
                }
                let _ = ph;
            }
            D_AIR => {
                self.c += dt;
                let power = (self.b / 3.0) * d.gain;
                let h_peak = 2.0 + 4.0 * power;
                let t_flight = 2.0 * (2.0 * h_peak / 9.8f32).sqrt() * 0.9 + 0.2;
                let u = self.c / t_flight;
                let h = 4.0 * h_peak * u * (1.0 - u); // parabola, peak at u=.5
                self.pos.x = h; // height
                if it.act {
                    self.d = (self.d + dt * 2.0).min(1.0);
                } else {
                    self.d = (self.d - dt * 1.0).max(0.0);
                }
                // flips with lean
                self.pos.y += it.lean.y * dt * 6.0;
                if u >= 1.0 {
                    self.stage = D_SPLASH;
                    self.a = 0.0;
                    // score this dive
                    let height = clamp01(h_peak / 6.0);
                    let tuck = self.d;
                    let timing = 1.0 - clamp01(self.pos.y.abs() / 0.18) * 0.5;
                    let sc = (0.4 * height + 0.4 * tuck + 0.2 * timing).clamp(0.0, 1.0);
                    self.scores.push(sc);
                    let card = if sc > 0.8 { "9.5" } else if sc > 0.6 { "7" } else if sc > 0.4 { "6.5" } else { "See me" };
                    self.cards.push(card.into());
                    self.fx.push(Fx::Splash(0.3 + 1.3 * sc));
                    self.c = 0.0;
                    self.line = "We are not here for form. We are here for splash.".into();
                }
            }
            _ => {
                self.c += dt;
                if self.c > 3.0 {
                    if self.scores.len() >= 3 {
                        self.done = true;
                    } else {
                        self.stage = D_BOUNCE;
                        self.a = 0.0;
                        self.b = 0.0;
                        self.line.clear();
                    }
                }
            }
        }
        self.norm = if self.scores.is_empty() { 0.0 } else { self.scores.iter().sum::<f32>() / 3.0 };
        if self.t > 100.0 {
            self.done = true;
        }
    }

    fn step_still(&mut self, c: &mut BalanceCore, rules: &Rules, rng: &mut Rng, it: &Intent, dt: f32) {
        c.wobble_scale = 0.35;
        self.core_step(c, rules, rng, Vec2::ZERO, Vec2::ZERO, dt);
        if self.t >= 15.0 && self.t - dt < 15.0 {
            self.fake = true;
        }
        if (it.any_p || it.act_p) && self.t > 0.5 {
            self.pressed_still = true;
            self.fake = false;
        }
        if self.pressed_still {
            self.bonus = false;
        }
        self.acc += (1.0 - clamp01(c.cob.length() / 0.4)) * dt;
        self.norm = (self.acc / self.total) * 0.7 + if self.bonus { 0.3 } else { 0.0 };
        if self.t >= self.total {
            self.fake = false;
            self.done = true;
        }
    }

    // ------------------------------------------------------------ scoring

    /// The score 0..1000 so far (final once `done`).
    pub fn score(&self, rules: &Rules) -> i32 {
        let v = match self.kind {
            Kind::Breath => (self.acc / self.total.max(1.0) - 0.42) / 0.5 + if self.m >= 5 { 0.05 } else { 0.0 },
            Kind::Pose => self.acc / 150.0,
            Kind::Squats => (self.norm - 0.45) / 0.5,
            Kind::Plank => self.t * 16.25 / 1000.0,
            Kind::Step => self.acc / self.notes.len().max(1) as f32,
            Kind::Floatie => self.acc / 150.0,
            Kind::Lap => self.norm,
            Kind::Tide => self.norm,
            Kind::Paddle => self.norm,
            Kind::Tray => self.norm,
            Kind::Dive => self.norm * 1.1,
            Kind::Still => self.norm,
        };
        let _ = rules;
        (clamp01(v) * 1000.0).round() as i32
    }

    pub fn stars_for(score: i32) -> u8 {
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

    // ------------------------------------------------------------ pose, sprites, HUD

    pub fn pose(&self, c: &BalanceCore, rules: &Rules) -> Pose {
        let mut p = Pose::default();
        p.tilt = Vec2::new(c.cob.x, -c.cob.y) * 0.24;
        if matches!(self.kind, Kind::Paddle | Kind::Tray | Kind::Lap) {
            p.tilt.x = -p.tilt.x; // the figure faces away from the camera
        }
        p.flail = c.cob.length() > 0.75;
        match self.kind {
            Kind::Breath => {
                p.clip = "FIT/Breath";
                p.scrub = Some(self.a);
            }
            Kind::Pose => {
                let ph = ((self.t / rules.pose.pose_seconds).floor() as usize).min(2) + self.pose_first;
                p.clip = POSES[ph.min(5)].1;
                if self.tip_cool > 0.0 {
                    p.clip = "FIT/Stumble";
                }
            }
            Kind::Squats => {
                p.clip = "FIT/Squat";
                p.scrub = Some(self.a);
            }
            Kind::Plank => {
                p.clip = if self.done && self.t < self.total { "FIT/Flop" } else { "FIT/Plank" };
                p.down = 1.0;
            }
            Kind::Step => {
                let l = self.last_step;
                p.clip = if l < 0 { "FIT/StepL" } else if l > 0 { "FIT/StepR" } else { "" };
            }
            Kind::Floatie => p.clip = "FIT/HipCircle",
            Kind::Lap => p.clip = "MESH2MOTION/Jog",
            Kind::Tide => p.clip = "FIT/Stumble",
            Kind::Paddle => p.clip = "STYLE100/Balance_Walk",
            Kind::Tray => p.clip = "FIT/CarryTray",
            Kind::Dive => {
                p.clip = if self.stage == D_AIR && self.d > 0.5 { "FIT/Tuck" } else if self.stage == D_AIR { "FIT/DiveEntry" } else { "" };
            }
            Kind::Still => p.clip = "",
        }
        if self.tip_cool > 0.0 && self.kind != Kind::Pose {
            p.clip = "FIT/Stumble";
        }
        p
    }

    pub fn sprites(&self, rules: &Rules) -> Vec<Sprite> {
        let mut v = vec![];
        match self.kind {
            Kind::Breath => {
                for i in 0..5u32 {
                    let open = (i as i32) < self.m;
                    v.push(Sprite {
                        key: i,
                        shape: SpriteShape::Disc(if open { 0.42 } else { 0.16 }),
                        pos: Vec3::new(-2.6 + i as f32 * 1.3, 0.02, 1.8),
                        color: if open { "#ff9fb8" } else { "#c6e8d0" },
                        emissive: if open { 0.3 } else { 0.0 },
                    });
                }
                let (g, _, _) = Self::breath_guide(rules, self.t);
                v.push(Sprite { key: 10, shape: SpriteShape::Disc(0.5 + 0.9 * g), pos: Vec3::new(0.0, 0.03, 0.4), color: "#78dcaa", emissive: 0.2 });
            }
            Kind::Tide => {
                for (i, s) in self.shells.iter().enumerate() {
                    if s.potted {
                        continue;
                    }
                    v.push(Sprite { key: 100 + i as u32, shape: SpriteShape::Ball(0.2), pos: Vec3::new(s.p.x * 2.6, 0.3, -s.p.y * 2.6), color: "#ffb27a", emissive: 0.0 });
                }
                for (i, (pc, pr)) in self.pools().iter().enumerate() {
                    v.push(Sprite { key: 200 + i as u32, shape: SpriteShape::Disc(pr * 2.6), pos: Vec3::new(pc.x * 2.6, 0.06, -pc.y * 2.6), color: "#46bec8", emissive: 0.1 });
                }
            }
            Kind::Tray => {
                for (i, g) in self.glasses.iter().enumerate() {
                    if g.gone {
                        continue;
                    }
                    v.push(Sprite { key: 300 + i as u32, shape: SpriteShape::Ball(0.11), pos: Vec3::new(-g.p.x * 0.5, 1.15, g.p.y * 0.5 + self.pos.y), color: ["#ff786e", "#ffd166", "#78dcaa", "#46bec8", "#ffb27a"][i % 5], emissive: 0.1 });
                }
            }
            Kind::Floatie => {
                for i in 0..self.rings.max(0) as u32 {
                    v.push(Sprite { key: 400 + i, shape: SpriteShape::Disc(0.55 + 0.05 * i as f32), pos: Vec3::new(0.0, 0.45 + 0.07 * i as f32, 0.0), color: ["#ff786e", "#ffd166", "#78dcaa", "#46bec8"][i as usize % 4], emissive: 0.1 });
                }
                for (i, x) in self.ring_cd.iter().enumerate() {
                    let side = if i % 2 == 0 { -1.0 } else { 1.0 };
                    let u = (1.0 - *x).clamp(0.0, 1.2);
                    v.push(Sprite { key: 450 + i as u32, shape: SpriteShape::Disc(0.4), pos: Vec3::new(side * (3.0 - 2.8 * u), 1.2 + 1.5 * (u * (1.0 - u)).max(0.0), 0.5), color: "#ffd166", emissive: 0.3 });
                }
            }
            Kind::Dive => {
                // judges' cards
                for (i, _c) in self.cards.iter().enumerate() {
                    v.push(Sprite { key: 500 + i as u32, shape: SpriteShape::Box(0.3, 0.4, 0.04), pos: Vec3::new(-1.0 + i as f32 * 1.0, 3.0, -4.0), color: "#fbfaf6", emissive: 0.2 });
                }
            }
            _ => {}
        }
        v
    }

    pub fn prompts(&self) -> Vec<Prompt> {
        let p = |a, l: &str| Prompt { act: a, label: l.to_string() };
        match self.kind {
            Kind::Breath => vec![p(Act::Lean, "Steady"), p(Act::Act, "Breathe in")],
            Kind::Pose => vec![p(Act::Lean, "Steady")],
            Kind::Squats => vec![p(Act::Act, "Squat"), p(Act::Lean, "Steady")],
            Kind::Plank => vec![p(Act::Brace, "Brace"), p(Act::Lean, "Steady")],
            Kind::Step => vec![p(Act::StepL, "Left"), p(Act::StepR, "Right")],
            Kind::Floatie => vec![p(Act::Lean, "Circle"), p(Act::StepL, "Catch"), p(Act::StepR, "Catch")],
            Kind::Lap => vec![p(Act::StepL, "Left"), p(Act::StepR, "Right"), p(Act::Lean, "Steer")],
            Kind::Tide => vec![p(Act::Lean, "Tilt")],
            Kind::Paddle => vec![p(Act::Lean, "Steer")],
            Kind::Tray => vec![p(Act::Lean, "Tilt")],
            Kind::Dive => vec![p(Act::Act, "Bounce / Tuck"), p(Act::Lean, "Rotate")],
            Kind::Still => vec![],
        }
    }

    pub fn hud(&self, c: &BalanceCore, rules: &Rules) -> Hud {
        let sp = spec(self.kind);
        let mut h = Hud { title: sp.name.to_string(), time: (self.total - self.t).max(0.0), line: self.line.clone(), big: self.big.clone(), ..Default::default() };
        h.score = self.score(rules);
        h.stars = Run::stars_for(h.score);
        h.prompts = self.prompts();
        let mut puck = Puck { cob: [c.cob.x, c.cob.y], alpha: 1.0, top: sp.puck_top, tipped: c.tipped, ..Default::default() };
        match self.kind {
            Kind::Breath => {
                let (g, _, _) = Self::breath_guide(rules, self.t);
                puck.ring = [0.0, 0.0, rules.breath.ring];
                h.meters.push(Meter { label: "Lungs".into(), value: self.a, guide: g });
            }
            Kind::Pose => {
                let (ctr, rad) = self.pose_ring(rules, self.t);
                puck.ring = [ctr.x, ctr.y, rad];
                puck.streak = self.d as u8;
                h.time = (self.total - self.t).max(0.0);
            }
            Kind::Squats => {
                let rl = Self::rep_len(rules);
                let tr = self.t - ((self.t / rl).floor()).min(rules.squat.reps as f32 - 1.0) * rl;
                puck.ring = [0.0, 0.0, rules.squat.band];
                h.meters.push(Meter { label: format!("Rep {}", (self.n + 1).min(rules.squat.reps)), value: self.a, guide: Self::squat_guide(rules, tr) });
            }
            Kind::Plank => {
                puck.ring = [0.0, 0.0, self.plank_ring(rules)];
                h.meters.push(Meter { label: "Seconds".into(), value: self.t / rules.plank.max_secs, guide: -1.0 });
                h.time = self.t;
            }
            Kind::Step => {
                for n in &self.notes {
                    if n.hit == 1 || n.hit == 2 {
                        continue;
                    }
                    let d = (n.t - self.pos.x) / 1.6;
                    if d > -0.15 && d < 1.0 {
                        h.notes.push([n.lane as f32, d, n.hit as f32]);
                    }
                }
                h.meters.push(Meter { label: "Combo".into(), value: (self.m as f32 / 20.0).min(1.0), guide: -1.0 });
                puck.alpha = 0.0;
            }
            Kind::Floatie => {
                puck.ring = [0.0, 0.0, 0.0];
                h.meters.push(Meter { label: "Spin".into(), value: (self.b * self.a / 12.0).clamp(0.0, 1.0), guide: 0.62 });
                h.line = format!("{} rings", self.rings);
            }
            Kind::Lap => {
                h.meters.push(Meter { label: "Pace".into(), value: (self.d / 4.0).clamp(0.0, 1.0), guide: 0.5 });
                h.meters.push(Meter { label: "Stitch".into(), value: self.b, guide: -1.0 });
                puck.alpha = 0.0;
            }
            Kind::Tide => {
                h.line = format!("Board {} of 3", (self.stage + 1).min(3));
            }
            Kind::Paddle => {
                h.meters.push(Meter { label: "Course".into(), value: self.pos.y / Self::course_len(), guide: -1.0 });
                h.time = self.t + self.d;
            }
            Kind::Tray => {
                h.meters.push(Meter { label: "Pier".into(), value: self.t / self.total, guide: -1.0 });
                puck.alpha = 0.0;
            }
            Kind::Dive => {
                puck.alpha = 0.0;
                h.meters.push(Meter { label: "Power".into(), value: self.b / 3.0, guide: -1.0 });
            }
            Kind::Still => {
                h.time = 0.0;
                h.score = 0;
                h.stars = 0;
                h.fake_prompt = self.fake;
                h.prompts.clear();
            }
        }
        h.puck = Some(puck);
        h
    }

    // ------------------------------------------------------------ bots

    /// What a decent player presses right now.
    pub fn bot(&self, c: &BalanceCore, rules: &Rules) -> Intent {
        let mut it = Intent::default();
        let pd = |target: Vec2| -> Vec2 { ((target - c.cob) * 1.0 + target * 0.0 - c.vel * 0.08) / rules.core.reach.max(0.1) + c.cob * 0.0 };
        match self.kind {
            Kind::Breath => {
                let (g, _, _) = Self::breath_guide(rules, self.t + 0.1);
                let (g0, _, _) = Self::breath_guide(rules, self.t);
                it.act = g > g0 || (g > 0.97 && self.a < g);
                it.lean = (-c.cob * 1.2 - c.vel * 0.05).clamp_length_max(1.0);
            }
            Kind::Pose => {
                let (ctr, _) = self.pose_ring(rules, self.t + 0.05);
                it.lean = (ctr + (ctr - c.cob) * 0.6 - c.vel * 0.05).clamp_length_max(1.0) / rules.core.reach;
                it.lean = it.lean.clamp_length_max(1.0);
            }
            Kind::Squats => {
                let rl = Self::rep_len(rules);
                let tr = self.t - ((self.t / rl).floor()).min(rules.squat.reps as f32 - 1.0) * rl;
                let g = Self::squat_guide(rules, tr + 0.05);
                let g0 = Self::squat_guide(rules, tr);
                it.act = g > g0 || (g > 0.99);
                it.lean = Vec2::new((-c.cob.x * 1.2 - c.vel.x * 0.05).clamp(-1.0, 1.0), 0.0);
            }
            Kind::Plank => {
                it.l = true;
                it.r = true;
                it.lean = (-c.cob * 1.4 - c.vel * 0.06).clamp_length_max(1.0);
            }
            Kind::Step => {
                let now = self.pos.x;
                for n in self.notes.iter() {
                    if (n.hit == 0 || n.hit == 10) && (n.t - now).abs() < 0.02 {
                        if n.lane == 0 || n.lane == 2 {
                            it.l_p = true;
                        }
                        if n.lane == 1 || n.lane == 2 {
                            it.r_p = true;
                        }
                    }
                }
            }
            Kind::Floatie => {
                let target = (rules.floatie.band_lo + rules.floatie.band_hi) * 0.5;
                let ang = self.pos.x + self.a * target / 60.0;
                it.lean = Vec2::new(ang.cos(), ang.sin()) * 0.9;
                if self.ring_cd.iter().any(|x| *x < 0.1) {
                    it.l_p = true;
                }
            }
            Kind::Lap => {
                let next_step = (self.t * 2.0).floor();
                let prev = ((self.t - 1.0 / 60.0) * 2.0).floor();
                if next_step > prev || self.t < 1.0 / 60.0 {
                    if self.last_step <= 0 {
                        it.r_p = true;
                    } else {
                        it.l_p = true;
                    }
                }
                let rib = ((self.pos.y / 14.0).floor() as i32 + 1).max(1);
                let obs = (((self.pos.y - 7.0) / 17.0).floor() as i32 + 1).max(0);
                let rd = rib as f32 * 14.0 - self.pos.y;
                let od = 7.0 + obs as f32 * 17.0 - self.pos.y;
                let mut tx = if rd < 5.0 { Self::ribbon_off(rib) } else { 0.0 };
                if od < 3.0 && od > -0.5 {
                    let o = Self::obstacle_off(obs);
                    tx = if o > 0.0 { o - 1.0 } else { o + 1.0 };
                    tx = tx.clamp(-1.2, 1.2);
                }
                it.lean.x = (tx / 1.2).clamp(-1.0, 1.0);
            }
            Kind::Tide => {
                let pools = self.pools();
                // nearest unpotted shell
                let mut best: Option<&Shell> = None;
                for s in self.shells.iter().filter(|s| !s.potted) {
                    if best.map(|b| b.p.length() > s.p.length() && false).unwrap_or(true) || best.is_none() {
                        best = Some(s);
                    }
                }
                // choose the shell nearest a pool
                let mut pick: Option<(&Shell, (Vec2, f32))> = None;
                let mut bd = f32::MAX;
                for s in self.shells.iter().filter(|s| !s.potted) {
                    for p in &pools {
                        let d = (s.p - p.0).length();
                        if d < bd {
                            bd = d;
                            pick = Some((s, *p));
                        }
                    }
                }
                if let Some((s, (pc, _))) = pick {
                    let to = pc - s.p;
                    let dist = to.length();
                    let dir = to / dist.max(1e-3);
                    // desired speed toward pool
                    let vdes = dir * (dist * 2.2).min(1.1);
                    let acc = (vdes - s.v) * 4.0;
                    let g = rules.tide.gravity;
                    let tilt = (acc + s.v * rules.tide.friction) / g;
                    it.lean = (tilt / rules.core.reach).clamp_length_max(1.0);
                    if dist < 0.0 {
                        it.lean = Vec2::ZERO;
                    }
                } else {
                    it.lean = Vec2::ZERO;
                }
                let _ = best;
            }
            Kind::Paddle => {
                let nxt = self.n.min(Self::gate_count() - 1);
                let gx = Self::gate_x(nxt);
                let dx = gx - self.pos.x;
                it.lean.x = -(dx * 0.6).clamp(-1.0, 1.0) * 0.9;
                it.lean.y = 0.5;
                if self.c > 0.0 {
                    it.lean = Vec2::ZERO;
                }
                // counter gust
                it.lean.x = (it.lean.x - c.gust.x * 0.02).clamp(-1.0, 1.0);
            }
            Kind::Tray => {
                // counter the jolts: lean against the coming shove, otherwise level out
                let mut counter = Vec2::ZERO;
                for (t0, v, _) in Self::jolts() {
                    let dtj = t0 - self.t;
                    if (-0.6..0.25).contains(&dtj) {
                        counter = -v.normalize_or_zero() * 0.9;
                    }
                }
                it.lean = (counter - c.cob * 1.5 - c.vel * 0.1).clamp_length_max(1.0);
                // keep glasses centred: lean toward the mean glass offset
                let mut m = Vec2::ZERO;
                let mut k = 0.0;
                for g in self.glasses.iter().filter(|g| !g.gone) {
                    m += g.p;
                    k += 1.0;
                }
                if k > 0.0 {
                    m /= k;
                    it.lean += -m * 1.2 - self.glasses.iter().filter(|g| !g.gone).map(|g| g.v).sum::<Vec2>() / k * 0.8;
                    it.lean = it.lean.clamp_length_max(1.0);
                }
            }
            Kind::Dive => match self.stage {
                D_BOUNCE => {
                    let p = rules.dive.period;
                    let to_bottom = (self.a - (self.a / p).round() * p).abs();
                    let prev_bottom = ((self.a - 1.0 / 60.0) - ((self.a - 1.0 / 60.0) / p).round() * p).abs();
                    // press at the tick nearest the bottom
                    it.act_p = to_bottom <= prev_bottom && to_bottom < 0.01 || (self.a % p) < 1.0 / 60.0;
                    it.act = it.act_p;
                }
                D_AIR => {
                    let power = (self.b / 3.0) * rules.dive.gain;
                    let h_peak = 2.0 + 4.0 * power;
                    let t_flight = 2.0 * (2.0 * h_peak / 9.8f32).sqrt() * 0.9 + 0.2;
                    it.act = self.c > t_flight * 0.35;
                }
                _ => {}
            },
            Kind::Still => {}
        }
        let _ = pd;
        it
    }

    /// Camera yaw (degrees) for chase events, or None for the fixed camera.
    pub fn chase_yaw(&self) -> Option<f32> {
        None
    }
}
