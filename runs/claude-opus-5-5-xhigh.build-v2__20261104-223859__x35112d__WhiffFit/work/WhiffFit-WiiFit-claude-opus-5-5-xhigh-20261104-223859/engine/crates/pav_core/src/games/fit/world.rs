//! The sets (one room each, on one `Sim`) and small helpers that move things around in them.

use std::collections::BTreeMap;
use std::sync::Arc;

use anyhow::{Result, anyhow};
use glam::{Quat, Vec2, Vec3};
use serde::{Deserialize, Serialize};

use crate::color::Color;
use crate::entity::{EntityId, Spawn};
use crate::frame::SimEvent;
use crate::level::Placement;
use crate::params::ParamValue;
use crate::puppet::PuppetState;
use crate::room::RoomDef;
use crate::shape::{Shape, Visual};
use crate::sim::Sim;
use crate::world::{RoomSlot, World};
use crate::zones::{CameraCue, Sweep};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[repr(u8)]
pub enum Set {
    #[default]
    Hub = 0,
    Studio = 1,
    Gazebo = 2,
    Boardwalk = 3,
    Tide = 4,
    Channel = 5,
    Pier = 6,
    Tower = 7,
    Bay = 8,
}

/// Every set's key and text. The file is read from disk when running from `engine/`.
const SETS: [(&str, &str); 9] = [
    ("fit/sets/hub", include_str!("sets/hub.toml")),
    ("fit/sets/studio", include_str!("sets/studio.toml")),
    ("fit/sets/gazebo", include_str!("sets/gazebo.toml")),
    ("fit/sets/boardwalk", include_str!("sets/boardwalk.toml")),
    ("fit/sets/tide", include_str!("sets/tide.toml")),
    ("fit/sets/channel", include_str!("sets/channel.toml")),
    ("fit/sets/pier", include_str!("sets/pier.toml")),
    ("fit/sets/tower", include_str!("sets/tower.toml")),
    ("fit/sets/bay", include_str!("sets/bay.toml")),
];

/// Metres between set origins: far enough that fog hides each from the next.
const SPACING: f32 = 500.0;

/// Builds all the sets into the sim's world.
pub fn load_sets(sim: &mut Sim) -> Result<()> {
    let mut rooms = Vec::new();
    for (i, (key, text)) in SETS.iter().enumerate() {
        let mut def = RoomDef::parse(&super::super::level_text(key, text)).map_err(|e| anyhow!("{key}: {e}"))?;
        def.layout.origin = Vec3::new(i as f32 * SPACING, 0.0, 0.0);
        let place = Placement::new(def.layout.origin, 0);
        let (cols, rows) = def.layout.extent();
        let (min, max) = place.aabb(Vec3::new(0.0, -1.0, 0.0), Vec3::new(cols as f32, def.height.max(2.0), rows as f32));
        let start = def.local_start();
        let inward = -def.entrance.facing.dir();
        rooms.push(RoomSlot {
            id: i as u16,
            key: key.rsplit('/').next().unwrap_or(key).to_string(),
            def: Arc::new(def),
            place,
            min,
            max,
            inside: place.point(start),
            outside: place.point(start) - inward * 4.0,
            inward,
            built: false,
        });
    }
    let n = rooms.len() as u16;
    sim.state.world = World { enabled: false, rooms, current_room: Some(0), only_current: true, ..Default::default() };
    for i in 0..n {
        sim.build_room(i);
    }
    Ok(())
}

/// A set's markers named `name`.
pub fn set_markers(sim: &mut Sim, set: Set, name: &str) -> Vec<Vec3> {
    let was = sim.state.world.current_room;
    sim.state.world.current_room = Some(set as u16);
    let out = crate::scenes::markers(sim, name);
    sim.state.world.current_room = was;
    out
}

/// Makes `set` the one on screen (its [camera] and [view] apply; the app irises to it).
pub fn show_set(sim: &mut Sim, set: Set) {
    sim.state.world.current_room = Some(set as u16);
}

