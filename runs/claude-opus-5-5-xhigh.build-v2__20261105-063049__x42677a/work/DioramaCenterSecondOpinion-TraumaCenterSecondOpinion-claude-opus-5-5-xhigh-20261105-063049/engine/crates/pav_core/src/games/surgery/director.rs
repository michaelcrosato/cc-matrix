//! Runs a case's data: phases, spawns, triggers, checkpoints; and Code Blue's director, which
//! spends a budget of hazards on one patient while the tempo rises.

use glam::Vec2;
use serde::{Deserialize, Serialize};

use super::content::{self, EventDef};
use super::field::{Hazard, HazardKind, Tool};
use super::{Checkpoint, Mode, Stage, Surgery, cue};
use crate::frame::SimEvent;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Director {
    /// Surgeons at the table when it started.
    pub surgeons: u32,
    pub next_wave: f32,
    pub interval: f32,
    pub tempo: f32,
    pub tempo_t: f32,
    pub waves: u32,
    pub finale: bool,
}

impl Surgery {
    pub(super) fn begin_phase(&mut self, i: u8, events: &mut Vec<SimEvent>) {
        let content = content::get();
        let Some(case) = content.case(self.op.case) else { return };
        let Some(def) = case.phase.get(i as usize) else { return };
        self.op.phase = i;
        self.op.phase_t = 0.0;
        self.op.phase_beats = 0;
        self.op.fired = 0;
        self.op.objective = def.objective.as_str().into();
        self.op.strain = None;
        self.heart.meter = def.meter.unwrap_or(0);
        self.heart.bar_beat = 0;
        if def.checkpoint && i > 0 {
            self.checkpoint = Some(Box::new(Checkpoint {
                op: self.op.clone(),
                surgeons: self.surgeons.clone(),
                heart: self.heart.clone(),
                gifts: self.gifts.clone(),
            }));
            self.op.banner = Some(("CHECKPOINT".into(), 1.2));
        }
        if let Some(p) = &def.plate {
            if p.as_str() != &*self.op.plate {
                let from = def.spawn.first().map(|s| Vec2::new(s.at[0], s.at[1])).unwrap_or_default();
                self.set_plate(p, self.last_cut().unwrap_or(from));
                self.op.push = 1.0;
                self.op.push_at = self.last_cut().unwrap_or(from);
                self.cue_at(events, cue::SQUISH, self.op.push_at);
            }
        }
        for s in &def.spawn {
            self.spawn_def(s);
        }
        if let Some(st) = &def.strain {
            self.strain_start(st, events);
        }
        if self.op.case == content::CODE_BLUE && i == 0 {
            let n = self.surgeons.iter().filter(|s| s.present).count().max(1) as u32;
            self.op.director = Some(Director { surgeons: n, next_wave: 0.5, interval: 17.0, tempo: 1.0, ..Default::default() });
        }
        self.op.counters.bump(&format!("phase_{}_{}", self.op.case, i));
    }

    fn last_cut(&self) -> Option<Vec2> {
        self.op.stains.iter().rev().find(|s| s.kind == 2).and_then(|s| s.pts.first().copied())
    }

    pub(super) fn jump_phase(&mut self, phase: u8, events: &mut Vec<SimEvent>) {
        self.op.hazards.clear();
        self.begin_phase(phase, events);
    }

    pub(super) fn skip_phase(&mut self, events: &mut Vec<SimEvent>) {
        self.op.hazards.clear();
        for s in &mut self.surgeons {
            s.engaged = 0;
        }
        self.next_phase(events);
    }

    fn next_phase(&mut self, events: &mut Vec<SimEvent>) {
        let content = content::get();
        let Some(case) = content.case(self.op.case) else { return };
        let next = self.op.phase + 1;
        if (next as usize) < case.phase.len() {
            self.begin_phase(next, events);
        } else {
            self.complete(events);
        }
    }

