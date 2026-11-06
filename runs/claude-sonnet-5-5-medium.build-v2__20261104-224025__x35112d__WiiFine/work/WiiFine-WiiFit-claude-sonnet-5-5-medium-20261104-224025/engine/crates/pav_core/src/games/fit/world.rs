//! The sets (one room each on one Sim), the cast, and the sprite pool.

use std::collections::BTreeMap;
use std::sync::Arc;

use anyhow::{Result, anyhow};
use glam::{Quat, Vec3};

use super::events::{Sprite, SpriteShape};
use crate::color::Color;
use crate::entity::{EntityId, Spawn};
use crate::level::Placement;
use crate::puppet::{BodyPlan, PuppetDef};
use crate::room::RoomDef;
use crate::shape::{Shape, Visual};
use crate::sim::Sim;
use crate::world::{RoomSlot, World};

pub const SETS: [&str; 9] = ["hub", "studio", "gazebo", "boardwalk", "tide", "channel", "pier", "tower", "bay"];

pub fn set_text(i: usize) -> std::borrow::Cow<'static, str> {
    let key = format!("fit/{}", SETS[i]);
    let built_in: &'static str = match i {
        0 => include_str!("sets/hub.toml"),
        1 => include_str!("sets/studio.toml"),
        2 => include_str!("sets/gazebo.toml"),
        3 => include_str!("sets/boardwalk.toml"),
        4 => include_str!("sets/tide.toml"),
        5 => include_str!("sets/channel.toml"),
        6 => include_str!("sets/pier.toml"),
        7 => include_str!("sets/tower.toml"),
        _ => include_str!("sets/bay.toml"),
    };
    // Running from engine/, `level_text` reads crates/pav_core/src/games/<key>.toml; ours live in fit/sets.
    #[cfg(not(target_arch = "wasm32"))]
    if let Ok(t) = std::fs::read_to_string(format!("crates/pav_core/src/games/fit/sets/{}.toml", SETS[i])) {
        return t.into();
    }
    let _ = key;
    built_in.into()
}

/// The centre of set `i` in the world (rooms sit 200 m apart).
pub fn origin(i: usize) -> Vec3 {
    Vec3::new(i as f32 * 200.0, 0.0, 0.0)
}

/// A mark in a set's own space, as a world position.
pub fn at(i: usize, x: f32, y: f32, z: f32) -> Vec3 {
    origin(i) + Vec3::new(x, y, z)
}

