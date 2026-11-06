//! The common frame around an event: card, 3-2-1, play, result. Used for every event, the finale,
//! the medley's legs and attract mode's segments.

use glam::Vec3;
use serde::{Deserialize, Serialize};

use super::core::BalanceCore;
use super::events::*;
use super::finale::Finale;
use super::ghost::Sample;
use super::rules::Rules;
use super::ui_model::*;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Phase {
    Card,
    Count,
    Play,
    Result,
}

/// Who started it, and so what follows it.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum RunCtx {
    Stay,
    Medley,
    Attract,
    Finale,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum Body {
    Ev(Ev),
    Stand(Box<Finale>),
}

/// A ghost in the next lane, from the save or from an earlier player.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RunGhost {
    pub samples: Vec<Sample>,
    pub skin: u8,
    pub outfit: u8,
    pub seat: u8,
    pub name: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Run {
    /// None: the Big Stand.
    pub kind: Option<EvKind>,
    pub phase: Phase,
    pub t: f32,
    pub core: BalanceCore,
    pub body: Body,
    pub actors: Vec<crate::entity::EntityId>,
    pub shot: Shot,
    pub msg: Option<(String, f32)>,
    pub rec: Vec<Sample>,
    pub rec_in: f32,
    pub ghosts: Vec<RunGhost>,
    pub ctx: RunCtx,
    pub score: u32,
    pub result: Option<ResultData>,
    pub coach_in: f32,
    pub demo: bool,
    pub trace: Vec<[f32; 2]>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct ResultData {
    pub score: u32,
    pub stars: u8,
    pub title: String,
    pub minutes: u32,
    pub best: u32,
    pub new_best: bool,
    pub yesterday: Option<i32>,
    pub comment: String,
}

impl Run {
    pub fn name(&self) -> &'static str {
        self.kind.map(|k| k.name()).unwrap_or("The Big Stand")
    }

    pub fn live_score(&self, r: &Rules) -> u32 {
        match &self.body {
            Body::Ev(e) => e.score(r),
            Body::Stand(f) => f.score(r),
        }
    }

    pub fn bot(&self, r: &Rules) -> Intent {
        match &self.body {
            Body::Ev(e) => e.bot(&self.core, r),
            Body::Stand(f) => f.bot(&self.core, r),
        }
    }

    pub fn tick_body(&mut self, cx: &mut Cx, i: &Intent, any: bool) -> bool {
        match &mut self.body {
            Body::Ev(e) => e.tick(cx, i),
            Body::Stand(f) => f.tick(cx, i, any),
        }
    }

    pub fn on_tip(&mut self, cx: &mut Cx) {
        match &mut self.body {
            Body::Ev(Ev::Paddle(p)) => p.on_tip(cx),
            Body::Ev(Ev::Pose(p)) => {
                p.on_tip();
                cx.tip_fx(false);
            }
            Body::Stand(f) => f.on_tip(cx),
            Body::Ev(Ev::Tide(_)) => {}
            Body::Ev(_) => cx.tip_fx(false),
        }
    }

    pub fn draw_card(&self, b: &mut B, name: &str, goal: &str, line: &str, who: &str, how: &[(Glyph, &str)]) {
        b.tint([214, 238, 246, 90]);
        b.card([360.0, 160.0, 1560.0, 900.0], DECK);
        b.title(960.0, 200.0, 96.0, TEAL, name);
        b.wrap_center(960.0, 330.0, 1060.0, 48.0, INK, goal);
        let mut y = 480.0;
        for (g, label) in how {
            b.prompt(480.0, y, &[*g], label);
            y += 72.0;
        }
        b.wrap_center(960.0, 700.0, 1060.0, 40.0, MUTED, &format!("{who}: \"{line}\""));
        b.prompt_center(960.0, 820.0, &[Glyph::Confirm], "Begin");
    }

    pub fn draw_hud(&self, b: &mut B, r: &Rules) {
        match &self.body {
            Body::Ev(e) => e.hud(b, &self.core, r),
            Body::Stand(f) => f.hud(b, &self.core, r),
        }
        if !self.trace.is_empty() {
            if let Some(Ui::Puck { trace, .. }) = b.items.iter_mut().rev().find(|i| matches!(i, Ui::Puck { .. })) {
                trace.clone_from(&self.trace);
            }
        }
    }
}

