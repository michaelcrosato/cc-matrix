//! Multi-event flows: the Big Stand, the Medley, Play Together, endings, dev mode, attract.

use super::events::{self, Kind};
use super::medley::{self, Medley};
use super::meta::{NAMES, fill};
use super::ui_model::*;
use super::world;
use super::{FitGame, Screen, Source, Then};
use crate::frame::SimEvent;
use crate::params::{self, ParamValue};
use crate::sim::Sim;

pub const FINALE_PHASES: [Kind; 5] = [Kind::Breath, Kind::Pose, Kind::Step, Kind::Plank, Kind::Still];
pub const ATTRACT_LIST: [Kind; 10] =
    [Kind::Dive, Kind::Paddle, Kind::Step, Kind::Pose, Kind::Tide, Kind::Floatie, Kind::Tray, Kind::Plank, Kind::Lap, Kind::Breath];

#[derive(Clone, Debug, Default, serde::Serialize, serde::Deserialize)]
pub struct Finale {
    pub phase: usize,
    pub scores: Vec<i32>,
    pub tips: u32,
    pub inner_peace: bool,
}

#[derive(Clone, Debug, Default, serde::Serialize, serde::Deserialize)]
pub struct Attract {
    pub idx: usize,
    pub t: f32,
    pub title: bool,
}

impl FitGame {
    // ------------------------------------------------------------------ the Big Stand

    pub fn start_finale(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        self.finale = Some(Finale::default());
        self.stack.retain(|s| matches!(s, Screen::Island));
        if self.stack.is_empty() {
            self.stack.push(Screen::Island);
        }
        let l = self.script.pick("pip_more.stand_pre", 0);
        self.talk("Pip", vec![l], Then::Nothing, "#8fd0ee", events);
        self.begin_finale_phase(sim);
    }

    pub fn begin_finale_phase(&mut self, sim: &mut Sim) {
        let Some(f) = self.finale.as_ref() else { return };
        let k = FINALE_PHASES[f.phase.min(4)];
        let phase = f.phase as u8;
        self.start_event(sim, k, Source::Finale(phase));
        if let Some(p) = self.play.as_mut() {
            p.run.finale = true;
            match k {
                Kind::Breath => p.run.total = 4.0 * 2.0 * self.rules.breath.inhale,
                Kind::Pose => p.run.total = 20.0,
                Kind::Step => {
                    let end = 1.0 + 64.0 * 60.0 / self.rules.step.bpm;
                    p.run.notes.retain(|n| n.t <= end);
                    p.run.total = end + 2.0;
                }
                Kind::Plank => p.run.total = 20.0,
                _ => {}
            }
        }
        // the finale set is the bay
        self.set = 8;
        world::enter_set(sim, 8);
        let cam = events::spec(k).cam;
        self.apply_camera(sim, cam, 8);
    }

    /// An event of a multi-event flow ended: record it and start what comes next.
    pub fn advance_multi(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        let Some(p) = self.play.take() else { return };
        let score = p.run.score(&self.rules);
        match p.source {
            Source::Finale(_) => {
                let tips = p.run.tips;
                let bonus = p.run.kind == Kind::Still && p.run.bonus;
                if p.run.kind == Kind::Still {
                    let l = self.script.pick("pip_more.stillness_end", 0);
                    self.say(l);
                }
                let (phase, done) = {
                    let f = self.finale.as_mut().unwrap();
                    f.scores.push(score);
                    f.tips += tips;
                    f.inner_peace = bonus;
                    f.phase += 1;
                    (f.phase, f.phase >= FINALE_PHASES.len())
                };
                if done {
                    self.pool.clear(sim);
                    self.finish_finale(sim, events);
                } else {
                    let _ = phase;
                    self.begin_finale_phase(sim);
                }
            }
            Source::Medley(i) => {
                if let Some(m) = self.medley.as_mut() {
                    m.cur.push(p.rec.clone());
                    m.scores.push(score);
                    m.idx = i as usize + 1;
                    if m.idx >= medley::ORDER.len() {
                        m.done = true;
                    }
                }
                let done = self.medley.as_ref().map(|m| m.done).unwrap_or(true);
                self.pool.clear(sim);
                if !done {
                    let idx = self.medley.as_ref().unwrap().idx;
                    self.start_event(sim, medley::ORDER[idx], Source::Medley(idx as u8));
                } else {
                    self.finish_medley_player(sim, events);
                }
            }
            Source::Attract => {
                self.pool.clear(sim);
            }
            _ => {}
        }
    }

