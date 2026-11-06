//! Tempo Squats: hold to go down, release to rise, to a guide bar; keep the dot in the band.

use super::*;
use crate::games::fit::sfx;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Squats {
    pub t: f32,
    pub rep: u32,
    pub depth: f32,
    rep_sum: f32,
    rep_band: f32,
    rep_time: f32,
    pub total: f32,
    belled: bool,
    pub gag: f32,
}

impl Squats {
    pub fn start(cx: &mut Cx, _o: Opt) -> Self {
        let c = cx.spot(GAZEBO, "center");
        cx.player(c, 0.0);
        cx.core.wobble = 1.0;
        *cx.shot = Shot { tilt: 14.0, yaw: -16.0, distance: 8.0, fov: 36.0, height: 0.8, focus: c };
        Self { t: 0.0, rep: 0, depth: 0.0, rep_sum: 0.0, rep_band: 0.0, rep_time: 0.0, total: 0.0, belled: false, gag: 0.0 }
    }

    fn cycle(r: &Rules) -> f32 {
        r.squats.down + r.squats.up + r.squats.rest
    }

    /// The guide's depth at a time within a rep, and whether it wants you going down.
    fn guide(r: &Rules, u: f32) -> (f32, bool) {
        let s = &r.squats;
        if u < s.down {
            (u / s.down, true)
        } else if u < s.down + s.up {
            (1.0 - (u - s.down) / s.up, false)
        } else {
            (0.0, false)
        }
    }

    pub fn tick(&mut self, cx: &mut Cx, i: &Intent) -> bool {
        let dt = cx.dt;
        self.t += dt;
        let s = &cx.r.squats;
        if self.gag > 0.0 {
            self.gag -= dt;
            cx.scrub("FIT/Squat", 0.0);
            return self.gag <= 0.0;
        }
        let reps = s.reps as u32;
        let c = Self::cycle(cx.r);
        let u = self.t - self.rep as f32 * c;
        self.depth = clamp01(self.depth + if i.act { dt / s.down } else { -dt / s.up });
        let (g, _) = Self::guide(cx.r, u);
        cx.core.wobble = 1.0 + s.wobble_per_rep * self.rep as f32;
        if u < s.down + s.up {
            self.rep_sum += (1.0 - clamp01((self.depth - g).abs() / 0.35)) * dt;
            // The band counts only while squatting, so standing still stays under a star.
            self.rep_band += (cx.core.cob.x.abs() < s.band && self.depth > 0.02) as u8 as f32 * dt;
            self.rep_time += dt;
        }
        if u >= s.down && !self.belled {
            self.belled = true;
            cx.sfx(sfx::BELL, 0.8, 0.5);
        }
        if u >= c {
            let timing = self.rep_sum / self.rep_time.max(0.1);
            let band = self.rep_band / self.rep_time.max(0.1);
            self.total += 0.7 * timing + 0.3 * band;
            self.rep += 1;
            self.rep_sum = 0.0;
            self.rep_band = 0.0;
            self.rep_time = 0.0;
            self.belled = false;
            cx.sfx(sfx::STAR, 0.5, penta(self.rep));
            if self.rep >= reps {
                self.gag = 2.0;
                cx.say("Ten. Also eleven.", 2.0);
                cx.sfx(sfx::GONG, 0.5, 1.0);
            }
        }
        cx.scrub("FIT/Squat", self.depth);
        cx.lean_body(-16.0);
        false
    }

    pub fn bot(&self, core: &BalanceCore, r: &Rules) -> Intent {
        let c = Self::cycle(r);
        let u = self.t - self.rep as f32 * c;
        let (_, down) = Self::guide(r, u + 0.02);
        Intent { act: down, lean: pd(core, Vec2::ZERO), ..Default::default() }
    }

    pub fn hud(&self, b: &mut B, core: &BalanceCore, r: &Rules) {
        let c = Self::cycle(r);
        let u = self.t - self.rep as f32 * c;
        let (g, down) = Self::guide(r, u);
        b.puck(PUCK_TOP, PUCK_R, core.cob.into());
        b.puck_band(r.squats.band);
        b.title_left(60.0, 30.0, 80.0, INK, &format!("{} of {}", (self.rep + 1).min(r.squats.reps as u32), r.squats.reps as u32));
        // The tempo bar: the guide above, your depth below.
        let x = 70.0;
        b.flat([x, 240.0, x + 110.0, 760.0], PALE, 30.0);
        b.flat([x, 240.0 + g * 480.0, x + 110.0, 280.0 + g * 480.0], TEAL, 16.0);
        b.flat([x + 20.0, 250.0 + self.depth * 480.0, x + 90.0, 270.0 + self.depth * 480.0], CORAL, 10.0);
        b.center(x + 55.0, 780.0, 40.0, INK, if down { "Down" } else { "Up" });
    }

    pub fn score(&self, r: &Rules) -> f32 {
        1000.0 * self.total / r.squats.reps
    }
}
