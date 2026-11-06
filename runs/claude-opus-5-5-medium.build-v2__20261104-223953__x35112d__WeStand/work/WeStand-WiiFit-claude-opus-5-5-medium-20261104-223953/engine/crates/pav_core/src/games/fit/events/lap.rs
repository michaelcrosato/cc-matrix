//! Morning Lap: alternate steps to set your pace, one lap of the island's ring path, chasing a
//! bouncing pacer. Lean moves you aside to dodge crabs and towels and to grab ribbons.

use super::*;
use crate::games::fit::sfx;

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct Thing {
    pub id: EntityId,
    pub s: f32,
    pub side: f32,
    pub kind: u8, // 0 obstacle, 1 ribbon
    pub gone: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Lap {
    pub t: f32,
    pub s: f32,
    pub side: f32,
    pub pace: f32,
    last_step: f32,
    last_foot: u8,
    pub stitch: f32,
    stumble: f32,
    pub zone: f32,
    pub ribbons: u32,
    pub bumps: u32,
    pub things: Vec<Thing>,
    pacer: Option<EntityId>,
    pacer_s: f32,
    center: Vec3,
    pub length: f32,
    told: bool,
    pub done: bool,
    step_acc: f32,
}

const A: f32 = 25.0;
const B_: f32 = 18.0;

/// A point on the ring path (0..1 of the lap): the ellipse, centred on the island.
fn ring(center: Vec3, u: f32) -> (Vec3, Vec3) {
    let a = u * TAU + PI * 0.5;
    let p = center + Vec3::new(a.cos() * A, 0.0, a.sin() * B_);
    let t = Vec3::new(-a.sin() * A, 0.0, a.cos() * B_).normalize();
    (p, t)
}

const LEN: f32 = 136.0;

impl Lap {
    pub fn start(cx: &mut Cx, _o: Opt) -> Self {
        let center = cx.spot(HUB, "arrive") + Vec3::new(0.0, 0.0, 2.0);
        let (p, t) = ring(center, 0.0);
        cx.player(p, t.x.atan2(t.z));
        cx.core.wobble = 0.6;
        let n_o = cx.r.lap.obstacles as u32;
        let n_r = cx.r.lap.ribbons as u32;
        let mut things = Vec::new();
        for k in 0..n_o + n_r {
            let obstacle = k < n_o;
            let total = if obstacle { n_o } else { n_r };
            let idx = if obstacle { k } else { k - n_o };
            let s = (idx as f32 + 0.4 + cx.rng().range(-0.2, 0.2)) / total.max(1) as f32 * LEN * 0.94 + 4.0;
            let side = if cx.rng().f32() < 0.5 { -0.8 } else { 0.8 };
            let (at, tan) = ring(center, s / LEN);
            let across = Vec3::new(-tan.z, 0.0, tan.x);
            let pos = at + across * side;
            let id = if obstacle {
                match k % 3 {
                    0 => cx.prop("fit_crab", pos, 0.0, 1.0),
                    1 => cx.prop_color("fit_towel", pos + Vec3::Y * 0.01, tan.x.atan2(tan.z), 1.0, "#ff9ec4"),
                    _ => cx.prop_color("fit_chair", pos, tan.x.atan2(tan.z), 0.9, "#ffd166"),
                }
            } else {
                cx.prop("fit_ribbon", pos + Vec3::Y * 0.25, tan.x.atan2(tan.z), 1.0)
            };
            things.push(Thing { id, s, side, kind: if obstacle { 0 } else { 1 }, gone: false });
        }
        let pacer = cx.sim.state.entities.iter().find(|e| e.name == "bounce" && (e.pos - center).length() < 40.0).map(|e| e.id);
        cx.ev.push(SimEvent::Music { song: 5 });
        Self { t: 0.0, s: 0.0, side: 0.0, pace: 0.0, last_step: -1.0, last_foot: 2, stitch: 0.0, stumble: 0.0, zone: 0.0, ribbons: 0, bumps: 0, things, pacer, pacer_s: 8.0, center, length: LEN, told: false, done: false, step_acc: 0.0 }
    }

    pub fn tick(&mut self, cx: &mut Cx, i: &Intent) -> bool {
        let dt = cx.dt;
        self.t += dt;
        let r = cx.r.lap.clone();
        // Alternating feet set the pace.
        for (p, foot) in [(i.l_p, 0u8), (i.r_p, 1u8)] {
            if p && foot != self.last_foot {
                let gap = self.t - self.last_step;
                if self.last_step >= 0.0 && gap > 0.05 {
                    self.pace += (1.0 / gap - self.pace) * 0.5;
                }
                self.last_step = self.t;
                self.last_foot = foot;
                cx.sfx(sfx::STEP, 0.5, 1.0);
            }
        }
        if self.t - self.last_step > 0.8 {
            self.pace = (self.pace - 3.0 * dt).max(0.0);
        }
        let in_zone = self.pace >= r.pace_low && self.pace <= r.pace_high;
        if in_zone {
            self.zone += dt;
            self.stitch = (self.stitch - 0.2 * dt).max(0.0);
        } else if self.pace > r.pace_high {
            self.stitch += r.stitch_rate * dt;
        }
        if self.stitch >= 1.0 {
            self.stitch = 0.3;
            self.stumble = 1.2;
            cx.gesture("FIT/Stumble");
            let line = cx.pick("bounce_stitch");
            cx.say(line, 3.0);
        }
        self.stumble = (self.stumble - dt).max(0.0);
        let speed = if self.stumble > 0.0 { 0.0 } else { self.pace * r.speed_per_step };
        self.s += speed * dt;
        self.side += (cx.core.cob.x * r.side_reach - self.side) * (1.0 - (-8.0 * dt).exp());
        let (p, t) = ring(self.center, (self.s / LEN).fract());
        let across = Vec3::new(-t.z, 0.0, t.x);
        let at = p + across * self.side;
        let yaw = t.x.atan2(t.z);
        cx.player(at, yaw);
        // The chase camera follows every tick.
        let cam = (-t.x).atan2(t.z).to_degrees() + 180.0;
        let cam_yaw = (t.x.atan2(-t.z)).to_degrees();
        let _ = cam;
        *cx.shot = Shot { tilt: 22.0, yaw: cam_yaw, distance: 9.0, fov: 40.0, height: 0.9, focus: at };
        cx.clip("MESH2MOTION/Jog", (self.pace / 2.0 * 0.6).clamp(0.05, 1.4));
        cx.lean_body_by(Vec2::new(cx.core.cob.x, 0.0), cam_yaw, 0.0);
        // Lean: x is sideways on this camera; across is its right.
        for th in self.things.iter_mut() {
            if th.gone || (th.s - self.s).abs() > 0.7 {
                continue;
            }
            if (th.side - self.side).abs() < 0.65 {
                th.gone = true;
                if th.kind == 1 {
                    self.ribbons += 1;
                    let id = th.id;
                    cx.sim.despawn(id);
                    cx.sfx(sfx::CHIME, 0.6, penta(self.ribbons));
                } else {
                    self.bumps += 1;
                    self.stumble = 0.8;
                    self.pace *= 0.6;
                    cx.gesture("FIT/Stumble");
                    cx.sfx(sfx::SQUEAK, 0.7, 0.8);
                }
            }
        }
        // Flip-flops on the way.
        for k in 0..5 {
            if !cx.flops[k] {
                if let Some(id) = cx.flop_ids[k] {
                    if cx.sim.state.entities.get(id).is_some_and(|e| (e.pos - at).length() < 1.6) {
                        cx.flops[k] = true;
                        cx.sim.despawn(id);
                        cx.sfx(sfx::POP, 0.7, 1.4);
                        cx.say("A flip-flop. Someone will be glad. Someone is always glad.", 3.0);
                    }
                }
            }
        }
        // Bounce rolls ahead and gets away if you dawdle.
        let gap = self.pacer_s - self.s;
        let pacer_speed = if gap > 14.0 { 0.0 } else { 1.75 + if gap < 4.0 { 1.0 } else { 0.0 } };
        self.pacer_s += pacer_speed * dt;
        if let Some(id) = self.pacer {
            let (pp, pt) = ring(self.center, (self.pacer_s / LEN).fract());
            cx.sim.set_position(id, pp);
            let f = pt.x.atan2(pt.z);
            if let Some(ch) = cx.sim.state.entities.get_mut(id).and_then(|e| e.character.as_mut()) {
                ch.facing = f;
                ch.anim.facing = f;
                ch.anim.lift = (self.t * 6.0).sin().abs() * 0.5;
            }
        }
        if gap > 12.0 && !self.told {
            self.told = true;
            let line = cx.pick("bounce_far");
            cx.say(line, 3.0);
        }
        if self.s >= LEN {
            self.done = true;
            if let Some(id) = self.pacer {
                let home = cx.spot(HUB, "bounce");
                cx.sim.set_position(id, home);
            }
            return true;
        }
        if self.t >= r.seconds {
            if let Some(id) = self.pacer {
                let home = cx.spot(HUB, "bounce");
                cx.sim.set_position(id, home);
            }
            return true;
        }
        false
    }

    pub fn bot(&self, core: &BalanceCore, _r: &Rules) -> Intent {
        let mut i = Intent::default();
        // Two steps a second; a press lands on whichever tick crosses the half-second.
        let step = (self.t * 2.0) as u32;
        let before = ((self.t - 1.0 / 60.0) * 2.0) as u32;
        if step != before {
            if step % 2 == 0 {
                i.l_p = true;
                i.l = true;
            } else {
                i.r_p = true;
                i.r = true;
            }
        }
        // Steer for the next ribbon, around the next obstacle.
        let mut want = 0.0;
        if let Some(ob) = self.things.iter().filter(|t| !t.gone && t.s > self.s - 0.5 && t.s < self.s + 6.0).min_by(|a, b| a.s.total_cmp(&b.s)) {
            want = if ob.kind == 1 { ob.side } else { -ob.side };
        }
        i.lean = pd(core, Vec2::new(want / 1.2, 0.0));
        i
    }

    pub fn hud(&self, b: &mut B, core: &BalanceCore, r: &Rules) {
        timer(b, r.lap.seconds - self.t);
        b.puck(PUCK_TOP, PUCK_R, core.cob.into());
        b.flat([560.0, 960.0, 1360.0, 1020.0], PALE, 28.0);
        let m = r.lap.pace_high * 1.5;
        b.flat([560.0 + 800.0 * r.lap.pace_low / m, 960.0, 560.0 + 800.0 * r.lap.pace_high / m, 1020.0], MINT, 28.0);
        b.circle([560.0 + 800.0 * (self.pace / m).clamp(0.0, 1.0), 990.0], 38.0, TEAL, WHITE, 5.0);
        b.center(960.0, 900.0, 40.0, INK, "Pace");
        b.prompt(60.0, 940.0, &[Glyph::StepL, Glyph::StepR], "Alternate");
        if self.stitch > 0.05 {
            b.text(60.0, 860.0, 40.0, CORAL, "Stitch");
            b.bar([190.0, 868.0, 460.0, 900.0], self.stitch.min(1.0), CORAL, None);
        }
        b.right(1860.0, 450.0, 44.0, INK, &format!("Ribbons {}", self.ribbons));
        b.bar([560.0, 40.0, 1360.0, 70.0], (self.s / LEN).min(1.0), TEAL, None);
    }

    pub fn score(&self, r: &Rules) -> f32 {
        // A lap at two steps a second is the whole of the zone time there is to earn.
        let zone = self.zone / r.lap.seconds.min(LEN / (2.0 * r.lap.speed_per_step));
        700.0 * zone.min(1.0) + 300.0 * self.ribbons as f32 / r.lap.ribbons.max(1.0) - 25.0 * self.bumps as f32
    }
}