pub fn current_set(sim: &Sim) -> Set {
    match sim.state.world.current_room.unwrap_or(0) {
        1 => Set::Studio,
        2 => Set::Gazebo,
        3 => Set::Boardwalk,
        4 => Set::Tide,
        5 => Set::Channel,
        6 => Set::Pier,
        7 => Set::Tower,
        8 => Set::Bay,
        _ => Set::Hub,
    }
}

/// An NPC from a set's file, by name.
pub fn npc(sim: &Sim, name: &str) -> Option<EntityId> {
    sim.state.entities.iter().find(|e| e.name == name && e.character.is_some()).map(|e| e.id)
}

/// The game's own prop copy with no collision; it stays where it is told.
pub fn spawn_prop(sim: &mut Sim, asset: &str, pos: Vec3, yaw: f32, scale: f32) -> EntityId {
    spawn_prop_roles(sim, asset, pos, yaw, scale, &[])
}

pub fn spawn_prop_roles(sim: &mut Sim, asset: &str, pos: Vec3, yaw: f32, scale: f32, roles: &[(&str, &str)]) -> EntityId {
    let placed = crate::props::resolve_placed(asset, &crate::props::Params::new()).and_then(|(name, def, params)| {
        let roles: BTreeMap<String, String> = roles.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect();
        crate::prop_instance::PropInstance::new(&name, def, scale, false)?.with_params(&params)?.with_roles(roles)
    });
    match placed.and_then(|copy| sim.place_prop(copy, pos, Quat::from_rotation_y(yaw), None)) {
        Ok(id) => id,
        Err(e) => {
            log::error!("prop {asset}: {e}");
            spawn_ball(sim, "missing", pos, 0.2, "#ff00ff")
        }
    }
}

pub fn spawn_ball(sim: &mut Sim, name: &str, pos: Vec3, radius: f32, color: &str) -> EntityId {
    sim.spawn(Spawn::new(name, pos).visual(Visual::new(Shape::Sphere { radius }, Color::hex(color))))
}

pub fn spawn_box(sim: &mut Sim, name: &str, pos: Vec3, half: Vec3, color: &str) -> EntityId {
    sim.spawn(Spawn::new(name, pos).visual(Visual::new(Shape::RoundedBox { half, radius: half.min_element() * 0.4 }, Color::hex(color))))
}

pub fn spawn_cyl(sim: &mut Sim, name: &str, pos: Vec3, half_height: f32, radius: f32, color: &str) -> EntityId {
    sim.spawn(Spawn::new(name, pos).visual(Visual::new(Shape::Cylinder { half_height, radius }, Color::hex(color))))
}

/// Moves a no-physics entity.
pub fn pose(sim: &mut Sim, id: EntityId, pos: Vec3, rot: Quat) {
    if let Some(e) = sim.state.entities.get_mut(id) {
        e.pos = pos;
        e.rot = rot;
    }
}

pub fn move_to(sim: &mut Sim, id: EntityId, pos: Vec3) {
    if let Some(e) = sim.state.entities.get_mut(id) {
        e.pos = pos;
    }
}

pub fn pos_of(sim: &Sim, id: EntityId) -> Vec3 {
    sim.state.entities.get(id).map(|e| e.pos).unwrap_or(Vec3::ZERO)
}

pub fn despawn_all(sim: &mut Sim, ids: &mut Vec<EntityId>) {
    for id in ids.drain(..) {
        sim.despawn(id);
    }
}

/// Puts a character's feet at `feet` facing `facing` (radians, 0 = +Z).
pub fn place(sim: &mut Sim, id: EntityId, feet: Vec3, facing: f32) {
    sim.set_position(id, feet);
    set_facing(sim, id, facing);
}

pub fn set_facing(sim: &mut Sim, id: EntityId, facing: f32) {
    if let Some(ch) = sim.state.entities.get_mut(id).and_then(|e| e.character.as_mut()) {
        ch.facing = facing;
        ch.anim.facing = facing;
    }
}

