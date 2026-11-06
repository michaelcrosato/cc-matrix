//! The Morning Wobble Check: four micro-tests, Pip presiding. Each gives a metric 0..1.

use glam::Vec2;
use serde::{Deserialize, Serialize};

use super::core::BalanceCore;
use super::events::{Fx, Intent, Pose, sfx};
use super::rules::Rules;
use super::ui_model::*;
use crate::rng::Rng;

pub const TARGETS: [f32; 3] = [-0.70, 0.45, -0.25];
const BEAT: f32 = 0.6; // 100 BPM

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Check {
    /// 0 intro, 1 still, 2 targets, 3 blind, 4 steps.
    pub stage: i32,
    pub t: f32,
    pub metrics: [f32; 4],
    pub acc: f32,
    pub n: i32,
    pub hold: f32,
    pub tgt_t: f32,
    pub tgt_times: Vec<f32>,
    pub nudged: bool,
    pub last_side: i8,
    pub errs: Vec<f32>,
    pub fx: Vec<Fx>,
    pub done: bool,
    pub skill_hint: i32,
    pub tone_cd: f32,
    started_flag: bool,
    pub gap: f32,
    /// Pip's line for each part, from the script.
    pub lines: Vec<String>,
}

impl Check {
    pub fn new(_rules: &Rules, _rng: &mut Rng) -> Check {
        Check {
            stage: 0,
            t: 0.0,
            metrics: [0.0; 4],
            acc: 0.0,
            n: 0,
            hold: 0.0,
            tgt_t: 0.0,
            tgt_times: vec![],
            nudged: false,
            last_side: 0,
            errs: vec![],
            fx: vec![],
            done: false,
            skill_hint: 0,
            tone_cd: 0.0,
            started_flag: false,
            gap: 3.0,
            lines: vec![],
        }
    }

    pub fn stage_started(&mut self) -> bool {
        if self.stage > 0 && !self.started_flag {
            self.started_flag = true;
            return true;
        }
        false
    }

    pub fn skill(&self) -> f32 {
        let m = &self.metrics;
        (0.30 * m[0] + 0.25 * m[1] + 0.25 * m[2] + 0.20 * m[3]).clamp(0.0, 1.0)
    }

    pub fn worst(&self) -> usize {
        let mut w = 0;
        for i in 0..4 {
            if self.metrics[i] < self.metrics[w] {
                w = i;
            }
        }
        w
    }

    fn next(&mut self, stage: i32) {
        self.stage = stage;
        self.t = 0.0;
        self.acc = 0.0;
        self.n = 0;
        self.hold = 0.0;
        self.tgt_t = 0.0;
        self.nudged = false;
        self.errs.clear();
        self.gap = 2.5;
        self.fx.push(Fx::Sfx(sfx::GONG, 0.5, 1.0 + 0.1 * stage as f32));
    }

    pub fn step(&mut self, c: &mut BalanceCore, rules: &Rules, rng: &mut Rng, it: &Intent, dt: f32) {
        if self.done {
            return;
        }
        self.t += dt;
        let ch = &rules.check;
        match self.stage {
            0 => {
                // intro: three seconds of Pip, then the first test
                c.step(&rules.core, Vec2::ZERO, Vec2::ZERO, dt, rng);
                if self.t > 3.0 || it.any_p {
                    self.next(1);
                }
            }
            1 => {
                c.wobble_scale = 0.8;
                let mut nudge = Vec2::ZERO;
                if !self.nudged && self.t >= 5.0 {
                    self.nudged = true;
                    nudge = Vec2::new(9.0, 3.0) / dt * 0.02;
                    c.vel += Vec2::new(0.5, 0.15);
                    self.fx.push(Fx::Sfx(sfx::SQUEAK, 0.5, 1.2));
                }
                c.step(&rules.core, it.lean, nudge * 0.0, dt, rng);
                if self.gap > 0.0 {
                    self.gap -= dt;
                    self.t = 0.0;
                } else {
                    self.acc += c.cob.length() * dt;
                }
                if self.t >= ch.still_secs {
                    self.metrics[0] = (1.0 - (self.acc / ch.still_secs / 0.30).clamp(0.0, 1.0)).clamp(0.0, 1.0);
                    self.next(2);
                }
            }
            2 => {
                c.wobble_scale = 0.5;
                c.step(&rules.core, Vec2::new(it.lean.x, 0.0), Vec2::ZERO, dt, rng);
                if self.gap > 0.0 {
                    self.gap -= dt;
                    return;
                }
                self.tgt_t += dt;
                let target = TARGETS[self.n as usize];
                if (c.cob.x - target).abs() < 0.06 {
                    self.hold += dt;
                } else {
                    self.hold = 0.0;
                }
                if self.hold >= 1.5 || self.tgt_t >= 5.0 {
                    let used = if self.hold >= 1.5 { self.tgt_t } else { 5.0 + 1.5 };
                    self.tgt_times.push(used);
                    self.fx.push(Fx::Sfx(if self.hold >= 1.5 { sfx::CHIME } else { sfx::MISS }, 0.7, 1.0));
                    self.n += 1;
                    self.hold = 0.0;
                    self.tgt_t = 0.0;
                    if self.n >= 3 {
                        let mean = self.tgt_times.iter().sum::<f32>() / 3.0;
                        self.metrics[1] = (1.0 - ((mean - 1.5) / 5.0).clamp(0.0, 1.0)).clamp(0.0, 1.0);
                        self.next(3);
                    }
                }
            }
            3 => {
                c.wobble_scale = 0.8;
                c.step(&rules.core, it.lean, Vec2::ZERO, dt, rng);
                if self.gap > 0.0 {
                    self.gap -= dt;
                    self.t = 0.0;
                    return;
                }
                self.acc += c.cob.length() * dt;
                self.tone_cd -= dt;
                if self.tone_cd <= 0.0 {
                    self.tone_cd = 0.18;
                    let off = c.cob.length();
                    self.fx.push(Fx::Sfx(sfx::TONE, 0.5, 1.0 + off * 1.2));
                }
                if self.t >= ch.blind_secs {
                    self.metrics[2] = (1.0 - (self.acc / ch.blind_secs / 0.45).clamp(0.0, 1.0)).clamp(0.0, 1.0);
                    self.next(4);
                }
            }
            _ => {
                c.wobble_scale = 0.3;
                c.step(&rules.core, Vec2::ZERO, Vec2::ZERO, dt, rng);
                if self.gap > 0.0 {
                    self.gap -= dt;
                    self.t = 0.0;
                    return;
                }
                // metronome ticks
                let beat_now = (self.t / BEAT).floor();
                let beat_prev = ((self.t - dt) / BEAT).floor();
                if beat_now > beat_prev {
                    self.fx.push(Fx::Sfx(sfx::TICK, 0.6, if (beat_now as i32) % 2 == 0 { 1.0 } else { 0.8 }));
                }
                for (side, p) in [(-1i8, it.l_p), (1i8, it.r_p)] {
                    if p && side != self.last_side && self.n < 8 {
                        self.last_side = side;
                        let nearest = (self.t / BEAT).round() * BEAT;
                        self.errs.push((self.t - nearest).abs());
                        self.n += 1;
                        self.fx.push(Fx::Sfx(sfx::STEP, 0.5, 1.0));
                    }
                }
                if self.n >= 8 || self.t > 8.0 * BEAT + 3.0 {
                    let mut errs = self.errs.clone();
                    while errs.len() < 8 {
                        errs.push(0.3);
                    }
                    let mean = errs.iter().sum::<f32>() / 8.0;
                    self.metrics[3] = (1.0 - (mean / 0.2).clamp(0.0, 1.0)).clamp(0.0, 1.0);
                    self.done = true;
                }
            }
        }
    }

