//! The bot: a task planner that picks the most urgent valid task, selects the instrument, moves
//! at a human cursor speed and performs the gesture, with noise scaled by skill. It is a pure
//! function of the state, so it drives tests, the balance tool, attract, and the Case 7 partner.

use glam::Vec2;

use super::field::{Eng, Hazard, Kind, Op, Rules, Tool, angle_diff, iv_port, wound_frame};
use crate::input::{SurgeonInput, surgeon_buttons as btn};
use crate::rng::hash_f32;

const DT: f32 = 1.0 / 60.0;

fn noise(tick: u64, slot: usize, salt: i32) -> f32 {
    hash_f32(0x5eed, (tick / 18) as i32, slot as i32, salt) * 2.0 - 1.0
}

fn step_to(from: Vec2, to: Vec2, speed: f32) -> Vec2 {
    let d = to - from;
    let m = speed * DT;
    if d.length() <= m { to } else { from + d / d.length() * m }
}

impl Op {
    fn ring_pos(&self, tool: Tool) -> Option<u8> {
        self.ring.iter().position(|t| *t == tool).map(|p| p as u8)
    }

    fn urgency(&self, h: &Hazard, i: usize, p: Vec2) -> f32 {
        let base = match h.kind {
            Kind::Bleeder => 10.0,
            Kind::Incision if h.deadline > 0.0 => 12.0,
            Kind::Sac => 6.0 + h.prog * 8.0,
            Kind::Nodule => {
                if h.stage == 1 {
                    14.0
                } else {
                    7.5
                }
            }
            Kind::Tendril | Kind::Furnace => 8.0,
            Kind::Lacer => 6.0,
            Kind::Pool => {
                if h.blocking || h.r > 0.9 {
                    5.0
                } else {
                    3.5
                }
            }
            Kind::Object => 6.5,
            _ => 5.0,
        };
        let shared = if (h.id as usize + i) % 2 == 0 { 0.0 } else { 0.8 };
        base - h.a.distance(p) * 0.18 - shared
    }

    /// What a surgeon of `rules.bot_skill` would do this tick.
    pub fn bot_input(&self, i: usize, r: &Rules) -> SurgeonInput {
        // The Case 7 partner holds her side of the table; she won't carry the operation alone.
        let partner = self.slots[i].bot && self.case == 7 && !self.showing;
        let skill = if partner { 0.6 } else { r.bot_skill.clamp(0.0, 1.0) };
        let s = &self.slots[i];
        let mut inp = SurgeonInput { active: true, abs: true, aim: s.aim, ..Default::default() };
        if skill <= 0.0 {
            return inp;
        }
        let speed = 12.0 * (0.25 + 0.75 * skill);
        let sloppy = 1.0 - skill;

        if let Some(c) = &self.code {
            let ready = s.charge >= 1.0;
            let centred = (c.ghost - 0.5).abs() * 0.9 < 0.05 + sloppy * 0.12;
            let release = ready && centred;
            if !release {
                inp.held |= btn::DEFIB;
            }
            return inp;
        }

        // The gift: hold, then let go on the heartbeat.
        let shared = self.slots[0].gift_kind == 3;
        let meter = if shared { 0 } else { i };
        if !self.gifts.locked
            && s.gift_kind != 0
            && self.slots[meter].gift >= 100.0
            && self.gifts.hush <= 0.0
            && self.gifts.echo <= 0.0
            && skill > 0.5
            && self.hazards.iter().filter(|h| h.blocking).count() >= 2
        {
            let about_to_beat = self.heart.phase > 0.97 || self.heart.phase < 0.05;
            if !(s.arming && about_to_beat) {
                inp.held |= btn::GIFT;
            }
        }

        // Let go before a heat ring reaches the hand.
        if let Some(radius) = self.heat_ring {
            let d = s.cursor.length();
            if radius < d + 1.3 && radius > d - 0.9 {
                return inp;
            }
        }

        // Finish what the hand is doing.
        if let Some(out) = self.bot_engaged(i, r, inp, speed, sloppy) {
            return out;
        }

        // A breath between actions, longer for the less skilled.
        if s.since_action < 0.28 + sloppy * 1.1 {
            return inp;
        }

        // Top up the patient when it's needed.
        let want_iv = self.vitals < 52.0 + skill * 8.0 && !partner;
        if want_iv && self.iv_cd <= 0.0 && self.ring_pos(Tool::Iv).is_some() {
            let pos = self.ring_pos(Tool::Iv).unwrap();
            if s.tool != pos {
                inp.tool = pos + 1;
            }
            inp.aim = step_to(s.aim, iv_port(), speed);
            if s.tool == pos {
                inp.held |= btn::USE;
            }
            return inp;
        }

        // Anything hidden, the Scanner finds.
        let hidden = self.hazards.iter().filter(|h| !h.visible()).min_by(|a, b| {
            a.a.distance(s.cursor).total_cmp(&b.a.distance(s.cursor))
        });
        let tool_ctx = self.tool_of(i);
        if partner && self.hazards.iter().all(|h| h.kind == Kind::Closure) {
            return inp;
        }
        // The closure comes to hand once the IV is put down.
        if tool_ctx == Tool::Iv && !self.hazards.is_empty() && self.hazards.iter().all(|h| h.kind == Kind::Closure) {
            inp.tool = 1;
            return inp;
        }
        if tool_ctx == Tool::Dressing {
            if let Some(h) = self.hazards.iter().find(|h| h.kind == Kind::Closure) {
                let spot = h.spot();
                inp.aim = step_to(s.aim, spot, speed);
                if s.aim.distance(spot) < 0.25 {
                    inp.held |= btn::USE;
                }
                return inp;
            }
        }
        let mut best: Option<(f32, usize, Tool)> = None;
        for (k, h) in self.hazards.iter().enumerate() {
            if !h.visible() || self.held_by_other(h.id, i) {
                continue;
            }
            if partner && h.spot().x > 0.0 {
                continue;
            }
            let tool = match h.takes() {
                Some(t) => t,
                None => continue,
            };
            if self.ring_pos(tool).is_none() {
                continue;
            }
            if self.covered(h) {
                continue;
            }
            let u = self.urgency(h, i, s.cursor);
            if best.is_none_or(|(b, _, _)| u > b) {
                best = Some((u, k, tool));
            }
        }
        if let Some(h) = hidden.filter(|_| best.is_none_or(|(u, _, _)| u < 7.0)) {
            if let Some(pos) = self.ring_pos(Tool::Scanner) {
                if s.tool != pos {
                    inp.tool = pos + 1;
                    return inp;
                }
                inp.aim = step_to(s.aim, h.a, speed * 0.7);
                inp.held |= btn::USE;
                return inp;
            }
        }
        let Some((_, k, tool)) = best else {
            return inp;
        };
        let h = &self.hazards[k];
        let pos = self.ring_pos(tool).unwrap();
        if s.tool != pos {
            inp.tool = pos + 1;
            return inp;
        }
        let spot = h.spot();
        // A target that is about to step isn't worth starting on.
        if h.kind == Kind::Nodule && h.stage == 0 && h.telegraph && h.fill < 0.3 {
            inp.aim = step_to(s.aim, spot, speed * 0.5);
            return inp;
        }
        let aim = if h.kind == Kind::Patch || h.kind == Kind::Pool {
            h.a + Vec2::new((r.time * 9.0).sin(), (r.time * 7.0).cos()) * (h.r * 0.25)
        } else {
            spot
        };
        inp.aim = step_to(s.aim, aim, speed);
        let close = s.aim.distance(aim) < match tool {
            Tool::Suction | Tool::Gel => (h.r * 0.8).max(0.25),
            _ => 0.18,
        };
        if close {
            inp.held |= btn::USE;
            inp.pressure = 1.0;
        }
        inp
    }

