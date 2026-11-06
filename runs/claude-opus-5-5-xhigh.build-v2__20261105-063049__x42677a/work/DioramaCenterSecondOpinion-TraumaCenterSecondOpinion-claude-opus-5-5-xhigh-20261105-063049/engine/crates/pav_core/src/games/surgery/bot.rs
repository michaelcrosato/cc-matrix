//! The bot: a task planner. It picks the most urgent valid task, selects the tool, moves at a human
//! cursor speed and performs the gesture, with noise scaled by skill. It is a pure function of the
//! game's state, so a replay of it is exact. It drives the tests, the balance tool, attract mode,
//! the Case 7 partner.

use glam::Vec2;

use super::Surgery;
use super::field::{Hazard, HazardKind, Tool, polyline_at};
use super::frame::Stage;
use crate::input::{SurgeonInput, hands};

/// A repeatable number in -1..1 from a seed.
fn noise(seed: f32) -> f32 {
    let x = (seed * 12.9898).sin() * 43758.547;
    (x - x.floor()) * 2.0 - 1.0
}

impl Surgery {
    fn bot_noise(&self, slot: usize, k: f32) -> Vec2 {
        let t = (self.op.clock * 3.0).floor() + slot as f32 * 31.0;
        Vec2::new(noise(t + k), noise(t + k + 57.0))
    }

    /// What a player of this skill presses this tick for this slot.
    pub fn bot_input(&self, slot: usize, skill: f32) -> SurgeonInput {
        let s = &self.surgeons[slot];
        let mut inp = SurgeonInput { active: true, aim: s.raw, tool: -1, pressure: 1.0, ..Default::default() };
        if skill <= 0.0 {
            return inp;
        }
        match self.stage {
            Stage::Code => return self.bot_code(slot, inp),
            Stage::Op => {}
            _ => return inp,
        }
        // A slower player takes a moment between tasks to see what's next, and sometimes more.
        if skill < 0.99 && s.engaged == 0 && !s.iv_on {
            let urgent = self.op.vitals < 25.0;
            let full = (1.0 - skill) * (1.0 - skill) * 7.0 * if urgent { 0.5 } else { 1.0 };
            // What's next decides how long: something slipping away gets a reaction, the next
            // target for the tool in hand a glance, and a change of tool the whole moment.
            let next = self.bot_pick(slot);
            let slipping = next.as_ref().is_some_and(|(h, _)| {
                h.as_ref().is_some_and(|h| {
                    matches!(h.kind, HazardKind::Nodule | HazardKind::Eye | HazardKind::Incision)
                        && (h.life > 0.0 || h.stage == 1)
                })
            });
            let same_tool = next.as_ref().is_some_and(|(_, tool)| *tool == s.tool);
            let pause = if slipping {
                (1.0 - skill) * 0.6
            } else if same_tool {
                full * 0.35
            } else {
                full
            };
            if self.op.clock - s.last_action < pause {
                return inp;
            }
            if !slipping {
                let think = noise((self.op.clock * 1.5).floor() + slot as f32 * 7.0);
                if think > 0.2 + skill {
                    return inp;
                }
            }
        }
        self.bot_gift(slot, &mut inp);
        if inp.held & hands::GIFT != 0 {
            return inp;
        }
        // Lift off for the heat ring: a good player counts it in.
        if let Some(st) = &self.op.strain {
            if st.rings > 0 && skill > 0.5 {
                let d = s.raw.distance(st.center);
                let lift = match st.ring {
                    Some(r) => d >= r - 0.5 && d < r + 4.0,
                    None => st.ring_beat + 1 >= st.rings && self.heart.phase > 0.75 && d < 3.5,
                };
                if lift {
                    return inp;
                }
            }
        }

        // Engaged: finish the gesture first.
        if s.engaged != 0 || s.iv_on {
            if self.bot_gesture(slot, skill, &mut inp) {
                return inp;
            }
        }
        // Urgent: the patient is going.
        let iv_ready = s.iv_cool <= 0.0;
        let threshold = 12.0 + 53.0 * skill;
        if iv_ready && self.op.vitals < threshold && self.ring_place(Tool::Iv).is_some() {
            if s.tool != Tool::Iv {
                inp.tool = self.ring_place(Tool::Iv).unwrap() as i8;
                return inp;
            }
            inp.held |= hands::USE;
            inp.pressed |= hands::USE;
            return inp;
        }

        let Some((target, tool)) = self.bot_pick(slot) else {
            // Nothing to do: drift back toward the middle.
            inp.aim = self.bot_step(slot, skill, Vec2::new(0.0, 0.5));
            return inp;
        };
        if s.tool != tool {
            match self.ring_place(tool) {
                Some(p) => inp.tool = p as i8,
                None => {
                    // Waiting for the dressing to come back to hand: head for the line.
                    if let Some(h) = &target {
                        inp.aim = self.bot_step(slot, skill, self.bot_touch(h, tool));
                    }
                    return inp;
                }
            }
            return inp;
        }
        let at = target.as_ref().map(|h| self.bot_touch(h, tool)).unwrap_or(Vec2::ZERO);
        inp.aim = self.bot_step(slot, skill, at);
        let dist = s.raw.distance(at);
        let reach = match tool {
            Tool::Suction | Tool::Gel => 0.8,
            Tool::Scanner => 1.8,
            _ => 0.28,
        };
        if dist < reach {
            inp.aim = at;
            inp.held |= hands::USE;
            if !s.using {
                inp.pressed |= hands::USE;
            }
            if tool == Tool::Gel && s.flow < 0.08 {
                inp.held &= !hands::USE;
                inp.pressed &= !hands::USE;
            }
            if tool == Tool::Laser || tool == Tool::Cryo {
                if let Some(h) = &target {
                    if h.by != 0 && h.by != slot as u8 + 1 {
                        inp.held &= !hands::USE;
                    }
                }
            }
        }
        inp
    }

