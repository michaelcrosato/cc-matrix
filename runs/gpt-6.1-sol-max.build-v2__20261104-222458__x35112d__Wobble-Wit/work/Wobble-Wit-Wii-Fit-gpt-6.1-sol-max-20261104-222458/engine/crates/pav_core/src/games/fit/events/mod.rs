use super::{Rules, core::BalanceCore};
use crate::frame::SimEvent;
use crate::input::{InputFrame, buttons as b};
use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};
use std::f32::consts::TAU;
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum Kind {
    Breath,
    Pose,
    Squat,
    Plank,
    Step,
    Spin,
    Lap,
    Tide,
    Paddle,
    Tray,
    Dive,
    Finale,
    Check,
}
pub const ROSTER: [Kind; 11] = [
    Kind::Breath,
    Kind::Pose,
    Kind::Squat,
    Kind::Plank,
    Kind::Step,
    Kind::Spin,
    Kind::Lap,
    Kind::Tide,
    Kind::Paddle,
    Kind::Tray,
    Kind::Dive,
];
impl Kind {
    pub fn key(self) -> &'static str {
        [
            "breath-bloom",
            "pose-parade",
            "tempo-squats",
            "plank-standoff",
            "step-party",
            "floatie-spin",
            "morning-lap",
            "tide-table",
            "paddle-slalom",
            "tray-trek",
            "cannonball-cup",
            "big-stand",
            "wobble-check",
        ][self as usize]
    }
    pub fn name(self) -> &'static str {
        [
            "Breath Bloom",
            "Pose Parade",
            "Tempo Squats",
            "Plank Standoff",
            "Step Party",
            "Floatie Spin",
            "Morning Lap",
            "Tide Table",
            "Paddle Slalom",
            "Tray Trek",
            "Cannonball Cup",
            "The Big Stand",
            "Morning Wobble Check",
        ][self as usize]
    }
    pub fn goal(self) -> &'static str {
        [
            "Follow the breath. Keep your balance dot in the green ring.",
            "Lean gently to hold the moving ring. Accept the bird.",
            "Hold to squat. Release to rise. Follow the tempo.",
            "Hold both step buttons. Keep the dot in the shrinking ring.",
            "Step left and right as the notes reach the footprints.",
            "Circle your lean. Catch rings with the matching step.",
            "Alternate steps. Lean to collect ribbons and dodge crabs.",
            "Tilt the raft. Roll slow shells into the tide pools.",
            "Lean through the buoy gates. Forward speeds up; back brakes.",
            "Keep the tray level. Deliver five extremely optimistic smoothies.",
            "Press at the bottom of each bounce. Tuck in the air. Make a splash.",
            "A little of everything. Then thirty seconds of absolutely nothing.",
            "Four small tests. One unnecessarily large number.",
        ][self as usize]
    }
    pub fn day(self) -> u8 {
        match self {
            Self::Breath | Self::Pose | Self::Check => 1,
            Self::Squat | Self::Plank => 2,
            Self::Step | Self::Spin | Self::Lap => 3,
            Self::Finale => 5,
            _ => 4,
        }
    }
    pub fn set(self) -> usize {
        match self {
            Self::Breath | Self::Pose | Self::Check => 1,
            Self::Squat | Self::Plank => 2,
            Self::Step | Self::Spin => 3,
            Self::Lap => 0,
            Self::Tide => 4,
            Self::Paddle => 5,
            Self::Tray => 6,
            Self::Dive => 7,
            Self::Finale => 8,
        }
    }
    pub fn coach(self) -> &'static str {
        match self {
            Self::Breath | Self::Pose => "POSEY",
            Self::Squat | Self::Plank => "BIG KETTLE",
            Self::Step | Self::Spin | Self::Lap => "BOUNCE",
            Self::Finale | Self::Check => "PIP",
            _ => "COMMODORE GULL",
        }
    }
    pub fn duration(self) -> f32 {
        [45., 60., 50., 60., 64., 50., 120., 60., 75., 50., 40., 142., 65.][self as usize]
    }
    pub fn from_key(key: &str) -> Option<Self> {
        ROSTER.into_iter().chain([Self::Finale, Self::Check]).find(|k| k.key() == key)
    }
    pub fn song(self) -> u8 {
        if self == Self::Lap {
            return 4;
        }
        match self.set() {
            1 => 2,
            2 => 3,
            3 => 4,
            8 => 6,
            _ => 5,
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Note {
    pub t: f32,
    pub lane: u8,
    pub judged: bool,
    pub quality: f32,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Shell {
    pub p: Vec2,
    pub v: Vec2,
    pub potted: bool,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GhostPoint {
    pub t: f32,
    pub pos: Vec3,
    pub lean: Vec2,
    pub facing: f32,
    pub clip: u32,
    pub clip_t: f32,
    pub score: u32,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Event {
    pub kind: Kind,
    pub time: f32,
    pub duration: f32,
    pub core: BalanceCore,
    pub target: Vec2,
    pub radius: f32,
    pub tally: f32,
    pub possible: f32,
    pub score: u32,
    pub metrics: [f32; 4],
    pub weights: [f32; 4],
    pub lungs: f32,
    pub guide: f32,
    pub streak: f32,
    pub hits: u32,
    pub misses: u32,
    pub last_step: i8,
    pub last_step_t: f32,
    pub pace: f32,
    pub progress: f32,
    pub side: f32,
    pub rings: u8,
    pub spin: f32,
    pub angle: f32,
    pub next_catch: f32,
    pub shells: Vec<Shell>,
    pub pools: Vec<Vec2>,
    pub glasses: Vec<(Vec2, Vec2)>,
    pub notes: Vec<Note>,
    pub phase: u8,
    pub sub_phase: u8,
    pub penalty: f32,
    pub collapsed: bool,
    pub peace: bool,
    pub finished: bool,
    pub label: String,
    pub ghost: Vec<GhostPoint>,
    pub best_ghost: Vec<GhostPoint>,
    pub record_at: f32,
    pub dive_power: f32,
    pub dive_y: f32,
    pub dive_v: f32,
    pub dive_rotate: f32,
    pub dive_tuck: f32,
    pub dive_presses: u8,
    pub dives: u8,
    pub song_anchor: Option<f32>,
    pub song_last: f32,
    pub last_signal: i32,
    pub ready_target: bool,
    pub phase_start: f32,
    pub last_input: Vec2,
}
impl Event {
    pub fn new(kind: Kind, phases: [f32; 4]) -> Self {
        let mut s = Self {
            kind,
            time: 0.,
            duration: kind.duration(),
            core: BalanceCore::new(phases),
            target: Vec2::ZERO,
            radius: 0.35,
            tally: 0.,
            possible: 0.,
            score: 0,
            metrics: [0.; 4],
            weights: [0.; 4],
            lungs: 0.,
            guide: 0.,
            streak: 0.,
            hits: 0,
            misses: 0,
            last_step: -1,
            last_step_t: -1.,
            pace: 0.,
            progress: 0.,
            side: 0.,
            rings: 1,
            spin: 0.,
            angle: 0.,
            next_catch: 5.,
            shells: vec![],
            pools: vec![],
            glasses: (0..5).map(|i| (Vec2::new((i as f32 - 2.) * 0.18, 0.), Vec2::ZERO)).collect(),
            notes: vec![],
            phase: 0,
            sub_phase: 0,
            penalty: 0.,
            collapsed: false,
            peace: true,
            finished: false,
            label: String::new(),
            ghost: vec![],
            best_ghost: vec![],
            record_at: 0.,
            dive_power: 0.,
            dive_y: 0.,
            dive_v: 0.,
            dive_rotate: 0.,
            dive_tuck: 0.,
            dive_presses: 0,
            dives: 0,
            song_anchor: None,
            song_last: 0.,
            last_signal: -1,
            ready_target: false,
            phase_start: 0.,
            last_input: Vec2::ZERO,
        };
        s.notes = super::charts::notes();
        s.setup_board();
        s
    }
    pub fn setup_board(&mut self) {
        let n = 3 + self.phase as usize * 2;
        self.shells = (0..n)
            .map(|i| {
                let a = i as f32 * TAU / n as f32;
                Shell { p: Vec2::new(a.cos(), a.sin()) * 1.4, v: Vec2::ZERO, potted: false }
            })
            .collect();
        self.pools = vec![Vec2::new(-1.9, -1.65), Vec2::new(1.9, 1.65), Vec2::new(-1.8, 1.7)];
    }
    pub fn effective(&self) -> (Kind, f32) {
        if self.kind != Kind::Finale {
            return (self.kind, self.time);
        }
        if self.time < 32. {
            (Kind::Breath, self.time)
        } else if self.time < 52. {
            (Kind::Pose, self.time - 32.)
        } else if self.time < 92. {
            (Kind::Step, self.time - 52.)
        } else if self.time < 112. {
            (Kind::Plank, self.time - 92.)
        } else {
            (Kind::Finale, self.time - 112.)
        }
    }
    pub fn target_at(&self, t: f32) -> Vec2 {
        Vec2::new((TAU * 0.12 * t).sin() * 0.35, (TAU * 0.075 * t + 0.6).sin() * 0.26)
    }
    pub fn tray_env(t: f32) -> Vec2 {
        Vec2::new(0.16 + (t * 0.19).sin() * 0.10, (t * 0.13).cos() * 0.09)
    }
    pub fn gust(&self, t: f32, r: &Rules) -> Vec2 {
        Vec2::new((t * 0.7).sin() * 1.4 + (t * 1.9).sin() * 0.6, (t * 0.5).cos() * 0.6) * r.gust_strength
    }
    pub fn step(&mut self, i: &InputFrame, dt: f32, r: &Rules, events: &mut Vec<SimEvent>, origin: Vec3) {
        if self.finished {
            return;
        }
        let before = self.time;
        self.time += dt;
        let (kind, t) = self.effective();
        let action = i.down(b::CONFIRM);
        let brace = i.down(b::STEP_L) && i.down(b::STEP_R);
        self.target = Vec2::ZERO;
        self.radius = 0.35;
        let amp = match kind {
            Kind::Pose => {
                if (32.0..37.0).contains(&t) {
                    1.6
                } else {
                    1.
                }
            }
            Kind::Squat => 1. + (t / 5.).floor() * 0.08,
            Kind::Plank => 1. + t / 45.,
            Kind::Finale => 0.2,
            _ => 1.,
        };
        let gust = match kind {
            Kind::Paddle | Kind::Tray => self.gust(t, r),
            Kind::Plank | Kind::Pose if self.kind == Kind::Finale => self.gust(t, r) * r.finale_gusts * (0.3 + t / 20.),
            _ => Vec2::ZERO,
        };
        let tip = self.core.step(i.lean, t, dt, amp, gust, r);
        if tip {
            self.penalty += 35.;
            self.streak = 0.;
            events.push(SimEvent::Sfx { id: 10, gain: 0.7, pitch: 1. });
            if matches!(kind, Kind::Paddle | Kind::Tide | Kind::Finale) {
                events.push(SimEvent::Splash { pos: origin });
            }
        }
        let cob = self.core.cob;
        let dist = cob.length();
        self.label.clear();
        match kind {
            Kind::Breath => {
                self.guide = 0.5 - 0.5 * (TAU * t / 8.).cos();
                self.lungs = (self.lungs + dt * if action { 0.25 } else { -0.25 }).clamp(0., 1.);
                let good = (1. - (self.lungs - self.guide).abs() / r.breath_tolerance).clamp(0., 1.);
                self.add(
                    (0.7 * good + 0.3 * (dist < 0.35) as u8 as f32) * if action || self.lungs > 0.02 { 1. } else { 0.15 },
                    dt,
                );
                self.label = if (t % 8.) < 4. { "Breathe in" } else { "Breathe out" }.into();
                let cycle = (t / 8.) as i32;
                if cycle != self.last_signal {
                    self.last_signal = cycle;
                    events.push(SimEvent::Sfx { id: 20, gain: 0.45, pitch: 1. + cycle as f32 * 0.12 });
                }
            }
            Kind::Pose => {
                self.target = self.target_at(t);
                self.radius = (r.pose_radius - t % 20. * 0.006).max(0.18);
                let in_ring = cob.distance(self.target) < self.radius;
                self.streak = if in_ring { self.streak + dt } else { 0. };
                let mult = 1. + (self.streak / 2.).floor().min(3.);
                self.add(if in_ring { (0.65 + mult * 0.0875).min(1.) } else { 0. }, dt);
                self.label = if (32.0..37.0).contains(&t) {
                    "There is a bird on you. Accept the bird."
                } else {
                    [
                        "The Patient Heron",
                        "The Apologetic Lunge",
                        "The Tired Lighthouse",
                        "The Folded Deck Chair",
                        "The Reluctant Bridge",
                        "Seated Disappointment",
                    ][((t / 20.) as usize + if self.kind == Kind::Pose { self.phase as usize } else { 0 }) % 6]
                }
                .into();
            }
            Kind::Squat => {
                let cycle = t % 5.;
                if cycle < dt {
                    self.ready_target = false;
                }
                if self.lungs > 0.8 {
                    self.ready_target = true;
                }
                self.guide = if cycle < 2. {
                    cycle / 2.
                } else if cycle < 3. {
                    3. - cycle
                } else {
                    0.
                };
                self.lungs = (self.lungs + dt * if action { 0.5 } else { -1. }).clamp(0., 1.);
                let timing = (1. - (self.lungs - self.guide).abs() / 0.4).clamp(0., 1.);
                self.add(
                    (0.7 * timing + 0.3 * (cob.x.abs() < r.squat_band) as u8 as f32)
                        * if action || self.ready_target { 1. } else { 0. },
                    dt,
                );
                let rep = (t / 5.) as i32;
                if rep != self.last_signal {
                    self.last_signal = rep;
                    events.push(SimEvent::Sfx { id: 16, gain: 0.6, pitch: 0.8 });
                }
                self.label = if cycle < 2. {
                    "Hold · lower slowly"
                } else if cycle < 3. {
                    "Release · rise"
                } else {
                    "Rest. An official exercise."
                }
                .into();
            }
            Kind::Plank => {
                self.radius = (r.plank_radius - t / 300.).max(0.2);
                if !brace || dist > self.radius {
                    self.penalty += dt;
                } else {
                    self.penalty = (self.penalty - dt * 0.5).max(0.);
                }
                if brace && dist < self.radius {
                    self.add(1., dt);
                } else {
                    self.add(0., dt);
                }
                if self.penalty > 1. && !self.collapsed {
                    self.collapsed = true;
                    self.label = "A very horizontal decision.".into();
                }
                if self.collapsed && self.kind == Kind::Plank {
                    self.finished = true;
                    self.score = (t / 60. * 1000.).min(1000.) as u32;
                } else {
                    self.label = if t > 45. {
                        "Kettle is laughing. Brace for the joke."
                    } else if t > 30. {
                        "A small tremble. Very professional."
                    } else {
                        "Hold both. Be a dignified plank."
                    }
                    .into();
                }
            }
            Kind::Step => {
                let rhythm_t = if self.kind == Kind::Finale {
                    t
                } else if let Some(pos) = i.song_pos {
                    if self.song_anchor.is_none() || pos < self.song_last {
                        self.song_anchor = Some(pos - t);
                    }
                    self.song_last = pos;
                    pos - self.song_anchor.unwrap_or(0.)
                } else {
                    t
                };
                for lane in 0..2u8 {
                    let bit = if lane == 0 { b::STEP_L } else { b::STEP_R };
                    if i.just(bit) {
                        let nearest = self
                            .notes
                            .iter()
                            .enumerate()
                            .filter(|(_, n)| !n.judged && n.lane == lane)
                            .min_by(|(_, a), (_, b)| (a.t - rhythm_t).abs().total_cmp(&(b.t - rhythm_t).abs()));
                        if let Some((idx, n)) = nearest {
                            let diff = (n.t - rhythm_t).abs();
                            if diff <= r.rhythm_good {
                                let q = if diff <= r.rhythm_perfect { 1. } else { 0.7 };
                                self.notes[idx].judged = true;
                                self.notes[idx].quality = q;
                                self.tally += q;
                                self.hits += 1;
                                self.streak += 1.;
                                self.label = if q > 0.9 { "Perfect" } else { "Good" }.into();
                                events.push(SimEvent::Sfx { id: 6, gain: 0.7, pitch: 1. + lane as f32 * 0.2 });
                            } else {
                                self.streak = 0.;
                            }
                        }
                    }
                }
                for n in &mut self.notes {
                    if !n.judged && n.t < rhythm_t - r.rhythm_good {
                        n.judged = true;
                        self.misses += 1;
                        self.streak = 0.;
                    }
                }
                self.possible =
                    self.notes.iter().filter(|n| n.t < if self.kind == Kind::Finale { 40. } else { 64. }).count() as f32;
                if self.label.is_empty() {
                    self.label = "Left. Right. Excessively cheerful.".into();
                }
            }
            Kind::Spin => {
                let a = i.lean.y.atan2(i.lean.x);
                let d = (a - self.angle + std::f32::consts::PI).rem_euclid(TAU) - std::f32::consts::PI;
                self.angle = a;
                self.spin += (d / dt - self.spin) * 0.15;
                let dir = if (t / 15.) as u32 % 2 == 0 { 1. } else { -1. };
                let band = if i.device == 0 { r.spin_band_scale } else { 1. };
                let good = i.lean.length() > 0.4 && self.spin * dir > 6. / band && self.spin * dir < 9. * band;
                self.add(if good { 0.6 + 0.4 * self.rings as f32 / 7. } else { 0. }, dt);
                if t >= self.next_catch - 0.25 && t <= self.next_catch + 0.25 {
                    let side = if (self.next_catch / 5.) as u32 % 2 == 0 { b::STEP_R } else { b::STEP_L };
                    self.label = if side == b::STEP_R { "Catch right!" } else { "Catch left!" }.into();
                    if i.just(side) {
                        self.rings = (self.rings + 1).min(7);
                        self.next_catch += 5.;
                        events.push(SimEvent::Sfx { id: 17, gain: 0.7, pitch: 1. });
                    }
                } else if t > self.next_catch + 0.25 {
                    self.next_catch += 5.;
                }
                if !good {
                    self.penalty += dt;
                } else {
                    self.penalty = 0.;
                }
                if self.penalty > 3. {
                    self.rings = self.rings.saturating_sub(1).max(1);
                    self.penalty = 0.;
                }
                if self.label.is_empty() {
                    self.label = if dir > 0. { "Circle anticlockwise" } else { "Switch! Circle clockwise" }.into();
                }
            }
            Kind::Lap => {
                self.steps(i, t, events);
                let gap = t - self.last_step_t;
                let in_zone = self.pace >= 1.6 && self.pace <= 2.4 && gap < 0.9;
                self.side = cob.x * 1.2;
                let ribbon = (t * 0.38).sin() * 0.85;
                let previous = self.progress;
                self.progress = (self.progress + dt / 90. * (self.pace / 2.).clamp(0.25, 1.3)).min(1.);
                self.target.x = ribbon / 1.2;
                self.radius = 0.22;
                for n in 0..6 {
                    let crab = (n as f32 + 0.5) / 6.;
                    let side = (n as f32 * 1.6 + self.core.phase[0]).sin() * 0.8;
                    if previous < crab && self.progress >= crab && (self.side - side).abs() < 0.45 {
                        self.misses += 1;
                        events.push(SimEvent::Sfx { id: 10, gain: 0.55, pitch: 1.4 });
                    }
                    let ribbon = (n as f32 + 0.25) / 6.;
                    let side = (ribbon * 90. * 0.38).sin() * 0.85;
                    if previous < ribbon && self.progress >= ribbon && (self.side - side).abs() < 0.4 {
                        self.metrics[0] += 1.;
                        events.push(SimEvent::Sfx { id: 20, gain: 0.5, pitch: 1.2 });
                    }
                }
                if self.progress >= 1. {
                    self.finished = true;
                }
                self.add(if in_zone { 0.72 + 0.28 * (self.side - ribbon).abs().lt(&0.35) as u8 as f32 } else { 0. }, dt);
                if self.pace > 2.8 {
                    self.penalty += dt * 3.;
                }
                self.label = if self.pace > 2.8 {
                    "A stitch. Your enthusiasm has been noted."
                } else if in_zone {
                    "Lovely pace. Mind the crab."
                } else {
                    "Alternate left and right · find your pace"
                }
                .into();
            }
            Kind::Tide => {
                let board = (t / 20.).min(2.) as u8;
                if board != self.phase {
                    self.phase = board;
                    self.setup_board();
                }
                if self.phase > 0 {
                    self.pools[1] = Vec2::new(1.65, (t * 0.6).sin() * 1.5);
                }
                for sh in &mut self.shells {
                    if sh.potted {
                        continue;
                    }
                    sh.v += (Vec2::new(cob.x, -cob.y) * 5. - sh.v * r.shell_friction) * dt;
                    sh.p += sh.v * dt;
                    for axis in 0..2 {
                        if sh.p[axis].abs() > 2.65 {
                            sh.p[axis] = sh.p[axis].clamp(-2.65, 2.65);
                            sh.v[axis] *= -0.5;
                        }
                    }
                    if self.phase == 2 && sh.p.length() < 0.45 {
                        sh.v += sh.p.normalize_or_zero() * 1.5;
                    }
                    if self.pools.iter().any(|p| p.distance(sh.p) < 0.42) && sh.v.length() < 1.5 {
                        sh.potted = true;
                        self.hits += 1;
                        events.push(SimEvent::Sfx { id: 19, gain: 0.7, pitch: 1. + self.hits as f32 * 0.03 });
                    }
                }
                self.score = (self.hits as f32 / 15. * 1000.).min(1000.) as u32;
                self.label = format!("Raft {} · slow shells stay in pools", self.phase + 1);
            }
            Kind::Paddle => {
                self.progress = (self.progress + dt / 45. * (0.55 + cob.y).clamp(0.2, 1.5)).min(1.);
                if self.progress >= 1. {
                    self.finished = true;
                }
                let gate = (self.progress * 9.).floor() as i32;
                let centre = Self::gate(gate);
                self.target = Vec2::new(centre, 0.5);
                self.radius = 0.24;
                self.side += (cob.x * 4. - self.side) * dt * 2.5;
                let good = (self.side / 4. - centre).abs() < 0.22;
                self.add(if good && cob.y > 0.1 { 1. } else { 0. }, dt);
                if gate != self.last_signal {
                    if self.last_signal >= 0 {
                        if (self.side / 4. - Self::gate(self.last_signal)).abs() < 0.22 {
                            self.hits += 1;
                            events.push(SimEvent::Sfx { id: 20, gain: 0.5, pitch: 1.2 });
                        } else {
                            self.misses += 1;
                        }
                    }
                    self.last_signal = gate;
                }
                self.label = "Lean toward the next gate · forward for speed".into();
                if (t * 8.) as i32 != (before * 8.) as i32 {
                    events.push(SimEvent::Wake { pos: origin + Vec3::new(self.side, 0., -self.progress * 72.) });
                }
            }
            Kind::Tray => {
                self.target = -self.gust(t, r) / r.stiffness - Self::tray_env(t);
                self.radius = 0.2;
                let tray = cob + Self::tray_env(t);
                for (p, v) in &mut self.glasses {
                    if p.length() > 3. {
                        continue;
                    }
                    *v += (tray * 2.2 - *v * r.tray_friction) * dt;
                    *p += *v * dt;
                    if p.length() > 0.65 {
                        *p = Vec2::splat(10.);
                        self.misses += 1;
                        events.push(SimEvent::Sfx { id: 21, gain: 0.7, pitch: 1. });
                    }
                }
                self.progress = t / 50.;
                self.score = (self.glasses.iter().filter(|(p, _)| p.length() < 1.).count() * 200) as u32;
                self.add((1. - tray.length() / 0.18).clamp(0., 1.), dt);
                self.label = "Counter the waves. The glasses are trusting you.".into();
            }
            Kind::Dive => {
                let local = t - self.phase_start;
                let cycle = local % 1.2;
                self.guide = 0.5 + 0.5 * (TAU * cycle / 1.2).sin();
                if self.dive_presses < 4 {
                    self.dive_y = 0.15 * (TAU * cycle / 1.2).sin();
                    self.label = format!("Bounce {} of 4 · press at the lowest point", self.dive_presses + 1);
                    if i.just(b::CONFIRM) {
                        let q = (1. - (cycle - 0.9).abs() / 0.32).clamp(0., 1.);
                        self.dive_power += q * r.bounce_gain;
                        self.dive_presses += 1;
                        events.push(SimEvent::Sfx { id: 7, gain: 0.5, pitch: 0.8 + q * 0.4 });
                        if self.dive_presses == 4 {
                            self.dive_v = 5. + self.dive_power * 1.5;
                            self.dive_y = 2.;
                        }
                    }
                    if local > 7. && self.dive_presses < 4 {
                        self.dive_presses = 4;
                        self.dive_v = 4.;
                        self.dive_y = 2.;
                    }
                } else if self.sub_phase == 0 {
                    self.dive_v -= 7. * dt;
                    self.dive_y += self.dive_v * dt;
                    self.dive_rotate += cob.x * dt * 3.;
                    self.dive_tuck = if action { (self.dive_tuck + dt * 2.).min(1.) } else { (self.dive_tuck - dt * 3.).max(0.) };
                    self.label = "Hold to tuck! Lean for a little unnecessary rotation.".into();
                    if self.dive_y < 0. {
                        let quality = (self.dive_power / 4.).min(1.) * (0.4 + 0.6 * self.dive_tuck);
                        self.tally += quality;
                        self.dives += 1;
                        self.sub_phase = 1;
                        self.phase_start = t;
                        events.push(SimEvent::BigSplash { pos: origin + Vec3::new(0., 0., -2.), size: 3. + quality * 7. });
                        self.label = "6.5       7       See me".into();
                    }
                } else {
                    self.label = "6.5       7       See me".into();
                    if local > 1.8 {
                        if self.dives >= 3 {
                            self.finished = true;
                        } else {
                            self.dive_presses = 0;
                            self.dive_power = 0.;
                            self.sub_phase = 0;
                            self.phase_start = t;
                        }
                    }
                }
                self.score = (self.tally / 3. * 1000.) as u32;
            }
            Kind::Finale => {
                self.radius = 0.35;
                self.label = if t > 15. { "Press to skip" } else { "The Long Stillness" }.into();
                if t > 0.6 && (i.any || i.held != 0 || i.lean.length() > 0.1) {
                    self.peace = false;
                }
                self.add(if self.peace { 1. } else { 0. }, dt);
            }
            Kind::Check => {
                let stage = if t < 12. {
                    0
                } else if t < 33. {
                    1
                } else if t < 43. {
                    2
                } else {
                    3
                };
                self.phase = stage;
                let good = match stage {
                    0 => {
                        self.label = "Stand still. This is the whole test.".into();
                        if t > 5. && before <= 5. {
                            self.core.vel.x += 0.4;
                        }
                        (1. - dist / 0.4).clamp(0., 1.)
                    }
                    1 => {
                        let n = ((t - 12.) / 7.) as usize;
                        self.target = Vec2::new([-0.7, 0.55, -0.35][n.min(2)], 0.);
                        self.radius = 0.1;
                        self.label = format!(
                            "Lean to {}% {}",
                            (self.target.x.abs() * 100.) as u32,
                            if self.target.x < 0. { "left" } else { "right" }
                        );
                        (1. - cob.distance(self.target) / 0.3).clamp(0., 1.)
                    }
                    2 => {
                        self.label = "Eyes closed. Listen to the tone. Trust less.".into();
                        if (t * 8.) as u32 != (before * 8.) as u32 {
                            events.push(SimEvent::Sfx { id: 29, gain: 0.2, pitch: 0.5 + dist * 3. });
                        }
                        (1. - dist / 0.35).clamp(0., 1.)
                    }
                    _ => {
                        self.label = "Eight alternating steps · follow the bell".into();
                        let beat = ((t - 43.) / 0.6) as i32;
                        if beat != self.last_signal && beat < 8 {
                            self.last_signal = beat;
                            events.push(SimEvent::Sfx { id: 16, gain: 0.6, pitch: 1. });
                        }
                        let prev = self.hits;
                        self.steps(i, t, events);
                        if self.hits > prev {
                            let error = ((t - 43.) / 0.6).fract().min(1. - ((t - 43.) / 0.6).fract()) * 0.6;
                            self.metrics[3] += (1. - error / 0.25).clamp(0., 1.);
                            self.weights[3] += 1.;
                        }
                        0.
                    }
                };
                if stage < 3 {
                    self.metrics[stage as usize] += good * dt;
                    self.weights[stage as usize] += dt;
                }
            }
        }
        self.last_input = i.lean;
        if !matches!(self.kind, Kind::Tide | Kind::Tray | Kind::Dive | Kind::Check) && !self.collapsed {
            self.score = ((self.tally / self.possible.max(0.001) * 1000. - self.core.tips as f32 * 25.).clamp(0., 1000.)) as u32;
        }
        if self.kind == Kind::Finale {
            self.phase = if self.time < 32. {
                0
            } else if self.time < 52. {
                1
            } else if self.time < 92. {
                2
            } else if self.time < 112. {
                3
            } else {
                4
            };
        }
        if self.kind == Kind::Lap {
            self.score = self.score.saturating_sub(self.misses * 12);
        }
        if self.kind == Kind::Paddle {
            self.score = ((72. - (self.time + self.misses as f32 * 2. + self.core.tips as f32 * 2.)) / 36. * 1000.)
                .clamp(0., 1000.) as u32;
        }
        if self.kind == Kind::Finale {
            let phase = self.phase as usize;
            if phase < 4 {
                let q = match phase {
                    0 => {
                        ((1. - (self.lungs - self.guide).abs() / r.breath_tolerance).clamp(0., 1.) * 0.7
                            + 0.3 * (dist < 0.35) as u8 as f32)
                            * if action || self.lungs > 0.02 { 1. } else { 0.15 }
                    }
                    1 => (cob.distance(self.target) < self.radius) as u8 as f32,
                    3 => (brace && dist < self.radius) as u8 as f32,
                    _ => 0.,
                };
                if phase == 2 {
                    let total = self.notes.iter().filter(|n| n.t < 40.).count() as f32;
                    self.metrics[2] = self.notes.iter().filter(|n| n.t < 40.).map(|n| n.quality).sum::<f32>() / total.max(1.);
                } else {
                    self.metrics[phase] = (self.metrics[phase] + q * dt / [32., 20., 40., 20.][phase]).min(1.);
                }
            }
            let peace = if self.peace { ((self.time - 112.) / 30.).clamp(0., 1.) } else { 0. };
            self.score =
                ((self.metrics.iter().sum::<f32>() + peace) * 200. - self.core.tips as f32 * 15.).clamp(0., 1000.) as u32;
        }
        if self.time >= self.duration {
            self.finished = true;
        }
    }
    fn add(&mut self, q: f32, dt: f32) {
        self.tally += q * dt;
        self.possible += dt;
    }
    fn steps(&mut self, i: &InputFrame, t: f32, events: &mut Vec<SimEvent>) {
        for lane in 0..2 {
            let bit = if lane == 0 { b::STEP_L } else { b::STEP_R };
            if i.just(bit) {
                if self.last_step != lane {
                    if self.last_step_t >= 0. {
                        let gap = t - self.last_step_t;
                        self.pace = 1. / gap.max(0.1);
                    }
                    self.last_step = lane;
                    self.last_step_t = t;
                    self.hits += 1;
                    events.push(SimEvent::Sfx { id: 6, gain: 0.55, pitch: 1. });
                } else {
                    self.misses += 1;
                }
            }
        }
    }
    pub fn gate(n: i32) -> f32 {
        (n as f32 * 1.7).sin() * 0.6
    }
    pub fn skill(&self) -> [f32; 4] {
        let mut out = [0.; 4];
        for (n, v) in out.iter_mut().enumerate() {
            *v = (self.metrics[n] / self.weights[n].max(if n == 3 { 8. } else { 0.001 })).clamp(0., 1.);
        }
        out
    }
    pub fn bot(&self, r: &Rules, dt: f32) -> InputFrame {
        let mut i = InputFrame::default();
        let (k, t) = self.effective();
        let mut target = Vec2::ZERO;
        match k {
            Kind::Breath => {
                if t % 8. < 4. {
                    i.held |= b::CONFIRM;
                }
            }
            Kind::Pose => target = self.target_at(t + 0.17),
            Kind::Squat => {
                if t % 5. < 2. {
                    i.held |= b::CONFIRM;
                }
            }
            Kind::Plank => i.held = b::STEP_L | b::STEP_R,
            Kind::Step => {
                for n in &self.notes {
                    if !n.judged && n.t >= t - dt * 0.5 && n.t < t + dt * 0.6 {
                        i.pressed |= if n.lane == 0 { b::STEP_L } else { b::STEP_R };
                        i.held = i.pressed;
                    }
                }
            }
            Kind::Spin => {
                let dir = if (t / 15.) as u32 % 2 == 0 { 1. } else { -1. };
                let a = if dir > 0. { t * 7.5 } else { -(t - 15.) * 7.5 + 112.5 };
                i.lean = Vec2::new(a.cos(), a.sin()) * 0.7;
                let bit = if (self.next_catch / 5.) as u32 % 2 == 0 { b::STEP_R } else { b::STEP_L };
                if (self.next_catch - t).abs() < dt {
                    i.pressed |= bit;
                    i.held = i.pressed;
                }
                return i;
            }
            Kind::Lap => {
                target.x = (t * 0.38).sin() * 0.85 / 1.2;
                let n = (t / 0.5).floor() as i32;
                let prev = ((t - dt).max(0.) / 0.5).floor() as i32;
                if n != prev || t < dt {
                    let bit = if n % 2 == 0 { b::STEP_L } else { b::STEP_R };
                    i.pressed |= bit;
                    i.held = i.pressed;
                }
            }
            Kind::Paddle => {
                target = Vec2::new(Self::gate((self.progress * 9.).floor().min(8.) as i32), 0.5);
            }
            Kind::Tide => {
                if let Some(sh) = self.shells.iter().filter(|s| !s.potted).next() {
                    let pool =
                        self.pools.iter().min_by(|a, b| a.distance_squared(sh.p).total_cmp(&b.distance_squared(sh.p))).unwrap();
                    let desired = (*pool - sh.p) * 2. - sh.v * 1.5;
                    target = Vec2::new(desired.x, -desired.y).clamp_length_max(0.85);
                }
            }
            Kind::Tray => target = -self.gust(t, r) / r.stiffness - Self::tray_env(t),
            Kind::Dive => {
                let cycle = (t - self.phase_start) % 1.2;
                if self.dive_presses < 4 && (cycle - 0.9).abs() < dt * 0.6 {
                    i.pressed = b::CONFIRM;
                    i.held = b::CONFIRM;
                }
                if self.dive_presses >= 4 {
                    i.held = b::CONFIRM;
                    target.x = 0.18;
                }
            }
            Kind::Finale => return i,
            Kind::Check => {
                if (12.0..33.0).contains(&t) {
                    target.x = [-0.7, 0.55, -0.35][(((t - 12.) / 7.) as usize).min(2)];
                }
                if (43.0..47.8).contains(&t) {
                    let n = ((t - 43.) / 0.6).round() as i32;
                    if (t - 43. - n as f32 * 0.6).abs() < dt * 0.6 {
                        let bit = if n % 2 == 0 { b::STEP_L } else { b::STEP_R };
                        i.held = bit;
                        i.pressed = bit;
                    }
                }
            }
        }
        i.lean = self.core.steer(target, t, 1., r);
        i
    }
}