    fn finish_finale(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        let f = self.finale.clone().unwrap_or_default();
        let avg = if f.scores.is_empty() { 0 } else { f.scores.iter().sum::<i32>() / f.scores.len() as i32 };
        let final_score = (avg - 15 * f.tips as i32).max(0);
        let morning = self.age_today.max(self.guest().ages.last().copied().unwrap_or(60));
        let final_age = (morning - (final_score / 100).min(10)).max(18);
        let name = NAMES[self.guest().name].to_string();
        {
            let g = self.save.guest_mut();
            g.final_age = final_age;
            g.finished = true;
            g.stamps = 5;
            g.checked_out = final_age <= 40;
        }
        self.age_today = final_age;
        let pass = final_age <= 40;
        let mut lines = vec![fill(&self.script.pick(if pass { "pip.checkout_pass" } else { "pip.checkout_fail" }, 0), &[("age", final_age.to_string())])];
        if f.inner_peace {
            lines.push("You did not press a thing. Inner Peace bonus: noted, with great respect.".into());
        } else {
            lines.push("You pressed something. I saw. I am not saying anything.".into());
        }
        lines.push(if pass {
            format!("{name} leaves Tippy Cay by rowboat. The gulls hold up cards: 10, 10, \"See me\".")
        } else {
            format!("{name} stays. The cushion is warm. The sea is on. Nobody minds.")
        });
        self.story = lines;
        self.story_pass = pass;
        self.finale = None;
        self.set = 8;
        events.push(SimEvent::Music { song: 0 });
        self.stack.retain(|s| matches!(s, Screen::Island));
        self.stack.push(Screen::Ending);
        self.focus = 0;
        self.save.serial += 1;
        let _ = sim;
    }

    /// The Continue on endings, credits, medley cards and pass cards.
    pub fn continue_story(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        match self.top().clone() {
            Screen::Ending => {
                self.stack.pop();
                self.stack.push(Screen::Credits);
                self.focus = 0;
                events.push(SimEvent::Music { song: 1 });
            }
            Screen::Credits => {
                self.stack.retain(|s| matches!(s, Screen::Island));
                if self.stack.is_empty() {
                    self.stack.push(Screen::Island);
                }
                self.save.guest_mut().free_play = true;
                self.save.guest_mut().day = 5;
                self.save.serial += 1;
                self.outcome = crate::games::Outcome::Won;
                self.set = 0;
                world::enter_set(sim, 0);
                if let Some(p) = sim.state.player {
                    sim.set_position(p, world::at(0, 0.0, 0.3, 4.0));
                }
                let l = self.script.pick("pip_more.free", 0);
                self.talk("Pip", vec![l], Then::Nothing, "#8fd0ee", events);
            }
            Screen::MedleyCard | Screen::Pass => {
                self.stack.pop();
                self.begin_medley_run(sim);
            }
            _ => {}
        }
    }

    // ------------------------------------------------------------------ the Medley

    pub fn start_together(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        let _ = (sim, events);
        self.stack.push(Screen::Together);
        self.focus = 0;
        self.players = self.players.clamp(2, 4);
    }

    pub fn begin_medley_run(&mut self, sim: &mut Sim) {
        if self.medley.is_none() {
            self.medley = Some(Medley { players: vec![self.save_name(0)], ..Default::default() });
        }
        let m = self.medley.as_mut().unwrap();
        m.idx = 0;
        m.scores.clear();
        m.done = false;
        // the same seed gives the same courses
        sim.state.rng = crate::rng::Rng::new(self.seed);
        self.start_event(sim, medley::ORDER[0], Source::Medley(0));
    }

    fn save_name(&self, i: usize) -> String {
        let g = &self.save.guests[i.min(3)];
        if g.used { NAMES[g.name].to_string() } else { format!("Guest {}", i + 1) }
    }

    pub fn begin_together(&mut self, sim: &mut Sim) {
        let players: Vec<String> = (0..self.players).map(|i| self.save_name(i)).collect();
        self.medley = Some(Medley { players, ..Default::default() });
        self.stack.retain(|s| matches!(s, Screen::Title));
        self.stack.push(Screen::Pass);
        self.focus = 0;
        let _ = sim;
    }

