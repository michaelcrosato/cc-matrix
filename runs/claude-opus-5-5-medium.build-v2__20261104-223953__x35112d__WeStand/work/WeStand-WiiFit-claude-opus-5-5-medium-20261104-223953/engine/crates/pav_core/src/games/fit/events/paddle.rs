//! Paddle Slalom: stand on a board on a long channel and pass buoy gates. Lean x steers, forward
//! speeds up and risks tipping, back brakes.

use super::*;
use crate::games::fit::sfx;

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct Gate {
    pub z: f32,
    pub x: f32,
    pub passed: bool,
    pub missed: bool,
    pub id: [EntityId; 2],
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Paddle {
    pub t: f32,
    pub pos: Vec3,
    pub start: Vec3,
    pub gates: Vec<Gate>,
    pub missed: u32,
    pub passed: u32,
    remount: f32,
    gust_in: f32,
    gust_for: f32,
    pub gust: Vec2,
    board: Option<EntityId>,
    wake: u32,
    pub finish: f32,
    pub done: bool,
    pub speed: f32,
    streaks: Vec<EntityId>,
    seed: u32,
}

const CAM: f32 = 180.0;

impl Paddle {
    pub fn start(cx: &mut Cx, _o: Opt) -> Self {
        let start = cx.spot(CHANNEL, "start");
        let n = cx.r.paddle.gates as u32;
        let mut gates = Vec::new();
        let seed = cx.seed;
        let sr = |k: u32| ((seed.wrapping_mul(2654435761).wrapping_add(k.wrapping_mul(40503))) >> 8) as f32 % 10000.0 / 10000.0;
        let w = cx.r.paddle.gate_width;
        for k in 0..n {
            let z = start.z + 18.0 + k as f32 * 15.0;
            let x = start.x + (sr(k) - 0.5) * 16.0;
            let a = cx.prop("fit_buoy", Vec3::new(x - w, -0.05, z), 0.0, 1.0);
            let b = cx.prop("fit_buoy", Vec3::new(x + w, -0.05, z), 0.0, 1.0);
            gates.push(Gate { z, x, passed: false, missed: false, id: [a, b] });
        }
        let finish = start.z + 18.0 + n as f32 * 15.0;
        let board = cx.prop("fit_paddleboard", start, 0.0, 1.0);
        let mut streaks = Vec::new();
        for _ in 0..4 {
            streaks.push(cx.ball(0.0, "#ffffff", start - Vec3::Y * 9.0));
        }
        cx.player(start, 0.0);
        cx.core.wobble = cx.r.paddle.wobble;
        cx.clip("FIT/Paddle", 1.0);
        *cx.shot = Shot { tilt: 22.0, yaw: CAM, distance: 10.0, fov: 40.0, height: 1.0, focus: start };
        cx.ev.push(SimEvent::Music { song: 5 });
        Self { t: 0.0, pos: start, start, gates, missed: 0, passed: 0, remount: 0.0, gust_in: 4.0, gust_for: 0.0, gust: Vec2::ZERO, board: Some(board), wake: 0, finish, done: false, speed: 0.0, streaks, seed }
    }

    pub fn tick(&mut self, cx: &mut Cx, _i: &Intent) -> bool {
        let dt = cx.dt;
        self.t += dt;
        let r = cx.r.paddle.clone();
        // Gusts, shown as streaks on the water, push the dot.
        self.gust_in -= dt;
        if self.gust_in <= 0.0 {
            self.gust_in = cx.rng().range(4.0, 8.0);
            self.gust_for = 2.0;
            let a = cx.rng().range(0.0, TAU);
            self.gust = Vec2::new(a.cos(), a.sin() * 0.5) * r.gust * 2.0;
            cx.sfx(sfx::GUST, 0.7, 1.0);
        }
        if self.gust_for > 0.0 {
            self.gust_for -= dt;
            cx.core.gust = self.gust;
        } else {
            cx.core.gust = Vec2::ZERO;
        }
        if self.remount > 0.0 {
            self.remount -= dt;
            self.speed = 0.0;
            let u = clamp01(1.0 - self.remount / r.remount);
            cx.player(self.pos - Vec3::Y * (1.0 - u) * 1.1, 0.0);
        } else {
            let cob = cx.core.cob;
            // Screen right is world -X with the camera looking along +Z.
            let forward = cob.y.max(0.0);
            let back = (-cob.y).max(0.0);
            let target = (r.cruise + (r.sprint - r.cruise) * forward) * (1.0 - back * 0.8);
            self.speed += (target - self.speed) * (1.0 - (-3.0 * dt).exp());
            self.pos.z += self.speed * dt;
            self.pos.x -= cob.x * r.steer * dt;
            self.pos.x = self.pos.x.clamp(self.start.x - 13.0, self.start.x + 13.0);
            cx.player(self.pos, 0.0);
            self.wake += 1;
            if self.wake % 5 == 0 {
                cx.ev.push(SimEvent::Wake { pos: self.pos - Vec3::Z * 1.2 });
            }
        }
        if let Some(b) = self.board {
            let tilt = Quat::from_rotation_z(cx.core.cob.x * 0.1) * Quat::from_rotation_x(-cx.core.cob.y * 0.1);
            cx.place(b, self.pos + Vec3::Y * 0.0, tilt);
        }
        let n = self.streaks.len();
        for k in 0..n {
            let id = self.streaks[k];
            let vis = self.gust_for > 0.0;
            let a = k as f32 * 1.7;
            let at = self.pos + Vec3::new((self.gust.x.signum()) * ((self.t * 6.0 + a).fract() * 9.0 - 4.0), 0.1, 6.0 + k as f32 * 2.0);
            if let Some(e) = cx.sim.state.entities.get_mut(id) {
                e.pos = if vis { at } else { self.start - Vec3::Y * 9.0 };
                if let Some(v) = &mut e.visual {
                    v.shape = crate::shape::Shape::Capsule { half_height: 0.9, radius: 0.04 };
                    v.color = Color::hex("#ffffff");
                }
                e.rot = Quat::from_rotation_z(std::f32::consts::FRAC_PI_2);
            }
        }
        let pz = self.pos.z;
        let px = self.pos.x;
        let mut pass = 0;
        let mut miss = 0;
        for g in self.gates.iter_mut().filter(|g| !g.passed && !g.missed) {
            if pz >= g.z {
                if (px - g.x).abs() <= r.gate_width {
                    g.passed = true;
                    pass += 1;
                } else {
                    g.missed = true;
                    miss += 1;
                }
            }
        }
        if pass > 0 {
            self.passed += pass;
            cx.ev.push(SimEvent::Gate { pos: self.pos, ok: true });
        }
        if miss > 0 {
            self.missed += miss;
            cx.ev.push(SimEvent::Gate { pos: self.pos, ok: false });
            cx.say("A gate was missed. It has been told.", 2.0);
        }
        *cx.shot = Shot { tilt: 22.0, yaw: CAM, distance: 10.0, fov: 40.0, height: 1.0, focus: self.pos };
        cx.lean_body(CAM);
        if pz >= self.finish {
            self.done = true;
            return true;
        }
        self.t >= 90.0
    }

    /// The core tipped: a big splash and a remount.
    pub fn on_tip(&mut self, cx: &mut Cx) {
        self.remount = cx.r.paddle.remount;
        cx.ev.push(SimEvent::BigSplash { pos: self.pos, size: 0.45 });
        cx.sfx(sfx::SPLASH_B, 0.7, 1.2);
        let line = cx.pick("gull_tip");
        cx.say(line, 2.5);
    }

    pub fn bot(&self, core: &BalanceCore, _r: &Rules) -> Intent {
        let mut i = Intent::default();
        let want = self.gates.iter().find(|g| !g.passed && !g.missed).map(|g| g.x).unwrap_or(self.start.x);
        // Screen right is world -X.
        let steer = ((self.pos.x - want) * 0.35).clamp(-0.8, 0.8);
        i.lean = pd(core, Vec2::new(steer, 0.5));
        i
    }

    fn time(&self) -> f32 {
        self.t + 2.0 * self.missed as f32
    }

    pub fn hud(&self, b: &mut B, core: &BalanceCore, r: &Rules) {
        b.title_left(60.0, 30.0, 80.0, INK, &format!("{:.1}", self.time()));
        b.text(60.0, 130.0, 40.0, INK, &format!("Par {:.0}", r.paddle.par));
        b.puck(PUCK_TOP, PUCK_R, core.cob.into());
        b.bar([560.0, 40.0, 1360.0, 70.0], ((self.pos.z - self.start.z) / (self.finish - self.start.z)).clamp(0.0, 1.0), TEAL, None);
        b.right(1860.0, 450.0, 44.0, INK, &format!("Gates {}", self.passed));
        if self.gust_for > 0.0 {
            b.center(960.0, 120.0, 56.0, CORAL, "Gust!");
        }
    }

    pub fn score(&self, r: &Rules) -> f32 {
        if !self.done {
            // While under way, and on timing out: how far you got, at most half.
            let frac = ((self.pos.z - self.start.z) / (self.finish - self.start.z)).clamp(0.0, 1.0);
            let _ = self.seed;
            return if self.t >= 90.0 { 0.0 } else { 300.0 * frac };
        }
        ((1.6 * r.paddle.par - self.time()) / (0.8 * r.paddle.par)).clamp(0.0, 1.0) * 1000.0
    }
}