/// What the events ask of the hands, for their cards.
pub fn how_to(kind: Option<EvKind>) -> Vec<(Glyph, &'static str)> {
    match kind {
        Some(EvKind::Breath) => vec![(Glyph::Confirm, "Hold to breathe in, release to breathe out"), (Glyph::Lean, "Keep the dot in the ring")],
        Some(EvKind::Pose) => vec![(Glyph::Lean, "Stay in the drifting ring to climb the multiplier")],
        Some(EvKind::Squats) => vec![(Glyph::Confirm, "Hold to go down, release to rise"), (Glyph::Lean, "Keep the dot in the band")],
        Some(EvKind::Plank) => vec![(Glyph::Brace, "Hold both to stay up"), (Glyph::Lean, "Keep the dot in the ring")],
        Some(EvKind::Step) => vec![(Glyph::StepL, "Left note"), (Glyph::StepR, "Right note")],
        Some(EvKind::Spin) => vec![(Glyph::Lean, "Circle the lean. Keep to the green band"), (Glyph::StepL, "Catch a ring from the left"), (Glyph::StepR, "Catch a ring from the right")],
        Some(EvKind::Lap) => vec![(Glyph::StepL, "Alternate left"), (Glyph::StepR, "and right to set your pace"), (Glyph::Lean, "Move aside for crabs, toward ribbons")],
        Some(EvKind::Tide) => vec![(Glyph::Lean, "Tilt the raft. Roll the crabs into the pools, gently")],
        Some(EvKind::Paddle) => vec![(Glyph::Lean, "Sideways to steer, forward for speed, back to brake")],
        Some(EvKind::Tray) => vec![(Glyph::Lean, "Keep the tray level against the pier's roll")],
        Some(EvKind::Cannon) => vec![(Glyph::Confirm, "Press at the bottom of each bounce, then hold to tuck"), (Glyph::Lean, "Rotate in the air")],
        None => vec![(Glyph::Lean, "Everything you have learned"), (Glyph::Confirm, "Then, at the end, nothing at all")],
    }
}

/// A short goal for the card.
pub fn goal(kind: Option<EvKind>) -> &'static str {
    match kind {
        Some(EvKind::Breath) => "Follow the guide ring. Bloom the pond.",
        Some(EvKind::Pose) => "Hold three poses. There may be a bird.",
        Some(EvKind::Squats) => "Ten squats to the tempo bar. Also eleven.",
        Some(EvKind::Plank) => "Stay up as long as you can. Kettle believes in you, from a distance.",
        Some(EvKind::Step) => "Step on the beat. Clap if you must.",
        Some(EvKind::Spin) => "Spin the rings around your hips and do not drop them.",
        Some(EvKind::Lap) => "One lap of the island. Bounce will wait, a little.",
        Some(EvKind::Tide) => "Roll every crab into a tide pool. They signed something.",
        Some(EvKind::Paddle) => "Pass every gate, quickly, on a board, on the sea.",
        Some(EvKind::Tray) => "Carry five smoothies down the pier to Marjorie.",
        Some(EvKind::Cannon) => "Three dives. We are not here for form. We are here for splash.",
        None => "Five tests on a tiny post, with everyone watching. The last one is nothing.",
    }
}

/// The lanes a list of ghosts takes up, away from the player.
pub fn ghost_lane(kind: Option<EvKind>, n: usize) -> Vec3 {
    let base = kind.map(|k| k.lane()).unwrap_or(Vec3::new(6.0, 0.0, 0.0));
    base * (n as f32 + 1.0)
}
