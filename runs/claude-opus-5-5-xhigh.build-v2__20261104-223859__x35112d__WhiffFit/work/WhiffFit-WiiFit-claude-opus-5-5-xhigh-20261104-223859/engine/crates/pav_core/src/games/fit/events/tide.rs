//! Tide Table: your lean tilts a floating raft; roll hermit crabs into tide pools.
//! The shell physics is simple 2D code, not rapier: tunable and friendly to the bot.

use glam::{Quat, Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::*;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Shell {
    pub p: Vec2,
    pub v: Vec2,
    pub id: Option<EntityId>,
    pub potted: bool,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Pool {
    pub p: Vec2,
    pub r: f32,
    pub id: Option<EntityId>,
    /// Moving pools drift on this axis.
    pub moves: Vec2,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct TideTable {
    pub board: usize,
    pub shells: Vec<Shell>,
    pub pools: Vec<Pool>,
    pub bumpers: Vec<(Vec2, EntityId)>,
    pub potted: u32,
    pub total: u32,
    pub t_left: f32,
    pub raft: Option<EntityId>,
    pub center: Vec3,
    pub edge: f32,
    pub roll: f32,
    pub skip_flash: f32,
    pub done: bool,
    pub gull: Option<EntityId>,
    pub end_wait: f32,
}

fn to_world(center: Vec3, rot: Quat, p: Vec2, h: f32) -> Vec3 {
    center + rot * Vec3::new(p.x, h, -p.y)
}

impl TideTable {
    pub fn new() -> Self {
        Self::default()
    }

    fn clear_board(&mut self, cx: &mut Cx) {
        for s in self.shells.drain(..) {
            if let Some(id) = s.id {
                cx.sim.despawn(id);
            }
        }
        for p in self.pools.drain(..) {
            if let Some(id) = p.id {
                cx.sim.despawn(id);
            }
        }
        for (_, id) in self.bumpers.drain(..) {
            cx.sim.despawn(id);
        }
    }

    fn deal(&mut self, cx: &mut Cx) {
        self.clear_board(cx);
        let r = &cx.rules.tide;
        let b = self.board;
        let n = [3usize, 5, 7][b.min(2)];
        self.edge = r.half;
        let h = r.half;
        let pools: &[(f32, f32)] = match b {
            0 => &[(-0.55, 0.55), (0.6, -0.5)],
            1 => &[(0.6, 0.55), (-0.6, -0.55)],
            _ => &[(-0.65, 0.6), (0.65, 0.6), (0.0, -0.65)],
        };
        for (i, (x, y)) in pools.iter().enumerate() {
            let p = Vec2::new(*x, *y) * h;
            let id = spawn_prop(cx.sim, "LIB/core/tide_pool", self.center, 0.0, r.pool_r / 0.6);
            let moves = if b == 1 && i == 0 { Vec2::new(0.0, -0.55 * h) } else { Vec2::ZERO };
            self.pools.push(Pool { p, r: r.pool_r, id: Some(id), moves });
        }
        if b >= 2 {
            for (x, y) in [(0.0, 0.3), (-0.45, -0.1), (0.45, -0.1)] {
                let p = Vec2::new(x, y) * h;
                let id = spawn_prop(cx.sim, "LIB/core/bumper", self.center, 0.0, 1.0);
                self.bumpers.push((p, id));
            }
        }
        for _ in 0..n {
            let rng = &mut cx.sim.state.rng;
            let mut p = Vec2::new(rng.range(-0.8, 0.8), rng.range(-0.8, 0.8)) * h;
            if p.length() < 1.0 {
                p = p.normalize_or(Vec2::X) * 1.4;
            }
            let colors = ["#ffb88a", "#ffd166", "#ff9db0", "#c4b1e8", "#a8e0d0"];
            let col = colors[rng.below(5) as usize];
            let id = spawn_prop_roles(cx.sim, "LIB/core/shell", self.center, 0.0, 1.0, &[("$accent", col)]);
            self.shells.push(Shell { p, v: Vec2::ZERO, id: Some(id), potted: false });
        }
        self.total += n as u32;
    }

    pub fn start(&mut self, c: &mut RunCommon, cx: &mut Cx) {
        self.center = cx.stage(Set::Tide) + Vec3::Y * 0.2;
        let at = self.center;
        ready_player(cx, Set::Tide, at + Vec3::Y * 0.12, 0.0);
        cam_full(cx.sim, 62.0, 0.0, 15.0, 40.0, 0.3, 0.2, None);
        self.t_left = cx.rules.tide.length;
        self.raft = Some(spawn_prop(cx.sim, "LIB/core/tide_raft", at, 0.0, cx.rules.tide.half / 4.0));
        self.total = 0;
        self.deal(cx);
        self.gull = npc(cx.sim, "gull_tide");
        c.say_key(Who::Gull, "gull.tide_start", 0);
    }

    pub fn tick(&mut self, c: &mut RunCommon, cx: &mut Cx, it: &Intent) -> Option<f32> {
        let r = &cx.rules.tide;
        let dt = cx.dt;
        self.t_left -= dt;
        self.skip_flash = (self.skip_flash - dt).max(0.0);
        c.step(cx, it.lean, r.wobble, Vec2::ZERO, Vec2::ZERO);
        if c.core.tipped {
            c.tip_fx(cx, true);
            c.core.settle();
        }
        let tilt = c.core.cob;
        let rot = Quat::from_rotation_z(-tilt.x * r.tilt_deg.to_radians()) * Quat::from_rotation_x(-tilt.y * r.tilt_deg.to_radians());
        if let Some(id) = self.raft {
            pose(cx.sim, id, self.center, rot);
        }
        if self.board >= 2 {
            self.edge = (self.edge - dt * r.tide_rise).max(r.half * 0.55);
        }
        let edge = self.edge;
        let tt = c.t;
        for pool in &mut self.pools {
            let p = pool.p + pool.moves * (tt * 0.9).sin();
            if let Some(id) = pool.id {
                pose(cx.sim, id, to_world(self.center, rot, p, 0.2), rot);
            }
        }
        let pools: Vec<(Vec2, f32)> = self.pools.iter().map(|p| (p.p + p.moves * (tt * 0.9).sin(), p.r)).collect();
        let bumpers: Vec<Vec2> = self.bumpers.iter().map(|b| b.0).collect();
        for (p, id) in &self.bumpers {
            pose(cx.sim, *id, to_world(self.center, rot, *p, 0.2), rot);
        }
        let mut roll_speed = 0.0f32;
        let mut plops = Vec::new();
        for (i, s) in self.shells.iter_mut().enumerate() {
            if s.potted {
                continue;
            }
            let a = tilt * r.gravity - s.v * r.friction;
            s.v += a * dt;
            s.p += s.v * dt;
            // Walls.
            if s.p.x.abs() > edge {
                s.p.x = s.p.x.clamp(-edge, edge);
                s.v.x *= -r.wall_bounce;
            }
            if s.p.y.abs() > edge {
                s.p.y = s.p.y.clamp(-edge, edge);
                s.v.y *= -r.wall_bounce;
            }
            for b in &bumpers {
                let d = s.p - *b;
                if d.length() < r.bumper_r {
                    let n = d.normalize_or(Vec2::Y);
                    s.p = *b + n * r.bumper_r;
                    s.v = (s.v - n * s.v.dot(n) * 1.8) * 1.05;
                }
            }
            roll_speed = roll_speed.max(s.v.length());
            for (pp, pr) in &pools {
                if (s.p - *pp).length() < *pr {
                    if s.v.length() < r.skip_speed {
                        s.potted = true;
                        plops.push(i);
                    } else {
                        self.skip_flash = 0.5;
                    }
                }
            }
            if let Some(id) = s.id {
                let spin = Quat::from_rotation_y(s.v.x.atan2(s.v.y));
                pose(cx.sim, id, to_world(self.center, rot, s.p, 0.3), rot * spin);
            }
        }
        for i in plops {
            if let Some(id) = self.shells[i].id.take() {
                let at = pos_of(cx.sim, id);
                cx.sim.despawn(id);
                cx.ev.push(crate::frame::SimEvent::BigSplash { pos: at, size: 0.12 });
            }
            self.potted += 1;
            cx.sfx(sound::SHELL_PLOP, 0.9, 1.0 + self.potted as f32 * 0.03);
        }
        self.roll += dt * roll_speed;
        if self.roll > 0.6 {
            self.roll = 0.0;
            cx.sfx(sound::SHELL_ROLL, (roll_speed / 6.0).min(0.6), 1.0);
        }
        lean_figure(cx.sim, cx.pid, tilt, 0.0, r.tilt_deg + 8.0, cx.slump);
        place_on_raft(cx, self.center, rot);
        c.score = (self.potted as f32 * r.per_shell).min(r.shell_cap) + clamp01(self.t_left / r.length) * r.time_worth * if self.all_potted() { 1.0 } else { 0.0 };
        // A board cleared: the next one.
        if self.shells.iter().all(|s| s.potted) && !self.done {
            if self.board >= 2 {
                self.done = true;
                self.end_wait = 1.0;
            } else {
                self.board += 1;
                self.deal(cx);
                cx.sfx(sound::FANFARE, 0.5, 1.2);
                c.say_key(Who::Gull, "gull.tide_board", self.board);
            }
        }
        if self.done {
            self.end_wait -= dt;
            return (self.end_wait <= 0.0).then(|| clamp01(c.score / 1000.0) * 1000.0);
        }
        (self.t_left <= 0.0).then(|| clamp01(c.score / 1000.0) * 1000.0)
    }

    fn all_potted(&self) -> bool {
        self.board >= 2 && self.shells.iter().all(|s| s.potted)
    }

    pub fn stop(&mut self, cx: &mut Cx) {
        self.clear_board(cx);
        if let Some(id) = self.raft.take() {
            cx.sim.despawn(id);
        }
    }

    pub fn hud(&self, c: &RunCommon, _r: &Rules, ui: &mut Ui) {
        c.top_bar(ui, "Tide Table", Some(self.t_left));
        let mut p = c.puck(false);
        p.c = [1700.0, 830.0];
        p.r = 150.0;
        ui.puck(p);
        ui.panel(40.0, 170.0, 340.0, 120.0, with_alpha(WHITE, 0.9), 30.0);
        ui.text(60.0, 180.0, 34.0, INK_SOFT, Align::Left, format!("Board {} of 3", self.board + 1));
        ui.label(60.0, 222.0, 44.0, INK, Align::Left, crate::games::fit::script::singulars(&format!("{} shells in", self.potted)));
        if self.skip_flash > 0.0 {
            ui.label(960.0, 200.0, 64.0, CORAL, Align::Center, "Too fast. It skipped.");
        }
        ui.prompt_row(&[(Act::Lean, "Tilt the raft")]);
    }

    pub fn bot(&self, c: &RunCommon, r: &Rules) -> Intent {
        // Steer the shell nearest a pool toward that pool.
        let t = r.tide.gravity;
        let pools: Vec<Vec2> = self.pools.iter().map(|p| p.p + p.moves * (c.t * 0.9).sin()).collect();
        let mut best: Option<(f32, Vec2, Vec2, Vec2)> = None;
        for s in self.shells.iter().filter(|s| !s.potted) {
            for pp in &pools {
                let d = (*pp - s.p).length();
                if best.is_none_or(|b| d < b.0) {
                    best = Some((d, s.p, s.v, *pp));
                }
            }
        }
        let Some((_, p, v, goal)) = best else { return Intent::default() };
        // Slow down near the pool: it skips when fast.
        let want_v = ((goal - p) * 1.05).clamp_length_max(r.tide.skip_speed * 0.8);
        let acc = (want_v - v) * 2.4 + v * r.tide.friction;
        let lean = (acc / t).clamp_length_max(0.95);
        Intent { lean, ..Default::default() }
    }
}

/// The figure rides the raft's middle.
fn place_on_raft(cx: &mut Cx, center: Vec3, rot: Quat) {
    let up = rot * Vec3::Y;
    let feet = center + up * 0.14;
    let facing = cx.sim.state.entities.get(cx.pid).and_then(|e| e.character.as_ref()).map(|c| c.facing).unwrap_or(0.0);
    place(cx.sim, cx.pid, feet, facing);
}
