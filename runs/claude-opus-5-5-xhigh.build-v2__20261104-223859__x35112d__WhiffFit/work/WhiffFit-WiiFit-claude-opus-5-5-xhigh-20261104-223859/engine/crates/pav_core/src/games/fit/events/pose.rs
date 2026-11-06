//! Pose Parade: hold deadpan poses with the dot inside a drifting ring; streaks multiply.

use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::*;

pub const POSES: [(&str, &str); 6] = [
    ("FIT/Tree", "The Patient Heron"),
    ("FIT/Warrior", "The Apologetic Lunge"),
    ("FIT/Lighthouse", "The Tired Lighthouse"),
    ("FIT/DeckChair", "The Folded Deck Chair"),
    ("FIT/Bridge", "The Reluctant Bridge"),
    ("FIT/Seated", "Seated Disappointment"),
];

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct PoseParade {
    pub poses: Vec<u8>,
    pub len: f32,
    pub i: usize,
    pub pt: f32,
    pub hold: f32,
    pub mult: u8,
    pub sum: f32,
    pub center: Vec2,
    pub radius: f32,
    pub inside: bool,
    pub broken: f32,
    pub gull: Option<EntityId>,
    pub gull_said: bool,
    pub with_gull: bool,
    /// Rising gusts (the Big Stand).
    pub gust: f32,
    pub posey: Option<EntityId>,
    pub was_mult: u8,
    /// In the Big Stand: stays on the post.
    pub finale: bool,
}

impl PoseParade {
    pub fn new(day: u8, count: usize, len: f32) -> Self {
        // Day 1 opens with the first three poses; later days rotate on.
        let first = (day.max(1) as usize - 1) * 2;
        let poses = (0..count).map(|k| ((first + k) % POSES.len()) as u8).collect();
        Self { poses, len, mult: 1, with_gull: true, radius: 0.3, ..Default::default() }
    }

    fn scale(n: usize, len: f32, step: f32) -> f32 {
        // The most a pose can give: x1 to x4, one step per `step` seconds.
        let ramp = step * (1.0 + 2.0 + 3.0);
        n as f32 * (ramp + (len - step * 3.0).max(0.0) * 4.0)
    }

    pub fn start(&mut self, c: &mut RunCommon, cx: &mut Cx) {
        if self.finale {
            return;
        }
        let at = cx.stage(Set::Studio);
        ready_player(cx, Set::Studio, at, 0.0);
        mirror_cam(cx.sim);
        self.posey = npc(cx.sim, "posey");
        c.say_key(Who::Posey, "posey.pose_start", self.i);
    }

    pub fn tick(&mut self, c: &mut RunCommon, cx: &mut Cx, it: &Intent) -> Option<f32> {
        let r = &cx.rules.pose;
        let dt = cx.dt;
        self.pt += dt;
        let u = clamp01(self.pt / self.len);
        let w = std::f32::consts::TAU * r.drift_hz;
        self.center = Vec2::new((c.t * w).sin(), (c.t * w * 1.37 + 1.0).sin()) * r.drift;
        self.radius = r.ring_start + (r.ring_end - r.ring_start) * u;
        // The gull lands at 12 s of the second pose.
        let mut amp = r.wobble;
        if self.with_gull && self.i == 1 && self.pt >= r.gull_at && self.pt < r.gull_at + r.gull_time {
            amp *= r.gull_wobble;
            if self.gull.is_none() {
                let head = cx.feet() + Vec3::Y * 2.05;
                self.gull = Some(spawn_prop(cx.sim, "LIB/core/gull", head, 0.0, 0.8));
                cx.sfx(sound::GULL, 0.8, 1.0);
                c.say_key(Who::Posey, "posey.gull", 0);
            }
        } else if let Some(g) = self.gull.take() {
            cx.sim.despawn(g);
            cx.sfx(sound::GULL, 0.5, 1.2);
        }
        let gust = if self.gust > 0.0 {
            Vec2::new((c.t * 1.3).sin(), (c.t * 0.8 + 2.0).sin()) * self.gust * (0.4 + u)
        } else {
            Vec2::ZERO
        };
        c.step(cx, it.lean, amp, gust, Vec2::ZERO);
        if let Some(g) = self.gull {
            move_to(cx.sim, g, cx.feet() + Vec3::Y * 2.05);
        }
        if c.core.tipped {
            self.broken = r.broken;
            c.tip_fx(cx, false);
            c.say_key(Who::Posey, "posey.tip", c.core.tips as usize);
        }
        self.broken = (self.broken - dt).max(0.0);
        self.inside = self.broken <= 0.0 && (c.core.cob - self.center).length() < self.radius;
        if self.inside {
            self.hold += dt;
            self.mult = (1 + (self.hold / r.streak_step) as u8).min(4);
            self.sum += self.mult as f32 * dt;
        } else {
            self.hold = 0.0;
            self.mult = 1;
        }
        if self.mult > self.was_mult {
            cx.sfx(sound::STAR, 0.5, 0.8 + self.mult as f32 * 0.2);
        }
        self.was_mult = self.mult;
        let max = Self::scale(self.poses.len(), self.len, r.streak_step);
        c.score = clamp01(self.sum / max / r.par) * 1000.0;
        let (clip, _) = POSES[self.poses[self.i] as usize];
        c.body(cx, 0.0, Some(clip));
        if let Some(p) = self.posey {
            play(cx.sim, p, clip);
        }
        if self.pt >= self.len {
            if self.i + 1 >= self.poses.len() {
                return Some(c.score);
            }
            self.i += 1;
            self.pt = 0.0;
            cx.sfx(sound::CREAK, 0.7, 1.0);
            c.say_key(Who::Posey, "posey.pose_next", self.i);
        }
        None
    }

    pub fn stop(&mut self, cx: &mut Cx) {
        if let Some(g) = self.gull.take() {
            cx.sim.despawn(g);
        }
        if let Some(p) = self.posey {
            stop_clip(cx.sim, p);
        }
    }

    pub fn hud(&self, c: &RunCommon, _r: &Rules, ui: &mut Ui) {
        if !self.finale {
            c.top_bar(ui, "Pose Parade", Some(self.len - self.pt + (self.poses.len() - 1 - self.i) as f32 * self.len));
        }
        let mut p = c.puck(true);
        p.ring = Some([self.center.x, self.center.y, self.radius]);
        p.good = self.inside;
        p.streak = self.mult - 1;
        ui.puck(p);
        let (_, name) = POSES[self.poses[self.i] as usize];
        ui.panel(600.0, 900.0, 720.0, 72.0, with_alpha(WHITE, 0.93), 30.0);
        ui.label(960.0, 910.0, 44.0, INK, Align::Center, name);
        if self.mult > 1 {
            ui.label(1200.0, 160.0, 72.0, CORAL, Align::Left, format!("x{}", self.mult));
        }
        if self.broken > 0.0 {
            ui.label(960.0, 420.0, 64.0, CORAL, Align::Center, "Pose broken. Nobody saw.");
        }
        ui.prompt_row(&[(Act::Lean, "Keep the dot in the ring")]);
    }

    pub fn bot(&self, c: &RunCommon, r: &Rules) -> Intent {
        let aim = self.center / r.core.reach;
        let lean = aim + (self.center - c.core.cob) * 0.8 - c.core.vel * 0.05;
        Intent { lean: lean.clamp_length_max(1.0), ..Default::default() }
    }
}
