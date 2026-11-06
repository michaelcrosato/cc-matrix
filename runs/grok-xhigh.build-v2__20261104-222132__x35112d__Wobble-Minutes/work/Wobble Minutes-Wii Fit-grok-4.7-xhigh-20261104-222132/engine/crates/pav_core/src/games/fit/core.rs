//! One balance model for every event. Semi-implicit Euler at the sim tick.

use glam::Vec2;
use serde::{Deserialize, Serialize};

use crate::params::{ParamVisitor, Tunable};

/// Tunable numbers. Progress lives on [`super::FitGame`], not here, so Reset restores feel only.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct Rules {
    pub stiffness: f32,
    pub damping: f32,
    pub reach: f32,
    pub tip_time: f32,
    pub wobble: f32,
    pub stick_curve: f32,
    pub key_rate: f32,
    pub key_return: f32,
    pub breath_secs: f32,
    pub pose_secs: f32,
    pub pose_ring: f32,
    pub squat_reps: i32,
    pub plank_secs: f32,
    pub step_secs: f32,
    pub floatie_secs: f32,
    pub spin_lo: f32,
    pub spin_hi: f32,
    pub spin_band_scale: f32,
    pub lap_secs: f32,
    pub tide_secs: f32,
    pub paddle_secs: f32,
    pub paddle_par: f32,
    pub tray_secs: f32,
    pub cannon_secs: f32,
    pub gust: f32,
    pub bounce_gain: f32,
    pub big_gust: f32,
    pub rhythm_perfect: f32,
    pub rhythm_good: f32,
}

impl Default for Rules {
    fn default() -> Self {
        Self {
            stiffness: 40.0,
            damping: 8.5,
            reach: 0.92,
            tip_time: 0.35,
            wobble: 0.12,
            stick_curve: 1.5,
            key_rate: 1.6,
            key_return: 1.2,
            breath_secs: 45.0,
            pose_secs: 20.0,
            pose_ring: 0.30,
            squat_reps: 10,
            plank_secs: 60.0,
            step_secs: 64.0,
            floatie_secs: 50.0,
            spin_lo: 6.0,
            spin_hi: 9.0,
            spin_band_scale: 1.35,
            lap_secs: 90.0,
            tide_secs: 20.0,
            paddle_secs: 45.0,
            paddle_par: 28.0,
            tray_secs: 50.0,
            cannon_secs: 40.0,
            gust: 18.0,
            bounce_gain: 1.0,
            big_gust: 22.0,
            rhythm_perfect: 0.055,
            rhythm_good: 0.120,
        }
    }
}

