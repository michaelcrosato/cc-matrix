//! Pose Parade: hold a deadpan pose while a ring drifts; stay in it to climb a multiplier.

use super::*;
use crate::games::fit::sfx;

pub const POSES: [(&str, &str); 6] = [
    ("FIT/Tree", "the Patient Heron"),
    ("FIT/Warrior", "the Apologetic Lunge"),
    ("FIT/Lighthouse", "the Tired Lighthouse"),
    ("FIT/DeckChair", "the Folded Deck Chair"),
    ("FIT/Bridge", "the Reluctant Bridge"),
    ("FIT/Seated", "Seated Disappointment"),
];

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Pose {
    pub t: f32,
    pub count: u32,
    pub first: u32,
    pub sum: f32,
    pub mult: u32,
    streak: f32,
    broken: f32,
    gull: Option<EntityId>,
    gull_t: f32,
    posey: Option<EntityId>,
    seconds: f32,
    announced: u32,
    pub ring: Vec2,
    pub radius: f32,
    center: Vec3,
    pub gusts: bool,
    gust_a: f32,
}

impl Pose {
    pub fn start(cx: &mut Cx, o: Opt) -> Self {
        let center = o.at.unwrap_or(cx.spot(STUDIO, "center"));
        cx.player(center, 0.0);
        cx.core.wobble = 1.0;
        cx.mirror_shot(center, 8.5);
        let posey = cx.sim.state.entities.iter().find(|e| e.name == "posey" && (e.pos - center).length() < 12.0).map(|e| e.id);
        let count = o.count.unwrap_or(3);
        // Day 1 uses the first three poses; later days turn the parade on.
        let first = (cx.day.max(1) as u32 - 1) * 3 % 6;
        Self {
            t: 0.0,
            count,
            first,
            sum: 0.0,
            mult: 1,
            streak: 0.0,
            broken: 0.0,
            gull: None,
            gull_t: 0.0,
            posey,
            seconds: o.seconds.unwrap_or(cx.r.pose.seconds),
            announced: 99,
            ring: Vec2::ZERO,
            radius: cx.r.pose.ring_start,
            center,
            gusts: o.band,
            gust_a: 0.0,
        }
    }

    fn index(&self) -> u32 {
        ((self.t / self.seconds) as u32).min(self.count - 1)
    }

    fn pose(&self) -> usize {
        ((self.first + self.index()) % 6) as usize
    }

    pub fn tick(&mut self, cx: &mut Cx, _i: &Intent) -> bool {
        let dt = cx.dt;
        self.t += dt;
        let n = self.index();
        let local = self.t - n as f32 * self.seconds;
        let u = clamp01(local / self.seconds);
        let r = &cx.r.pose;
        self.radius = r.ring_start + (r.ring_end - r.ring_start) * u;
        let w = TAU * r.drift_hz * self.t;
        self.ring = Vec2::new(w.sin(), (w * 1.37 + 0.7).sin()) * r.drift;
        let gull_w = r.gull_wobble;
        if n != self.announced {
            self.announced = n;
            let (clip, name) = POSES[self.pose()];
            cx.sfx(sfx::WOOD, 0.8, 1.0);
            cx.say(format!("This is {name}."), 3.0);
            cx.clip(clip, 1.0);
            if let Some(p) = self.posey {
                let id = crate::clips::find_cached(clip);
                if let Some(ch) = cx.sim.state.entities.get_mut(p).and_then(|e| e.character.as_mut()) {
                    ch.anim.play_clip(id, 0, 1.0);
                }
            }
        }
        // The gull: at 12 s of the second pose, for five seconds.
        if n == 1.min(self.count - 1) && local >= 12.0 && self.gull_t == 0.0 {
            self.gull_t = 5.0;
            let at = self.center + Vec3::Y * 2.05;
            self.gull = Some(cx.prop("fit_gull", at + Vec3::Y * 2.0, 0.0, 0.7));
            cx.sfx(sfx::GULL, 0.8, 1.0);
            cx.say("There is a bird on you. Accept the bird.", 4.0);
        }
        if self.gull_t > 0.0 {
            self.gull_t -= dt;
            cx.core.wobble = gull_w;
            if let Some(g) = self.gull {
                let head = self.center + Vec3::Y * 1.92 + Vec3::new(cx.core.cob.x * 0.4, 0.0, -cx.core.cob.y * 0.4);
                let drop = (self.gull_t - 4.5).max(0.0) * 4.0;
                cx.place(g, head + Vec3::Y * drop, Quat::IDENTITY);
                if self.gull_t <= 0.0 {
                    cx.place(g, self.center + Vec3::new(-30.0, 8.0, -30.0), Quat::IDENTITY);
                    self.gull = None;
                    self.gull_t = -1.0;
                }
            }
        } else {
            cx.core.wobble = 1.0;
        }
        if self.gusts {
            self.gust_a += dt * 0.7;
            let w = (self.t * 0.8).sin().max(0.0) * cx.r.finale.gust;
            cx.core.gust = Vec2::new(self.gust_a.cos(), self.gust_a.sin()) * w;
        }
        // In the ring the streak climbs one step per 2 s; leaving resets it. A tip breaks the pose.
        if self.broken > 0.0 {
            self.broken -= dt;
            self.mult = 1;
            self.streak = 0.0;
        } else if (cx.core.cob - self.ring).length() < self.radius {
            self.streak += dt;
            let m = 1 + (self.streak / 2.0) as u32;
            if m.min(4) > self.mult {
                cx.sfx(sfx::STAR, 0.5, penta(m));
            }
            self.mult = m.min(4);
            self.sum += self.mult as f32 * dt;
        } else {
            self.streak = 0.0;
            self.mult = 1;
        }
        cx.lean_body(0.0);
        self.t >= self.seconds * self.count as f32
    }

    /// A tip breaks the pose for a moment.
    pub fn on_tip(&mut self) {
        self.broken = 1.5;
    }

    pub fn bot(&self, core: &BalanceCore, _r: &Rules) -> Intent {
        Intent { lean: pd(core, self.ring), ..Default::default() }
    }

    pub fn hud(&self, b: &mut B, core: &BalanceCore, _r: &Rules) {
        timer(b, self.seconds * self.count as f32 - self.t);
        b.puck(PUCK_TOP, PUCK_R, core.cob.into());
        b.puck_ring(self.ring.into(), self.radius);
        b.puck_stars((self.mult.saturating_sub(1)) as u8);
        b.title(1700.0, 410.0, 72.0, if self.mult >= 4 { CORAL } else { TEAL }, &format!("x{}", self.mult));
        let (_, name) = POSES[self.pose()];
        let shown = name.strip_prefix("the ").map(|n| format!("The {n}")).unwrap_or_else(|| name.to_string());
        b.center(960.0, 60.0, 50.0, INK, &shown);
    }

    pub fn score(&self, r: &Rules) -> f32 {
        let total = (self.seconds * self.count as f32).max(1.0);
        1000.0 * self.sum / (total * r.pose.full_score)
    }
}
