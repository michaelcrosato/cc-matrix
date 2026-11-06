//! Jam Cry. The country is [`world::World`]; the pavilion room is a dusk overlook the body stands in.

pub mod fire;
pub mod geom;
pub mod gun;
pub mod net;
pub mod shell;
pub mod world;

use std::collections::BTreeMap;

use anyhow::{Result, anyhow};
use glam::{Quat, Vec3};
use serde::{Deserialize, Serialize};

use super::{Game, GameBox, level_text};
use crate::color::Color;
use crate::entity::{EntityId, Spawn};
use crate::frame::SimEvent;
use crate::input::InputFrame;
use crate::room::RoomDef;
use crate::shape::{Shape, Visual};
use crate::sim::Sim;

pub use fire::FireMap;
pub use geom::exposure;
pub use gun::{Gun, WeaponId, clear_seconds, jam_probability, spread_mul};
pub use net::{Link, client_apply, host_publish};
pub use shell::{Device, MenuInput, glyph};
pub use world::{Route, Screen, Tune, World, about_pages, fiction_lines};

const LEVEL: &str = include_str!("../merc.toml");

/// Where the window looks. Menus keep the dusk overlook. Play copies the body.
#[derive(Clone, Copy, Debug)]
pub struct Overlook {
    pub eye: [f32; 3],
    pub yaw: f32,
    pub pitch: f32,
    pub roll: f32,
}

static OVERLOOK: std::sync::Mutex<Overlook> = std::sync::Mutex::new(Overlook {
    eye: [0.15, 1.55, 4.2],
    yaw: 0.0,
    pitch: -0.42,
    roll: 0.0,
});

pub fn overlook() -> Overlook {
    *OVERLOOK.lock().unwrap()
}

fn aim_overlook(eye: [f32; 3], yaw: f32, pitch: f32, roll: f32) {
    let mut slot = OVERLOOK.lock().unwrap();
    slot.eye = eye;
    slot.yaw = yaw;
    slot.pitch = pitch;
    slot.roll = roll;
}

/// Same basis as `pav_view::camera::fp_basis`. Yaw 0, pitch 0, roll 0 → forward (0, 0, −1), right (1, 0, 0).
fn view_basis(yaw: f32, pitch: f32, roll: f32) -> (Vec3, Vec3, Vec3) {
    let (sy, cy) = yaw.sin_cos();
    let (sp, cp) = pitch.sin_cos();
    let mut forward = Vec3::new(sy * cp, sp, -cy * cp);
    if forward.length_squared() < 1e-8 {
        forward = Vec3::NEG_Z;
    }
    forward = forward.normalize();
    let mut right = forward.cross(Vec3::Y);
    if right.length_squared() < 1e-6 {
        right = Vec3::new(cy, 0.0, sy);
    }
    right = right.normalize();
    let up = right.cross(forward).normalize();
    let (sr, cr) = roll.sin_cos();
    let rolled_right = (right * cr + up * sr).normalize();
    let rolled_up = (up * cr - right * sr).normalize();
    (forward, rolled_right, rolled_up)
}

/// Rules state. Visual entity ids are not part of the save: they are rebuilt in `post`.
#[derive(Clone, Serialize, Deserialize)]
pub struct Merc {
    pub world: World,
    #[serde(skip)]
    dressed: bool,
    #[serde(skip)]
    country: Vec<EntityId>,
    #[serde(skip)]
    country_anchor: (i32, i32),
    #[serde(skip)]
    props: Vec<EntityId>,
}

/// Builds the overlook and starts a human-route contract. History stays off: the save is the world.
pub fn build(sim: &mut Sim, _rest: Option<&str>) -> Result<()> {
    let def = RoomDef::parse(&level_text(Merc::KEY, LEVEL)).map_err(|e| anyhow!("merc.toml: {e}"))?;
    crate::scenes::build_standalone_room(sim, Merc::KEY, def);
    sim.config.history_seconds = 0.0;
    let game = Merc {
        world: World::campaign(sim.state.seed, Route::Human),
        dressed: false,
        country: Vec::new(),
        country_anchor: (i32::MIN, i32::MIN),
        props: Vec::new(),
    };
    sim.state.play = Some(GameBox::new(game));
    Ok(())
}

