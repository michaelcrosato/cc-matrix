//! The events. One file per event, dispatched through an enum (`Clone` + serde). Every event has
//! a section in `rules.toml`, a bot that earns at least 2 stars, an idle outcome below 1 star, a
//! ghost lane and an attract segment. New event: add a file, an `EventKind` and arms below, a
//! card and lines in `script.toml`, a section in `rules.rs`, and a row in `Schedule`'s pavilions.

pub mod breath;
pub mod dive;
pub mod lap;
pub mod paddle;
pub mod plank;
pub mod pose;
pub mod spin;
pub mod squats;
pub mod step;
pub mod tide;
pub mod tray;

use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::core::BalanceCore;
use super::dialog::{Dialog, Who};
pub use super::intent::Intent;
use super::rules::Rules;
use super::ui_model::*;
use super::world::*;
use crate::entity::EntityId;
use crate::frame::SimEvent;
use crate::sim::Sim;

/// Which event. The order is the Schedule's.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum EventKind {
    #[default]
    BreathBloom,
    PoseParade,
    TempoSquats,
    PlankStandoff,
    StepParty,
    FloatieSpin,
    MorningLap,
    TideTable,
    PaddleSlalom,
    TrayTrek,
    CannonballCup,
    BigStand,
}

/// Every playable event but the finale.
pub const ALL: [EventKind; 11] = [
    EventKind::BreathBloom,
    EventKind::PoseParade,
    EventKind::TempoSquats,
    EventKind::PlankStandoff,
    EventKind::StepParty,
    EventKind::FloatieSpin,
    EventKind::MorningLap,
    EventKind::TideTable,
    EventKind::PaddleSlalom,
    EventKind::TrayTrek,
    EventKind::CannonballCup,
];

