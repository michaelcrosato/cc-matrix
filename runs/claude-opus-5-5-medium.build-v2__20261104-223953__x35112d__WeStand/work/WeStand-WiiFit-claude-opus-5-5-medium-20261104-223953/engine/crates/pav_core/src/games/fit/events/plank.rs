//! Plank Standoff: hold Brace and keep the dot in a shrinking ring for as long as you can.

use super::*;
use crate::games::fit::sfx;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Plank {
    pub t: f32,
    pub out: f32,
    pub radius: f32,
    pub flop: f32,
    told: u8,
    pub seconds: f32,
    /// Waves shove the figure (the finale).
    pub waves: bool,
    wave_in: f32,
    /// A tip does not end the finale's brace.
    pub forgiving: bool,
    pub survived: f32,
    grace: f32,
}

impl Plank {
    pub fn start(cx: &mut Cx, o: Opt) -> Self {
        let c = o.at.unwrap_or(cx.spot(GAZEBO, "center"));
        cx.player(c, 0.0);
        cx.core.wobble = 1.0;
        *cx.shot = Shot { tilt: 16.0, yaw: -68.0, distance: 8.0, fov: 36.0, height: 0.5, focus: c };
        if o.at.is_some() {
            cx.mirror_shot(c, 9.0);
        }
        cx.scrub("FIT/Plank", 0.0);
        Self { t: 0.0, out: 0.0, radius: cx.r.plank.ring_start, flop: 0.0, told: 0, seconds: o.seconds.unwrap_or(cx.r.plank.seconds), waves: o.band, wave_in: 2.0, forgiving: o.band, survived: 0.0, grace: 1.0 }
    }

    pub fn tick(&mut self, cx: &mut Cx, i: &Intent) -> bool {
        let dt = cx.dt;
        if self.flop > 0.0 {
            self.flop -= dt;
            return self.flop <= 0.0;
        }
        self.t += dt;
        self.grace -= dt;
        let p = &cx.r.plank;
        let u = clamp01(self.t / self.seconds);
        self.radius = p.ring_start + (p.ring_end - p.ring_start) * u;
        cx.core.wobble = 1.0 + p.fatigue * u + if self.t > 30.0 { 0.35 } else { 0.0 };
        // At 45 s Kettle laughs at his own joke and the nudge shakes the screen.
        if self.t > 45.0 && self.told < 2 {
            self.told = 2;
            cx.core.nudge += Vec2::new(14.0, 0.0);
            cx.say("A plank walks into a bar. I am so sorry. Hold on.", 4.0);
            cx.sfx(sfx::GONG, 0.5, 0.7);
        } else if self.t > 30.0 && self.told < 1 {
            self.told = 1;
            cx.say("You are trembling. That is the strength leaving. It is fine.", 4.0);
        }
        if self.waves {
            self.wave_in -= dt;
            if self.wave_in <= 0.0 {
                self.wave_in = cx.rng().range(2.0, 3.5);
                let a = cx.rng().range(0.0, TAU);
                cx.core.nudge += Vec2::new(a.cos(), a.sin()) * cx.r.finale.waves * 6.0;
                cx.sfx(sfx::WAVE, 0.9, 1.0);
            }
        }
        let holding = i.brace();
        let inside = cx.core.cob.length() < self.radius;
        if inside && holding {
            self.out = 0.0;
        } else if self.grace <= 0.0 {
            self.out += dt;
        }
        self.survived = self.t;
        cx.scrub("FIT/Plank", 0.0);
        cx.lean_body(-68.0);
        if self.out > p.grace {
            if self.forgiving {
                self.out = 0.0;
                self.t -= 0.5;
                cx.core.center();
                cx.sfx(sfx::GROAN, 0.5, 1.0);
                return false;
            }
            self.flop = 1.4;
            cx.gesture("FIT/Flop");
            cx.sfx(sfx::WOOD, 1.0, 0.5);
            let msg = cx.pick("kettle_flop");
            cx.say(msg, 3.0);
            return false;
        }
        if self.t >= self.seconds {
            return true;
        }
        false
    }

    pub fn bot(&self, core: &BalanceCore, _r: &Rules) -> Intent {
        Intent { l: true, r: true, lean: pd(core, Vec2::ZERO), ..Default::default() }
    }

    pub fn hud(&self, b: &mut B, core: &BalanceCore, _r: &Rules) {
        b.title_left(60.0, 30.0, 80.0, INK, &format!("{:.0} s", self.t));
        b.puck(PUCK_TOP, PUCK_R, core.cob.into());
        b.puck_ring([0.0, 0.0], self.radius);
    }

    pub fn score(&self, r: &Rules) -> f32 {
        // Stars at 25, 40 and 55 s of the minute: a piecewise line through 400, 650 and 850.
        let s = self.survived * 60.0 / r.plank.seconds.max(1.0);
        let pts = [(0.0, 0.0), (25.0, 400.0), (40.0, 650.0), (55.0, 850.0), (60.0, 1000.0)];
        for w in pts.windows(2) {
            let (a, b) = (w[0], w[1]);
            if s <= b.0 {
                return a.1 + (b.1 - a.1) * (s - a.0) / (b.0 - a.0);
            }
        }
        1000.0
    }
}
