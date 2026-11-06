//! The Morning Wobble Check: four micro-tests, Pip presiding. Then the Balance Age.

use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::events::{Cx, Intent, RunCommon, ready_player};
use super::rules::Rules;
use super::ui_model::*;
use super::world::*;
use super::dialog::Who;
use crate::entity::EntityId;

pub const TESTS: [(&str, &str); 4] = [
    ("Stand Still", "This is the whole test."),
    ("Lean Targets", "Reach the mark. Hold it. Politely."),
    ("Eyes Closed", "The screen goes dark. Listen to the tone. Lower is left."),
    ("Step Test", "Eight steps, in time, left and right."),
];

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum CheckPhase {
    #[default]
    Card,
    Run,
    Done,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Check {
    pub c: RunCommon,
    pub test: usize,
    pub phase: CheckPhase,
    pub pt: f32,
    pub metrics: [f32; 4],
    pub dist_sum: f32,
    pub dist_n: f32,
    pub nudged: bool,
    pub target_i: usize,
    pub targets: [f32; 3],
    pub target_t: f32,
    pub hold_t: f32,
    pub times: f32,
    pub step_i: u32,
    pub step_err: f32,
    pub step_foot: u8,
    pub tone_in: f32,
    pub beat_i: i32,
    pub pip: Option<EntityId>,
    pub rumble: f32,
    pub flash: f32,
}

impl Check {
    pub fn new(cx: &mut Cx) -> Self {
        let rng = &mut cx.sim.state.rng;
        let side = if rng.f32() < 0.5 { -1.0 } else { 1.0 };
        let targets = [side * 0.7, -side * 0.5, side * rng.range(0.2, 0.6)];
        let c = RunCommon { core: super::core::BalanceCore::new(rng), ..Default::default() };
        let mut me = Self { c, targets, ..Default::default() };
        let at = cx.stage(Set::Studio);
        ready_player(cx, Set::Studio, at + Vec3::Y * 0.55, 0.0);
        super::events::mirror_cam(cx.sim);
        me.pip = npc(cx.sim, "pip_check");
        if let Some(p) = me.pip {
            place(cx.sim, p, at, 0.0);
            // Pip, stood upon.
            cx.sfx(sound::PIP_SQUEAK, 0.8, 1.0);
        }
        me
    }

    fn begin_run(&mut self) {
        self.phase = CheckPhase::Run;
        self.pt = 0.0;
        self.dist_sum = 0.0;
        self.dist_n = 0.0;
        self.c.core.settle();
    }

    fn end_test(&mut self, metric: f32, cx: &mut Cx) {
        self.metrics[self.test] = clamp01(metric);
        cx.sfx(sound::TICK, 0.7, 1.0);
        self.test += 1;
        self.pt = 0.0;
        self.phase = if self.test >= 4 { CheckPhase::Done } else { CheckPhase::Card };
    }

    /// One tick; true when all four tests are done.
    pub fn tick(&mut self, cx: &mut Cx, it: &Intent) -> bool {
        let r = &cx.rules.check;
        let dt = cx.dt;
        self.pt += dt;
        self.c.t += dt;
        self.rumble = 0.0;
        match self.phase {
            CheckPhase::Done => return self.pt > 0.8,
            CheckPhase::Card => {
                let c = &mut self.c;
                c.step(cx, it.lean, 0.8, Vec2::ZERO, Vec2::ZERO);
                if it.act_just || self.pt > 3.0 {
                    self.begin_run();
                    cx.sfx(sound::GONG, 0.4, 1.3);
                }
                if self.pt < dt * 1.5 {
                    c_say(&mut self.c, self.test);
                }
            }
            CheckPhase::Run => match self.test {
                0 => {
                    let mut nudge = Vec2::ZERO;
                    if !self.nudged && self.pt >= 5.0 {
                        self.nudged = true;
                        nudge = Vec2::new(cx.sim.state.rng.range(-1.0, 1.0), 0.5).normalize_or(Vec2::X) * r.still_nudge * 10.0;
                        cx.sfx(sound::PIP_SQUEAK, 0.8, 1.0);
                    }
                    self.c.step(cx, it.lean, 0.9, Vec2::ZERO, nudge);
                    self.dist_sum += self.c.core.cob.length();
                    self.dist_n += 1.0;
                    if self.pt >= r.still_time {
                        let m = 1.0 - (self.dist_sum / self.dist_n.max(1.0)) / r.still_par;
                        self.end_test(m, cx);
                    }
                }
                1 => {
                    self.c.step(cx, it.lean, 0.7, Vec2::ZERO, Vec2::ZERO);
                    let target = self.targets[self.target_i];
                    self.target_t += dt;
                    if (self.c.core.cob.x - target).abs() <= r.target_within {
                        self.hold_t += dt;
                    } else {
                        self.hold_t = 0.0;
                    }
                    if self.hold_t >= r.target_hold || self.target_t >= r.target_limit {
                        let done = self.hold_t >= r.target_hold;
                        self.times += if done { self.target_t } else { r.target_limit * 1.5 };
                        cx.sfx(if done { sound::STAR } else { sound::MISS }, 0.6, 1.0);
                        self.target_i += 1;
                        self.target_t = 0.0;
                        self.hold_t = 0.0;
                        if self.target_i >= 3 {
                            let m = 1.0 - (self.times / 3.0 - r.target_hold) / (r.target_limit - r.target_hold);
                            self.end_test(m, cx);
                        }
                    }
                }
                2 => {
                    self.c.step(cx, it.lean, 0.9, Vec2::ZERO, Vec2::ZERO);
                    let cob = self.c.core.cob;
                    self.dist_sum += cob.length();
                    self.dist_n += 1.0;
                    self.rumble = clamp01(cob.length() * 0.8);
                    self.tone_in -= dt;
                    if self.tone_in <= 0.0 {
                        self.tone_in = 0.13;
                        cx.sfx(sound::TONE, 0.55, 1.0 + cob.x * 0.7);
                    }
                    if self.pt >= r.blind_time {
                        let m = 1.0 - (self.dist_sum / self.dist_n.max(1.0)) / r.blind_par;
                        self.end_test(m, cx);
                    }
                }
                _ => {
                    self.c.step(cx, it.lean, 0.5, Vec2::ZERO, Vec2::ZERO);
                    let beat = 60.0 / r.step_bpm;
                    let lead = beat * 4.0;
                    let n = ((self.pt - lead + beat * 4.0) / beat).floor() as i32;
                    if n != self.beat_i {
                        self.beat_i = n;
                        cx.sfx(sound::TICK, if n % 4 == 0 { 0.8 } else { 0.5 }, if n % 4 == 0 { 1.3 } else { 1.0 });
                    }
                    let press = if it.l_just && it.r_just {
                        None
                    } else if it.l_just {
                        Some(0)
                    } else if it.r_just {
                        Some(1)
                    } else {
                        None
                    };
                    if let Some(f) = press {
                        if self.pt > lead - beat * 0.5 && (self.step_i as f32) < r.step_count {
                            let want = lead + self.step_i as f32 * beat;
                            let off = (self.pt - want).abs();
                            // The other foot, please: the same foot twice costs.
                            let wrong = self.step_i > 0 && f == self.step_foot;
                            self.step_err += off.min(r.step_par) + if wrong { r.step_par * 0.5 } else { 0.0 };
                            self.step_i += 1;
                            self.step_foot = f;
                            self.flash = 0.2;
                            cx.sfx(sound::STEP, 0.6, 1.0);
                            gesture(cx.sim, cx.pid, if f == 0 { "FIT/StepL" } else { "FIT/StepR" }, false);
                        }
                    }
                    let end = lead + (r.step_count + 1.0) * beat;
                    if self.pt >= end {
                        let missed = r.step_count - self.step_i as f32;
                        let err = (self.step_err + missed.max(0.0) * r.step_par) / r.step_count;
                        let m = 1.0 - err / r.step_par;
                        self.end_test(m, cx);
                    }
                }
            },
        }
        self.flash = (self.flash - dt).max(0.0);
        // Pip squashes and the figure rides on top.
        let cob = self.c.core.cob;
        lean_figure(cx.sim, cx.pid, cob, 0.0, cx.rules.core.tilt_deg, cx.slump);
        if let Some(p) = self.pip {
            let at = cx.stage(Set::Studio);
            place(cx.sim, p, at, 0.0);
            lean_figure(cx.sim, p, cob * 0.5, 0.0, 10.0, 0.0);
        }
        false
    }

    pub fn skill(&self, r: &Rules) -> f32 {
        let c = &r.check;
        c.weight_still * self.metrics[0] + c.weight_targets * self.metrics[1] + c.weight_blind * self.metrics[2] + c.weight_steps * self.metrics[3]
    }

    /// The worst of the four tests.
    pub fn worst(&self) -> usize {
        let mut w = 0;
        for i in 1..4 {
            if self.metrics[i] < self.metrics[w] {
                w = i;
            }
        }
        w
    }

    pub fn hud(&self, r: &Rules, ui: &mut Ui) {
        let (name, how) = TESTS[self.test.min(3)];
        match self.phase {
            CheckPhase::Card => {
                ui.card(460.0, 120.0, 1000.0, 200.0);
                ui.title(960.0, 140.0, 72.0, INK, Align::Center, name);
                ui.text(960.0, 240.0, 40.0, INK_SOFT, Align::Center, how);
                ui.prompt_row(&[(Act::Confirm, "Begin")]);
            }
            CheckPhase::Done => {}
            CheckPhase::Run => {
                let mut p = self.c.puck(true);
                match self.test {
                    0 => {
                        ui.panel(36.0, 30.0, 470.0, 112.0, with_alpha(WHITE, 0.93), 30.0);
                        ui.label(60.0, 40.0, 42.0, INK, Align::Left, name);
                        ui.text(60.0, 88.0, 38.0, INK_SOFT, Align::Left, format!("{:.0} s left", (r.check.still_time - self.pt).ceil().max(0.0)));
                        p.ring = Some([0.0, 0.0, 0.2]);
                        p.good = self.c.core.cob.length() < 0.2;
                        ui.puck(p);
                        ui.prompt_row(&[(Act::Lean, "Stay in the middle")]);
                    }
                    1 => {
                        ui.panel(36.0, 30.0, 470.0, 112.0, with_alpha(WHITE, 0.93), 30.0);
                        ui.label(60.0, 40.0, 42.0, INK, Align::Left, name);
                        ui.text(60.0, 88.0, 38.0, INK_SOFT, Align::Left, format!("Target {} of 3", self.target_i.min(2) + 1));
                        // A left/right bar.
                        let (x, y, w, h) = (360.0, 170.0, 1200.0, 110.0);
                        ui.panel(x - 20.0, y - 20.0, w + 40.0, h + 40.0, with_alpha(WHITE, 0.94), 36.0);
                        let t = self.targets[self.target_i.min(2)];
                        let at = |v: f32| x + w * (v + 1.0) * 0.5;
                        let tol = r.check.target_within * w * 0.5;
                        ui.panel(at(t) - tol, y, tol * 2.0, h, MINT, 16.0);
                        ui.circle(at(self.c.core.cob.x.clamp(-1.0, 1.0)), y + h * 0.5, 44.0, CORAL, WHITE, 6.0);
                        let side = if t < 0.0 { "left" } else { "right" };
                        ui.label(960.0, 310.0, 54.0, INK, Align::Center, format!("{:.0}% {side}", t.abs() * 100.0));
                        ui.bar(760.0, 390.0, 400.0, 26.0, clamp01(self.hold_t / r.check.target_hold), TEAL);
                        ui.prompt_row(&[(Act::Lean, "Lean to the mark and hold")]);
                    }
                    2 => {
                        ui.fade([6, 12, 20, 240]);
                        ui.text(960.0, 480.0, 44.0, [120, 140, 160, 255], Align::Center, "Listen.");
                    }
                    _ => {
                        ui.panel(36.0, 30.0, 470.0, 112.0, with_alpha(WHITE, 0.93), 30.0);
                        ui.label(60.0, 40.0, 42.0, INK, Align::Left, name);
                        ui.text(60.0, 88.0, 38.0, INK_SOFT, Align::Left, format!("Step {} of {}", self.step_i, r.check.step_count as u32));
                        let beat = 60.0 / r.check.step_bpm;
                        let u = (self.pt / beat).fract();
                        ui.circle(960.0, 205.0, 80.0 + 60.0 * (1.0 - u), with_alpha(TEAL, 0.25 + 0.5 * (1.0 - u)), TEAL, 8.0);
                        let lead = beat * 4.0;
                        let word = if self.pt < lead { "Wait for it".to_string() } else { "Step".to_string() };
                        ui.label(960.0, 180.0, 50.0, INK, Align::Center, word);
                        ui.prompt_row(&[(Act::StepL, "Left"), (Act::StepR, "Right")]);
                    }
                }
            }
        }
        quip_ui(&self.c, ui);
    }

    pub fn bot(&self, r: &Rules) -> Intent {
        let mut it = Intent::default();
        match self.phase {
            CheckPhase::Card => {
                it.act_just = self.pt > 1.0;
                it.act = it.act_just;
            }
            CheckPhase::Done => {}
            CheckPhase::Run => match self.test {
                1 => {
                    let t = self.targets[self.target_i.min(2)];
                    let lean = t / r.core.reach + (t - self.c.core.cob.x) * 0.7;
                    it.lean = Vec2::new(lean.clamp(-1.0, 1.0), -self.c.core.cob.y * 0.5);
                }
                3 => {
                    let beat = 60.0 / r.check.step_bpm;
                    let lead = beat * 4.0;
                    let want = lead + self.step_i as f32 * beat;
                    if (self.step_i as f32) < r.check.step_count && self.pt + 1.0 / 60.0 >= want {
                        if self.step_i % 2 == 0 {
                            it.l_just = true;
                        } else {
                            it.r_just = true;
                        }
                    }
                }
                _ => {
                    it.lean = (-self.c.core.cob * 1.2 - self.c.core.vel * 0.1).clamp_length_max(1.0);
                }
            },
        }
        it
    }
}

fn c_say(c: &mut RunCommon, test: usize) {
    c.say_key(Who::Pip, "pip.check_test", test);
}

/// A coach's line in a small card.
pub fn quip_ui(c: &RunCommon, ui: &mut Ui) {
    if let Some(q) = &c.quip {
        let text: String = q.text().chars().take(q.shown as usize).collect();
        if text.is_empty() {
            return;
        }
        let (x, y, w, h) = (300.0, 810.0, 1320.0, 160.0);
        ui.card_c(x, y, w, h, with_alpha(WHITE, 0.96));
        ui.label(x + 30.0, y + 6.0, 34.0, TEAL, Align::Left, q.who.name());
        ui.para(x + 30.0, y + 52.0, w - 60.0, 36.0, INK, Align::Left, text);
    }
}