    pub(super) fn phase_tick(&mut self, dt: f32, events: &mut Vec<SimEvent>) {
        self.op.phase_t += dt;
        let content = content::get();
        let Some(case) = content.case(self.op.case) else { return };
        let Some(def) = case.phase.get(self.op.phase as usize) else { return };

        if self.op.director.is_some() {
            self.director_tick(dt, events);
        }

        // Only the closure left: the dressing comes to hand by itself.
        let required: Vec<&Hazard> = self.op.hazards.iter().filter(|h| h.required).collect();
        let closure_only = !required.is_empty() && required.iter().all(|h| h.kind == HazardKind::Closure);
        self.op.forced_tool = if closure_only { Some(Tool::Dressing) } else { None };
        let remaining = required.len() as u32;
        let strain_done = self.op.strain.as_ref().is_none_or(|s| s.done);
        let clear = remaining == 0 && strain_done;

        // Triggers.
        for (i, e) in def.event.iter().enumerate() {
            let bit = 1u64 << (i.min(63));
            if self.op.fired & bit != 0 {
                continue;
            }
            let fire = e.at_time.is_some_and(|t| self.op.phase_t >= t)
                || e.vitals_below.is_some_and(|v| self.op.vitals < v)
                || e.on_beat.is_some_and(|b| self.op.phase_beats >= b)
                || e.remaining.is_some_and(|r| remaining <= r)
                || (e.on_clear && clear);
            if fire {
                self.op.fired |= bit;
                self.run_event(e, events);
                if self.stage != Stage::Op {
                    return;
                }
            }
        }

        // Anything still to come? On-clear events may have added work.
        let required = self.op.hazards.iter().filter(|h| h.required).count();
        let strain_done = self.op.strain.as_ref().is_none_or(|s| s.done);
        let pending_time =
            def.event.iter().enumerate().any(|(i, e)| {
                self.op.fired & (1u64 << i.min(63)) == 0 && (e.at_time.is_some() || e.on_clear || e.on_beat.is_some())
            });
        let director_busy = self.op.director.as_ref().is_some_and(|d| !d.finale);
        if required == 0 && strain_done && !pending_time && self.op.phase_t >= def.hold && !director_busy {
            if self.op.case == content::CODE_BLUE {
                // Code Blue runs until the bell; the strain encounter is its last act.
                return;
            }
            self.next_phase(events);
        }
    }

    pub(super) fn run_event(&mut self, e: &EventDef, events: &mut Vec<SimEvent>) {
        for s in &e.spawn {
            self.spawn_def(s);
        }
        if e.say.len() == 2 {
            self.say(&e.say[0].clone(), &e.say[1].clone());
        }
        if let Some(c) = &e.cue {
            if let Some(id) = cue::id(c) {
                self.cue_at(events, id, Vec2::ZERO);
            }
        }
        if let Some(b) = &e.banner {
            self.op.banner = Some((b.as_str().into(), 0.0));
            self.cue_at(events, cue::BANNER, Vec2::ZERO);
        }
        if e.shake > 0.0 {
            self.op.shake = self.op.shake.max(e.shake);
        }
        if let Some(p) = &e.plate {
            let from = self.last_cut().unwrap_or_default();
            self.set_plate(p, from);
        }
        if e.push > 0.0 {
            self.op.push = e.push;
            self.op.push_at = e.spawn.first().map(|s| Vec2::new(s.at[0], s.at[1])).unwrap_or(Vec2::ZERO);
        }
        if e.vitals != 0.0 {
            if e.vitals < 0.0 {
                self.hurt(-e.vitals);
            } else {
                self.op.vitals = (self.op.vitals + e.vitals).min(self.op.vitals_max);
            }
        }
        if e.gift {
            self.wake_gift(events);
        }
        if e.code {
            self.start_code(true, 1);
        }
    }

    /// Code Blue: spends the budget on waves; tempo rises every 30 s; ends in a strain.
    fn director_tick(&mut self, dt: f32, events: &mut Vec<SimEvent>) {
        let Some(mut d) = self.op.director.take() else { return };
        d.tempo_t += dt;
        if d.tempo_t >= 30.0 {
            d.tempo_t = 0.0;
            d.tempo += 0.14;
            self.say_short("codeblue_tempo");
            self.op.banner = Some(("TEMPO UP".into(), 1.0));
            self.cue_at(events, cue::BANNER, Vec2::ZERO);
        }
        self.op.drain_scale = 0.78 + (d.tempo - 1.0) * 0.45;
        // The last minute: a small strain encounter on top of the waves.
        if !d.finale && self.op.timer < 60.0 {
            d.finale = true;
            let def = content::StrainDef {
                kind: "introit".into(),
                waves: 2,
                speed: 1.0,
                tough: 0.8,
                beats: 10.0,
                amen: false,
                count: 1,
                rings: 0,
                fever: 0.0,
                at: [0.0, 0.0],
                furnace: false,
                visible: true,
            };
            self.strain_start(&def, events);
            self.say_short("codeblue_finale");
        }
        d.next_wave -= dt;
        if d.next_wave <= 0.0 {
            d.waves += 1;
            d.next_wave = d.interval / d.tempo;
            let budget = (3.0 * d.tempo * (0.6 + 0.4 * d.surgeons as f32)).round() as u32;
            self.spawn_budget(budget, d.waves);
        }
        self.op.director = Some(d);
    }

