use super::{
    FitGame, Screen,
    events::{Event, Kind},
    meta::{Guest, OUTFITS, SKINS},
};
use crate::{
    entity::EntityId,
    frame::SimEvent,
    input::{InputFrame, buttons as b},
    level::Placement,
    params::ParamValue,
    puppet::{BodyPlan, HelmKind, PuppetDef},
    room::RoomDef,
    sim::Sim,
    world::{RoomSlot, World},
    zones::CameraCue,
};
use anyhow::{Result, anyhow};
use glam::{Quat, Vec2, Vec3};
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, sync::Arc};
const SETS: [(&str, &str); 9] = [
    ("hub", include_str!("sets/hub.toml")),
    ("studio", include_str!("sets/studio.toml")),
    ("gazebo", include_str!("sets/gazebo.toml")),
    ("boardwalk", include_str!("sets/boardwalk.toml")),
    ("tide", include_str!("sets/tide.toml")),
    ("channel", include_str!("sets/channel.toml")),
    ("pier", include_str!("sets/pier.toml")),
    ("tower", include_str!("sets/tower.toml")),
    ("bay", include_str!("sets/bay.toml")),
];
pub const INTERACTIONS: [(&str, f32, f32); 13] = [
    ("Pip · morning check", 0., -1.),
    ("Minute Clam", 3., 1.),
    ("Stillness Studio", -13., -8.),
    ("Iron Gazebo", 13., -8.),
    ("Boardwalk", -13., 8.),
    ("Lagoon", 13., 8.),
    ("Your cabana · end day", -6., 16.),
    ("Marjorie", -2., 5.),
    ("Two-Towel Tom", 4., 5.),
    ("The Twins", 7., 1.),
    ("Calendar", -4., -3.),
    ("Wardrobe", -2., 0.),
    ("Rowboat · checkout", 19., 18.),
];
pub const FLOPS: [(f32, f32); 5] = [(-21., -3.), (19., -12.), (-17., 14.), (10., 18.), (1., -21.)];
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Actors {
    pub rings: Vec<EntityId>,
    pub shells: Vec<EntityId>,
    pub pools: Vec<EntityId>,
    pub glasses: Vec<EntityId>,
    pub paddle: Option<EntityId>,
    pub tray: Option<EntityId>,
    pub gull: Option<EntityId>,
    pub pip: Option<EntityId>,
    pub ghost: Option<EntityId>,
    pub flops: Vec<EntityId>,
    pub obstacle: Vec<EntityId>,
    pub ribbons: Vec<EntityId>,
}
pub fn origin(set: usize) -> Vec3 {
    Vec3::new(set as f32 * 200., 0., 0.)
}
fn prop(sim: &mut Sim, name: &str, at: Vec3, scale: f32) -> Result<EntityId> {
    sim.spawn_prop(&format!("LIB/core/fit_{name}"), at, Quat::IDENTITY, scale, false, None).map_err(|e| anyhow!(e))
}
pub fn build(sim: &mut Sim) -> Result<Actors> {
    let mut rooms = vec![];
    for (i, (name, text)) in SETS.iter().enumerate() {
        let def =
            RoomDef::parse(&super::super::level_text(&format!("fit/sets/{name}"), text)).map_err(|e| anyhow!("{name}: {e}"))?;
        let place = Placement::new(def.layout.origin, 0);
        let (cols, rows) = def.layout.extent();
        let (min, max) = place.aabb(Vec3::new(0., -1., 0.), Vec3::new(cols as f32, 10., rows as f32));
        rooms.push(RoomSlot {
            id: i as u16,
            key: format!("fit/{name}"),
            inside: origin(i),
            outside: origin(i),
            inward: Vec3::Z,
            built: false,
            min,
            max,
            place,
            def: Arc::new(def),
        });
    }
    sim.state.world = World { enabled: false, rooms, current_room: Some(0), ..Default::default() };
    for i in 0..9 {
        sim.build_room(i);
    }
    sim.state.spawn = Vec3::new(0., 0.3, 4.);
    sim.spawn_player();
    sim.config.movement.speed = 4.2;
    let mut a = Actors::default();
    let hidden = Vec3::new(0., -30., 0.);
    for _ in 0..7 {
        a.rings.push(prop(sim, "floatie", hidden, 1.)?);
        a.shells.push(prop(sim, "shell", hidden, 1.)?);
    }
    for _ in 0..3 {
        a.pools.push(prop(sim, "pool", hidden, 1.)?);
    }
    for _ in 0..5 {
        a.glasses.push(prop(sim, "smoothie", hidden, 0.7)?);
    }
    a.paddle = Some(prop(sim, "paddleboard", hidden, 1.)?);
    a.tray = Some(prop(sim, "tray", hidden, 1.)?);
    a.gull = Some(prop(sim, "gull", hidden, 0.7)?);
    a.pip = Some(prop(sim, "pip", Vec3::new(0., 0.3, -0.6), 1.)?);
    for (x, z) in FLOPS {
        a.flops.push(prop(sim, "flipflop", Vec3::new(x, 0.23, z), 1.4)?);
    }
    for _ in 0..6 {
        a.obstacle.push(prop(sim, "crab", hidden, 1.3)?);
        a.ribbons.push(prop(sim, "ribbon", hidden, 1.)?);
    }
    let mut look = PuppetDef::preset(BodyPlan::Biped);
    look.skin = "#8ccbdc".into();
    look.shirt = "#8ccbdc".into();
    look.pants = "#a4d6c9".into();
    look.shoes = "#78bcbd".into();
    look.scale = 0.98;
    a.ghost = Some(sim.spawn_npc("Yesterday You", hidden, 0., look, None, None));
    guest_look(sim, &Guest::default());
    set(sim, 0);
    Ok(a)
}
pub fn set(sim: &mut Sim, n: usize) {
    sim.state.world.current_room = Some(n as u16);
    if let Some(pid) = sim.state.player {
        sim.set_position(pid, origin(n) + if n == 0 { Vec3::new(0., 0.3, 4.) } else { Vec3::new(0., 0.3, 0.) });
    }
    sim.state.courses.sticky_cue =
        Some(Arc::new(CameraCue { set: sim.state.world.rooms[n].def.camera.clone(), sweep: vec![], flip_ortho: 0. }));
    sim.state.courses.cue_serial += 1;
}
pub fn guest_look(sim: &mut Sim, g: &Guest) {
    if let Some(pid) = sim.state.player {
        if let Some(ch) = sim.state.entities.get_mut(pid).and_then(|e| e.character.as_mut()) {
            let mut look = PuppetDef::default();
            look.skin = SKINS[(g.skin as usize).min(5)].into();
            look.shirt = OUTFITS[(g.outfit as usize).min(7)].1.into();
            look.pants = "#f6eee0".into();
            look.shoes = if g.flipflops.len() == 5 || g.gear == 7 { "#ffd166" } else { "#d0aa87" }.into();
            look.eyes = "#263e54".into();
            look.scale = 1.05;
            look.gear.helm = match g.gear {
                1 => HelmKind::Cap,
                2 => HelmKind::Hood,
                3 => HelmKind::Crown,
                4 => HelmKind::Halo,
                _ => HelmKind::None,
            };
            look.gear.helm_color = if g.gear == 2 { "#fbfaf6" } else { "#ffd166" }.into();
            if g.gear == 5 {
                look.gear.gloves = "#ff887c".into();
            }
            if g.gear == 6 {
                look.gear.pauldrons = 0.8;
                look.gear.armor_color = "#ff887c".into();
            }
            ch.puppet = Some(Arc::new(look));
        }
    }
}
fn move_obj(sim: &mut Sim, id: Option<EntityId>, p: Vec3) {
    if let Some(id) = id {
        sim.set_position(id, p);
    }
}
pub fn animate(sim: &mut Sim, e: &Event, a: &mut Actors, set: usize, _dt: f32) {
    let o = origin(set);
    let t = e.time;
    let k = e.effective().0;
    let mut at = o + Vec3::new(0., 0.22, 0.);
    let hidden = o - Vec3::Y * 35.;
    if k == Kind::Paddle {
        at += Vec3::new(e.side, 0., -e.progress * 72.);
        move_obj(sim, a.paddle, at - Vec3::Y * 0.08);
    } else {
        move_obj(sim, a.paddle, hidden);
    }
    if k == Kind::Tray {
        at.z -= e.progress * 60.;
        move_obj(sim, a.tray, at + Vec3::new(0., 1.0, -0.5));
        for (n, id) in a.glasses.iter().enumerate() {
            let p = e.glasses[n].0;
            sim.set_position(*id, if p.length() < 1. { at + Vec3::new(p.x, 1.1, -0.5 + p.y) } else { hidden });
        }
    } else {
        move_obj(sim, a.tray, hidden);
        for id in &a.glasses {
            sim.set_position(*id, hidden);
        }
    }
    if k == Kind::Dive {
        at += Vec3::new(if e.dive_presses >= 4 { (t - e.phase_start).min(3.) * 0.6 } else { 0. }, 0.8 + e.dive_y.max(-0.7), 0.);
    }
    if k == Kind::Tide {
        at = o + Vec3::new(0., 0.38, 0.);
        for (n, id) in a.shells.iter().enumerate() {
            let p = e.shells.get(n).filter(|s| !s.potted).map(|s| o + Vec3::new(s.p.x, 0.25, s.p.y)).unwrap_or(hidden);
            sim.set_position(*id, p);
        }
        for (n, id) in a.pools.iter().enumerate() {
            let p = e.pools[n];
            sim.set_position(*id, o + Vec3::new(p.x, 0.24, p.y));
        }
    } else {
        for id in a.shells.iter().chain(&a.pools) {
            sim.set_position(*id, hidden);
        }
    }
    for (n, id) in a.rings.iter().enumerate() {
        sim.set_position(
            *id,
            if k == Kind::Spin && n < e.rings as usize { at + Vec3::Y * (0.65 + n as f32 * 0.15) } else { hidden },
        );
    }
    move_obj(sim, a.gull, if k == Kind::Pose && (32.0..37.0).contains(&t) { at + Vec3::Y * 1.8 } else { hidden });
    if k == Kind::Lap {
        let angle = e.progress * std::f32::consts::TAU;
        at = o + Vec3::new(angle.sin() * (14. + e.side), 0.23, angle.cos() * (14. + e.side));
        for (n, id) in a.obstacle.iter().enumerate() {
            let ph = (n as f32 + 0.5) * std::f32::consts::TAU / 6.;
            let radius = 14. + (n as f32 * 1.6 + e.core.phase[0]).sin() * 0.8;
            sim.set_position(*id, o + Vec3::new(ph.sin() * radius, 0.2, ph.cos() * radius));
        }
        for (n, id) in a.ribbons.iter().enumerate() {
            let fraction = (n as f32 + 0.25) / 6.;
            let ph = fraction * std::f32::consts::TAU;
            let radius = 14. + (fraction * 90. * 0.38).sin() * 0.85;
            sim.set_position(*id, o + Vec3::new(ph.sin() * radius, 0.25, ph.cos() * radius));
        }
    } else {
        for id in a.obstacle.iter().chain(&a.ribbons) {
            sim.set_position(*id, hidden);
        }
    }
    if let Some(pid) = sim.state.player {
        sim.set_position(pid, at);
        if let Some(ch) = sim.state.entities.get_mut(pid).and_then(|e| e.character.as_mut()) {
            ch.anim.tilt_side = e.core.cob.x * 14.0_f32.to_radians();
            ch.anim.tilt_fwd = -e.core.cob.y * 14.0_f32.to_radians();
            ch.facing = if matches!(k, Kind::Paddle | Kind::Tray | Kind::Dive) {
                std::f32::consts::PI
            } else if k == Kind::Lap {
                e.progress * std::f32::consts::TAU + std::f32::consts::FRAC_PI_2
            } else {
                0.
            };
            ch.anim.facing = ch.facing;
            let clip = match k {
                Kind::Breath => "FIT/Breath",
                Kind::Pose => ["FIT/Tree", "FIT/Warrior", "FIT/Lighthouse", "FIT/DeckChair", "FIT/Bridge", "FIT/Seated"]
                    [((t / 20.) as usize + if e.kind == Kind::Pose { e.phase as usize } else { 0 }) % 6],
                Kind::Squat => "FIT/Squat",
                Kind::Plank => {
                    if e.collapsed {
                        "FIT/Flop"
                    } else {
                        "FIT/Plank"
                    }
                }
                Kind::Spin => "FIT/HipCircle",
                Kind::Step => {
                    if (t * 3.2) as u32 % 2 == 0 {
                        "FIT/StepL"
                    } else {
                        "FIT/StepR"
                    }
                }
                Kind::Lap => "MESH2MOTION/Jog",
                Kind::Tray => "FIT/TrayWalk",
                Kind::Dive => {
                    if e.dive_presses >= 4 {
                        "FIT/Tuck"
                    } else {
                        "FIT/Squat"
                    }
                }
                _ => "FIT/Breath",
            };
            ch.anim.play_clip(crate::clips::find_cached(clip), 0, 0.000001);
            ch.anim.clip_t = match k {
                Kind::Breath => e.lungs,
                Kind::Squat => e.lungs,
                Kind::Dive => e.dive_tuck,
                Kind::Tray => t % 2.2,
                _ => t % 2.,
            };
            ch.anim.clip_w = 1.;
        }
    }
    if let Some(id) = a.ghost {
        if let Some(p) = e.best_ghost.get(e.best_ghost.partition_point(|p| p.t < t)) {
            let index = e.best_ghost.partition_point(|p| p.t < t);
            let previous = e.best_ghost.get(index.saturating_sub(1)).unwrap_or(p);
            let blend = ((t - previous.t) / (p.t - previous.t).max(0.001)).clamp(0., 1.);
            sim.set_position(id, o + previous.pos.lerp(p.pos, blend) + Vec3::X * 3.);
            if let Some(ch) = sim.state.entities.get_mut(id).and_then(|e| e.character.as_mut()) {
                ch.anim.tilt_side = p.lean.x * 0.24;
                ch.anim.tilt_fwd = -p.lean.y * 0.24;
                ch.anim.play_clip(p.clip, 0, 0.000001);
                ch.anim.clip_t = p.clip_t;
                ch.anim.clip_w = 1.;
            }
        } else {
            sim.set_position(id, hidden);
        }
    }
    for npc in sim.state.entities.map.values_mut() {
        if npc.name == "Posey" {
            if let Some(ch) = npc.character.as_mut() {
                ch.anim.play_clip(
                    crate::clips::find_cached(if k == Kind::Pose {
                        ["FIT/Tree", "FIT/Warrior", "FIT/Lighthouse", "FIT/DeckChair", "FIT/Bridge", "FIT/Seated"]
                            [((t / 20.) as usize + if e.kind == Kind::Pose { e.phase as usize } else { 0 }) % 6]
                    } else {
                        "FIT/Breath"
                    }),
                    0,
                    0.000001,
                );
                ch.anim.clip_t = if k == Kind::Breath { e.lungs } else { t % 2. };
                ch.anim.clip_w = 1.;
            }
        }
        if npc.name == "Bounce" {
            if let Some(ch) = npc.character.as_mut() {
                ch.anim.lift = (t * std::f32::consts::TAU * 1.6).sin().max(0.) * 0.35;
            }
        }
    }
}
impl FitGame {
    pub(super) fn hub_input(&mut self, sim: &mut Sim, i: &InputFrame, _dt: f32, events: &mut Vec<SimEvent>) {
        let Some(p) = sim.state.player.and_then(|id| sim.feet(id)) else {
            return;
        };
        self.nearest = INTERACTIONS
            .iter()
            .enumerate()
            .filter(|(_, (_, x, z))| Vec2::new(*x - p.x, *z - p.z).length() < 3.)
            .min_by(|(_, (_, ax, az)), (_, (_, bx, bz))| {
                Vec2::new(*ax - p.x, *az - p.z).length_squared().total_cmp(&Vec2::new(*bx - p.x, *bz - p.z).length_squared())
            })
            .map(|(n, _)| n);
        if let Some(n) = self.interact_goal {
            let (_, x, z) = INTERACTIONS[n];
            if Vec2::new(x - p.x, z - p.z).length() < 2.7 {
                self.interact_goal = None;
                self.way_to = None;
                self.interact(n, sim, events);
                return;
            }
        }
        if i.move_dir.length() > 0.1 {
            self.way_to = None;
            self.interact_goal = None;
        }
        if i.device == 2 && i.just(b::CONFIRM) {
            if let Some(aim) = i.aim {
                let mut target = aim;
                target.y = 0.25;
                target.x = target.x.clamp(-22., 22.);
                target.z = target.z.clamp(-22., 22.);
                self.interact_goal = INTERACTIONS
                    .iter()
                    .enumerate()
                    .find(|(_, (_, x, z))| Vec2::new(*x - aim.x, *z - aim.z).length() < 1.8)
                    .map(|(n, _)| n);
                self.way_to = Some(target);
            }
        } else if i.just(b::CONFIRM) {
            if let Some(n) = self.nearest {
                self.interact(n, sim, events);
            }
        }
        if i.just(b::WAVE) {
            if let Some(pid) = sim.state.player {
                if let Some(ch) = sim.state.entities.get_mut(pid).and_then(|e| e.character.as_mut()) {
                    ch.anim.replay_clip(crate::clips::find_cached("CMU/Wave_Hello"), crate::clips::ONCE, 1.);
                }
            }
            self.toast("Pip has acknowledged your acknowledgement.");
        }
        for (n, (x, z)) in FLOPS.iter().enumerate() {
            if !self.profile.flipflops.contains(&(n as u8)) && Vec2::new(*x - p.x, *z - p.z).length() < 1. {
                self.profile.flipflops.push(n as u8);
                if let Some(id) = self.props.flops.get(n) {
                    sim.set_position(*id, Vec3::new(*x, -30., *z));
                }
                self.toast(if self.profile.flipflops.len() == 5 {
                    "All five flip-flops. Tom has some questions about the odd one."
                } else {
                    "A lost flip-flop. A small sole rescued."
                });
                events.push(SimEvent::Sfx { id: 20, gain: 0.7, pitch: 1.3 });
                self.save_change();
            }
        }
        if p.x * p.x + p.z * p.z > 24. * 24. {
            if let Some(pid) = sim.state.player {
                sim.set_position(pid, Vec3::new(0., 0.3, 4.));
            }
            self.toast("The sea has politely returned you.");
        }
    }
    pub(super) fn interact(&mut self, n: usize, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        match n {
            0 => {
                if !self.profile.check_done {
                    self.start_day(sim)
                } else {
                    self.talk(
                        "PIP",
                        vec![super::dialogue::pip(self.profile.day, self.profile.age, self.time as usize)],
                        Screen::Hub,
                    )
                }
            }
            1 => {
                events.push(SimEvent::Sfx { id: 4, gain: 0.8, pitch: 0.6 });
                self.talk(
                    "PIP",
                    vec![
                        format!(
                            "{} minutes in the clam. Our minutes are longer. It is a wellness thing.",
                            self.profile.total_minutes
                        ),
                        "He enjoys a full schedule. And the occasional receipt.".into(),
                    ],
                    Screen::Hub,
                )
            }
            2..=5 => {
                self.change(Screen::Schedule);
                let day = n - 1;
                self.focus = super::events::ROSTER.iter().position(|k| k.day() as usize == day).unwrap_or(0);
            }
            6 => self.end_day(sim, events),
            7 => self.talk(
                "MARJORIE",
                vec![
                    "Day five? Oh, I'm on day five as well. Eleven years now.".into(),
                    "The secret is to stop hurrying. Also, the rowboat needs a number.".into(),
                ],
                Screen::Hub,
            ),
            8 => self.talk(
                "TWO-TOWEL TOM",
                vec![if self.profile.flipflops.len() == 5 {
                    "All five! I have two feet. This is excellent service.".into()
                } else {
                    format!(
                        "I have misplaced five flip-flops. You've found {}. Please don't ask about the fifth.",
                        self.profile.flipflops.len()
                    )
                }],
                Screen::Hub,
            ),
            9 => self.talk(
                "THE TWINS",
                vec!["We find this island very…".into(), "…balanced.".into(), "We practised that. For three days.".into()],
                Screen::Hub,
            ),
            10 => self.change(Screen::Calendar),
            11 => {
                if self.profile.day >= 2 || self.profile.free_play {
                    self.change(Screen::Wardrobe)
                } else {
                    self.toast("The towel cupboard opens tomorrow. It is composing itself.")
                }
            }
            12 => {
                if self.profile.free_play {
                    self.change(Screen::Ending)
                } else {
                    self.talk(
                        "PIP",
                        vec!["The rowboat leaves after the Big Stand. It has a very small timetable.".into()],
                        Screen::Hub,
                    )
                }
            }
            _ => {}
        }
    }
}

pub fn checkout(sim: &mut Sim, won: bool) {
    set(sim, 0);
    if let Some(pid) = sim.state.player {
        sim.set_position(pid, if won { Vec3::new(19., 0.7, 18.) } else { Vec3::new(-6., 0.4, 16.) });
    }
    let mut set = BTreeMap::new();
    set.insert("yaw".into(), ParamValue::Float(25.));
    set.insert("tilt".into(), ParamValue::Float(22.));
    set.insert("distance".into(), ParamValue::Float(10.));
    sim.state.courses.sticky_cue = Some(Arc::new(CameraCue { set, sweep: vec![], flip_ortho: 0. }));
    sim.state.courses.cue_serial += 1;
}