    /// What slot 0's bot would press now: tests drive the real pad and mouse with this, so the
    /// whole input path gets played through, not just the sim.
    pub fn wish_json(&self) -> serde_json::Value {
        let w = self.bot_input(0, self.bot_skill);
        let s = &self.surgeons[0];
        serde_json::json!({
            "aim": [w.aim.x, w.aim.y],
            "held": w.held,
            "tool": w.tool,
            "rotate": w.rotate,
            "place": self.ring_place(s.tool),
            "ghost": self.op.code.as_ref().map(|c| c.ghost),
            "charge": s.charge,
        })
    }

    fn ring_place(&self, tool: Tool) -> Option<usize> {
        self.op.ring.iter().position(|t| *t == tool)
    }

    /// One tick's travel toward a point, at a human cursor speed.
    fn bot_step(&self, slot: usize, skill: f32, to: Vec2) -> Vec2 {
        let from = self.surgeons[slot].raw;
        let speed = (3.0 + 16.0 * skill * skill) / 60.0;
        let d = to - from;
        if d.length() <= speed { to } else { from + d.normalize() * speed }
    }

    fn bot_touch(&self, h: &Hazard, tool: Tool) -> Vec2 {
        match (h.kind, tool) {
            (HazardKind::Sac, Tool::Laser) => h.pos.lerp(h.to, 0.5),
            (HazardKind::Sac, _) => h.pos,
            (HazardKind::Bleeder, _) => h.pts.first().copied().unwrap_or(h.pos),
            _ => h.touch_point(),
        }
    }

    /// The most urgent task for this slot, and the instrument for it.
    fn bot_pick(&self, slot: usize) -> Option<(Option<Hazard>, Tool)> {
        let cursor = self.surgeons[slot].raw;
        let mut best: Option<(f32, Option<Hazard>, Tool)> = None;
        let has = |t: Tool| self.ring_place(t).is_some();
        // A person finishes what's in hand before picking up something else.
        let keep = |t: Tool| if t == self.surgeons[slot].tool { 10.0 } else { 0.0 };
        // Something hidden that a task needs: look for it once what's already found is dealt with,
        // and after the wounds. The bot knows where to sweep.
        let found = self.op.hazards.iter().any(|h| h.hidden && h.reveal > 1.0 && h.required && !self.covered(h));
        for h in &self.op.hazards {
            if !found && h.hidden && h.reveal <= 0.0 && h.required && has(Tool::Scanner) {
                let score = 22.0 - h.pos.distance(cursor) * 0.2 + keep(Tool::Scanner);
                if best.as_ref().is_none_or(|b| score > b.0) {
                    best = Some((score, Some(h.clone()), Tool::Scanner));
                }
            }
        }
        // The closing dressing, once it is in hand.
        if self.op.forced_tool == Some(Tool::Dressing) {
            let h = self.op.hazards.iter().find(|h| h.kind == HazardKind::Closure)?;
            return Some((Some(h.clone()), Tool::Dressing));
        }
        for h in &self.op.hazards {
            if h.by != 0 && h.by != slot as u8 + 1 {
                continue;
            }
            if h.kind == HazardKind::Crown {
                continue;
            }
            if self.covered(h) {
                // Clear the pool over it first.
                if let Some(p) = self.op.hazards.iter().find(|p| p.kind == HazardKind::Pool && p.pos.distance(h.pos) < p.r * 0.92)
                {
                    let score = 34.0 - p.pos.distance(cursor) + keep(Tool::Suction);
                    if best.as_ref().is_none_or(|b| score > b.0) {
                        best = Some((score, Some(p.clone()), Tool::Suction));
                    }
                }
                continue;
            }
            let Some(tool) = self.bot_tool_for(h) else { continue };
            if !has(tool) {
                continue;
            }
            let urgency = match h.kind {
                HazardKind::Nodule if h.stage == 1 => 100.0,
                HazardKind::Incision if h.life > 0.0 => 90.0,
                HazardKind::Sac => 44.0 + h.progress * 40.0,
                HazardKind::Bleeder => 60.0,
                HazardKind::Nodule => 44.0,
                HazardKind::Laceration => 30.0,
                HazardKind::Pool if h.r > 1.25 => 26.0,
                HazardKind::Pool => {
                    if h.required {
                        24.0
                    } else {
                        8.0
                    }
                }
                HazardKind::Burn => 20.0,
                _ => 28.0,
            };
            let score = urgency - h.touch_point().distance(cursor) * 1.2 + keep(tool);
            if best.as_ref().is_none_or(|b| score > b.0) {
                best = Some((score, Some(h.clone()), tool));
            }
        }
        best.map(|b| (b.1, b.2))
    }

