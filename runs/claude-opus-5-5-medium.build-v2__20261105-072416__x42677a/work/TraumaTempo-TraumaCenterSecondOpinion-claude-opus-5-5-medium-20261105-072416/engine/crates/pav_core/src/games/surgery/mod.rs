//! The surgical-action melodrama: cases and story as one deterministic phase machine.
//!
//! Scenes: `surgery/title`, `surgery/campaign` (or `surgery/campaign/<from>`), `surgery/case/<n>`
//! (or `surgery/case/<n>/<phase>`), `surgery/codeblue`, `surgery/attract`, `surgery/card`,
//! `surgery/mirror`. The bot presses through story and plays operations, so `surgery/campaign`
//! is the scripted playthrough of the whole game. `content/README.md` is the designer guide.

pub mod bot;
pub mod content;
pub mod cover;
pub mod cue;
pub mod field;
pub mod frame;
pub mod net;
pub mod paper;
pub mod strain;
pub mod tune;

use std::collections::BTreeMap;
use std::sync::Arc;

use anyhow::{Result, anyhow, bail};
use glam::Vec2;
use serde::{Deserialize, Serialize};
use serde_json::json;

use self::content::{CODE_BLUE, content, music_id};
use self::field::{Eng, Kind, Op, Rules, Tool};
use self::frame::{ActorView, CameraShot, ResultsView, SlotView, Stage, StoryView, SurgeryFrame};
use self::tune::{Difficulty, Tune};
use super::{Game, GameBox, Outcome};
use crate::entity::EntityId;
use crate::frame::SimEvent;
use crate::input::{InputFrame, SurgeonInput, surgeon_buttons as btn};
use crate::room::RoomDef;
use crate::sim::Sim;

/// The OR wide-shot set, a room file far from the field.
const LEVEL: &str = include_str!("surgery.toml");

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum Mode {
    #[default]
    Title,
    Campaign,
    /// One case by itself.
    Case,
    CodeBlue,
    Attract,
    Card,
    Mirror,
}

