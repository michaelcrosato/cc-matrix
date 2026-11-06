//! Attract mode: the bot plays every event with `demo` on. No separate replay system.

use glam::Vec3;
use serde::{Deserialize, Serialize};

use super::events::{EventKind, EventState, Intent};
use super::run::EventRun;
use super::world::*;
use super::{FitGame, Flow, Overlay};
use crate::frame::SimEvent;
use crate::input::InputFrame;
use crate::sim::Sim;

/// Attract mode: an island sweep, then each event, then the title card; round again.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Attract {
    pub seg: usize,
    pub t: f32,
    pub run: Option<EventRun>,
    pub cycles: u32,
}

/// The order of attract's events.
pub const ATTRACT: [EventKind; 12] = [
    EventKind::CannonballCup,
    EventKind::PaddleSlalom,
    EventKind::StepParty,
    EventKind::PoseParade,
    EventKind::TideTable,
    EventKind::FloatieSpin,
    EventKind::TrayTrek,
    EventKind::PlankStandoff,
    EventKind::MorningLap,
    EventKind::BreathBloom,
    EventKind::TempoSquats,
    EventKind::BigStand,
];

impl FitGame {
    pub(super) fn start_attract(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        self.flow = Flow::Attract(Box::new(Attract::default()));
        self.dialog = None;
        self.overlays.retain(|o| matches!(o, Overlay::Settings));
        self.set_look(sim, None);
        let at = self.stages[0];
        show_set(sim, Set::Hub);
        place(sim, self.pid, at + Vec3::new(0.0, 0.0, 3.5), 0.0);
        cam_orbit(sim, 30.0, 40.0, 40.0, 2.0, -40.0, 40.0, 24.0);
        self.music(ev, song::LOBBY);
    }

    pub(super) fn attract_tick(&mut self, a: &mut Attract, sim: &mut Sim, input: &InputFrame, dt: f32, ev: &mut Vec<SimEvent>) {
        a.t += dt;
        let n = ATTRACT.len();
        let seg = self.rules.flow.attract_segment;
        let end_seg = |a: &mut Attract, this: &FitGame, sim: &mut Sim, ev: &mut Vec<SimEvent>| {
            if let Some(mut run) = a.run.take() {
                let mut cx = this.cx(sim, ev, dt);
                run.stop(&mut cx);
            }
        };
        if a.seg == 0 {
            // The island sweep.
            if a.t >= 8.0 {
                a.seg = 1;
                a.t = 0.0;
            }
            if a.seg == 1 {
                a.run = None;
            }
        } else if a.seg <= n {
            if a.run.is_none() {
                let kind = ATTRACT[a.seg - 1];
                let mut run = EventRun::new(kind, 3, &self.rules);
                run.demo = true;
                run.limit = Some(seg);
                if let EventState::Stand(s) = &mut run.st {
                    s.card = 0.8;
                    s.phase = 1;
                }
                let no = self.dev.no_tips;
                self.dev.no_tips = true;
                {
                    let mut cx = self.cx(sim, ev, dt);
                    run.begin(&mut cx);
                }
                self.dev.no_tips = no;
                self.song = run.st.song();
                a.run = Some(run);
            }
            let no = self.dev.no_tips;
            self.dev.no_tips = true;
            let it = Intent::from_input(input, 1.0);
            let finished = {
                let mut cx = self.cx(sim, ev, dt);
                let r = a.run.as_mut().unwrap();
                r.tick(&mut cx, &it)
            };
            self.dev.no_tips = no;
            if finished {
                end_seg(a, self, sim, ev);
                a.seg += 1;
                a.t = 0.0;
                if a.seg > n {
                    show_set(sim, Set::Hub);
                    let at = self.stages[0];
                    place(sim, self.pid, at + Vec3::new(0.0, 0.0, 3.5), 0.0);
                    cam_orbit(sim, 20.0, 30.0, 40.0, 2.0, -30.0, 30.0, 30.0);
                    self.music(ev, song::LOBBY);
                }
            }
        } else {
            // The title card.
            if a.t >= 5.0 {
                a.seg = 0;
                a.t = 0.0;
                a.cycles += 1;
                cam_orbit(sim, 30.0, 40.0, 40.0, 2.0, -40.0, 40.0, 24.0);
            }
        }
    }
}
