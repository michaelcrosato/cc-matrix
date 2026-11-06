//! Tray Trek: walk a long pier carrying five smoothies. Waves, gaps and gulls jolt the tray; your
//! dot tilts it; glasses slide with the tilt and plop into the sea.

use super::*;
use crate::games::fit::sfx;

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct Glass {
    pub id: EntityId,
    pub p: Vec2,
    pub v: Vec2,
    pub fall: f32,
    pub gone: bool,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct Jolt {
    pub at: f32,
    pub dir: Vec2,
    pub kind: u8,
    pub done: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Tray {
    pub t: f32,
    pub pos: Vec3,
    pub start: Vec3,
    pub end: Vec3,
    pub glasses: Vec<Glass>,
    pub jolts: Vec<Jolt>,
    tray: Option<EntityId>,
    gull: Option<EntityId>,
    gull_t: f32,
    pub arrived: bool,
    pub lost: u32,
    pub sway: Vec2,
    tilt: Vec2,
    over: f32,
    told: bool,
}

const COLORS: [&str; 5] = ["#ff9ec4", "#ffd166", "#78dcaa", "#ff786e", "#c7b1ec"];
const CAM: f32 = 180.0;

impl Tray {
    pub fn start(cx: &mut Cx, _o: Opt) -> Self {
        let start = cx.spot(PIER, "start");
        let end = cx.spot(PIER, "end");
        cx.player(start, 0.0);
        cx.core.wobble = 0.7;
        cx.clip("FIT/CarryTray", 1.0);
        *cx.shot = Shot { tilt: 24.0, yaw: CAM, distance: 7.0, fov: 40.0, height: 1.1, focus: start };
        let tray = cx.prop("fit_tray", start + Vec3::Y * 1.25, 0.0, 1.0);
        let mut glasses = Vec::new();
        for k in 0..5 {
            let a = k as f32 * TAU / 5.0;
            let p = if k == 4 { Vec2::ZERO } else { Vec2::new(a.cos(), a.sin()) * 0.2 };
            let id = cx.prop_color("fit_smoothie", start + Vec3::Y * 1.3, 0.0, 0.9, COLORS[k]);
            glasses.push(Glass { id, p, v: Vec2::ZERO, fall: 0.0, gone: false });
        }
        // The jolts are known in advance: a plank gap, a wave, a gull. The bot leans ahead of them.
        let walk = (end.z - start.z) / cx.r.tray.pace;
        let n = 12;
        let mut jolts = Vec::new();
        for k in 0..n {
            let at = 3.0 + (walk - 6.0) * k as f32 / n as f32 + cx.rng().range(-0.5, 0.5);
            let a = cx.rng().range(0.0, TAU);
            jolts.push(Jolt { at, dir: Vec2::new(a.cos(), a.sin()), kind: (k % 3) as u8, done: false });
        }
        let gull = cx.prop("fit_gull", start + Vec3::new(0.0, 8.0, 0.0), 0.0, 1.0);
        Self { t: 0.0, pos: start, start, end, glasses, jolts, tray: Some(tray), gull: Some(gull), gull_t: 0.0, arrived: false, lost: 0, sway: Vec2::ZERO, tilt: Vec2::ZERO, over: 0.0, told: false }
    }

    fn sway_at(t: f32) -> Vec2 {
        Vec2::new((t * 0.9).sin() + 0.4 * (t * 2.3).sin(), 0.5 * (t * 1.3 + 1.0).sin())
    }

    pub fn tick(&mut self, cx: &mut Cx, _i: &Intent) -> bool {
        let dt = cx.dt;
        self.t += dt;
        let r = cx.r.tray.clone();
        if self.arrived {
            self.over += dt;
            cx.player(self.pos, 0.0);
            return self.over > 1.5;
        }
        self.pos.z += r.pace * dt;
        cx.player(self.pos, 0.0);
        cx.clip("FIT/CarryTray", 1.0);
        // The pier rolls under you: the tray leans with it unless you counter.
        self.sway = Self::sway_at(self.t) * r.sway;
        self.tilt = cx.core.cob + self.sway;
        for j in self.jolts.iter_mut() {
            if !j.done && self.t >= j.at {
                j.done = true;
                cx.core.nudge += j.dir * r.jolt * 5.0;
                let kick = j.dir * 0.2 * (r.jolt / 26.0);
                for g in self.glasses.iter_mut().filter(|g| !g.gone) {
                    g.v += kick;
                }
                match j.kind {
                    0 => {
                        cx.sfx(sfx::CREAK, 0.8, 1.0);
                        cx.say("A plank gap. Who put that there. Pip knows.", 1.6);
                    }
                    1 => {
                        cx.sfx(sfx::WAVE, 0.7, 1.2);
                        cx.ev.push(SimEvent::Splash { pos: self.pos + Vec3::X * 2.2 });
                    }
                    _ => {
                        self.gull_t = 1.6;
                        cx.sfx(sfx::GULL, 0.9, 1.0);
                    }
                }
            }
        }
        if self.gull_t > 0.0 {
            self.gull_t -= dt;
            let u = self.gull_t / 1.6;
            if let Some(g) = self.gull {
                let at = self.pos + Vec3::new((u - 0.5) * 12.0, 1.8 + 3.0 * (u - 0.5).abs() * 2.0, 0.5);
                cx.place(g, at, Quat::from_rotation_y(1.57));
            }
        }
        let tray_at = self.pos + Vec3::Y * 1.25 + Vec3::new(0.0, 0.0, 0.34);
        let q = Quat::from_rotation_z(self.tilt.x * 0.22) * Quat::from_rotation_x(-self.tilt.y * 0.22);
        if let Some(t) = self.tray {
            cx.place(t, tray_at, q);
        }
        let mut plops = 0;
        for g in self.glasses.iter_mut() {
            if g.gone {
                continue;
            }
            if g.fall > 0.0 {
                g.fall += dt;
                let at = tray_at + Vec3::new(-g.p.x, 0.0, g.p.y) - Vec3::Y * 4.9 * g.fall * g.fall;
                if at.y < 0.0 {
                    g.gone = true;
                    plops += 1;
                }
                if let Some(e) = cx.sim.state.entities.get_mut(g.id) {
                    e.pos = at;
                }
                continue;
            }
            g.v += (self.tilt * r.slide - g.v * r.friction) * dt;
            g.p += g.v * dt;
            if g.p.length() > r.edge {
                g.fall = 0.001;
            }
            let at = tray_at + q * Vec3::new(-g.p.x, 0.03, g.p.y);
            if let Some(e) = cx.sim.state.entities.get_mut(g.id) {
                e.pos = at;
                e.rot = q;
            }
        }
        if plops > 0 {
            self.lost += plops;
            cx.sfx(sfx::GLASS, 0.9, 1.0);
            cx.sfx(sfx::SPLASH_S, 0.7, 1.2);
            cx.ev.push(SimEvent::Splash { pos: self.pos + Vec3::new(2.2, 0.0, 0.0) });
            if !self.told {
                self.told = true;
                let line = cx.pick("gull_glass");
                cx.say(line, 3.0);
            }
        }
        *cx.shot = Shot { tilt: 24.0, yaw: CAM, distance: 7.0, fov: 40.0, height: 1.1, focus: self.pos };
        cx.lean_body(CAM);
        if self.pos.z >= self.end.z {
            self.arrived = true;
            let line = match self.delivered() {
                5 => cx.pick("marjorie_all"),
                0 => cx.pick("marjorie_none"),
                _ => cx.pick("marjorie_some"),
            };
            cx.say(line, 3.0);
            cx.gesture("FIT/Bow");
            cx.sfx(sfx::CHEER, 0.6, 1.0);
        }
        false
    }

    pub fn delivered(&self) -> u32 {
        self.glasses.iter().filter(|g| !g.gone && g.fall <= 0.0).count() as u32
    }

    pub fn bot(&self, core: &BalanceCore, r: &Rules) -> Intent {
        let mut i = Intent::default();
        // Counter the pier's roll, and lean back against the next known jolt as it lands. The
        // tray is level again when `cob + sway` is zero, so aim the dot at minus the sway.
        let sway = Self::sway_at(self.t + 0.1) * r.tray.sway;
        let mut want = -sway;
        // Pull the worst glass back toward the middle.
        if let Some(g) = self.glasses.iter().filter(|g| !g.gone && g.fall <= 0.0).max_by(|a, b| a.p.length().total_cmp(&b.p.length())) {
            want += -g.p * 1.1 - g.v * 0.5;
        }
        i.lean = pd(core, want);
        i
    }

    pub fn hud(&self, b: &mut B, core: &BalanceCore, r: &Rules) {
        // The tray from above: the player's view of what is about to happen.
        let c = [260.0, 260.0];
        let s = 180.0 / r.tray.edge;
        b.puck(PUCK_TOP, PUCK_R, (core.cob + self.sway).clamp_length_max(1.0).into());
        b.puck_ring((-self.sway).clamp_length_max(1.0).into(), 0.3);
        b.circle(c, r.tray.edge * s, DECK, TEAL, 10.0);
        for (k, g) in self.glasses.iter().enumerate() {
            if !g.gone && g.fall <= 0.0 {
                let col = [CORAL, SUN, MINT, TEAL, INK][k % 5];
                b.circle([c[0] + g.p.x * s, c[1] - g.p.y * s], 26.0, col, WHITE, 4.0);
            }
        }
        b.bar([560.0, 40.0, 1360.0, 70.0], ((self.pos.z - self.start.z) / (self.end.z - self.start.z)).clamp(0.0, 1.0), TEAL, None);
    }

    pub fn score(&self, r: &Rules) -> f32 {
        let d = self.delivered();
        // 200 per glass, plus a no-spill bonus; the event's 1000 cap holds the total.
        200.0 * d as f32 + if d == 5 && self.arrived { r.tray.no_spill_bonus } else { 0.0 }
    }
}
