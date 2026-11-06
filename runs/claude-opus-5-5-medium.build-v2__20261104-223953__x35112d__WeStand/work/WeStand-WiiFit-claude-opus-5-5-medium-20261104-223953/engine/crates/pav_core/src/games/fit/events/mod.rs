//! The events. Each is a state struct with `start`, `tick`, `bot`, `hud` and `score`, dispatched
//! through one enum so the game stays `Clone` + serde. To add an event: a file here, a line in
//! `EvKind` and the `Ev` matches, a section in `rules.rs`, a card in `script.toml`.

use std::f32::consts::{PI, TAU};

use glam::{Quat, Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::core::BalanceCore;
use super::rules::Rules;
use super::ui_model::*;
use crate::color::Color;
use crate::entity::{EntityId, Spawn};
use crate::frame::SimEvent;
use crate::shape::{Shape, Visual};
use crate::sim::Sim;

pub mod breath;
pub mod cannon;
pub mod lap;
pub mod paddle;
pub mod plank;
pub mod pose;
pub mod spin;
pub mod squats;
pub mod step;
pub mod stillness;
pub mod tide;
pub mod tray;

/// Set numbers (`SETS` in the game's order).
pub const HUB: usize = 0;
pub const STUDIO: usize = 1;
pub const GAZEBO: usize = 2;
pub const BOARDWALK: usize = 3;
pub const TIDE: usize = 4;
pub const CHANNEL: usize = 5;
pub const PIER: usize = 6;
pub const TOWER: usize = 7;
pub const BAY: usize = 8;

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum EvKind {
    Breath,
    Pose,
    Squats,
    Plank,
    Step,
    Spin,
    Lap,
    Tide,
    Paddle,
    Tray,
    Cannon,
}

pub const ALL_EVENTS: [EvKind; 11] = [
    EvKind::Breath,
    EvKind::Pose,
    EvKind::Squats,
    EvKind::Plank,
    EvKind::Step,
    EvKind::Spin,
    EvKind::Lap,
    EvKind::Tide,
    EvKind::Paddle,
    EvKind::Tray,
    EvKind::Cannon,
];

impl EvKind {
    pub fn key(self) -> &'static str {
        match self {
            EvKind::Breath => "breath",
            EvKind::Pose => "pose",
            EvKind::Squats => "squats",
            EvKind::Plank => "plank",
            EvKind::Step => "step",
            EvKind::Spin => "spin",
            EvKind::Lap => "lap",
            EvKind::Tide => "tide",
            EvKind::Paddle => "paddle",
            EvKind::Tray => "tray",
            EvKind::Cannon => "cannon",
        }
    }
    pub fn from_key(k: &str) -> Option<Self> {
        ALL_EVENTS.iter().copied().find(|e| e.key() == k)
    }
    pub fn name(self) -> &'static str {
        match self {
            EvKind::Breath => "Breath Bloom",
            EvKind::Pose => "Pose Parade",
            EvKind::Squats => "Tempo Squats",
            EvKind::Plank => "Plank Standoff",
            EvKind::Step => "Step Party",
            EvKind::Spin => "Floatie Spin",
            EvKind::Lap => "Morning Lap",
            EvKind::Tide => "Tide Table",
            EvKind::Paddle => "Paddle Slalom",
            EvKind::Tray => "Tray Trek",
            EvKind::Cannon => "Cannonball Cup",
        }
    }
    /// The day it opens.
    pub fn day(self) -> u8 {
        match self {
            EvKind::Breath | EvKind::Pose => 1,
            EvKind::Squats | EvKind::Plank => 2,
            EvKind::Step | EvKind::Spin | EvKind::Lap => 3,
            _ => 4,
        }
    }
    /// 0 Stillness, 1 Strength, 2 Cardio, 3 Lagoon.
    pub fn pavilion(self) -> usize {
        self.day() as usize - 1
    }
    pub fn set(self) -> usize {
        match self {
            EvKind::Breath | EvKind::Pose => STUDIO,
            EvKind::Squats | EvKind::Plank => GAZEBO,
            EvKind::Step | EvKind::Spin => BOARDWALK,
            EvKind::Lap => HUB,
            EvKind::Tide => TIDE,
            EvKind::Paddle => CHANNEL,
            EvKind::Tray => PIER,
            EvKind::Cannon => TOWER,
        }
    }
    pub fn coach(self) -> u8 {
        (self.pavilion() as u8) + 1
    }
    /// Where a ghost runs, beside the player.
    pub fn lane(self) -> Vec3 {
        match self {
            EvKind::Paddle => Vec3::X * 3.0,
            EvKind::Lap | EvKind::Tray => Vec3::X * 1.6,
            EvKind::Cannon => Vec3::NEG_X * 2.0,
            EvKind::Tide => Vec3::new(2.5, 0.0, -2.5),
            _ => Vec3::X * 2.4,
        }
    }
}