    fn spawn_budget(&mut self, mut budget: u32, wave: u32) {
        let busy = self.op.hazards.iter().filter(|h| h.required).count() as u32;
        if busy > 14 {
            return;
        }
        while budget > 0 {
            let at = self.field_spot(Vec2::ZERO, budget + wave * 7);
            let roll = self.rand();
            let dir = Vec2::from_angle(self.rand() * 6.28);
            let (kind, cost) = if roll < 0.24 {
                (HazardKind::Laceration, 1)
            } else if roll < 0.46 {
                (HazardKind::Foreign, 1)
            } else if roll < 0.6 {
                (HazardKind::Polyp, 1)
            } else if roll < 0.72 {
                (HazardKind::Burn, 1)
            } else if roll < 0.84 {
                (HazardKind::Incision, 1)
            } else if roll < 0.94 {
                (HazardKind::Pool, 1)
            } else {
                (HazardKind::Bleeder, 2)
            };
            let mut h = Hazard { kind, pos: at, axis: self.rand() * 6.28, required: true, ..Default::default() };
            match kind {
                HazardKind::Laceration => {
                    let len = 0.9 + self.rand() * 0.8;
                    h.pts = vec![at - dir * len, at + dir.perp() * 0.25, at + dir * len];
                }
                HazardKind::Incision => {
                    let len = 1.3 + self.rand();
                    h.pts = vec![at - dir * len, at + dir * len];
                }
                HazardKind::Foreign => {
                    h.r = 0.3;
                    h.tag = (self.rand() * 3.0) as u8;
                }
                HazardKind::Polyp => h.r = 0.42,
                HazardKind::Burn => h.r = 0.75,
                HazardKind::Pool => h.r = 0.85,
                HazardKind::Bleeder => h.r = 0.3,
                _ => {}
            }
            self.add_hazard(h);
            budget = budget.saturating_sub(cost);
        }
    }

    /// Attract: the next 25-second segment of the loop.
    pub(super) fn attract_next(&mut self, events: &mut Vec<SimEvent>) {
        self.attract_t = 0.0;
        self.cheats.immortal = true;
        self.cheats.full_gift = true;
        self.cheats.freeze_timer = true;
        self.bot_skill = 1.0;
        let seg = self.attract_seg;
        self.attract_seg = (self.attract_seg + 1) % 6;
        // Case, phase of it, bots at the table.
        let phase_named = |case: u8, name: &str| -> u8 {
            content::get().case(case).and_then(|c| c.phase.iter().position(|p| p.name == name)).unwrap_or(0) as u8
        };
        let (case, phase, bots) = match seg {
            0 => (3u8, phase_named(3, "Introit"), 1usize),
            1 => (4, phase_named(4, "Lacrimosa"), 1),
            2 => (5, phase_named(5, "The Echo"), 1),
            3 => (7, phase_named(7, "E: The Soloist"), 2),
            4 => (content::CODE_BLUE, 0, 4),
            _ => (0, 0, 0),
        };
        for (i, s) in self.surgeons.iter_mut().enumerate() {
            s.bot = i < bots;
            s.present = i < bots;
        }
        self.humans = [false; 4];
        self.begin_case(case);
        if bots == 0 {
            // One story exchange.
            self.begin_story("case3_after", events);
            return;
        }
        self.begin_phase(phase, events);
        self.stage = Stage::Op;
        self.stage_t = 0.0;
        self.op.banner = None;
        self.op.gift_awake = true;
        if case == content::CODE_BLUE {
            self.op.timer = 200.0;
        }
    }

    pub(super) fn attract_tick(&mut self, dt: f32, events: &mut Vec<SimEvent>) {
        self.attract_t += dt;
        // The bot reads slowly on the story segment, so a passer-by can too.
        if self.stage == Stage::Story {
            let due = self.story.t > (0.8 + self.story.text.chars().count() as f32 * 0.03).min(3.0);
            if due {
                self.story.typed = true;
                self.story_advance(events);
            }
        }
        if self.stage == Stage::Op {
            let done =
                self.op.hazards.iter().filter(|h| h.required).count() == 0 && self.op.strain.as_ref().is_none_or(|s| s.done);
            if done && self.op.phase_t > 1.0 && self.mode == Mode::Attract {
                self.attract_t = 99.0;
            }
        }
        if self.attract_t > 25.0 || !matches!(self.stage, Stage::Op | Stage::Story) {
            self.attract_next(events);
        }
    }
}
