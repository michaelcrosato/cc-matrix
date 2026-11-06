//! The Morning Wobble Check: four micro-tests, Pip presiding, then the verdict.

use glam::Vec2;
use serde::{Deserialize, Serialize};

use super::core::BalanceCore;
use super::events::*;
use super::rules::Rules;
use super::script::{self, PIP};
use super::sfx;
use super::ui_model::*;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Check {
    pub test: u32,
    pub t: f32,
    pub intro: f32,
    pub still: f32,
    still_n: f32,
    nudged: bool,
    pub targets: [f32; 3],
    target_i: u32,
    hold: f32,
    target_t: f32,
    pub target_at: [f32; 3],
    pub blind: f32,
    blind_n: f32,
    tone_in: f32,
    pub steps: f32,
    pub step_n: u32,
    step_next: u32,
    pub metric: [f32; 4],
    pub done: bool,
    last_tick: u32,
    pub rumble: f32,
}

pub const TESTS: [(&str, &str); 4] = [
    ("Stand Still", "This is the whole test."),
    ("Lean Targets", "Lean to the mark and stay there."),
    ("Eyes Closed", "Close your eyes. The tone tells you where you are. The tone is honest."),
    ("Step Test", "Eight steps, left and right, to the tick."),
];

const INTRO: f32 = 7.0;
const STEP_BEAT: f32 = 0.6; // 100 BPM
const STEPS: u32 = 8;

impl Check {
    pub fn new(cx: &mut Cx) -> Self {
        let c = cx.spot(STUDIO, "center");
        cx.player(c, 0.0);
        cx.core.wobble = 0.8;
        *cx.shot = Shot { tilt: 12.0, yaw: 0.0, distance: 8.5, fov: 36.0, height: 0.9, focus: c };
        let a = cx.rng().range(0.0, 1.0);
        let targets = [-0.7, 0.45 + a * 0.2, -0.3 - a * 0.2];
        Self { intro: INTRO, targets, ..Default::default() }
    }

    pub fn current_target(&self) -> f32 {
        self.targets[self.target_i.min(2) as usize]
    }

    /// Returns true when all four tests are done.
    pub fn tick(&mut self, cx: &mut Cx, i: &Intent) -> bool {
        let dt = cx.dt;
        if self.intro > 0.0 {
            self.intro -= dt;
            cx.lean_body(0.0);
            cx.stop_clip();
            return false;
        }
        self.t += dt;
        let d = cx.core.cob.length();
        self.rumble = 0.0;
        match self.test {
            0 => {
                self.still += d * dt;
                self.still_n += dt;
                if self.t > 5.0 && !self.nudged {
                    self.nudged = true;
                    cx.core.nudge += Vec2::new(16.0, 4.0);
                    cx.sfx(sfx::SQUEAK, 0.6, 1.0);
                }
                if self.t >= 8.0 {
                    self.metric[0] = clamp01(1.0 - (self.still / self.still_n.max(0.1)) / 0.28);
                    self.next(cx);
                }
            }
            1 => {
                self.target_t += dt;
                let target = self.current_target();
                if (cx.core.cob.x - target).abs() <= 0.06 {
                    self.hold += dt;
                } else {
                    self.hold = 0.0;
                }
                if self.hold >= 1.5 || self.target_t >= 5.0 {
                    let hit = self.hold >= 1.5;
                    self.target_at[self.target_i as usize] = if hit { self.target_t } else { 6.5 };
                    cx.sfx(if hit { sfx::STAR } else { sfx::SQUEAK }, 0.6, penta(self.target_i + 2));
                    self.hold = 0.0;
                    self.target_t = 0.0;
                    self.target_i += 1;
                    if self.target_i >= 3 {
                        let mean = (self.target_at[0] + self.target_at[1] + self.target_at[2]) / 3.0;
                        // 1.5 s is flawless (the hold itself), 5 s or a miss earns nothing.
                        self.metric[1] = clamp01(1.0 - (mean - 1.7) / 3.3);
                        self.next(cx);
                    }
                }
            }
            2 => {
                self.blind += d * dt;
                self.blind_n += dt;
                self.tone_in -= dt;
                if self.tone_in <= 0.0 {
                    self.tone_in = 0.22;
                    // Off centre, the tone rises; a touch to the right and it is brighter.
                    let pitch = 1.0 + d * 1.6 + cx.core.cob.x * 0.25;
                    cx.sfx(sfx::TONE, 0.6, pitch);
                }
                self.rumble = (d * 1.2).min(1.0);
                if self.t >= 6.0 {
                    self.metric[2] = clamp01(1.0 - (self.blind / self.blind_n.max(0.1)) / 0.3);
                    self.next(cx);
                }
            }
            _ => {
                // A tick per step; the press nearest each tick counts, against the expected foot.
                let beat = (self.t / STEP_BEAT) as u32;
                if beat != self.last_tick {
                    self.last_tick = beat;
                    if beat < STEPS {
                        cx.sfx(sfx::TICK, 0.7, if beat.is_multiple_of(2) { 1.0 } else { 1.2 });
                    }
                }
                for (p, foot) in [(i.l_p, 0u32), (i.r_p, 1u32)] {
                    if p && self.step_next < STEPS {
                        let want = (self.step_next + 1) as f32 * STEP_BEAT;
                        let err = (self.t - want).abs();
                        let ok = self.step_next % 2 == foot;
                        self.steps += if ok { clamp01(1.0 - err / 0.25) } else { 0.0 };
                        self.step_n += 1;
                        self.step_next += 1;
                        cx.sfx(sfx::STEP, 0.7, 1.0);
                        cx.gesture(if foot == 0 { "FIT/StepL" } else { "FIT/StepR" });
                    }
                }
                if self.t >= (STEPS + 2) as f32 * STEP_BEAT {
                    self.metric[3] = clamp01(self.steps / STEPS as f32);
                    self.done = true;
                    return true;
                }
            }
        }
        cx.lean_body(0.0);
        false
    }