pub const PAVILIONS: [&str; 4] = ["Stillness Studio", "Iron Gazebo", "Boardwalk", "Lagoon"];

/// What the player gave, in the game's terms. The bot and attract mode give the same.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Intent {
    pub lean: Vec2,
    pub keys: bool,
    pub act: bool,
    pub act_p: bool,
    pub l: bool,
    pub l_p: bool,
    pub r: bool,
    pub r_p: bool,
    pub song_pos: Option<f32>,
}

impl Intent {
    pub fn brace(&self) -> bool {
        self.l && self.r
    }
}

/// Where the camera should be: tilt, yaw, distance, fov, height, focus.
#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Shot {
    pub tilt: f32,
    pub yaw: f32,
    pub distance: f32,
    pub fov: f32,
    pub height: f32,
    pub focus: Vec3,
}

/// What an event may touch while it runs.
pub struct Cx<'a> {
    pub sim: &'a mut Sim,
    pub ev: &'a mut Vec<SimEvent>,
    pub r: &'a Rules,
    pub dt: f32,
    pub core: &'a mut BalanceCore,
    pub actors: &'a mut Vec<EntityId>,
    pub spots: &'a super::Spots,
    pub pid: EntityId,
    pub shot: &'a mut Shot,
    pub msg: &'a mut Option<(String, f32)>,
    pub seed: u32,
    pub demo: bool,
    pub slump: f32,
    pub day: u8,
    pub flops: &'a mut [bool; 5],
    pub flop_ids: &'a [Option<EntityId>; 5],
}

