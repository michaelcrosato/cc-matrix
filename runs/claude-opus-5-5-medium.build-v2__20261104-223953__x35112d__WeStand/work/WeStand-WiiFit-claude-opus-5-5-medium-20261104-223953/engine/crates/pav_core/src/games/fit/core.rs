//! The Balance Core: one analog dot, driven by lean, used by every event.

use glam::Vec2;
use serde::{Deserialize, Serialize};

use super::rules::CoreRules;
use crate::rng::Rng;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct BalanceCore {
    /// The dot: unit disc, x right, y up on screen.
    pub cob: Vec2,
    pub vel: Vec2,
    phase: [f32; 4],
    kick_in: f32,
    t: f32,
    over: f32,
    /// Steady push (wind) and this tick's shove, both accelerations.
    pub gust: Vec2,
    pub nudge: Vec2,
    /// The event's multiplier on the wobble.
    pub wobble: f32,
    /// Attract mode and the No Tips cheat.
    pub no_tip: bool,
    pub tips: u32,
    /// Times the dot crossed from calm to wobbling, for Pip's commentary.
    pub wobbles: u32,
    calm: bool,
    pub left_time: f32,
    pub right_time: f32,
}

impl BalanceCore {
    pub fn new(rng: &mut Rng) -> Self {
        let mut c = Self { wobble: 1.0, kick_in: 1.0, ..Default::default() };
        c.reseed(rng);
        c
    }

    pub fn reseed(&mut self, rng: &mut Rng) {
        for p in &mut self.phase {
            *p = rng.range(0.0, std::f32::consts::TAU);
        }
        self.kick_in = rng.range(1.0, 2.0);
    }

    /// Starts over at the centre, keeping the wobble's phases.
    pub fn center(&mut self) {
        self.cob = Vec2::ZERO;
        self.vel = Vec2::ZERO;
        self.over = 0.0;
        self.gust = Vec2::ZERO;
        self.nudge = Vec2::ZERO;
    }

    fn wobble_at(&self, r: &CoreRules) -> Vec2 {
        use std::f32::consts::TAU;
        let amp = r.wobble * self.wobble;
        let w = |a: f32, b: f32| amp * (0.7 * (TAU * 1.3 * self.t + a).sin() + 0.3 * (TAU * 2.9 * self.t + b).sin());
        Vec2::new(w(self.phase[0], self.phase[1]), w(self.phase[2], self.phase[3]))
    }

    /// One tick. Returns true on the tick the figure tips.
    pub fn tick(&mut self, lean: Vec2, r: &CoreRules, rng: &mut Rng, dt: f32) -> bool {
        self.t += dt;
        let target = lean.clamp_length_max(1.0) * r.reach + self.wobble_at(r);
        let acc = (target - self.cob) * r.stiffness - self.vel * r.damping + self.gust + self.nudge;
        self.nudge = Vec2::ZERO;
        self.vel += acc * dt;
        self.kick_in -= dt;
        if self.kick_in <= 0.0 {
            self.kick_in = rng.range(1.0, 2.0);
            let a = rng.range(0.0, std::f32::consts::TAU);
            self.vel += Vec2::new(a.cos(), a.sin()) * r.kick * self.wobble;
        }
        self.cob += self.vel * dt;
        if self.cob.x < -0.05 {
            self.left_time += dt;
        } else if self.cob.x > 0.05 {
            self.right_time += dt;
        }
        let wobbling = self.vel.length() > 0.8;
        if wobbling && self.calm {
            self.wobbles += 1;
        }
        self.calm = !wobbling;
        if self.cob.length() > 1.0 {
            self.over += dt;
            if self.over >= r.tip_time && !self.no_tip {
                self.over = 0.0;
                self.tips += 1;
                self.cob *= 0.3;
                self.vel = Vec2::ZERO;
                return true;
            }
        } else {
            self.over = 0.0;
        }
        false
    }
}

/// A stick's shaping, as the host applies it (kept here so tests can check the curve).
pub fn shape_stick(v: Vec2, deadzone: f32, power: f32) -> Vec2 {
    let l = v.length();
    if l < deadzone {
        return Vec2::ZERO;
    }
    let k = ((l - deadzone) / (1.0 - deadzone)).clamp(0.0, 1.0);
    v / l * k.powf(power)
}

/// Keys: the target moves toward the held direction and eases back when released.
pub fn ramp_keys(cur: Vec2, held: Vec2, rate_in: f32, rate_out: f32, dt: f32) -> Vec2 {
    let mut out = cur;
    for (c, h) in [(&mut out.x, held.x), (&mut out.y, held.y)] {
        if h != 0.0 {
            *c = (*c + h * rate_in * dt).clamp(-1.0, 1.0);
        } else {
            let d = rate_out * dt;
            *c = if c.abs() <= d { 0.0 } else { *c - c.signum() * d };
        }
    }
    out.clamp_length_max(1.0)
}