    fn next(&mut self, cx: &mut Cx) {
        self.test += 1;
        self.t = 0.0;
        self.intro = INTRO;
        cx.core.center();
        cx.sfx(sfx::CONFIRM, 0.6, 1.0);
    }

    pub fn skill(&self) -> f32 {
        0.30 * self.metric[0] + 0.25 * self.metric[1] + 0.25 * self.metric[2] + 0.20 * self.metric[3]
    }

    pub fn worst(&self) -> usize {
        let mut w = 0;
        for k in 1..4 {
            if self.metric[k] < self.metric[w] {
                w = k;
            }
        }
        w
    }

    pub fn bot(&self, core: &BalanceCore, _r: &Rules) -> Intent {
        let mut i = Intent::default();
        match self.test {
            1 => i.lean = pd(core, Vec2::new(self.current_target() / 0.92, 0.0)),
            3 => {
                let want = (self.step_next + 1) as f32 * STEP_BEAT;
                if self.intro <= 0.0 && self.step_next < STEPS && (self.t - want).abs() < 0.012 {
                    if self.step_next % 2 == 0 {
                        i.l = true;
                        i.l_p = true;
                    } else {
                        i.r = true;
                        i.r_p = true;
                    }
                }
            }
            _ => i.lean = pd(core, Vec2::ZERO),
        }
        i
    }

    pub fn hud(&self, b: &mut B, core: &BalanceCore) {
        let (name, how) = TESTS[self.test.min(3) as usize];
        if self.test == 2 && self.intro <= 0.0 {
            // Eyes Closed: the screen dims to almost black, and the Puck vanishes.
            b.tint([6, 10, 18, 240]);
            b.center(960.0, 980.0, 40.0, [150, 165, 180, 255], "Listen.");
            return;
        }
        b.card([300.0, 30.0, 1480.0, 210.0], DECK);
        b.title(890.0, 40.0, 72.0, TEAL, name);
        b.wrap_center(890.0, 130.0, 1120.0, 34.0, INK, how);
        b.title_left(60.0, 30.0, 72.0, INK, &format!("{}/4", self.test + 1));
        match self.test {
            1 => {
                // A left/right bar.
                let (x0, x1, y) = (360.0, 1560.0, 940.0);
                b.flat([x0, y, x1, y + 60.0], PALE, 30.0);
                let at = |v: f32| x0 + (x1 - x0) * (v * 0.5 + 0.5);
                let tg = self.current_target();
                b.flat([at(tg - 0.06), y - 12.0, at(tg + 0.06), y + 72.0], MINT, 12.0);
                b.circle([at(core.cob.x.clamp(-1.0, 1.0)), y + 30.0], 34.0, CORAL, WHITE, 5.0);
                let (side, pct) = if tg < 0.0 { ("left", -tg) } else { ("right", tg) };
                b.center(960.0, 860.0, 48.0, INK, &format!("Reach {}% {side}", (pct * 100.0) as u32));
            }
            3 => {
                for k in 0..STEPS {
                    let x = 960.0 + (k as f32 - 3.5) * 120.0;
                    let on = k < self.step_next;
                    b.circle([x, 960.0], 44.0, if on { TEAL } else { PALE }, WHITE, 5.0);
                }
                let foot = if self.step_next % 2 == 0 { Glyph::StepL } else { Glyph::StepR };
                b.prompt_center(960.0, 870.0, &[foot], "On the tick");
            }
            _ => {
                b.puck(PUCK_TOP, PUCK_R, core.cob.into());
                b.puck_ring([0.0, 0.0], 0.15);
            }
        }
    }

    /// Pip's words on it. `delta`: this morning's age against yesterday's (None the first day).
    pub fn verdict(&self, age: i32, delta: Option<i32>, core: &BalanceCore, pick: u32) -> Vec<(u8, String)> {
        let mut out = vec![(PIP, format!("Your Balance Age today is {age}. That is a number. Numbers cannot hurt you."))];
        match delta {
            Some(d) if d < 0 => out.push((PIP, script::line("pip_better", pick))),
            Some(d) if d > 0 => out.push((PIP, script::line("pip_worse", pick))),
            Some(_) => out.push((PIP, script::line("pip_same", pick))),
            None => out.push((PIP, script::line("pip_first_age", pick))),
        }
        let total = (core.left_time + core.right_time).max(0.1);
        let left = (core.left_time / total * 100.0) as u32;
        let worst = self.worst();
        let by = match worst {
            0 => "pip_worst_still",
            1 => "pip_worst_targets",
            2 => "pip_worst_blind",
            _ => "pip_worst_steps",
        };
        if left >= 60 {
            out.push((PIP, format!("You leaned left {left}% of the time. Is everything all right on the right?")));
        } else {
            out.push((PIP, script::line(by, pick)));
        }
        out
    }
}

