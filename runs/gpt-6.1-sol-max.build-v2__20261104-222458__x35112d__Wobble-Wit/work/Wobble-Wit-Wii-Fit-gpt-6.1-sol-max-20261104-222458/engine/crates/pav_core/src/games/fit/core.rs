//! The one balance spring shared by all activities. Coordinates are screen-space.
use super::Rules;
use glam::Vec2;
use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct BalanceCore {
    pub cob: Vec2,
    pub vel: Vec2,
    pub outside: f32,
    pub tips: u32,
    pub phase: [f32; 4],
    pub kick_at: f32,
    pub kick: Vec2,
}
impl BalanceCore {
    pub fn new(phases: [f32; 4]) -> Self {
        Self { phase: phases, kick_at: 1.5, ..Default::default() }
    }
    pub fn wobble(&self, t: f32, amp: f32) -> Vec2 {
        let f = |a: f32, b: f32| {
            amp * (0.7 * (std::f32::consts::TAU * 1.3 * t + a).sin() + 0.3 * (std::f32::consts::TAU * 2.9 * t + b).sin())
        };
        Vec2::new(f(self.phase[0], self.phase[1]), f(self.phase[2], self.phase[3]))
    }
    pub fn step(&mut self, lean: Vec2, t: f32, dt: f32, amp: f32, gust: Vec2, r: &Rules) -> bool {
        self.kick_at -= dt;
        if self.kick_at <= 0. {
            let angle = self.kick.y.atan2(self.kick.x) + 2.39996 + self.phase[0] * 0.31;
            self.kick = Vec2::new(angle.cos(), angle.sin());
            self.vel += self.kick * 0.1 * amp;
            self.kick_at += 1.5 + (angle + self.phase[1]).sin() * 0.5;
        }
        let target = lean.clamp_length_max(1.) * r.reach + self.wobble(t, amp * r.wobble);
        self.vel += ((target - self.cob) * r.stiffness - self.vel * r.damping + gust) * dt;
        self.cob += self.vel * dt;
        if self.cob.length() > 1. {
            self.outside += dt;
        } else {
            self.outside = 0.;
        }
        if self.outside >= r.tip_time {
            self.tips += 1;
            self.cob *= 0.35;
            self.vel *= 0.1;
            self.outside = 0.;
            true
        } else {
            false
        }
    }
    pub fn steer(&self, target: Vec2, t: f32, amp: f32, r: &Rules) -> Vec2 {
        ((target - self.wobble(t, amp * r.wobble) + self.vel * 0.12) / r.reach).clamp_length_max(1.)
    }
}
pub fn stick(v: Vec2, curve: f32) -> Vec2 {
    let n = v.length();
    if n <= 0.12 { Vec2::ZERO } else { v / n * ((n - 0.12) / 0.88).clamp(0., 1.).powf(curve) }
}
pub fn keys(current: Vec2, axis: Vec2, dt: f32, fine: bool, rate: f32, back: f32) -> Vec2 {
    if axis.length() > 0. {
        (current + axis.normalize() * dt * rate * if fine { 0.5 } else { 1. }).clamp_length_max(1.)
    } else {
        current.normalize_or_zero() * (current.length() - back * dt).max(0.)
    }
}
