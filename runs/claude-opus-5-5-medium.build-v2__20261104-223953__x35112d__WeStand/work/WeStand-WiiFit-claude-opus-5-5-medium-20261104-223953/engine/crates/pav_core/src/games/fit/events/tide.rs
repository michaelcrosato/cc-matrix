//! Tide Table: you stand on a raft and your lean tilts it. Roll hermit crabs into tide pools.

use super::*;
use crate::games::fit::sfx;

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct Shell {
    pub id: EntityId,
    pub p: Vec2,
    pub v: Vec2,
    pub potted: bool,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct Pool {
    pub id: EntityId,
    pub p: Vec2,
    pub moving: bool,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct Bumper {
    pub id: EntityId,
    pub p: Vec2,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Tide {
    pub t: f32,
    pub board: u32,
    pub shells: Vec<Shell>,
    pub pools: Vec<Pool>,
    pub bumpers: Vec<Bumper>,
    pub potted: u32,
    pub time_bonus: f32,
    raft: Option<EntityId>,
    center: Vec3,
    pub half: f32,
    tide_level: f32,
    roll_t: f32,
    seed: u32,
}

const BOARD_SHELLS: [u32; 3] = [3, 5, 7];
pub const TOTAL: u32 = 15;

impl Tide {
    pub fn start(cx: &mut Cx, _o: Opt) -> Self {
        // The deck floats above the water, high enough that a tilt never dips a corner in.
        let center = cx.spot(TIDE, "center") + Vec3::Y * 0.32;
        let raft = cx.prop("fit_raft", center, 0.0, 1.0);
        cx.player(center + Vec3::Y * 0.02, 0.0);
        cx.core.wobble = 0.5;
        *cx.shot = Shot { tilt: 62.0, yaw: 0.0, distance: 13.0, fov: 40.0, height: 0.0, focus: center };
        let mut s = Self { t: 0.0, board: 0, shells: Vec::new(), pools: Vec::new(), bumpers: Vec::new(), potted: 0, time_bonus: 0.0, raft: Some(raft), center, half: cx.r.tide.half, tide_level: 0.0, roll_t: 0.0, seed: cx.seed };
        s.lay(cx);
        cx.ev.push(SimEvent::Music { song: 5 });
        s
    }

    /// A number the same on every copy with the same seed (the medley's rule).
    fn sr(&mut self, k: u32) -> f32 {
        let x = (self.seed.wrapping_mul(2654435761).wrapping_add(k.wrapping_mul(40503))) >> 8;
        (x % 10000) as f32 / 10000.0
    }

    fn lay(&mut self, cx: &mut Cx) {
        for s in self.shells.drain(..) {
            cx.sim.despawn(s.id);
        }
        for p in self.pools.drain(..) {
            cx.sim.despawn(p.id);
        }
        for b in self.bumpers.drain(..) {
            cx.sim.despawn(b.id);
        }
        let h = self.half;
        let n = BOARD_SHELLS[self.board as usize];
        let pools = 2 + self.board;
        for k in 0..pools {
            // Evenly round the raft, turned by the seed, so no two pools overlap.
            let a = self.sr(self.board * 31) * TAU + k as f32 * TAU / pools as f32;
            let r = 0.6 + 0.25 * self.sr(k * 11 + 3);
            let p = Vec2::new(a.cos(), a.sin()) * h * r;
            let id = cx.prop("fit_pool", self.world(p, 0.02), 0.0, 1.15);
            self.pools.push(Pool { id, p, moving: self.board == 1 && k == 0 });
        }
        if self.board == 2 {
            for k in 0..4 {
                let a = k as f32 * TAU / 4.0 + 0.5;
                let p = Vec2::new(a.cos(), a.sin()) * h * 0.42;
                let id = cx.prop("fit_bumper", self.world(p, 0.02), 0.0, 0.8);
                self.bumpers.push(Bumper { id, p });
            }
        }
        for k in 0..n {
            let a = self.sr(k * 13 + 100 + self.board * 17) * TAU;
            let p = Vec2::new(a.cos(), a.sin()) * h * (0.2 + 0.5 * self.sr(k * 3 + 200));
            let id = cx.prop("fit_shell", self.world(p, 0.0), a, 1.2);
            self.shells.push(Shell { id, p, v: Vec2::ZERO, potted: false });
        }
    }

    /// Raft space (x right, y away from the camera) to the world, on the tilted deck.
    fn world(&self, p: Vec2, lift: f32) -> Vec3 {
        self.center + Vec3::new(p.x, lift - self.tide_level, -p.y)
    }

    pub fn tick(&mut self, cx: &mut Cx, i: &Intent) -> bool {
        let dt = cx.dt;
        self.t += dt;
        let r = cx.r.tide.clone();
        let tilt = cx.core.cob;
        // Static friction: a nearly flat raft holds its shells still.
        let g = if tilt.length() < 0.1 { Vec2::ZERO } else { tilt * r.gravity };
        let mut rolling = 0.0f32;
        // Board 3: the tide comes in and the raft gets smaller.
        if self.board == 2 {
            self.half = (self.half - 0.012 * dt).max(r.half * 0.7);
            self.tide_level = (self.tide_level + 0.003 * dt).min(0.05);
        }
        let h = self.half;
        for k in 0..self.pools.len() {
            if self.pools[k].moving {
                let w = self.t * 0.5;
                self.pools[k].p = Vec2::new(w.cos(), w.sin()) * h * 0.6;
                let id = self.pools[k].id;
                let at = self.world(self.pools[k].p, 0.02);
                cx.place(id, at, Quat::IDENTITY);
            }
        }
        let pools: Vec<Vec2> = self.pools.iter().map(|p| p.p).collect();
        let bumpers: Vec<Vec2> = self.bumpers.iter().map(|b| b.p).collect();
        let mut plops = 0;
        for s in self.shells.iter_mut().filter(|s| !s.potted) {
            s.v += (g - s.v * r.friction) * dt;
            s.p += s.v * dt;
            for (axis, lim) in [(0, h), (1, h)] {
                let c = if axis == 0 { &mut s.p.x } else { &mut s.p.y };
                let v = if axis == 0 { &mut s.v.x } else { &mut s.v.y };
                if c.abs() > lim - 0.2 {
                    *c = c.signum() * (lim - 0.2);
                    *v *= -0.5;
                }
            }
            for b in &bumpers {
                let d = s.p - *b;
                if d.length() < 0.5 {
                    let n = d.normalize_or(Vec2::X);
                    s.p = *b + n * 0.5;
                    s.v = (s.v - n * 2.0 * s.v.dot(n)) * 0.8 + n * 0.8;
                    plops += 100;
                }
            }
            rolling = rolling.max(s.v.length());
            // Fast shells skip over a pool.
            if s.v.length() < r.skip_speed && pools.iter().any(|p| (*p - s.p).length() < r.pool_radius) {
                s.potted = true;
                plops += 1;
            }
        }
        if plops % 100 > 0 {
            self.potted += plops % 100;
            cx.sfx(sfx::PLOP, 0.8, penta(self.potted));
            let at = self.center + Vec3::Y * 0.3;
            cx.ev.push(SimEvent::Burst { pos: at, kind: 2, count: 12 });
        }
        if plops >= 100 {
            cx.sfx(sfx::BOING, 0.5, 1.0);
        }
        self.roll_t -= dt;
        if rolling > 0.3 && self.roll_t <= 0.0 {
            self.roll_t = 0.12;
            cx.sfx(sfx::ROLL, (rolling / 3.0).min(1.0), 0.8 + rolling * 0.2);
        }
        // Draw: raft, pools and shells on the tilted plane.
        let tilt_q = Quat::from_rotation_z(-tilt.x * 0.07) * Quat::from_rotation_x(-tilt.y * 0.07);
        if let Some(raft) = self.raft {
            let at = self.center - Vec3::Y * self.tide_level;
            cx.place(raft, at, tilt_q);
        }
        let plane = |p: Vec2, c: Vec3| c + tilt_q * Vec3::new(p.x, 0.0, -p.y);
        let base = self.center - Vec3::Y * self.tide_level;
        for s in &self.shells {
            let pos = if s.potted { base + Vec3::new(s.p.x, -2.0, -s.p.y) } else { plane(s.p, base) };
            let heading = s.v.y.atan2(s.v.x);
            cx.place(s.id, pos + Vec3::Y * 0.02, tilt_q * Quat::from_rotation_y(heading));
        }
        for k in 0..self.pools.len() {
            let (id, p) = (self.pools[k].id, self.pools[k].p);
            cx.place(id, plane(p, base) + Vec3::Y * 0.015, tilt_q);
        }
        for k in 0..self.bumpers.len() {
            let (id, p) = (self.bumpers[k].id, self.bumpers[k].p);
            cx.place(id, plane(p, base), tilt_q);
        }
        cx.player(base + Vec3::Y * 0.02, 0.0);
        cx.lean_body(0.0);
        let _ = i;
        // Next board, or the end.
        if self.shells.iter().all(|s| s.potted) {
            self.board += 1;
            cx.sfx(sfx::STAR, 0.8, 1.5);
            if self.board >= 3 {
                self.time_bonus = (r.seconds - self.t).max(0.0) / r.seconds;
                return true;
            }
            self.half = r.half;
            let msg = if self.board == 1 { "One pool has wandered off. Do not take it personally." } else { "The tide is coming in. It does this. Nobody has complained." };
            cx.say(msg, 3.0);
            self.lay(cx);
        }
        self.t >= r.seconds
    }

    pub fn bot(&self, core: &BalanceCore, r: &Rules) -> Intent {
        let mut i = Intent::default();
        // Steer the nearest shell toward its nearest pool; the others come along.
        let mut best: Option<(f32, Shell, Vec2)> = None;
        for s in self.shells.iter().filter(|s| !s.potted) {
            for p in &self.pools {
                let d = (p.p - s.p).length();
                if best.as_ref().is_none_or(|b| d < b.0) {
                    best = Some((d, *s, p.p));
                }
            }
        }
        if let Some((_, s, pool)) = best {
            // Desired acceleration: to the pool, braking near it. Avoid bumpers by aiming aside.
            let mut aim = pool;
            for b in &self.bumpers {
                let d = s.p - b.p;
                if d.length() < 1.0 {
                    aim += d.normalize_or(Vec2::X) * 1.0;
                }
            }
            let to = aim - s.p;
            let want_v = to.clamp_length_max(1.8);
            let acc = (want_v - s.v) * 4.0;
            let lean = (acc + s.v * r.tide.friction) / r.tide.gravity;
            // Below the raft's static grip nothing moves, so always tilt past it.
            let lean = if lean.length() < 0.16 && to.length() > 0.2 { lean.normalize_or(Vec2::X) * 0.16 } else { lean };
            i.lean = pd(core, lean.clamp_length_max(0.8));
        }
        i
    }

    pub fn hud(&self, b: &mut B, core: &BalanceCore, r: &Rules) {
        timer(b, r.tide.seconds - self.t);
        b.puck(PUCK_TOP, PUCK_R, core.cob.into());
        b.right(1860.0, 450.0, 44.0, INK, &format!("Board {} of 3", (self.board + 1).min(3)));
        let left = self.shells.iter().filter(|s| !s.potted).count();
        b.right(1860.0, 510.0, 44.0, INK, &format!("{left} crab{} to go", if left == 1 { "" } else { "s" }));
    }

    pub fn score(&self, _r: &Rules) -> f32 {
        800.0 * self.potted as f32 / TOTAL as f32 + 200.0 * self.time_bonus
    }
}
