//! Introit, 3/4. A violet nodule moves under the tissue, seen as a bump. Every three beats it
//! steps somewhere new (a ripple telegraphs on beat two) and leaves a wound behind. Scanner lights
//! it; Laser at rest pops the shell; Forceps pull it within two beats. The first kill splits it in
//! two, then four small quick ones, then the Amen: merged, held by three tethers.

use glam::Vec2;

use super::Strain;
use crate::frame::SimEvent;
use crate::games::surgery::Surgery;
use crate::games::surgery::cue;
use crate::games::surgery::field::{Hazard, HazardKind};

/// Beats between steps, by wave.
fn step_beats(wave: u32) -> u8 {
    if wave >= 2 { 2 } else { 3 }
}

impl Surgery {
    pub(super) fn introit_start(&mut self, st: &mut Strain, events: &mut Vec<SimEvent>) {
        self.heart.meter = 3;
        self.spawn_nodules(st, 1, 0.62, 1.0, events);
    }

    fn spawn_nodules(&mut self, st: &mut Strain, n: u32, r: f32, heat: f32, events: &mut Vec<SimEvent>) {
        self.op.grace_beats = 1.0;
        for k in 0..n {
            let at = self.field_spot(st.center, k);
            self.add_hazard(Hazard {
                kind: HazardKind::Nodule,
                pos: at,
                to: at,
                r,
                hidden: !st.visible,
                required: true,
                group: st.wave as u16,
                err: heat,
                ..Default::default()
            });
        }
        self.cue_at(events, cue::STINGER, st.center);
    }

    /// A random spot on the plate, away from the HUD.
    pub(in crate::games::surgery) fn field_spot(&mut self, center: Vec2, k: u32) -> Vec2 {
        let a = self.rand() * std::f32::consts::TAU + k as f32 * 2.1;
        let d = 1.0 + self.rand() * 3.0;
        let p = center + Vec2::new(a.cos() * d * 1.6, a.sin() * d * 0.8);
        Vec2::new(p.x.clamp(-8.0, 8.0), p.y.clamp(-3.6, 3.8))
    }

    pub(super) fn introit_tick(&mut self, st: &mut Strain, dt: f32, beat: bool, events: &mut Vec<SimEvent>) {
        // The Hush wakes under pressure.
        if self.op.vitals < 35.0 {
            self.wake_gift(events);
        }
        let speed = self.strain_speed(st.speed);
        let wave = st.wave;
        let step = step_beats(wave);
        let mut stepped: Vec<(u32, Vec2)> = Vec::new();
        let mut telegraphs = Vec::new();
        for h in self.op.hazards.iter_mut().filter(|h| h.kind == HazardKind::Nodule) {
            h.dev = (h.dev - dt * 1.5).max(0.0);
            if h.t > 0.0 {
                // Stepping: anticipation, then a quick slide.
                h.t = (h.t - dt * speed * 2.2).max(0.0);
                let k = 1.0 - h.t;
                h.pos = h.pos.lerp(h.to, (k * k).clamp(0.0, 1.0) * 0.35);
                if h.t <= 0.0 {
                    h.pos = h.to;
                }
            }
            if h.locked || h.stage != 0 || h.by != 0 || h.t > 0.0 {
                if beat && h.stage == 1 {
                    h.count = 0;
                }
                continue;
            }
            if beat {
                h.count = h.count.saturating_add(1);
                if h.count + 1 == step {
                    h.dev = 1.0;
                    telegraphs.push(h.pos);
                }
                if h.count >= step {
                    h.count = 0;
                    stepped.push((h.id, h.pos));
                }
            }
        }
        for at in telegraphs {
            self.cue_at(events, cue::RIPPLE, at);
            self.op.counters.bump("nodule_telegraph");
        }
        for (id, from) in stepped {
            let to = self.field_spot(st.center, id);
            let leave_wound = self.rand() < 0.55;
            if let Some(h) = self.hazard_mut(id) {
                h.to = to;
                h.t = 1.0;
            }
            self.op.counters.bump("nodule_step");
            // It leaves a wound or a pool behind.
            let wounds = self.op.hazards.iter().filter(|h| matches!(h.kind, HazardKind::Laceration | HazardKind::Pool)).count();
            if wounds < 7 {
                if leave_wound {
                    let d = Vec2::from_angle(self.rand() * 6.28) * 0.75;
                    self.add_hazard(Hazard {
                        kind: HazardKind::Laceration,
                        pts: vec![from - d, from + d],
                        pos: from,
                        required: false,
                        ..Default::default()
                    });
                } else {
                    self.add_hazard(Hazard { kind: HazardKind::Pool, pos: from, r: 0.65, ..Default::default() });
                }
            }
        }
    }

    pub(super) fn introit_killed(&mut self, st: &mut Strain, h: &Hazard, events: &mut Vec<SimEvent>) {
        if h.kind != HazardKind::Nodule {
            return;
        }
        st.kills += 1;
        self.op.counters.bump(&format!("introit_wave_{}", st.wave));
        let left = self.op.hazards.iter().filter(|x| x.kind == HazardKind::Nodule).count();
        if left > 0 {
            return;
        }
        st.wave += 1;
        if st.wave >= st.waves {
            st.done = true;
            self.cue_at(events, cue::STINGER, h.pos);
            return;
        }
        match st.wave {
            1 => {
                // It splits in two: 60% heat each.
                self.spawn_nodules(st, 2, 0.5, 0.6, events);
                self.op.strain_tough = self.op.strain_tough.min(0.6 * self.op.strain_tough.max(1.0));
                self.say("mara", "It split. Bashir, it split!");
            }
            2 => {
                self.spawn_nodules(st, 4, 0.36, 0.5, events);
                self.op.strain_tough *= 0.8;
                self.say("teddy", "Four. There are four. I'd like to speak to whoever's in charge of counting.");
                self.wake_gift(events);
            }
            _ => {
                // The Amen.
                let at = st.center;
                self.op.strain_tough = (self.op.strain_tough * 1.6).max(1.0);
                let big = self.add_hazard(Hazard {
                    kind: HazardKind::Nodule,
                    pos: at,
                    to: at,
                    r: 1.0,
                    locked: true,
                    required: true,
                    group: 9,
                    ..Default::default()
                });
                for k in 0..3 {
                    let a = k as f32 * std::f32::consts::TAU / 3.0 + 0.5;
                    let far = at + Vec2::new(a.cos() * 3.8, a.sin() * 2.1);
                    let near = at + Vec2::new(a.cos() * 1.4, a.sin() * 0.9);
                    self.add_hazard(Hazard {
                        kind: HazardKind::Tether,
                        pts: vec![far, far.lerp(near, 0.5) + Vec2::new(0.25, -0.2), near],
                        pos: far.lerp(near, 0.5),
                        parent: big,
                        required: true,
                        ..Default::default()
                    });
                }
                self.say("bashir", "Three tethers. Cut them. Then the shell.");
                self.op.shake = 1.0;
                self.cue_at(events, cue::STINGER, at);
            }
        }
    }
}
