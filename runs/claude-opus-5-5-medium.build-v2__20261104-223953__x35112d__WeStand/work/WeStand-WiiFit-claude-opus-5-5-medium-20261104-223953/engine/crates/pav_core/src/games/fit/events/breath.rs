//! Breath Bloom: hold to inhale, release to exhale, following a guide; lotuses open on the water.

use super::*;
use crate::games::fit::sfx;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Breath {
    pub t: f32,
    pub lungs: f32,
    pub cycles: u32,
    pub sum: f32,
    pub time: f32,
    cycle_sum: f32,
    cycle_time: f32,
    cycle: u32,
    pub good: u32,
    lotus: Vec<EntityId>,
    center: Vec3,
}

impl Breath {
    pub fn start(cx: &mut Cx, o: Opt) -> Self {
        let center = o.at.unwrap_or(cx.spot(STUDIO, "center"));
        cx.player(center, 0.0);
        cx.core.wobble = cx.r.breath.wobble;
        cx.mirror_shot(center, 8.5);
        let mut lotus = Vec::new();
        // Buds wait on the water; each good cycle opens one more, a perfect run blooms the pond.
        let cycles = o.count.unwrap_or(5);
        for i in 0..cycles * 3 {
            let a = i as f32 * 2.4;
            let r = 8.0 + (i % 4) as f32 * 2.0;
            let id = cx.prop("fit_lotus", center + Vec3::new(a.cos() * r, -8.0, a.sin().abs() * -r - 1.0), a, 1.0);
            lotus.push(id);
        }
        Self { t: 0.0, lungs: 0.0, cycles, sum: 0.0, time: 0.0, cycle_sum: 0.0, cycle_time: 0.0, cycle: 0, good: 0, lotus, center }
    }

    /// Seconds in a cycle, and the guide (0 empty, 1 full) at time `t`, and which cycle it is.
    fn guide(&self, r: &Rules, t: f32) -> (f32, u32, bool) {
        let half = r.breath.seconds_in;
        let cycle = half * 2.0;
        let last = self.cycles.saturating_sub(1);
        let plain = last as f32 * cycle;
        if t < plain {
            let n = (t / cycle) as u32;
            let u = t - n as f32 * cycle;
            if u < half { (u / half, n, true) } else { (1.0 - (u - half) / half, n, false) }
        } else {
            // The last breath is longer: half as long again.
            let u = t - plain;
            let h = half * 1.6;
            if u < h { (clamp01(u / h), last, true) } else { (clamp01(1.0 - (u - h) / h), last, false) }
        }
    }

    pub fn length(&self, r: &Rules) -> f32 {
        let half = r.breath.seconds_in;
        self.cycles.saturating_sub(1) as f32 * half * 2.0 + half * 3.2
    }

    pub fn tick(&mut self, cx: &mut Cx, i: &Intent) -> bool {
        let dt = cx.dt;
        self.t += dt;
        let rate = 1.0 / cx.r.breath.seconds_in;
        self.lungs = clamp01(self.lungs + if i.act { rate } else { -rate } * dt);
        let (g, cycle, _) = self.guide(cx.r, self.t);
        // The plan's tick score; the ring counts only with air in the lungs, so not breathing at all
        // stays under a star (see notes/decisions.md).
        let in_ring = cx.core.cob.length() < cx.r.breath.ring && self.lungs > 0.02;
        let m = 1.0 - clamp01((self.lungs - g).abs() / cx.r.breath.match_width);
        let v = 0.7 * m + 0.3 * in_ring as u8 as f32;
        self.sum += v * dt;
        self.time += dt;
        self.cycle_sum += v * dt;
        self.cycle_time += dt;
        if cycle != self.cycle {
            self.cycle = cycle;
            let good = self.cycle_sum / self.cycle_time.max(0.1);
            self.cycle_sum = 0.0;
            self.cycle_time = 0.0;
            if good > 0.6 {
                self.bloom(cx, 3);
            }
        }
        cx.scrub("FIT/Breath", self.lungs);
        cx.lean_body(0.0);
        if self.t >= self.length(cx.r) {
            if self.cycle_sum / self.cycle_time.max(0.1) > 0.6 {
                self.bloom(cx, 3);
            }
            if self.good >= self.cycles {
                let n = self.lotus.len() as u32;
                self.bloom(cx, n);
                let line = cx.pick("posey_perfect");
                cx.say(line, 3.0);
            }
            return true;
        }
        false
    }

    fn bloom(&mut self, cx: &mut Cx, n: u32) {
        for _ in 0..n {
            if let Some(id) = self.lotus.pop() {
                if let Some(e) = cx.sim.state.entities.get_mut(id) {
                    e.pos.y = self.center.y - 0.02;
                    let p = e.pos;
                    cx.ev.push(SimEvent::Burst { pos: p + Vec3::Y * 0.2, kind: 1, count: 18 });
                }
            }
        }
        self.good += 1;
        cx.sfx(sfx::CHIME, 0.7, penta(self.good * 2));
    }

    pub fn bot(&self, core: &BalanceCore, r: &Rules) -> Intent {
        let (_, _, rising) = self.guide(r, self.t + 0.03);
        Intent { act: rising, lean: pd(core, Vec2::ZERO), ..Default::default() }
    }

    pub fn hud(&self, b: &mut B, core: &BalanceCore, r: &Rules) {
        timer(b, self.length(r) - self.t);
        b.puck(PUCK_TOP, PUCK_R, core.cob.into());
        b.puck_ring([0.0, 0.0], r.breath.ring);
        // The guide ring around the figure, and your lungs inside it.
        let (g, _, rising) = self.guide(r, self.t);
        let c = [960.0, 540.0];
        b.circle(c, 150.0 + g * 200.0, [0, 0, 0, 0], TEAL, 10.0);
        b.circle(c, 150.0 + self.lungs * 200.0, [0x78, 0xdc, 0xaa, 50], MINT, 6.0);
        b.center(960.0, 90.0, 64.0, INK, if rising { "Breathe in" } else { "Breathe out" });
    }

    pub fn score(&self, _r: &Rules) -> f32 {
        // Averaged over the whole event, however far it has got.
        1000.0 * self.sum / self.time.max(1.0)
    }
}