    fn finish_medley_player(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        let _ = events;
        let session = self.session;
        let (next, last) = {
            let Some(m) = self.medley.as_mut() else { return };
            let total = m.total();
            m.totals.push(total);
            let cur = std::mem::take(&mut m.cur);
            m.runs.push(cur);
            m.player += 1;
            (m.player, m.player >= m.players.len())
        };
        if session {
            // the hub's card handles the end; stay on the final screen
            self.stack = vec![Screen::Podium];
            return;
        }
        self.pool.clear(sim);
        self.stack.retain(|s| matches!(s, Screen::Title));
        if last {
            self.stack.push(Screen::Podium);
        } else {
            self.stack.push(Screen::Pass);
            if let Some(m) = self.medley.as_mut() {
                m.idx = 0;
                m.scores.clear();
                m.done = false;
            }
        }
        self.focus = 0;
        let _ = next;
    }

    pub fn podium_lines(&self) -> Vec<String> {
        let Some(m) = &self.medley else { return vec![] };
        let mut order: Vec<usize> = (0..m.totals.len()).collect();
        order.sort_by_key(|i| -m.totals[*i]);
        order.iter().enumerate().map(|(r, i)| format!("{}. {} \u{b7} {}", r + 1, m.players[*i], m.totals[*i])).collect()
    }

    // ------------------------------------------------------------------ attract

    /// Called each tick on the title screens: after 10 idle seconds the demo plays.
    pub fn attract_tick(&mut self, sim: &mut Sim, anything: bool, dt: f32, events: &mut Vec<SimEvent>) {
        let pre_game = matches!(self.top(), Screen::Title | Screen::Guests { .. } | Screen::CheckIn | Screen::Settings | Screen::About | Screen::Together);
        if matches!(self.top(), Screen::Attract) || self.attract.is_some() {
            if anything && !self.touch_only {
                self.stop_attract(sim, events);
                return;
            }
            self.attract_step(sim, dt, events);
            return;
        }
        if pre_game && self.idle >= 600 && !self.session {
            self.start_attract(sim, events);
        }
    }

    fn start_attract(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        self.attract = Some(Attract { idx: 0, t: 0.0, title: false });
        self.demo = true;
        self.attract_return = self.stack.clone();
        self.stack = vec![Screen::Attract];
        self.set = 0;
        world::enter_set(sim, 0);
        self.title_camera(sim);
        events.push(SimEvent::Music { song: 1 });
    }

    fn stop_attract(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        let _ = events;
        self.attract = None;
        self.demo = false;
        self.play = None;
        self.pool.clear(sim);
        self.stack = vec![Screen::Title];
        self.focus = 0;
        self.idle = 0;
        self.cam_key = (0, [0; 4]);
        self.place_title(sim);
    }

    fn attract_step(&mut self, sim: &mut Sim, dt: f32, events: &mut Vec<SimEvent>) {
        let Some(a) = self.attract.as_mut() else { return };
        a.t += dt;
        let sweep_over = a.idx == 0 && !a.title && a.t > 8.0;
        if self.play.is_none() && (sweep_over || a.idx > 0) && !a.title {
            if a.idx < ATTRACT_LIST.len() {
                let k = ATTRACT_LIST[a.idx];
                a.idx += 1;
                a.t = 0.0;
                self.stack = vec![Screen::Attract];
                self.start_event(sim, k, Source::Attract);
                // events in attract skip the count: jump straight to play
                if let Some(p) = self.play.as_mut() {
                    p.count = 0.0;
                    p.run.total = p.run.total.min(15.0);
                }
                self.stack.retain(|s| !matches!(s, Screen::Count | Screen::Card));
                self.stack.push(Screen::Play);
            } else {
                a.title = true;
                a.t = 0.0;
            }
        } else if a.title && a.t > 5.0 {
            a.idx = 0;
            a.title = false;
            a.t = 0.0;
            self.title_camera(sim);
        }
        // an attract event ends after about 15 seconds
        let finish = self.attract.as_ref().map(|a| a.t > 15.0).unwrap_or(false);
        if self.play.is_some() && finish {
            self.play = None;
            self.pool.clear(sim);
            self.stack = vec![Screen::Attract];
            self.set = 0;
            world::enter_set(sim, 0);
        }
        let _ = events;
    }