impl Merc {
    fn dress(&mut self, sim: &mut Sim) {
        if self.dressed {
            return;
        }
        self.dressed = true;
        let ground = Visual::new(Shape::Box { half: Vec3::new(48.0, 0.2, 48.0) }, Color::hex("#c9a24b"));
        sim.spawn(Spawn::new("ground", Vec3::new(0.0, -0.2, 0.0)).visual(ground));
        let road = Visual::new(Shape::Box { half: Vec3::new(3.2, 0.08, 40.0) }, Color::hex("#8a5a32"));
        sim.spawn(Spawn::new("road", Vec3::new(-1.2, 0.02, -6.0)).visual(road));
        let greens = ["#3d5a32", "#2f4a28", "#4a6a38", "#243820", "#6a5030"];
        for i in 0..28 {
            let col = (i % 7) as f32 - 3.0;
            let row = (i / 7) as f32;
            let h = 1.4 + (i % 5) as f32 * 0.55;
            let at = Vec3::new(col * 1.7, h, 1.2 - row * 2.4);
            let trunk = Visual::new(Shape::Box { half: Vec3::new(0.22, h, 0.22) }, Color::hex(greens[i % 5]));
            sim.spawn(Spawn::new("tree", at).visual(trunk));
            let crown = Visual::new(Shape::Box { half: Vec3::new(0.7, 0.45, 0.7) }, Color::hex(greens[(i + 2) % 5]));
            sim.spawn(Spawn::new("crown", at + Vec3::new(0.0, h * 0.65, 0.0)).visual(crown));
        }
        let mound = Visual::new(Shape::Box { half: Vec3::new(1.4, 0.7, 1.1) }, Color::hex("#a86838"));
        sim.spawn(Spawn::new("mound", Vec3::new(2.4, 0.7, -1.5)).visual(mound));
        let rifle = Visual::new(Shape::Box { half: Vec3::new(0.05, 0.05, 0.42) }, Color::hex("#2a2420"));
        sim.spawn(Spawn::new("rifle", Vec3::new(0.42, 1.18, 3.15)).visual(rifle));
        let rag = Visual::new(Shape::Box { half: Vec3::new(0.08, 0.16, 0.02) }, Color::hex("#9a2a22"));
        sim.spawn(Spawn::new("rag", Vec3::new(0.62, 1.42, 2.6)).visual(rag));
    }

    fn sync_country(&mut self, sim: &mut Sim) {
        if self.world.screen != Screen::Playing {
            return;
        }
        let anchor = ((self.world.x / 8.0).div_euclid(1.0) as i32, (self.world.z / 8.0).div_euclid(1.0) as i32);
        if anchor == self.country_anchor && !self.country.is_empty() {
            return;
        }
        for id in self.country.drain(..) {
            sim.despawn(id);
        }
        self.country_anchor = anchor;
        for dz in -5..=5 {
            for dx in -5..=5 {
                let x = (anchor.0 + dx) as f32 * 8.0 + 4.0;
                let z = (anchor.1 + dz) as f32 * 8.0 + 4.0;
                let h = geom::height(x, z);
                let color = if geom::on_water(x, z) {
                    "#2c6e78"
                } else if geom::on_road(x, z) {
                    "#8a5a32"
                } else if geom::on_rock(x, z) {
                    "#7a7368"
                } else {
                    "#b9924a"
                };
                let tile = Visual::new(Shape::Box { half: Vec3::new(3.9, 0.12, 3.9) }, Color::hex(color));
                let id = sim.spawn(Spawn::new("country", Vec3::new(x, h - 0.12, z)).visual(tile));
                self.country.push(id);
                if geom::tree_at(x, z) {
                    let trunk = Visual::new(Shape::Box { half: Vec3::new(0.22, 1.3, 0.22) }, Color::hex("#6a5030"));
                    let tid = sim.spawn(Spawn::new("country-tree", Vec3::new(x, h + 1.3, z)).visual(trunk));
                    self.country.push(tid);
                    let crown = Visual::new(Shape::Box { half: Vec3::new(1.1, 0.7, 1.1) }, Color::hex("#2f4a28"));
                    let cid = sim.spawn(Spawn::new("country-crown", Vec3::new(x, h + 2.6, z)).visual(crown));
                    self.country.push(cid);
                }
            }
        }
    }

