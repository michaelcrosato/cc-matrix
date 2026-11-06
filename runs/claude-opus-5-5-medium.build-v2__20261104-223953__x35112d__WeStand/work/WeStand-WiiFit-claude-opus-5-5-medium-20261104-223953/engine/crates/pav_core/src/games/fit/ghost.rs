//! Ghosts: a run recorded a few times a second, replayed as a tinted figure. Three sources share
//! this drawing: Yesterday You, Play Together, and other players in a hub session.

use std::sync::Arc;

use glam::{Quat, Vec3};
use serde::{Deserialize, Serialize};

use crate::color::Color;
use crate::entity::EntityId;
use crate::frame::{PuppetFrame, RenderObject};
use crate::puppet::{PuppetDef, PuppetState};
use crate::shape::{Shape, Visual};

/// A moment of a run: position, facing, tilt, clip.
#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Sample {
    pub t: f32,
    pub p: [f32; 3],
    pub f: f32,
    pub ts: f32,
    pub tf: f32,
    pub c: u32,
    pub ct: f32,
    #[serde(default)]
    pub s: f32,
}

/// Samples per second recorded.
pub const RATE: f32 = 6.0;

/// A sample at time `t`, between the two recorded around it.
pub fn at(samples: &[Sample], t: f32) -> Option<Sample> {
    let first = samples.first()?;
    if t <= first.t {
        return Some(*first);
    }
    let i = samples.partition_point(|s| s.t <= t);
    let Some(b) = samples.get(i) else { return samples.last().copied() };
    let a = samples[i - 1];
    let u = ((t - a.t) / (b.t - a.t).max(1e-4)).clamp(0.0, 1.0);
    let l = |x: f32, y: f32| x + (y - x) * u;
    Some(Sample {
        t,
        p: [l(a.p[0], b.p[0]), l(a.p[1], b.p[1]), l(a.p[2], b.p[2])],
        f: l(a.f, b.f),
        ts: l(a.ts, b.ts),
        tf: l(a.tf, b.tf),
        c: b.c,
        ct: if a.c == b.c { l(a.ct, b.ct) } else { b.ct },
        s: l(a.s, b.s),
    })
}

/// A ghost shows only in the event you are in: `mine` is your area (-1: none).
pub fn same_area(mine: i64, theirs: Option<i64>) -> bool {
    mine >= 0 && theirs == Some(mine)
}

/// The first id of the figures that are not entities.
pub const FIRST_ID: u32 = 3_000_000;

/// A tinted figure at a sample, shifted by `offset`.
pub fn object(id: u32, s: &Sample, offset: Vec3, def: Arc<PuppetDef>, rgb: [f32; 3], strength: f32) -> RenderObject {
    let mut state = PuppetState { facing: s.f, tilt_side: s.ts, tilt_fwd: s.tf, clip: s.c, clip_t: s.ct, clip_w: if s.c != 0 { 1.0 } else { 0.0 }, clip_speed: 1e-6, ..Default::default() };
    state.time = s.t;
    let feet_offset = crate::character::Posture::Stand.height() * 0.5;
    RenderObject {
        id: EntityId(FIRST_ID + id),
        pos: Vec3::from(s.p) + offset + Vec3::Y * feet_offset,
        rot: Quat::IDENTITY,
        visual: Visual::new(Shape::Sphere { radius: 0.0 }, Color::WHITE),
        prop: None,
        puppet: Some(PuppetFrame { state, feet_offset, def: Some(def), rig: None, tint: Some((rgb, strength)) }),
        pulse: -1.0,
        soft: None,
        vehicle: None,
        cone: None,
        scenery: false,
    }
}

/// Seat colours, for hub and hot-seat ghosts.
pub const SEATS: [[f32; 3]; 4] = [[0.27, 0.75, 0.78], [1.0, 0.47, 0.43], [1.0, 0.82, 0.4], [0.47, 0.86, 0.67]];
