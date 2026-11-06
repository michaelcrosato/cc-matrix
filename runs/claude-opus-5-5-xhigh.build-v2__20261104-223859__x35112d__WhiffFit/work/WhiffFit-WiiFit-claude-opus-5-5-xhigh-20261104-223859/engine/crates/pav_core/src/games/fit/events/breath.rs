//! Breath Bloom: hold Action to inhale, release to exhale, following a guide ring.

use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::*;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct BreathBloom {
    pub cycles: usize,
    pub lungs: f32,
    pub total: f32,
    pub sum: f32,
    pub cycle_sum: f32,
    pub cycle_time: f32,
    pub cycle: usize,
    pub bloomed: usize,
    pub lotus: Vec<(EntityId, f32)>,
    pub in_ring: bool,
    pub gust: f32,
    pub ents: Vec<EntityId>,
    /// In the Big Stand: stays on the post, no pond of its own.
    pub finale: bool,
}

impl BreathBloom {
    pub fn new(cycles: usize) -> Self {
        Self { cycles, ..Default::default() }
    }

    /// A cycle's length: the last one is longer.
    fn cycle_len(&self, i: usize, r: &Rules) -> f32 {
        if i + 1 == self.cycles { r.breath.last_cycle } else { r.breath.cycle }
    }

    /// Where the guide is (0..1) at time `t`, and which cycle.
    pub fn guide(&self, t: f32, r: &Rules) -> (f32, usize) {
        let mut at = 0.0;
        for i in 0..self.cycles {
            let len = self.cycle_len(i, r);
            if t < at + len {
                let u = (t - at) / len;
                return (if u < 0.5 { u * 2.0 } else { 2.0 - u * 2.0 }, i);
            }
            at += len;
        }
        (0.0, self.cycles)
    }

    pub fn start(&mut self, _c: &mut RunCommon, cx: &mut Cx) {
        self.total = (0..self.cycles).map(|i| self.cycle_len(i, cx.rules)).sum();
        if self.finale {
            return;
        }
        let at = cx.stage(Set::Studio);
        ready_player(cx, Set::Studio, at, 0.0);
        mirror_cam(cx.sim);
        // A pond of closed lotus around the deck.
        for i in 0..self.cycles.max(5) * 3 {
            let a = i as f32 * 2.399;
            let rr = 7.0 + (i as f32 * 0.7) % 5.0;
            let p = at + Vec3::new(a.cos() * rr, -0.02, a.sin() * rr * 0.8 - 2.0);
            let id = spawn_prop(cx.sim, "LIB/core/lotus", p, a, 0.25);
            self.lotus.push((id, 0.25));
        }
    }

    pub fn tick(&mut self, c: &mut RunCommon, cx: &mut Cx, it: &Intent) -> Option<f32> {
        let r = &cx.rules.breath;
        let dt = cx.dt;
        let half = r.cycle * 0.5;
        if it.act {
            self.lungs += dt / half;
        } else {
            self.lungs -= dt / half;
        }
        self.lungs = clamp01(self.lungs);
        let (guide, cycle) = self.guide(c.t, cx.rules);
        let gust = if self.gust > 0.0 {
            Vec2::new((c.t * 0.9).sin(), (c.t * 0.67).cos()) * self.gust
        } else {
            Vec2::ZERO
        };
        c.step(cx, it.lean, r.wobble, gust, Vec2::ZERO);
        if c.core.tipped {
            c.tip_fx(cx, false);
        }
        self.in_ring = c.core.cob.length() < r.ring;
        let diff = (self.lungs - guide).abs();
        let breath = 1.0 - clamp01(diff / r.tolerance);
        // The ring only counts while the breath is near the guide: standing idle isn't breathing.
        let tick = r.breath_weight * breath + if diff < r.tolerance && self.in_ring { 1.0 - r.breath_weight } else { 0.0 };
        self.sum += tick * dt;
        self.cycle_sum += tick * dt;
        self.cycle_time += dt;
        c.score = (self.sum / self.total.max(1.0)) * 1000.0;
        scrub(cx.sim, cx.pid, "FIT/Breath", self.lungs);
        lean_figure(cx.sim, cx.pid, c.core.cob, 0.0, cx.rules.core.tilt_deg, cx.slump);
        if cycle != self.cycle {
            // A good cycle opens lotus, with a rising chime.
            let good = self.cycle_sum / self.cycle_time.max(0.1) > r.good_cycle;
            if good {
                let open = if c.score > 860.0 && cycle >= self.cycles { self.lotus.len() } else { 3 };
                let start = self.bloomed;
                for i in start..(start + open).min(self.lotus.len()) {
                    self.lotus[i].1 = 1.0;
                }
                self.bloomed = (start + open).min(self.lotus.len());
                let degree = [1.0, 1.125, 1.26, 1.5, 1.68, 2.0, 2.25][self.cycle.min(6)];
                cx.sfx(sound::CHIME, 0.8, degree);
            }
            self.cycle = cycle;
            self.cycle_sum = 0.0;
            self.cycle_time = 0.0;
            if cycle < self.cycles {
                c.say_key(Who::Posey, "posey.breath", cycle);
            }
        }
        // Lotus open slowly.
        for (id, want) in self.lotus.clone() {
            if let Some(p) = cx.sim.state.entities.get_mut(id).and_then(|e| e.prop.as_mut()) {
                p.scale += (want - p.scale) * (1.0 - (-2.0 * dt).exp());
            }
        }
        (c.t >= self.total).then(|| clamp01(self.sum / self.total.max(1.0) / r.par) * 1000.0)
    }

    pub fn stop(&mut self, cx: &mut Cx) {
        for (id, _) in self.lotus.drain(..) {
            cx.sim.despawn(id);
        }
        despawn_all(cx.sim, &mut self.ents);
    }

    pub fn hud(&self, c: &RunCommon, r: &Rules, ui: &mut Ui) {
        if !self.finale {
            c.top_bar(ui, "Breath Bloom", Some(self.total - c.t));
        }
        let mut p = c.puck(true);
        p.ring = Some([0.0, 0.0, r.breath.ring]);
        p.good = self.in_ring;
        ui.puck(p);
        // The guide ring, and your breath inside it.
        let (guide, _) = self.guide(c.t, r);
        let (cx, cy) = (480.0, 620.0);
        ui.circle(cx, cy, 80.0 + 150.0 * guide, with_alpha(SEA, 0.25), TEAL, 8.0);
        ui.circle(cx, cy, 80.0 + 150.0 * self.lungs, with_alpha(MINT, 0.75), with_alpha(WHITE, 0.0), 0.0);
        let word = if guide_rising(self, c.t, r) { "In" } else { "Out" };
        ui.label(cx, cy - 34.0, 58.0, INK, Align::Center, word);
        ui.prompt_row(&[(Act::Confirm, "Hold to breathe in"), (Act::Lean, "Keep the dot still")]);
    }

    pub fn bot(&self, c: &RunCommon, r: &Rules) -> Intent {
        let rising = guide_rising(self, c.t, r);
        Intent { act: rising, act_just: rising, lean: -c.core.cob * 0.3, ..Default::default() }
    }
}

fn guide_rising(b: &BreathBloom, t: f32, r: &Rules) -> bool {
    let (a, _) = b.guide(t, r);
    let (n, _) = b.guide(t + 0.05, r);
    n >= a
}
