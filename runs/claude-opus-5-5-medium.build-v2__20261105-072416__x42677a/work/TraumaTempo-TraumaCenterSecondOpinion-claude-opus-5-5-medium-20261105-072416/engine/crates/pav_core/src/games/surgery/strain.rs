//! The strains of R.E.Q.U.I.E.M., each a state machine that keeps time on the heart, plus the
//! Soloist, the long tendril and the Code Blue director. Numbers come from the phase's `params`.

use std::collections::BTreeMap;

use glam::Vec2;
use serde::{Deserialize, Serialize};

use super::cue;
use super::field::{Hazard, Kind, Op, Rating, Rules, stitches_for, sub};

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum StrainKind {
    #[default]
    Introit,
    Lacrimosa,
    Dies,
    Soloist,
    Tendril,
    Director,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Strain {
    pub kind: StrainKind,
    pub step: u8,
    pub wave: u8,
    pub waves: u8,
    pub mini: bool,
    pub count: u8,
    /// Spare counters: beats since, strokes done, spawn budget...
    pub beats: f32,
    pub done: u16,
    pub need: u16,
    pub t: f32,
    pub budget: f32,
    pub interval: f32,
    pub eye: u32,
    /// Introit: the Hush woke.
    pub woke: bool,
    pub merged: bool,
    pub hazard_id: u32,
    /// More rounds after the first; parts still to emerge, one every few beats; how many so far.
    pub rounds: u8,
    pub left: u8,
    pub emerged: u8,
    pub gap: f32,
}

impl Strain {
    pub fn start(name: &str, params: &BTreeMap<String, f32>) -> Strain {
        let num = |k: &str, d: f32| params.get(k).copied().unwrap_or(d);
        let kind = match name {
            "lacrimosa" => StrainKind::Lacrimosa,
            "dies" => StrainKind::Dies,
            "soloist" => StrainKind::Soloist,
            "tendril" => StrainKind::Tendril,
            "director" => StrainKind::Director,
            _ => StrainKind::Introit,
        };
        Strain {
            kind,
            waves: num("waves", 3.0) as u8,
            mini: num("mini", 0.0) > 0.0,
            count: num("count", 0.0) as u8,
            need: num("need", 0.0) as u16,
            budget: num("budget", 1.0),
            interval: num("interval", 7.0),
            rounds: num("rounds", 0.0) as u8,
            ..Default::default()
        }
    }
}

/// How many beats of a strain's clock a heartbeat is worth: its speed-up stops at ×1.4 however
/// fast the heart runs, so failure doesn't spiral unfairly.
fn beat_worth(op: &Op, rules: &Rules) -> f32 {
    let over = (op.heart.bpm / 72.0).max(1.0);
    (1.4 / over).min(1.0) * rules.tune.strain_speed * rules.diff.strain()
}

fn beat_secs(op: &Op) -> f32 {
    op.heart.period()
}

impl Op {
    pub(super) fn start_strain(&mut self, rules: &Rules) {
        let Some(mut s) = self.strain.take() else { return };
        self.cue(cue::STING, Vec2::ZERO, 1.0, 1.0);
        match s.kind {
            StrainKind::Introit => {
                if s.mini {
                    let n = s.count.max(2);
                    for k in 0..n {
                        let at = Vec2::new(-3.0 + k as f32 * 3.0, -1.0 + (k % 2) as f32 * 2.0);
                        self.add(nodule(at, 0, false, 0.7));
                    }
                    s.step = 2;
                } else {
                    self.add(nodule(Vec2::new(0.5, 0.2), 0, true, 1.2));
                }
            }
            StrainKind::Lacrimosa => {
                s.eye = self.add(Hazard { kind: Kind::Eye, a: Vec2::new(0.0, -0.2), r: 0.9, blocking: true, ..Default::default() });
                s.left = if s.count > 0 { s.count } else { 6 };
                s.emerged = 0;
            }
            StrainKind::Dies => {
                self.fever = Some(self.fever.unwrap_or(20.0));
                let n = if s.count > 0 { s.count } else { 5 };
                s.left = n;
                s.emerged = 0;
            }
            StrainKind::Soloist => {
                s.need = if s.need > 0 { s.need } else { 8 };
                s.beats = 2.0;
                self.set_banner("THE SOLOIST");
            }
            StrainKind::Tendril => {
                s.hazard_id = self.add(Hazard {
                    kind: Kind::Tendril,
                    a: Vec2::new(-0.6, 0.0),
                    b: Vec2::new(-4.8, -2.0),
                    ang: (Vec2::new(-4.8, -2.0) - Vec2::new(-0.6, 0.0)).to_angle(),
                    r: 0.5,
                    blocking: true,
                    drain: 0.6,
                    ..Default::default()
                });
            }
            StrainKind::Director => {
                s.t = 0.0;
                s.beats = 0.0;
            }
        }
        self.strain = Some(s);
    }

    /// One sac comes up on its stem.
    fn emerge_sac(&mut self, s: &mut Strain) {
        let crown = Vec2::new(0.0, -0.2);
        let total = s.left as f32 + s.emerged as f32;
        let a = s.emerged as f32 / total.max(1.0) * std::f32::consts::TAU + s.wave as f32 * 0.5;
        let at = crown + Vec2::new(a.cos() * 4.1, a.sin() * 2.7);
        s.emerged += 1;
        s.left -= 1;
        let start = 0.05 + self.rng.f32() * 0.1;
        let beats = (10.0 + self.rng.f32() * 4.0) * (1.0 - (s.wave as f32 * 0.08).min(0.4));
        self.cue(cue::SQUISH, at, 0.6, 1.3);
        self.add(Hazard {
            kind: Kind::Sac,
            a: at,
            b: crown,
            r: 0.35,
            prog: start,
            beats: 0.0,
            fill_time: 0.6,
            drain: 0.15,
            blocking: true,
            // Each sac swells over 10 to 14 beats, sooner in later waves.
            deadline: beats,
            ..Default::default()
        });
    }

    /// Runs once per tick with world time.
    pub(super) fn strain_tick(&mut self, world: f32, rules: &Rules) {
        let r_wave = self.heart.r_wave;
        let worth = beat_worth(self, rules);
        // Fever rises while a Dies Irae burns.
        if let Some(f) = self.fever {
            let burning = self.hazards.iter().any(|h| matches!(h.kind, Kind::Ember | Kind::Furnace));
            if burning {
                let embers = self.hazards.iter().filter(|h| h.kind == Kind::Ember).count() as f32;
                self.fever = Some(f + world * (0.7 + embers * 0.3) * rules.tune.strain_speed * rules.diff.strain());
            } else {
                self.fever = Some((f - world * 6.0).max(0.0));
            }
        }
        self.heat_ring_tick(world, r_wave);

        let Some(kind) = self.strain.as_ref().map(|s| s.kind.clone()) else { return };
        match kind {
            StrainKind::Introit => self.introit_tick(r_wave, worth, rules),
            StrainKind::Lacrimosa => self.lacrimosa_tick(r_wave, worth, rules),
            StrainKind::Dies => self.dies_tick(r_wave, worth, rules),
            StrainKind::Soloist => self.soloist_tick(r_wave, worth, rules),
            StrainKind::Tendril => self.tendril_tick(world),
            StrainKind::Director => self.director_tick(world, r_wave, rules),
        }
    }

    fn heat_ring_tick(&mut self, world: f32, _r_wave: bool) {
        if let Some(r) = self.heat_ring {
            let next = r + world * 15.0;
            self.heat_ring = if next > 13.0 { None } else { Some(next) };
        }
        self.ring_warn = (self.ring_warn - world).max(0.0);
    }

    fn step_nodules(&mut self, r_wave: bool, worth: f32) {
        if !r_wave {
            return;
        }
        let mut moved = Vec::new();
        for h in &mut self.hazards {
            if h.kind != Kind::Nodule || h.stage == 2 {
                continue;
            }
            h.beats += worth;
            let step = if h.sub == sub::SMALL { 2.0 } else { 3.0 };
            h.telegraph = h.beats >= step - 1.0;
            if h.stage == 1 {
                // Popped: pull it within 2 beats or the shell grows back.
                if h.beats >= 2.0 {
                    h.stage = 0;
                    h.fill = 0.0;
                    h.beats = 0.0;
                    h.telegraph = false;
                }
                continue;
            }
            if h.beats >= step {
                h.beats = 0.0;
                h.telegraph = false;
                moved.push(h.id);
            }
        }
        for id in moved {
            self.step_nodule(id);
        }
    }

    fn step_nodule(&mut self, id: u32) {
        let Some(k) = self.find(id) else { return };
        let from = self.hazards[k].a;
        let a = self.rng.f32() * std::f32::consts::TAU;
        let d = self.rng.range(2.0, 3.6);
        let to = (from + Vec2::from_angle(a) * d).clamp(Vec2::new(-6.5, -2.7), Vec2::new(6.5, 3.4));
        let h = &mut self.hazards[k];
        h.a = to;
        h.fill = 0.0;
        self.cue(cue::SQUISH, to, 0.8, 0.8);
        // It leaves a wound behind, sometimes.
        let residue = self.hazards.iter().filter(|h| matches!(h.kind, Kind::Lacer | Kind::Pool) && !h.blocking).count();
        if residue < 3 {
            if self.rng.f32() < 0.5 {
                let dir = (to - from).normalize_or_zero();
                let len = 1.3;
                self.add(Hazard {
                    kind: Kind::Lacer,
                    a: from - dir * len * 0.5,
                    b: from + dir * len * 0.5,
                    drain: 0.6,
                    need: stitches_for(len),
                    blocking: false,
                    ..Default::default()
                });
            } else {
                self.add(Hazard { kind: Kind::Pool, a: from, r: 0.6, blocking: false, ..Default::default() });
            }
        }
    }

    fn introit_tick(&mut self, r_wave: bool, worth: f32, rules: &Rules) {
        self.step_nodules(r_wave, worth);
        let Some(mut s) = self.strain.take() else { return };
        // The Hush wakes under pressure, or at the second split.
        if !s.woke && self.gifts.locked && (self.vitals < 35.0 || s.step >= 2) {
            s.woke = true;
            self.gifts.locked = false;
            for slot in &mut self.slots {
                slot.gift = 100.0;
            }
            self.say("bashir", "Doctor... your hands.");
            self.cue(cue::HUSH, Vec2::ZERO, 0.6, 1.4);
            self.mark("hush:woke");
        }
        let left = self.hazards.iter().filter(|h| h.kind == Kind::Nodule).count();
        if left == 0 {
            match s.step {
                0 => {
                    // First kill: it splits in two.
                    self.say("mara", "It split. Bashir, it split!");
                    self.cue(cue::STING, Vec2::ZERO, 1.0, 1.1);
                    self.add(nodule(Vec2::new(-3.4, -1.4), 0, false, 0.72));
                    self.add(nodule(Vec2::new(3.2, 1.2), 0, false, 0.72));
                    s.step = 1;
                }
                1 => {
                    self.say("teddy", "That's four. Four little waltzers. I'd like it noted I hate this.");
                    self.cue(cue::STING, Vec2::ZERO, 1.0, 1.2);
                    let spots = [(-4.5, 1.8), (-1.5, -2.4), (1.8, 2.4), (4.6, -1.6)];
                    for (x, z) in spots {
                        let mut n = nodule(Vec2::new(x, z), sub::SMALL, false, 0.55);
                        n.r = 0.32;
                        self.add(n);
                    }
                    s.step = 2;
                }
                2 if s.rounds > 0 => {
                    // Another bar of the same: this time they hide, and step in from the edges.
                    s.rounds -= 1;
                    self.say("bashir", "More. Under the capsule. Scanner, Doctor.");
                    self.cue(cue::STING, Vec2::ZERO, 1.0, 1.2);
                    let spots = [(-5.5, -2.0), (-2.6, 2.6), (2.4, -2.6), (5.4, 2.0)];
                    for (x, z) in spots {
                        let mut n = nodule(Vec2::new(x, z), sub::SMALL, !s.mini, 0.6);
                        n.r = 0.36;
                        self.add(n);
                    }
                }
                2 if s.mini => {
                    self.strain = None;
                    return;
                }
                2 => {
                    // Amen: they merge, held by three tethers.
                    self.say("bashir", "They're merging. Cut the tethers. Then the laser, then pull.");
                    self.set_banner("AMEN");
                    self.cue(cue::STING, Vec2::ZERO, 1.2, 0.7);
                    let centre = Vec2::new(0.0, 0.0);
                    let mut big = nodule(centre, sub::AMEN, false, 1.2);
                    big.r = 0.95;
                    big.stage = 2;
                    self.add(big);
                    for k in 0..3 {
                        let a = k as f32 / 3.0 * std::f32::consts::TAU + 0.5;
                        let out = centre + Vec2::new(a.cos() * 4.0, a.sin() * 2.7);
                        let inner = centre + Vec2::new(a.cos() * 1.1, a.sin() * 0.9);
                        self.add(Hazard {
                            kind: Kind::Incision,
                            sub: sub::TETHER,
                            a: out,
                            b: inner,
                            c: (out + inner) * 0.5 + Vec2::new(0.25, -0.2),
                            blocking: true,
                            ..Default::default()
                        });
                    }
                    s.step = 3;
                }
                _ => {
                    self.say("bashir", "...Clean, Doctor.");
                    self.strain = None;
                    let _ = rules;
                    return;
                }
            }
        }
        self.strain = Some(s);
    }

    /// A tether or a Soloist/eye stroke was finished.
    pub(super) fn strain_stroke_done(&mut self, rules: &Rules) {
        let _ = rules;
        let Some(s) = &mut self.strain else { return };
        s.done += 1;
        if s.kind == StrainKind::Introit {
            let tethers = self.hazards.iter().any(|h| h.kind == Kind::Incision && h.sub == sub::TETHER);
            if !tethers {
                if let Some(h) = self.hazards.iter_mut().find(|h| h.kind == Kind::Nodule && h.stage == 2) {
                    h.stage = 0;
                    h.fill_time = 1.2;
                }
            }
        }
    }

    fn lacrimosa_tick(&mut self, r_wave: bool, worth: f32, _rules: &Rules) {
        let Some(mut s) = self.strain.take() else { return };
        if r_wave && s.left > 0 {
            s.gap -= worth;
            if s.gap <= 0.0 {
                s.gap = 3.0;
                self.emerge_sac(&mut s);
            }
        }
        if r_wave {
            let mut burst = Vec::new();
            for h in &mut self.hazards {
                if h.kind == Kind::Sac {
                    h.beats += worth;
                    h.prog = (h.beats / h.deadline.max(1.0)).clamp(0.05, 1.0);
                    if h.fill <= 0.0 {
                        h.r = 0.35 + h.prog * 0.5;
                    }
                    if h.prog >= 1.0 {
                        burst.push(h.id);
                    }
                }
            }
            for id in burst {
                if let Some(k) = self.find(id) {
                    let h = self.hazards.remove(k);
                    self.mark("lacrimosa:burst");
                    self.cue(cue::BURST, h.a, 1.0, 1.0);
                    self.shake = self.shake.max(0.4);
                    self.add(Hazard { kind: Kind::Pool, sub: sub::CAUSTIC, a: h.a, r: 0.85, drain: 0.12, blocking: false, ..Default::default() });
                    let patch_at = h.a * 0.8;
                    self.add(Hazard { kind: Kind::Patch, sub: sub::BURN, a: patch_at, r: 0.7, drain: 0.12, blocking: false, ..Default::default() });
                    self.call("sac_burst");
                }
            }
        }
        let sacs = self.hazards.iter().filter(|h| h.kind == Kind::Sac).count();
        let strokes = self.hazards.iter().filter(|h| h.kind == Kind::Incision && h.sub == sub::STROKE).count();
        match s.step {
            0 if sacs > 0 || s.left > 0 => {}
            0 => {
                // The crown's eye opens for 4 beats: two strokes across it.
                let beats = 6.0 * beat_secs(self).max(0.55) + 1.2;
                for dz in [-0.45f32, 0.45] {
                    let a = Vec2::new(-1.7, -0.2 + dz);
                    let b = Vec2::new(1.7, -0.2 + dz * 0.6);
                    self.add(Hazard {
                        kind: Kind::Incision,
                        sub: sub::STROKE,
                        a,
                        b,
                        c: (a + b) * 0.5,
                        blocking: true,
                        deadline: beats,
                        ..Default::default()
                    });
                }
                if let Some(k) = self.find(s.eye) {
                    self.hazards[k].prog = 1.0;
                }
                self.cue(cue::STING, Vec2::ZERO, 1.0, 1.3);
                self.say("teddy", "The eye! It's open! Doctor, it's looking at me!");
                s.step = 1;
                s.t = 0.0;
                s.done = 0;
            }
            1 => {
                // Time runs out: the eye closes, and another wave comes.
                let mut expired = false;
                let dt = self.time_scale / 60.0;
                for h in &mut self.hazards {
                    if h.kind == Kind::Incision && h.sub == sub::STROKE && h.deadline > 0.0 {
                        h.deadline -= dt;
                        if h.deadline <= 0.0 {
                            expired = true;
                        }
                    }
                }
                if expired {
                    self.hazards.retain(|h| !(h.kind == Kind::Incision && h.sub == sub::STROKE));
                    if let Some(k) = self.find(s.eye) {
                        self.hazards[k].prog = 0.0;
                    }
                    self.call("eye_closed");
                    // A smaller wave of the same.
                    s.left = 3;
                    s.emerged = 0;
                    s.gap = 0.0;
                    s.step = 0;
                } else if strokes == 0 {
                    if let Some(k) = self.find(s.eye) {
                        self.hazards[k].prog = 0.0;
                    }
                    s.wave += 1;
                    self.mark(&format!("lacrimosa:wave{}", s.wave.min(3)));
                    if s.wave >= s.waves {
                        if s.mini {
                            // Case 7: the sacs alone; the eye goes with them.
                            if let Some(k) = self.find(s.eye) {
                                self.hazards.remove(k);
                            }
                            self.strain = None;
                            return;
                        }
                        // Last: tear out the eye.
                        if let Some(k) = self.find(s.eye) {
                            self.hazards[k].stage = 1;
                            self.hazards[k].ang = -std::f32::consts::FRAC_PI_2;
                        }
                        self.say("bashir", "The eye, Doctor. Forceps. All the way out.");
                        s.step = 2;
                    } else {
                        // The flood comes with each wave.
                        for (x, z) in [(-5.0, 2.0), (5.0, -2.2)] {
                            self.add(Hazard { kind: Kind::Pool, a: Vec2::new(x, z), r: 0.9, blocking: false, ..Default::default() });
                        }
                        s.left = if s.count > 0 { s.count } else { 6 };
                        s.emerged = 0;
                        s.gap = 2.0;
                        s.step = 0;
                    }
                }
            }
            2 => {
                let eye = self.find(s.eye).is_some();
                if !eye {
                    // Gel the bed.
                    self.add(Hazard { kind: Kind::Patch, sub: sub::BURN, a: Vec2::new(0.0, -0.2), r: 1.1, blocking: true, ..Default::default() });
                    s.step = 3;
                }
            }
            _ => {
                if !self.hazards.iter().any(|h| h.kind == Kind::Patch && h.blocking) {
                    self.strain = None;
                    return;
                }
            }
        }
        self.strain = Some(s);
    }

    fn dies_tick(&mut self, r_wave: bool, worth: f32, rules: &Rules) {
        let Some(mut s) = self.strain.take() else { return };
        if r_wave {
            // Embers catch one at a time.
            if s.left > 0 {
                s.gap -= worth;
                if s.gap <= 0.0 {
                    s.gap = 4.0;
                    let spots = [(-4.6, -1.8), (4.4, -2.0), (-3.2, 2.2), (3.4, 2.4), (0.2, -2.8), (-0.4, 2.8)];
                    let (x, z) = spots[s.emerged as usize % 6];
                    s.emerged += 1;
                    s.left -= 1;
                    self.add(ember(Vec2::new(x, z), 0));
                    self.cue(cue::SIZZLE, Vec2::new(x, z), 0.8, 0.7);
                }
            }
            // Each bar's last beat sends a heat ring out; the beat before it counts in.
            let meter = self.heart.meter.max(2);
            let bar = self.heart.bar;
            if bar == meter - 1 {
                self.ring_warn = beat_secs(self);
                self.cue(cue::LIFT_OFF, Vec2::ZERO, 1.0, 1.0);
                self.call("lift_off");
                self.mark("dies:countin");
            }
            if bar == 0 && s.beats > 0.0 {
                self.heat_ring = Some(0.2);
                self.cue(cue::RING, Vec2::ZERO, 1.0, 1.0);
                self.mark("dies:ring");
            }
            s.beats += 1.0;
            // The roaming ember moves with the beat.
            let roam: Vec<u32> = self
                .hazards
                .iter()
                .filter(|h| h.kind == Kind::Ember && h.sub == sub::ROAMING && h.stage == 0)
                .map(|h| h.id)
                .collect();
            for id in roam {
                if let Some(k) = self.find(id) {
                    let h = &mut self.hazards[k];
                    h.beats += worth;
                    if h.beats >= 3.0 {
                        h.beats = 0.0;
                        h.fill = 0.0;
                        let a = (s.beats * 1.7).sin() * std::f32::consts::TAU;
                        let to = (h.a + Vec2::from_angle(a) * 2.4).clamp(Vec2::new(-6.0, -3.0), Vec2::new(6.0, 3.2));
                        h.a = to;
                    }
                }
            }
        }
        let embers: Vec<u32> = self.hazards.iter().filter(|h| h.kind == Kind::Ember).map(|h| h.id).collect();
        let coals = self.hazards.iter().any(|h| h.kind == Kind::Object && h.sub == sub::COAL);
        match s.step {
            0 => {
                // Midway two embers merge and roam.
                if !s.merged && embers.len() == 3 && s.count == 0 {
                    s.merged = true;
                    let (a, b) = (embers[0], embers[1]);
                    let mid = {
                        let pa = self.find(a).map(|k| self.hazards[k].a).unwrap_or_default();
                        let pb = self.find(b).map(|k| self.hazards[k].a).unwrap_or_default();
                        (pa + pb) * 0.5
                    };
                    self.hazards.retain(|h| h.id != a && h.id != b);
                    self.add(ember(mid, sub::ROAMING));
                    self.mark("dies:merge");
                    self.cue(cue::STING, mid, 1.0, 0.8);
                    self.say("teddy", "Two of them just became one and it's walking. Pet, it's walking!");
                }
                if embers.is_empty() && !coals && s.left == 0 && s.rounds > 0 {
                    // It isn't out. It was never out.
                    s.rounds -= 1;
                    s.left = if s.count > 0 { s.count } else { 5 };
                    s.gap = 3.0;
                    s.merged = false;
                    self.say("pet", "It's caught again underneath. Keep your hands up, and your head down.");
                    self.cue(cue::STING, Vec2::ZERO, 1.0, 0.9);
                } else if embers.is_empty() && !coals && s.left == 0 {
                    if s.mini {
                        self.fever = None;
                        self.strain = None;
                        return;
                    }
                    // An incision reveals the furnace beneath.
                    let a = Vec2::new(-3.0, 1.2);
                    let b = Vec2::new(3.0, -1.0);
                    self.add(Hazard { kind: Kind::Incision, a, b, c: Vec2::new(0.0, 1.0), blocking: true, ..Default::default() });
                    self.say("pet", "There it is. Under the sac. The whole furnace. Open her up.");
                    s.step = 1;
                }
            }
            1 => {
                if !self.hazards.iter().any(|h| h.kind == Kind::Incision) {
                    s.hazard_id = self.add(Hazard {
                        kind: Kind::Furnace,
                        a: Vec2::new(0.0, 0.0),
                        r: 1.3,
                        ang: -1.2,
                        drain: 0.5,
                        blocking: true,
                        fill_time: 0.9,
                        ..Default::default()
                    });
                    self.set_banner("THE FURNACE");
                    self.cue(cue::STING, Vec2::ZERO, 1.2, 0.6);
                    s.step = 2;
                }
            }
            _ => {
                if !self.hazards.iter().any(|h| h.kind == Kind::Furnace) {
                    self.fever = Some(self.fever.unwrap_or(0.0).min(40.0));
                    self.strain = None;
                    let _ = rules;
                    return;
                }
            }
        }
        self.strain = Some(s);
    }

    fn soloist_tick(&mut self, r_wave: bool, worth: f32, _rules: &Rules) {
        let Some(mut s) = self.strain.take() else { return };
        let dt = self.time_scale / 60.0;
        let mut missed = 0;
        self.hazards.retain_mut(|h| {
            if h.kind == Kind::Incision && h.sub == sub::STROKE && h.deadline > 0.0 {
                h.deadline -= dt;
                if h.deadline <= 0.0 {
                    missed += 1;
                    return false;
                }
            }
            true
        });
        if missed > 0 {
            self.vitals -= 3.0 * missed as f32;
            for slot in &mut self.slots {
                slot.chain = 0;
            }
            self.call("stroke_missed");
        }
        if r_wave {
            s.beats -= worth;
            let live = self.hazards.iter().filter(|h| h.kind == Kind::Incision && h.sub == sub::STROKE).count() as u16;
            if s.beats <= 0.0 && s.done + live < s.need {
                s.beats = 2.0;
                // A stroke on the beat, somewhere on the muscle.
                let a = self.rng.f32() * std::f32::consts::TAU;
                let centre = Vec2::new(self.rng.range(-3.2, 3.2), self.rng.range(-1.6, 1.8));
                let d = Vec2::from_angle(a) * 1.5;
                let (p, q) = (centre - d, centre + d);
                self.add(Hazard {
                    kind: Kind::Incision,
                    sub: sub::STROKE,
                    a: p,
                    b: q,
                    c: (p + q) * 0.5,
                    blocking: true,
                    deadline: (5.0 * beat_secs(self)).max(3.2),
                    ..Default::default()
                });
                self.cue(cue::STING, centre, 0.5, 1.5);
            }
            // The Duet window opens at the half.
            if s.done >= s.need / 2 && !s.woke {
                s.woke = true;
                self.slots[0].gift = 100.0;
                self.say("pet", "Now, girl. Both of us. On the beat.");
                self.mark("duet:window");
            }
        }
        if s.done >= s.need && self.hazards.iter().all(|h| h.sub != sub::STROKE || h.kind != Kind::Incision) {
            self.strain = None;
            return;
        }
        self.strain = Some(s);
    }

    fn tendril_tick(&mut self, _world: f32) {
        let Some(s) = self.strain.take() else { return };
        if self.find(s.hazard_id).is_none() {
            self.strain = None;
            return;
        }
        self.strain = Some(s);
    }

    /// Code Blue: waves from the hazard set; a budget for the team's size; rising tempo every 30
    /// seconds; a small strain encounter at the end.
    fn director_tick(&mut self, world: f32, _r_wave: bool, rules: &Rules) {
        let Some(mut s) = self.strain.take() else { return };
        s.t += world;
        s.beats -= world;
        let n = self.slots.iter().filter(|x| x.active).count().max(1) as f32;
        let budget = s.budget * (0.6 + 0.4 * n);
        let tempo = 1.0 + (s.t / 30.0).floor() * 0.11;
        let left = self.timer;
        if s.beats <= 0.0 {
            s.beats = s.interval / (tempo * budget);
            let hazards_now = self.hazards.iter().filter(|h| h.kind != Kind::Pool).count();
            if hazards_now < (6.0 + n * 3.0) as usize {
                self.director_spawn(&s, tempo);
            }
        }
        // The last 35 seconds: Introit, in small.
        if left < 35.0 && s.step == 0 {
            s.step = 1;
            self.say("bashir", "It's waltzing. In this patient too. Everyone, scanner up.");
            self.set_banner("SOMETHING MOVED");
            self.cue(cue::STING, Vec2::ZERO, 1.0, 1.0);
            self.heart.meter = 3;
            for k in 0..(1 + n as usize) {
                let at = Vec2::new(-3.5 + k as f32 * 2.2, -1.0 + (k % 2) as f32 * 2.2);
                self.add(nodule(at, sub::SMALL, false, 0.6));
                self.mark("director:strain");
            }
        }
        let worth = beat_worth(self, rules);
        self.step_nodules(self.heart.r_wave, worth);
        self.strain = Some(s);
    }

    fn director_spawn(&mut self, s: &Strain, tempo: f32) {
        let at = Vec2::new(self.rng.range(-7.0, 7.0), self.rng.range(-3.5, 3.6));
        let ang = self.rng.f32() * std::f32::consts::TAU;
        let roll = self.rng.below(if tempo > 1.3 { 8 } else { 6 });
        let dir = Vec2::from_angle(ang);
        let _ = s;
        match roll {
            0 => {
                let len = self.rng.range(1.4, 2.6);
                self.add(Hazard {
                    kind: Kind::Lacer,
                    a: at - dir * len * 0.5,
                    b: at + dir * len * 0.5,
                    drain: 0.5,
                    need: stitches_for(len),
                    ..Default::default()
                });
            }
            1 => {
                let r = self.rng.range(0.6, 1.1);
                self.add(Hazard { kind: Kind::Pool, a: at, r, ..Default::default() });
            }
            2 => {
                let sub_ = self.rng.below(3) as u8;
                self.add(Hazard { kind: Kind::Object, a: at, ang, r: 0.45, sub: sub_, drain: 0.15, ..Default::default() });
            }
            3 => {
                self.add(Hazard { kind: Kind::Polyp, a: at, r: 0.5, drain: 0.1, ..Default::default() });
            }
            4 => {
                self.add(Hazard { kind: Kind::Patch, a: at, r: 0.9, drain: 0.15, ..Default::default() });
            }
            5 => {
                let d = Vec2::from_angle(ang) * 0.7;
                self.add(Hazard { kind: Kind::Bleeder, a: at - d, b: at + d, drain: 1.5, need: 3, ..Default::default() });
            }
            6 => {
                let (p, q) = (at - dir * 1.5, at + dir * 1.5);
                self.add(Hazard { kind: Kind::Incision, a: p, b: q, c: (p + q) * 0.5 + dir.perp() * 0.5, ..Default::default() });
            }
            _ => {
                self.add(Hazard { kind: Kind::Object, a: at, ang, r: 0.45, hidden: true, sub: 1, drain: 0.2, ..Default::default() });
            }
        }
    }

    /// A strain part finished a stage.
    pub(super) fn strain_done(&mut self, id: u32, kind: Kind, stage: u8, _rating: Rating, rules: &Rules) {
        let Some(k) = self.find(id) else { return };
        let at = self.hazards[k].a;
        match kind {
            Kind::Nodule => {
                if stage == 0 {
                    let h = &mut self.hazards[k];
                    h.stage = 1;
                    h.beats = 0.0;
                    h.telegraph = false;
                    h.fill = 0.0;
                    self.cue(cue::CRACK, at, 1.0, 1.1);
                    self.call("shell_popped");
                    if rules.one_hit {
                        self.hazards.remove(k);
                    }
                } else {
                    self.hazards.remove(k);
                    self.cue(cue::BURST, at, 0.7, 1.4);
                    self.stains.push(super::field::Stain { at, r: 0.55, kind: 0 });
                }
            }
            Kind::Sac => {
                self.hazards.remove(k);
                self.flights.push(super::field::Flight { from: at, sub: 5, kind, t: 0.0 });
                self.cue(cue::SQUISH, at, 1.0, 1.2);
            }
            Kind::Eye => {
                self.hazards.remove(k);
                self.flights.push(super::field::Flight { from: at, sub: 6, kind, t: 0.0 });
                self.cue(cue::BURST, at, 1.0, 0.7);
            }
            Kind::Ember => {
                if stage == 0 {
                    let h = &mut self.hazards[k];
                    h.stage = 1;
                    h.fill = 0.0;
                    self.cue(cue::FROST, at, 1.0, 1.4);
                } else {
                    // Cracked: three pieces to pull. Each one cools the Fever.
                    let (big, base) = (self.hazards[k].sub == sub::ROAMING, self.hazards[k].a);
                    self.hazards.remove(k);
                    let pieces = if big { 5 } else { 3 };
                    for p in 0..pieces {
                        let a = p as f32 / pieces as f32 * std::f32::consts::TAU;
                        self.add(Hazard {
                            kind: Kind::Object,
                            sub: sub::COAL,
                            a: base + Vec2::from_angle(a) * 0.75,
                            ang: a,
                            r: 0.32,
                            blocking: true,
                            ..Default::default()
                        });
                    }
                    self.mark("dies:crack");
                }
            }
            Kind::Furnace => {
                let h = &mut self.hazards[k];
                h.prog = 0.0;
                h.fill = 0.0;
                h.c = Vec2::ZERO;
                if stage >= 5 {
                    self.hazards.remove(k);
                    self.cue(cue::BURST, at, 1.2, 0.6);
                    self.shake = 0.8;
                } else {
                    h.stage += 1;
                    // An instrument this case hasn't got is skipped.
                    let ring = self.ring;
                    let h = &mut self.hazards[k];
                    while h.stage < 5 && h.takes().is_some_and(|t| !ring.contains(&t)) {
                        h.stage += 1;
                    }
                    self.mark(&format!("furnace:{stage}"));
                    self.cue(cue::STING, at, 0.6, 1.0 + stage as f32 * 0.1);
                }
            }
            Kind::Tendril => {
                self.hazards.remove(k);
                self.flights.push(super::field::Flight { from: at, sub: 7, kind, t: 0.0 });
                self.shake = 1.0;
            }
            _ => {}
        }
    }
}

fn nodule(at: Vec2, sub_: u8, hidden: bool, fill: f32) -> Hazard {
    Hazard { kind: Kind::Nodule, sub: sub_, a: at, r: 0.55, hidden, fill_time: fill, ang: 0.6, drain: 0.35, blocking: true, ..Default::default() }
}

fn ember(at: Vec2, sub_: u8) -> Hazard {
    Hazard { kind: Kind::Ember, sub: sub_, a: at, r: if sub_ == sub::ROAMING { 0.75 } else { 0.55 }, drain: 0.2, blocking: true, ..Default::default() }
}