impl Cx<'_> {
    pub fn spot(&self, set: usize, name: &str) -> Vec3 {
        self.spots.get(set, name)
    }

    pub fn prop(&mut self, asset: &str, pos: Vec3, yaw: f32, scale: f32) -> EntityId {
        self.prop_color(asset, pos, yaw, scale, "#46bec8")
    }

    pub fn prop_color(&mut self, asset: &str, pos: Vec3, yaw: f32, scale: f32, accent: &str) -> EntityId {
        let id = spawn_prop(self.sim, asset, pos, yaw, scale, accent);
        self.actors.push(id);
        id
    }

    pub fn ball(&mut self, radius: f32, color: &str, pos: Vec3) -> EntityId {
        let id = self.sim.spawn(Spawn::new("~fx", pos).visual(Visual::new(Shape::Sphere { radius }, Color::hex(color))));
        self.actors.push(id);
        id
    }

    pub fn place(&mut self, id: EntityId, pos: Vec3, rot: Quat) {
        if let Some(e) = self.sim.state.entities.get_mut(id) {
            e.pos = pos;
            e.rot = rot;
        }
    }

    /// Puts the player's feet at `pos`, facing `yaw` (radians, 0 = +Z).
    pub fn player(&mut self, pos: Vec3, yaw: f32) {
        self.sim.set_position(self.pid, pos);
        self.face(yaw);
    }

    pub fn face(&mut self, yaw: f32) {
        if let Some(ch) = self.sim.state.entities.get_mut(self.pid).and_then(|e| e.character.as_mut()) {
            ch.facing = yaw;
            ch.anim.facing = yaw;
        }
    }

    pub fn anim(&mut self) -> Option<&mut crate::puppet::PuppetState> {
        self.sim.state.entities.get_mut(self.pid).and_then(|e| e.character.as_mut()).map(|c| &mut c.anim)
    }

    /// Beyond 0.75 the arms flail, over whatever the body was holding; back under 0.7 it returns.
    fn flailing(&mut self) -> bool {
        let far = self.core.cob.length();
        let flail = crate::clips::find_cached("FIT/ArmFlail");
        let Some(a) = self.anim() else { return false };
        let on = a.clip == flail && a.clip_flags & crate::clips::STOP == 0;
        if far > 0.75 || (on && far > 0.7) {
            a.play_clip(flail, crate::clips::UPPER, 1.0);
            return true;
        }
        false
    }

    /// Plays a looping clip on the whole body.
    pub fn clip(&mut self, name: &str, speed: f32) {
        if self.flailing() {
            return;
        }
        let id = crate::clips::find_cached(name);
        if let Some(a) = self.anim() {
            a.play_clip(id, 0, speed);
        }
    }

    /// One-shot gesture on top.
    pub fn gesture(&mut self, name: &str) {
        let id = crate::clips::find_cached(name);
        if let Some(a) = self.anim() {
            a.replay_clip(id, crate::clips::ONCE | crate::clips::QUICK, 1.0);
        }
    }

    /// Holds a clip at `frac` of the way through: the game drives it (depth, breath).
    pub fn scrub(&mut self, name: &str, frac: f32) {
        if self.flailing() {
            return;
        }
        self.scrub_held(name, frac);
    }

    /// `scrub`, with the arms kept to the clip: a tuck in the air is leaned on purpose.
    pub fn scrub_held(&mut self, name: &str, frac: f32) {
        let id = crate::clips::find_cached(name);
        let dur = crate::clips::with(id, |c| c.dur).unwrap_or(1.0);
        if let Some(a) = self.anim() {
            a.play_clip(id, 0, 1e-6);
            a.clip_t = frac.clamp(0.0, 1.0) * dur * 0.999;
        }
    }

    pub fn stop_clip(&mut self) {
        if let Some(a) = self.anim() {
            a.stop_clip();
        }
    }

    /// The figure tilts with the dot, seen from a camera at `cam_yaw` degrees.
    pub fn lean_body(&mut self, cam_yaw: f32) {
        let cob = self.core.cob;
        let slump = self.slump;
        self.lean_body_by(cob, cam_yaw, slump);
    }

    pub fn lean_body_by(&mut self, cob: Vec2, cam_yaw: f32, slump: f32) {
        let y = cam_yaw.to_radians();
        let right = Vec3::new(y.cos(), 0.0, y.sin());
        let fwd = Vec3::new(y.sin(), 0.0, -y.cos());
        let w = (right * cob.x + fwd * cob.y) * 14f32.to_radians();
        let flail = crate::clips::find_cached("FIT/ArmFlail");
        let far = self.core.cob.length();
        if let Some(a) = self.anim() {
            a.tilt_side = w.x;
            a.tilt_fwd = w.z + slump;
            a.tilt_pivot = 0.0;
            if far > 0.75 && a.clip == 0 {
                a.play_clip(flail, crate::clips::UPPER, 1.0);
            } else if far <= 0.7 && a.clip == flail {
                a.stop_clip();
            }
        }
    }

    pub fn sfx(&mut self, id: u8, gain: f32, pitch: f32) {
        self.ev.push(SimEvent::Sfx { id, gain, pitch });
    }

    pub fn say(&mut self, text: impl Into<String>, seconds: f32) {
        *self.msg = Some((text.into(), seconds));
    }

    pub fn pick(&mut self, key: &str) -> String {
        let n = self.sim.state.rng.next_u32();
        super::script::line(key, n)
    }

    pub fn rng(&mut self) -> &mut crate::rng::Rng {
        &mut self.sim.state.rng
    }

    /// A tip: stumble and, over water, a splash.
    pub fn tip_fx(&mut self, water: bool) {
        self.gesture("FIT/Stumble");
        let at = self.sim.feet(self.pid).unwrap_or_default();
        if water {
            self.ev.push(SimEvent::Splash { pos: at });
        }
        self.sfx(super::sfx::GROAN, 0.5, 1.0);
    }

    /// Standard stage: the player in front of a mirror-style camera, facing it.
    pub fn mirror_shot(&mut self, focus: Vec3, distance: f32) {
        *self.shot = Shot { tilt: 12.0, yaw: 0.0, distance, fov: 36.0, height: 0.9, focus };
    }
}

pub fn spawn_prop(sim: &mut Sim, asset: &str, pos: Vec3, yaw: f32, scale: f32, accent: &str) -> EntityId {
    let name = format!("LIB/core/{asset}");
    let made = crate::props::resolve_placed(&name, &crate::props::Params::new()).ok().and_then(|(n, definition, params)| {
        let mut roles = std::collections::BTreeMap::new();
        roles.insert("$accent".to_string(), accent.to_string());
        crate::prop_instance::PropInstance::new(&n, definition, scale, false).ok()?.with_params(&params).ok()?.with_roles(roles).ok()
    });
    match made.and_then(|inst| sim.place_prop(inst, pos, Quat::from_rotation_y(yaw), None).ok()) {
        Some(id) => id,
        // A missing prop must not stop the game: a marker ball says so in captures.
        None => {
            log::error!("no prop {name}");
            sim.spawn(Spawn::new("~missing", pos).visual(Visual::new(Shape::Sphere { radius: 0.2 }, Color::hex("#ff00ff"))))
        }
    }
}