    fn bot_tool_for(&self, h: &Hazard) -> Option<Tool> {
        // Sacs: the stem, with the laser. The rest ask.
        if h.kind == HazardKind::Sac {
            return Some(if self.ring_place(Tool::Laser).is_some() { Tool::Laser } else { Tool::Suction });
        }
        h.wants()
    }

    /// Carries on what the hands are doing. False: nothing to carry on.
    fn bot_gesture(&self, slot: usize, skill: f32, inp: &mut SurgeonInput) -> bool {
        let s = &self.surgeons[slot];
        let n = (1.0 - skill).max(0.0);
        if s.iv_on {
            let release = 0.88 + self.bot_noise(slot, 3.0).x * 0.12 * n;
            if s.dose < release {
                inp.held |= hands::USE;
            }
            inp.aim = s.raw;
            return true;
        }
        let Some(h) = self.hazard(s.engaged) else { return false };
        match s.tool {
            Tool::Scalpel | Tool::Dressing => {
                let (p, t) = polyline_at(&h.pts, h.progress + 0.3 + skill * 0.2);
                let side = Vec2::new(-t.y, t.x) * self.bot_noise(slot, 1.0).x * (0.05 + n * 0.95);
                inp.aim = p + side;
                inp.held |= hands::USE;
            }
            Tool::Forceps => match h.kind {
                HazardKind::Bone => {
                    inp.aim = self.bot_step(slot, skill.max(0.6), h.to);
                    inp.held |= hands::USE;
                    let d = super::field::angle_diff(h.axis, h.angle);
                    if d.abs() > 0.05 {
                        inp.rotate = if d > 0.0 { 1 } else { -1 };
                    }
                }
                HazardKind::Tendril => {
                    let (p, _) = polyline_at(&h.pts, h.progress + 0.8);
                    let wait = !self.heart.diastole() && n < 0.5;
                    inp.aim = if wait { polyline_at(&h.pts, h.progress).0 } else { p };
                    inp.held |= hands::USE;
                }
                _ => {
                    let wobble = self.bot_noise(slot, 2.0).x * n * 1.2;
                    let d = Vec2::from_angle(h.axis + wobble);
                    inp.aim = self.bot_step(slot, skill.max(0.5), s.grab + d * 1.2);
                    inp.held |= hands::USE;
                }
            },
            Tool::Suture => {
                let (needle, t) = polyline_at(&h.pts, h.progress);
                let normal = Vec2::new(-t.y, t.x);
                let go = if s.side >= 0 { -1.0 } else { 1.0 };
                let along = 0.5 + self.bot_noise(slot, 4.0).x * n * 0.45;
                let to = needle + t * along + normal * go * 0.55;
                let v = (10.0 + 16.0 * skill) / 60.0;
                let d = to - s.raw;
                inp.aim = if d.length() <= v { to } else { s.raw + d.normalize() * v };
                inp.held |= hands::USE;
            }
            Tool::Laser | Tool::Cryo => {
                let release = 0.93 + self.bot_noise(slot, 5.0).x * 0.2 * n;
                inp.aim = s.raw;
                if h.heat < release {
                    inp.held |= hands::USE;
                }
            }
            _ => return false,
        }
        true
    }

    /// Hold the gift when it's ready; let go on the beat.
    fn bot_gift(&self, slot: usize, inp: &mut SurgeonInput) {
        let s = &self.surgeons[slot];
        if !self.op.gift_awake || self.gifts.hush_beats > 0.0 || self.gifts.echo_t > 0.0 {
            if s.gift_hold {
                // Let go.
            }
            return;
        }
        if s.engaged != 0 {
            return;
        }
        if s.gift >= 100.0 {
            let hit = self.heart.on_beat(self.tune.get(super::tune::BEAT_WINDOW));
            if s.gift_hold && hit {
                return; // release now
            }
            if s.gift_hold || self.heart.phase > 0.45 {
                inp.held |= hands::GIFT;
                if !s.gift_hold {
                    inp.pressed |= hands::GIFT;
                }
            }
        }
    }

    fn bot_code(&self, slot: usize, mut inp: SurgeonInput) -> SurgeonInput {
        let Some(c) = &self.op.code else { return inp };
        let s = &self.surgeons[slot];
        // Time the charge to end as the ghost crosses the line.
        if s.charging {
            if s.charge >= 1.0 && (c.ghost - 0.5).abs() < 0.03 {
                return inp;
            }
            inp.held |= hands::DEFIB;
        } else {
            let until = (0.5 - c.ghost).rem_euclid(1.0) * 1.1;
            if (until - 1.25).abs() < 0.03 || c.ghost > 0.5 && c.ghost < 0.53 {
                inp.held |= hands::DEFIB;
                inp.pressed |= hands::DEFIB;
            }
        }
        inp
    }
}
