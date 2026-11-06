//! The common frame of an event: card, 3-2-1, play, result. One of these runs inside a stay, a
//! Medley round and attract mode alike.

use glam::Vec3;
use serde::{Deserialize, Serialize};

use super::check::quip_ui;
use super::events::{Cx, EventKind, EventState, Intent, RunCommon};
use super::ghost::{GFrame, GHOST_HZ};
use super::rules::Rules;
use super::ui_model::*;
use super::world::*;
use crate::frame::SimEvent;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum RunPhase {
    #[default]
    Card,
    Count,
    Play,
    Result,
}

/// What a finished event gave.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Outcome {
    pub score: f32,
    pub stars: u8,
    pub title: String,
    pub minutes: u32,
    pub best: bool,
    pub prior: Option<u32>,
    pub comment: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EventRun {
    pub kind: EventKind,
    pub st: EventState,
    pub c: RunCommon,
    pub phase: RunPhase,
    pub pt: f32,
    pub out: Outcome,
    /// This run, as it is recorded for ghosts.
    pub rec: Vec<GFrame>,
    /// Other runs to show in neighbouring lanes.
    pub ghosts: Vec<Vec<GFrame>>,
    pub ghost_names: Vec<String>,
    /// Attract mode: no card, no tips, nothing saved; stops at the time limit.
    pub demo: bool,
    pub limit: Option<f32>,
    /// A Medley round: a short card, no retry.
    pub medley: bool,
    pub started: bool,
    pub count_i: i32,
}

impl EventRun {
    pub fn new(kind: EventKind, day: u8, r: &Rules) -> Self {
        Self {
            kind,
            st: EventState::new(kind, day, r),
            c: RunCommon::default(),
            phase: RunPhase::Card,
            pt: 0.0,
            out: Outcome::default(),
            rec: Vec::new(),
            ghosts: Vec::new(),
            ghost_names: Vec::new(),
            demo: false,
            limit: None,
            medley: false,
            started: false,
            count_i: 4,
        }
    }

    /// Sets the stage. Everything the event places, it places here.
    pub fn begin(&mut self, cx: &mut Cx) {
        self.c.core = super::core::BalanceCore::new(&mut cx.sim.state.rng);
        self.st.start(&mut self.c, cx);
        self.started = true;
        // A rhythm event starts its song on the first tick of play, so the notes sit on the beat.
        if !self.rhythm() || self.demo {
            cx.ev.push(SimEvent::Music { song: self.st.song() });
        }
        if self.demo {
            self.phase = RunPhase::Play;
        }
    }

    /// One tick. True when the Result is reached (the owner banks it).
    pub fn tick(&mut self, cx: &mut Cx, it: &Intent) -> bool {
        let dt = cx.dt;
        self.pt += dt;
        if let Some(q) = &mut self.c.quip {
            q.tick(1, dt, cx.ev);
            self.c.quip_t -= dt;
            if self.c.quip_t <= 0.0 {
                self.c.quip = None;
            }
        }
        match self.phase {
            RunPhase::Card => {
                // A short card in a Medley; else it waits for you.
                if self.medley && self.pt > 2.0 {
                    self.phase = RunPhase::Count;
                    self.pt = 0.0;
                }
                if !self.medley && it.act_just && self.pt > 0.2 {
                    self.phase = RunPhase::Count;
                    self.pt = 0.0;
                    cx.sfx(sound::UI_CONFIRM, 0.8, 1.0);
                }
            }
            RunPhase::Count => {
                let n = 3 - self.pt as i32;
                if n != self.count_i {
                    self.count_i = n;
                    cx.sfx(if n > 0 { sound::COUNT } else { sound::GO }, 0.8, 1.0);
                }
                if self.pt >= 3.0 {
                    self.phase = RunPhase::Play;
                    self.pt = 0.0;
                    if self.rhythm() {
                        cx.ev.push(SimEvent::Music { song: self.st.song() });
                    }
                }
            }
            RunPhase::Play => {
                self.c.t += dt;
                // Record the run, five frames a second.
                let n = (self.c.t * GHOST_HZ) as usize;
                if n >= self.rec.len() {
                    self.rec.push(self.frame_of(cx));
                }
                self.ghost_dots();
                if let Some(score) = self.st.tick(&mut self.c, cx, it) {
                    self.out.score = score;
                    self.c.score = score;
                    self.phase = RunPhase::Result;
                    self.pt = 0.0;
                    return true;
                }
                if self.limit.is_some_and(|l| self.c.t >= l) {
                    self.phase = RunPhase::Result;
                    self.pt = 0.0;
                    return true;
                }
            }
            RunPhase::Result => {}
        }
        false
    }

    /// The song's clock is this event's clock.
    fn rhythm(&self) -> bool {
        matches!(self.st, EventState::Step(_))
    }

    fn frame_of(&self, cx: &Cx) -> GFrame {
        let (feet, facing, clip, clip_t) = match cx.sim.state.entities.get(cx.pid) {
            Some(e) => {
                let ch = e.character.as_ref();
                let h = ch.map(|c| c.height() * 0.5).unwrap_or(0.0);
                let a = ch.map(|c| c.anim).unwrap_or_default();
                (e.pos - Vec3::Y * h, a.facing, a.clip, a.clip_t)
            }
            None => (Vec3::ZERO, 0.0, 0, 0.0),
        };
        GFrame::new(feet, facing, self.c.core.cob, clip, clip_t, self.c.score)
    }

    fn ghost_dots(&mut self) {
        let g = self.ghosts.first().and_then(|g| super::ghost::sample(g, self.c.t));
        self.c.ghost_dot = g.map(|g| g.l);
        self.c.ghost_score = g.map(|g| g.s);
    }

