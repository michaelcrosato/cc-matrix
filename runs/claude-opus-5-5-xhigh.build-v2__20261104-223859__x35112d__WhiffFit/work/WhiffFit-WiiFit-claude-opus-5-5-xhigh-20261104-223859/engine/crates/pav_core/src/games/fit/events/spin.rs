//! Floatie Spin: circle the lean to keep inflatable rings up around your hips.

use glam::{Quat, Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::*;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Ring {
    pub id: Option<EntityId>,
    /// Height above the feet.
    pub h: f32,
    pub angle: f32,
    /// Flying in: seconds until it arrives, from which side (-1 left, 1 right).
    pub flying: f32,
    pub side: f32,
    pub on: bool,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct FloatieSpin {
    pub rings: Vec<Ring>,
    pub lost: u32,
    pub omega: f32,
    pub angle: f32,
    pub last: Vec2,
    pub dir: f32,
    pub switch_in: f32,
    pub toss_in: f32,
    pub in_band: bool,
    pub sum: f32,
    pub clip_t: f32,
    pub flash_switch: f32,
    pub tossers: Vec<EntityId>,
}

impl FloatieSpin {
    pub fn new() -> Self {
        Self { dir: 1.0, ..Default::default() }
    }

    fn add_ring(&mut self, cx: &mut Cx, side: f32, flying: f32, on: bool) {
        let at = cx.feet() + Vec3::new(side * 6.0, 1.0, 0.0);
        let colors = ["#ff786e", "#ffd166", "#78dcaa", "#46bec8", "#c4b1e8", "#ffa8c0", "#fbfaf6"];
        let col = colors[self.rings.len() % colors.len()];
        let id = spawn_prop_roles(cx.sim, "LIB/core/floatie", at, 0.0, 1.0, &[("$accent", col)]);
        let n = self.rings.len() as f32;
        self.rings.push(Ring { id: Some(id), h: cx.rules.spin.ring_h + n * 0.07, angle: n * 1.1, flying, side, on });
    }

    pub fn start(&mut self, c: &mut RunCommon, cx: &mut Cx) {
        let at = cx.stage(Set::Boardwalk);
        ready_player(cx, Set::Boardwalk, at + Vec3::Y * 0.5, 0.0);
        cam(cx.sim, 16.0, 0.0, 8.5, 36.0);
        self.switch_in = cx.rules.spin.switch_every;
        self.toss_in = 3.0;
        self.add_ring(cx, 0.0, 0.0, true);
        self.tossers = cx.sim.state.entities.iter().filter(|e| e.name.starts_with("clapper")).map(|e| e.id).collect();
        c.say_key(Who::Bounce, "bounce.spin_start", 0);
    }

    pub fn tick(&mut self, c: &mut RunCommon, cx: &mut Cx, it: &Intent) -> Option<f32> {
        let r = &cx.rules.spin;
        let dt = cx.dt;
        c.step(cx, it.lean * 0.5, 0.4, Vec2::ZERO, Vec2::ZERO);
        // Spin speed: the smoothed angular velocity of the lean.
        let mut w = 0.0;
        if it.lean.length() > r.min_lean && self.last.length() > r.min_lean {
            let cross = self.last.perp_dot(it.lean);
            let d = self.last.dot(it.lean);
            w = cross.atan2(d) / dt;
        }
        self.last = it.lean;
        self.omega += (w - self.omega) * (1.0 - (-r.smoothing * dt).exp());
        self.angle += self.omega * dt;
        let lo = r.band_lo / r.spin_band_scale;
        let hi = r.band_hi * r.spin_band_scale;
        let speed = self.omega * self.dir;
        self.in_band = speed >= lo && speed <= hi;
        // "Switch!" flips the direction.
        self.switch_in -= dt;
        if self.switch_in <= 0.0 {
            self.switch_in = r.switch_every;
            self.dir = -self.dir;
            self.flash_switch = 1.2;
            cx.sfx(sound::GONG, 0.5, 1.4);
            c.say_key(Who::Bounce, "bounce.spin_switch", c.t as usize);
        }
        self.flash_switch = (self.flash_switch - dt).max(0.0);
        // Guests toss new rings from either side.
        let on = self.rings.iter().filter(|x| x.on).count();
        self.toss_in -= dt;
        if self.toss_in <= 0.0 && self.rings.len() < r.max_rings as usize + self.lost as usize {
            self.toss_in = r.toss_every;
            let side = if cx.sim.state.rng.f32() < 0.5 { -1.0 } else { 1.0 };
            let fly = r.toss_flight;
            self.add_ring(cx, side, fly, false);
            cx.sfx(sound::WHOOSH, 0.5, 1.0);
            if let Some(&t) = self.tossers.first() {
                gesture(cx.sim, t, "MESH2MOTION/Cheering_Two_Hands", true);
            }
        }
        let feet = cx.feet();
        let (l, rr) = (it.l_just, it.r_just);
        let mut catches = Vec::new();
        for (i, ring) in self.rings.iter_mut().enumerate() {
            if ring.on || ring.id.is_none() {
                continue;
            }
            ring.flying -= dt;
            let press = if ring.side < 0.0 { l } else { rr };
            if press && ring.flying.abs() <= r.catch_window && on < r.max_rings as usize {
                ring.on = true;
                catches.push(i);
            } else if ring.flying < -r.catch_window {
                catches.push(usize::MAX - i);
            }
        }
        for &i in &catches {
            if i < 1000 {
                cx.sfx(sound::CATCH, 0.7, 1.0 + i as f32 * 0.05);
            } else {
                let j = usize::MAX - i;
                if let Some(id) = self.rings[j].id.take() {
                    cx.sim.despawn(id);
                }
                self.lost += 1;
                cx.sfx(sound::MISS, 0.4, 0.8);
            }
        }
        // Out of band, rings sink; on the floor they are lost.
        let mut dropped = Vec::new();
        for (i, ring) in self.rings.iter_mut().enumerate() {
            let Some(id) = ring.id else { continue };
            if ring.flying > 0.0 && !ring.on {
                let u = ring.flying / r.toss_flight;
                let p = feet + Vec3::new(ring.side * 6.0 * u, 1.1 + 2.0 * (u * std::f32::consts::PI).sin(), 0.0);
                pose(cx.sim, id, p, Quat::from_rotation_x(u * 6.0));
                continue;
            }
            if !ring.on {
                continue;
            }
            if self.in_band {
                ring.h = (ring.h + dt * r.rise).min(r.ring_h + i as f32 * 0.07);
            } else {
                ring.h -= dt * r.sink;
            }
            ring.angle += self.omega * dt;
            let w = ring.angle * 0.33 + i as f32;
            let tilt = 0.18 + 0.08 * (i as f32).sin();
            let off = Vec3::new(ring.angle.cos(), 0.0, ring.angle.sin()) * 0.1;
            pose(cx.sim, id, feet + Vec3::Y * ring.h + off, Quat::from_rotation_y(w) * Quat::from_rotation_x(tilt));
            if ring.h < 0.12 {
                dropped.push(i);
            }
        }
        for i in dropped {
            if let Some(id) = self.rings[i].id.take() {
                cx.sim.despawn(id);
            }
            self.rings[i].on = false;
            self.lost += 1;
            cx.sfx(sound::BUMP, 0.5, 1.4);
        }
        let on = self.rings.iter().filter(|x| x.on).count() as f32;
        if self.in_band {
            self.sum += on * dt;
        }
        c.score = clamp01(self.sum / r.par) * 1000.0;
        // Scrub the hips round with the spin.
        self.clip_t = self.angle.rem_euclid(std::f32::consts::TAU) / std::f32::consts::TAU;
        let flip = if self.omega < 0.0 { 1.0 - self.clip_t } else { self.clip_t };
        scrub(cx.sim, cx.pid, "FIT/HipCircle", flip);
        lean_figure(cx.sim, cx.pid, c.core.cob, 0.0, cx.rules.core.tilt_deg, cx.slump);
        (c.t >= r.length).then_some(c.score)
    }

    pub fn stop(&mut self, cx: &mut Cx) {
        for ring in self.rings.drain(..) {
            if let Some(id) = ring.id {
                cx.sim.despawn(id);
            }
        }
    }

    pub fn hud(&self, c: &RunCommon, r: &Rules, ui: &mut Ui) {
        c.top_bar(ui, "Floatie Spin", Some(r.spin.length - c.t));
        let lean_dot = [self.last.x, self.last.y];
        let mut p = c.puck(true);
        p.dot = lean_dot;
        p.good = self.in_band;
        p.ring = Some([0.0, 0.0, 0.65]);
        ui.puck(p);
        // The speed gauge.
        let (x, y, w, h) = (1500.0, 280.0, 90.0, 560.0);
        ui.panel(x - 20.0, y - 20.0, w + 40.0, h + 40.0, with_alpha(WHITE, 0.9), 32.0);
        let top = 14.0;
        let lo = r.spin.band_lo / r.spin.spin_band_scale;
        let hi = r.spin.band_hi * r.spin.spin_band_scale;
        ui.panel(x, y + h * (1.0 - hi / top), w, h * (hi - lo) / top, MINT, 18.0);
        let sp = (self.omega * self.dir).clamp(0.0, top);
        ui.circle(x + w * 0.5, y + h * (1.0 - sp / top), 34.0, if self.in_band { TEAL } else { CORAL }, WHITE, 5.0);
        let dirs = if self.dir > 0.0 { "Clockwise-ish" } else { "The other way" };
        let col = if self.flash_switch > 0.0 { CORAL } else { INK };
        ui.panel(120.0, 240.0, 520.0, 76.0, with_alpha(WHITE, 0.9), 30.0);
        ui.label(380.0, 252.0, 46.0, col, Align::Center, if self.flash_switch > 0.0 { "Switch!" } else { dirs });
        let on = self.rings.iter().filter(|x| x.on).count();
        ui.panel(120.0, 340.0, 520.0, 76.0, with_alpha(WHITE, 0.9), 30.0);
        ui.label(380.0, 352.0, 46.0, INK, Align::Center, format!("{on} of {} rings", r.spin.max_rings));
        // Incoming rings.
        for ring in &self.rings {
            if !ring.on && ring.id.is_some() && ring.flying < 1.2 {
                let x = if ring.side < 0.0 { 330.0 } else { 1590.0 };
                let act = if ring.side < 0.0 { Act::StepL } else { Act::StepR };
                ui.circle(x, 600.0, 70.0 + 50.0 * clamp01(ring.flying), with_alpha(SUN, 0.5), SUN, 8.0);
                ui.prompt(x - 26.0, 600.0, act, "", Align::Left);
            }
        }
        ui.prompt_row(&[(Act::Lean, "Circle"), (Act::StepL, "Catch left"), (Act::StepR, "Catch right")]);
    }

    pub fn bot(&self, c: &RunCommon, r: &Rules) -> Intent {
        let phase = 7.5 * c.t * self.dir;
        let mut it = Intent { lean: Vec2::new(phase.cos(), phase.sin()) * 0.85, ..Default::default() };
        for ring in &self.rings {
            if !ring.on && ring.id.is_some() && ring.flying.abs() < r.spin.catch_window * 0.5 {
                if ring.side < 0.0 {
                    it.l_just = true;
                } else {
                    it.r_just = true;
                }
            }
        }
        it
    }
}
