//! The Balance Core: one analog dot driven by lean. Every event is played through it.

use glam::Vec2;
use serde::{Deserialize, Serialize};

use super::rules::CoreRules;
use crate::rng::Rng;

const TAU: f32 = std::f32::consts::TAU;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct BalanceCore {
    /// The dot: unit disc, x right, y up on screen.
    pub cob: Vec2,
    pub vel: Vec2,
    /// Seconds spent past the edge.
    pub over: f32,
    /// How many times it tipped.
    pub tips: u32,
    /// True on the tick it tipped.
    pub tipped: bool,
    /// How much it wobbled (for Pip's records).
    pub wobbles: u32,
    wob_side: i8,
    pub lean_left: f32,
    pub lean_right: f32,
    t: f32,
    phase: [f32; 4],
    kick_in: f32,
}

impl BalanceCore {
    pub fn new(rng: &mut Rng) -> Self {
        Self {
            phase: [rng.range(0.0, TAU), rng.range(0.0, TAU), rng.range(0.0, TAU), rng.range(0.0, TAU)],
            kick_in: rng.range(1.0, 2.0),
            ..Default::default()
        }
    }

    /// The dot back at the centre, still (a remount).
    pub fn settle(&mut self) {
        self.cob = Vec2::ZERO;
        self.vel = Vec2::ZERO;
        self.over = 0.0;
    }

    /// One tick. `lean` is the shaped input; `amp` scales the wobble; `gust` and `nudge` are
    /// accelerations on the dot this tick. `can_tip` false: the edge is only a place.
    #[allow(clippy::too_many_arguments)]
    pub fn step(&mut self, lean: Vec2, r: &CoreRules, amp: f32, gust: Vec2, nudge: Vec2, can_tip: bool, dt: f32, rng: &mut Rng) {
        self.t += dt;
        let a = r.wobble * amp;
        let w = |p: f32, q: f32, t: f32| a * (0.7 * (TAU * 1.3 * t + p).sin() + 0.3 * (TAU * 2.9 * t + q).sin());
        let wob = Vec2::new(w(self.phase[0], self.phase[1], self.t), w(self.phase[2], self.phase[3], self.t * 0.93));
        let target = lean.clamp_length_max(1.0) * r.reach + wob;
        let acc = (target - self.cob) * r.stiffness - self.vel * r.damping + gust + nudge;
        self.kick_in -= dt;
        if self.kick_in <= 0.0 {
            self.kick_in = rng.range(1.0, 2.0);
            let ang = rng.range(0.0, TAU);
            self.vel += Vec2::new(ang.cos(), ang.sin()) * r.kick * amp.min(2.5);
        }
        self.vel += acc * dt;
        self.cob += self.vel * dt;
        self.tipped = false;
        if self.cob.length() > 1.0 {
            self.over += dt;
            if can_tip && self.over >= r.tip_time {
                self.tipped = true;
                self.tips += 1;
                self.over = 0.0;
            }
        } else {
            self.over = 0.0;
        }
        // Pip's records: which way, and how often it swung past the middle.
        if self.cob.x < -0.08 {
            self.lean_left += dt;
        } else if self.cob.x > 0.08 {
            self.lean_right += dt;
        }
        let side = if self.cob.x > 0.05 {
            1
        } else if self.cob.x < -0.05 {
            -1
        } else {
            self.wob_side
        };
        if side != self.wob_side {
            self.wobbles += 1;
            self.wob_side = side;
        }
    }

    /// 0..1: how close to the edge.
    pub fn danger(&self) -> f32 {
        ((self.cob.length() - 0.75) / 0.25).clamp(0.0, 1.0)
    }
}
