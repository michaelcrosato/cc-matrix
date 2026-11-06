//! Ghosts: one pipeline for Yesterday You, Play Together and other players in an AI Hub session.

use std::sync::Arc;

use glam::{Quat, Vec2, Vec3};
use serde::{Deserialize, Serialize};

use crate::entity::EntityId;
use crate::frame::{PuppetFrame, RenderObject};
use crate::puppet::{PuppetDef, PuppetState};
use crate::shape::{Shape, Visual};

/// Frames a second a run is recorded at.
pub const GHOST_HZ: f32 = 5.0;

/// A moment of a run. Short names: a save holds thousands of these.
#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct GFrame {
    pub p: [f32; 3],
    pub f: f32,
    pub l: [f32; 2],
    pub c: u32,
    pub t: f32,
    pub s: f32,
}

/// Only a ghost in your own event is drawn; -1 means not in one yet.
pub fn same_area(theirs: i64, mine: i64) -> bool {
    mine >= 0 && theirs == mine
}

fn r2(x: f32) -> f32 {
    (x * 100.0).round() / 100.0
}

impl GFrame {
    pub fn new(p: Vec3, f: f32, l: Vec2, c: u32, t: f32, s: f32) -> Self {
        Self { p: [r2(p.x), r2(p.y), r2(p.z)], f: r2(f), l: [r2(l.x), r2(l.y)], c, t: r2(t), s: s.round() }
    }

    pub fn lerp(&self, o: &GFrame, u: f32) -> GFrame {
        let l = |a: f32, b: f32| a + (b - a) * u;
        let mut d = o.f - self.f;
        if d > std::f32::consts::PI {
            d -= std::f32::consts::TAU;
        } else if d < -std::f32::consts::PI {
            d += std::f32::consts::TAU;
        }
        GFrame {
            p: [l(self.p[0], o.p[0]), l(self.p[1], o.p[1]), l(self.p[2], o.p[2])],
            f: self.f + d * u,
            l: [l(self.l[0], o.l[0]), l(self.l[1], o.l[1])],
            c: if u < 0.5 { self.c } else { o.c },
            t: if o.c == self.c && o.t >= self.t { l(self.t, o.t) } else if u < 0.5 { self.t } else { o.t },
            s: l(self.s, o.s),
        }
    }
}

/// A recorded run at time `t` (seconds of play).
pub fn sample(frames: &[GFrame], t: f32) -> Option<GFrame> {
    if frames.is_empty() {
        return None;
    }
    let x = (t * GHOST_HZ).max(0.0);
    let i = x.floor() as usize;
    if i + 1 >= frames.len() {
        return frames.last().copied();
    }
    Some(frames[i].lerp(&frames[i + 1], x - i as f32))
}

/// A moment as a figure in the scene: seat-tinted, tilted, playing the recorded clip.
pub fn ghost_object(id: u32, g: &GFrame, offset: Vec3, def: &Arc<PuppetDef>, tint: [f32; 3], strength: f32) -> RenderObject {
    let height = 1.8;
    let feet = Vec3::from(g.p) + offset;
    let mut state = PuppetState { facing: g.f, time: 1.0, seed: 0.3, ..Default::default() };
    if g.c != 0 {
        state.clip = g.c;
        state.clip_t = g.t;
        state.clip_w = 1.0;
        state.clip_flags = crate::clips::CLAMP;
    }
    let y = g.f;
    let side = Vec3::new(y.cos(), 0.0, -y.sin());
    let fwd = Vec3::new(y.sin(), 0.0, y.cos());
    let world = Vec3::new(g.l[0], 0.0, -g.l[1]) * 14f32.to_radians();
    state.tilt_side = world.dot(side);
    state.tilt_fwd = world.dot(fwd);
    RenderObject {
        id: EntityId(id),
        pos: feet + Vec3::Y * height * 0.5,
        rot: Quat::IDENTITY,
        visual: Visual::new(Shape::Sphere { radius: 0.0 }, crate::color::Color::WHITE),
        prop: None,
        puppet: Some(PuppetFrame { state, feet_offset: height * 0.5, def: Some(def.clone()), rig: None, tint: Some((tint, strength)) }),
        pulse: -1.0,
        soft: None,
        vehicle: None,
        cone: None,
        scenery: false,
    }
}

/// Seat colours (players 1 to 4).
pub const SEATS: [[f32; 3]; 4] = [[0.27, 0.75, 0.78], [1.0, 0.47, 0.43], [1.0, 0.82, 0.4], [0.47, 0.86, 0.67]];

/// A figure in a seat's colours.
pub fn seat_look(seat: usize) -> Arc<PuppetDef> {
    let (_, shirt, pants, shoes) = super::meta::OUTFITS[seat % super::meta::OUTFITS.len()];
    Arc::new(PuppetDef { shirt: shirt.into(), pants: pants.into(), shoes: shoes.into(), ..PuppetDef::default() })
}

/// What a ghost stands on, in its lane (a paddleboard).
pub fn stands_on(id: u32, kind: super::events::EventKind, g: &GFrame, lane: Vec3) -> Option<RenderObject> {
    let (half, h) = kind.ghost_stands_on()?;
    let feet = Vec3::from(g.p) + lane;
    let mut visual = Visual::new(Shape::RoundedBox { half, radius: half.min_element() * 0.8 }, crate::color::Color::hex("#fbfaf6"));
    visual.look = crate::shape::Look::Cel;
    Some(RenderObject {
        id: EntityId(id),
        pos: feet + Vec3::Y * h,
        rot: Quat::from_rotation_y(g.f),
        visual,
        prop: None,
        puppet: None,
        pulse: -1.0,
        soft: None,
        vehicle: None,
        cone: None,
        scenery: false,
    })
}