impl EventKind {
    pub fn key(self) -> &'static str {
        match self {
            EventKind::BreathBloom => "breath_bloom",
            EventKind::PoseParade => "pose_parade",
            EventKind::TempoSquats => "tempo_squats",
            EventKind::PlankStandoff => "plank_standoff",
            EventKind::StepParty => "step_party",
            EventKind::FloatieSpin => "floatie_spin",
            EventKind::MorningLap => "morning_lap",
            EventKind::TideTable => "tide_table",
            EventKind::PaddleSlalom => "paddle_slalom",
            EventKind::TrayTrek => "tray_trek",
            EventKind::CannonballCup => "cannonball_cup",
            EventKind::BigStand => "big_stand",
        }
    }
    pub fn name(self) -> &'static str {
        match self {
            EventKind::BreathBloom => "Breath Bloom",
            EventKind::PoseParade => "Pose Parade",
            EventKind::TempoSquats => "Tempo Squats",
            EventKind::PlankStandoff => "Plank Standoff",
            EventKind::StepParty => "Step Party",
            EventKind::FloatieSpin => "Floatie Spin",
            EventKind::MorningLap => "Morning Lap",
            EventKind::TideTable => "Tide Table",
            EventKind::PaddleSlalom => "Paddle Slalom",
            EventKind::TrayTrek => "Tray Trek",
            EventKind::CannonballCup => "Cannonball Cup",
            EventKind::BigStand => "The Big Stand",
        }
    }
    pub fn from_key(k: &str) -> Option<EventKind> {
        ALL.iter().copied().chain([EventKind::BigStand]).find(|e| e.key() == k)
    }
    pub fn coach(self) -> Who {
        match self {
            EventKind::BreathBloom | EventKind::PoseParade => Who::Posey,
            EventKind::TempoSquats | EventKind::PlankStandoff => Who::Kettle,
            EventKind::StepParty | EventKind::FloatieSpin | EventKind::MorningLap => Who::Bounce,
            EventKind::TideTable | EventKind::PaddleSlalom | EventKind::TrayTrek | EventKind::CannonballCup => Who::Gull,
            EventKind::BigStand => Who::Pip,
        }
    }
    /// The first day it is open.
    pub fn opens_on(self) -> u8 {
        match self {
            EventKind::BreathBloom | EventKind::PoseParade => 1,
            EventKind::TempoSquats | EventKind::PlankStandoff => 2,
            EventKind::StepParty | EventKind::FloatieSpin | EventKind::MorningLap => 3,
            EventKind::TideTable | EventKind::PaddleSlalom | EventKind::TrayTrek | EventKind::CannonballCup => 4,
            EventKind::BigStand => 5,
        }
    }
    pub fn set(self) -> Set {
        match self {
            EventKind::BreathBloom | EventKind::PoseParade => Set::Studio,
            EventKind::TempoSquats | EventKind::PlankStandoff => Set::Gazebo,
            EventKind::StepParty | EventKind::FloatieSpin => Set::Boardwalk,
            EventKind::MorningLap => Set::Hub,
            EventKind::TideTable => Set::Tide,
            EventKind::PaddleSlalom => Set::Channel,
            EventKind::TrayTrek => Set::Pier,
            EventKind::CannonballCup => Set::Tower,
            EventKind::BigStand => Set::Bay,
        }
    }
    /// Where the neighbouring lane is, per seat.
    pub fn lane(self) -> Vec3 {
        match self {
            EventKind::TideTable => Vec3::new(11.0, 0.0, 0.0),
            EventKind::PaddleSlalom => Vec3::new(3.0, 0.0, 0.0),
            EventKind::TrayTrek => Vec3::new(1.5, 0.0, 0.0),
            EventKind::CannonballCup => Vec3::new(2.2, 0.0, 0.0),
            EventKind::MorningLap => Vec3::new(1.2, 0.0, 0.0),
            EventKind::BreathBloom | EventKind::PoseParade => Vec3::new(-2.4, 0.0, -1.0),
            _ => Vec3::new(-2.6, 0.0, -0.6),
        }
    }
    /// What the ghost stands on (half size and height), when it stands on something.
    pub fn ghost_stands_on(self) -> Option<(Vec3, f32)> {
        match self {
            EventKind::PaddleSlalom => Some((Vec3::new(0.42, 0.05, 1.5), -0.02)),
            EventKind::TideTable => None,
            _ => None,
        }
    }
    /// Mouse-steered and step events keep the arrows as steps.
    pub fn arrows_step(self) -> bool {
        matches!(self, EventKind::StepParty | EventKind::FloatieSpin | EventKind::MorningLap | EventKind::PlankStandoff)
    }
}

/// What an event may touch while it runs.
pub struct Cx<'a> {
    pub sim: &'a mut Sim,
    pub rules: &'a Rules,
    pub ev: &'a mut Vec<SimEvent>,
    pub dt: f32,
    pub pid: EntityId,
    pub no_tips: bool,
    pub assist: f32,
    pub stages: &'a [Vec3; 9],
    pub day: u8,
    pub slump: f32,
    /// A seed for the course: the same on every copy in a session.
    pub seed: u64,
}

impl Cx<'_> {
    pub fn stage(&self, set: Set) -> Vec3 {
        self.stages[set as usize]
    }
    pub fn sfx(&mut self, id: u16, gain: f32, pitch: f32) {
        self.ev.push(SimEvent::Sfx { id, gain, pitch });
    }
    pub fn feet(&self) -> Vec3 {
        self.sim.feet(self.pid).unwrap_or(Vec3::ZERO)
    }
}

/// What every event shares.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct RunCommon {
    pub core: BalanceCore,
    /// Seconds of play.
    pub t: f32,
    /// The live score (0..1000), as the HUD shows it.
    pub score: f32,
    /// A coach's line on screen and how long it stays.
    pub quip: Option<Dialog>,
    pub quip_t: f32,
    /// Seconds the body clips leave a stumble alone.
    pub stun: f32,
    /// The dot's recent path (dev view).
    pub trace: Vec<[f32; 2]>,
    pub show_trace: bool,
    pub ghost_dot: Option<[f32; 2]>,
    pub ghost_score: Option<f32>,
}

