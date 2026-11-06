//! Attract mode: the same event code with the bot in place of the player, nothing saved.

use super::*;

impl FitGame {
    // ------------------------------------------------------------------ attract

    pub fn attract_start(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        self.menus.clear();
        self.attract = Some(Attract { idx: 0, t: 0.0 });
        let _ = (sim, ev);
    }

    pub fn attract_exit(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        self.attract = None;
        self.go_title(sim, ev);
    }

    /// The next segment: sweep, ten events, the title card, and round again.
    pub fn attract_next(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        self.teardown_run(sim);
        let Some(a) = &mut self.attract else { return };
        a.idx += 1;
        a.t = 0.0;
        let idx = a.idx;
        if idx > ATTRACT.len() + 1 {
            a.idx = 0;
            let at = self.spots.get(HUB, "arrive");
            self.goto_set(sim, HUB, at);
            self.set_mode(Mode::Title);
            return;
        }
        if idx == ATTRACT.len() + 1 {
            let at = self.spots.get(HUB, "arrive");
            self.goto_set(sim, HUB, at);
            self.set_mode(Mode::Title);
            return;
        }
        match ATTRACT[idx - 1] {
            Some(k) => {
                self.dress_as(sim, meta::guest_def(idx as u8, idx as u8, &meta::Wear::default()));
                self.start_event(sim, k, RunCtx::Attract, ev);
            }
            None => self.start_body(sim, None, 3, RunCtx::Attract, ev),
        }
    }

    pub fn attract_tick(&mut self, sim: &mut Sim, dt: f32, ev: &mut Vec<SimEvent>) {
        let Some(a) = &mut self.attract else { return };
        a.t += dt;
        let (idx, t) = (a.idx, a.t);
        let limit = if idx == 0 {
            8.0
        } else if idx == ATTRACT.len() + 1 {
            5.0
        } else {
            15.0
        };
        if t >= limit {
            self.attract_next(sim, ev);
            return;
        }
        if self.run.is_some() {
            self.run_tick(sim, &InputFrame::default(), dt, ev);
        }
    }

}
