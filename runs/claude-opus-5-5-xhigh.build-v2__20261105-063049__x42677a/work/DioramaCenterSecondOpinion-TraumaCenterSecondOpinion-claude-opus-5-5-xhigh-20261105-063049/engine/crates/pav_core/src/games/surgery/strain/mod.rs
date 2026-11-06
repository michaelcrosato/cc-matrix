//! The strains: each a state machine in code, its numbers in the case's data.

mod dies_irae;
mod introit;
mod lacrimosa;
mod libera;

use glam::Vec2;
use serde::{Deserialize, Serialize};

use super::Surgery;
use super::content::StrainDef;
use super::field::{Hazard, HazardKind, Tool};
use super::tune;
use crate::frame::SimEvent;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum StrainKind {
    #[default]
    Introit,
    Lacrimosa,
    DiesIrae,
    Shocks,
    Soloist,
}

/// A strain in play.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Strain {
    pub kind: StrainKind,
    pub wave: u32,
    pub waves: u32,
    pub speed: f32,
    pub tough: f32,
    pub beats: f32,
    pub amen: bool,
    pub count: u32,
    pub rings: u32,
    pub fever_rate: f32,
    pub center: Vec2,
    pub furnace: bool,
    pub visible: bool,
    /// Sub-state of the machine.
    pub stage: u8,
    pub kills: u32,
    pub done: bool,
    /// Beats since the stage or the last stroke.
    pub beat_n: u32,
    pub fever: Option<f32>,
    pub ring: Option<f32>,
    pub ring_beat: u32,
    pub t: f32,
    pub eye: u32,
    pub burns_t: f32,
}

impl Strain {
    pub fn from_def(d: &StrainDef) -> Self {
        Self {
            kind: match d.kind.as_str() {
                "lacrimosa" => StrainKind::Lacrimosa,
                "dies_irae" => StrainKind::DiesIrae,
                "shocks" => StrainKind::Shocks,
                "soloist" => StrainKind::Soloist,
                _ => StrainKind::Introit,
            },
            waves: d.waves.max(1),
            speed: d.speed,
            tough: d.tough,
            beats: d.beats,
            amen: d.amen,
            count: d.count,
            rings: d.rings,
            fever_rate: d.fever,
            center: Vec2::new(d.at[0], d.at[1]),
            furnace: d.furnace,
            visible: d.visible,
            ..Default::default()
        }
    }
}

impl Surgery {
    /// How fast a strain runs this tick: its own number, the slider, the difficulty, the heart.
    pub(in crate::games::surgery) fn strain_speed(&self, own: f32) -> f32 {
        own * self.tune.get(tune::STRAIN_SPEED) * self.difficulty().strain * self.heart.strain_factor()
    }

    pub(super) fn strain_start(&mut self, def: &StrainDef, events: &mut Vec<SimEvent>) {
        let mut st = Strain::from_def(def);
        self.op.strain_tough = (def.tough * self.tune.get(tune::STRAIN_TOUGH)).max(0.05);
        match st.kind {
            StrainKind::Introit => self.introit_start(&mut st, events),
            StrainKind::Lacrimosa => self.lacrimosa_start(&mut st, events),
            StrainKind::DiesIrae => self.dies_irae_start(&mut st, events),
            StrainKind::Shocks => st.t = 1.4,
            StrainKind::Soloist => self.soloist_start(&mut st, events),
        }
        self.op.counters.bump(&format!("strain_{:?}", st.kind));
        self.op.strain = Some(st);
    }

    pub(super) fn strain_tick(&mut self, dt: f32, beat: bool, events: &mut Vec<SimEvent>) {
        let Some(mut st) = self.op.strain.take() else { return };
        if !st.done {
            match st.kind {
                StrainKind::Introit => self.introit_tick(&mut st, dt, beat, events),
                StrainKind::Lacrimosa => self.lacrimosa_tick(&mut st, dt, beat, events),
                StrainKind::DiesIrae => self.dies_irae_tick(&mut st, dt, beat, events),
                StrainKind::Shocks => self.shocks_tick(&mut st, dt, events),
                StrainKind::Soloist => self.soloist_tick(&mut st, dt, beat, events),
            }
        }
        self.op.strain = Some(st);
    }

    /// A strain's part was finished by a tool: the machine reacts.
    pub(super) fn strain_killed(&mut self, h: &Hazard, events: &mut Vec<SimEvent>) {
        let Some(mut st) = self.op.strain.take() else { return };
        match st.kind {
            StrainKind::Introit => self.introit_killed(&mut st, h, events),
            StrainKind::Lacrimosa => self.lacrimosa_killed(&mut st, h, events),
            StrainKind::DiesIrae => self.dies_irae_killed(&mut st, h, events),
            StrainKind::Soloist => self.soloist_killed(&mut st, h, events),
            StrainKind::Shocks => {}
        }
        self.op.strain = Some(st);
    }