/// The state of whichever event is running.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum Ev {
    Breath(breath::Breath),
    Pose(pose::Pose),
    Squats(squats::Squats),
    Plank(plank::Plank),
    Step(step::Step),
    Spin(spin::Spin),
    Lap(lap::Lap),
    Tide(tide::Tide),
    Paddle(paddle::Paddle),
    Tray(tray::Tray),
    Cannon(cannon::Cannon),
}

/// Per-event options the finale and the medley use.
#[derive(Clone, Copy, Debug, Default)]
pub struct Opt {
    /// Replaces the event's length, when it has one.
    pub seconds: Option<f32>,
    /// Number of cycles, bars or rounds, when it has them.
    pub count: Option<u32>,
    /// A stage of the game's choosing: the finale's post.
    pub at: Option<Vec3>,
    pub band: bool,
}

macro_rules! each {
    ($s:expr, $e:ident => $x:expr) => {
        match $s {
            Ev::Breath($e) => $x,
            Ev::Pose($e) => $x,
            Ev::Squats($e) => $x,
            Ev::Plank($e) => $x,
            Ev::Step($e) => $x,
            Ev::Spin($e) => $x,
            Ev::Lap($e) => $x,
            Ev::Tide($e) => $x,
            Ev::Paddle($e) => $x,
            Ev::Tray($e) => $x,
            Ev::Cannon($e) => $x,
        }
    };
}

impl Ev {
    pub fn start(kind: EvKind, cx: &mut Cx, o: Opt) -> Ev {
        match kind {
            EvKind::Breath => Ev::Breath(breath::Breath::start(cx, o)),
            EvKind::Pose => Ev::Pose(pose::Pose::start(cx, o)),
            EvKind::Squats => Ev::Squats(squats::Squats::start(cx, o)),
            EvKind::Plank => Ev::Plank(plank::Plank::start(cx, o)),
            EvKind::Step => Ev::Step(step::Step::start(cx, o)),
            EvKind::Spin => Ev::Spin(spin::Spin::start(cx, o)),
            EvKind::Lap => Ev::Lap(lap::Lap::start(cx, o)),
            EvKind::Tide => Ev::Tide(tide::Tide::start(cx, o)),
            EvKind::Paddle => Ev::Paddle(paddle::Paddle::start(cx, o)),
            EvKind::Tray => Ev::Tray(tray::Tray::start(cx, o)),
            EvKind::Cannon => Ev::Cannon(cannon::Cannon::start(cx, o)),
        }
    }
    /// Returns true when the event is over.
    pub fn tick(&mut self, cx: &mut Cx, i: &Intent) -> bool {
        each!(self, e => e.tick(cx, i))
    }
    pub fn bot(&self, core: &BalanceCore, r: &Rules) -> Intent {
        each!(self, e => e.bot(core, r))
    }
    pub fn hud(&self, b: &mut B, core: &BalanceCore, r: &Rules) {
        each!(self, e => e.hud(b, core, r))
    }
    /// 0..=1000.
    pub fn score(&self, r: &Rules) -> u32 {
        (each!(self, e => e.score(r))).clamp(0.0, 1000.0).round() as u32
    }
    /// The running progress as a live number for the HUD.
    pub fn live(&self, r: &Rules) -> u32 {
        self.score(r)
    }
}

pub fn clamp01(x: f32) -> f32 {
    x.clamp(0.0, 1.0)
}

/// Spot a dot-steering PD uses in several bots.
pub fn pd(core: &BalanceCore, target: Vec2) -> Vec2 {
    // The body follows the lean closely, so aiming a bit past the target corrects its lag.
    (target + (target - core.cob) * 0.4 - core.vel * 0.05).clamp_length_max(1.0)
}

/// A pentatonic pitch ratio.
pub fn penta(i: u32) -> f32 {
    const S: [f32; 5] = [1.0, 1.122, 1.26, 1.498, 1.682];
    S[i as usize % 5] * 2f32.powi((i / 5) as i32)
}

pub const PUCK_TOP: [f32; 2] = [1700.0, 220.0];
pub const PUCK_R: f32 = 170.0;

pub fn timer(b: &mut B, left: f32) {
    b.title_left(60.0, 30.0, 80.0, INK, &format!("{:.0}", left.max(0.0).ceil()));
}

pub fn wrap_pi(a: f32) -> f32 {
    (a + PI).rem_euclid(TAU) - PI
}
