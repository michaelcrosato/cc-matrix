//! The Inter-Resort Medley: three events, one after another, final score is their sum. An AI Hub
//! session plays one copy per player; Play Together passes one pad round.

use serde::{Deserialize, Serialize};
use serde_json::json;

use super::events::{EventKind, Intent};
use super::ghost::GFrame;
use super::run::{EventRun, RunPhase};
use super::ui_model::*;
use super::world::*;
use super::{Flow, FitGame};
use crate::frame::SimEvent;
use crate::input::{InputFrame, buttons as b};
use crate::rng::Rng;
use crate::sim::Sim;

pub const ORDER: [EventKind; 3] = [EventKind::PaddleSlalom, EventKind::TideTable, EventKind::CannonballCup];

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum MPhase {
    /// Waiting for the hub to say go.
    #[default]
    Waiting,
    /// A pass-the-pad card.
    Pass,
    Run,
    /// The score of the event that just ended.
    Interlude,
    Podium,
    Done,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct MPlayer {
    pub name: String,
    pub scores: [f32; 3],
    pub runs: Vec<Vec<GFrame>>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Medley {
    pub hub: bool,
    pub seed: u64,
    pub players: Vec<MPlayer>,
    pub cur: usize,
    pub i: usize,
    pub run: Option<EventRun>,
    pub phase: MPhase,
    pub t: f32,
}

impl Medley {
    pub fn screen(&self) -> &'static str {
        match self.phase {
            MPhase::Waiting => "medley_wait",
            MPhase::Pass => "pass",
            MPhase::Run => "medley_run",
            MPhase::Interlude => "medley_score",
            MPhase::Podium => "podium",
            MPhase::Done => "medley_done",
        }
    }
    pub fn total(&self, p: usize) -> f32 {
        self.players.get(p).map(|x| x.scores.iter().sum()).unwrap_or(0.0)
    }
}

impl FitGame {
    /// A session: no title, no menu, no attract. The round opens straight away.
    pub fn start_medley_hub(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let m = Medley {
            hub: true,
            seed: self.seed,
            players: vec![MPlayer { name: "You".into(), ..Default::default() }],
            phase: MPhase::Waiting,
            ..Default::default()
        };
        self.flow = Flow::Medley(Box::new(m));
        self.save.slots[0] = Some(super::meta::Guest { name: "Guest".into(), day: 5, checked: true, ..Default::default() });
        self.slot = Some(0);
        show_set(sim, Set::Channel);
        let at = self.stages[Set::Channel as usize];
        place(sim, self.pid, at, std::f32::consts::PI);
        cam_full(sim, 22.0, 0.0, 10.0, 40.0, 0.9, 0.1, None);
        self.music(ev, song::LOBBY);
    }

    pub fn start_together(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>, count: usize) {
        let m = Medley {
            hub: false,
            seed: self.seed,
            players: (0..count).map(|i| MPlayer { name: format!("Guest {}", i + 1), ..Default::default() }).collect(),
            phase: MPhase::Pass,
            ..Default::default()
        };
        self.flow = Flow::Medley(Box::new(m));
        self.save_look_for(sim, 0);
        self.music(ev, song::LOBBY);
    }

    fn save_look_for(&mut self, sim: &mut Sim, seat: usize) {
        let look = super::ghost::seat_look(seat);
        if let Some(ch) = sim.state.entities.get_mut(self.pid).and_then(|e| e.character.as_mut()) {
            ch.puppet = Some(look);
        }
    }

    fn medley_run(&self, m: &Medley, sim: &mut Sim, ev: &mut Vec<SimEvent>, dt: f32) -> EventRun {
        let kind = ORDER[m.i];
        let mut run = EventRun::new(kind, 5, &self.rules);
        run.medley = true;
        // The same seed gives the same course on every copy, whatever came before it.
        sim.state.rng = Rng::new(m.seed.wrapping_add(1000 * (m.i as u64 + 1)));
        for (p, player) in m.players.iter().enumerate() {
            if p < m.cur {
                if let Some(frames) = player.runs.get(m.i) {
                    run.ghosts.push(frames.clone());
                    run.ghost_names.push(player.name.clone());
                }
            }
        }
        let mut cx = self.cx(sim, ev, dt);
        run.begin(&mut cx);
        run
    }

    /// One tick of a round.
    pub fn medley_tick(&mut self, m: &mut Medley, sim: &mut Sim, input: &InputFrame, ev: &mut Vec<SimEvent>, dt: f32) {
        m.t += dt;
        match m.phase {
            MPhase::Waiting => {
                if input.down(b::HUB_GO) {
                    m.phase = MPhase::Run;
                    m.t = 0.0;
                    let run = self.medley_run(m, sim, ev, dt);
                    self.song = run.st.song();
                    m.run = Some(run);
                }
            }
            MPhase::Pass => {}
            MPhase::Run => {
                let it: Intent = Intent::from_input(input, self.save.settings.lean_sens);
                let mut done = false;
                if let Some(mut run) = m.run.take() {
                    {
                        let mut cx = self.cx(sim, ev, dt);
                        // Session or not, no one is held at the card.
                        done = run.tick(&mut cx, &it);
                    }
                    m.run = Some(run);
                }
                if done {
                    if let Some(run) = &m.run {
                        let p = &mut m.players[m.cur];
                        p.scores[m.i] = run.out.score;
                        p.runs.push(run.rec.clone());
                    }
                    self.stats_played += 1;
                    ev.push(SimEvent::Sfx { id: sound::FANFARE, gain: 0.6, pitch: 1.0 });
                    m.phase = MPhase::Interlude;
                    m.t = 0.0;
                }
            }
            MPhase::Interlude => {
                if m.t > 3.0 || (!m.hub && input.just(b::CONFIRM | b::PRIMARY)) {
                    if let Some(mut run) = m.run.take() {
                        let mut cx = self.cx(sim, ev, dt);
                        run.stop(&mut cx);
                    }
                    m.i += 1;
                    m.t = 0.0;
                    if m.i >= ORDER.len() {
                        m.i = 0;
                        m.cur += 1;
                        if m.cur >= m.players.len() {
                            m.phase = if m.hub { MPhase::Done } else { MPhase::Podium };
                            show_set(sim, Set::Hub);
                            let at = self.stages[0];
                            place(sim, self.pid, at, 0.0);
                            cam_orbit(sim, 14.0, 9.0, 36.0, 1.0, -30.0, 30.0, 26.0);
                            ev.push(SimEvent::Sfx { id: sound::FANFARE, gain: 0.9, pitch: 1.0 });
                            self.music(ev, song::LOBBY);
                        } else {
                            m.phase = MPhase::Pass;
                            let seat = m.cur;
                            self.save_look_for(sim, seat);
                        }
                    } else {
                        m.phase = MPhase::Run;
                        let run = self.medley_run(m, sim, ev, dt);
                        self.song = run.st.song();
                        m.run = Some(run);
                    }
                }
            }
            MPhase::Podium | MPhase::Done => {}
        }
    }

    pub fn medley_ready(&mut self, m: &mut Medley, sim: &mut Sim, ev: &mut Vec<SimEvent>, dt: f32) {
        m.phase = MPhase::Run;
        m.t = 0.0;
        let run = self.medley_run(m, sim, ev, dt);
        self.song = run.st.song();
        m.run = Some(run);
    }

    /// What the page reports: score, label, done, stats and the ghost message.
    pub fn hub_status(&self) -> serde_json::Value {
        let Flow::Medley(m) = &self.flow else {
            return serde_json::Value::Null;
        };
        if !m.hub {
            return serde_json::Value::Null;
        }
        let banked = m.total(0);
        let live = m.run.as_ref().filter(|r| r.phase == RunPhase::Play).map(|r| r.c.score).unwrap_or(0.0);
        let label = match m.phase {
            MPhase::Waiting => "Warming up".to_string(),
            MPhase::Done => "Finished".to_string(),
            _ => ORDER[m.i.min(2)].name().to_string(),
        };
        let score = (banked + live).round();
        let scores: Vec<f64> = m.players[0].scores.iter().map(|s| (*s as f64).round()).collect();
        json!({
            "score": score,
            "label": label,
            "done": m.phase == MPhase::Done,
            "stats": { "paddle": scores[0], "tide": scores[1], "cannonball": scores[2] },
            "ghost": self.hub_ghost(m),
        })
    }

    fn hub_ghost(&self, m: &Medley) -> serde_json::Value {
        let Some(run) = m.run.as_ref().filter(|_| m.phase == MPhase::Run || m.phase == MPhase::Interlude) else {
            return json!({ "area": -1 });
        };
        let g = run.rec.last().copied().unwrap_or_default();
        json!({ "area": m.i, "p": g.p, "f": g.f, "l": g.l, "c": g.c, "t": g.t, "s": run.c.score.round() })
    }
}

impl FitGame {
    /// Two guests, ready for the pad (tests start here).
    pub fn start_together_for_test(&mut self) {
        let m = Medley {
            hub: false,
            seed: self.seed,
            players: (0..2).map(|i| MPlayer { name: format!("Guest {}", i + 1), ..Default::default() }).collect(),
            phase: MPhase::Pass,
            ..Default::default()
        };
        self.flow = Flow::Medley(Box::new(m));
    }
}

impl Medley {
    pub fn hud(&self, game: &FitGame, ui: &mut Ui) {
        match self.phase {
            MPhase::Waiting => {
                ui.card(460.0, 340.0, 1000.0, 300.0);
                ui.title(960.0, 370.0, 80.0, INK, Align::Center, "The Inter-Resort Medley");
                ui.text(960.0, 490.0, 42.0, INK_SOFT, Align::Center, "Three events. One number. Please wait to be weighed. Not weighed. Counted.");
            }
            MPhase::Pass => {
                let p = &self.players[self.cur];
                ui.card(460.0, 300.0, 1000.0, 400.0);
                ui.text(960.0, 330.0, 44.0, INK_SOFT, Align::Center, "Pass the pad to");
                ui.title(960.0, 400.0, 110.0, TEAL, Align::Center, p.name.clone());
                ui.para(960.0, 550.0, 860.0, 38.0, INK, Align::Center, super::script::line("pip.pass", self.cur));
            }
            MPhase::Run => {
                if let Some(run) = &self.run {
                    run.hud(&game.rules, ui, &super::script::line(&format!("card.{}", run.kind.key()), 0));
                }
                let total = self.total(self.cur);
                ui.panel(1474.0, 222.0, 410.0, 64.0, with_alpha(WHITE, 0.93), 26.0);
                ui.text(1860.0, 230.0, 36.0, INK, Align::Right, format!("Medley {:.0}", total));
            }
            MPhase::Interlude => {
                let s = self.players[self.cur].scores[self.i];
                ui.card(560.0, 300.0, 800.0, 380.0);
                ui.label(960.0, 330.0, 54.0, INK_SOFT, Align::Center, ORDER[self.i].name());
                ui.title(960.0, 400.0, 150.0, INK, Align::Center, format!("{s:.0}"));
                ui.stars(960.0, 610.0, game.rules.stars(s), 3, 60.0);
            }
            MPhase::Podium => {
                let mut order: Vec<usize> = (0..self.players.len()).collect();
                order.sort_by(|a, b| self.total(*b).total_cmp(&self.total(*a)));
                ui.card(360.0, 90.0, 1200.0, 760.0);
                ui.title(960.0, 110.0, 96.0, INK, Align::Center, "The Podium");
                for (rank, &p) in order.iter().enumerate() {
                    let y = 250.0 + rank as f32 * 130.0;
                    let col = if rank == 0 { SUN } else { SKY };
                    ui.panel(460.0, y, 1000.0, 110.0, col, 30.0);
                    ui.label(500.0, y + 22.0, 58.0, INK, Align::Left, format!("{}. {}", rank + 1, self.players[p].name));
                    ui.label(1420.0, y + 22.0, 58.0, INK, Align::Right, format!("{:.0}", self.total(p)));
                }
                ui.para(960.0, 780.0, 1000.0, 36.0, INK_SOFT, Align::Center, super::script::line("pip.podium", self.players.len()));
            }
            MPhase::Done => {
                ui.card(460.0, 300.0, 1000.0, 420.0);
                ui.label(960.0, 330.0, 54.0, INK_SOFT, Align::Center, "Your Medley");
                ui.title(960.0, 400.0, 150.0, INK, Align::Center, format!("{:.0}", self.total(0)));
                ui.text(960.0, 610.0, 40.0, INK_SOFT, Align::Center, "Pip has this written down.");
            }
        }
    }
}
