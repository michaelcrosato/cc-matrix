//! Tempo Squats: hold to go down, release to rise, in time with the guide.

use glam::Vec2;
use serde::{Deserialize, Serialize};

use super::*;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct TempoSquats {
    pub rep: usize,
    pub rt: f32,
    pub depth: f32,
    pub deepest: f32,
    pub timing: f32,
    pub timing_n: f32,
    pub band_in: f32,
    pub band_n: f32,
    pub sum: f32,
    pub belled: bool,
    pub in_band: bool,
    pub kettle: Option<EntityId>,
    pub gag: f32,
    pub reps_counted: usize,
}

impl TempoSquats {
    pub fn new() -> Self {
        Self::default()
    }
    fn rep_len(r: &Rules) -> f32 {
        r.squats.down + r.squats.up + r.squats.rest
    }
    /// The guide's depth at `rt` seconds into a rep.
    fn guide(rt: f32, r: &Rules) -> f32 {
        let s = &r.squats;
        if rt < s.down {
            rt / s.down
        } else if rt < s.down + s.up {
            1.0 - (rt - s.down) / s.up
        } else {
            0.0
        }
    }

    pub fn start(&mut self, c: &mut RunCommon, cx: &mut Cx) {
        let at = cx.stage(Set::Gazebo);
        ready_player(cx, Set::Gazebo, at, 0.0);
        cam(cx.sim, 14.0, 18.0, 9.0, 36.0);
        self.kettle = npc(cx.sim, "kettle");
        c.say_key(Who::Kettle, "kettle.squat_start", 0);
    }

    pub fn tick(&mut self, c: &mut RunCommon, cx: &mut Cx, it: &Intent) -> Option<f32> {
        let s = &cx.rules.squats;
        let dt = cx.dt;
        if self.gag > 0.0 {
            // Rep 10 is followed by "Ten. Also eleven."
            self.gag -= dt;
            scrub(cx.sim, cx.pid, "FIT/Squat", 0.0);
            return (self.gag <= 0.0).then(|| clamp01(self.sum / s.reps / s.par) * 1000.0);
        }
        self.rt += dt;
        if it.act {
            self.depth += dt / s.down;
        } else {
            self.depth -= dt / s.up;
        }
        self.depth = clamp01(self.depth);
        self.deepest = self.deepest.max(self.depth);
        let amp = 1.0 + s.wobble_per_rep * self.rep as f32;
        c.step(cx, it.lean, amp * s.wobble, Vec2::ZERO, Vec2::ZERO);
        if c.core.tipped {
            c.tip_fx(cx, false);
        }
        self.in_band = c.core.cob.x.abs() < s.band;
        let g = Self::guide(self.rt, cx.rules);
        if self.rt < s.down + s.up {
            // Timing and balance count while the guide moves.
            self.timing += 1.0 - clamp01((self.depth - g).abs() / s.tolerance);
            self.timing_n += 1.0;
            if self.in_band {
                self.band_in += 1.0;
            }
            self.band_n += 1.0;
        }
        if !self.belled && self.rt >= s.down {
            self.belled = true;
            cx.sfx(sound::BELL, 0.7, 0.6);
        }
        scrub(cx.sim, cx.pid, "FIT/Squat", self.depth);
        lean_figure(cx.sim, cx.pid, c.core.cob, 18.0, cx.rules.core.tilt_deg, cx.slump);
        if let Some(k) = self.kettle {
            lean_figure(cx.sim, k, Vec2::new(0.0, -self.depth * 0.3), 18.0, 14.0, 0.0);
        }
        if self.rt >= Self::rep_len(cx.rules) {
            let timing = self.timing / self.timing_n.max(1.0);
            let band = self.band_in / self.band_n.max(1.0);
            // No credit for a rep you didn't go down for.
            let rep = if self.deepest > 0.55 { s.timing_weight * timing + (1.0 - s.timing_weight) * band } else { 0.0 };
            self.sum += rep;
            self.rep += 1;
            c.score = clamp01(self.sum / s.reps / s.par) * 1000.0;
            self.rt = 0.0;
            self.deepest = 0.0;
            self.timing = 0.0;
            self.timing_n = 0.0;
            self.band_in = 0.0;
            self.band_n = 0.0;
            self.belled = false;
            cx.sfx(sound::TICK, 0.7, 1.0 + rep * 0.4);
            if self.rep < s.reps as usize {
                c.say_key(Who::Kettle, "kettle.squat_rep", self.rep);
            } else {
                c.say_key(Who::Kettle, "kettle.squat_end", 0);
                self.gag = 2.8;
            }
        }
        None
    }

    pub fn stop(&mut self, cx: &mut Cx) {
        if let Some(k) = self.kettle {
            clear_lean(cx.sim, k);
        }
    }

    pub fn hud(&self, c: &RunCommon, r: &Rules, ui: &mut Ui) {
        c.top_bar(ui, "Tempo Squats", None);
        let mut p = c.puck(true);
        p.band = Some(r.squats.band);
        p.good = self.in_band;
        ui.puck(p);
        // The tempo bar: the guide above, you beside it.
        let (x, y, w, h) = (250.0, 290.0, 150.0, 460.0);
        ui.panel(x - 30.0, y - 30.0, w + 60.0, h + 60.0, with_alpha(WHITE, 0.9), 32.0);
        let g = Self::guide(self.rt, r);
        ui.panel(x, y + h * g - 12.0, w, 24.0, TEAL, 12.0);
        ui.circle(x + w * 0.5, y + h * self.depth, 34.0, CORAL, WHITE, 5.0);
        ui.label(x + w * 0.5, y - 92.0, 44.0, INK, Align::Center, format!("{}/{}", (self.rep + 1).min(r.squats.reps as usize), r.squats.reps));
        ui.prompt_row(&[(Act::Confirm, "Hold to go down"), (Act::Lean, "Stay in the band")]);
    }

    pub fn bot(&self, c: &RunCommon, r: &Rules) -> Intent {
        let down = self.rt < r.squats.down;
        Intent { act: down, act_just: down, lean: Vec2::new(-c.core.cob.x * 0.8, -c.core.cob.y * 0.3), ..Default::default() }
    }
}