impl Tunable for Rules {
    fn visit(&mut self, v: &mut dyn ParamVisitor) {
        v.float("stiffness", &mut self.stiffness, 5.0, 80.0, "How fast the dot chases your lean");
        v.float("damping", &mut self.damping, 1.0, 20.0, "How quickly the chase settles");
        v.float("reach", &mut self.reach, 0.4, 1.0, "Where a full lean comes to rest");
        v.float("tip_time", &mut self.tip_time, 0.1, 1.0, "Seconds outside the disc before a tip");
        v.float("wobble", &mut self.wobble, 0.0, 0.4, "Idle wander of the dot");
        v.float("stick_curve", &mut self.stick_curve, 1.0, 3.0, "Stick response exponent");
        v.float("key_rate", &mut self.key_rate, 0.2, 4.0, "Keyboard lean speed");
        v.float("key_return", &mut self.key_return, 0.2, 4.0, "Keyboard return speed");
        v.float("breath_secs", &mut self.breath_secs, 10.0, 90.0, "Breath Bloom length");
        v.float("pose_secs", &mut self.pose_secs, 8.0, 40.0, "Seconds for one pose");
        v.float("pose_ring", &mut self.pose_ring, 0.1, 0.6, "Pose ring start radius");
        v.float("plank_secs", &mut self.plank_secs, 20.0, 90.0, "Plank length");
        v.float("step_secs", &mut self.step_secs, 20.0, 90.0, "Step Party length");
        v.float("floatie_secs", &mut self.floatie_secs, 20.0, 80.0, "Floatie Spin length");
        v.float("spin_lo", &mut self.spin_lo, 2.0, 12.0, "Spin band low");
        v.float("spin_hi", &mut self.spin_hi, 4.0, 16.0, "Spin band high");
        v.float("spin_band_scale", &mut self.spin_band_scale, 1.0, 2.0, "Keyboard spin band scale");
        v.float("lap_secs", &mut self.lap_secs, 30.0, 120.0, "Morning Lap length");
        v.float("tide_secs", &mut self.tide_secs, 8.0, 40.0, "Seconds per tide board");
        v.float("paddle_secs", &mut self.paddle_secs, 20.0, 80.0, "Paddle time limit");
        v.float("paddle_par", &mut self.paddle_par, 12.0, 50.0, "Paddle par time");
        v.float("tray_secs", &mut self.tray_secs, 20.0, 80.0, "Tray Trek length");
        v.float("cannon_secs", &mut self.cannon_secs, 15.0, 70.0, "Cannonball Cup length");
        v.float("gust", &mut self.gust, 0.0, 40.0, "Gust strength");
        v.float("bounce_gain", &mut self.bounce_gain, 0.4, 2.0, "Board bounce gain");
        v.float("big_gust", &mut self.big_gust, 0.0, 40.0, "Big Stand gusts");
        v.float("rhythm_perfect", &mut self.rhythm_perfect, 0.02, 0.12, "Perfect window");
        v.float("rhythm_good", &mut self.rhythm_good, 0.06, 0.2, "Good window");
        let _ = v.int("squat_reps", &mut self.squat_reps, 4, 20, "Squat count");
    }
}

/// Centre of pressure. `tipped` is true only on the tick a tip happens.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BalanceCore {
    pub cob: Vec2,
    pub vel: Vec2,
    pub tip_t: f32,
    pub tipped: bool,
    pub t: f32,
    pub amp: f32,
    pub phase: [f32; 4],
    pub kick_in: f32,
    pub gust: Vec2,
    pub kicks: bool,
}

impl Default for BalanceCore {
    fn default() -> Self {
        Self {
            cob: Vec2::ZERO,
            vel: Vec2::ZERO,
            tip_t: 0.0,
            tipped: false,
            t: 0.0,
            amp: 0.12,
            phase: [0.4, 1.7, 2.2, 0.9],
            kick_in: 1.4,
            gust: Vec2::ZERO,
            kicks: true,
        }
    }
}

impl BalanceCore {
    pub fn wobble(&self) -> Vec2 {
        let ax = |t: f32, a: f32, b: f32| {
            self.amp * (0.7 * (std::f32::consts::TAU * 1.3 * t + a).sin() + 0.3 * (std::f32::consts::TAU * 2.9 * t + b).sin())
        };
        Vec2::new(ax(self.t, self.phase[0], self.phase[1]), ax(self.t, self.phase[2], self.phase[3]))
    }

    /// Advance one tick. `lean` is already shaped, in the disc.
    pub fn step(&mut self, lean: Vec2, dt: f32, rules: &Rules, rng: &mut crate::rng::Rng) {
        self.tipped = false;
        let target = lean.clamp_length_max(1.0) * rules.reach + self.wobble();
        let acc = (target - self.cob) * rules.stiffness - self.vel * rules.damping + self.gust;
        self.vel += acc * dt;
        if self.kicks {
            self.kick_in -= dt;
            if self.kick_in <= 0.0 {
                let ang = rng.range(0.0, std::f32::consts::TAU);
                self.vel += Vec2::new(ang.cos(), ang.sin()) * 0.1;
                self.kick_in = rng.range(1.0, 2.0);
            }
        }
        self.cob += self.vel * dt;
        self.t += dt;
        if self.cob.length() > 1.0 {
            self.tip_t += dt;
            if self.tip_t >= rules.tip_time {
                self.tipped = true;
                self.tip_t = 0.0;
                self.cob = self.cob.normalize_or_zero() * 0.72;
                self.vel = Vec2::ZERO;
            }
        } else {
            self.tip_t = 0.0;
        }
    }