    /// Something timed out (a pull window, a stroke, an eye).
    pub(super) fn hazard_expired(&mut self, id: u32, events: &mut Vec<SimEvent>) {
        let Some(h) = self.hazard(id).cloned() else { return };
        match h.kind {
            HazardKind::Nodule if h.stage == 1 => {
                // The shell grows back; it runs.
                let hh = self.hazard_mut(id).unwrap();
                hh.stage = 0;
                hh.life = 0.0;
                hh.count = 99;
                self.callout("missed_pull");
            }
            HazardKind::Incision => {
                self.op.hazards.retain(|x| x.id != id);
                for s in &mut self.surgeons {
                    if s.engaged == id {
                        s.engaged = 0;
                    }
                }
                if let Some(p) = self.hazard(h.parent).cloned() {
                    if p.kind == HazardKind::Eye {
                        self.eye_missed(p.id, events);
                        return;
                    }
                }
                if h.tag == 7 {
                    // A soloist stroke missed.
                    self.hurt(3.0);
                    if let Some(s) = self.op.strain.as_mut() {
                        s.kills += 1;
                    }
                    self.surgeons.iter_mut().for_each(|s| s.chain = 0);
                    self.cue_at(events, super::cue::TEAR, h.pos);
                    self.op.counters.bump("stroke_missed");
                }
            }
            _ => {
                self.op.hazards.retain(|x| x.id != id);
            }
        }
    }

    pub(super) fn tendril_pull(&mut self, slot: usize, id: u32, dt: f32, events: &mut Vec<SimEvent>) {
        let cursor = self.surgeons[slot].cursor;
        let diastole = self.heart.diastole();
        let Some(h) = self.hazard(id) else { return };
        let (len, from) = (h.len(), h.progress);
        let (s_on, dist) = super::field::polyline_project(&h.pts, cursor, from, (from + 1.2).min(len));
        if dist > 2.6 {
            self.release(slot);
            return;
        }
        let power = self.tune.get(super::tune::TOOL_POWER);
        let forward = s_on > from + 0.02;
        let pull_rate = 2.8 * power;
        let h = self.hazard_mut(id).unwrap();
        if diastole {
            if forward {
                h.progress = (from + pull_rate * dt).min(s_on);
            }
        } else if forward {
            // Pulling against the pulse: it fights back.
            h.progress = (from - 1.2 * dt).max(0.0);
            h.t += dt;
            if h.t > 0.25 {
                h.t = 0.0;
                h.err += 1.0;
                self.hurt(1.2);
                self.op.counters.bump("tendril_fought");
                let at = polyline_at_tip(self.hazard(id));
                self.cue_at(events, super::cue::TEAR, at);
                self.callout("diastole");
            }
        }
        let Some(h) = self.hazard(id) else { return };
        if h.progress >= len - 0.1 {
            let (err, pos) = (h.err, h.touch_point());
            let strict = self.tune.get(tune::STRICT);
            let rating = super::field::Rating::from_error(err, [0.5, 2.5, 6.0], strict);
            self.surgeons[slot].engaged = 0;
            self.cue_at(events, super::cue::POP, pos);
            self.award(slot, rating, Tool::Forceps, pos, false, events);
            let h = self.hazard(id).cloned().unwrap();
            self.op.hazards.retain(|x| x.id != id);
            self.op.counters.cleared(HazardKind::Tendril);
            self.strain_killed(&h, events);
        }
    }

    pub(super) fn eye_cut(&mut self, eye: u32, events: &mut Vec<SimEvent>) {
        let Some(mut st) = self.op.strain.take() else { return };
        self.lacrimosa_eye_cut(&mut st, eye, events);
        self.op.strain = Some(st);
    }

    fn eye_missed(&mut self, eye: u32, events: &mut Vec<SimEvent>) {
        let Some(mut st) = self.op.strain.take() else { return };
        self.lacrimosa_eye_missed(&mut st, eye, events);
        self.op.strain = Some(st);
    }

    pub(super) fn finish_ember(&mut self, id: u32, _slot: usize, events: &mut Vec<SimEvent>) {
        let Some(h) = self.hazard(id).cloned() else { return };
        self.op.hazards.retain(|x| x.id != id);
        self.op.counters.cleared(HazardKind::Ember);
        self.strain_killed(&h, events);
    }

    pub(super) fn furnace_step(&mut self, i: usize, events: &mut Vec<SimEvent>) {
        let id = self.op.hazards[i].id;
        let (stage, pos, r) = (self.op.hazards[i].stage, self.op.hazards[i].pos, self.op.hazards[i].r);
        self.op.counters.bump(&format!("furnace_{stage}"));
        let h = &mut self.op.hazards[i];
        h.progress = 0.0;
        h.heat = 0.0;
        h.by = 0;
        h.drag = Vec2::ZERO;
        match stage {
            0 => {
                h.stage = 1;
                let d = Vec2::new(1.0, 0.25).normalize() * (r + 0.6);
                self.add_hazard(Hazard {
                    kind: HazardKind::Incision,
                    pts: vec![pos - d, pos + d],
                    pos,
                    parent: id,
                    required: true,
                    tag: 3,
                    ..Default::default()
                });
            }
            1 => h.stage = 2,
            2 => h.stage = 3,
            3 => h.stage = 4,
            4 => {
                h.stage = 5;
                let d = Vec2::new(0.3, 1.0).normalize() * 1.2;
                h.pts = vec![pos - d, pos + d];
                h.last_s = 0.0;
                h.count = 0;
                h.err = 0.0;
            }
            _ => {
                let h = self.op.hazards.remove(i);
                self.op.counters.cleared(HazardKind::Furnace);
                self.strain_killed(&h, events);
            }
        }
    }
}

fn polyline_at_tip(h: Option<&Hazard>) -> Vec2 {
    h.map(|h| h.touch_point()).unwrap_or_default()
}
