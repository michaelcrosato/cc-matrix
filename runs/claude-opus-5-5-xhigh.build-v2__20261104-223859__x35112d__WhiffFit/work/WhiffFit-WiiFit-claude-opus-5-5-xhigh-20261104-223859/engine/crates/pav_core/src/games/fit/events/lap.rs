//! Morning Lap: one lap of the island. Alternate steps to set your pace, dodge, grab ribbons.

use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::*;

/// A thing on the path.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Thing {
    pub id: Option<EntityId>,
    pub s: f32,
    pub side: f32,
    /// 0 ribbon, 1 crab, 2 sunbather, 3 towel.
    pub kind: u8,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct MorningLap {
    pub s: f32,
    pub side: f32,
    pub pace: f32,
    pub last_step: f32,
    pub foot: u8,
    pub stitch: f32,
    pub stumble: f32,
    pub zone_time: f32,
    pub ribbons: u32,
    pub bumps: u32,
    pub things: Vec<Thing>,
    pub bounce: Option<EntityId>,
    pub pacer_s: f32,
    pub length: f32,
    pub yaw: f32,
    pub in_zone: bool,
    pub flips: Vec<EntityId>,
    pub center: Vec3,
    pub next_step_at: f32,
    pub finished: bool,
}

/// The ring path: a rounded loop around reception (a superellipse sampled by arc length).
pub fn path_point(center: Vec3, r: &Rules, a: f32) -> Vec3 {
    let (s, c) = a.sin_cos();
    let p = 2.0 / r.lap.path_power;
    center + Vec3::new(c.signum() * c.abs().powf(p) * r.lap.path_rx, 0.0, s.signum() * s.abs().powf(p) * r.lap.path_rz)
}

impl MorningLap {
    pub fn new() -> Self {
        Self::default()
    }

    /// Angle along the path for a distance `s`: the loop, walked by small steps.
    fn at(&self, r: &Rules, s: f32) -> (Vec3, Vec3) {
        let table = 720;
        let mut prev = path_point(self.center, r, 0.0);
        let mut d = 0.0;
        for i in 1..=table {
            let a = -i as f32 / table as f32 * std::f32::consts::TAU;
            let q = path_point(self.center, r, a);
            let seg = (q - prev).length();
            if d + seg >= s {
                let u = (s - d) / seg.max(1e-3);
                return (prev.lerp(q, u), (q - prev).normalize_or(Vec3::Z));
            }
            d += seg;
            prev = q;
        }
        (prev, Vec3::X)
    }

    fn total_length(&self, r: &Rules) -> f32 {
        let table = 720;
        let mut prev = path_point(self.center, r, 0.0);
        let mut d = 0.0;
        for i in 1..=table {
            let a = -i as f32 / table as f32 * std::f32::consts::TAU;
            let q = path_point(self.center, r, a);
            d += (q - prev).length();
            prev = q;
        }
        d
    }

    fn spot(&self, r: &Rules, s: f32, side: f32) -> Vec3 {
        let (p, d) = self.at(r, s);
        let right = Vec3::new(-d.z, 0.0, d.x);
        p + right * side
    }

    pub fn start(&mut self, c: &mut RunCommon, cx: &mut Cx) {
        let rules = cx.rules;
        self.center = cx.stage(Set::Hub);
        self.length = self.total_length(rules);
        let (p0, d0) = self.at(rules, 0.0);
        ready_player(cx, Set::Hub, p0, d0.x.atan2(d0.z));
        self.yaw = d0.x.atan2(-d0.z).to_degrees();
        cam_full(cx.sim, 20.0, self.yaw, 9.0, 40.0, 1.0, 0.06, None);
        self.bounce = npc(cx.sim, "bounce_hub");
        self.pacer_s = 5.0;
        // Ribbons and hazards, the same on a seed.
        let mut s = 14.0;
        let count = rules.lap.things as usize;
        let step = (self.length - 24.0) / count as f32;
        let mut n = 0;
        while n < count {
            let rng = &mut cx.sim.state.rng;
            let kind = match n % 4 {
                0 | 2 => 0u8,
                1 => 1 + rng.below(3) as u8,
                _ => 1 + rng.below(2) as u8,
            };
            let side = rng.range(-1.0, 1.0);
            s += step;
            let pos = self.spot(rules, s, side);
            let (asset, scale): (&str, f32) = match kind {
                0 => ("LIB/core/ribbon", 1.0),
                1 => ("LIB/core/crab", 1.0),
                2 => ("LIB/core/lounge_chair", 0.8),
                _ => ("LIB/core/towel_stack", 1.0),
            };
            let id = spawn_prop(cx.sim, asset, pos, side * 3.0, scale);
            self.things.push(Thing { id: Some(id), s, side, kind });
            n += 1;
        }
        c.say_key(Who::Bounce, "bounce.lap_start", 0);
    }