pub fn build_sets(sim: &mut Sim) -> Result<()> {
    let mut rooms = Vec::new();
    for i in 0..SETS.len() {
        let mut def = RoomDef::parse(&set_text(i)).map_err(|e| anyhow!("fit/{}: {e}", SETS[i]))?;
        def.layout.origin = origin(i);
        let place = Placement::new(def.layout.origin, 0);
        let (cols, rows) = def.layout.extent();
        let (min, max) = place.aabb(Vec3::new(0.0, -1.0, 0.0), Vec3::new(cols as f32, def.height.max(2.0), rows as f32));
        let start = def.local_start();
        let inward = -def.entrance.facing.dir();
        rooms.push(RoomSlot {
            id: i as u16,
            key: format!("fit/{}", SETS[i]),
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
    sim.state.world = World { enabled: false, rooms, current_room: Some(0), ..Default::default() };
    for i in 0..SETS.len() {
        sim.build_room(i as u16);
    }
    sim.state.spawn = at(0, 0.0, 0.5, 6.0);
    sim.spawn_player();
    sim.state.focus = sim.state.spawn;
    Ok(())
}

/// Switches the current set (the app applies the room's camera and view when the id changes).
pub fn enter_set(sim: &mut Sim, i: usize) {
    sim.state.world.current_room = Some(i as u16);
}

pub fn look(skin: &str, shirt: &str, pants: &str, shoes: &str) -> PuppetDef {
    let mut d = PuppetDef::preset(BodyPlan::Biped);
    d.skin = skin.into();
    d.shirt = shirt.into();
    d.pants = pants.into();
    d.shoes = shoes.into();
    d
}

pub fn cast_def(who: &str) -> PuppetDef {
    match who {
        "pip" => {
            let mut d = PuppetDef::preset(BodyPlan::Blob);
            d.skin = "#8fd0ee".into();
            d.shirt = "#8fd0ee".into();
            d.scale = 0.7;
            d.squash = 2.0;
            d
        }
        "posey" => {
            let mut d = look("#d8b184", "#d8b184", "#c79f6e", "#c79f6e");
            d.eyes = "#d8b184".into();
            d.scale = 1.05;
            d.leg_length = 0.98;
            d
        }
        "kettle" => {
            let mut d = PuppetDef::preset(BodyPlan::Blob);
            d.skin = "#3a3f4a".into();
            d.shirt = "#3a3f4a".into();
            d.scale = 0.9;
            d
        }
        "bounce" => {
            let mut d = PuppetDef::preset(BodyPlan::Blob);
            d.skin = "#ff9fc4".into();
            d.shirt = "#ff9fc4".into();
            d.scale = 1.2;
            d
        }
        "gull" => {
            let mut d = PuppetDef::preset(BodyPlan::Blob);
            d.skin = "#f4f6f8".into();
            d.shirt = "#f4f6f8".into();
            d.scale = 0.45;
            d
        }
        "marjorie" => {
            let mut d = look("#e7c7a4", "#ffffff", "#ffffff", "#f5f2ec");
            d.gear.helm = crate::puppet::HelmKind::Hood;
            d.gear.helm_color = "#f5f2ec".into();
            d
        }
        "tom" => look("#c68e5a", "#8fdde0", "#e8dcb8", "#fbfaf6"),
        "twin" => look("#f1d3b0", "#ffd166", "#6a8caf", "#fbfaf6"),
        _ => look("#e0b07c", "#fbfaf6", "#fbfaf6", "#fbfaf6"),
    }
}

/// The cast of guests that watch from every set: (position, yaw), by set.
pub fn crowd_spots(set: usize) -> Vec<(Vec3, f32)> {
    let ring = |n: usize, r: f32, y: f32, a0: f32, a1: f32| -> Vec<(Vec3, f32)> {
        (0..n)
            .map(|i| {
                let a = a0 + (a1 - a0) * (i as f32 + 0.5) / n as f32;
                let p = Vec3::new(a.cos() * r, y, a.sin() * r);
                (origin(set) + p, (-p.x).atan2(-p.z))
            })
            .collect()
    };
    let pi = std::f32::consts::PI;
    match set {
        1 => ring(7, 7.6, 0.0, pi * 1.05, pi * 1.95),
        2 => ring(7, 8.6, -0.1, pi * 1.0, pi * 2.0),
        3 => ring(9, 7.0, 0.0, pi * 1.15, pi * 1.85).into_iter().map(|(p, y)| (p + Vec3::new(0.0, 0.0, -1.0), y)).collect(),
        4 => ring(6, 5.2, -0.1, 0.0, pi * 2.0),
        5 => vec![(origin(5) + Vec3::new(-6.6, 0.4, 20.0), -1.2), (origin(5) + Vec3::new(6.6, 0.4, 44.0), 1.2), (origin(5) + Vec3::new(-6.6, 0.4, 80.0), -1.2)],
        6 => vec![(origin(6) + Vec3::new(0.0, 0.3, 178.0), 3.14)],
        7 => ring(3, 9.0, 0.4, pi * 1.25, pi * 1.75),
        8 => ring(14, 9.0, 0.05, 0.0, pi * 2.0),
        _ => vec![],
    }
}

/// The sprite pool: one entity per sprite key, spawned on demand and moved each tick.
#[derive(Clone, Debug, Default, serde::Serialize, serde::Deserialize)]
pub struct Pool {
    pub ids: BTreeMap<u32, (EntityId, SpriteShapeKey)>,
}

#[derive(Clone, Copy, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct SpriteShapeKey(pub i32, pub i32, pub i32, pub i32);

fn shape_key(s: SpriteShape, color: &str) -> SpriteShapeKey {
    let h = color.bytes().fold(0i32, |a, b| a.wrapping_mul(31).wrapping_add(b as i32));
    match s {
        SpriteShape::Ball(r) => SpriteShapeKey(0, (r * 100.0) as i32, 0, h),
        SpriteShape::Disc(r) => SpriteShapeKey(1, (r * 100.0) as i32, 0, h),
        SpriteShape::Box(x, y, z) => SpriteShapeKey(2, (x * 100.0) as i32, (y * 100.0) as i32 * 1000 + (z * 100.0) as i32, h),
    }
}

impl Pool {
    pub fn sync(&mut self, sim: &mut Sim, origin: Vec3, sprites: &[Sprite]) {
        let live: Vec<u32> = sprites.iter().map(|s| s.key).collect();
        let gone: Vec<u32> = self.ids.keys().copied().filter(|k| !live.contains(k)).collect();
        for k in gone {
            if let Some((id, _)) = self.ids.remove(&k) {
                sim.despawn(id);
            }
        }
        for s in sprites {
            let key = shape_key(s.shape, s.color);
            if let Some((id, k)) = self.ids.get(&s.key).copied() {
                if k != key {
                    sim.despawn(id);
                    self.ids.remove(&s.key);
                }
            }
            let pos = origin + s.pos;
            if let Some((id, _)) = self.ids.get(&s.key) {
                sim.set_position(*id, pos);
                continue;
            }
            let shape = match s.shape {
                SpriteShape::Ball(r) => Shape::Sphere { radius: r },
                SpriteShape::Disc(r) => Shape::Cylinder { half_height: 0.02, radius: r },
                SpriteShape::Box(x, y, z) => Shape::RoundedBox { half: Vec3::new(x, y, z), radius: 0.02 },
            };
            let mut v = Visual::new(shape, Color::hex(s.color));
            v.emissive = s.emissive;
            let id = sim.spawn(Spawn::new("~fit_sprite", pos).visual(v));
            self.ids.insert(s.key, (id, key));
        }
    }

    pub fn clear(&mut self, sim: &mut Sim) {
        for (_, (id, _)) in std::mem::take(&mut self.ids) {
            sim.despawn(id);
        }
    }
}

pub fn quat_y(a: f32) -> Quat {
    Quat::from_rotation_y(a)
}
