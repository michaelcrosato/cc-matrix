//! The Big Stand: five phases on a tiny post at sunset, reusing the events with new numbers.

use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::dialog::Who;
use super::events::{breath::BreathBloom, plank::PlankStandoff, pose::PoseParade, step::StepParty, Cx, EventState, Intent, RunCommon};
use super::rules::Rules;
use super::ui_model::*;
use super::world::*;
use crate::frame::SimEvent;

/// The phase names, for the card between them.
pub const PHASES: [&str; 5] = ["Breathing", "A Pose, in Weather", "Band of Guests", "Brace", "The Long Stillness"];

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct BigStand {
    pub phase: usize,
    pub sub: Option<Box<EventState>>,
    pub scores: Vec<f32>,
    pub t0: f32,
    pub card: f32,
    pub fall: f32,
    pub tips: u32,
    pub peace: bool,
    pub still_t: f32,
    pub spoke: bool,
    pub ending: f32,
    pub post: Vec3,
    pub crowd: Vec<crate::entity::EntityId>,
    pub seed_phase: Option<usize>,
    pub final_score: f32,
}

impl BigStand {
    /// `phase`: jump straight to a phase (dev mode, attract).
    pub fn new(phase: usize) -> Self {
        Self { phase, peace: true, card: 2.4, ..Default::default() }
    }

    pub fn start(&mut self, c: &mut RunCommon, cx: &mut Cx) {
        self.post = cx.stage(Set::Bay) + Vec3::Y * 1.4;
        show_set(cx.sim, Set::Bay);
        place(cx.sim, cx.pid, self.post, 0.0);
        stop_clip(cx.sim, cx.pid);
        cam_full(cx.sim, 10.0, 0.0, 9.0, 38.0, 0.9, 0.12, None);
        self.crowd = cx.sim.state.entities.iter().filter(|e| e.name.starts_with("crowd")).map(|e| e.id).collect();
        cx.ev.push(SimEvent::Music { song: song::BAND });
        cx.sfx(sound::CROWD, 0.8, 1.0);
        c.say_key(Who::Pip, "pip.stand_phase", self.phase);
    }

    fn make_phase(&mut self, c: &mut RunCommon, cx: &mut Cx) {
        let r = &cx.rules.stand;
        let mut st = match self.phase {
            0 => {
                let mut b = BreathBloom::new(r.breath_cycles as usize);
                b.finale = true;
                b.gust = r.breath_gust;
                EventState::Breath(b)
            }
            1 => {
                let mut p = PoseParade::new(cx.day + 2, 1, r.pose_len);
                p.finale = true;
                p.with_gull = false;
                p.gust = r.gust;
                EventState::Pose(p)
            }
            2 => EventState::Step(StepParty::new(Some(r.bars as usize))),
            _ => EventState::Plank(PlankStandoff::new(r.plank_len, true)),
        };
        self.t0 = c.t;
        // The band starts over with this phase, so its beat is the notes' beat.
        if self.phase == 2 {
            cx.ev.push(SimEvent::Music { song: song::BAND });
        }
        st.start(c, cx);
        place(cx.sim, cx.pid, self.post, 0.0);
        self.sub = Some(Box::new(st));
        c.score = 0.0;
    }