    pub fn tick(&mut self, c: &mut RunCommon, cx: &mut Cx, it: &Intent) -> Option<f32> {
        let rules = cx.rules;
        let r = &rules.lap;
        let dt = cx.dt;
        self.stumble = (self.stumble - dt).max(0.0);
        c.step(cx, it.lean, 0.6, Vec2::ZERO, Vec2::ZERO);
        if self.stumble <= 0.0 {
            let foot = if it.l_just && it.r_just {
                None
            } else if it.l_just {
                Some(0u8)
            } else if it.r_just {
                Some(1u8)
            } else {
                None
            };
            if let Some(f) = foot {
                // The same foot twice counts for little.
                let gap = (c.t - self.last_step).max(0.05);
                self.last_step = c.t;
                let now = 1.0 / gap;
                let k = if f == self.foot { 0.1 } else { 0.45 };
                self.pace += (now.min(6.0) - self.pace) * k;
                self.foot = f;
                cx.sfx(sound::STEP, 0.35, if f == 0 { 0.95 } else { 1.05 });
            }
        }
        if c.t - self.last_step > r.step_timeout {
            self.pace = (self.pace - dt * r.pace_decay).max(0.0);
        }
        self.in_zone = self.pace >= r.zone_lo && self.pace <= r.zone_hi;
        if self.pace > r.zone_hi {
            self.stitch += dt * r.stitch_rise;
        } else {
            self.stitch = (self.stitch - dt * r.stitch_fall).max(0.0);
        }
        // Past halfway to a stitch, you can hear your heart.
        if self.stitch > 0.5 && (c.t * 1.8).floor() != ((c.t - dt) * 1.8).floor() {
            cx.sfx(sound::HEARTBEAT, 0.7, 1.0);
        }
        if self.stitch >= 1.0 {
            self.stitch = 0.3;
            self.stumble = r.stumble;
            self.pace *= 0.4;
            cx.sfx(sound::STITCH, 0.8, 1.0);
            gesture(cx.sim, cx.pid, "FIT/Stumble", false);
            c.say_key(Who::Bounce, "bounce.lap_stitch", c.t as usize);
        }
        if self.in_zone {
            self.zone_time += dt;
        }
        let speed = if self.stumble > 0.0 { 0.0 } else { self.pace * r.stride };
        self.s += speed * dt;
        // The path steers; lean moves you sideways a little.
        let lean = c.core.cob.x;
        self.side += (lean * r.side_reach - self.side) * (1.0 - (-r.side_rate * dt).exp());
        let (p, d) = self.at(rules, self.s.min(self.length - 0.01));
        let right = Vec3::new(-d.z, 0.0, d.x);
        let feet = p + right * self.side;
        place(cx.sim, cx.pid, feet, d.x.atan2(d.z));
        let want = d.x.atan2(-d.z).to_degrees();
        let mut dy = (want - self.yaw + 540.0).rem_euclid(360.0) - 180.0;
        dy = dy.clamp(-90.0 * dt, 90.0 * dt) * 1.0 + dy * 0.02;
        self.yaw = (self.yaw + dy + 540.0).rem_euclid(360.0) - 180.0;
        // Jog scaled to speed.
        let jog = (speed / 3.2).clamp(0.0, 1.6);
        if speed > 0.05 && self.stumble <= 0.0 {
            play_flags(cx.sim, cx.pid, "MESH2MOTION/Jog", 0, jog.max(0.2));
        } else if self.stumble <= 0.0 {
            stop_clip(cx.sim, cx.pid);
        }
        lean_figure(cx.sim, cx.pid, c.core.cob, self.yaw, 8.0, cx.slump);
        // The pacer rolls ahead.
        self.pacer_s += r.pacer_speed * dt;
        if self.s + r.pacer_lead < self.pacer_s {
            self.pacer_s = self.pacer_s.min(self.s + r.pacer_max_gap);
        }
        if let Some(bo) = self.bounce {
            let (bp, bd) = self.at(rules, self.pacer_s.min(self.length - 0.01));
            place(cx.sim, bo, bp, bd.x.atan2(bd.z));
        }
        // Things on the path.
        let at = self.s;
        let side = self.side;
        let mut got = Vec::new();
        for (i, th) in self.things.iter().enumerate() {
            if th.id.is_some() && (th.s - at).abs() < 0.7 && (th.side - side).abs() < if th.kind == 0 { 0.65 } else { 0.55 } {
                got.push(i);
            }
        }
        for i in got {
            let kind = self.things[i].kind;
            if let Some(id) = self.things[i].id.take() {
                cx.sim.despawn(id);
            }
            if kind == 0 {
                self.ribbons += 1;
                cx.sfx(sound::RIBBON, 0.7, 1.0 + self.ribbons as f32 * 0.04);
            } else {
                self.bumps += 1;
                self.pace *= 0.6;
                c.stun = 0.5;
                gesture(cx.sim, cx.pid, "FIT/Stumble", true);
                cx.sfx(sound::BUMP, 0.7, 1.0);
                c.say_key(Who::Bounce, "bounce.lap_bump", self.bumps as usize);
            }
        }
        let n_ribbons = self.things.iter().filter(|t| t.kind == 0).count().max(1) as f32;
        let par_time = self.length / (2.0 * r.stride);
        let zone = clamp01(self.zone_time / par_time);
        let rib = clamp01(self.ribbons as f32 / n_ribbons);
        let bump = self.bumps as f32 * r.bump_cost;
        c.score = clamp01(r.zone_weight * zone + (1.0 - r.zone_weight) * rib - bump) * 1000.0;
        if self.s >= self.length - 0.5 && !self.finished {
            self.finished = true;
            cx.sfx(sound::FANFARE, 0.7, 1.0);
            return Some(c.score);
        }
        (c.t >= r.max_time).then_some(c.score)
    }

