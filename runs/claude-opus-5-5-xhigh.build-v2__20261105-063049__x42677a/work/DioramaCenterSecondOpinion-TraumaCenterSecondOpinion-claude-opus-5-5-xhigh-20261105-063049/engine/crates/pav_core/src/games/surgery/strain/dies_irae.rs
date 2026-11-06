//! Dies Irae, 5/4. A Fever meter fills. Embers heat the tissue, and on every fifth beat a heat ring
//! sweeps the field: a held trigger scorches. Cryoprobe an ember, Scalpel to crack it, Forceps the
//! three pieces out; each removal cools the Fever. Midway two embers merge and roam. Last, an
//! incision reveals the furnace beneath: all tools in sequence.

use glam::Vec2;

use super::Strain;
use crate::frame::SimEvent;
use crate::games::surgery::Surgery;
use crate::games::surgery::cue;
use crate::games::surgery::field::{Hazard, HazardKind};
use crate::input::hands;

impl Surgery {
    pub(super) fn dies_irae_start(&mut self, st: &mut Strain, events: &mut Vec<SimEvent>) {
        self.heart.meter = if st.rings == 7 { 7 } else { 5 };
        if st.fever_rate > 0.0 {
            st.fever = Some(self.op.fever_start);
        }
        let n = st.count;
        for k in 0..n {
            let a = k as f32 * std::f32::consts::TAU / n as f32 - 1.2;
            let at = st.center + Vec2::new(a.cos() * 4.6, a.sin() * 2.5);
            self.add_hazard(Hazard { kind: HazardKind::Ember, pos: at, to: at, r: 0.6, required: true, ..Default::default() });
        }
        self.cue_at(events, cue::STINGER, st.center);
    }

    pub(super) fn dies_irae_tick(&mut self, st: &mut Strain, dt: f32, beat: bool, events: &mut Vec<SimEvent>) {
        let speed = self.strain_speed(st.speed);
        if let Some(f) = st.fever.as_mut() {
            *f += st.fever_rate * dt * speed;
            if *f > 100.0 {
                let burn = 6.0 * dt * self.difficulty().drain;
                *f = f.min(130.0);
                self.hurt(burn);
                self.op.counters.bump("fever_over");
            }
        }
        // The rings: a count-in, then a sweep.
        if st.rings > 0 && st.ring.is_none() && beat {
            st.ring_beat += 1;
            let left = st.rings.saturating_sub(st.ring_beat);
            if left == 2 || left == 1 {
                self.cue_at(events, cue::TICK, Vec2::ZERO);
                if left == 1 {
                    self.say_short("lift_off");
                }
            }
            if left == 0 {
                st.ring_beat = 0;
                st.ring = Some(0.0);
                self.cue_at(events, cue::RING, st.center);
                self.op.counters.bump("ring_sweep");
            }
        }
        if let Some(r) = st.ring {
            let next = r + dt * 15.0 * speed.max(0.6);
            let center = st.center;
            let crossing: Vec<usize> = (0..4)
                .filter(|&i| {
                    let s = &self.surgeons[i];
                    let d = s.cursor.distance(center);
                    s.present && !s.bot && s.using && self.last_held[i] & hands::USE != 0 && d >= r && d < next
                })
                .collect();
            for slot in crossing {
                let at = self.surgeons[slot].cursor;
                self.add_hazard(Hazard { kind: HazardKind::Burn, pos: at, r: 0.75, required: false, ..Default::default() });
                self.surgeons[slot].chain = 0;
                self.mistake(slot);
                self.hurt(2.5);
                self.cue_at(events, cue::SCORCH, at);
                self.op.counters.bump("ring_scorch");
                self.callout("scorched");
            }
            st.ring = (next < 14.0).then_some(next);
        }
        // Embers heat the tissue, and the roaming one wanders.
        st.burns_t += dt;
        if st.burns_t > 14.0 {
            st.burns_t = 0.0;
            let burns = self.op.hazards.iter().filter(|h| h.kind == HazardKind::Burn).count();
            let ember = self.op.hazards.iter().find(|h| h.kind == HazardKind::Ember && h.stage == 0).map(|h| h.pos);
            if let (true, Some(at)) = (burns < 4, ember) {
                let d = Vec2::from_angle(self.rand() * 6.28) * 1.1;
                self.add_hazard(Hazard { kind: HazardKind::Burn, pos: at + d, r: 0.55, required: false, ..Default::default() });
            }
        }
        let mut retarget = Vec::new();
        for h in self.op.hazards.iter_mut().filter(|h| h.kind == HazardKind::Ember && h.tag == 8 && h.stage == 0 && h.by == 0) {
            let step = 0.7 * dt * speed;
            let d = h.to - h.pos;
            if d.length() < 0.2 {
                retarget.push(h.id);
            } else {
                h.pos += d.normalize() * step;
            }
        }
        for id in retarget {
            let to = self.field_spot(st.center, id);
            if let Some(h) = self.hazard_mut(id) {
                h.to = to;
            }
        }
        // The furnace: when the opening incision is done.
        if st.stage == 1 && self.op.incisions_done >= 1 {
            st.stage = 2;
            self.op.incisions_done = 0;
            let at = st.center;
            self.set_plate("furnace", at);
            self.add_hazard(Hazard { kind: HazardKind::Furnace, pos: at, r: 1.7, required: true, ..Default::default() });
            self.op.shake = 1.0;
            self.op.push = 1.0;
            self.op.push_at = at;
            self.say("pet", "There you are. Every instrument, young man. In order. Cold, cut, lift, burn, soothe, close.");
            self.cue_at(events, cue::STINGER, at);
            self.op.counters.bump("furnace_revealed");
        }
    }