impl RunCommon {
    pub fn say(&mut self, who: Who, text: impl Into<String>) {
        self.quip = Some(Dialog::new(who, vec![text.into()]));
        self.quip_t = 4.2;
    }
    /// A line from a list in `script.toml`.
    pub fn say_key(&mut self, who: Who, key: &str, i: usize) {
        self.say(who, super::script::line(key, i));
    }
    pub fn step(&mut self, cx: &mut Cx, lean: Vec2, amp: f32, gust: Vec2, nudge: Vec2) {
        let a = amp * (1.0 - cx.assist * 0.6);
        let r = &cx.rules.core;
        self.core.step(lean, r, a, gust, nudge, !cx.no_tips, cx.dt, &mut cx.sim.state.rng);
        if self.show_trace {
            self.trace.push([self.core.cob.x, self.core.cob.y]);
            if self.trace.len() > 120 {
                self.trace.remove(0);
            }
        }
    }
    /// The body follows the dot; past 0.75 the arms flail over `clip`.
    pub fn body(&mut self, cx: &mut Cx, yaw: f32, clip: Option<&str>) {
        self.stun = (self.stun - cx.dt).max(0.0);
        lean_figure(cx.sim, cx.pid, self.core.cob, yaw, cx.rules.core.tilt_deg, cx.slump);
        if self.stun > 0.0 {
            return;
        }
        if self.core.cob.length() > 0.75 {
            play_flags(cx.sim, cx.pid, "FIT/ArmFlail", crate::clips::UPPER, 0.0);
        } else {
            match clip {
                Some(c) => play(cx.sim, cx.pid, c),
                None => stop_clip(cx.sim, cx.pid),
            }
        }
    }
    /// A tip: a stumble and, over water, a splash.
    pub fn tip_fx(&mut self, cx: &mut Cx, water: bool) {
        self.stun = 1.0;
        gesture(cx.sim, cx.pid, "FIT/Stumble", false);
        let at = cx.feet();
        if water {
            cx.ev.push(SimEvent::BigSplash { pos: at, size: 0.5 });
            cx.sfx(sound::SPLASH_B, 0.7, 1.1);
        } else {
            cx.sfx(sound::BUMP, 0.8, 1.0);
        }
    }
    pub fn puck(&self, top: bool) -> Puck {
        let c = if top { [960.0, 205.0] } else { [960.0, 770.0] };
        Puck {
            c,
            r: 170.0,
            dot: [self.core.cob.x, self.core.cob.y],
            danger: self.core.danger(),
            trace: if self.show_trace { self.trace.clone() } else { Vec::new() },
            ghost: self.ghost_dot,
            good: true,
            ..Default::default()
        }
    }
    /// Event name and time left at the top left, score at the top right.
    pub fn top_bar(&self, ui: &mut Ui, name: &str, left: Option<f32>) {
        ui.panel(36.0, 30.0, 470.0, 112.0, with_alpha(WHITE, 0.93), 30.0);
        ui.label(60.0, 40.0, 42.0, INK, Align::Left, name);
        if let Some(l) = left {
            ui.text(60.0, 88.0, 38.0, INK_SOFT, Align::Left, format!("{:.0} s left", l.max(0.0).ceil()));
        }
        ui.panel(1474.0, 30.0, 410.0, 112.0, with_alpha(WHITE, 0.93), 30.0);
        ui.text(1860.0, 38.0, 34.0, INK_SOFT, Align::Right, "Score");
        ui.label(1860.0, 72.0, 58.0, INK, Align::Right, format!("{:.0}", self.score));
        if let Some(g) = self.ghost_score {
            ui.panel(1474.0, 150.0, 410.0, 64.0, with_alpha(WHITE, 0.93), 26.0);
            ui.text(1860.0, 158.0, 34.0, CORAL, Align::Right, format!("You, before: {g:.0}"));
        }
    }
}

/// An event's own state.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum EventState {
    Breath(breath::BreathBloom),
    Pose(pose::PoseParade),
    Squats(squats::TempoSquats),
    Plank(plank::PlankStandoff),
    Step(step::StepParty),
    Spin(spin::FloatieSpin),
    Lap(lap::MorningLap),
    Tide(tide::TideTable),
    Paddle(paddle::PaddleSlalom),
    Tray(tray::TrayTrek),
    Dive(dive::CannonballCup),
    Stand(Box<super::finale::BigStand>),
}