    pub fn stop(&mut self, cx: &mut Cx) {
        for th in self.things.drain(..) {
            if let Some(id) = th.id {
                cx.sim.despawn(id);
            }
        }
        if let Some(bo) = self.bounce {
            let at = cx.stage(Set::Hub) + Vec3::new(10.5, 0.0, 6.5);
            place(cx.sim, bo, at, 0.0);
        }
    }

    pub fn hud(&self, c: &RunCommon, r: &Rules, ui: &mut Ui) {
        c.top_bar(ui, "Morning Lap", None);
        // Progress along the lap.
        ui.bar(560.0, 60.0, 800.0, 28.0, clamp01(self.s / self.length.max(1.0)), TEAL);
        // Pace: the zone, and you.
        let (x, y, w, h) = (160.0, 300.0, 90.0, 500.0);
        ui.panel(x - 20.0, y - 20.0, w + 40.0, h + 40.0, with_alpha(WHITE, 0.9), 32.0);
        let top = 4.0;
        ui.panel(x, y + h * (1.0 - r.lap.zone_hi / top), w, h * (r.lap.zone_hi - r.lap.zone_lo) / top, MINT, 18.0);
        ui.circle(x + w * 0.5, y + h * (1.0 - (self.pace / top).min(1.0)), 34.0, if self.in_zone { TEAL } else { CORAL }, WHITE, 5.0);
        ui.text(x + w * 0.5, y + h + 30.0, 34.0, INK, Align::Center, "Pace");
        ui.panel(1660.0, 300.0, 200.0, 170.0, with_alpha(WHITE, 0.9), 30.0);
        ui.text(1760.0, 312.0, 34.0, INK_SOFT, Align::Center, "Ribbons");
        ui.label(1760.0, 360.0, 72.0, INK, Align::Center, format!("{}", self.ribbons));
        if self.stitch > 0.05 {
            ui.panel(1660.0, 500.0, 200.0, 120.0, with_alpha(WHITE, 0.9), 30.0);
            ui.text(1760.0, 510.0, 34.0, CORAL, Align::Center, "Stitch");
            ui.bar(1680.0, 566.0, 160.0, 26.0, self.stitch, CORAL);
        }
        if c.t < 4.0 && self.pace < 0.5 {
            ui.label(960.0, 430.0, 64.0, CORAL, Align::Center, "Left, right, left, right");
        }
        let mut p = c.puck(false);
        p.r = 110.0;
        p.c = [1700.0, 830.0];
        p.band = Some(0.8);
        ui.puck(p);
        ui.prompt_row(&[(Act::StepL, "Left"), (Act::StepR, "Right"), (Act::Lean, "Dodge")]);
    }

    pub fn bot(&self, c: &RunCommon, r: &Rules) -> Intent {
        // Two steps a second, steering to ribbons and round everything else.
        let mut it = Intent::default();
        let period = 0.5;
        let beat = (c.t / period).floor();
        let prev = ((c.t - 1.0 / 60.0) / period).floor();
        if beat != prev {
            if self.foot == 0 {
                it.r_just = true;
            } else {
                it.l_just = true;
            }
        }
        let next = self.things.iter().find(|t| t.id.is_some() && t.s > self.s - 0.5 && t.s < self.s + 7.0);
        let target = match next {
            Some(t) if t.kind == 0 => t.side,
            Some(t) => {
                if t.side > 0.0 {
                    t.side - 1.0
                } else {
                    t.side + 1.0
                }
            }
            None => 0.0,
        };
        let lean_x = (target / r.lap.side_reach / r.core.reach).clamp(-1.0, 1.0);
        it.lean = Vec2::new(lean_x, 0.0);
        it
    }
}