/// Dev switches (the panel's Tools page).
#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Dev {
    pub immortal: bool,
    pub freeze_timer: bool,
    pub full_gift: bool,
    pub one_hit: bool,
    /// The bot plays the human's seat too.
    pub bot_plays: bool,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Story {
    pub scene: u16,
    pub line: u16,
    pub typed: f32,
    pub hold: f32,
    pub actors: Vec<ActorView>,
    pub set: String,
    pub camera: u8,
    pub flash: f32,
    pub shake: f32,
    pub who: String,
    pub text: String,
    pub expr: String,
    /// Seconds this line has been up.
    pub line_age: f32,
    /// Sounds the stage asked for, played next tick.
    pub cues: Vec<u16>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Surgery {
    pub mode: Mode,
    pub stage: Stage,
    pub stage_t: f32,
    pub case: u8,
    pub story: Option<Story>,
    pub op: Option<Box<Op>>,
    pub results: Option<ResultsView>,
    pub outcome: Outcome,
    pub tune: Tune,
    pub diff: Difficulty,
    pub dev: Dev,
    pub tremor: bool,
    pub bot_skill: f32,
    pub tick: u64,
    pub time: f32,
    pub cov: Vec<u32>,
    pub music: u8,
    pub text_speed: f32,
    pub auto_advance: bool,
    pub seed: u64,
    /// Seconds of attract spent on this segment, and which.
    pub demo_seg: u8,
    pub demo_t: f32,
    /// Slot 0 isn't played from this copy (a hub server, a client).
    pub no_local: bool,
    pub death_time: String,
    /// The last result, for the shell to save.
    pub last_rank: Option<(u8, String, i64)>,
    pub cases_won: u8,
    #[serde(skip)]
    pub mirror_frame: Option<Arc<SurgeryFrame>>,
}

/// The scene's game state, for tools.
pub fn get(sim: &Sim) -> Option<&Surgery> {
    sim.play()?.get::<Surgery>()
}

pub fn get_mut(sim: &mut Sim) -> Option<&mut Surgery> {
    sim.state.play.as_mut()?.get_mut::<Surgery>()
}

/// What `RenderFrame::surgery` holds.
pub fn frame_of(sim: &Sim) -> Option<Arc<SurgeryFrame>> {
    let g = get(sim)?;
    if let Some(m) = &g.mirror_frame {
        return Some(m.clone());
    }
    Some(Arc::new(g.frame()))
}

/// Builds the scene: `surgery/<what>`.
pub fn build(sim: &mut Sim, rest: Option<&str>) -> Result<()> {
    let def = RoomDef::parse(&super::level_text("surgery/surgery", LEVEL)).map_err(|e| anyhow!("surgery.toml: {e}"))?;
    crate::scenes::build_standalone_room(sim, "surgery", def);
    if let Some(p) = sim.state.player {
        sim.despawn(p);
    }
    sim.state.focus = glam::Vec3::new(0.0, 0.0, 0.2);
    let seed = sim.state.rng.next_u32() as u64;
    let mut g = Surgery::new(seed);
    let parts: Vec<&str> = rest.unwrap_or("title").split('/').collect();
    match parts[0] {
        "title" => g.mode = Mode::Title,
        "card" => g.mode = Mode::Card,
        "mirror" => g.mode = Mode::Mirror,
        "campaign" => {
            g.mode = Mode::Campaign;
            let from: usize = parts.get(1).and_then(|p| p.parse().ok()).unwrap_or(0);
            g.begin_case(from.min(7));
        }
        "case" => {
            g.mode = Mode::Case;
            let n: usize = parts.get(1).ok_or_else(|| anyhow!("surgery/case/<n>: which case?"))?.parse()?;
            if n >= CODE_BLUE {
                bail!("surgery/case/{n}: cases are 0 to 7");
            }
            let phase: Option<usize> = parts.get(2).and_then(|p| p.parse().ok());
            g.begin_op(n);
            if let Some(p) = phase {
                g.jump_phase(p);
            }
            g.stage = Stage::Op;
        }
        "codeblue" => {
            g.mode = Mode::CodeBlue;
            g.begin_op(CODE_BLUE);
            g.stage = Stage::Op;
        }
        "attract" => {
            g.mode = Mode::Attract;
            g.dev.immortal = true;
            g.dev.full_gift = true;
            g.demo_seg = 0;
            g.begin_demo_segment();
        }
        other => bail!("unknown surgery scene '{other}' (title, campaign, case/<n>, codeblue, attract, card, mirror)"),
    }
    sim.state.play = Some(GameBox::new(g));
    Ok(())
}

impl Surgery {
    pub fn new(seed: u64) -> Self {
        let bot_skill = 1.0;
        Surgery {
            mode: Mode::Title,
            stage: Stage::Title,
            stage_t: 0.0,
            case: 0,
            story: None,
            op: None,
            results: None,
            outcome: Outcome::Playing,
            tune: Tune::default(),
            diff: Difficulty::default(),
            dev: Dev::default(),
            tremor: true,
            bot_skill,
            tick: 0,
            time: 0.0,
            cov: vec![0; cover::NAMES.len()],
            music: music_id("title"),
            text_speed: 1.0,
            auto_advance: false,
            seed,
            demo_seg: 0,
            demo_t: 0.0,
            no_local: false,
            death_time: String::new(),
            last_rank: None,
            cases_won: 0,
            mirror_frame: None,
        }
    }

    pub fn rules(&self) -> Rules {
        Rules {
            tune: self.tune,
            diff: self.diff,
            immortal: self.dev.immortal,
            freeze_timer: self.dev.freeze_timer,
            full_gift: self.dev.full_gift,
            one_hit: self.dev.one_hit,
            tremor: self.tremor,
            bot_skill: self.bot_skill,
            tick: self.tick,
            time: self.time,
        }
    }

    // ---------------------------------------------------------------------------------------
    // Flow

    /// A campaign's case begins: its story, then the chart.
    pub fn begin_case(&mut self, k: usize) {
        self.case = k as u8;
        self.op = None;
        self.results = None;
        let c = content();
        match c.cases[k].before.clone() {
            Some(id) => self.begin_story(&id),
            None => self.begin_chart(k),
        }
    }

    pub fn begin_story(&mut self, id: &str) {
        let c = content();
        let Some(scene) = c.scenes.iter().position(|s| s.id == id) else {
            log::error!("unknown story scene '{id}'");
            return;
        };
        self.stage = Stage::Story;
        self.stage_t = 0.0;
        self.story = Some(Story {
            scene: scene as u16,
            line: 0,
            set: "corridor".into(),
            ..Default::default()
        });
        self.run_stage_commands();
    }

    fn begin_chart(&mut self, k: usize) {
        self.case = k as u8;
        self.story = None;
        self.stage = Stage::Chart;
        self.stage_t = 0.0;
        self.begin_op(k);
        self.stage = Stage::Chart;
        let c = content();
        self.music = music_id(if c.cases[k].music.is_empty() { "or" } else { &c.cases[k].music });
    }

    /// Prepares the operation (its clock does not run in `Chart`).
    pub fn begin_op(&mut self, k: usize) {
        self.case = k as u8;
        let rules = self.rules();
        self.seed = self.seed.wrapping_mul(0x9E37_79B9).wrapping_add(k as u64 + 1);
        let mut op = Op::new(k, &rules, self.seed);
        let c = content();
        // Case 7: the partner is a surgeon of her own, until someone takes her seat.
        if c.cases[k].gift == "duet" {
            op.slots[1].active = true;
            op.slots[1].bot = true;
            op.slots[1].gift_kind = 2;
        }
        if self.mode == Mode::Attract {
            op.showing = true;
            for s in op.slots.iter_mut() {
                s.bot = s.active;
            }
            if k == CODE_BLUE {
                for s in op.slots.iter_mut() {
                    s.active = true;
                    s.bot = true;
                }
            }
        }
        if self.no_local {
            op.slots[0].active = false;
        }
        op.set_banner("OPERATION START");
        self.music = music_id(if c.cases[k].music.is_empty() { "or" } else { &c.cases[k].music });
        self.op = Some(Box::new(op));
        self.stage = Stage::Op;
        self.stage_t = 0.0;
    }

    fn after_case(&mut self) {
        let k = self.case as usize;
        let c = content();
        if self.mode == Mode::Campaign {
            self.cases_won = self.cases_won.max(k as u8 + 1);
            match c.cases[k].after.clone() {
                Some(id) => {
                    self.begin_story(&id);
                    return;
                }
                None => self.after_story(),
            }
            return;
        }
        self.finish();
    }

    fn after_story(&mut self) {
        let k = self.case as usize;
        let c = content();
        match self.mode {
            Mode::Campaign => {
                // A story scene ends either a case's "before" (go on to the chart) or its "after".
                let before = self.op.is_none() && self.results.is_none();
                if before {
                    self.begin_chart(k);
                } else if k + 1 < 8 {
                    self.begin_case(k + 1);
                } else {
                    self.finish();
                }
                let _ = c;
            }
            Mode::Attract => self.next_demo_segment(),
            _ => self.finish(),
        }
    }

    fn finish(&mut self) {
        self.stage = Stage::Done;
        self.stage_t = 0.0;
        self.story = None;
        self.outcome = Outcome::Won;
    }

    fn enter_results(&mut self) {
        let Some(op) = &self.op else { return };
        let c = content();
        let case = &c.cases[op.case as usize];
        let score: i64 = op.slots.iter().map(|s| s.score).sum();
        let tally: u32 = op.slots.iter().map(|s| s.tally[2] + s.tally[3]).sum();
        let vitals = (op.vitals * 20.0) as i64;
        let time = (op.timer.max(0.0) * 5.0) as i64;
        let mistakes = -(op.mistakes as i64) * 100;
        let total = (score + vitals + time + mistakes).max(0);
        let ratio = total as f32 / case.par.max(1.0);
        let rank = if ratio >= 1.15 {
            "ENCORE"
        } else if ratio >= 1.0 {
            "S"
        } else if ratio >= 0.85 {
            "A"
        } else if ratio >= 0.7 {
            "B"
        } else if ratio >= 0.5 {
            "C"
        } else {
            "D"
        };
        let lines = vec![
            ("Technique".to_string(), score),
            ("Vitals remaining".to_string(), vitals),
            ("Time remaining".to_string(), time),
            (format!("Clean work: {tally}, mistakes: {}", op.mistakes), mistakes),
        ];
        let results = ResultsView {
            case: op.case,
            title: case.name.clone(),
            patient: case.patient.clone(),
            fate: case.fate.clone(),
            lines,
            total,
            par: case.par,
            rank: rank.to_string(),
            t: 0.0,
            won: true,
            scores: op.slots.iter().filter(|s| s.active).map(|s| s.score).collect(),
        };
        self.last_rank = Some((op.case, rank.to_string(), total));
        self.results = Some(results);
        self.stage = Stage::Results;
        self.stage_t = 0.0;
        self.music = music_id("results");
        cover::merge(&mut self.cov, &op.cov.clone());
        if let Some(op) = &mut self.op {
            op.cov = vec![0; cover::NAMES.len()];
        }
    }

    /// Retries the operation from the last checkpoint: instant.
    pub fn retry_checkpoint(&mut self) {
        let rules = self.rules();
        if let Some(op) = &mut self.op {
            if op.retry_checkpoint(&rules) {
                self.stage = Stage::Op;
                self.stage_t = 0.0;
                self.outcome = Outcome::Playing;
                return;
            }
        }
        self.retry_start();
    }

    /// Retries the operation from its start.
    pub fn retry_start(&mut self) {
        let cov = self.op.as_ref().map(|o| o.cov.clone());
        let k = self.case as usize;
        self.begin_op(k);
        if let (Some(op), Some(cov)) = (&mut self.op, cov) {
            op.cov = cov;
        }
        self.stage = Stage::Op;
        self.stage_t = 0.0;
        self.outcome = Outcome::Playing;
    }

    // ---------------------------------------------------------------------------------------
    // Dev tools (called from the shell through the host)

    pub fn jump_phase(&mut self, p: usize) {
        let rules = self.rules();
        if let Some(op) = &mut self.op {
            op.hazards.clear();
            op.strain = None;
            op.code = None;
            op.heart.stopped = false;
            op.fever = None;
            let c = content();
            // The plate as of that phase.
            let case = &c.cases[op.case as usize];
            let mut plate = case.plate.clone();
            for ph in case.phase.iter().take(p + 1) {
                if let Some(r) = &ph.reveal_plate {
                    plate = r.clone();
                }
            }
            op.plate = field::plate_id(&c, &plate);
            op.plate_prev = op.plate;
            op.reveal = 1.0;
            if case.gift_locked && p > 0 {
                op.gifts.locked = false;
            }
            op.enter_phase(p.min(case.phase.len().saturating_sub(1)), &rules);
        }
    }

    pub fn skip_phase(&mut self) {
        let next = self.op.as_ref().map(|o| o.phase as usize + 1).unwrap_or(0);
        let last = self.op.as_ref().map(|o| content().cases[o.case as usize].phase.len()).unwrap_or(0);
        if next >= last {
            self.win_case();
        } else {
            self.jump_phase(next);
        }
    }

    pub fn win_case(&mut self) {
        if let Some(op) = &mut self.op {
            op.hazards.clear();
            op.strain = None;
            op.code = None;
            op.won = true;
        }
    }

    pub fn force_code(&mut self) {
        let rules = self.rules();
        if let Some(op) = &mut self.op {
            op.start_code(0, &rules);
        }
    }

    pub fn kill_patient(&mut self) {
        if let Some(op) = &mut self.op {
            op.vitals = 0.0;
            op.codes_left = 0;
            op.code = None;
            op.dead = true;
        }
    }

    /// Spawns a hazard of a kind at the cursor.
    pub fn spawn_hazard(&mut self, kind: &str) {
        let rules = self.rules();
        let Some(op) = &mut self.op else { return };
        let at = op.slots[0].cursor;
        let spec = content::SpawnSpec {
            kind: kind.to_string(),
            a: Some([at.x - 1.0, at.y]),
            b: Some([at.x + 1.0, at.y]),
            optional: true,
            ..Default::default()
        };
        op.spawn_spec(&spec);
        let _ = rules;
    }

    pub fn set_tune(&mut self, key: &str, v: f32) -> bool {
        self.tune.set(key, v)
    }

    // ---------------------------------------------------------------------------------------
    // Story

    /// Runs lines with no text at once (stage commands), and stops on the next spoken line.
    fn run_stage_commands(&mut self) {
        let c = content();
        let Some(st) = &mut self.story else { return };
        let scene = &c.scenes[st.scene as usize];
        loop {
            let Some(line) = scene.line.get(st.line as usize) else {
                self.story.as_mut().unwrap().text.clear();
                self.story_over();
                return;
            };
            if let Some(s) = &line.set {
                st.set = s.clone();
                st.actors.clear();
            }
            if let Some(r) = &line.enter {
                st.actors.retain(|a| a.rig != *r);
                st.actors.push(ActorView {
                    rig: r.clone(),
                    x: line.x.unwrap_or(0.0),
                    expr: line.expr.clone().unwrap_or_else(|| "neutral".into()),
                    age: 0.0,
                    talking: false,
                    leaving: 0.0,
                });
            }
            if let Some(r) = &line.exit {
                st.actors.retain(|a| a.rig != *r);
            }
            if let Some(m) = &line.music {
                self.music = music_id(m);
            }
            if let Some(id) = line.cue.as_deref().and_then(cue::id) {
                st.cues.push(id);
            }
            if let Some(f) = line.flash {
                st.flash = f;
            }
            if let Some(f) = line.shake {
                st.shake = f;
            }
            if let Some(cam) = &line.camera {
                st.camera = if cam == "or_wide" { 1 } else { 0 };
            }
            if let Some(text) = &line.text {
                st.who = line.who.clone().unwrap_or_default();
                st.text = text.clone();
                st.expr = line.expr.clone().unwrap_or_default();
                st.typed = 0.0;
                st.line_age = 0.0;
                if let (Some(who), Some(x)) = (&line.who, &line.expr) {
                    if let Some(a) = st.actors.iter_mut().find(|a| a.rig == *who) {
                        a.expr = x.clone();
                    }
                }
                return;
            }
            st.line += 1;
        }
    }

    fn story_over(&mut self) {
        self.story = None;
        self.after_story();
    }

    fn story_tick(&mut self, input: &SurgeonInput, dt: f32, events: &mut Vec<SimEvent>) {
        let (auto, speed) = (self.auto_advance || self.mode == Mode::Attract, self.text_speed);
        let mut next = false;
        {
            let Some(st) = &mut self.story else { return };
            for id in st.cues.drain(..) {
                events.push(SimEvent::Cue { id, pos: glam::Vec3::ZERO, gain: 1.0, pitch: 1.0 });
            }
            st.typed += dt * 34.0 * speed;
            st.line_age += dt;
            st.flash = (st.flash - dt * 2.0).max(0.0);
            st.shake = (st.shake - dt * 2.0).max(0.0);
            for a in &mut st.actors {
                a.age += dt;
                a.talking = a.rig == st.who && (st.typed as usize) < st.text.chars().count();
            }
            let len = st.text.chars().count() as f32;
            let done = st.typed >= len;
            if input.held & btn::ADVANCE != 0 {
                st.hold += dt;
            } else {
                st.hold = 0.0;
            }
            // Advance; hold to skip the whole scene.
            if st.hold > 0.8 {
                st.line = u16::MAX;
                next = true;
            } else if input.pressed & btn::ADVANCE != 0 {
                if done {
                    next = true;
                } else {
                    st.typed = len;
                }
            } else if auto && done && st.line_age > (len / 26.0).max(0.9) + 0.6 {
                next = true;
            }
        }
        if next {
            let c = content();
            let st = self.story.as_mut().unwrap();
            let scene = &c.scenes[st.scene as usize];
            if st.line == u16::MAX {
                // Skip: play what's left silently for its music and exits.
                st.line = scene.line.len() as u16;
                st.text.clear();
                self.story_over();
                return;
            }
            st.line += 1;
            self.run_stage_commands();
            events.push(SimEvent::Cue { id: cue::UI_NAV, pos: glam::Vec3::ZERO, gain: 0.3, pitch: 1.0 });
        }
    }

    // ---------------------------------------------------------------------------------------
    // Attract: a loop of about 25 s segments

    fn begin_demo_segment(&mut self) {
        self.demo_t = 0.0;
        self.story = None;
        match self.demo_seg % 6 {
            0 => {
                self.begin_op(3);
                self.jump_phase(demo_strain_phase(3));
                self.stage = Stage::Op;
            }
            1 => {
                self.begin_op(4);
                self.jump_phase(demo_strain_phase(4));
                self.stage = Stage::Op;
            }
            2 => {
                self.begin_op(5);
                let cysts = content().cases[5].phase.iter().position(|p| p.name == "cysts").unwrap_or(0);
                self.jump_phase(cysts);
                self.stage = Stage::Op;
            }
            3 => {
                self.begin_op(7);
                self.jump_phase(demo_strain_phase(7));
                self.stage = Stage::Op;
            }
            4 => {
                self.begin_op(CODE_BLUE);
                self.stage = Stage::Op;
            }
            _ => {
                self.op = None;
                self.begin_story("case3_before");
            }
        }
    }

    fn next_demo_segment(&mut self) {
        self.demo_seg = (self.demo_seg + 1) % 6;
        self.begin_demo_segment();
    }

    // ---------------------------------------------------------------------------------------
    // The frame

    pub fn frame(&self) -> SurgeryFrame {
        let c = content();
        let mut f = SurgeryFrame {
            stage: self.stage,
            stage_t: self.stage_t,
            time: self.time,
            tick: self.tick,
            case: self.case,
            music: self.music,
            demo: self.mode == Mode::Attract,
            death_time: self.death_time.clone(),
            results: self.results.clone(),
            camera: CameraShot::field(),
            can_retry: true,
            ..Default::default()
        };
        if let Some(case) = c.cases.get(self.case as usize) {
            f.case_name = case.name.clone();
            f.patient = case.patient.clone();
            f.life = case.life.clone();
            f.diagnosis = case.diagnosis.clone();
            f.surgeon = case.surgeon.clone();
        }
        // The plate behind the title breathes by itself.
        f.vitals = 100.0;
        f.bpm = 62.0;
        f.beat = (self.time * 62.0 / 60.0).fract();
        f.meter = 4;
        f.reveal = 1.0;
        f.time_scale = 1.0;
        if self.stage == Stage::Title || self.stage == Stage::Card {
            f.plate = field::plate_id(&c, "heart");
            f.plate_prev = f.plate;
        }
        if let Some(op) = &self.op {
            self.fill_op(&mut f, op, &c);
        }
        if let Some(st) = &self.story {
            f.story = Some(StoryView {
                scene: st.scene,
                line: st.line,
                typed: st.typed,
                who: st.who.clone(),
                text: st.text.clone(),
                expr: st.expr.clone(),
                actors: st.actors.clone(),
                set: st.set.clone(),
                camera: st.camera,
                flash: st.flash,
                shake: st.shake,
                auto: self.auto_advance,
                skip: (st.hold / 0.8).clamp(0.0, 1.0),
            });
            f.camera = if st.camera == 1 { CameraShot::or_wide() } else { CameraShot::paper() };
        }
        if self.stage == Stage::Results || self.stage == Stage::Chart {
            f.camera = CameraShot { distance: 21.5, ..CameraShot::field() };
        }
        if let Some(r) = &mut f.results {
            r.t = self.stage_t;
        }
        f
    }

    fn fill_op(&self, f: &mut SurgeryFrame, op: &Op, c: &content::Content) {
        let case = &c.cases[op.case as usize];
        let phase = case.phase.get(op.phase as usize);
        f.case = op.case;
        f.phase = op.phase;
        f.now = phase.map(|p| p.now.clone()).unwrap_or_default();
        f.guide = phase.is_some_and(|p| p.guide);
        f.plate = op.plate;
        f.plate_prev = op.plate_prev;
        f.reveal = op.reveal;
        f.reveal_at = op.reveal_at;
        f.vitals = op.vitals;
        f.bpm = op.heart.bpm;
        f.beat = op.heart.phase;
        f.beats = op.heart.beats;
        f.meter = op.heart.meter;
        f.bar = op.heart.bar;
        f.stopped = op.heart.stopped;
        f.timer = op.timer;
        f.timer_max = op.timer_max;
        f.fever = op.fever;
        f.heat_ring = op.heat_ring;
        f.ring_warn = op.ring_warn;
        f.hush = (op.gifts.hush / 6.0).clamp(0.0, 1.0);
        f.echo = op.gifts.echo;
        f.duet = op.gifts.duet;
        f.gift_locked = op.gifts.locked;
        f.time_scale = op.time_scale;
        f.hazards = op.hazards.clone();
        f.stains = op.stains.clone();
        f.threads = op.threads.clone();
        f.floats = op.floats.clone();
        f.flights = op.flights.clone();
        f.callout = op.callout.clone();
        f.banner = op.banner.clone();
        f.banner_t = op.banner_t;
        f.code = op.code;
        f.codes_left = op.codes_left;
        f.iv_cd = op.iv_cd;
        f.ghost = op.gifts.ghost;
        f.ghost_t = op.gifts.ghost_t;
        f.ripple = op.gifts.ripple;
        f.shake = op.shake;
        f.flash = op.flash;
        f.push = op.push;
        f.crisis = ((55.0 - op.vitals) / 45.0).clamp(0.0, 1.0);
        f.ring = std::array::from_fn(|k| op.ring[k] as u8);
        f.slots = op
            .slots
            .iter()
            .enumerate()
            .map(|(i, s)| SlotView {
                active: s.active,
                bot: s.bot,
                cursor: s.cursor,
                tool: op.tool_of(i) as u8,
                ring_pos: s.tool,
                using: s.held & btn::USE != 0,
                pressure: s.pressure,
                eng: eng_code(s.eng),
                meter: match s.eng {
                    Eng::Heat => op.find(s.eng_id).map(|k| op.hazards[k].fill).unwrap_or(0.0),
                    Eng::Iv => s.eng_a,
                    _ => 0.0,
                },
                score: s.score,
                chain: s.chain,
                gift: if op.slots[0].gift_kind == 3 { op.slots[0].gift } else { s.gift },
                gift_kind: s.gift_kind,
                arming: s.arming,
                recoil: s.recoil,
                clink: s.clink,
                hover: s.hover,
                flow: s.flow,
                charge: s.charge,
            })
            .collect();
        // The camera leans in for a moment of drama.
        let mut shot = CameraShot::field();
        let push = op.push * op.push * (3.0 - 2.0 * op.push);
        shot.distance -= 2.2 * push;
        let aim = op.reveal_at * 0.2 * push;
        shot.target[0] += aim.x;
        shot.target[2] += aim.y;
        f.camera = shot;
    }
}

fn eng_code(e: Eng) -> u8 {
    match e {
        Eng::None => 0,
        Eng::Cut => 1,
        Eng::Pull => 2,
        Eng::Stitch => 3,
        Eng::Suck => 4,
        Eng::Heat => 5,
        Eng::Paint => 6,
        Eng::Scan => 7,
        Eng::Iv => 8,
        Eng::Dress => 9,
        Eng::Bone => 10,
    }
}

/// The phase attract jumps to in a case: its first strain.
fn demo_strain_phase(case: usize) -> usize {
    let c = content();
    if case == 7 {
        return c.cases[7].phase.iter().position(|p| p.strain.as_deref() == Some("soloist")).unwrap_or(0);
    }
    c.cases[case].phase.iter().position(|p| p.strain.is_some()).unwrap_or(0)
}

impl Game for Surgery {
    const KEY: &'static str = "surgery";

    fn pre(
        &mut self,
        _sim: &mut Sim,
        input: &InputFrame,
        dt: f32,
        events: &mut Vec<SimEvent>,
    ) -> BTreeMap<EntityId, InputFrame> {
        self.tick += 1;
        self.time += dt;
        self.stage_t += dt;
        let first = input.surgeons[0];
        match self.stage {
            Stage::Story => self.story_tick(&first, dt, events),
            Stage::Chart => {
                if first.pressed & btn::ADVANCE != 0 || self.stage_t > 7.0 {
                    self.stage = Stage::Op;
                    self.stage_t = 0.0;
                    if let Some(op) = &mut self.op {
                        op.set_banner("OPERATION START");
                    }
                }
            }
            Stage::Op => self.op_tick(input, dt, events),
            Stage::Complete => {
                if self.stage_t > 1.6 {
                    self.enter_results();
                }
            }
            Stage::Results => {
                if self.stage_t > 1.0 && first.pressed & btn::ADVANCE != 0 {
                    if self.stage_t < 2.8 {
                        self.stage_t = 2.8; // show it all first
                    } else {
                        self.after_case();
                    }
                }
                if self.stage_t > 2.2 && self.stage_t - dt <= 2.2 {
                    events.push(SimEvent::Cue { id: cue::STAMP, pos: glam::Vec3::ZERO, gain: 1.0, pitch: 1.0 });
                }
            }
            Stage::Dead => {
                if first.pressed & btn::ADVANCE != 0 {
                    self.retry_checkpoint();
                } else if first.pressed & btn::CANCEL != 0 {
                    self.retry_start();
                }
            }
            Stage::Title | Stage::Done | Stage::Card => {}
        }
        if self.mode == Mode::Attract {
            self.demo_t += dt;
            if self.demo_t > 25.0 || self.stage == Stage::Results || self.stage == Stage::Complete || self.stage == Stage::Done {
                self.next_demo_segment();
            }
        }
        BTreeMap::new()
    }

    fn hud(&self, _sim: &Sim) -> Vec<String> {
        Vec::new() // the shell and HUD draw everything
    }

    fn status(&self, _sim: &Sim) -> serde_json::Value {
        let op = self.op.as_ref();
        json!({
            "outcome": self.outcome,
            "mode": format!("{:?}", self.mode),
            "stage": format!("{:?}", self.stage),
            "case": self.case,
            "phase": op.map(|o| o.phase),
            "vitals": op.map(|o| o.vitals),
            "timer": op.map(|o| o.timer),
            "bpm": op.map(|o| o.heart.bpm),
            "hazards": op.map(|o| o.hazards.iter().map(|h| format!("{}:{}", h.kind.key(), h.stage)).collect::<Vec<_>>()),
            "cursor": op.map(|o| [o.slots[0].cursor.x, o.slots[0].cursor.y]),
            "tool": op.map(|o| o.tool_of(0).key()),
            "gift": op.map(|o| o.slots[0].gift),
            "scores": op.map(|o| o.slots.iter().map(|s| s.score).collect::<Vec<_>>()),
            "actives": op.map(|o| o.slots.iter().map(|s| s.active).collect::<Vec<_>>()),
            "rank": self.results.as_ref().map(|r| r.rank.clone()),
            "total": self.results.as_ref().map(|r| r.total),
            "story": self.story.as_ref().map(|s| json!({"line": s.line, "who": s.who, "set": s.set})),
            "demo_seg": self.demo_seg,
            "music": self.music,
            "tick": self.tick,
        })
    }

    fn outcome(&self) -> Outcome {
        self.outcome
    }

    fn bot(&self, _sim: &Sim) -> InputFrame {
        let mut f = InputFrame::default();
        match self.stage {
            Stage::Op => {
                if let Some(op) = &self.op {
                    let rules = self.rules();
                    if !self.no_local && op.slots[0].active && !op.slots[0].bot {
                        f.surgeons[0] = op.bot_input(0, &rules);
                    }
                }
            }
            Stage::Dead | Stage::Done | Stage::Title | Stage::Card => {}
            // Story, chart and results: press on, every few ticks.
            _ => {
                f.surgeons[0].active = true;
                if self.tick.is_multiple_of(3) {
                    f.surgeons[0].pressed = btn::ADVANCE;
                    f.surgeons[0].held = btn::ADVANCE;
                }
            }
        }
        f
    }
}

impl Surgery {
    fn op_tick(&mut self, input: &InputFrame, dt: f32, events: &mut Vec<SimEvent>) {
        let rules = self.rules();
        let Some(op) = &mut self.op else { return };
        let mut inputs = input.surgeons;
        // A human on a seat takes it from the bot.
        for i in 0..4 {
            if inputs[i].active && op.slots[i].bot && self.mode != Mode::Attract {
                op.slots[i].bot = false;
            }
            if op.slots[i].bot || (self.dev.bot_plays && i == 0) {
                inputs[i] = op.bot_input(i, &rules);
            }
        }
        op.tick(&inputs, &rules, dt);
        events.append(&mut op.ev);
        // Each strain plays in its own meter; otherwise the case's own track.
        let c = content();
        self.music = match op.strain.as_ref().map(|s| &s.kind) {
            Some(strain::StrainKind::Introit) if op.is_director_case() => music_id("codeblue"),
            Some(strain::StrainKind::Introit) => music_id(if op.case == 7 { "libera" } else { "introit" }),
            Some(strain::StrainKind::Lacrimosa) => music_id(if op.case == 7 { "libera" } else { "lacrimosa" }),
            Some(strain::StrainKind::Dies) => music_id(if op.case == 7 { "libera" } else { "dies" }),
            Some(strain::StrainKind::Soloist | strain::StrainKind::Tendril) => music_id("libera"),
            Some(strain::StrainKind::Director) => music_id("codeblue"),
            None => music_id(if c.cases[op.case as usize].music == "tense" { "or" } else { &c.cases[op.case as usize].music }),
        };
        let (won, dead) = (op.won, op.dead);
        if won {
            op.set_banner("OPERATION COMPLETE");
            events.append(&mut op.ev);
            self.stage = Stage::Complete;
            self.stage_t = 0.0;
            events.push(SimEvent::Cue { id: cue::RATE_IMMACULATE, pos: glam::Vec3::ZERO, gain: 1.0, pitch: 0.8 });
            return;
        }
        if dead {
            let elapsed = op.elapsed as i32;
            self.death_time = format!("Time of death: 03:{:02}.", (42 + elapsed) % 60);
            cover::merge(&mut self.cov, &op.cov.clone());
            op.cov = vec![0; cover::NAMES.len()];
            op.dead = false;
            self.stage = Stage::Dead;
            self.stage_t = 0.0;
            self.outcome = Outcome::Lost;
            events.push(SimEvent::Cue { id: cue::FLATLINE, pos: glam::Vec3::ZERO, gain: 1.0, pitch: 1.0 });
        }
    }
}

/// The hazard kinds the dev panel can spawn at the cursor.
pub const SPAWNABLE: &[&str] = &["lacer", "pool", "bleeder", "object", "polyp", "tumor", "patch", "burn", "incision"];

/// Names of every instrument, in tool order (for tools and tests).
pub fn tool_names() -> Vec<&'static str> {
    Tool::ALL.iter().map(|t| t.key()).collect()
}

/// A hazard kind by key, for tests.
pub fn kind_of(key: &str) -> Option<Kind> {
    Kind::ALL.into_iter().find(|k| k.key() == key)
}

/// Field position helper for hosts.
pub fn clamp_field(p: Vec2) -> Vec2 {
    p.clamp(Vec2::new(-10.6, -5.6), Vec2::new(10.6, 5.9))
}
