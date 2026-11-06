//! Tray Trek: walk a long pier with a stack of smoothies. Your dot tilts the tray.

use glam::{Quat, Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::*;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Glass {
    pub p: Vec2,
    pub v: Vec2,
    pub id: Option<EntityId>,
    pub falling: f32,
    pub lost: bool,
    pub h: f32,
    pub grip: f32,
}

/// A jolt to come, and what it is.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Jolt {
    pub z: f32,
    pub dir: Vec2,
    /// 0 wave, 1 plank gap, 2 gull.
    pub kind: u8,
    pub warned: bool,
    pub ent: Option<EntityId>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct TrayTrek {
    pub z: f32,
    pub glasses: Vec<Glass>,
    pub jolts: Vec<Jolt>,
    pub next: usize,
    pub tray: Option<EntityId>,
    pub start: Vec3,
    pub warn: f32,
    pub warn_word: String,
    pub spilled: u32,
    pub finish: f32,
    pub marjorie: Option<EntityId>,
    pub said: bool,
    pub stepz: f32,
}

impl TrayTrek {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn start(&mut self, c: &mut RunCommon, cx: &mut Cx) {
        let r = &cx.rules.tray;
        self.start = cx.stage(Set::Pier);
        let at = self.start;
        ready_player(cx, Set::Pier, at, std::f32::consts::PI);
        cam_full(cx.sim, 24.0, 0.0, 8.5, 40.0, 1.2, 0.08, None);
        self.tray = Some(spawn_prop(cx.sim, "LIB/core/tray", at + Vec3::Y * 1.3, 0.0, 1.0));
        let spots = [(0.0, 0.0), (-0.16, 0.1), (0.16, 0.1), (-0.08, -0.14), (0.1, -0.13)];
        let cols = ["#ff9db0", "#ffd166", "#78dcaa", "#c4b1e8", "#ffb88a"];
        for (i, (x, y)) in spots.iter().enumerate() {
            let id = spawn_prop_roles(cx.sim, "LIB/core/smoothie", at + Vec3::Y * 1.4, 0.0, 1.0, &[("$accent", cols[i])]);
            let grip = 0.9 + i as f32 * 0.05;
            self.glasses.push(Glass { p: Vec2::new(*x, *y), id: Some(id), h: if i == 0 { 0.2 } else { 0.0 }, grip, ..Default::default() });
        }
        // The jolts: the same on a seed.
        let n = r.jolts as usize;
        for i in 0..n {
            let rng = &mut cx.sim.state.rng;
            let z = 10.0 + (i as f32 + rng.range(0.0, 0.5)) / n as f32 * (r.length - 16.0);
            let kind = rng.below(3) as u8;
            let a = if rng.f32() < 0.5 { 0.0f32 } else { std::f32::consts::PI } + rng.range(-0.9, 0.9);
            let mut jolt = Jolt { z, dir: Vec2::new(a.cos(), a.sin()), kind, warned: false, ent: None };
            if kind == 1 {
                let p = at + Vec3::new(0.0, 0.01, -z);
                jolt.ent = Some(spawn_box(cx.sim, "gap", p, Vec3::new(1.6, 0.012, 0.35), "#35586a"));
            }
            self.jolts.push(jolt);
        }
        self.marjorie = npc(cx.sim, "marjorie_pier");
        c.say_key(Who::Gull, "gull.tray_start", 0);
    }

    pub fn tick(&mut self, c: &mut RunCommon, cx: &mut Cx, it: &Intent) -> Option<f32> {
        let rules = cx.rules;
        let r = &rules.tray;
        let dt = cx.dt;
        if self.finish > 0.0 {
            self.finish -= dt;
            return (self.finish <= 0.0).then(|| c.score);
        }
        self.z += r.pace * dt;
        let mut nudge = Vec2::ZERO;
        let mut kick = Vec2::ZERO;
        self.warn = (self.warn - dt).max(0.0);
        if let Some(j) = self.jolts.get_mut(self.next) {
            if !j.warned && j.z - self.z < r.pace * r.warning {
                j.warned = true;
                self.warn = r.warning;
                self.warn_word = ["Wave!", "Plank gap!", "Gull!"][j.kind as usize].to_string();
                if j.kind == 2 {
                    let p = self.start + Vec3::new(-j.dir.x * 12.0, 3.0, -self.z);
                    j.ent = Some(spawn_prop(cx.sim, "LIB/core/gull", p, 0.0, 1.2));
                    cx.ev.push(crate::frame::SimEvent::Sfx { id: sound::GULL, gain: 0.9, pitch: 1.0 });
                } else if j.kind == 0 {
                    cx.ev.push(crate::frame::SimEvent::Sfx { id: sound::WAVE, gain: 0.7, pitch: 1.0 });
                }
            }
            if self.z >= j.z {
                nudge = j.dir * r.jolt_nudge;
                kick = j.dir * r.jolt_kick;
                let at = self.start + Vec3::new(j.dir.x * 3.0, 0.0, -self.z);
                match j.kind {
                    0 => cx.ev.push(crate::frame::SimEvent::BigSplash { pos: at, size: 0.6 }),
                    1 => cx.ev.push(crate::frame::SimEvent::Sfx { id: sound::CREAK, gain: 1.0, pitch: 0.8 }),
                    _ => cx.ev.push(crate::frame::SimEvent::Sfx { id: sound::GULL, gain: 1.0, pitch: 1.3 }),
                }
                self.next += 1;
            }
        }
        // A swooping gull crosses over.
        for j in &mut self.jolts {
            if j.kind == 2 {
                if let Some(id) = j.ent {
                    let u = (self.z - j.z) / (r.pace * 1.6);
                    let p = self.start + Vec3::new(j.dir.x * 12.0 * u, 1.8 + 1.8 * u.abs(), -self.z + 1.0);
                    move_to(cx.sim, id, p);
                    if u > 1.2 {
                        cx.sim.despawn(id);
                        j.ent = None;
                    }
                }
            }
        }
        c.step(cx, it.lean, r.wobble, Vec2::ZERO, nudge);
        if c.core.tipped {
            c.tip_fx(cx, false);
            kick += c.core.cob * 0.6;
            c.core.settle();
        }
        let tilt = c.core.cob;
        let feet = self.start + Vec3::new(0.0, 0.0, -self.z);
        place(cx.sim, cx.pid, feet, std::f32::consts::PI);
        // Hands forward: the tray rides above them.
        let at = feet + Vec3::new(0.0, 1.32, -0.42);
        let rot = Quat::from_rotation_z(-tilt.x * r.tilt_deg.to_radians()) * Quat::from_rotation_x(-tilt.y * r.tilt_deg.to_radians());
        if let Some(t) = self.tray {
            pose(cx.sim, t, at, rot);
        }
        let mut plops = 0;
        for g in &mut self.glasses {
            if g.lost {
                continue;
            }
            if g.falling > 0.0 {
                g.falling -= dt;
                if let Some(id) = g.id {
                    let p = pos_of(cx.sim, id);
                    let v = Vec3::new(g.v.x, -(0.6 - g.falling) * 9.0, -g.v.y);
                    move_to(cx.sim, id, p + v * dt);
                    if g.falling <= 0.0 {
                        cx.sim.despawn(id);
                        g.id = None;
                        g.lost = true;
                    }
                }
                continue;
            }
            // Glasses slide with tilt; a jolt kicks them.
            let a = tilt * r.slide * g.grip - g.v * r.friction;
            g.v += a * dt + kick * g.grip;
            g.p += g.v * dt;
            if g.p.length() > r.edge {
                g.falling = 0.6;
                self.spilled += 1;
                plops += 1;
            }
            if let Some(id) = g.id {
                pose(cx.sim, id, at + rot * Vec3::new(g.p.x, 0.05 + g.h, -g.p.y), rot);
            }
        }
        for _ in 0..plops {
            cx.sfx(sound::GLASS_PLOP, 0.9, 1.0);
            c.say_key(Who::Gull, "gull.tray_spill", self.spilled as usize);
        }
        // The walk: Balance_Walk under, the carry on top.
        play_flags(cx.sim, cx.pid, "FIT/TrayWalk", 0, 1.0);
        lean_figure(cx.sim, cx.pid, tilt, 0.0, rules.core.tilt_deg * 0.6, cx.slump);
        self.stepz += r.pace * dt;
        if self.stepz > 0.8 {
            self.stepz = 0.0;
            cx.sfx(sound::STEP, 0.3, 1.0);
        }
        let left = self.glasses.iter().filter(|g| !g.lost && g.falling <= 0.0).count() as f32;
        c.score = clamp01((left * r.per_glass + if self.spilled == 0 { r.bonus } else { 0.0 }) / 1000.0) * 1000.0;
        if self.z >= r.length {
            let mar = (left as usize).min(5);
            c.say_key(Who::Marjorie, "marjorie.tray", mar);
            self.finish = 3.0;
            cx.sfx(sound::FANFARE, 0.6, 1.0);
            // Standing still at last, the tray still held out.
            play_flags(cx.sim, cx.pid, "FIT/CarryTray", crate::clips::UPPER, 0.0);
        }
        None
    }

    pub fn stop(&mut self, cx: &mut Cx) {
        for g in self.glasses.drain(..) {
            if let Some(id) = g.id {
                cx.sim.despawn(id);
            }
        }
        for j in self.jolts.drain(..) {
            if let Some(id) = j.ent {
                cx.sim.despawn(id);
            }
        }
        if let Some(t) = self.tray.take() {
            cx.sim.despawn(t);
        }
    }

    pub fn hud(&self, c: &RunCommon, r: &Rules, ui: &mut Ui) {
        c.top_bar(ui, "Tray Trek", None);
        ui.bar(560.0, 60.0, 800.0, 28.0, clamp01(self.z / r.tray.length), TEAL);
        ui.puck({
            let mut p = c.puck(false);
            p.c = [1700.0, 830.0];
            p.r = 150.0;
            p
        });
        // The tray from above, with its glasses.
        let (cx, cy, rr) = (220.0, 830.0, 150.0);
        ui.circle(cx, cy, rr, with_alpha(WHITE, 0.92), INK_SOFT, 6.0);
        for g in &self.glasses {
            if g.lost || g.falling > 0.0 {
                continue;
            }
            let k = rr / r.tray.edge;
            ui.circle(cx + g.p.x * k, cy - g.p.y * k, 26.0, CORAL, WHITE, 4.0);
        }
        if self.warn > 0.0 {
            ui.label(960.0, 200.0, 72.0, CORAL, Align::Center, self.warn_word.clone());
        }
        ui.prompt_row(&[(Act::Lean, "Tilt the tray, keep the glasses on")]);
    }

    pub fn bot(&self, c: &RunCommon, r: &Rules) -> Intent {
        // Counter the jolts it knows are coming, and bring the stack back to the middle.
        let live: Vec<&Glass> = self.glasses.iter().filter(|g| !g.lost && g.falling <= 0.0).collect();
        let mut sum = Vec2::ZERO;
        let mut vel = Vec2::ZERO;
        let mut far = Vec2::ZERO;
        let mut far_d = 0.0;
        for g in &live {
            sum += g.p;
            vel += g.v;
            if g.p.length() > far_d {
                far_d = g.p.length();
                far = g.p;
            }
        }
        let n = live.len().max(1) as f32;
        let target = -(sum / n) * 1.8 - (vel / n) * 1.6 - far * 0.8;
        let mut lean = target * r.tray.friction.max(0.5);
        if let Some(j) = self.jolts.get(self.next) {
            if j.z - self.z < r.tray.pace * 0.25 {
                lean -= j.dir * 0.2;
            }
        }
        let _ = c;
        Intent { lean: lean.clamp_length_max(0.9), ..Default::default() }
    }
}
