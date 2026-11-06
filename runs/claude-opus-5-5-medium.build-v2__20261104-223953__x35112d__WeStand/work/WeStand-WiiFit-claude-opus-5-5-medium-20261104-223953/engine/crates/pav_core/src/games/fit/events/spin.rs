//! Floatie Spin: circle the lean to keep inflatable rings up; catch new ones as guests toss them.

use super::*;
use crate::games::fit::sfx;

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct Ring {
    pub id: EntityId,
    pub height: f32,
    pub angle: f32,
    /// 0 on the hips; 1 in flight.
    pub flying: f32,
    pub side: i8,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Spin {
    pub t: f32,
    pub rings: Vec<Ring>,
    pub speed: f32,
    pub dir: f32,
    last_angle: f32,
    switch_in: f32,
    toss_in: f32,
    pub sum: f32,
    pub caught: u32,
    center: Vec3,
    in_band: bool,
    pub keys: bool,
    colors: u32,
    bot_a: f32,
}

const COLORS: [&str; 5] = ["#ff786e", "#ffd166", "#46bec8", "#78dcaa", "#ff9ec4"];

impl Spin {
    pub fn start(cx: &mut Cx, _o: Opt) -> Self {
        let c = cx.spot(BOARDWALK, "center") + Vec3::Y * 0.38 + Vec3::new(0.0, 0.0, -1.4);
        cx.player(c, 0.0);
        cx.core.wobble = 0.5;
        *cx.shot = Shot { tilt: 14.0, yaw: 0.0, distance: 8.0, fov: 36.0, height: 0.9, focus: c };
        cx.ev.push(SimEvent::Music { song: 4 });
        cx.clip("FIT/HipCircle", 1.0);
        let mut s = Self { t: 0.0, rings: Vec::new(), speed: 0.0, dir: 1.0, last_angle: 0.0, switch_in: cx.r.spin.switch_every, toss_in: 2.0, sum: 0.0, caught: 0, center: c, in_band: false, keys: false, colors: 0, bot_a: 0.0 };
        for _ in 0..2 {
            s.add(cx, 0.0, 0);
        }
        s
    }

    fn add(&mut self, cx: &mut Cx, flying: f32, side: i8) {
        let color = COLORS[self.colors as usize % COLORS.len()];
        self.colors += 1;
        let at = self.center + Vec3::Y * 0.9;
        let id = cx.prop_color("fit_ring", at, 0.0, 0.9, color);
        self.rings.push(Ring { id, height: 0.95, angle: self.rings.len() as f32, flying, side });
    }

    fn band(&self, r: &Rules) -> (f32, f32) {
        let k = if self.keys { r.spin.band_scale_keys } else { 1.0 };
        (r.spin.band_low * k, r.spin.band_high * k)
    }

    pub fn tick(&mut self, cx: &mut Cx, i: &Intent) -> bool {
        let dt = cx.dt;
        self.t += dt;
        self.keys = i.keys;
        let s = cx.r.spin.clone();
        // Spin speed: the smoothed angular velocity of the lean, while it is leaned far enough.
        let mut w = 0.0;
        if i.lean.length() > 0.4 {
            let a = i.lean.y.atan2(i.lean.x);
            w = wrap_pi(a - self.last_angle) / dt;
            self.last_angle = a;
        }
        self.speed += (w - self.speed) * (1.0 - (-6.0 * dt).exp());
        self.switch_in -= dt;
        if self.switch_in <= 0.0 {
            self.switch_in = s.switch_every;
            self.dir = -self.dir;
            cx.say("Switch!", 2.0);
            cx.sfx(sfx::BELL, 0.7, 1.4);
        }
        let (lo, hi) = self.band(cx.r);
        let v = self.speed * self.dir;
        self.in_band = v >= lo && v <= hi;
        // Guests toss rings from a side; press that side's step as it arrives.
        self.toss_in -= dt;
        if self.toss_in <= 0.0 && self.rings.len() < 7 {
            self.toss_in = s.toss_every;
            let side = if cx.rng().f32() < 0.5 { -1 } else { 1 };
            self.add(cx, 1.0, side);
            cx.sfx(sfx::WHOOSH, 0.6, 1.0);
        }
        let flight = 1.1;
        let mut lost = Vec::new();
        let mut caught_now = 0;
        for (k, r) in self.rings.iter_mut().enumerate() {
            if r.flying > 0.0 {
                let left = r.flying * flight;
                let pressed = if r.side < 0 { i.l_p } else { i.r_p };
                if pressed && left <= s.catch_window {
                    r.flying = 0.0;
                    r.height = 0.95;
                    r.side = 0;
                    caught_now += 1;
                    continue;
                }
                r.flying -= dt / flight;
                if r.flying <= -s.catch_window / flight {
                    lost.push(k);
                }
                continue;
            }
            let rate = if self.in_band { s.rise } else { -s.sink };
            r.height = (r.height + rate * dt).clamp(0.0, 1.0);
            if r.height <= 0.0 {
                lost.push(k);
            }
            r.angle += self.speed * dt;
        }
        for _ in 0..caught_now {
            self.caught += 1;
            cx.sfx(sfx::POP, 0.7, 1.2);
        }
        for k in lost.into_iter().rev() {
            let r = self.rings.remove(k);
            cx.sim.despawn(r.id);
            cx.sfx(sfx::SQUEAK, 0.6, 0.7);
        }
        if self.in_band {
            let on = self.rings.iter().filter(|r| r.flying <= 0.0).count() as f32;
            self.sum += on * dt;
        }
        // Draw.
        let n = self.rings.len().max(1) as f32;
        let phase = self.t * self.speed.clamp(-12.0, 12.0);
        for (k, r) in self.rings.iter().enumerate() {
            let pos = if r.flying > 0.0 {
                let u = r.flying.clamp(0.0, 1.0);
                self.center + Vec3::new(r.side as f32 * 9.0 * u, 0.9 + 3.0 * (u * PI).sin(), 0.0)
            } else {
                let wob = 0.12 + 0.05 * (k as f32 / n);
                let a = phase + k as f32 * 1.7;
                self.center + Vec3::new(a.cos() * wob, 0.05 + r.height * 0.85 + k as f32 * 0.06, a.sin() * wob)
            };
            let tilt = Quat::from_rotation_x(0.2 * (phase + k as f32).sin()) * Quat::from_rotation_z(0.2 * (phase + k as f32).cos());
            cx.place(r.id, pos, tilt);
        }
        cx.lean_body(0.0);
        self.t >= s.seconds
    }

    pub fn bot(&self, _core: &BalanceCore, r: &Rules) -> Intent {
        let mut i = Intent::default();
        // A steady circle at 7.5 rad/s the way the call asks.
        let a = self.t * 7.5 * self.dir;
        i.lean = Vec2::new(a.cos(), a.sin()) * 0.8;
        for ring in &self.rings {
            if ring.flying > 0.0 && ring.flying * 1.1 <= r.spin.catch_window * 0.6 {
                if ring.side < 0 {
                    i.l_p = true;
                    i.l = true;
                } else {
                    i.r_p = true;
                    i.r = true;
                }
            }
        }
        i
    }

    pub fn hud(&self, b: &mut B, core: &BalanceCore, r: &Rules) {
        timer(b, r.spin.seconds - self.t);
        b.puck(PUCK_TOP, PUCK_R, core.cob.into());
        b.puck_stars(self.rings.len().min(7) as u8);
        let (lo, hi) = self.band(r);
        // The speed gauge: a bar with the sweet band marked.
        let v = (self.speed * self.dir) / (hi * 1.4);
        b.flat([560.0, 980.0, 1360.0, 1030.0], PALE, 24.0);
        let (bl, bh) = (560.0 + 800.0 * lo / (hi * 1.4), 560.0 + 800.0 * hi / (hi * 1.4));
        b.flat([bl, 980.0, bh, 1030.0], MINT, 24.0);
        b.circle([560.0 + 800.0 * v.clamp(0.0, 1.0), 1005.0], 36.0, if self.in_band { CORAL } else { INK }, WHITE, 5.0);
        let arrow = if self.dir > 0.0 { "Circle this way: anticlockwise" } else { "Circle this way: clockwise" };
        b.flat([560.0, 890.0, 1360.0, 960.0], [255, 255, 255, 215], 30.0);
        b.center(960.0, 898.0, 42.0, INK, arrow);
        for ring in &self.rings {
            if ring.flying > 0.0 && ring.flying * 1.1 <= 0.6 {
                let g = if ring.side < 0 { Glyph::StepL } else { Glyph::StepR };
                b.prompt_center(if ring.side < 0 { 420.0 } else { 1500.0 }, 500.0, &[g], "Catch");
            }
        }
    }

    pub fn score(&self, r: &Rules) -> f32 {
        1000.0 * self.sum / (r.spin.seconds * 5.2)
    }
}