    pub(super) fn dies_irae_killed(&mut self, st: &mut Strain, h: &Hazard, events: &mut Vec<SimEvent>) {
        match h.kind {
            HazardKind::Ember => {
                st.kills += 1;
                if let Some(f) = st.fever.as_mut() {
                    *f = (*f - 22.0).max(0.0);
                }
                self.op.counters.bump("ember_out");
                let embers = self.op.hazards.iter().filter(|x| x.kind == HazardKind::Ember).count();
                // Midway: the next two left merge and roam.
                if st.kills == 2 && st.count >= 4 && !self.op.embers_merged {
                    // The least worked-on two, however far the player has got with them: whatever
                    // was done to them melts away, so nobody skips this by freezing everything first.
                    let mut left: Vec<(u8, u32)> =
                        self.op.hazards.iter().filter(|x| x.kind == HazardKind::Ember).map(|x| (x.stage, x.id)).collect();
                    left.sort_unstable();
                    if let [(_, keep), (_, gone), ..] = left[..] {
                        self.op.embers_merged = true;
                        let (a, b) = (self.hazard(keep).unwrap().pos, self.hazard(gone).unwrap().pos);
                        self.op.hazards.retain(|x| x.id != gone && x.parent != keep && x.parent != gone);
                        let alive: Vec<u32> = self.op.hazards.iter().map(|x| x.id).collect();
                        for s in &mut self.surgeons {
                            if s.engaged == keep || !alive.contains(&s.engaged) {
                                s.engaged = 0;
                            }
                        }
                        let to = self.field_spot(st.center, 4);
                        let m = self.hazard_mut(keep).unwrap();
                        m.pos = a.lerp(b, 0.5);
                        m.to = to;
                        m.r = 0.9;
                        m.tag = 8;
                        m.stage = 0;
                        m.locked = false;
                        m.heat = 0.0;
                        m.by = 0;
                        self.op.counters.bump("embers_merged");
                        self.say("pet", "Two became one and it has learned to walk. Lovely. Keep your hands up.");
                        self.cue_at(events, cue::STINGER, h.pos);
                    }
                }
                if embers == 0 && st.stage == 0 {
                    if st.furnace {
                        st.stage = 1;
                        self.op.incisions_done = 0;
                        let c = st.center;
                        self.add_hazard(Hazard {
                            kind: HazardKind::Incision,
                            pts: vec![
                                c + Vec2::new(-3.2, 0.5),
                                c + Vec2::new(-1.0, -0.2),
                                c + Vec2::new(1.2, 0.2),
                                c + Vec2::new(3.2, -0.4),
                            ],
                            pos: c,
                            required: true,
                            ..Default::default()
                        });
                        self.say("pet", "It's not the embers. It's what they were feeding. Open her up.");
                    } else {
                        st.done = true;
                    }
                }
            }
            HazardKind::Furnace => {
                st.done = true;
                st.fever = st.fever.map(|f| f.min(10.0));
                self.op.counters.bump("furnace_out");
                self.cue_at(events, cue::STINGER, h.pos);
            }
            _ => {}
        }
    }
}