    pub fn stop(&mut self, cx: &mut Cx) {
        self.st.stop(cx);
        stop_clip(cx.sim, cx.pid);
        clear_lean(cx.sim, cx.pid);
        self.started = false;
    }

    /// Events where the arrows are steps.
    pub fn arrows_step(&self) -> bool {
        self.kind.arrows_step()
    }

    pub fn hud(&self, r: &Rules, ui: &mut Ui, about: &str) {
        match self.phase {
            RunPhase::Card => {
                let (x, y, w, h) = (360.0, 240.0, 1200.0, 560.0);
                ui.card(x, y, w, h);
                ui.title(960.0, y + 40.0, 96.0, INK, Align::Center, self.kind.name());
                ui.para(960.0, y + 170.0, 1040.0, 42.0, INK_SOFT, Align::Center, about);
                let coach = self.kind.coach();
                let line = super::script::line(&format!("card.{}", self.kind.key()), 1);
                ui.label(960.0, y + 320.0, 36.0, TEAL, Align::Center, coach.name());
                ui.para(960.0, y + 366.0, 1040.0, 38.0, INK, Align::Center, line);
                if self.medley {
                    ui.panel(740.0, 830.0, 440.0, 76.0, with_alpha(WHITE, 0.95), 38.0);
                    ui.label(960.0, 840.0, 44.0, CORAL, Align::Center, "Starting soon");
                } else {
                    ui.prompt_row(&[(Act::Confirm, "Begin"), (Act::Back, "Leave")]);
                }
                self.st_controls(ui);
            }
            RunPhase::Count => {
                let n = (3.0 - self.pt).ceil().clamp(1.0, 3.0) as i32;
                let k = 1.0 - self.pt.fract();
                ui.circle(960.0, 500.0, 120.0 + 60.0 * k, with_alpha(WHITE, 0.9), TEAL, 10.0);
                ui.title(960.0, 410.0, 160.0, INK, Align::Center, n.to_string());
                self.st.hud(&self.c, r, ui);
            }
            RunPhase::Play => {
                self.st.hud(&self.c, r, ui);
                quip_ui(&self.c, ui);
            }
            RunPhase::Result => self.result_ui(r, ui),
        }
    }

    fn st_controls(&self, ui: &mut Ui) {
        // The controls this event uses, as glyphs on the card.
        let (x, y) = (560.0, 730.0);
        match self.kind {
            EventKind::TempoSquats | EventKind::BreathBloom => {
                ui.prompt(x, y, Act::Confirm, "Hold", Align::Left);
                ui.prompt(x + 400.0, y, Act::Lean, "Balance", Align::Left);
            }
            EventKind::PlankStandoff => {
                ui.prompt(x, y, Act::Brace, "Hold both", Align::Left);
                ui.prompt(x + 400.0, y, Act::Lean, "Balance", Align::Left);
            }
            EventKind::StepParty => {
                ui.prompt(x, y, Act::StepL, "Left", Align::Left);
                ui.prompt(x + 400.0, y, Act::StepR, "Right", Align::Left);
            }
            EventKind::FloatieSpin | EventKind::MorningLap => {
                ui.prompt(x, y, Act::Lean, "Lean", Align::Left);
                ui.prompt(x + 280.0, y, Act::StepL, "Left", Align::Left);
                ui.prompt(x + 530.0, y, Act::StepR, "Right", Align::Left);
            }
            EventKind::CannonballCup | EventKind::BigStand => {
                ui.prompt(x, y, Act::Confirm, "Action", Align::Left);
                ui.prompt(x + 400.0, y, Act::Lean, "Lean", Align::Left);
            }
            _ => {
                ui.prompt(x + 200.0, y, Act::Lean, "Lean is all you have", Align::Left);
            }
        }
    }

    fn result_ui(&self, _r: &Rules, ui: &mut Ui) {
        let o = &self.out;
        let (x, y, w, h) = (360.0, 90.0, 1200.0, 760.0);
        ui.card(x, y, w, h);
        ui.label(960.0, y + 24.0, 48.0, INK_SOFT, Align::Center, self.kind.name());
        let roll = (self.pt / 1.1).min(1.0);
        ui.title(960.0, y + 84.0, 160.0, INK, Align::Center, format!("{:.0}", o.score * roll));
        let shown = ((self.pt - 1.0) / 0.35).clamp(0.0, 3.0) as u8;
        ui.stars(960.0, y + 320.0, shown.min(o.stars), 3, 74.0);
        if self.pt > 1.4 {
            ui.label(960.0, y + 386.0, 54.0, TEAL, Align::Center, o.title.clone());
            ui.para(960.0, y + 464.0, 1040.0, 36.0, INK, Align::Center, o.comment.clone());
        }
        if self.pt > 1.8 && !self.medley && !self.demo {
            let mut line = super::script::singulars(&format!("{} minutes for the Clam", o.minutes));
            if o.best {
                line.push_str(". New personal best");
            } else if let Some(p) = o.prior {
                line.push_str(&format!(". Best so far {p}"));
            }
            ui.text(960.0, y + 590.0, 36.0, INK_SOFT, Align::Center, line);
            if let Some(g) = self.c.ghost_score {
                let d = o.score - g;
                let word = if d >= 0.0 { "ahead of" } else { "behind" };
                ui.text(960.0, y + 640.0, 36.0, CORAL, Align::Center, format!("{:.0} {word} Yesterday You. I am not comparing you.", d.abs()));
            }
        }
    }
}
