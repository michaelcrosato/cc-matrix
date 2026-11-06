//! Lacrimosa, 6/8. A crown with six teardrop sacs on stems. They swell and burst into caustic
//! pools. Laser a stem to drop a sac whole, or Suction it slowly for a lower rating. A cleared wave
//! opens the crown's eye: Scalpel across it, twice. Three waves, each faster; then tear out the eye
//! with Forceps and Gel the bed.

use glam::Vec2;

use super::Strain;
use crate::frame::SimEvent;
use crate::games::surgery::Surgery;
use crate::games::surgery::cue;
use crate::games::surgery::field::{Hazard, HazardKind};

/// Beats the eye holds open for each stroke.
const EYE_BEATS: f32 = 7.0;

impl Surgery {
    pub(super) fn lacrimosa_start(&mut self, st: &mut Strain, events: &mut Vec<SimEvent>) {
        self.heart.meter = 6;
        let at = st.center;
        self.add_hazard(Hazard { kind: HazardKind::Crown, pos: at, r: 1.25, ..Default::default() });
        st.eye = self.add_hazard(Hazard { kind: HazardKind::Eye, pos: at, r: 0.75, required: true, ..Default::default() });
        self.spawn_sacs(st, st.count, events);
    }

    fn spawn_sacs(&mut self, st: &mut Strain, n: u32, events: &mut Vec<SimEvent>) {
        let at = st.center;
        for k in 0..n {
            let a = k as f32 * std::f32::consts::TAU / n as f32 + st.wave as f32 * 0.4 + 0.3;
            let dir = Vec2::new(a.cos() * 1.5, a.sin());
            let stem = at + dir * 1.15;
            let sac = at + dir * 2.5;
            let lag = self.rand() * 0.25;
            self.add_hazard(Hazard {
                kind: HazardKind::Sac,
                pos: sac,
                to: stem,
                r: 0.3,
                progress: lag,
                axis: a,
                required: true,
                group: st.wave as u16,
                ..Default::default()
            });
        }
        self.cue_at(events, cue::STINGER, at);
    }

    pub(super) fn lacrimosa_tick(&mut self, st: &mut Strain, dt: f32, _beat: bool, events: &mut Vec<SimEvent>) {
        // Each wave swells faster.
        let speed = self.strain_speed(st.speed) * (1.0 + st.wave as f32 * 0.22);
        let swell = dt * speed / (st.beats * 60.0 / 72.0);
        let mut burst = Vec::new();
        for h in self.op.hazards.iter_mut().filter(|h| h.kind == HazardKind::Sac) {
            h.progress += swell;
            h.r = 0.3 + h.progress.min(1.0) * 0.42;
            h.t += dt;
            if h.progress >= 1.0 {
                burst.push(h.id);
            }
        }
        for id in burst {
            let Some(h) = self.hazard(id).cloned() else { continue };
            self.op.hazards.retain(|x| x.id != id);
            for s in &mut self.surgeons {
                if s.engaged == id {
                    s.engaged = 0;
                }
            }
            self.add_hazard(Hazard { kind: HazardKind::Pool, pos: h.pos, r: 1.05, drain: 0.3, tag: 1, ..Default::default() });
            self.add_hazard(Hazard { kind: HazardKind::Burn, pos: h.pos, r: 0.65, required: false, ..Default::default() });
            self.cue_at(events, cue::BURST, h.pos);
            self.op.counters.bump("sac_burst");
            self.op.shake = self.op.shake.max(0.6);
            self.callout("burst");
            self.lacrimosa_killed(st, &h, events);
        }
    }

    pub(super) fn lacrimosa_killed(&mut self, st: &mut Strain, h: &Hazard, events: &mut Vec<SimEvent>) {
        match h.kind {
            HazardKind::Sac => {
                st.kills += 1;
                let left = self.op.hazards.iter().filter(|x| x.kind == HazardKind::Sac).count();
                if left == 0 {
                    self.open_eye(st, events);
                }
            }
            HazardKind::Eye => {
                // Torn out and gelled: it's over.
                st.done = true;
                self.op.hazards.retain(|x| x.kind != HazardKind::Crown);
                self.cue_at(events, cue::STINGER, h.pos);
                self.op.counters.bump("eye_torn_out");
            }
            _ => {}
        }
    }

    fn open_eye(&mut self, st: &mut Strain, events: &mut Vec<SimEvent>) {
        let eye = st.eye;
        if let Some(h) = self.hazard_mut(eye) {
            h.stage = 1;
            h.count = 0;
        }
        self.op.counters.bump("eye_opened");
        self.cue_at(events, cue::RIPPLE, st.center);
        self.callout("eye_open");
        self.spawn_eye_stroke(st);
    }

    fn spawn_eye_stroke(&mut self, st: &mut Strain) {
        let eye = st.eye;
        let n = self.hazard(eye).map(|h| h.count).unwrap_or(0);
        let a = 0.6 + n as f32 * 1.4 + st.wave as f32;
        let d = Vec2::new(a.cos() * 1.5, a.sin()) * 1.15;
        let life = self.heart.period() * EYE_BEATS / self.difficulty().strain;
        self.add_hazard(Hazard {
            kind: HazardKind::Incision,
            pts: vec![st.center - d, st.center + d],
            pos: st.center,
            parent: eye,
            life,
            required: true,
            ..Default::default()
        });
    }

    pub(super) fn lacrimosa_eye_cut(&mut self, st: &mut Strain, eye: u32, events: &mut Vec<SimEvent>) {
        let n = {
            let Some(h) = self.hazard_mut(eye) else { return };
            h.count += 1;
            h.count
        };
        self.op.counters.bump("eye_cut");
        if n < 2 {
            self.spawn_eye_stroke(st);
            return;
        }
        st.wave += 1;
        if let Some(h) = self.hazard_mut(eye) {
            h.count = 0;
            h.stage = 0;
        }
        if st.wave >= st.waves {
            if let Some(h) = self.hazard_mut(eye) {
                h.stage = 2;
                h.axis = -std::f32::consts::FRAC_PI_2;
            }
            self.say("bashir", "Forceps. Take the eye. All of it.");
            return;
        }
        self.op.shake = 0.7;
        let count = st.count;
        self.spawn_sacs(st, count, events);
    }

    pub(super) fn lacrimosa_eye_missed(&mut self, st: &mut Strain, eye: u32, events: &mut Vec<SimEvent>) {
        // It closes, and weeps again.
        if let Some(h) = self.hazard_mut(eye) {
            h.stage = 0;
            h.count = 0;
        }
        self.op.counters.bump("eye_missed");
        self.say("bashir", "It closed. Here they come again.");
        let n = (st.count / 2).max(2);
        self.spawn_sacs(st, n, events);
    }
}
