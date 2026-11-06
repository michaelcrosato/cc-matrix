//! The Big Stand: five phases on a tiny post in the bay, reusing the events with new numbers.

use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::core::BalanceCore;
use super::events::stillness::Stillness;
use super::events::*;
use super::rules::Rules;
use super::sfx;
use super::ui_model::*;
use crate::frame::SimEvent;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Finale {
    pub phase: u32,
    pub ev: Option<Ev>,
    pub still: Option<Stillness>,
    pub phase_scores: Vec<u32>,
    pub post: Vec3,
    pub tips: u32,
    pub peace: bool,
    pub over: f32,
}

pub const PHASES: [&str; 5] = ["Breathe", "Hold a pose", "March", "Brace", "The Long Stillness"];

impl Finale {
    pub fn start(cx: &mut Cx, first: u32) -> Self {
        let post = cx.spot(BAY, "post");
        let mut f = Self { phase: first, ev: None, still: None, phase_scores: Vec::new(), post, tips: 0, peace: false, over: 0.0 };
        cx.player(post, 0.0);
        cx.ev.push(SimEvent::Music { song: 6 });
        // The whole cast, on rafts, murmuring.
        cx.sfx(sfx::MURMUR, 1.0, 1.0);
        f.enter(cx);
        f
    }

    fn enter(&mut self, cx: &mut Cx) {
        let at = Some(self.post);
        cx.core.center();
        cx.stop_clip();
        cx.say(PHASES[self.phase.min(4) as usize], 2.5);
        cx.sfx(sfx::GONG, 0.6, 1.0);
        self.ev = None;
        self.still = None;
        match self.phase {
            0 => self.ev = Some(Ev::start(EvKind::Breath, cx, Opt { count: Some(4), at, ..Default::default() })),
            1 => self.ev = Some(Ev::start(EvKind::Pose, cx, Opt { count: Some(1), seconds: Some(20.0), at, band: true })),
            2 => self.ev = Some(Ev::start(EvKind::Step, cx, Opt { count: Some(16), at, band: true, ..Default::default() })),
            3 => self.ev = Some(Ev::start(EvKind::Plank, cx, Opt { seconds: Some(20.0), at, band: true, ..Default::default() })),
            _ => {
                self.still = Some(Stillness::new(cx.r.finale.stillness));
                cx.player(self.post, 0.0);
                cx.mirror_shot(self.post, 7.0);
            }
        }
        if self.phase < 4 {
            *cx.shot = Shot { tilt: 14.0, yaw: 0.0, distance: 10.0, fov: 36.0, height: 0.9, focus: self.post };
        }
    }

    /// `any` is any input at all (the Long Stillness listens for it).
    pub fn tick(&mut self, cx: &mut Cx, i: &Intent, any: bool) -> bool {
        if self.over > 0.0 {
            self.over -= cx.dt;
            return self.over <= 0.0;
        }
        if let Some(s) = &mut self.still {
            if s.tick(cx, any) {
                self.peace = !s.broke;
                let line = if self.peace { "...Oh. You're still here. Good.".to_string() } else { "...You pressed something. I wrote it down.".to_string() };
                cx.say(line, 5.0);
                cx.sfx(sfx::CHEER, 0.8, 1.0);
                cx.ev.push(SimEvent::Burst { pos: self.post + Vec3::Y * 4.0, kind: 0, count: 90 });
                self.over = 4.0;
            }
            return false;
        }
        let done = self.ev.as_mut().is_some_and(|e| e.tick(cx, i));
        cx.player_keep_post(self.post, self.phase);
        if done {
            let sc = self.ev.as_ref().map(|e| e.score(cx.r)).unwrap_or(0);
            self.phase_scores.push(sc);
            self.phase += 1;
            self.enter(cx);
        }
        false
    }

    pub fn on_tip(&mut self, cx: &mut Cx) {
        self.tips += 1;
        cx.ev.push(SimEvent::BigSplash { pos: self.post, size: 0.5 });
        cx.sfx(sfx::SPLASH_B, 0.7, 1.2);
        cx.sfx(sfx::GROAN, 0.9, 1.0);
        let line = cx.pick("finale_tip");
        cx.say(line, 2.5);
    }

    pub fn bot(&self, core: &BalanceCore, r: &Rules) -> Intent {
        match &self.ev {
            Some(e) => e.bot(core, r),
            None => Intent { lean: Vec2::ZERO, ..Default::default() },
        }
    }

    pub fn hud(&self, b: &mut B, core: &BalanceCore, r: &Rules) {
        if let Some(s) = &self.still {
            s.hud(b, core);
            return;
        }
        if let Some(e) = &self.ev {
            e.hud(b, core, r);
        }
        b.center(960.0, 1020.0, 36.0, INK, &format!("Phase {} of 5", self.phase.min(4) + 1));
    }

    pub fn score(&self, r: &Rules) -> u32 {
        // Four phases share what the Inner Peace bonus leaves; tips cost a little.
        let sum: u32 = self.phase_scores.iter().sum();
        let base = (1000.0 - r.finale.bonus) * sum as f32 / 4000.0;
        let bonus = if self.peace { r.finale.bonus } else { 0.0 };
        (base + bonus - self.tips as f32 * r.finale.tip_cost).clamp(0.0, 1000.0) as u32
    }
}

impl Cx<'_> {
    /// On the post the figure stays put, even when an event moved it for its own stage.
    fn player_keep_post(&mut self, post: Vec3, _phase: u32) {
        if let Some(f) = self.sim.feet(self.pid) {
            if (f - post).length() > 0.5 {
                self.sim.set_position(self.pid, post);
            }
        }
    }
}
