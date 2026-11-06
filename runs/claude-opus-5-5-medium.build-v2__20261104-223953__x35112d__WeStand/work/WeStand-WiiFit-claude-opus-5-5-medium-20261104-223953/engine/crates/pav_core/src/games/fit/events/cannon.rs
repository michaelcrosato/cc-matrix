//! Cannonball Cup: bounce on the board, press at the bottom of three bounces, leap on the fourth;
//! tuck in the air and rotate with the lean. The judges are not here for form.

use super::*;
use crate::games::fit::sfx;

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub enum Stage {
    Bounce,
    Air,
    Under,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Cannon {
    pub t: f32,
    pub dive: u32,
    pub stage: Stage,
    pub power: f32,
    pub presses: u32,
    pub stage_t: f32,
    pub y: f32,
    pub z: f32,
    pub vy: f32,
    pub vz: f32,
    pub tuck: f32,
    pub angle: f32,
    pub scores: Vec<f32>,
    timing_sum: f32,
    apex: f32,
    tuck_time: f32,
    tuck_at_entry: f32,
    board: Option<EntityId>,
    water: Vec3,
    bounce_t: f32,
    pub cards: [String; 3],
    card_ids: Vec<EntityId>,
    last_bottom: u32,
    pub waited: f32,
    judges: Vec<EntityId>,
    wing_t: f32,
    tick_id: u32,
}

const CAM: f32 = 90.0;

impl Cannon {
    pub fn start(cx: &mut Cx, _o: Opt) -> Self {
        let at = cx.spot(TOWER, "board");
        let board = cx.prop("fit_board", at - Vec3::new(0.0, 0.05, 4.0), 0.0, 1.0);
        let jud = cx.spot(TOWER, "judges");
        let mut judges = Vec::new();
        let mut card_ids = Vec::new();
        for k in 0..3 {
            let p = jud + Vec3::new(0.0, 0.1, (k as f32 - 1.0) * 1.2);
            judges.push(cx.prop("fit_gull", p + Vec3::Y * 0.35, -1.57, 1.3));
            card_ids.push(cx.prop("fit_card", p + Vec3::new(0.0, 0.0, 0.0) - Vec3::Y * 9.0, -1.57, 1.0));
        }
        cx.player(at, 0.0);
        cx.core.wobble = 0.4;
        cx.ev.push(SimEvent::Music { song: 5 });
        *cx.shot = Shot { tilt: 6.0, yaw: CAM, distance: 14.0, fov: 40.0, height: 2.0, focus: at + Vec3::new(0.0, 0.0, 3.0) };
        Self { t: 0.0, dive: 0, stage: Stage::Bounce, power: 0.0, presses: 0, stage_t: 0.0, y: at.y, z: at.z, vy: 0.0, vz: 0.0, tuck: 0.0, angle: 0.0, scores: Vec::new(), timing_sum: 0.0, apex: 0.0, tuck_time: 0.0, tuck_at_entry: 0.0, board: Some(board), water: at, bounce_t: 0.0, cards: Default::default(), card_ids, last_bottom: 0, waited: 0.0, judges, wing_t: 0.0, tick_id: 0 }
    }

    /// How far into the bounce (0 = the bottom), and the distance from the bottom (s).
    fn phase(&self, r: &Rules) -> f32 {
        let p = r.dive.period;
        let u = self.bounce_t.rem_euclid(p);
        u.min(p - u)
    }

    pub fn tick(&mut self, cx: &mut Cx, i: &Intent) -> bool {
        let dt = cx.dt;
        self.t += dt;
        self.stage_t += dt;
        self.wing_t += dt;
        self.tick_id += 1;
        let r = cx.r.dive.clone();
        let spot = cx.spot(TOWER, "board");
        match self.stage {
            Stage::Bounce => {
                self.bounce_t += dt;
                self.waited += dt;
                let p = r.period;
                // Bigger and bigger bounces as power builds.
                let amp = 0.25 + self.power * 0.28;
                let w = (self.bounce_t / p * TAU).cos();
                let h = (1.0 - w) * 0.5 * amp;
                let bend = (w + 1.0) * 0.5 * 0.22 * (1.0 + self.power * 0.5);
                self.y = spot.y + h - bend * 0.5;
                self.z = spot.z;
                if let Some(b) = self.board {
                    cx.place(b, spot - Vec3::new(0.0, 0.05, 4.0), Quat::from_rotation_x(bend * 0.14));
                }
                let bottom = (self.bounce_t / p).round() as u32;
                if bottom != self.last_bottom && self.phase(cx.r) < 0.03 {
                    self.last_bottom = bottom;
                    cx.sfx(sfx::BOING, 0.5, 0.8 + 0.12 * self.power);
                }
                cx.player(Vec3::new(spot.x, self.y, self.z), 0.0);
                cx.scrub("FIT/Squat", (bend * 2.0).min(0.6));
                cx.lean_body(CAM);
                if i.act_p {
                    let off = self.phase(cx.r);
                    let timing = (1.0 - off / (p * 0.5)).clamp(0.0, 1.0);
                    let good = off <= r.timing;
                    self.timing_sum += timing;
                    self.presses += 1;
                    if good {
                        self.power += r.bounce_gain * 0.42;
                        cx.sfx(sfx::GOOD, 0.5, 0.9 + 0.1 * self.power);
                    } else {
                        cx.sfx(sfx::SQUEAK, 0.5, 0.8);
                    }
                    if self.presses >= 4 {
                        self.leap(cx, &r);
                    }
                }
                if self.waited > r.wait {
                    // The board tips you off: a belly flop of no distinction.
                    self.timing_sum = 0.0;
                    self.power = 0.0;
                    self.presses = 4;
                    self.leap(cx, &r);
                    cx.say("The board has made a decision.", 2.0);
                }
            }
            Stage::Air => {
                self.vy -= 9.8 * dt;
                self.y += self.vy * dt;
                self.z += self.vz * dt;
                self.apex = self.apex.max(self.y);
                self.tuck += (if i.act { 1.0 } else { 0.0 } - self.tuck) * (1.0 - (-12.0 * dt).exp());
                if i.act {
                    self.tuck_time += dt;
                }
                self.angle += cx.core.cob.x * r.spin * (0.5 + self.tuck) * dt;
                if self.tuck > 0.5 {
                    cx.scrub_held("FIT/Tuck", self.tuck);
                } else {
                    cx.scrub_held("FIT/DiveEntry", 0.5);
                }
                cx.player(Vec3::new(spot.x, self.y.max(0.02), self.z), 0.0);
                if let Some(a) = cx.anim() {
                    a.tilt_side = 0.0;
                    a.tilt_fwd = self.angle;
                    a.tilt_pivot = 0.8;
                }
                if self.y <= 0.0 {
                    self.tuck_at_entry = self.tuck;
                    let height = ((self.apex - 0.0) / (spot.y + r.height)).clamp(0.0, 1.2);
                    let timing = self.timing_sum / 4.0;
                    let tuck = 0.4 + 0.6 * self.tuck_at_entry;
                    let size = (height * tuck * 2.6).clamp(0.2, 3.0);
                    let score = (height * tuck * (0.45 + 0.55 * timing)).clamp(0.0, 1.0) * 1000.0;
                    self.scores.push(score);
                    let pos = Vec3::new(spot.x, 0.0, self.z);
                    self.water = pos;
                    cx.ev.push(SimEvent::BigSplash { pos, size });
                    cx.sfx(sfx::SPLASH_B, (0.5 + size * 0.3).min(1.2), 1.1 - size * 0.12);
                    cx.sfx(sfx::CHEER, (size * 0.3).min(0.8), 1.0);
                    self.give_cards(cx, score);
                    self.stage = Stage::Under;
                    self.stage_t = 0.0;
                }
            }
            Stage::Under => {
                let u = self.stage_t;
                cx.player(self.water - Vec3::Y * 0.6 * (1.0 - (u * 2.0).min(1.0)) + Vec3::Y * 0.0, 0.0);
                if let Some(a) = cx.anim() {
                    a.tilt_fwd = 0.0;
                    a.tilt_pivot = 0.0;
                }
                cx.scrub("FIT/Sigh", 0.5);
                if u > 3.0 {
                    self.dive += 1;
                    for id in &self.card_ids {
                        if let Some(e) = cx.sim.state.entities.get_mut(*id) {
                            e.pos.y = -9.0;
                        }
                    }
                    if self.dive >= 3 {
                        return true;
                    }
                    self.stage = Stage::Bounce;
                    self.stage_t = 0.0;
                    self.power = 0.0;
                    self.presses = 0;
                    self.timing_sum = 0.0;
                    self.apex = 0.0;
                    self.tuck = 0.0;
                    self.tuck_time = 0.0;
                    self.angle = 0.0;
                    self.waited = 0.0;
                    self.bounce_t = 0.0;
                    self.last_bottom = 0;
                }
            }
        }
        // The judges bob.
        let n = self.judges.len();
        let jud = cx.spot(TOWER, "judges");
        for k in 0..n {
            let id = self.judges[k];
            let up = (self.wing_t * 2.0 + k as f32).sin().abs() * 0.04;
            let p = jud + Vec3::new(0.0, 0.45 + up, (k as f32 - 1.0) * 1.2);
            cx.place(id, p, Quat::from_rotation_y(-1.57));
        }
        let focus = match self.stage {
            Stage::Bounce => Vec3::new(spot.x, spot.y + 0.8, spot.z + 2.0),
            Stage::Air => Vec3::new(spot.x, (self.y + 1.0).max(1.5), self.z + 1.0),
            Stage::Under => self.water + Vec3::new(0.0, 1.2, 2.0),
        };
        *cx.shot = Shot { tilt: 6.0, yaw: CAM, distance: 14.0, fov: 40.0, height: 0.5, focus };
        false
    }

    fn leap(&mut self, cx: &mut Cx, r: &crate::games::fit::rules::DiveRules) {
        self.stage = Stage::Air;
        self.stage_t = 0.0;
        let height = 1.0 + r.height * (self.power / (r.bounce_gain * 0.42 * 4.0)).clamp(0.0, 1.0);
        self.vy = (2.0 * 9.8 * height).sqrt();
        self.vz = 2.4;
        self.apex = self.y;
        cx.sfx(sfx::WHOOSH, 0.9, 1.0);
        cx.sfx(sfx::BOING, 0.9, 1.3);
    }

    fn give_cards(&mut self, cx: &mut Cx, score: f32) {
        // Three gulls, three opinions.
        let base = score / 100.0;
        for k in 0..3 {
            let v = (base + cx.rng().range(-1.0, 1.0)).clamp(0.0, 10.0);
            let v = (v * 2.0).round() / 2.0;
            self.cards[k] = if k == 2 && cx.rng().f32() < 0.35 { "See me".into() } else if v.fract() == 0.0 { format!("{}", v as u32) } else { format!("{v:.1}") };
        }
        let jud = cx.spot(TOWER, "judges");
        for k in 0..3 {
            let id = self.card_ids[k];
            cx.place(id, jud + Vec3::new(0.0, 0.1, (k as f32 - 1.0) * 1.2), Quat::from_rotation_y(-1.57));
        }
        cx.sfx(sfx::GULL, 0.7, 1.0);
        let line = cx.pick("gull_dive");
        cx.say(line, 3.0);
    }

    pub fn bot(&self, core: &BalanceCore, r: &Rules) -> Intent {
        let mut i = Intent::default();
        match self.stage {
            Stage::Bounce => {
                if self.phase(r) < 0.012 && self.bounce_t > 0.3 {
                    i.act_p = true;
                    i.act = true;
                }
            }
            Stage::Air => {
                // Tuck at the apex, hold it to the water.
                if self.vy < 1.0 {
                    i.act = true;
                }
                i.lean = pd(core, Vec2::ZERO);
            }
            Stage::Under => {}
        }
        i
    }

    pub fn hud(&self, b: &mut B, _core: &BalanceCore, r: &Rules) {
        b.title_left(60.0, 30.0, 80.0, INK, &format!("Dive {}", (self.dive + 1).min(3)));
        match self.stage {
            Stage::Bounce => {
                // The bounce meter: press when the marker is at the bottom.
                let u = (self.bounce_t / r.dive.period * TAU).cos();
                let y = 820.0 + 180.0 * (u + 1.0) * 0.5;
                b.flat([1700.0, 820.0, 1800.0, 1000.0], PALE, 26.0);
                b.flat([1700.0, 950.0, 1800.0, 1000.0], MINT, 26.0);
                b.flat([1690.0, y - 10.0, 1810.0, y + 10.0], CORAL, 8.0);
                for k in 0..4 {
                    let on = k < self.presses;
                    b.circle([820.0 + k as f32 * 90.0, 1000.0], 30.0, if on { TEAL } else { PALE }, WHITE, 4.0);
                }
                b.prompt_center(960.0, 900.0, &[Glyph::Confirm], "At the bottom");
            }
            Stage::Air => {
                b.prompt_center(960.0, 900.0, &[Glyph::Confirm], "Hold to tuck");
            }
            Stage::Under => {
                for k in 0..3 {
                    let x = 560.0 + k as f32 * 400.0;
                    b.card([x - 170.0, 120.0, x + 170.0, 280.0], WHITE);
                    b.title(x, 150.0, 72.0, INK, &self.cards[k]);
                }
                if let Some(s) = self.scores.last() {
                    b.center(960.0, 320.0, 50.0, INK, &format!("{:.0} points of splash", s));
                }
            }
        }
    }

    pub fn score(&self, _r: &Rules) -> f32 {
        self.scores.iter().sum::<f32>() / 3.0
    }
}
