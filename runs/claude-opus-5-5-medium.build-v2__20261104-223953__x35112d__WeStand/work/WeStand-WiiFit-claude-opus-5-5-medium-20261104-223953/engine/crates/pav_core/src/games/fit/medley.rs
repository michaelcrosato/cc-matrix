//! The Inter-Resort Medley: three events in a row, for the hub round and for Play Together.

use super::*;

impl FitGame {
    // ------------------------------------------------------------------ medley

    pub fn begin_medley(&mut self, sim: &mut Sim, racers: Vec<Racer>, seed: u32, ev: &mut Vec<SimEvent>) {
        self.medley = Some(Medley { racers, who: 0, leg: 0, seed, rest: 0.0 });
        self.medley_leg(sim, ev);
    }

    pub fn medley_leg(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let Some(m) = &self.medley else { return };
        let (leg, r) = (m.leg, m.racers.get(m.who).cloned().unwrap_or_default());
        self.dress_as(sim, meta::guest_def(r.skin, r.outfit, &meta::Wear::default()));
        self.start_event(sim, MEDLEY[leg % 3], RunCtx::Medley, ev);
    }

    pub fn medley_next(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let hub = self.hub;
        let Some(m) = &mut self.medley else { return };
        m.leg += 1;
        if m.leg < MEDLEY.len() {
            self.medley_leg(sim, ev);
            return;
        }
        m.leg = 0;
        m.who += 1;
        if hub {
            self.teardown_run(sim);
            self.set_mode(Mode::HubDone);
            return;
        }
        let done = m.who >= m.racers.len();
        self.teardown_run(sim);
        if done {
            self.menus.clear();
            self.menus.push(Menu::new(MenuKind::Podium));
            self.set_mode(Mode::Podium);
            ev.push(SimEvent::Sfx { id: sfx::FANFARE, gain: 0.9, pitch: 1.0 });
        } else {
            self.set_mode(Mode::PassPad);
        }
    }

    pub fn medley_total(&self) -> u32 {
        let live = self.run.as_ref().filter(|r| r.ctx == RunCtx::Medley).map(|r| r.live_score(&self.rules)).unwrap_or(0);
        let done: u32 = self.medley.as_ref().and_then(|m| m.racers.get(m.who.min(m.racers.len().saturating_sub(1)))).map(|r| r.scores.iter().sum()).unwrap_or(0);
        done + live
    }

}