    // ------------------------------------------------------------------ dev mode

    pub const DEV_TABS: [&'static str; 6] = ["Jump", "Cheats", "Time", "Tuning", "View", "Save"];

    pub fn dev_menu(&self) -> super::screens::Menu {
        let mut items = vec![];
        let tabs: Vec<String> = Self::DEV_TABS.iter().map(|s| s.to_string()).collect();
        match self.tab.min(5) {
            0 => {
                for d in 1..=5 {
                    items.push(Item::button(format!("Day {d}")));
                }
                for k in events::ALL_KINDS {
                    items.push(Item::button(events::spec(k).name));
                }
                items.push(Item::button("Finale: the Big Stand"));
                for ph in 1..=5 {
                    items.push(Item::button(format!("Finale phase {ph}")));
                }
                items.push(Item::button("Attract mode"));
                items.push(Item::button("Medley"));
            }
            1 => {
                let on = |b: bool| if b { "On" } else { "Off" };
                items.push(Item::choice("No tips", on(self.no_tip)));
                items.push(Item::choice("Autoplay with the bot", on(self.autoplay)));
                items.push(Item::button("Give 5 minutes"));
                items.push(Item::button("Unlock everything"));
                items.push(Item::button("All stars"));
                items.push(Item::choice("Skip dialogue", on(self.skip_dialogue)));
                items.push(Item::button("Win this event now"));
                items.push(Item::button("Lose this event now"));
            }
            2 => {
                items.push(Item::choice("Time scale", format!("{:.2}x", self.time_scale)));
                items.push(Item::choice("Pause time", if self.time_paused { "On" } else { "Off" }));
                items.push(Item::button("Single step"));
            }
            3 => {
                let mut r = self.rules.clone();
                let list = params::list(&mut r);
                for p in list.iter().skip(self.dev_page * 6).take(6) {
                    let v = p.value.as_f64().unwrap_or(0.0) as f32;
                    let (lo, hi) = prange(p);
                    let norm = if hi > lo { (v - lo) / (hi - lo) } else { 0.0 };
                    items.push(Item::slider(p.path.replace('.', " \u{b7} "), norm, format!("{:.2}", v)));
                }
                items.push(Item::button("Next page"));
                items.push(Item::button("Reset all to defaults"));
            }
            4 => {
                let on = |b: bool| if b { "On" } else { "Off" };
                items.push(Item::choice("Input viewer", on(self.view_input)));
                items.push(Item::choice("Dot trace", on(self.view_trace)));
                items.push(Item::choice("Engine stats", on(self.view_stats)));
                items.push(Item::choice("Free camera", on(self.free_cam)));
                items.push(Item::choice("Ghost lanes", on(self.view_ghosts)));
            }
            _ => {
                items.push(Item::button("Reset this guest"));
            }
        }
        let mut m = super::screens::Menu {
            layout: Layout::List,
            title: "Dev Mode".into(),
            subtitle: String::new(),
            lines: vec![],
            items,
            tabs,
            prompts: vec![Prompt { act: Act::TabL, label: "Tab".into() }, Prompt { act: Act::TabR, label: "Tab".into() }, Prompt { act: Act::Confirm, label: "Select".into() }, Prompt { act: Act::Back, label: "Back".into() }],
        };
        if self.tab == 3 {
            m.subtitle = "Live balance sliders".into();
        }
        m
    }

    pub fn dev_activate(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        let i = self.focus;
        match self.tab {
            0 => {
                if i < 5 {
                    let g = self.save.guest_mut();
                    g.day = i as i32 + 1;
                    g.banked_today = 0;
                    g.done_today.clear();
                    g.checked_today = false;
                    self.stack = vec![Screen::Island];
                    self.begin_day(sim, events, true);
                } else if i < 5 + events::ALL_KINDS.len() {
                    let k = events::ALL_KINDS[i - 5];
                    self.stack = vec![Screen::Island];
                    self.save.guest_mut().used = true;
                    self.start_event(sim, k, Source::Free);
                } else {
                    match i - 5 - events::ALL_KINDS.len() {
                        0 => {
                            self.stack = vec![Screen::Island];
                            self.start_finale(sim, events);
                        }
                        n @ 1..=5 => {
                            self.stack = vec![Screen::Island];
                            self.save.guest_mut().used = true;
                            self.finale = Some(Finale { phase: n - 1, ..Default::default() });
                            self.begin_finale_phase(sim);
                        }
                        6 => {
                            self.idle = 600;
                            self.stack = vec![Screen::Title];
                        }
                        _ => {
                            self.stack = vec![Screen::Title];
                            self.begin_together(sim);
                        }
                    }
                }
            }
            1 => match i {
                0 => self.no_tip = !self.no_tip,
                1 => self.autoplay = !self.autoplay,
                2 => {
                    let g = self.save.guest_mut();
                    g.minutes += 5;
                    g.banked_today += 5;
                }
                3 => {
                    let g = self.save.guest_mut();
                    g.minutes = 99;
                    g.flips = vec![true; 5];
                    g.day = g.day.max(2);
                }
                4 => {
                    let g = self.save.guest_mut();
                    for k in events::ALL_KINDS {
                        g.bests.entry(events::spec(k).key.to_string()).or_default().stars = 3;
                    }
                }
                5 => self.skip_dialogue = !self.skip_dialogue,
                6 | 7 => {
                    if let Some(p) = self.play.as_mut() {
                        p.run.done = true;
                        if i == 7 {
                            p.run.acc = 0.0;
                        }
                    }
                    self.stack.retain(|s| !matches!(s, Screen::Dev | Screen::Pause));
                }
                _ => {}
            },
            2 => match i {
                0 => self.time_scale = if self.time_scale >= 4.0 { 0.25 } else { self.time_scale * 2.0 },
                1 => self.time_paused = !self.time_paused,
                _ => self.time_step = 1,
            },
            3 => {
                let mut r = self.rules.clone();
                let n = params::list(&mut r).len();
                let pages = n.div_ceil(6);
                let visible = (n - self.dev_page * 6).min(6);
                if i == visible {
                    self.dev_page = (self.dev_page + 1) % pages.max(1);
                } else if i == visible + 1 {
                    self.rules = super::rules::Rules::default();
                }
            }
            4 => match i {
                0 => self.view_input = !self.view_input,
                1 => self.view_trace = !self.view_trace,
                2 => self.view_stats = !self.view_stats,
                3 => self.free_cam = !self.free_cam,
                _ => self.view_ghosts = !self.view_ghosts,
            },
            _ => {
                let slot = self.save.slot;
                self.save.guests[slot] = super::meta::Guest::default();
                self.save.serial += 1;
                self.quit_to_title(sim);
            }
        }
        let _ = events;
    }

    pub fn dev_adjust(&mut self, i: usize, dir: i32) {
        if self.tab == 3 {
            let mut r = self.rules.clone();
            let list = params::list(&mut r);
            let idx = self.dev_page * 6 + i;
            if let Some(p) = list.get(idx) {
                let (lo, hi) = prange(p);
                let step = ((hi - lo) / 20.0) as f64 * dir as f64;
                let v = (p.value.as_f64().unwrap_or(0.0) + step).clamp(lo as f64, hi as f64);
                let pv = match p.value {
                    ParamValue::Int(_) => ParamValue::Int(v.round() as i64),
                    _ => ParamValue::Float(v),
                };
                let _ = params::set(&mut self.rules, &p.path, pv);
            }
        } else if self.tab == 2 && i == 0 {
            self.time_scale = if dir > 0 { (self.time_scale * 2.0).min(4.0) } else { (self.time_scale / 2.0).max(0.25) };
        }
    }

    pub fn dev_slider(&mut self, i: usize, v: f32) {
        if self.tab == 3 {
            let mut r = self.rules.clone();
            let list = params::list(&mut r);
            let idx = self.dev_page * 6 + i;
            if let Some(p) = list.get(idx) {
                let (lo, hi) = prange(p);
                let val = (lo + (hi - lo) * v.clamp(0.0, 1.0)) as f64;
                let pv = match p.value {
                    ParamValue::Int(_) => ParamValue::Int(val.round() as i64),
                    _ => ParamValue::Float(val),
                };
                let _ = params::set(&mut self.rules, &p.path, pv);
            }
        }
    }
}


fn prange(p: &params::ParamInfo) -> (f32, f32) {
    match p.kind {
        params::ParamKind::Float { min, max } => (min, max),
        params::ParamKind::Int { min, max } => (min as f32, max as f32),
        _ => (0.0, 1.0),
    }
}
