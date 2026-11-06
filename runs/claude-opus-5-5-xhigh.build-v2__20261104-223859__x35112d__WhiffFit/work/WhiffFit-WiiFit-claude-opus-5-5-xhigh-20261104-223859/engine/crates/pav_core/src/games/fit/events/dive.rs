//! Cannonball Cup: bounce, leap, tuck. We are not here for form. We are here for splash.

use glam::{Quat, Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::*;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum DivePhase {
    #[default]
    Bounce,
    Air,
    Splash,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct CannonballCup {
    pub dive: usize,
    pub phase: DivePhase,
    pub pt: f32,
    pub presses: u32,
    pub power: f32,
    pub pressed_now: bool,
    pub timing: f32,
    pub tuck: f32,
    pub spin: f32,
    pub spin_v: f32,
    pub pos: Vec3,
    pub vel: Vec3,
    pub apex: f32,
    pub entry_tuck: f32,
    pub scores: Vec<f32>,
    pub last_score: f32,
    pub cards: Vec<String>,
    pub board: Option<EntityId>,
    pub tip: Vec3,
    pub water: f32,
    pub judges: Vec<EntityId>,
    pub said: bool,
}

impl CannonballCup {
    pub fn new() -> Self {
        Self::default()
    }

    /// Time to the next bottom of the bounce.
    fn to_bottom(&self, r: &Rules) -> f32 {
        let p = r.dive.period;
        let u = (self.pt / p).fract();
        // The bottom comes at phase 0.75 of a sine.
        let d = (0.75 - u).rem_euclid(1.0);
        d.min(1.0 - d) * p * if d < 0.5 { 1.0 } else { -1.0 }
    }

    fn reset_dive(&mut self, cx: &mut Cx) {
        self.phase = DivePhase::Bounce;
        self.pt = 0.0;
        self.presses = 0;
        self.power = 0.0;
        self.timing = 0.0;
        self.tuck = 0.0;
        self.spin = 0.0;
        self.spin_v = 0.0;
        self.apex = 0.0;
        self.cards.clear();
        self.said = false;
        place(cx.sim, cx.pid, self.tip, 0.0);
        stop_clip(cx.sim, cx.pid);
    }

    pub fn start(&mut self, c: &mut RunCommon, cx: &mut Cx) {
        let at = cx.stage(Set::Tower);
        self.tip = at + Vec3::new(0.0, cx.rules.dive.tower, 0.0);
        self.water = at.y;
        ready_player(cx, Set::Tower, self.tip, 0.0);
        cam_full(cx.sim, 6.0, 90.0, 14.0, 42.0, 0.0, 0.06, None);
        self.board = Some(spawn_prop(cx.sim, "LIB/core/diving_board", self.tip, 0.0, 1.0));
        self.judges = ["judge1", "judge2", "judge3"].iter().filter_map(|n| cx.sim.state.entities.iter().find(|e| e.name == *n).map(|e| e.id)).collect();
        self.reset_dive(cx);
        c.say_key(Who::Gull, "gull.dive_start", 0);
    }

    pub fn tick(&mut self, c: &mut RunCommon, cx: &mut Cx, it: &Intent) -> Option<f32> {
        let rules = cx.rules;
        let r = &rules.dive;
        let dt = cx.dt;
        self.pt += dt;
        c.step(cx, it.lean, 0.5, Vec2::ZERO, Vec2::ZERO);
        match self.phase {
            DivePhase::Bounce => {
                let w = std::f32::consts::TAU / r.period;
                let amp = r.bounce_amp * (1.0 + self.presses as f32 * 0.5);
                let bob = (self.pt * w).sin() * amp;
                let feet = self.tip + Vec3::Y * (bob.max(-amp * 0.35));
                place(cx.sim, cx.pid, feet, 0.0);
                if let Some(b) = self.board {
                    let bend = (-bob / amp.max(0.01)).max(-0.4) * 0.06 * (1.0 + self.presses as f32 * 0.3);
                    pose(cx.sim, b, self.tip - Vec3::Y * bend.max(0.0) * 1.2, Quat::from_rotation_x(bend));
                }
                lean_figure(cx.sim, cx.pid, c.core.cob * 0.3, 90.0, 10.0, cx.slump);
                if it.act_just {
                    let off = self.to_bottom(rules).abs();
                    let good = 1.0 - clamp01(off / r.press_window);
                    self.timing += good;
                    self.presses += 1;
                    cx.sfx(sound::BOARD, 0.4 + 0.2 * self.presses as f32, 0.8 + 0.15 * self.presses as f32);
                    if self.presses >= 4 {
                        self.power = self.timing / 4.0;
                        self.phase = DivePhase::Air;
                        self.pt = 0.0;
                        self.pos = feet;
                        let v = r.leap_base + r.leap_power * self.power;
                        self.vel = Vec3::new(0.0, v, r.forward);
                        self.apex = feet.y;
                        cx.ev.push(crate::frame::SimEvent::Jump { pos: feet });
                        cx.sfx(sound::WHOOSH, 0.8, 1.0);
                    }
                }
                if self.pt > r.board_timeout {
                    // Nobody jumped: the board does it for you.
                    self.power = self.timing / 4.0 * 0.3;
                    self.phase = DivePhase::Air;
                    self.pt = 0.0;
                    self.pos = feet;
                    self.vel = Vec3::new(0.0, 1.0, 1.4);
                    self.apex = feet.y;
                    c.say_key(Who::Gull, "gull.dive_push", self.dive);
                }
            }
            DivePhase::Air => {
                self.vel.y -= r.gravity * dt;
                self.pos += self.vel * dt;
                self.apex = self.apex.max(self.pos.y);
                let want = if it.act { 1.0 } else { 0.0 };
                self.tuck += (want - self.tuck) * (1.0 - (-r.tuck_rate * dt).exp());
                self.spin_v = c.core.cob.y * r.spin_lean + self.tuck * r.spin_tuck;
                self.spin += self.spin_v * dt;
                place(cx.sim, cx.pid, self.pos, 0.0);
                // Tuck, or go in like a pencil and regret it.
                if self.tuck < 0.25 && self.vel.y < 0.0 {
                    play(cx.sim, cx.pid, "FIT/DiveEntry");
                } else {
                    scrub(cx.sim, cx.pid, "FIT/Tuck", self.tuck);
                }
                if let Some(a) = anim_of(cx.sim, cx.pid) {
                    a.tilt_side = 0.0;
                    a.tilt_fwd = self.spin;
                }
                if self.pos.y <= self.water + 0.1 {
                    self.entry_tuck = self.tuck;
                    let h = clamp01((self.apex - self.water) / r.height_par);
                    let tuck = r.flop_tuck + (1.0 - r.flop_tuck) * self.entry_tuck;
                    let timing = 0.3 + 0.7 * self.power;
                    let score = clamp01(h * tuck * timing / r.par) * 1000.0;
                    self.last_score = score;
                    self.scores.push(score);
                    self.phase = DivePhase::Splash;
                    self.pt = 0.0;
                    let size = 0.5 + 2.2 * score / 1000.0;
                    cx.ev.push(crate::frame::SimEvent::BigSplash { pos: self.pos, size });
                    cx.sfx(sound::SPLASH_B, 1.0, 1.0 - 0.3 * score / 1000.0);
                    // The cards.
                    let rng = &mut cx.sim.state.rng;
                    let v = score / 100.0;
                    self.cards = (0..3)
                        .map(|_| {
                            if rng.f32() < 0.12 {
                                "See me".to_string()
                            } else {
                                format!("{:.1}", ((v + rng.range(-0.8, 0.8)) * 2.0).round().clamp(0.0, 20.0) / 2.0)
                            }
                        })
                        .collect();
                    c.score = self.scores.iter().sum::<f32>() / 3.0;
                    c.say_key(Who::Gull, "gull.dive_after", self.dive + (score / 200.0) as usize);
                }
            }
            DivePhase::Splash => {
                // The figure bobs up, then it is the next dive.
                let up = self.water - 1.1 + clamp01(self.pt / 1.2) * 0.45;
                place(cx.sim, cx.pid, Vec3::new(self.pos.x, up, self.pos.z), 0.0);
                if let Some(a) = anim_of(cx.sim, cx.pid) {
                    a.tilt_fwd = 0.0;
                }
                play(cx.sim, cx.pid, "FIT/Tread");
                // The judges hop, holding up their cards.
                for (i, &j) in self.judges.iter().enumerate() {
                    let at = pos_of(cx.sim, j);
                    let base = cx.stage(Set::Tower).y + 0.4;
                    let hop = ((self.pt * 7.0 + i as f32).sin().abs()) * 0.25 * clamp01(self.pt);
                    move_to(cx.sim, j, Vec3::new(at.x, base + hop, at.z));
                }
                if self.pt >= r.splash_time {
                    self.dive += 1;
                    if self.dive >= 3 {
                        return Some(c.score);
                    }
                    self.reset_dive(cx);
                }
            }
        }
        None
    }

    pub fn stop(&mut self, cx: &mut Cx) {
        if let Some(b) = self.board.take() {
            cx.sim.despawn(b);
        }
        if let Some(a) = anim_of(cx.sim, cx.pid) {
            a.tilt_fwd = 0.0;
        }
    }

    pub fn hud(&self, c: &RunCommon, r: &Rules, ui: &mut Ui) {
        c.top_bar(ui, "Cannonball Cup", None);
        ui.panel(40.0, 170.0, 380.0, 76.0, with_alpha(WHITE, 0.9), 30.0);
        ui.label(60.0, 182.0, 44.0, INK, Align::Left, format!("Dive {} of 3", (self.dive + 1).min(3)));
        match self.phase {
            DivePhase::Bounce => {
                // Bounce meter: press when the bar is at the bottom.
                let off = self.to_bottom(r);
                let near = 1.0 - clamp01(off.abs() / (r.dive.period * 0.5));
                let (x, y) = (820.0, 830.0);
                ui.panel(x, y, 280.0, 60.0, with_alpha(WHITE, 0.9), 30.0);
                ui.panel(x + 8.0, y + 8.0, (280.0 - 16.0) * near, 44.0, if near > 0.75 { MINT } else { SEA }, 22.0);
                for i in 0..4 {
                    let col = if (i as u32) < self.presses { CORAL } else { with_alpha(WHITE, 0.9) };
                    ui.circle(816.0 + i as f32 * 96.0, 780.0, 30.0, col, INK_SOFT, 4.0);
                }
                let label = if self.presses >= 3 { "Leap at the bottom" } else { "Press at the bottom" };
                ui.prompt_row(&[(Act::Confirm, label)]);
            }
            DivePhase::Air => {
                ui.label(960.0, 180.0, 72.0, if self.tuck > 0.6 { TEAL } else { CORAL }, Align::Center, if self.tuck > 0.6 { "Tucked" } else { "Tuck!" });
                ui.prompt_row(&[(Act::Confirm, "Hold to tuck"), (Act::Lean, "Rotate")]);
            }
            DivePhase::Splash => {
                for (i, card) in self.cards.iter().enumerate() {
                    let x = 560.0 + i as f32 * 400.0;
                    ui.card(x - 170.0, 300.0, 340.0, 210.0);
                    ui.title(x, 350.0, if card.len() > 4 { 64.0 } else { 96.0 }, INK, Align::Center, card.clone());
                }
                ui.label(960.0, 560.0, 72.0, TEAL, Align::Center, format!("{:.0} splash", self.last_score));
            }
        }
    }

    pub fn bot(&self, c: &RunCommon, r: &Rules) -> Intent {
        let mut it = Intent::default();
        match self.phase {
            DivePhase::Bounce => {
                // Presses on bottoms.
                let off = self.to_bottom(r);
                let dt = 1.0 / 60.0;
                if off.abs() < dt * 0.6 && self.pt > 0.3 {
                    it.act_just = true;
                    it.act = true;
                }
            }
            DivePhase::Air => {
                // Tucks at the apex.
                if self.vel.y < 1.0 {
                    it.act = true;
                }
                it.lean = Vec2::new(0.0, 0.15);
            }
            DivePhase::Splash => {}
        }
        let _ = c;
        it
    }
}