    pub fn bot(&self, c: &BalanceCore, rules: &Rules) -> Intent {
        let mut it = Intent::default();
        match self.stage {
            0 => {}
            1 | 3 => {
                it.lean = (-c.cob * 1.4 - c.vel * 0.06).clamp_length_max(1.0);
            }
            2 => {
                let target = TARGETS[(self.n as usize).min(2)];
                let aim = target / rules.core.reach;
                it.lean = Vec2::new((aim + (target - c.cob.x) * 0.5 - c.vel.x * 0.04).clamp(-1.0, 1.0), 0.0);
            }
            _ => {
                let nowb = (self.t / BEAT).round() * BEAT;
                if (self.t - nowb).abs() < 1.0 / 60.0 && self.t > 0.3 {
                    if self.last_side <= 0 {
                        it.r_p = true;
                        it.r = true;
                    } else {
                        it.l_p = true;
                        it.l = true;
                    }
                }
            }
        }
        it
    }

    pub fn pose(&self, c: &BalanceCore) -> Pose {
        let mut p = Pose::default();
        p.tilt = Vec2::new(c.cob.x, -c.cob.y) * 0.24;
        p.flail = c.cob.length() > 0.75;
        if self.stage == 4 {
            p.clip = if self.last_side < 0 { "FIT/StepL" } else if self.last_side > 0 { "FIT/StepR" } else { "" };
        }
        p
    }

    pub fn hud(&self, c: &BalanceCore, _rules: &Rules) -> (Hud, f32) {
        let mut h = Hud { title: "Morning Wobble Check".into(), ..Default::default() };
        let mut puck = Puck { cob: [c.cob.x, c.cob.y], alpha: 1.0, top: true, ..Default::default() };
        let mut dim = 0.0;
        let say = |i: usize, d: &str| self.lines.get(i).cloned().unwrap_or_else(|| d.to_string());
        match self.stage {
            0 => {
                h.big = "Good morning".into();
                h.line = say(0, "Please stand on me. Gently.");
                puck.alpha = 0.0;
            }
            1 => {
                h.line = if self.gap > 0.0 { say(1, "This is the whole test.") } else { "Hold the dot in the middle.".into() };
                puck.ring = [0.0, 0.0, 0.2];
                h.time = 0.0;
            }
            2 => {
                let target = TARGETS[(self.n as usize).min(2)];
                h.line = format!("Reach {}% {}", (target.abs() * 100.0).round() as i32, if target < 0.0 { "left" } else { "right" });
                h.meters.push(Meter { label: "Lean".into(), value: 0.5 + c.cob.x / 2.0, guide: 0.5 + target / 2.0 });
                puck.alpha = 0.5;
            }
            3 => {
                h.line = "Eyes closed. Listen.".into();
                puck.alpha = 0.0;
                dim = 0.92;
            }
            _ => {
                h.line = "Step left, right, left, right. With the tick.".into();
                puck.alpha = 0.3;
                h.prompts = vec![Prompt { act: Act::StepL, label: "Left".into() }, Prompt { act: Act::StepR, label: "Right".into() }];
            }
        }
        h.puck = Some(puck);
        (h, dim)
    }
}
