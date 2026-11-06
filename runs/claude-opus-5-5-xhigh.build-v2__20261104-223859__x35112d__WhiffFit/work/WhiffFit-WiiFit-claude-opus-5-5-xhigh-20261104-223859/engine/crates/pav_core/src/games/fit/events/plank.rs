//! Plank Standoff: hold Brace, keep the dot in a shrinking ring. A talk with a kettlebell.

use glam::Vec2;
use serde::{Deserialize, Serialize};

use super::*;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct PlankStandoff {
    pub len: f32,
    pub held: f32,
    pub out: f32,
    pub radius: f32,
    pub inside: bool,
    pub started: bool,
    pub flop: f32,
    pub grace: f32,
    pub waves: bool,
    pub wave_in: f32,
    pub said: u8,
    pub kettle: Option<EntityId>,
    pub result: Option<f32>,
}

impl PlankStandoff {
    pub fn new(len: f32, waves: bool) -> Self {
        Self { len, waves, radius: 0.4, grace: 3.0, wave_in: 3.0, ..Default::default() }
    }

    pub fn start(&mut self, c: &mut RunCommon, cx: &mut Cx) {
        if !self.waves {
            let at = cx.stage(Set::Gazebo);
            ready_player(cx, Set::Gazebo, at, 1.2);
            cam(cx.sim, 12.0, 30.0, 8.0, 36.0);
            self.kettle = npc(cx.sim, "kettle");
            c.say_key(Who::Kettle, "kettle.plank_start", 0);
        }
    }

    pub fn tick(&mut self, c: &mut RunCommon, cx: &mut Cx, it: &Intent) -> Option<f32> {
        let r = &cx.rules.plank;
        let dt = cx.dt;
        if self.flop > 0.0 {
            self.flop -= dt;
            scrub(cx.sim, cx.pid, "FIT/Flop", 1.0 - clamp01(self.flop / 1.6));
            return (self.flop <= 0.0).then_some(self.result.unwrap_or(0.0));
        }
        let braced = it.brace();
        if braced && !self.started {
            self.started = true;
            cx.sfx(sound::BELL, 0.5, 0.8);
        }
        if !self.started {
            self.grace -= dt;
        } else {
            self.held += dt;
        }
        let u = clamp01(self.held / self.len);
        self.radius = r.ring_start + (r.ring_end - r.ring_start) * u;
        let fatigue = 1.0 + r.fatigue * u;
        let tremble = if self.held > r.tremble_at { r.tremble * ((c.t * 31.0).sin() * 0.6 + (c.t * 47.0).sin() * 0.4) } else { 0.0 };
        let mut nudge = Vec2::new(tremble, tremble * 0.7);
        if !self.waves && self.held > r.laugh_at && self.said < 3 {
            self.said = 3;
            c.say_key(Who::Kettle, "kettle.plank_joke", 0);
            nudge += Vec2::new(r.laugh_nudge, r.laugh_nudge * 0.5);
            cx.sfx(sound::GONG, 0.5, 0.7);
            // He laughs so hard the picture shakes.
            let at = cx.feet();
            cx.ev.push(crate::frame::SimEvent::Slam { pos: at, radius: 1.6 });
        } else if self.held > r.tremble_at && self.said < 2 {
            self.said = 2;
            c.say_key(Who::Kettle, "kettle.plank_talk", 1);
        } else if self.held > r.tremble_at * 0.5 && self.said < 1 {
            self.said = 1;
            c.say_key(Who::Kettle, "kettle.plank_talk", 0);
        }
        if self.waves {
            self.wave_in -= dt;
            if self.wave_in <= 0.0 {
                self.wave_in = 2.6;
                let a = c.t * 2.1;
                nudge += Vec2::new(a.cos(), a.sin()) * cx.rules.stand.wave_nudge;
                cx.sfx(sound::WAVE, 0.7, 1.0);
                let at = cx.feet();
                cx.ev.push(crate::frame::SimEvent::BigSplash { pos: at + Vec3Ext::side(a), size: 0.25 });
            }
        }
        c.step(cx, it.lean, r.wobble * fatigue, Vec2::ZERO, nudge);
        self.inside = c.core.cob.length() < self.radius;
        if self.inside {
            self.out = 0.0;
        } else {
            self.out += dt;
        }
        c.score = clamp01(self.held / self.len.max(1.0)) * 1000.0;
        if self.waves {
            // On the post: a braced stance, knees soft, not a plank.
            play(cx.sim, cx.pid, "FIT/Paddle");
            lean_figure(cx.sim, cx.pid, c.core.cob, 0.0, cx.rules.core.tilt_deg, cx.slump);
        } else {
            scrub(cx.sim, cx.pid, "FIT/Plank", 0.0);
            lean_figure(cx.sim, cx.pid, c.core.cob * 0.5, 30.0, 8.0, 0.0);
        }
        let gave_up = self.started && !braced;
        let fell = self.out > r.out_time;
        let never = !self.started && self.grace <= 0.0;
        if gave_up || fell || never || self.held >= self.len {
            let done = self.held >= self.len;
            if self.waves {
                // The finale has its own words, and no floor to flop on.
                return Some(c.score);
            }
            if done {
                self.result = Some(c.score);
                c.say_key(Who::Kettle, "kettle.plank_win", 0);
                self.flop = 1.6;
            } else {
                self.result = Some(c.score);
                c.say_key(Who::Kettle, "kettle.plank_fail", 0);
                self.flop = 1.6;
                cx.sfx(sound::BUMP, 1.0, 0.7);
            }
        }
        None
    }

    pub fn stop(&mut self, _cx: &mut Cx) {}

    pub fn hud(&self, c: &RunCommon, _r: &Rules, ui: &mut Ui) {
        if !self.waves {
            c.top_bar(ui, "Plank Standoff", Some(self.len - self.held));
        }
        let mut p = c.puck(true);
        p.ring = Some([0.0, 0.0, self.radius]);
        p.good = self.inside;
        ui.puck(p);
        if !self.started {
            ui.label(960.0, 430.0, 64.0, CORAL, Align::Center, "Brace to begin");
        }
        ui.label(960.0, 880.0, 72.0, INK, Align::Center, format!("{:.1} s", self.held));
        ui.prompt_row(&[(Act::Brace, "Hold both"), (Act::Lean, "Stay in the ring")]);
    }

    pub fn bot(&self, c: &RunCommon, _r: &Rules) -> Intent {
        let lean = (-c.core.cob * 1.4 - c.core.vel * 0.12).clamp_length_max(1.0);
        Intent { l: true, r: true, l_just: !self.started, r_just: !self.started, lean, ..Default::default() }
    }
}

/// A point a little to one side, for wave splashes.
struct Vec3Ext;
impl Vec3Ext {
    fn side(a: f32) -> glam::Vec3 {
        glam::Vec3::new(a.cos() * 4.0, -1.3, a.sin() * 2.0 + 3.0)
    }
}
