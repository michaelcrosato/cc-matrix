//! Libera Me's own acts. The strain stops the heart on purpose: three shocks, each on a ghost beat.
//! Then the Soloist surfaces: Scalpel strokes on the beat, nearly a rhythm game, and a long tendril
//! pulled only in diastole, a tug-of-war with the pulse.

use glam::Vec2;

use super::Strain;
use crate::frame::SimEvent;
use crate::games::surgery::Surgery;
use crate::games::surgery::cue;
use crate::games::surgery::field::{Hazard, HazardKind};

impl Surgery {
    pub(super) fn shocks_tick(&mut self, st: &mut Strain, dt: f32, _events: &mut Vec<SimEvent>) {
        match st.stage {
            0 => {
                st.t -= dt;
                if st.t <= 0.0 {
                    st.stage = 1;
                    self.start_code(true, st.count.min(9) as u8);
                }
            }
            _ => st.done = true,
        }
    }

    pub(super) fn soloist_start(&mut self, st: &mut Strain, events: &mut Vec<SimEvent>) {
        self.heart.meter = 4;
        st.stage = 0;
        st.kills = 0;
        self.op.shake = 1.0;
        self.cue_at(events, cue::STINGER, st.center);
        self.op.counters.bump("soloist");
    }

    pub(super) fn soloist_tick(&mut self, st: &mut Strain, dt: f32, beat: bool, events: &mut Vec<SimEvent>) {
        let _ = dt;
        match st.stage {
            0 => {
                // Strokes appear on the beat: every other beat.
                if beat {
                    st.beat_n += 1;
                }
                if beat && st.beat_n % 2 == 1 && st.wave < st.count {
                    let k = st.wave;
                    st.wave += 1;
                    let a = k as f32 * 2.399;
                    let at = st.center + Vec2::new(a.cos() * 4.8, a.sin() * 2.4) * (0.4 + 0.6 * ((k % 3) as f32 / 2.0));
                    let dir = Vec2::from_angle(a + 1.2);
                    let life = self.heart.period() * st.beats / self.difficulty().strain;
                    self.add_hazard(Hazard {
                        kind: HazardKind::Incision,
                        pts: vec![at - dir * 1.1, at + dir * 1.1],
                        pos: at,
                        life,
                        tag: 7,
                        required: false,
                        ..Default::default()
                    });
                    self.cue_at(events, cue::TICK, at);
                }
                if st.wave >= st.count && !self.op.hazards.iter().any(|h| h.kind == HazardKind::Incision && h.tag == 7) {
                    st.stage = 1;
                    let c = st.center;
                    let mut pts = Vec::new();
                    for i in 0..=14 {
                        let t = i as f32 / 14.0;
                        pts.push(c + Vec2::new(-6.2 + t * 12.4, (t * 9.0).sin() * 1.8 + (t - 0.5) * 2.5));
                    }
                    self.add_hazard(Hazard { kind: HazardKind::Tendril, pos: c, pts, required: true, ..Default::default() });
                    self.say("pet", "There's its spine. Forceps. Pull when the heart lets you and not one moment before.");
                    self.op.shake = 1.0;
                    self.cue_at(events, cue::STINGER, c);
                    self.op.counters.bump("tendril");
                }
            }
            _ => {}
        }
    }

    pub(super) fn soloist_killed(&mut self, st: &mut Strain, h: &Hazard, events: &mut Vec<SimEvent>) {
        if h.kind == HazardKind::Tendril {
            st.done = true;
            self.cue_at(events, cue::STINGER, h.pos);
            self.op.counters.bump("tendril_out");
        }
    }
}