    /// Step without the seeded wander, for the feel tests.
    pub fn step_clean(&mut self, lean: Vec2, dt: f32, rules: &Rules) {
        let mut rng = crate::rng::Rng::new(1);
        let kicks = self.kicks;
        self.kicks = false;
        let amp = self.amp;
        self.amp = 0.0;
        self.step(lean, dt, rules, &mut rng);
        self.amp = amp;
        self.kicks = kicks;
    }
}

/// Balance Age. Better skill, more days and more stars all come out younger.
pub fn balance_age(skill: f32, days_completed: u32, total_stars: u32) -> u8 {
    let skill = skill.clamp(0.0, 1.0);
    let age = 24.0 + 56.0 * (1.0 - skill).powf(1.1) - 2.0 * days_completed as f32 - (total_stars as f32 / 3.0).min(8.0);
    age.round().clamp(18.0, 99.0) as u8
}

pub fn stars_from_score(score: f32) -> u8 {
    if score >= 850.0 {
        3
    } else if score >= 650.0 {
        2
    } else if score >= 400.0 {
        1
    } else {
        0
    }
}

pub fn stars_from_plank(secs: f32) -> u8 {
    if secs >= 55.0 {
        3
    } else if secs >= 40.0 {
        2
    } else if secs >= 25.0 {
        1
    } else {
        0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn full_lean_settles_inside_the_disc() {
        let rules = Rules::default();
        let mut b = BalanceCore::default();
        b.kicks = false;
        b.amp = 0.0;
        let lean = Vec2::new(1.0, 0.0);
        let mut peak = 0.0_f32;
        for _ in 0..180 {
            b.step_clean(lean, 1.0 / 60.0, &rules);
            peak = peak.max(b.cob.length());
        }
        assert!(peak < 1.0, "peak {peak}");
        assert!(b.cob.x > 0.85, "settled at {}", b.cob.x);
        assert!(!b.tipped);
    }

    #[test]
    fn a_hard_gust_tips_and_a_release_returns() {
        let rules = Rules::default();
        let mut b = BalanceCore::default();
        b.kicks = false;
        b.amp = 0.0;
        let lean = Vec2::new(1.0, 0.0);
        for _ in 0..180 {
            b.step_clean(lean, 1.0 / 60.0, &rules);
        }
        assert!(!b.tipped, "a full lean alone stays inside the disc");
        // A gust on top of a full lean pushes the equilibrium past the rim.
        b.gust = Vec2::new(30.0, 0.0);
        let mut tipped = false;
        for _ in 0..120 {
            b.step_clean(lean, 1.0 / 60.0, &rules);
            tipped |= b.tipped;
        }
        assert!(tipped, "gust on a full lean should tip within 2s");
        b.gust = Vec2::ZERO;
        for _ in 0..180 {
            b.step_clean(Vec2::ZERO, 1.0 / 60.0, &rules);
        }
        assert!(b.cob.length() < 0.2, "returned to {}", b.cob);
    }

    #[test]
    fn age_moves_the_right_way_and_stays_in_range() {
        let young = balance_age(1.0, 4, 30);
        let older = balance_age(0.0, 0, 0);
        assert!(young < older);
        assert!((18..=99).contains(&young));
        assert!((18..=99).contains(&older));
        assert_eq!(balance_age(1.0, 0, 0), 24);
        assert_eq!(stars_from_score(399.0), 0);
        assert_eq!(stars_from_score(400.0), 1);
        assert_eq!(stars_from_score(650.0), 2);
        assert_eq!(stars_from_score(850.0), 3);
        assert_eq!(stars_from_plank(24.0), 0);
        assert_eq!(stars_from_plank(25.0), 1);
        assert_eq!(stars_from_plank(40.0), 2);
        assert_eq!(stars_from_plank(55.0), 3);
    }
}