pub fn anim_of(sim: &mut Sim, id: EntityId) -> Option<&mut PuppetState> {
    sim.state.entities.get_mut(id).and_then(|e| e.character.as_mut()).map(|c| &mut c.anim)
}

pub fn clip_id(name: &str) -> u32 {
    crate::clips::find_cached(name)
}

/// Plays a looping clip (asking again keeps it going).
pub fn play(sim: &mut Sim, id: EntityId, clip: &str) {
    let c = clip_id(clip);
    if let Some(a) = anim_of(sim, id) {
        a.play_clip(c, 0, 0.0);
    }
}

pub fn play_flags(sim: &mut Sim, id: EntityId, clip: &str, flags: u8, speed: f32) {
    let c = clip_id(clip);
    if let Some(a) = anim_of(sim, id) {
        a.play_clip(c, flags, speed);
    }
}

/// A one-shot gesture from its start.
pub fn gesture(sim: &mut Sim, id: EntityId, clip: &str, upper: bool) {
    let c = clip_id(clip);
    let flags = crate::clips::ONCE | if upper { crate::clips::UPPER } else { 0 };
    if let Some(a) = anim_of(sim, id) {
        a.replay_clip(c, flags, 0.0);
    }
}

/// Holds a clip at time `t` (gameplay scrubs it).
pub fn scrub(sim: &mut Sim, id: EntityId, clip: &str, t: f32) {
    let c = clip_id(clip);
    if let Some(a) = anim_of(sim, id) {
        a.play_clip(c, crate::clips::CLAMP, 1e-6);
        a.clip_t = t;
    }
}

pub fn stop_clip(sim: &mut Sim, id: EntityId) {
    if let Some(a) = anim_of(sim, id) {
        a.stop_clip();
    }
}

/// Leans the whole figure by a screen-space dot from a camera at `cam_yaw` degrees: x toward
/// the camera's right, y away from it, `deg` degrees at full lean, plus a forward slump (radians).
pub fn lean_figure(sim: &mut Sim, id: EntityId, dot: Vec2, cam_yaw: f32, deg: f32, slump: f32) {
    let y = cam_yaw.to_radians();
    let right = Vec3::new(y.cos(), 0.0, y.sin());
    let away = Vec3::new(y.sin(), 0.0, -y.cos());
    let world = (right * dot.x + away * dot.y) * deg.to_radians();
    if let Some(a) = anim_of(sim, id) {
        let (s, c) = a.facing.sin_cos();
        let fwd = Vec3::new(s, 0.0, c);
        let side = Vec3::new(c, 0.0, -s);
        a.tilt_side = world.dot(side);
        a.tilt_fwd = world.dot(fwd) + slump;
    }
}

pub fn clear_lean(sim: &mut Sim, id: EntityId) {
    if let Some(a) = anim_of(sim, id) {
        a.tilt_side = 0.0;
        a.tilt_fwd = 0.0;
    }
}

/// The camera, blended over 0.7 s. Yaw 0 looks north at a figure facing +Z (the mirror view).
pub fn cam(sim: &mut Sim, tilt: f32, yaw: f32, distance: f32, fov: f32) {
    cam_full(sim, tilt, yaw, distance, fov, 0.8, 0.12, None);
}

#[allow(clippy::too_many_arguments)]
pub fn cam_full(sim: &mut Sim, tilt: f32, yaw: f32, distance: f32, fov: f32, height: f32, lag: f32, sweep: Option<(&str, f32, f32, f32)>) {
    let set: BTreeMap<String, ParamValue> = [
        ("tilt", tilt),
        ("yaw", yaw),
        ("distance", distance),
        ("fov", fov),
        ("height_offset", height),
        ("follow_lag", lag),
    ]
    .into_iter()
    .map(|(k, v)| (k.to_string(), ParamValue::Float(v as f64)))
    .collect();
    let sweep = sweep
        .map(|(param, from, to, period)| vec![Sweep { param: param.to_string(), from, to, period, phase: 0.0 }])
        .unwrap_or_default();
    let c = &mut sim.state.courses;
    c.sticky_cue = Some(Arc::new(CameraCue { set, sweep, flip_ortho: 0.0 }));
    c.cue_serial += 1;
}

