//! The Balance Core: one analog dot driven by lean, used by every event.

use glam::Vec2;
use serde::{Deserialize, Serialize};

use crate::rng::Rng;

/// Tunable numbers of the core (`rules.toml` `[core]`).
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct CoreRules {
    pub stiffness: f32,
    pub damping: f32,
    pub reach: f32,
    pub tip_time: f32,
    pub wobble: f32,
    pub kick: f32,
    pub stick_deadzone: f32,
    pub stick_curve: f32,
    pub key_rate: f32,
    pub key_return: f32,
    pub mouse_span: f32,
}

impl Default for CoreRules {
    fn default() -> Self {
        Self {
            stiffness: 40.0,
            damping: 8.5,
            reach: 0.92,
            tip_time: 0.35,
            wobble: 0.12,
            kick: 0.1,
            stick_deadzone: 0.12,
            stick_curve: 1.5,
            key_rate: 1.6,
            key_return: 1.2,
            mouse_span: 0.38,
        }
    }
}

impl crate::params::Tunable for CoreRules {
    fn visit(&mut self, v: &mut dyn crate::params::ParamVisitor) {
        v.float("stiffness", &mut self.stiffness, 10.0, 90.0, "How hard the dot is pulled to your lean");
        v.float("damping", &mut self.damping, 2.0, 20.0, "How quickly the dot settles");
        v.float("reach", &mut self.reach, 0.5, 1.2, "How far full lean pushes the dot");
        v.float("tip_time", &mut self.tip_time, 0.1, 1.5, "Seconds outside the disc before a tip");
        v.float("wobble", &mut self.wobble, 0.0, 0.4, "Base wobble amplitude");
        v.float("kick", &mut self.kick, 0.0, 0.4, "Random velocity kicks (units/s)");
        v.float("stick_deadzone", &mut self.stick_deadzone, 0.0, 0.4, "Stick deadzone");
        v.float("stick_curve", &mut self.stick_curve, 1.0, 3.0, "Stick response exponent");
        v.float("key_rate", &mut self.key_rate, 0.5, 4.0, "Keyboard lean rate (units/s)");
        v.float("key_return", &mut self.key_return, 0.5, 4.0, "Keyboard return rate (units/s)");
        v.float("mouse_span", &mut self.mouse_span, 0.15, 0.8, "Mouse offset for full lean (window heights)");
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BalanceCore {
    pub cob: Vec2,
    pub vel: Vec2,
    pub phase_a: Vec2,
    pub phase_b: Vec2,
    pub t: f32,
    pub kick_in: f32,
    pub kick_vel: Vec2,
    /// Seconds spent outside the disc.
    pub outside: f32,
    pub tipped: bool,
    /// Wobble multiplier (event, fatigue, gull...).
    pub wobble_scale: f32,
    /// External shove (gusts), units/s^2.
    pub gust: Vec2,
    /// Constant posture offset added to the target (Balance Age slump).
    pub slump: Vec2,
    /// Wobble assist setting, 0 (off) to 1.
    pub assist: f32,
}

impl Default for BalanceCore {
    fn default() -> Self {
        Self {
            cob: Vec2::ZERO,
            vel: Vec2::ZERO,
            phase_a: Vec2::ZERO,
            phase_b: Vec2::ZERO,
            t: 0.0,
            kick_in: 1.0,
            kick_vel: Vec2::ZERO,
            outside: 0.0,
            tipped: false,
            wobble_scale: 1.0,
            gust: Vec2::ZERO,
            slump: Vec2::ZERO,
            assist: 0.0,
        }
    }
}

impl BalanceCore {
    pub fn new(rng: &mut Rng) -> Self {
        let tau = std::f32::consts::TAU;
        Self {
            phase_a: Vec2::new(rng.range(0.0, tau), rng.range(0.0, tau)),
            phase_b: Vec2::new(rng.range(0.0, tau), rng.range(0.0, tau)),
            ..Default::default()
        }
    }

    pub fn reset(&mut self) {
        self.cob = Vec2::ZERO;
        self.vel = Vec2::ZERO;
        self.outside = 0.0;
        self.tipped = false;
        self.gust = Vec2::ZERO;
    }

    /// The wobble signal at time `t`.
    pub fn wobble(&self, amp: f32) -> Vec2 {
        let tau = std::f32::consts::TAU;
        let f = |a: f32, b: f32| amp * (0.7 * (tau * 1.3 * self.t + a).sin() + 0.3 * (tau * 2.9 * self.t + b).sin());
        Vec2::new(f(self.phase_a.x, self.phase_b.x), f(self.phase_a.y, self.phase_b.y))
    }

    /// One tick. `lean` is the shaped lean on screen axes; `nudge` an extra acceleration.
    /// Returns true on the tick a tip happens.
    pub fn step(&mut self, r: &CoreRules, lean: Vec2, nudge: Vec2, dt: f32, rng: &mut Rng) -> bool {
        self.t += dt;
        self.kick_in -= dt;
        if self.kick_in <= 0.0 {
            self.kick_in = rng.range(1.0, 2.0);
            let a = rng.range(0.0, std::f32::consts::TAU);
            self.kick_vel = Vec2::new(a.cos(), a.sin()) * r.kick * self.wobble_scale.min(2.0);
            self.vel += self.kick_vel;
        }
        let amp = r.wobble * self.wobble_scale * (1.0 - 0.5 * self.assist);
        let target = lean.clamp_length_max(1.0) * r.reach + self.wobble(amp) + self.slump;
        let acc = (target - self.cob) * r.stiffness - self.vel * r.damping + self.gust + nudge;
        self.vel += acc * dt;
        self.cob += self.vel * dt;
        let mut tipped_now = false;
        if self.cob.length() > 1.0 {
            self.outside += dt;
            if self.outside >= r.tip_time && !self.tipped {
                self.tipped = true;
                tipped_now = true;
            }
        } else {
            self.outside = 0.0;
            self.tipped = false;
        }
        tipped_now
    }
}

/// Shapes a stick into lean (deadzone and curve).
pub fn shape_stick(raw: Vec2, dead: f32, curve: f32) -> Vec2 {
    let m = raw.length();
    if m <= dead {
        return Vec2::ZERO;
    }
    let n = ((m - dead) / (1.0 - dead)).clamp(0.0, 1.0);
    raw / m * n.powf(curve)
}
