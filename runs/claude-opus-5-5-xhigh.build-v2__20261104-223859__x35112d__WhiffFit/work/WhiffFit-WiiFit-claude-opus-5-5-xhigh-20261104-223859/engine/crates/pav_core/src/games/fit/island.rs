//! Tippy Cay itself: what stands where, what you can walk up to, and the walk.

use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::dialog::Who;
use super::world::*;
use crate::entity::EntityId;
use crate::sim::Sim;

/// A thing on the island you can walk up to.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum Spot {
    #[default]
    None,
    /// A pavilion's mat (index into `PAVILIONS`).
    Mat(u8),
    Talk(Who),
    Cabana,
    Clam,
    Calendar,
    Wardrobe,
    Flip(u8),
    BigStand,
}

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize)]
pub struct Interact {
    pub spot: Spot,
    pub pos: Vec3,
    pub id: Option<EntityId>,
}

/// A pavilion: its name and events.
pub struct Pavilion {
    pub name: &'static str,
    pub coach: Who,
    pub opens: u8,
    pub events: &'static [super::events::EventKind],
}

use super::events::EventKind as K;
pub const PAVILIONS: [Pavilion; 4] = [
    Pavilion { name: "Stillness Studio", coach: Who::Posey, opens: 1, events: &[K::BreathBloom, K::PoseParade] },
    Pavilion { name: "Iron Gazebo", coach: Who::Kettle, opens: 2, events: &[K::TempoSquats, K::PlankStandoff] },
    Pavilion { name: "The Boardwalk", coach: Who::Bounce, opens: 3, events: &[K::StepParty, K::FloatieSpin, K::MorningLap] },
    Pavilion { name: "The Lagoon", coach: Who::Gull, opens: 4, events: &[K::TideTable, K::PaddleSlalom, K::TrayTrek, K::CannonballCup] },
];

/// Whether a point (set-local, about the stage) is on dry land you may walk on.
pub fn on_land(p: Vec3, stage: Vec3) -> bool {
    // A little inside the land's own tiles (29 x 21), so nobody steps off into the sea.
    let (x, z) = ((p.x - stage.x) / 27.8, (p.z - stage.z) / 19.8);
    x.abs().powi(4) + z.abs().powi(4) <= 1.0
}

/// Everything you can walk up to, from the hub's markers and its people.
pub fn gather(sim: &mut Sim) -> Vec<Interact> {
    let mut out = Vec::new();
    let mark = |sim: &mut Sim, name: &str| set_markers(sim, Set::Hub, name).first().copied();
    for (i, name) in ["mat_studio", "mat_gazebo", "mat_boardwalk", "mat_lagoon"].iter().enumerate() {
        if let Some(pos) = mark(sim, name) {
            out.push(Interact { spot: Spot::Mat(i as u8), pos, id: None });
        }
    }
    for (spot, name) in [
        (Spot::Cabana, "int_cabana"),
        (Spot::Clam, "int_clam"),
        (Spot::Calendar, "int_calendar"),
        (Spot::Wardrobe, "int_wardrobe"),
        (Spot::BigStand, "int_stand"),
    ] {
        if let Some(pos) = mark(sim, name) {
            out.push(Interact { spot, pos, id: None });
        }
    }
    for (who, name) in [
        (Who::Pip, "pip"),
        (Who::Posey, "posey_hub"),
        (Who::Kettle, "kettle_hub"),
        (Who::Bounce, "bounce_hub"),
        (Who::Marjorie, "marjorie"),
        (Who::Tom, "tom"),
        (Who::Twins, "twin_a"),
    ] {
        if let Some(id) = npc(sim, name) {
            let pos = sim.feet(id).unwrap_or(Vec3::ZERO);
            out.push(Interact { spot: Spot::Talk(who), pos, id: Some(id) });
        }
    }
    if let Some(pos) = set_markers(sim, Set::Hub, "int_gull").first().copied() {
        out.push(Interact { spot: Spot::Talk(Who::Gull), pos, id: None });
    }
    out
}

/// A step toward `to`, as a move direction.
pub fn steer(from: Vec3, to: Vec3) -> Vec2 {
    Vec2::new(to.x - from.x, to.z - from.z).normalize_or_zero()
}