/// A slow orbit (result screens, the title's sweep).
pub fn cam_orbit(sim: &mut Sim, tilt: f32, distance: f32, fov: f32, height: f32, from: f32, to: f32, period: f32) {
    cam_full(sim, tilt, from, distance, fov, height, 0.2, Some(("yaw", from, to, period)));
}

/// Lighting per state: view paths over the set's own `[view]`.
pub fn view_over(sim: &mut Sim, pairs: &[(&str, f64)]) {
    let c = &mut sim.state.courses;
    c.view = pairs.iter().map(|(k, v)| (k.to_string(), ParamValue::Float(*v))).collect();
    c.view_serial += 1;
}

pub fn sfx(ev: &mut Vec<SimEvent>, id: u16, gain: f32, pitch: f32) {
    ev.push(SimEvent::Sfx { id, gain, pitch });
}

pub fn clamp01(x: f32) -> f32 {
    x.clamp(0.0, 1.0)
}

pub fn smooth(x: f32) -> f32 {
    let t = clamp01(x);
    t * t * (3.0 - 2.0 * t)
}

/// Sound bank ids (`pav_audio::sfx_bank` plays them).
pub mod sound {
    pub const UI_MOVE: u16 = 0;
    pub const UI_CONFIRM: u16 = 1;
    pub const UI_BACK: u16 = 2;
    pub const STAMP: u16 = 3;
    pub const CLAM: u16 = 4;
    pub const AGE_TICK: u16 = 5;
    pub const STEP: u16 = 6;
    pub const PIP_SQUEAK: u16 = 7;
    pub const CREAK: u16 = 8;
    pub const SPLASH_S: u16 = 9;
    pub const SPLASH_B: u16 = 10;
    pub const GULL: u16 = 11;
    pub const CROWD: u16 = 12;
    pub const CLAP: u16 = 13;
    pub const GONG: u16 = 14;
    pub const BELL: u16 = 15;
    pub const WHOOSH: u16 = 16;
    pub const SHELL_ROLL: u16 = 17;
    pub const SHELL_PLOP: u16 = 18;
    pub const GLASS_PLOP: u16 = 19;
    pub const CONFETTI: u16 = 20;
    pub const GUST: u16 = 21;
    pub const WAVE: u16 = 22;
    pub const SEA: u16 = 23;
    pub const TONE: u16 = 24;
    pub const CHIME: u16 = 25;
    pub const TICK: u16 = 26;
    pub const STAR: u16 = 27;
    pub const FANFARE: u16 = 28;
    pub const SAD: u16 = 29;
    pub const REVEAL: u16 = 30;
    pub const GROAN: u16 = 31;
    pub const CATCH: u16 = 32;
    pub const HIT_GOOD: u16 = 33;
    pub const HIT_PERFECT: u16 = 34;
    pub const MISS: u16 = 35;
    pub const COUNT: u16 = 36;
    pub const GO: u16 = 37;
    pub const BOARD: u16 = 38;
    pub const STITCH: u16 = 39;
    pub const RIBBON: u16 = 40;
    pub const BUMP: u16 = 41;
    pub const HEARTBEAT: u16 = 42;
    /// How many ids there are.
    pub const TOTAL: u16 = 43;
}

/// Songs (`pav_audio::music`).
pub mod song {
    pub const NONE: u8 = 0;
    pub const LOBBY: u8 = 1;
    pub const TIDE: u8 = 2;
    pub const WALTZ: u8 = 3;
    pub const STEP: u8 = 4;
    pub const MALLETS: u8 = 5;
    pub const BAND: u8 = 6;
}