    /// One tick; `Some(score)` at the very end.
    pub fn tick(&mut self, c: &mut RunCommon, cx: &mut Cx, it: &Intent) -> Option<f32> {
        let dt = cx.dt;
        let rules = cx.rules;
        if self.ending > 0.0 {
            self.ending -= dt;
            return (self.ending <= 0.0).then_some(self.final_score);
        }
        if self.fall > 0.0 {
            // In the sea, and back on the post.
            self.fall -= dt;
            let u = self.fall / 1.6;
            let drop = if u > 0.5 { (1.0 - u) * 2.0 } else { u * 2.0 };
            place(cx.sim, cx.pid, self.post - Vec3::Y * drop * 2.2 + Vec3::new(1.2 * drop, 0.0, 0.0), 0.0);
            if self.fall <= 0.0 {
                c.core.settle();
                place(cx.sim, cx.pid, self.post, 0.0);
                cx.sfx(sound::SPLASH_S, 0.7, 1.0);
            }
            return None;
        }
        if self.card > 0.0 {
            self.card -= dt;
            c.step(cx, it.lean, 0.5, Vec2::ZERO, Vec2::ZERO);
            lean_figure(cx.sim, cx.pid, c.core.cob, 0.0, rules.core.tilt_deg, cx.slump);
            if self.card <= 0.0 && self.phase < 4 {
                self.make_phase(c, cx);
            } else if self.card <= 0.0 {
                self.t0 = c.t;
                cx.ev.push(SimEvent::Music { song: song::NONE });
                c.quip = None;
            }
            return None;
        }
        if self.phase < 4 {
            let saved = c.t;
            c.t -= self.t0;
            let mut sub = self.sub.take();
            let done = sub.as_mut().and_then(|s| s.tick(c, cx, it));
            self.sub = sub;
            c.t = saved;
            if c.core.tipped {
                self.tips += 1;
                self.fall = 1.6;
                cx.ev.push(SimEvent::BigSplash { pos: self.post - Vec3::Y * 1.2, size: 0.9 });
                cx.sfx(sound::GROAN, 0.9, 1.0);
                cx.sfx(sound::SPLASH_B, 0.8, 1.0);
                c.say_key(Who::Pip, "pip.stand_tip", self.tips as usize);
            }
            if let Some(s) = done {
                if let Some(mut st) = self.sub.take() {
                    st.stop(cx);
                }
                self.scores.push(s);
                self.phase += 1;
                self.card = 2.4;
                c.core.settle();
                for i in 0..self.crowd.len() {
                    gesture(cx.sim, self.crowd[i], "MESH2MOTION/Cheering_Two_Hands", true);
                }
                cx.sfx(sound::CLAP, 0.6, 1.0);
                cx.sfx(sound::CROWD, 0.5, 1.0);
                c.say_key(Who::Pip, "pip.stand_phase", self.phase);
                place(cx.sim, cx.pid, self.post, 0.0);
                stop_clip(cx.sim, cx.pid);
            }
            return None;
        }
        // The Long Stillness: nothing happens, and the game tries to make you press something.
        self.still_t += dt;
        c.step(cx, it.lean, 0.35, Vec2::ZERO, Vec2::ZERO);
        lean_figure(cx.sim, cx.pid, c.core.cob, 0.0, rules.core.tilt_deg, cx.slump);
        if self.peace && (it.any || it.act_just || it.l_just || it.r_just) {
            self.peace = false;
            cx.sfx(sound::GROAN, 0.5, 1.2);
        }
        if self.still_t >= rules.stand.stillness && !self.spoke {
            self.spoke = true;
            let n = self.scores.len().max(1) as f32;
            let avg = self.scores.iter().sum::<f32>() / n;
            let bonus = if self.peace { rules.stand.peace_bonus } else { 0.0 };
            self.final_score = (avg * (1000.0 - rules.stand.peace_bonus) / 1000.0 + bonus - self.tips as f32 * rules.stand.tip_cost).clamp(0.0, 1000.0);
            c.score = self.final_score;
            c.say_key(Who::Pip, "pip.stand_end", self.peace as usize);
            self.ending = 4.0;
            cx.sfx(sound::FANFARE, 0.8, 1.0);
            cx.sfx(sound::CONFETTI, 0.8, 1.0);
            cx.ev.push(SimEvent::Confetti { pos: self.post + Vec3::Y * 2.0 });
        }
        None
    }

    pub fn stop(&mut self, cx: &mut Cx) {
        if let Some(mut st) = self.sub.take() {
            st.stop(cx);
        }
    }

    pub fn stillness(&self) -> bool {
        self.phase >= 4 && self.card <= 0.0 && self.ending <= 0.0
    }

    pub fn hud(&self, c: &RunCommon, r: &Rules, ui: &mut Ui) {
        if self.card > 0.0 && self.phase < 5 {
            ui.card(560.0, 90.0, 800.0, 170.0);
            ui.text(960.0, 104.0, 36.0, INK_SOFT, Align::Center, format!("Phase {} of 5", self.phase + 1));
            ui.label(960.0, 158.0, 62.0, INK, Align::Center, PHASES[self.phase.min(4)]);
            return;
        }
        if self.phase < 4 {
            if let Some(s) = &self.sub {
                s.hud(c, r, ui);
            }
            return;
        }
        if self.ending > 0.0 {
            return;
        }
        // Stillness: the HUD vanishes, except the Puck.
        ui.puck(c.puck(true));
        if self.still_t >= r.stand.fake_prompt_at && self.still_t < r.stand.fake_prompt_at + 6.0 {
            ui.prompt_row(&[(Act::Confirm, "Press to skip")]);
        }
    }

    pub fn bot(&self, c: &RunCommon, r: &Rules) -> Intent {
        if self.card > 0.0 || self.fall > 0.0 {
            return Intent::default();
        }
        if self.phase < 4 {
            if let Some(s) = &self.sub {
                let mut sc = c.clone();
                sc.t = c.t - self.t0;
                return s.bot(&sc, r);
            }
        }
        Intent::default()
    }
}