    fn bot_engaged(&self, i: usize, r: &Rules, mut inp: SurgeonInput, speed: f32, sloppy: f32) -> Option<SurgeonInput> {
        let s = &self.slots[i];
        let n = |salt: i32| noise(r.tick, i, salt);
        match s.eng {
            Eng::Cut | Eng::Dress => {
                let h = &self.hazards[self.find(s.eng_id)?];
                let len = h.path_len().max(0.5);
                let t = (h.prog + (5.5 + 3.0 * (1.0 - sloppy)) * DT / len + 0.02).min(1.0);
                let along = h.path(t);
                let d = (h.path((t + 0.02).min(1.0)) - h.path((t - 0.02).max(0.0))).normalize_or_zero();
                let wander = d.perp() * n(1) * sloppy * 1.05;
                inp.aim = step_to(s.aim, along + wander, speed.max(8.0));
                inp.held |= btn::USE;
                Some(inp)
            }
            Eng::Pull => {
                let h = &self.hazards[self.find(s.eng_id)?];
                let axis = Vec2::from_angle(h.ang);
                inp.held |= btn::USE;
                if h.kind == Kind::Tendril {
                    let v = 4.2;
                    let hold_back = self.heart.systole() || self.heart.phase > 0.94;
                    inp.aim = s.aim + axis * if hold_back { -v * DT * 1.6 } else { v * DT };
                    return Some(inp);
                }
                let err = n(2) * sloppy * 0.95;
                let dir = Vec2::from_angle(h.ang + err);
                inp.aim = step_to(s.aim, s.eng_start + dir * 1.25, 3.6);
                Some(inp)
            }
            Eng::Stitch => {
                let h = &self.hazards[self.find(s.eng_id)?];
                let (ax, _, _) = wound_frame(h, s.aim);
                let len = h.a.distance(h.b).max(0.1);
                let needle = len * (h.n as f32 + 0.5) / h.need.max(1) as f32;
                let across = Vec2::new(ax.y, -ax.x);
                let want = -(s.side as f32) * 0.32;
                let off = n(3) * sloppy * 1.0;
                inp.aim = step_to(s.aim, h.a + ax * (needle + off) + across * want, (speed * 0.8).max(5.0));
                inp.held |= btn::USE;
                Some(inp)
            }
            Eng::Heat => {
                let h = &self.hazards[self.find(s.eng_id)?];
                let target = 0.965 + n(4) * sloppy * 0.32;
                if h.fill < target {
                    inp.held |= btn::USE;
                    inp.aim = step_to(s.aim, h.spot(), speed);
                }
                Some(inp)
            }
            Eng::Iv => {
                let target = 0.97 + n(5) * sloppy * 0.4;
                if s.eng_a < target {
                    inp.held |= btn::USE;
                }
                Some(inp)
            }
            Eng::Bone => {
                let h = &self.hazards[self.find(s.eng_id)?];
                inp.aim = step_to(s.aim, h.b, (speed * 0.6).max(4.0));
                let d = angle_diff(h.ang, 0.0);
                if d.abs() > 0.08 {
                    inp.held |= if d > 0.0 { btn::ROT_L } else { btn::ROT_R };
                }
                inp.held |= btn::USE;
                Some(inp)
            }
            _ => None,
        }
    }
}