macro_rules! each {
    ($s:expr, $e:ident => $b:expr) => {
        match $s {
            EventState::Breath($e) => $b,
            EventState::Pose($e) => $b,
            EventState::Squats($e) => $b,
            EventState::Plank($e) => $b,
            EventState::Step($e) => $b,
            EventState::Spin($e) => $b,
            EventState::Lap($e) => $b,
            EventState::Tide($e) => $b,
            EventState::Paddle($e) => $b,
            EventState::Tray($e) => $b,
            EventState::Dive($e) => $b,
            EventState::Stand($e) => $b,
        }
    };
}

impl EventState {
    /// The standard run of `kind` (the finale builds its own from the same pieces).
    pub fn new(kind: EventKind, day: u8, r: &Rules) -> EventState {
        match kind {
            EventKind::BreathBloom => EventState::Breath(breath::BreathBloom::new(r.breath.cycles as usize)),
            EventKind::PoseParade => EventState::Pose(pose::PoseParade::new(day, r.pose.count as usize, r.pose.length)),
            EventKind::TempoSquats => EventState::Squats(squats::TempoSquats::new()),
            EventKind::PlankStandoff => EventState::Plank(plank::PlankStandoff::new(r.plank.length, false)),
            EventKind::StepParty => EventState::Step(step::StepParty::new(None)),
            EventKind::FloatieSpin => EventState::Spin(spin::FloatieSpin::new()),
            EventKind::MorningLap => EventState::Lap(lap::MorningLap::new()),
            EventKind::TideTable => EventState::Tide(tide::TideTable::new()),
            EventKind::PaddleSlalom => EventState::Paddle(paddle::PaddleSlalom::new()),
            EventKind::TrayTrek => EventState::Tray(tray::TrayTrek::new()),
            EventKind::CannonballCup => EventState::Dive(dive::CannonballCup::new()),
            EventKind::BigStand => EventState::Stand(Box::new(super::finale::BigStand::new(0))),
        }
    }
    pub fn start(&mut self, c: &mut RunCommon, cx: &mut Cx) {
        each!(self, e => e.start(c, cx))
    }
    /// One tick; `Some(score)` when the event is over.
    pub fn tick(&mut self, c: &mut RunCommon, cx: &mut Cx, it: &Intent) -> Option<f32> {
        each!(self, e => e.tick(c, cx, it))
    }
    pub fn stop(&mut self, cx: &mut Cx) {
        each!(self, e => e.stop(cx))
    }
    pub fn hud(&self, c: &RunCommon, r: &Rules, ui: &mut Ui) {
        each!(self, e => e.hud(c, r, ui))
    }
    pub fn bot(&self, c: &RunCommon, r: &Rules) -> Intent {
        each!(self, e => e.bot(c, r))
    }
    pub fn song(&self) -> u8 {
        match self {
            EventState::Breath(_) | EventState::Pose(_) => song::TIDE,
            EventState::Squats(_) | EventState::Plank(_) => song::WALTZ,
            EventState::Step(_) | EventState::Spin(_) => song::STEP,
            EventState::Lap(_) => song::LOBBY,
            EventState::Stand(_) => song::BAND,
            _ => song::MALLETS,
        }
    }
    /// The figure's clip to record in a ghost (the same one the world shows).
    pub fn lean_fast(&self) -> bool {
        matches!(self, EventState::Spin(_))
    }
}

/// The mirror camera from section 4.
pub fn mirror_cam(sim: &mut Sim) {
    cam(sim, 12.0, 0.0, 8.5, 36.0);
}

/// Puts the player on a spot, ready for the event.
pub fn ready_player(cx: &mut Cx, set: Set, feet: Vec3, facing: f32) {
    show_set(cx.sim, set);
    place(cx.sim, cx.pid, feet, facing);
    stop_clip(cx.sim, cx.pid);
    clear_lean(cx.sim, cx.pid);
}
