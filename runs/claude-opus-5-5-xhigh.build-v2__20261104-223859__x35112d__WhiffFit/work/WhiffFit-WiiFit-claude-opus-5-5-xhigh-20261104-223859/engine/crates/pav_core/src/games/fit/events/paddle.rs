//! Paddle Slalom: stand on a board, steer with your lean, pass the gates.

use glam::{Quat, Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::*;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Gate {
    pub z: f32,
    pub x: f32,
    pub passed: bool,
    pub ids: Vec<EntityId>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct PaddleSlalom {
    pub x: f32,
    pub z: f32,
    pub speed: f32,
    pub yaw: f32,
    pub gates: Vec<Gate>,
    pub next: usize,
    pub missed: u32,
    pub penalty: f32,
    pub remount: f32,
    pub gust: Vec2,
    pub gust_t: f32,
    pub gust_in: f32,
    pub streak_ids: Vec<EntityId>,
    pub board: Option<EntityId>,
    pub wake: f32,
    pub start: Vec3,
    pub done: f32,
    pub final_time: f32,
    pub tips: u32,
}

impl PaddleSlalom {
    pub fn new() -> Self {
        Self { gust_in: 5.0, ..Default::default() }
    }

    pub fn start(&mut self, c: &mut RunCommon, cx: &mut Cx) {
        let r = &cx.rules.paddle;
        self.start = cx.stage(Set::Channel);
        let at = self.start;
        ready_player(cx, Set::Channel, at + Vec3::Y * 0.02, std::f32::consts::PI);
        cam_full(cx.sim, 22.0, 0.0, 10.0, 40.0, 0.9, 0.1, None);
        self.board = Some(spawn_prop(cx.sim, "LIB/core/paddleboard", at, 0.0, 1.0));
        let n = r.gates as usize;
        for i in 0..n {
            let z = (i as f32 + 1.0) / (n as f32 + 0.6) * r.length;
            let rng = &mut cx.sim.state.rng;
            let x = rng.range(-r.gate_x, r.gate_x);
            let mut ids = Vec::new();
            for side in [-1.0, 1.0] {
                let p = at + Vec3::new(x + side * r.gate_width * 0.5, 0.0, -z);
                ids.push(spawn_prop(cx.sim, "LIB/core/buoy", p, 0.0, 1.0));
            }
            self.gates.push(Gate { z, x, passed: false, ids });
        }
        c.say_key(Who::Gull, "gull.paddle_start", 0);
    }

    fn par(&self, r: &Rules) -> f32 {
        r.paddle.par
    }

    pub fn tick(&mut self, c: &mut RunCommon, cx: &mut Cx, it: &Intent) -> Option<f32> {
        let rules = cx.rules;
        let r = &rules.paddle;
        let dt = cx.dt;
        if self.done > 0.0 {
            self.done -= dt;
            let par = self.par(rules);
            let score = clamp01((1.6 * par - self.final_time) / (0.8 * par)) * 1000.0;
            c.score = score;
            return (self.done <= 0.0).then_some(score);
        }
        // Gusts, shown as ripple streaks, push the dot.
        self.gust_in -= dt;
        if self.gust_in <= 0.0 {
            self.gust_in = cx.sim.state.rng.range(r.gust_every * 0.7, r.gust_every * 1.3);
            let side = if cx.sim.state.rng.f32() < 0.5 { -1.0 } else { 1.0 };
            self.gust = Vec2::new(side, 0.25) * r.gust;
            self.gust_t = 1.3;
            cx.sfx(sound::GUST, 0.7, 1.0);
            let at = self.start + Vec3::new(self.x - side * 3.0, 0.0, -self.z - 8.0);
            for i in 0..5 {
                let p = at + Vec3::new(side * i as f32 * 0.6, 0.02, i as f32 * 0.7 - 2.0);
                let id = spawn_box(cx.sim, "ripple", p, Vec3::new(1.3, 0.01, 0.06), "#f4fbfb");
                self.streak_ids.push(id);
            }
        }
        if self.gust_t > 0.0 {
            self.gust_t -= dt;
            let side = self.gust.x.signum();
            for id in self.streak_ids.clone() {
                let p = pos_of(cx.sim, id) + Vec3::new(side * 6.0 * dt, 0.0, 0.0);
                move_to(cx.sim, id, p);
            }
        } else {
            self.gust = Vec2::ZERO;
            despawn_all(cx.sim, &mut self.streak_ids);
        }
        if self.remount > 0.0 {
            self.remount -= dt;
            self.speed = 0.0;
            if self.remount <= 0.0 {
                c.core.settle();
                cx.sfx(sound::BOARD, 0.7, 1.0);
                cx.sfx(sound::SPLASH_S, 0.6, 1.0);
            }
        } else {
            let lean_fwd = c.core.cob.y;
            c.step(cx, it.lean, r.wobble * (1.0 + self.speed / 16.0), self.gust, Vec2::ZERO);
            if c.core.tipped {
                self.remount = r.remount;
                self.tips += 1;
                c.tip_fx(cx, true);
                c.say_key(Who::Gull, "gull.paddle_tip", self.tips as usize);
            }
            let want = if lean_fwd > 0.0 { r.base_speed + r.fwd_speed * lean_fwd } else { (r.base_speed + r.brake * lean_fwd).max(0.3) };
            self.speed += (want - self.speed) * (1.0 - (-r.accel * dt).exp());
            let steer = c.core.cob.x * r.steer;
            self.x = (self.x + steer * dt).clamp(-r.half_width, r.half_width);
            self.yaw += (-steer * 0.06 - self.yaw) * (1.0 - (-5.0 * dt).exp());
            self.z += self.speed * dt;
        }
        let at = self.start + Vec3::new(self.x, 0.02, -self.z);
        let facing = std::f32::consts::PI + self.yaw;
        if self.remount <= 0.0 {
            place(cx.sim, cx.pid, at, facing);
        } else {
            // In the water, then climbing back on.
            let u = self.remount / r.remount;
            place(cx.sim, cx.pid, at - Vec3::Y * (0.9 * (u * 3.14).sin()), facing);
        }
        if let Some(b) = self.board {
            let roll = c.core.cob.x * 0.14 * if self.remount > 0.0 { 3.0 } else { 1.0 };
            pose(cx.sim, b, self.start + Vec3::new(self.x, -0.02, -self.z), Quat::from_rotation_y(self.yaw) * Quat::from_rotation_z(-roll));
        }
        if self.remount <= 0.0 {
            lean_figure(cx.sim, cx.pid, c.core.cob, 0.0, rules.core.tilt_deg, cx.slump);
            play(cx.sim, cx.pid, "FIT/Paddle");
        }
        self.wake -= dt * self.speed.max(0.0);
        if self.wake <= 0.0 {
            self.wake = 0.7;
            cx.ev.push(crate::frame::SimEvent::Wake { pos: at + Vec3::Z * 1.4 });
        }
        // Gates.
        while let Some(g) = self.gates.get_mut(self.next) {
            if self.z < g.z {
                break;
            }
            let ok = (self.x - g.x).abs() < r.gate_width * 0.5;
            g.passed = ok;
            if ok {
                cx.ev.push(crate::frame::SimEvent::Gate { pos: at, ok: true });
            } else {
                self.missed += 1;
                self.penalty += r.miss_penalty;
                cx.ev.push(crate::frame::SimEvent::Gate { pos: at, ok: false });
                c.say_key(Who::Gull, "gull.paddle_miss", self.missed as usize);
            }
            self.next += 1;
        }
        let t = c.t + self.penalty;
        let par = self.par(rules);
        c.score = clamp01((1.6 * par - t) / (0.8 * par)) * 1000.0;
        if self.z >= r.length || c.t >= r.max_time {
            self.final_time = t;
            self.done = 1.2;
            cx.sfx(sound::FANFARE, 0.6, 1.0);
        }
        None
    }

    pub fn stop(&mut self, cx: &mut Cx) {
        for g in self.gates.drain(..) {
            for id in g.ids {
                cx.sim.despawn(id);
            }
        }
        despawn_all(cx.sim, &mut self.streak_ids);
        if let Some(b) = self.board.take() {
            cx.sim.despawn(b);
        }
    }

    pub fn hud(&self, c: &RunCommon, r: &Rules, ui: &mut Ui) {
        c.top_bar(ui, "Paddle Slalom", None);
        ui.bar(560.0, 60.0, 800.0, 28.0, clamp01(self.z / r.paddle.length), TEAL);
        let mut p = c.puck(false);
        p.c = [1700.0, 830.0];
        p.r = 150.0;
        ui.puck(p);
        ui.panel(40.0, 170.0, 380.0, 120.0, with_alpha(WHITE, 0.9), 30.0);
        ui.text(60.0, 180.0, 34.0, INK_SOFT, Align::Left, format!("{:.1} m/s", self.speed));
        ui.label(60.0, 222.0, 44.0, INK, Align::Left, format!("{:.1} s, {} missed", c.t + self.penalty, self.missed));
        if self.gust_t > 0.0 {
            ui.label(960.0, 200.0, 64.0, CORAL, Align::Center, "Gust!");
        }
        if self.remount > 0.0 {
            ui.label(960.0, 200.0, 64.0, CORAL, Align::Center, "Remounting with dignity");
        }
        ui.prompt_row(&[(Act::Lean, "Steer, lean forward to go")]);
    }

    pub fn bot(&self, _c: &RunCommon, r: &Rules) -> Intent {
        let target = self.gates.get(self.next).map(|g| g.x).unwrap_or(0.0);
        let err = target - self.x;
        // Lean forward 0.5 and steer to the gate's centre, against the wind.
        let x = (err * 0.55 - self.gust.x / r.core.stiffness).clamp(-0.6, 0.6);
        Intent { lean: Vec2::new(x, 0.5).clamp_length_max(0.85), ..Default::default() }
    }
}
