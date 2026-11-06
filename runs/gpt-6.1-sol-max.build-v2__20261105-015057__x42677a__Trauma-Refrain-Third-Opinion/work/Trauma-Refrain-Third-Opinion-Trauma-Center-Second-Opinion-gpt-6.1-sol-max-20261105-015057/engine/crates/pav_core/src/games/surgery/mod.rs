//! The First Movement: deterministic surgical action, content-driven cases and surgeon seats.
use super::{Game, GameBox, Outcome};
use crate::frame::SimEvent;
use crate::{InputFrame, Sim};
use anyhow::{Result, anyhow};
use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const TITLE: &str = "Trauma Refrain: Third Opinion";
pub const USE: u32 = 1;
pub const GIFT: u32 = 2;
pub const SHOCK: u32 = 4;
pub const CANCEL: u32 = 8;
pub const TOOLS: [&str; 9] = ["Scalpel", "Forceps", "Suture", "Suction", "Laser", "Gel", "Scanner", "IV Push", "Dressing"];

#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct SurgeonInput {
    pub active: bool,
    pub aim: Vec2,
    pub tool: u8,
    pub held: u32,
    pub pressure: f32,
    pub rotate: f32,
    pub assisted: bool,
    pub precision: bool,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct Tune {
    pub drain: f32,
    pub timer: f32,
    pub power: f32,
    pub heal: f32,
    pub strain_speed: f32,
    pub toughness: f32,
    pub heart_coupling: f32,
    pub beat_window: f32,
    pub cursor_speed: f32,
    pub assist: f32,
    pub gift_gain: f32,
    pub gift_duration: f32,
    pub hush_scale: f32,
    pub echo_duration: f32,
    pub chain_window: f32,
    pub strictness: f32,
    pub wrong_penalty: f32,
    pub code_window: f32,
    pub score: f32,
    pub time_scale: f32,
    pub immortal: bool,
    pub freeze: bool,
    pub one_hit: bool,
    pub bot: bool,
    pub tremor: bool,
    pub clinical: bool,
}
impl Default for Tune {
    fn default() -> Self {
        Self {
            drain: 1.,
            timer: 1.,
            power: 1.,
            heal: 1.,
            strain_speed: 1.,
            toughness: 1.,
            heart_coupling: 1.,
            beat_window: 110.,
            cursor_speed: 15.,
            assist: 0.7,
            gift_gain: 1.,
            gift_duration: 1.,
            hush_scale: 0.3,
            echo_duration: 10.,
            chain_window: 20.,
            strictness: 1.,
            wrong_penalty: 1.,
            code_window: 7.,
            score: 1.,
            time_scale: 1.,
            immortal: false,
            freeze: false,
            one_hit: false,
            bot: false,
            tremor: true,
            clinical: false,
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HazardSpec {
    pub kind: String,
    pub pos: [f32; 2],
    #[serde(default)]
    pub end: Option<[f32; 2]>,
    #[serde(default)]
    pub hidden: bool,
    #[serde(default)]
    pub stage: u8,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Phase {
    pub name: String,
    pub objective: String,
    pub line: String,
    pub plate: String,
    #[serde(default)]
    pub strain: String,
    #[serde(default)]
    pub hazards: Vec<HazardSpec>,
    #[serde(default)]
    pub code: u8,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Case {
    pub name: String,
    pub patient: String,
    pub life: String,
    pub diagnosis: String,
    pub surgeon: String,
    pub timer: f32,
    pub par: f32,
    pub fate: String,
    pub phases: Vec<Phase>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Content {
    pub cases: Vec<Case>,
}
pub fn content() -> Result<Content> {
    let built = include_str!("content/cases.json");
    #[cfg(not(target_arch = "wasm32"))]
    let text: std::borrow::Cow<'_, str> = std::fs::read_to_string("crates/pav_core/src/games/surgery/content/cases.json")
        .map(std::borrow::Cow::Owned)
        .unwrap_or(std::borrow::Cow::Borrowed(built));
    #[cfg(target_arch = "wasm32")]
    let text: std::borrow::Cow<'_, str> = std::borrow::Cow::Borrowed(built);
    serde_json::from_str(text.as_ref()).map_err(|e| anyhow!("surgery/content/cases.json: {e}"))
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Hazard {
    pub id: u32,
    pub kind: String,
    pub pos: Vec2,
    pub end: Vec2,
    pub home: Vec2,
    pub progress: f32,
    pub stage: u8,
    pub hidden: bool,
    pub reveal: f32,
    pub age: f32,
    pub alive: bool,
    pub side: f32,
    pub count: u8,
    pub angle: f32,
}
impl Hazard {
    pub fn tool(&self, case: usize) -> u8 {
        match self.kind.as_str() {
            "incision" | "tether" | "soloist" => 0,
            "hook" | "shard" => 1,
            "bone" => {
                if self.stage == 0 {
                    1
                } else {
                    2
                }
            }
            "laceration" | "bleeder" => 2,
            "pool" => 3,
            "polyp" | "sac" => 4,
            "burn" | "inflammation" => 5,
            "dressing" => 8,
            "tumor" => [0, 1, 5][self.stage.min(2) as usize],
            "nodule" => {
                if self.hidden && self.reveal <= 0. {
                    6
                } else if self.stage == 0 {
                    4
                } else {
                    1
                }
            }
            "ember" => {
                if self.stage == 0 {
                    if case == 7 { 6 } else { 4 }
                } else if self.stage == 1 {
                    0
                } else {
                    1
                }
            }
            "tendril" => 1,
            _ => 5,
        }
    }
    pub fn radius(&self) -> f32 {
        match self.kind.as_str() {
            "pool" => 1.15,
            "tumor" => 1.,
            "dressing" => 1.,
            "sac" => 0.65,
            _ => 0.55,
        }
    }
    pub fn drain(&self) -> f32 {
        match self.kind.as_str() {
            "bleeder" => 1.7,
            "laceration" => 0.24,
            "pool" => 0.2,
            "nodule" | "ember" => 0.17,
            "tumor" => 0.25,
            "burn" => 0.13,
            "hook" | "shard" => 0.10,
            "sac" => 0.16,
            _ => 0.03,
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Surgeon {
    pub active: bool,
    pub cursor: Vec2,
    pub tool: u8,
    pub held: u32,
    pub charge: f32,
    pub gift_hold: f32,
    pub grabbed: Option<u32>,
    pub origin: Vec2,
    pub last: Vec2,
    pub score: f32,
    pub chain: u32,
    pub best_chain: u32,
    pub gift: f32,
    pub iv_cool: f32,
    pub last_good: f32,
    pub strokes: u32,
    pub error: f32,
    pub ghost: bool,
}
impl Default for Surgeon {
    fn default() -> Self {
        Self {
            active: false,
            cursor: Vec2::ZERO,
            tool: 1,
            held: 0,
            charge: 0.,
            gift_hold: 0.,
            grabbed: None,
            origin: Vec2::ZERO,
            last: Vec2::ZERO,
            score: 0.,
            chain: 0,
            best_chain: 0,
            gift: 0.,
            iv_cool: 0.,
            last_good: 0.,
            strokes: 0,
            error: 0.,
            ghost: false,
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Cue {
    pub seq: u32,
    pub text: String,
    pub kind: String,
    pub pos: Vec2,
    pub age: f32,
    pub seat: usize,
    pub on_beat: bool,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Surgery {
    pub case: usize,
    pub phase: usize,
    pub mode: String,
    pub campaign: bool,
    pub blue: bool,
    pub time: f32,
    pub remaining: f32,
    pub vitals: f32,
    pub bpm: f32,
    pub beat: f32,
    pub beats: u32,
    pub phase_time: f32,
    pub hazards: Vec<Hazard>,
    pub surgeons: [Surgeon; 4],
    pub tune: Tune,
    pub cues: Vec<Cue>,
    pub serial: u32,
    pub next_id: u32,
    pub callout: String,
    pub code: f32,
    pub shocks: u8,
    pub defibs: u8,
    pub scripted: bool,
    pub gift_left: f32,
    pub gift_kind: String,
    pub fever: f32,
    pub heat_radius: f32,
    pub mistake_cd: f32,
    pub mistakes: u32,
    pub actions: u32,
    pub coverage: BTreeMap<String, u32>,
    pub phase_results: Vec<f32>,
    pub completed: Vec<usize>,
    pub outcome: Outcome,
    pub difficulty: u8,
    pub data: Content,
    pub wave: u32,
    pub blue_at: f32,
}
impl Surgery {
    pub fn new(case: usize, campaign: bool, blue: bool) -> Self {
        let data = content().expect("embedded surgery content");
        let mut g = Self {
            case: case.min(7),
            phase: 0,
            mode: "operation".into(),
            campaign,
            blue,
            time: 0.,
            remaining: 240.,
            vitals: 100.,
            bpm: 72.,
            beat: 0.,
            beats: 0,
            phase_time: 0.,
            hazards: vec![],
            surgeons: std::array::from_fn(|_| Surgeon::default()),
            tune: Tune::default(),
            cues: vec![],
            serial: 0,
            next_id: 0,
            callout: String::new(),
            code: 0.,
            shocks: 0,
            defibs: 2,
            scripted: false,
            gift_left: 0.,
            gift_kind: String::new(),
            fever: 0.,
            heat_radius: -1.,
            mistake_cd: 0.,
            mistakes: 0,
            actions: 0,
            coverage: BTreeMap::new(),
            phase_results: vec![],
            completed: vec![],
            outcome: Outcome::Playing,
            difficulty: 0,
            data,
            wave: 0,
            blue_at: 0.,
        };
        g.surgeons[0].active = true;
        g.surgeons[0].cursor = Vec2::new(-6., 0.);
        g.remaining = if blue { 240. } else { g.chart().timer };
        g.load_phase();
        g
    }
    pub fn chart(&self) -> &Case {
        &self.data.cases[self.case]
    }
    pub fn stage(&self) -> &Phase {
        &self.chart().phases[self.phase.min(self.chart().phases.len() - 1)]
    }
    pub fn mark(&mut self, key: &str) {
        *self.coverage.entry(key.into()).or_default() += 1;
    }
    pub fn emit(&mut self, text: &str, kind: &str, pos: Vec2, seat: usize, on_beat: bool) {
        self.serial += 1;
        self.cues.push(Cue { seq: self.serial, text: text.into(), kind: kind.into(), pos, age: 0., seat, on_beat });
        if self.cues.len() > 8 {
            self.cues.remove(0);
        }
    }
    pub fn spawn(&mut self, spec: &HazardSpec) {
        self.next_id += 1;
        let p = Vec2::from_array(spec.pos);
        let end = spec.end.map(Vec2::from_array).unwrap_or(p + Vec2::new(0., -1.2));
        self.hazards.push(Hazard {
            id: self.next_id,
            kind: spec.kind.clone(),
            pos: p,
            end,
            home: p,
            progress: 0.,
            stage: spec.stage,
            hidden: spec.hidden,
            reveal: 0.,
            age: 0.,
            alive: true,
            side: 0.,
            count: 0,
            angle: if spec.kind == "bone" { 0.45 } else { 0. },
        });
        self.mark(&format!("hazard:{}", spec.kind));
    }
    pub fn load_phase(&mut self) {
        self.hazards.clear();
        self.phase_time = 0.;
        self.fever = 0.;
        self.heat_radius = -1.;
        let p = self.stage().clone();
        self.callout = p.line.clone();
        self.mark(&format!("phase:{}:{}", self.case, self.phase));
        if !p.strain.is_empty() {
            self.mark(&format!("strain:{}", p.strain));
        }
        for s in &p.hazards {
            self.spawn(s);
        }
        if p.code > 0 {
            self.start_code(p.code, true);
        }
        if (self.case == 3 && self.phase >= 3) || (self.case >= 4) {
            self.surgeons[0].gift = 100.;
        }
        if p.hazards.iter().any(|h| h.kind == "dressing") {
            for s in &mut self.surgeons {
                s.tool = 8;
            }
        }
        self.emit(&p.name, "phase", Vec2::ZERO, 0, false);
    }
    pub fn start_code(&mut self, n: u8, scripted: bool) {
        self.code = self.tune.code_window + if scripted { 8. } else { 0. };
        self.vitals = 0.;
        self.shocks = n;
        self.scripted = scripted;
        self.callout =
            if n > 1 { "Three shocks. Count the ghost beats." } else { "No pulse. Charge, then release on the ghost beat." }
                .into();
        self.mark("code");
        self.emit("CODE BLUE", "code", Vec2::ZERO, 0, false);
    }
    pub fn rank(&self) -> &'static str {
        let score = self.total();
        let ratio = score / self.chart().par;
        if ratio >= 1.15 {
            "ENCORE"
        } else if ratio >= 1. {
            "S"
        } else if ratio >= 0.85 {
            "A"
        } else if ratio >= 0.70 {
            "B"
        } else {
            "C"
        }
    }
    pub fn total(&self) -> f32 {
        self.surgeons.iter().map(|s| s.score).sum::<f32>() + self.vitals * 20. + self.remaining.max(0.) * 5.
            - self.mistakes as f32 * 100.
    }
    pub fn finish(&mut self) {
        self.mode = "results".into();
        self.outcome = if self.campaign && self.case < 7 { Outcome::Playing } else { Outcome::Won };
        self.completed.push(self.case);
        self.emit("OPERATION COMPLETE", "complete", Vec2::ZERO, 0, false);
    }
    pub fn fail(&mut self) {
        self.mode = "dead".into();
        self.outcome = Outcome::Lost;
        self.callout = "Time of death: 03:42.".into();
        self.emit("FLATLINE", "flatline", Vec2::ZERO, 0, false);
    }
    pub fn next(&mut self) {
        if self.phase + 1 < self.chart().phases.len() {
            self.phase += 1;
            self.load_phase();
        } else {
            self.finish();
        }
    }
    pub fn retry(&mut self, checkpoint: bool) {
        self.mode = "operation".into();
        self.outcome = Outcome::Playing;
        self.vitals = 85.;
        self.code = 0.;
        self.remaining = self.chart().timer * 0.85;
        self.defibs = 2u8.saturating_sub(self.difficulty);
        if !checkpoint {
            self.phase = 0;
            for s in &mut self.surgeons {
                s.score = 0.;
                s.chain = 0;
            }
        }
        self.load_phase();
    }
    pub fn on_beat(&self) -> bool {
        self.beat.min(1. - self.beat) * 60. / self.bpm <= self.tune.beat_window / 1000.
    }
    fn mistake(&mut self, line: &str, damage: f32, seat: usize) {
        if self.mistake_cd > 0. {
            return;
        }
        self.mistake_cd = 0.8;
        self.mistakes += 1;
        if !self.tune.immortal {
            self.vitals = (self.vitals - damage * self.tune.wrong_penalty).max(0.);
        }
        self.surgeons[seat].chain = 0;
        self.callout = line.into();
        self.emit(line, "mistake", self.surgeons[seat].cursor, seat, false);
    }
    fn rate(&mut self, seat: usize, quality: f32, pos: Vec2) {
        let q = quality / self.tune.strictness.max(0.2);
        let (word, points, gain) = if q >= 0.88 {
            ("IMMACULATE", 400., 8.)
        } else if q >= 0.66 {
            ("CLEAN", 250., 4.)
        } else if q >= 0.34 {
            ("GOOD", 120., 2.)
        } else {
            ("SLOPPY", 10., 0.)
        };
        let beat = self.on_beat();
        let s = &mut self.surgeons[seat];
        if q >= 0.66 {
            s.chain += 1;
        } else if q < 0.34 {
            s.chain = 0;
        }
        s.best_chain = s.best_chain.max(s.chain);
        s.last_good = self.time;
        let mult = if s.chain >= 20 {
            2.
        } else if s.chain >= 10 {
            1.5
        } else if s.chain >= 5 {
            1.25
        } else {
            1.
        };
        s.score += points * mult * if beat { 1.25 } else { 1. } * self.tune.score;
        s.gift = (s.gift + (gain + if beat { 2. } else { 0. }) * self.tune.gift_gain).min(100.);
        self.actions += 1;
        self.mark(&format!("rating:{word}"));
        if beat {
            self.mark("on_beat");
        }
        self.emit(word, "rating", pos, seat, beat);
        if beat && self.gift_left > 0. && self.gift_kind != "Echo" {
            self.gift_left += 60. / self.bpm;
        }
    }
    fn complete(&mut self, index: usize, seat: usize, quality: f32) {
        let pos = self.hazards[index].pos;
        let kind = self.hazards[index].kind.clone();
        let tool = self.hazards[index].tool(self.case);
        let stage = self.hazards[index].stage;
        self.mark(&format!("tool:{tool}"));
        let mut done = true;
        if kind == "tumor" && stage < 2
            || kind == "nodule" && stage == 0
            || kind == "ember" && stage < 2
            || kind == "bone" && stage == 0
        {
            self.hazards[index].stage += 1;
            self.hazards[index].progress = 0.;
            done = false;
            if kind == "ember" && stage == 0 {
                self.callout = "Brittle. Crack the shell with the scalpel.".into();
            }
            if kind == "bone" {
                self.callout = "Aligned. Wire it with two even crossings.".into();
            }
        }
        if done {
            self.hazards[index].alive = false;
            self.mark(&format!("cleared:{kind}"));
            if kind == "pool" {
                for h in &mut self.hazards {
                    if h.hidden && h.pos.distance(pos) < 1.6 {
                        h.reveal = 999.;
                    }
                }
            }
        }
        self.rate(seat, quality, pos);
        if self.gift_left > 0. && (self.gift_kind == "Echo" || self.gift_kind == "Duet") && seat != 3 {
            if let Some(j) =
                self.hazards.iter().position(|h| h.alive && h.tool(self.case) == tool && h.id != self.hazards[index].id)
            {
                let p = self.hazards[j].pos;
                if !self.surgeons[3].active || self.surgeons[3].ghost {
                    self.surgeons[3].active = true;
                    self.surgeons[3].ghost = true;
                    self.surgeons[3].cursor = p;
                    self.surgeons[3].tool = tool;
                }
                self.hazards[j].progress = 0.;
                if self.hazards[j].kind == "ember" && self.hazards[j].stage < 2
                    || self.hazards[j].kind == "tumor" && self.hazards[j].stage < 2
                    || self.hazards[j].kind == "nodule" && self.hazards[j].stage == 0
                {
                    self.hazards[j].stage += 1;
                } else {
                    self.hazards[j].alive = false;
                }
                self.mark("echo_repeat");
                self.rate(seat, quality, p);
                self.emit("ECHO", "gift", p, 3, false);
            }
        }
    }
    fn target(&self, p: Vec2, tool: u8) -> Option<usize> {
        self.hazards
            .iter()
            .enumerate()
            .filter(|(_, h)| h.alive && (!h.hidden || h.reveal > 0. || tool == 6))
            .filter(|(_, h)| {
                let d = if matches!(h.kind.as_str(), "incision" | "laceration" | "bleeder" | "dressing" | "tether" | "soloist") {
                    line_distance(p, h.pos, h.end).0
                } else {
                    p.distance(h.pos)
                };
                d < h.radius() + 0.4
            })
            .min_by(|(_, a), (_, b)| p.distance_squared(a.pos).total_cmp(&p.distance_squared(b.pos)))
            .map(|(i, _)| i)
    }
    pub fn tick(&mut self, inputs: [SurgeonInput; 4], dt: f32) {
        if self.mode != "operation" {
            return;
        }
        let slow = if self.gift_left > 0. && self.gift_kind != "Echo" { self.tune.hush_scale } else { 1. };
        let world = dt * self.tune.time_scale * slow;
        self.time += world;
        self.phase_time += world;
        for c in &mut self.cues {
            c.age += dt;
        }
        self.cues.retain(|c| c.age < 4.);
        self.mistake_cd = (self.mistake_cd - dt).max(0.);
        self.gift_left = (self.gift_left - dt).max(0.);
        if self.gift_left == 0. && self.surgeons[3].ghost {
            self.surgeons[3].active = false;
            self.surgeons[3].ghost = false;
        }
        self.bpm = 72. + (1. - self.vitals / 100.) * 76. * self.tune.heart_coupling;
        let oldbeat = self.beat;
        self.beat = (self.beat + world * self.bpm / 60.).fract();
        let pulse = self.beat < oldbeat;
        if pulse {
            self.beats += 1;
        }
        if !self.tune.freeze {
            self.remaining -= world / self.tune.timer.max(0.1);
        }
        if self.remaining <= 0. {
            if self.blue && self.vitals > 0. {
                self.finish();
            } else {
                self.fail();
            }
            return;
        }
        for h in &mut self.hazards {
            h.age += world;
            h.reveal = (h.reveal - world).max(0.);
        }
        if self.code <= 0. {
            let difficulty = [0.7, 1., 1.3][self.difficulty.min(2) as usize];
            let drain = self.hazards.iter().filter(|h| h.alive).map(|h| h.drain()).sum::<f32>() + 0.05;
            if !self.tune.immortal {
                self.vitals = (self.vitals - drain * world * self.tune.drain * difficulty).max(0.);
            }
            if self.vitals == 0. {
                if self.defibs > 0 {
                    self.defibs -= 1;
                    self.start_code(1, false);
                } else {
                    self.fail();
                    return;
                }
            }
        } else {
            self.code -= dt;
            if self.code <= 0. {
                if self.tune.immortal {
                    self.vitals = 30.;
                    self.shocks = 0;
                } else {
                    self.fail();
                    return;
                }
            }
        }
        self.strain(world, pulse);
        for (seat, input) in inputs.iter().enumerate() {
            if seat == 3 && self.surgeons[3].ghost {
                if input.active {
                    self.surgeons[3].ghost = false;
                } else {
                    continue;
                }
            }
            if !input.active {
                continue;
            }
            self.surgeons[seat].active = true;
            self.operate(seat, *input, dt, world);
        }
        if self.mode != "operation" {
            return;
        }
        if self.blue {
            if self.time >= self.blue_at && self.hazards.iter().filter(|h| h.alive).count() < 10 {
                self.blue_wave();
            }
            if self.remaining < 0.1 {
                self.finish();
            }
        } else if self.code <= 0. && self.shocks == 0 && self.phase_time > 1. && !self.hazards.iter().any(|h| h.alive) {
            self.phase_results.push(self.vitals);
            self.next();
        }
    }
    fn operate(&mut self, seat: usize, input: SurgeonInput, dt: f32, world: f32) {
        let old = self.surgeons[seat].held;
        let was = old & USE != 0;
        let held = input.held & USE != 0;
        let mut p = input.aim.clamp(Vec2::new(-9., -4.1), Vec2::new(9., 4.15));
        let tool = if self.stage().hazards.iter().any(|h| h.kind == "dressing") { 8 } else { input.tool.min(8) };
        if self.case >= 5 && self.case <= 6 && self.tune.tremor && !input.precision && self.gift_left == 0. {
            p += Vec2::new((self.time * 2.3).sin(), (self.time * 1.7).cos()) * 0.08;
        }
        if input.assisted && tool != 7 && self.tune.assist > 0. {
            if let Some(h) = self
                .hazards
                .iter()
                .filter(|h| h.alive && h.tool(self.case) == tool)
                .min_by(|a, b| p.distance_squared(a.pos).total_cmp(&p.distance_squared(b.pos)))
            {
                if p.distance(h.pos) < 1.2 && p.distance(self.surgeons[seat].cursor) > 0.001 {
                    p = p.lerp(h.pos, self.tune.assist * dt * 3.);
                }
                if held && tool == 2 {
                    let dir = (h.end - h.pos).normalize_or_zero();
                    let t = (h.progress + 0.18).min(0.95);
                    let at = h.pos.lerp(h.end, t);
                    let side = Vec2::new(-dir.y, dir.x);
                    p = at + side * (p - at).dot(side).clamp(-0.65, 0.65);
                }
            }
        }
        self.surgeons[seat].last = self.surgeons[seat].cursor;
        self.surgeons[seat].cursor = p;
        self.surgeons[seat].iv_cool = (self.surgeons[seat].iv_cool - world).max(0.);
        if tool != self.surgeons[seat].tool {
            self.surgeons[seat].charge = 0.;
            self.surgeons[seat].grabbed = None;
        }
        self.surgeons[seat].tool = tool;
        self.surgeons[seat].held = input.held;
        if input.held & CANCEL != 0 {
            self.surgeons[seat].grabbed = None;
            self.surgeons[seat].charge = 0.;
            return;
        }
        if input.held & GIFT != 0 && self.surgeons[seat].gift >= 35. {
            self.surgeons[seat].gift_hold += dt;
        } else if old & GIFT != 0 && self.surgeons[seat].gift_hold > 0. {
            if self.on_beat() && self.surgeons[seat].gift_hold >= 0.2 {
                let kind = if self.case == 7 {
                    "Duet"
                } else if self.case >= 5 {
                    "Echo"
                } else {
                    "Hush"
                };
                self.gift_kind = kind.into();
                self.gift_left =
                    if kind == "Echo" { self.tune.echo_duration } else { 6. * 60. / self.bpm } * self.tune.gift_duration;
                self.surgeons[seat].gift = 0.;
                self.mark(&format!("gift:{kind}"));
                self.callout = match kind {
                    "Hush" => "The space between two heartbeats. Stay here.",
                    "Echo" => "The hands I had before I learned to be afraid.",
                    _ => "Two surgeons. One heartbeat.",
                }
                .into();
                self.emit(kind, "gift", p, seat, false);
            }
            self.surgeons[seat].gift_hold = 0.;
        }
        if self.code > 0. {
            if input.held & SHOCK != 0 {
                self.surgeons[seat].charge += dt;
            } else if old & SHOCK != 0 {
                let charge = self.surgeons[seat].charge;
                self.surgeons[seat].charge = 0.;
                if charge >= 1.1 && self.beat.min(1. - self.beat) < 0.25 {
                    self.shocks = self.shocks.saturating_sub(1);
                    self.mark("defibrillated");
                    self.rate(seat, 0.95, p);
                    self.emit("SINUS RHYTHM", "shock", p, seat, true);
                    if self.shocks == 0 {
                        self.code = 0.;
                        self.vitals = 40.;
                        self.callout = "We have a rhythm. Keep it.".into();
                    } else {
                        self.code = self.tune.code_window + 5.;
                    }
                } else {
                    self.callout = "Charge fully. Release as the ghost beat meets the line.".into();
                }
            }
            return;
        }
        if tool == 7 {
            self.surgeons[seat].cursor = Vec2::new(8.3, -3.1);
            if held && self.surgeons[seat].iv_cool <= 0. {
                self.surgeons[seat].charge += dt * 0.5;
            }
            if !held && was && self.surgeons[seat].charge > 0. {
                let c = self.surgeons[seat].charge;
                self.surgeons[seat].charge = 0.;
                self.surgeons[seat].iv_cool = 4.;
                self.mark("tool:7");
                if c > 1.12 {
                    self.mistake("Overdose. Watch the green band.", 8., seat);
                } else {
                    self.vitals = (self.vitals + (if c >= 0.75 { 18. } else { 9. * c }) * self.tune.heal).min(100.);
                    self.rate(seat, if c >= 0.75 { 0.96 } else { 0.5 }, p);
                }
            }
            return;
        }
        if tool == 6 && self.case != 7 {
            if held {
                self.mark("tool:6");
                for h in &mut self.hazards {
                    if h.pos.distance(p) < 3. {
                        h.reveal = 8.;
                    }
                }
            }
            return;
        }
        // Forceps keep their own target while the hand pulls away.
        let target = self.surgeons[seat]
            .grabbed
            .and_then(|id| self.hazards.iter().position(|h| h.id == id && h.alive))
            .or_else(|| self.target(p, tool));
        let Some(i) = target else {
            if held && !was && tool == 0 && p.length() < 7.0 {
                self.mistake("Doctor, that's healthy tissue.", 2., seat);
                let h = HazardSpec {
                    kind: "laceration".into(),
                    pos: p.to_array(),
                    end: Some((p + Vec2::new(0.9, 0.2)).to_array()),
                    hidden: false,
                    stage: 0,
                };
                self.spawn(&h);
            }
            if !held {
                self.surgeons[seat].grabbed = None;
                self.surgeons[seat].charge = 0.;
            }
            return;
        };
        let correct = self.hazards[i].tool(self.case) == tool || tool == 3 && self.hazards[i].kind == "sac";
        if !correct {
            if held && !was {
                self.mistake("Wrong instrument, Doctor.", 0., seat);
            }
            return;
        }
        if self.hazards[i].hidden && self.hazards[i].reveal <= 0. {
            return;
        }
        let power = self.tune.power
            / if matches!(self.hazards[i].kind.as_str(), "nodule" | "ember" | "sac") { self.tune.toughness.max(0.1) } else { 1. };
        if self.tune.one_hit && held && matches!(self.hazards[i].kind.as_str(), "nodule" | "ember" | "sac") {
            self.complete(i, seat, 1.);
            return;
        }
        match tool {
            0 | 8 => {
                if held {
                    let h = &mut self.hazards[i];
                    if h.kind == "tumor" {
                        let r = p.distance(h.pos);
                        if (r - 0.65).abs() < 0.5 {
                            h.progress += p.distance(self.surgeons[seat].last) * power / 3.4;
                        }
                    } else if h.kind == "ember" {
                        h.progress += dt * power / 0.7;
                    } else {
                        let (error, t) = line_distance(p, h.pos, h.end);
                        if error < 0.6 && t <= h.progress + 0.24 {
                            h.progress = h.progress.max((t + 0.07) * power.min(1.25));
                            self.surgeons[seat].error += error * dt;
                        }
                    }
                    if h.progress >= 0.98 {
                        let q = 1. - self.surgeons[seat].error.min(0.6);
                        self.surgeons[seat].error = 0.;
                        self.complete(i, seat, q);
                    }
                }
            }
            1 => {
                if held {
                    if self.surgeons[seat].grabbed.is_none() {
                        self.surgeons[seat].grabbed = Some(self.hazards[i].id);
                        self.surgeons[seat].origin = p;
                    }
                    if self.hazards[i].kind == "bone" {
                        self.hazards[i].pos = p;
                        self.hazards[i].angle += input.rotate * dt * 2.;
                        if p.distance(self.hazards[i].end) < 0.4 && self.hazards[i].angle.abs() < 0.25 {
                            self.hazards[i].pos = self.hazards[i].end;
                            self.hazards[i].end += Vec2::new(0., 1.2);
                            self.surgeons[seat].grabbed = None;
                            self.complete(i, seat, 0.95);
                        }
                    } else {
                        let delta = p - self.surgeons[seat].origin;
                        let dir = (self.hazards[i].end - self.hazards[i].home).normalize_or_zero();
                        let angle = delta.normalize_or_zero().dot(dir);
                        let diastole = self.beat > 0.28;
                        if delta.length() > 0.85 && (self.hazards[i].kind != "tendril" || diastole) {
                            self.surgeons[seat].grabbed = None;
                            if angle > 0.7 {
                                self.complete(i, seat, angle);
                            } else {
                                self.mistake("Pull along the axis, Doctor.", 3., seat);
                                self.complete(i, seat, 0.2);
                                self.spawn(&HazardSpec {
                                    kind: "laceration".into(),
                                    pos: p.to_array(),
                                    end: Some((p + Vec2::X).to_array()),
                                    hidden: false,
                                    stage: 0,
                                });
                            }
                        }
                    }
                } else {
                    self.surgeons[seat].grabbed = None;
                }
            }
            2 => {
                if held {
                    let h = &mut self.hazards[i];
                    let dir = (h.end - h.pos).normalize_or_zero();
                    let side = dir.perp_dot(p - h.pos);
                    let (_, along) = line_distance(p, h.pos, h.end);
                    if side.abs() > 0.09 && (h.side == 0. || side.signum() != h.side.signum()) && along < h.progress + 0.42 {
                        h.count += 1;
                        h.side = side;
                        let need = if h.kind == "bone" { 2. } else { (h.end.distance(h.pos) * 2.).ceil().max(3.) };
                        h.progress = h.count as f32 / need;
                    }
                    if h.progress >= 1. {
                        self.complete(i, seat, 0.93);
                    }
                }
            }
            3 | 5 => {
                if held {
                    let h = &mut self.hazards[i];
                    h.progress += dt * power * (if tool == 3 { 0.65 * input.pressure.max(0.2) } else { 0.8 });
                    if h.progress >= 1. {
                        self.complete(i, seat, if tool == 3 { 0.55 } else { 0.94 });
                    }
                }
            }
            4 | 6 => {
                if held {
                    self.surgeons[seat].charge += dt * power / if self.hazards[i].kind == "sac" { 0.75 } else { 1.2 };
                    self.hazards[i].progress = self.surgeons[seat].charge;
                    if self.surgeons[seat].charge > 1.35 {
                        self.surgeons[seat].charge = 0.;
                        self.hazards[i].progress = 0.;
                        self.mistake(
                            if tool == 6 || self.case == 6 { "Frostbite. Lift off." } else { "Overheated. Lift off." },
                            4.,
                            seat,
                        );
                        self.spawn(&HazardSpec { kind: "burn".into(), pos: p.to_array(), end: None, hidden: false, stage: 0 });
                    }
                } else if was {
                    let c = self.surgeons[seat].charge;
                    self.surgeons[seat].charge = 0.;
                    if c >= 0.72 {
                        self.complete(i, seat, if c <= 1.08 { 0.98 } else { 0.45 });
                    } else {
                        self.hazards[i].progress = 0.;
                    }
                }
            }
            _ => {}
        }
        if held && self.surgeons[seat].chain > 0 && self.time - self.surgeons[seat].last_good > self.tune.chain_window {
            self.surgeons[seat].chain = 0;
        }
    }
    fn strain(&mut self, dt: f32, pulse: bool) {
        let strain = self.stage().strain.clone();
        if strain.contains("introit") || strain.contains("libera") {
            if pulse && self.beats.is_multiple_of(3) {
                let speed = self.tune.strain_speed * (self.bpm / 72.).min(1.4);
                for h in &mut self.hazards {
                    if h.alive && h.kind == "nodule" && h.stage == 0 && h.age > 1.5 {
                        let k = h.id as f32;
                        h.pos = h.home
                            + Vec2::new((self.beats as f32 * 0.7 + k).sin(), (self.beats as f32 * 0.5 + k).cos()) * 0.8 * speed;
                        h.end = h.pos + Vec2::new(0., -1.2);
                    }
                }
            }
        }
        if strain.contains("lacrimosa") || strain.contains("libera") {
            let mut burst = vec![];
            for h in &mut self.hazards {
                if h.alive && h.kind == "sac" && h.age > 16. / self.tune.strain_speed.max(0.1) {
                    h.kind = "pool".into();
                    h.progress = 0.;
                    h.hidden = false;
                    burst.push(h.pos);
                }
            }
            for p in burst {
                self.mark("sac_burst");
                self.callout = "The sac has ruptured. Suction the caustic pool.".into();
                self.emit("CAUSTIC", "burst", p, 0, false);
            }
        }
        if strain.contains("dies") || strain.contains("furnace") || strain.contains("libera") {
            let count = self.hazards.iter().filter(|h| h.alive && h.kind == "ember").count();
            self.fever = (self.fever + dt * (count as f32 * 1.1 - 1.5)).clamp(0., 120.);
            if self.fever > 100. && !self.tune.immortal {
                self.vitals = (self.vitals - dt * 3.).max(0.);
            }
            if count > 0 && pulse && self.beats.is_multiple_of(5) {
                self.heat_radius = 0.;
                self.callout = "Heat ring. Lift off!".into();
                self.mark("heat_ring");
            }
            if self.heat_radius >= 0. {
                self.heat_radius += dt * 4.;
                for s in 0..4 {
                    if self.surgeons[s].active
                        && self.surgeons[s].held & USE != 0
                        && (self.surgeons[s].cursor.length() - self.heat_radius).abs() < 0.3
                    {
                        self.mistake("Lift off! Lift off!", 3., s);
                    }
                }
                if self.heat_radius > 11. {
                    self.heat_radius = -1.;
                }
            }
        }
    }
    pub fn bot_seat(&self, seat: usize) -> SurgeonInput {
        let s = &self.surgeons[seat];
        let mut input = SurgeonInput { active: true, aim: s.cursor, tool: s.tool, pressure: 1., ..Default::default() };
        if self.code > 0. {
            input.held = if s.charge < 1.22 || self.beat.min(1. - self.beat) > 0.17 { SHOCK } else { 0 };
            return input;
        }
        if s.gift >= 60. && self.case >= 3 && self.gift_left <= 0. {
            input.held = if s.gift_hold < 0.25 || !self.on_beat() { GIFT } else { 0 };
            return input;
        }
        if self.vitals < 65. && s.iv_cool <= 0. || s.tool == 7 && s.charge > 0. {
            input.tool = 7;
            input.held = if s.charge < 0.86 { USE } else { 0 };
            return input;
        }
        let target = s.grabbed.and_then(|id| self.hazards.iter().find(|h| h.id == id && h.alive)).or_else(|| {
            self.hazards.iter().filter(|h| h.alive).min_by(|a, b| {
                let weight = |h: &Hazard| s.cursor.distance(h.pos) - if h.kind == "bleeder" { 8. } else { 0. };
                weight(a).total_cmp(&weight(b))
            })
        });
        let Some(h) = target else { return input };
        let tool = if h.hidden && h.reveal <= 0. { 6 } else { h.tool(self.case) };
        input.tool = tool;
        let mut goal = h.pos;
        let mut hold = true;
        match tool {
            0 | 8 => {
                if h.kind == "tumor" {
                    let a = self.time * 4.;
                    goal = h.pos + Vec2::new(a.cos(), a.sin()) * 0.65;
                } else if h.kind != "ember" {
                    goal = h.pos.lerp(h.end, (h.progress + 0.1).min(1.));
                }
            }
            1 => {
                if s.grabbed.is_some() {
                    goal = if h.kind == "bone" {
                        input.rotate = if h.angle.abs() > 0.08 { -h.angle.signum() } else { 0. };
                        h.end
                    } else {
                        s.origin + (h.end - h.home).normalize_or_zero() * 1.1
                    };
                }
            }
            2 => {
                let dir = (h.end - h.pos).normalize_or_zero();
                let side = Vec2::new(-dir.y, dir.x);
                goal = h.pos.lerp(h.end, (h.progress + 0.05).min(0.95)) + side * if h.side > 0. { -0.35 } else { 0.35 };
            }
            4 | 6 => {
                hold = !(s.charge >= 0.88 && (tool == 4 || self.case == 7));
            }
            _ => {}
        }
        let delta = goal - s.cursor;
        input.aim = s.cursor + delta.clamp_length_max(self.tune.cursor_speed / 60.);
        if delta.length() > 0.65 && s.grabbed.is_none() {
            hold = false;
        }
        if tool != s.tool {
            hold = false;
        }
        if self.heat_radius >= 0. && (input.aim.length() - self.heat_radius).abs() < 0.75 {
            hold = false;
        }
        input.held = if hold { USE } else { 0 };
        input
    }
    fn blue_wave(&mut self) {
        self.wave += 1;
        self.blue_at = self.time + 12.;
        self.mark("codeblue_wave");
        let count = 2 + self.surgeons.iter().filter(|s| s.active && !s.ghost).count();
        let kinds = ["laceration", "pool", "polyp", "hook", "burn", "nodule"];
        for i in 0..count {
            let a = (self.wave as f32 * 1.7 + i as f32 * 2.4).sin() * 5.;
            let z = (self.wave as f32 + i as f32).cos() * 2.6;
            let kind = kinds[(self.wave as usize + i) % kinds.len()];
            self.spawn(&HazardSpec { kind: kind.into(), pos: [a, z], end: Some([a + 1., z - 0.4]), hidden: false, stage: 0 });
        }
        self.callout = format!("Triage wave {}. Keep the patient alive.", self.wave);
    }
    pub fn status_json(&self) -> serde_json::Value {
        serde_json::to_value(self).unwrap_or_default()
    }
}
fn line_distance(p: Vec2, a: Vec2, b: Vec2) -> (f32, f32) {
    let d = b - a;
    let t = ((p - a).dot(d) / d.length_squared().max(0.001)).clamp(0., 1.);
    (p.distance(a + d * t), t)
}

pub fn build(sim: &mut Sim, rest: Option<&str>) -> Result<()> {
    let level = include_str!("level.toml");
    let def = crate::room::RoomDef::parse(level).map_err(|e| anyhow!("surgery/level.toml: {e}"))?;
    crate::scenes::build_standalone_room(sim, "surgery", def);
    if let Some(id) = sim.state.player {
        sim.despawn(id);
    }
    sim.state.focus = Vec3::ZERO;
    let rest = rest.unwrap_or("title");
    let case = rest.strip_prefix("case/").and_then(|n| n.parse().ok()).unwrap_or(0);
    let mut game = Surgery::new(case, rest == "campaign", rest == "codeblue");
    if rest == "title" || rest == "card" || rest == "mirror" {
        game.mode = rest.into();
    }
    if rest == "attract" {
        game = Surgery::new(3, false, false);
        game.tune.bot = true;
        game.tune.immortal = true;
        game.surgeons[0].gift = 100.;
    }
    sim.state.play = Some(GameBox::new(game));
    Ok(())
}
impl Game for Surgery {
    const KEY: &'static str = "surgery";
    fn pre(
        &mut self,
        _sim: &mut Sim,
        input: &InputFrame,
        dt: f32,
        _events: &mut Vec<SimEvent>,
    ) -> BTreeMap<crate::entity::EntityId, InputFrame> {
        if self.mode == "results" && self.campaign && self.case < 7 {
            let coverage = self.coverage.clone();
            let completed = self.completed.clone();
            let difficulty = self.difficulty;
            let mut next = Self::new(self.case + 1, true, false);
            next.coverage = coverage;
            next.completed = completed;
            next.difficulty = difficulty;
            next.mark(&format!("phase:{}:0", next.case));
            *self = next;
        }
        let mut inputs = input.surgeons;
        if self.tune.bot {
            inputs[0] = self.bot_seat(0);
        }
        if self.case == 7 && !inputs[1].active && !self.blue {
            // Pet follows the lead surgeon; she cannot finish the operation for an idle player.
            if self.time - self.surgeons[0].last_good < 5.0 || self.tune.bot {
                inputs[1] = self.bot_seat(1);
            } else {
                self.surgeons[1].held = 0;
            }
        }
        self.tick(inputs, dt);
        BTreeMap::new()
    }
    fn status(&self, _sim: &Sim) -> serde_json::Value {
        self.status_json()
    }
    fn outcome(&self) -> Outcome {
        self.outcome
    }
    fn bot(&self, _sim: &Sim) -> InputFrame {
        let mut f = InputFrame::default();
        f.surgeons[0] = self.bot_seat(0);
        f
    }
}