    fn sync_props(&mut self, sim: &mut Sim) {
        if self.world.screen != Screen::Playing {
            return;
        }
        if self.props.is_empty() {
            let hide = Vec3::new(0.0, -40.0, 0.0);
            let specs = [
                ("fp-rifle", Vec3::new(0.04, 0.04, 0.28), "#2a2420"),
                ("fp-rag", Vec3::new(0.02, 0.14, 0.08), "#9a2a22"),
                ("fp-map", Vec3::new(0.16, 0.01, 0.12), "#d7c4a2"),
                ("fp-gps", Vec3::new(0.05, 0.04, 0.02), "#1c3a2a"),
                ("fp-glass", Vec3::new(0.04, 0.04, 0.14), "#1a1c1e"),
            ];
            for (name, half, color) in specs {
                let visual = Visual::new(Shape::Box { half }, Color::hex(color));
                self.props.push(sim.spawn(Spawn::new(name, hide).visual(visual)));
            }
        }
        let (ex, ey, ez) = self.world.eye_pos();
        let eye = Vec3::new(ex, ey, ez);
        let pitch = self.world.pitch.clamp(-1.15, 1.15);
        let (fwd, right, up) = view_basis(self.world.yaw, pitch, self.world.roll);
        let flutter = Vec3::new(self.world.wind.x, (self.world.minutes * 3.0).sin() * 1.4, self.world.wind.y) * 0.04;
        let rifle = eye + fwd * 0.46 + right * 0.18 + up * -0.20;
        let rag = eye + fwd * 0.72 + right * 0.34 + up * -0.02 + flutter;
        let show_map = self.world.map_t > 0.05;
        let map = if show_map { eye + fwd * 0.40 + right * -0.16 + up * -0.10 } else { Vec3::new(ex, -40.0, ez) };
        let show_gps = self.world.waypoint.is_some();
        let gps = if show_gps { eye + fwd * 0.52 + up * -0.30 } else { Vec3::new(ex, -40.0, ez) };
        let show_glass = self.world.mono_t > 0.0;
        let glass = if show_glass { eye + fwd * 0.30 + up * -0.04 } else { Vec3::new(ex, -40.0, ez) };
        let spots = [rifle, rag, map, gps, glass];
        let rot = Quat::from_rotation_arc(Vec3::Z, fwd);
        for (id, pos) in self.props.iter().copied().zip(spots) {
            sim.set_position(id, pos);
            if let Some(e) = sim.state.entities.get_mut(id) {
                e.rot = rot;
            }
        }
    }
}

impl Game for Merc {
    const KEY: &'static str = "merc";

    fn pre(
        &mut self,
        sim: &mut Sim,
        input: &InputFrame,
        dt: f32,
        _events: &mut Vec<SimEvent>,
    ) -> BTreeMap<EntityId, InputFrame> {
        self.world.tick(input, dt);
        let mut out = BTreeMap::new();
        if let Some(id) = sim.state.player {
            // The country moves inside `World`. The room body stays put so the controller does not fight it.
            out.insert(id, InputFrame::default());
        }
        out
    }

    fn post(&mut self, sim: &mut Sim, _dt: f32, events: &mut Vec<SimEvent>) {
        self.dress(sim);
        let playing = self.world.screen == Screen::Playing;
        if let Some(id) = sim.state.player {
            if playing {
                let h = geom::height(self.world.x, self.world.z);
                sim.set_position(id, Vec3::new(self.world.x, h, self.world.z));
            } else {
                sim.set_position(id, sim.state.spawn);
            }
        }
        if playing {
            self.sync_country(sim);
            self.sync_props(sim);
            let (x, y, z) = self.world.eye_pos();
            let pitch = self.world.pitch.clamp(-1.15, 1.15);
            aim_overlook([x, y, z], self.world.yaw, pitch, self.world.roll);
        } else {
            aim_overlook([0.15, 1.55, 4.2], 0.0, -0.42, 0.0);
        }
        if self.world.guns.first().is_some_and(|g| g.shots > 0) {
            events.push(SimEvent::Impact { pos: Vec3::new(0.0, 1.2, -1.0), strength: 0.4 });
        }
    }

    fn hud(&self, _sim: &Sim) -> Vec<String> {
        vec![format!("HP {:.0}", self.world.hp), self.world.goal_name()]
    }

    fn status(&self, _sim: &Sim) -> serde_json::Value {
        self.world.status()
    }

    fn bot(&self, _sim: &Sim) -> InputFrame {
        self.world.bot_input()
    }
}
