//! The game loop: input routing, the day, dialogue, events in play, results, the stage.

use std::sync::Arc;

use glam::{Vec2, Vec3};

use super::check::Check;
use super::events::{self, Fx, Intent, Kind, Run, sfx};
use super::meta::{self, GEAR, NAMES, OUTFITS, SKINS, fill};
use super::ui_model::*;
use super::world::{self, at};
use super::{Dlg, FitGame, Play, Screen, Source, Then};
use crate::color::Color;
use crate::entity::Spawn;
use crate::frame::SimEvent;
use crate::shape::{Shape, Visual};
use crate::input::{InputFrame, UiEvent, buttons as B};
use crate::puppet::{HelmKind, PuppetDef};
use crate::sim::Sim;

/// A bundle of what the player did this tick as menu input.
#[derive(Clone, Copy, Default, Debug)]
pub struct Nav {
    pub up: bool,
    pub down: bool,
    pub left: bool,
    pub right: bool,
    pub ok: bool,
    pub back: bool,
    pub tab_l: bool,
    pub tab_r: bool,
    pub pause: bool,
    pub sched: bool,
    pub hover: Option<usize>,
    pub click: Option<usize>,
    pub slider: Option<(usize, f32)>,
    pub any: bool,
}

pub fn nav_of(input: &InputFrame) -> Nav {
    let mut n = Nav {
        up: input.just(B::MENU_UP),
        down: input.just(B::MENU_DOWN),
        left: input.just(B::MENU_LEFT),
        right: input.just(B::MENU_RIGHT),
        ok: input.just(B::CONFIRM),
        back: input.just(B::BACK),
        tab_l: input.just(B::TAB_L),
        tab_r: input.just(B::TAB_R),
        pause: input.just(B::PAUSE),
        sched: input.just(B::SCHEDULE),
        any: input.any || input.pressed != 0 || input.lean.length() > 0.3,
        ..Default::default()
    };
    match input.ui {
        Some(UiEvent::Hover(i)) => n.hover = Some(i as usize),
        Some(UiEvent::Click(i)) => n.click = Some(i as usize),
        Some(UiEvent::Slider(i, v)) => n.slider = Some((i as usize, v)),
        Some(UiEvent::Back) => n.back = true,
        None => {}
    }
    n
}

/// Interactables on the island: label and world position.
pub fn interactables(g: &FitGame) -> Vec<(String, Vec3)> {
    let mut v = vec![
        ("Pip".to_string(), at(0, 0.0, 0.0, -1.8)),
        ("Minute Clam".to_string(), at(0, 6.5, 0.0, -3.6)),
        ("Calendar".to_string(), at(0, -6.0, 0.0, -7.6)),
        ("Sleep".to_string(), at(0, -13.6, 0.0, 22.0)),
        ("Marjorie".to_string(), at(0, 10.0, 0.0, 8.0)),
        ("Two-Towel Tom".to_string(), at(0, -9.0, 0.0, 10.0)),
        ("The Twins".to_string(), at(0, 12.0, 0.0, -12.0)),
    ];
    let flips = [(-14.0, 8.0), (22.0, -14.0), (-24.0, -6.0), (4.0, -24.0), (26.0, 12.0)];
    for (i, (x, z)) in flips.iter().enumerate() {
        if !g.guest().flips[i] {
            v.push((format!("Flip-flop"), at(0, *x, 0.0, *z)));
        }
    }
    v
}

pub const MATS: [(f32, f32); 4] = [(-18.0, -0.2), (18.0, -0.2), (0.0, 22.8), (-20.0, 17.8)];

fn flat(a: Vec3, b: Vec3) -> f32 {
    Vec2::new(a.x - b.x, a.z - b.z).length()
}

impl FitGame {
    // ------------------------------------------------------------------ update

    pub fn update(&mut self, sim: &mut Sim, input: &InputFrame, dt: f32, events: &mut Vec<SimEvent>) {
        if self.toast.1 > 0 {
            self.toast.1 -= 1;
        }
        let nav = nav_of(input);
        self.last_lean = [input.lean.x, input.lean.y];
        self.last_held = input.held;
        if self.view_trace && self.tick % 2 == 0 {
            self.trace.push([self.core.cob.x, self.core.cob.y]);
            if self.trace.len() > 150 {
                self.trace.remove(0);
            }
        }
        if nav.any {
            self.idle = 0;
        } else {
            self.idle += 1;
        }
        let dt = if self.time_paused {
            if self.time_step > 0 {
                self.time_step = 0;
                dt
            } else {
                0.0
            }
        } else {
            dt * self.time_scale
        };
        if nav.click == Some(u16::MAX as usize) && self.touch_only {
            // the touch card's Settings button
            self.attract = None;
            self.demo = false;
            self.play = None;
            self.pool.clear(sim);
            self.stack = vec![Screen::Title, Screen::Settings];
            self.focus = 0;
            self.place_title(sim);
            return;
        }
        let was_attract = self.attract.is_some();
        self.attract_tick(sim, nav.any, dt, events);
        if was_attract && self.attract.is_none() {
            return;
        }
        if self.session && matches!(self.top(), Screen::MedleyCard) && input.down(B::HUB_GO) {
            self.stack.pop();
            self.begin_medley_run(sim);
            return;
        }
        if input.pressed & B::HUB_GO != 0 {
            // the hub's clock started: nothing to do, the session game is already running
        }
        match self.top().clone() {
            Screen::Island => self.island_update(sim, input, &nav, dt, events),
            Screen::Talk => self.talk_update(sim, &nav, dt, events),
            Screen::Card => {
                if nav.ok || nav.click.is_some() {
                    self.begin_count(events);
                } else if nav.back {
                    self.cancel_event(sim);
                }
            }
            Screen::Count => self.count_update(sim, input, dt, events),
            Screen::Play => self.play_update(sim, input, dt, events),
            Screen::CheckIntro | Screen::CheckTest => self.check_update(sim, input, dt, events),
            Screen::Report => self.report_update(sim, &nav, dt, events),
            Screen::Stamp => {
                self.stamp_t -= dt;
                if self.stamp_t <= 0.0 || nav.ok {
                    self.finish_stamp(sim, events);
                }
            }
            Screen::Pause => {
                self.paused_for += 1;
                self.menu_update(sim, &nav, events);
            }
            Screen::Attract => {}
            Screen::Result if self.session || self.demo => {
                self.result_t += dt;
                if self.result_t > 2.5 {
                    self.result_t = 0.0;
                    self.focus = 0;
                    self.activate(sim, events);
                }
            }
            Screen::Dev => {
                if nav.tab_l || nav.tab_r {
                    let d = if nav.tab_l { 5 } else { 1 };
                    self.tab = (self.tab + d) % 6;
                    self.focus = 0;
                    self.dev_page = 0;
                }
                self.menu_update(sim, &nav, events);
            }
            _ => {
                self.menu_update(sim, &nav, events);
            }
        }
    }

    fn menu_update(&mut self, sim: &mut Sim, nav: &Nav, events: &mut Vec<SimEvent>) {
        let n = self.menu_len();
        if self.focus >= n {
            self.focus = n.saturating_sub(1);
        }
        let paged = matches!(self.top(), Screen::HowTo | Screen::About);
        if let Some(h) = nav.hover {
            if h < n && h != self.focus && self.menu().items[h].enabled {
                self.focus = h;
                self.sfx(events, sfx::UI_MOVE, 0.3, 1.0);
            }
        }
        if let Some((i, v)) = nav.slider {
            self.set_slider(i, v);
        }
        let cards = matches!(self.top(), Screen::Guests { .. });
        if nav.up && !cards {
            self.move_focus(-1);
            self.sfx(events, sfx::UI_MOVE, 0.4, 1.0);
        }
        if nav.down && !cards {
            self.move_focus(1);
            self.sfx(events, sfx::UI_MOVE, 0.4, 1.0);
        }
        if cards {
            if nav.left || nav.up {
                self.move_focus(-1);
                self.sfx(events, sfx::UI_MOVE, 0.4, 1.0);
            }
            if nav.right || nav.down {
                self.move_focus(1);
                self.sfx(events, sfx::UI_MOVE, 0.4, 1.0);
            }
        } else if nav.left || nav.right {
            let d = if nav.left { -1 } else { 1 };
            if paged {
                self.adjust(0, d, events);
            } else {
                let f = self.focus;
                self.adjust(f, d, events);
            }
        }
        if matches!(self.top(), Screen::Schedule) {
            if nav.tab_l || nav.tab_r {
                let d = if nav.tab_l { -1 } else { 1 };
                self.tab = (self.tab as i32 + d).rem_euclid(5) as usize;
                self.focus = 0;
                self.sfx(events, sfx::UI_MOVE, 0.4, 1.2);
            }
        }
        if let Some(c) = nav.click {
            if c < n {
                self.focus = c;
                self.activate(sim, events);
            }
        } else if nav.ok && !paged {
            self.activate(sim, events);
        } else if nav.ok && paged {
            self.adjust(0, 1, events);
        }
        if nav.back || (nav.pause && matches!(self.top(), Screen::Pause)) {
            self.back(sim, events);
        }
    }

    // ------------------------------------------------------------------ island

    fn island_update(&mut self, sim: &mut Sim, input: &InputFrame, nav: &Nav, _dt: f32, events: &mut Vec<SimEvent>) {
        if nav.pause {
            self.push(Screen::Pause);
            return;
        }
        if nav.sched {
            self.tab = 0;
            self.push(Screen::Schedule);
            return;
        }
        let Some(p) = sim.state.player.and_then(|id| sim.feet(id)) else { return };
        // nearest interactable within reach
        let list = interactables(self);
        let mut near = None;
        let mut best = 2.2;
        for (i, (_, pos)) in list.iter().enumerate() {
            let d = flat(*pos, p);
            if d < best {
                best = d;
                near = Some(i);
            }
        }
        self.near = near;
        if self.mat_cool > 0 {
            self.mat_cool -= 1;
        }
        // the mouse: the thing under the cursor lights up; a click walks there (and acts on it)
        self.hover_idx = None;
        if let Some(aim) = input.aim {
            let mut bd = 1.2;
            for (i, (_, pos)) in list.iter().enumerate() {
                let d = flat(*pos, aim);
                if d < bd {
                    bd = d;
                    self.hover_idx = Some(i);
                }
            }
        }
        if input.just(B::WORLD_CLICK) {
            if let Some(aim) = input.aim {
                self.walk_to = match self.hover_idx {
                    Some(i) => Some((list[i].1, Some(i))),
                    None => {
                        let mat = MATS.iter().map(|(x, z)| at(0, *x, 0.0, *z)).find(|m| flat(*m, aim) < 1.5);
                        Some((mat.unwrap_or(aim), None))
                    }
                };
            }
        }
        if let Some((t, idx)) = self.walk_to {
            if flat(t, p) < 0.8 {
                self.walk_to = None;
                if let Some(i) = idx {
                    self.interact(sim, events, i, &list);
                    return;
                }
            }
        }
        if nav.ok || input.just(B::INTERACT) || input.just(B::ACT) {
            if let Some(i) = near {
                self.walk_to = None;
                self.interact(sim, events, i, &list);
                return;
            }
        }
        if self.mat_cool == 0 {
            for (i, (x, z)) in super::run::MATS.iter().enumerate() {
                if flat(at(0, *x, 0.0, *z), p) < 1.25 {
                    // stepping on a mat opens the card of that pavilion's first open event
                    if let Some(k) = self.day_events(i).first().copied() {
                        self.start_event(sim, k, Source::Island);
                        return;
                    }
                }
            }
        }
        if input.just(B::WAVE) {
            self.wave_t = 1.6;
            self.sfx(events, sfx::SQUEAK, 0.4, 1.4);
            if let Some(i) = near {
                let who = &list[i].0;
                if who != "Flip-flop" {
                    self.say(format!("{who} waves back. Politely."));
                }
            }
        }
    }

    fn interact(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>, i: usize, list: &[(String, Vec3)]) {
        let g = self.guest().clone();
        let day = g.day.clamp(1, 5) as usize;
        let name = NAMES[g.name].to_string();
        match list[i].0.as_str() {
            "Pip" => {
                let key = if g.free_play && self.talk_n % 3 == 0 { "pip_more.free" } else if self.talk_n % 2 == 0 { "pip.did_you_know" } else { "pip_more.idle" };
                let mut lines = vec![self.script.pick(key, self.talk_n)];
                if g.banked_today >= self.goal() && self.goal() > 0 {
                    lines.insert(0, fill(&self.script.pick("pip.goal_met", self.talk_n), &[("minutes", g.banked_today.to_string())]));
                }
                self.talk_n += 1;
                self.talk("Pip", lines, Then::Nothing, "#8fd0ee", events);
            }
            "Minute Clam" => {
                self.sfx(events, sfx::CLAM, 0.9, 1.0);
                let l = fill(&self.script.pick("pip.clam", 0), &[("minutes", g.minutes.to_string())]);
                self.talk("Pip", vec![l], Then::Nothing, "#8fd0ee", events);
            }
            "Calendar" => self.push(Screen::Calendar),
            "Sleep" => {
                if self.goal() == 0 || g.banked_today >= self.goal() {
                    self.go_sleep(sim, events);
                } else {
                    let l = self.script.pick("pip.sleep_not_yet", 0);
                    self.talk("Pip", vec![l], Then::Nothing, "#8fd0ee", events);
                }
            }
            "Marjorie" => {
                let l = self.script.pick(&format!("guest.marjorie.d{day}"), 0);
                self.talk("Marjorie", vec![l], Then::Nothing, "#ffffff", events);
            }
            "Two-Towel Tom" => {
                let l = if g.flips_found() >= 5 { self.script.pick("guest.tom.all", 0) } else { self.script.pick(&format!("guest.tom.d{}", day.min(2)), 0) };
                self.talk("Tom", vec![l], Then::Nothing, "#8fdde0", events);
            }
            "The Twins" => {
                let l = self.script.pick(&format!("guest.twins.d{}", day.min(2)), 0);
                self.talk("The Twins", vec![l], Then::Nothing, "#ffd166", events);
            }
            "Flip-flop" => {
                // which one: match position
                let flips = [(-14.0, 8.0), (22.0, -14.0), (-24.0, -6.0), (4.0, -24.0), (26.0, 12.0)];
                let pos = list[i].1;
                if let Some(idx) = flips.iter().position(|(x, z)| (at(0, *x, 0.0, *z) - pos).length() < 0.1) {
                    self.save.guest_mut().flips[idx] = true;
                    self.save.serial += 1;
                    self.sfx(events, sfx::POP, 0.8, 1.2);
                    let n = self.guest().flips_found();
                    let mut lines = vec![self.script.pick("flip.found", 0)];
                    if n >= 5 {
                        lines.push(self.script.pick("guest.tom.all", 0));
                    } else {
                        lines.push(format!("That makes {n} of 5."));
                    }
                    self.talk("You", lines, Then::Nothing, "#ffffff", events);
                }
            }
            _ => {}
        }
    }

    // ------------------------------------------------------------------ dialogue

    pub fn talk(&mut self, who: &str, lines: Vec<String>, then: Then, color: &str, events: &mut Vec<SimEvent>) {
        let _ = events;
        let mut lines: Vec<String> = lines.into_iter().filter(|l| !l.is_empty()).collect();
        if lines.is_empty() {
            // never lose what comes next (the check, sleeping) because a line is missing
            lines.push("...".to_string());
        }
        self.dlg = Some(Dlg { speaker: who.to_string(), lines, idx: 0, shown: 0.0, color: color.to_string(), then });
        if !matches!(self.top(), Screen::Talk) {
            self.stack.push(Screen::Talk);
        }
    }

    fn talk_update(&mut self, sim: &mut Sim, nav: &Nav, dt: f32, events: &mut Vec<SimEvent>) {
        let speed = 45.0 * self.save.settings.text_speed;
        let Some(d) = self.dlg.as_mut() else {
            self.stack.pop();
            return;
        };
        let line = d.lines[d.idx].clone();
        let len = line.chars().count() as f32;
        let before = d.shown;
        let fast = self.autoplay || self.demo || self.skip_dialogue;
        d.shown = (d.shown + dt * speed * if fast { 4.0 } else { 1.0 }).min(len);
        // one syllable per 2-3 letters
        let spk = speaker_id(&d.speaker);
        let (b, a) = ((before / 2.5) as usize, (d.shown / 2.5) as usize);
        if a > b {
            let ch = line.chars().nth(d.shown as usize - 1).unwrap_or('a');
            let vowel = match ch.to_ascii_lowercase() {
                'a' => 0,
                'e' => 1,
                'i' => 2,
                'o' => 3,
                'u' => 4,
                c => (c as u8 % 5),
            };
            let end = ch == '.' || ch == '!' ;
            let q = ch == '?';
            let pitch = if end { 0.8 } else if q { 1.25 } else { 1.0 + 0.1 * ((d.shown as usize % 3) as f32 - 1.0) };
            events.push(SimEvent::Syllable { speaker: spk, vowel, pitch });
        }
        if nav.ok || nav.click.is_some() || nav.back || (fast && d.shown >= len) {
            if d.shown < len && !fast {
                d.shown = len;
            } else if d.idx + 1 < d.lines.len() {
                d.idx += 1;
                d.shown = 0.0;
            } else {
                let then = d.then.clone();
                self.dlg = None;
                self.stack.pop();
                match then {
                    Then::StartCheck => self.start_check(sim, events),
                    Then::Sleep => self.go_sleep(sim, events),
                    Then::Island | Then::Nothing => {}
                }
            }
        }
    }

    // ------------------------------------------------------------------ the day

    pub fn begin_intro(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        self.set = 0;
        world::enter_set(sim, 0);
        if let Some(p) = sim.state.player {
            sim.set_position(p, at(0, 0.0, 0.3, 2.0));
        }
        let lines: Vec<String> = self.script.all("pip.intro").to_vec();
        self.save.guest_mut().last_day = self.today;
        self.dlg = None;
        self.talk("Pip", lines, Then::StartCheck, "#8fd0ee", events);
        self.dirty = true;
    }

    /// Wake on the cabana deck: Pip greets, absence comment if days passed, then the check.
    pub fn begin_day(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>, fresh: bool) {
        self.set = 0;
        world::enter_set(sim, 0);
        let g = self.guest().clone();
        if let Some(p) = sim.state.player {
            sim.set_position(p, at(0, -13.6, 0.3, 20.5));
        }
        self.dirty = true;
        let name = NAMES[g.name].to_string();
        let mut lines = vec![];
        let away = self.today - g.last_day;
        if g.last_day > 0 && away > 0 && !fresh {
            lines.push(fill(&self.script.pick("pip.absence", away as usize), &[("n", away.to_string())]));
        }
        self.save.guest_mut().last_day = self.today;
        if g.checked_today || g.finished && g.free_play && false {
            self.age_today = g.ages.last().copied().unwrap_or(0);
            if !lines.is_empty() {
                self.talk("Pip", lines, Then::Nothing, "#8fd0ee", events);
            }
            return;
        }
        let day = g.day.clamp(1, 5);
        lines.push(fill(&self.script.pick(&format!("pip.greet_{day}"), 0), &[("name", name)]));
        self.talk("Pip", lines, Then::StartCheck, "#8fd0ee", events);
    }

    fn go_sleep(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        let g = self.save.guest_mut();
        if g.day <= 5 && !g.free_play {
            g.stamps = g.day;
        } else if g.free_play {
            g.real_stamps.push(self.today);
        }
        self.stamp_t = 2.4;
        let day = self.guest().stamps;
        let _ = day;
        self.sfx(events, sfx::STAMP, 1.0, 1.0);
        events.push(SimEvent::Sfx { id: sfx::STINGER_WIN, gain: 0.8, pitch: 1.0 });
        self.stack.push(Screen::Stamp);
        let _ = sim;
    }

    fn finish_stamp(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        self.stack.pop();
        let g = self.save.guest_mut();
        let was = g.day;
        if g.day < 5 && !g.free_play {
            g.day += 1;
        } else if !g.free_play {
            g.day = 5;
        }
        g.banked_today = 0;
        g.done_today.clear();
        g.checked_today = false;
        self.save.serial += 1;
        if was >= 5 && !self.guest().free_play && !self.guest().finished {
            // the stay is over without the Big Stand: stay on day five
        }
        self.begin_day(sim, events, true);
    }

    pub fn start_check(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        let mut c = Check::new(&self.rules, &mut sim.state.rng);
        c.skill_hint = self.guest().ages.len() as i32;
        c.lines = self.script.all("pip_more.check_intro").to_vec();
        self.check = Some(c);
        self.set = 1;
        world::enter_set(sim, 1);
        self.apply_camera(sim, [12.0, 0.0, 8.5, 36.0], 0);
        self.core = super::core::BalanceCore::new(&mut sim.state.rng);
        self.stack.push(Screen::CheckIntro);
        let _ = events;
    }

    fn check_update(&mut self, sim: &mut Sim, input: &InputFrame, dt: f32, events: &mut Vec<SimEvent>) {
        let Some(mut c) = self.check.take() else {
            self.stack.pop();
            return;
        };
        let it = if self.autoplay || self.demo {
            c.bot(&self.core, &self.rules)
        } else {
            self.intent(input)
        };
        c.step(&mut self.core, &self.rules, &mut sim.state.rng, &it, dt);
        for f in std::mem::take(&mut c.fx) {
            self.apply_fx(events, f);
        }
        if c.stage_started() && matches!(self.top(), Screen::CheckIntro) {
            self.stack.pop();
            self.stack.push(Screen::CheckTest);
        }
        let done = c.done;
        self.check = Some(c);
        if done {
            self.finish_check(sim, events);
        }
    }

    fn finish_check(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        let c = self.check.take().unwrap();
        let skill = c.skill();
        let g = self.guest().clone();
        let days_done = g.stamps;
        let stars = g.total_stars();
        let age = (24.0 + 56.0 * (1.0 - skill).max(0.0).powf(1.1) - 2.0 * days_done as f32 - (stars as f32 / 3.0).min(8.0)).clamp(18.0, 99.0).round() as i32;
        let prev = g.ages.last().copied();
        {
            let gm = self.save.guest_mut();
            gm.ages.push(age);
            gm.checked_today = true;
        }
        self.save.serial += 1;
        self.age_today = age;
        self.age_roll = (age + 40) as f32;
        let key = match prev {
            None => "pip.age_first",
            Some(p) if age < p => "pip.age_better",
            Some(p) if age == p => "pip.age_same",
            _ => "pip.age_worse",
        };
        let worst = c.worst();
        let mut comment = fill(&self.script.pick(key, g.ages.len()), &[("age", age.to_string())]);
        let wk = ["pip.worst_still", "pip.worst_targets", "pip.worst_blind", "pip.worst_steps"][worst];
        comment = format!("{} {}", comment, self.script.pick(wk, g.ages.len()));
        self.report_comment = comment;
        self.stack.retain(|s| !matches!(s, Screen::CheckIntro | Screen::CheckTest));
        self.stack.push(Screen::Report);
        self.set = 0;
        world::enter_set(sim, 0);
        let _ = events;
    }

    fn report_update(&mut self, sim: &mut Sim, nav: &Nav, dt: f32, events: &mut Vec<SimEvent>) {
        // the big number rolls like a slot machine
        let target = self.age_today as f32;
        if (self.age_roll - target).abs() > 0.5 {
            let speed = 30.0 * dt + (self.age_roll - target).abs() * 2.0 * dt;
            self.age_roll = (self.age_roll - speed).max(target);
            if self.tick % 3 == 0 {
                self.sfx(events, sfx::AGE_TICK, 0.4, 1.0 + (self.age_roll % 7.0) * 0.03);
            }
            if (self.age_roll - target).abs() <= 0.5 {
                self.age_roll = target;
                self.sfx(events, sfx::STINGER_OK, 0.8, 1.0);
            }
        } else if nav.ok || nav.click.is_some() || self.autoplay || self.demo {
            self.stack.pop();
            let g = self.guest().clone();
            let at_pos = if g.day >= 5 && !g.free_play { at(0, 0.0, 0.3, 4.0) } else { at(0, 0.0, 0.3, 4.0) };
            if let Some(p) = sim.state.player {
                sim.set_position(p, at_pos);
            }
            self.set = 0;
            world::enter_set(sim, 0);
            if g.day >= 5 && !g.free_play && !g.finished {
                let l = "The Big Stand is waiting at the end of the pier. Whenever you like. Not whenever you like. Soon.".to_string();
                self.talk("Pip", vec![l], Then::Nothing, "#8fd0ee", events);
            }
        }
    }

    // ------------------------------------------------------------------ events in play

    pub fn start_event(&mut self, sim: &mut Sim, kind: Kind, source: Source) {
        let run = Run::new(kind, &self.rules, &mut sim.state.rng, &self.charts);
        let sp = events::spec(kind);
        let set = SETS_INDEX(sp.set);
        self.set = set;
        world::enter_set(sim, set);
        self.core = super::core::BalanceCore::new(&mut sim.state.rng);
        self.core.assist = self.save.settings.assist;
        self.apply_camera(sim, sp.cam, set);
        let ghost = if self.guest().day >= 3 || self.guest().free_play {
            self.guest().best(kind).map(|b| b.ghost.clone()).unwrap_or_default()
        } else {
            vec![]
        };
        self.play = Some(Play {
            kind,
            run,
            source,
            count: 3.4,
            score: 0,
            stars: 0,
            banked: 0,
            title: String::new(),
            best: self.guest().best(kind).map(|b| b.score).unwrap_or(0),
            diff: None,
            new_best: false,
            ghost,
            rec: vec![],
            done_wait: 0.0,
            pip_line: String::new(),
        });
        self.pool.clear(sim);
        self.clear_ghosts(sim);
        let no_card = matches!(source, Source::Medley(_) | Source::Finale(_) | Source::Attract);
        if no_card {
            self.stack.push(Screen::Count);
        } else {
            self.stack.push(Screen::Card);
            self.focus = 0;
        }
    }

    pub fn cancel_event(&mut self, sim: &mut Sim) {
        self.stack.retain(|s| !matches!(s, Screen::Card | Screen::Count | Screen::Play | Screen::Result));
        self.play = None;
        self.pool.clear(sim);
        self.return_to_island(sim);
    }

    pub fn return_to_island(&mut self, sim: &mut Sim) {
        self.set = 0;
        world::enter_set(sim, 0);
        let p = self.last_pavilion.min(3);
        let (x, z) = MATS[p];
        if let Some(id) = sim.state.player {
            sim.set_position(id, at(0, x, 0.3, z + 2.4));
        }
        self.mat_cool = 120;
        self.apply_camera(sim, [52.0, 0.0, 17.0, 40.0], 0);
        if !self.stack.iter().any(|s| matches!(s, Screen::Island)) {
            self.stack.insert(0, Screen::Island);
        }
    }

    fn begin_count(&mut self, events: &mut Vec<SimEvent>) {
        self.stack.pop();
        self.stack.push(Screen::Count);
        self.sfx(events, sfx::COUNT, 0.6, 1.0);
    }

    fn count_update(&mut self, sim: &mut Sim, input: &InputFrame, dt: f32, events: &mut Vec<SimEvent>) {
        let _ = (sim, input);
        let Some(p) = self.play.as_mut() else { return };
        let before = p.count;
        p.count -= dt;
        for t in [3.0f32, 2.0, 1.0] {
            if before > t && p.count <= t {
                events.push(SimEvent::Sfx { id: sfx::COUNT, gain: 0.6, pitch: 1.0 });
            }
        }
        if p.count <= 0.0 {
            events.push(SimEvent::Sfx { id: sfx::GO, gain: 0.8, pitch: 1.0 });
            let song = events::spec(p.kind).song;
            events.push(SimEvent::Music { song });
            self.stack.pop();
            self.stack.push(Screen::Play);
        }
    }

    fn play_update(&mut self, sim: &mut Sim, input: &InputFrame, dt: f32, events: &mut Vec<SimEvent>) {
        let nav = nav_of(input);
        if nav.pause && !self.session_forced() {
            self.push(Screen::Pause);
            return;
        }
        if nav.pause {
            self.push(Screen::Pause);
            return;
        }
        self.core.assist = self.save.settings.assist;
        let mut p = self.play.take().unwrap();
        let bot = self.autoplay || self.demo || matches!(p.source, Source::Attract);
        let it = if bot { p.run.bot(&self.core, &self.rules) } else { self.intent(input) };
        p.run.no_tip = self.no_tip || self.demo || matches!(p.source, Source::Attract);
        let rules = self.rules.clone();
        p.run.step(&mut self.core, &rules, &mut sim.state.rng, &it, input.song_pos, dt);
        if self.tick % 6 == 0 {
            p.rec.push([(self.core.cob.x * 100.0) as i16, (self.core.cob.y * 100.0) as i16]);
        }
        let fxs = std::mem::take(&mut p.run.fx);
        let done = p.run.done;
        self.play = Some(p);
        for f in fxs {
            self.apply_fx(events, f);
        }
        if done {
            self.finish_event(sim, events);
        }
    }

    fn session_forced(&self) -> bool {
        self.session
    }

    pub fn apply_fx(&mut self, events: &mut Vec<SimEvent>, f: Fx) {
        match f {
            Fx::Sfx(id, gain, pitch) => {
                if id != 0 {
                    events.push(SimEvent::Sfx { id, gain, pitch })
                }
            }
            Fx::Say(s) => self.say(s),
            Fx::Splash(size) => {
                self.splash_size = self.splash_size.max(size);
                events.push(SimEvent::Sfx { id: if size > 0.8 { sfx::SPLASH_B } else { sfx::SPLASH_S }, gain: 0.9, pitch: 1.0 });
            }
            Fx::Confetti => events.push(SimEvent::Sfx { id: sfx::POP, gain: 0.8, pitch: 1.0 }),
            Fx::Stumble => events.push(SimEvent::Sfx { id: sfx::SQUEAK, gain: 0.7, pitch: 0.8 }),
            Fx::Flop => {}
            Fx::Gull => events.push(SimEvent::Sfx { id: sfx::GULL, gain: 0.8, pitch: 1.0 }),
            Fx::Cheer => events.push(SimEvent::Sfx { id: sfx::CLAP, gain: 0.8, pitch: 1.0 }),
            Fx::Wake => self.wake_flag = true,
            Fx::Tip => {
                self.wobbles += 1;
                if matches!(self.set, 1 | 4 | 5 | 7 | 8) {
                    self.splash_size = self.splash_size.max(0.4);
                }
            }
        }
    }

    fn finish_event(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        let mut p = self.play.take().unwrap();
        let score = p.run.score(&self.rules);
        let stars = Run::stars_for(score);
        p.score = score;
        p.stars = stars;
        let tier = ((score / 125) as usize).min(7);
        p.title = self.script.pick(&format!("titles.t{tier}"), self.tick as usize);
        let tone = if stars >= 2 { "high" } else if stars == 1 { "mid" } else { "low" };
        p.pip_line = fill(&self.script.pick(&format!("pip_more.result_{tone}"), self.tick as usize), &[("n", self.wobbles.to_string())]);
        if self.wobbles >= 3 && self.tick % 3 == 0 {
            p.pip_line = fill(&self.script.pick("pip.wobbled", self.tick as usize), &[("n", self.wobbles.to_string())]);
        }
        self.wobbles = 0;
        let key = events::spec(p.kind).key.to_string();
        let free_like = matches!(p.source, Source::Island | Source::Free);
        let attract = matches!(p.source, Source::Attract) || self.demo;
        if free_like && !attract {
            let g = self.save.guest_mut();
            let first = !g.done_today.contains(&key);
            let bank = if first { 1 + stars as i32 } else { 1 };
            if first {
                g.done_today.push(key.clone());
            }
            g.minutes += bank;
            g.banked_today += bank;
            p.banked = if first { bank } else { 0 };
            let prev = g.bests.get(&key).cloned();
            p.best = prev.as_ref().map(|b| b.score).unwrap_or(0);
            p.diff = prev.as_ref().filter(|b| !b.ghost.is_empty()).map(|b| score - b.score);
            p.new_best = score > p.best;
            if p.new_best {
                g.bests.insert(key.clone(), meta::Best { score, stars: stars.max(prev.map(|b| b.stars).unwrap_or(0)), ghost: p.rec.clone() });
            }
            self.save.serial += 1;
            self.dirty = true;
            let goal = self.goal();
            let g = self.guest();
            if goal > 0 && g.banked_today >= goal && g.banked_today - bank < goal {
                self.say("Goal met. Pip has been informed.");
            }
        }
        let st = if stars >= 2 { sfx::STINGER_WIN } else if stars == 1 { sfx::STINGER_OK } else { sfx::STINGER_LOW };
        events.push(SimEvent::Sfx { id: st, gain: 0.9, pitch: 1.0 });
        events.push(SimEvent::Music { song: 1 });
        self.last_pavilion = events::spec(p.kind).pavilion;
        let source = p.source;
        self.play = Some(p);
        self.stack.retain(|s| !matches!(s, Screen::Play));
        if matches!(source, Source::Finale(_)) {
            self.advance_multi(sim, events);
            return;
        }
        if matches!(source, Source::Attract) {
            self.play = None;
            self.pool.clear(sim);
            self.stack = vec![Screen::Attract];
            return;
        }
        self.stack.push(Screen::Result);
        self.focus = 0;
    }

    pub fn result_choice(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>, i: usize) {
        let Some(p) = self.play.as_ref() else { return };
        let source = p.source;
        let kind = p.kind;
        let multi = matches!(source, Source::Medley(_) | Source::Finale(_) | Source::Attract);
        self.stack.retain(|s| !matches!(s, Screen::Result));
        if multi {
            self.advance_multi(sim, events);
            return;
        }
        if i == 0 {
            self.play = None;
            self.start_event(sim, kind, source);
        } else {
            self.play = None;
            self.pool.clear(sim);
            events.push(SimEvent::Music { song: 1 });
            if !self.stack.iter().any(|s| matches!(s, Screen::Island)) {
                self.stack.insert(0, Screen::Island);
            }
            self.return_to_island(sim);
        }
    }

    pub fn schedule_go(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>, i: usize) {
        if self.tab < 4 {
            let evs = self.day_events(self.tab);
            if let Some(k) = evs.get(i).copied() {
                self.stack.retain(|s| matches!(s, Screen::Island | Screen::Title));
                self.stack.insert(0, Screen::Island);
                self.start_event(sim, k, Source::Island);
            }
        } else {
            self.stack.retain(|s| matches!(s, Screen::Island));
            if self.stack.is_empty() {
                self.stack.push(Screen::Island);
            }
            self.set = 0;
            world::enter_set(sim, 0);
            match i {
                0 => {
                    if let Some(p) = sim.state.player {
                        sim.set_position(p, at(0, 0.0, 0.3, 1.0));
                    }
                }
                1 => {
                    if let Some(p) = sim.state.player {
                        sim.set_position(p, at(0, -13.6, 0.3, 20.5));
                    }
                }
                2 => {
                    let list = interactables(self);
                    self.interact(sim, events, 3, &list);
                }
                _ => self.start_finale(sim, events),
            }
        }
    }

    pub fn quit_to_title(&mut self, sim: &mut Sim) {
        self.stack = vec![Screen::Title];
        self.play = None;
        self.dlg = None;
        self.check = None;
        self.demo = false;
        self.pool.clear(sim);
        self.focus = 0;
        self.place_title(sim);
    }

    // ------------------------------------------------------------------ the stage

    /// Asks for a camera. It is applied two ticks later: a change of set sets that room's own
    /// camera first, and the cue must come after it to win.
    pub fn apply_camera(&mut self, _sim: &mut Sim, cam: [f32; 4], key: usize) {
        self.pending_cam = Some((cam, key, 2));
        self.cam_key = (key, [cam[0] as i32, cam[1] as i32, cam[2] as i32, cam[3] as i32]);
    }

    fn flush_camera(&mut self, sim: &mut Sim) {
        use crate::params::ParamValue;
        let Some((cam, _key, wait)) = self.pending_cam else { return };
        if wait > 0 {
            self.pending_cam = self.pending_cam.map(|(c, k, w)| (c, k, w - 1));
            return;
        }
        self.pending_cam = None;
        let mut set = std::collections::BTreeMap::new();
        set.insert("tilt".to_string(), ParamValue::Float(cam[0] as f64));
        set.insert("yaw".to_string(), ParamValue::Float(cam[1] as f64));
        set.insert("distance".to_string(), ParamValue::Float(cam[2] as f64));
        set.insert("fov".to_string(), ParamValue::Float(cam[3] as f64));
        let cue = crate::zones::CameraCue { set, sweep: vec![], flip_ortho: 0.0 };
        sim.state.courses.sticky_cue = Some(Arc::new(cue));
        sim.state.courses.cue_serial += 1;
    }

    /// The title's slow sweep round the island.
    pub fn title_camera(&mut self, sim: &mut Sim) {
        use crate::params::ParamValue;
        let mut set = std::collections::BTreeMap::new();
        set.insert("tilt".to_string(), ParamValue::Float(30.0));
        set.insert("distance".to_string(), ParamValue::Float(26.0));
        set.insert("fov".to_string(), ParamValue::Float(40.0));
        let cue = crate::zones::CameraCue {
            set,
            sweep: vec![crate::zones::Sweep { param: "yaw".into(), from: -50.0, to: 50.0, period: 40.0, phase: 0.0 }],
            flip_ortho: 0.0,
        };
        sim.state.courses.sticky_cue = Some(Arc::new(cue));
        sim.state.courses.cue_serial += 1;
        self.pending_cam = None;
        self.cam_key = (99, [0; 4]);
    }

    fn look_def(&self) -> PuppetDef {
        let g = self.guest();
        let (_, shirt, pants, shoes) = OUTFITS[g.outfit];
        let mut d = world::look(SKINS[g.skin].1, shirt, pants, shoes);
        if g.gear_on[0] {
            d.gear.helm = HelmKind::Cap;
            d.gear.helm_color = "#ffd166".into();
        }
        if g.gear_on[1] {
            d.gear.helm = HelmKind::Hood;
            d.gear.helm_color = "#f5f2ec".into();
        }
        if g.gear_on[2] {
            d.gear.helm = HelmKind::Crown;
            d.gear.helm_color = "#ffd166".into();
        }
        if g.gear_on[3] {
            d.gear.helm = HelmKind::Halo;
            d.gear.helm_color = "#fff4b0".into();
        }
        if g.gear_on[4] {
            d.gear.gloves = "#ffffff".into();
        }
        if g.gear_on[5] {
            d.gear.belt = "#ff786e".into();
        }
        if g.gear_on[6] {
            d.gear.pauldrons = 0.8;
            d.gear.armor_color = "#ff9fc4".into();
        }
        if g.gear_on[7] {
            d.shoes = "#e8b923".into();
        }
        d
    }

    pub fn ensure_cast(&mut self, sim: &mut Sim) {
        if !self.cast.is_empty() {
            return;
        }
        let spots: [(&str, usize, Vec3, f32); 10] = [
            ("pip", 0, at(0, 0.0, 1.15, -3.5), 0.0),
            ("marjorie", 0, at(0, 10.0, 0.3, 8.0), 3.0),
            ("tom", 0, at(0, -9.0, 0.3, 10.0), 1.0),
            ("twin", 0, at(0, 12.0, 0.3, -12.0), 0.0),
            ("posey", 1, at(1, 2.2, 0.3, 0.0), -1.57),
            ("kettle", 2, at(2, 3.0, 0.4, 1.0), -2.0),
            ("bounce", 3, at(3, 4.2, 0.6, 0.0), -1.6),
            ("gull", 7, at(7, -0.5, 8.3, 1.5), 0.0),
            ("gull2", 4, at(4, 3.8, 0.4, 3.8), 3.5),
            ("twin2", 0, at(0, 13.2, 0.3, -12.0), 0.0),
        ];
        for (who, _set, pos, face) in spots {
            let base = who.trim_end_matches('2');
            let id = sim.spawn_npc(who, pos, face, world::cast_def(base), None, None);
            self.cast.insert(who.to_string(), id);
        }
    }

    /// The guests that watch from a set, spawned the first time the set is shown.
    fn ensure_crowd(&mut self, sim: &mut Sim, set: usize) {
        if set == 0 || !self.crowd_done.insert(set) {
            return;
        }
        // guests watch from every set
        let shirts = ["#ffd166", "#ff786e", "#78dcaa", "#46bec8", "#f7a8c8", "#ffffff"];
        let skins = ["#f1d3b0", "#e0b07c", "#c68e5a", "#8d5a3b", "#f7c6a8"];
        {
            for (i, (pos, yaw)) in world::crowd_spots(set).into_iter().enumerate() {
                let mut d = world::look(skins[(i + set) % 5], shirts[(i * 2 + set) % 6], "#fbfaf6", "#fbfaf6");
                if (i + set) % 3 == 0 {
                    d.gear.helm = HelmKind::Hood;
                    d.gear.helm_color = "#f5f2ec".into();
                }
                let gull = set == 7;
                if gull {
                    d = world::cast_def("gull");
                }
                if set != 5 && set != 6 {
                    let raft = Visual::new(Shape::Cylinder { half_height: 0.06, radius: 0.95 }, Color::hex(shirts[(i + 3) % 6]));
                    sim.spawn(Spawn::new("~raft", pos - Vec3::Y * 0.1).visual(raft).body(crate::entity::BodyKind::Fixed));
                }
                sim.spawn_npc("~crowd", pos + Vec3::Y * 0.1, yaw, d, None, None);
            }
        }
    }

    pub fn stage(&mut self, sim: &mut Sim, dt: f32, events: &mut Vec<SimEvent>) {
        self.ensure_cast(sim);
        self.flush_camera(sim);
        let shown = self.set;
        self.ensure_crowd(sim, shown);
        let Some(pid) = sim.state.player else { return };
        if self.look_serial != self.save.serial || self.dirty {
            let def = self.look_def();
            if let Some(e) = sim.state.entities.get_mut(pid) {
                if let Some(ch) = e.character.as_mut() {
                    ch.puppet = Some(Arc::new(def));
                }
            }
            self.look_serial = self.save.serial;
            self.dirty = false;
        }
        // music follows the screen
        let want = match self.top() {
            Screen::Play | Screen::Count => self.play.as_ref().map(|p| events::spec(p.kind).song).unwrap_or(1),
            Screen::CheckTest | Screen::CheckIntro => 2,
            _ => 1,
        };
        if want != self.music && !matches!(self.top(), Screen::Count) {
            self.music = want;
            events.push(SimEvent::Music { song: want });
        }
        // the camera: title sweeps, island follows, events set their own
        let island_like = matches!(self.top(), Screen::Island | Screen::Talk | Screen::Pause | Screen::Schedule | Screen::Calendar | Screen::Wardrobe | Screen::Settings | Screen::HowTo | Screen::About | Screen::Stamp | Screen::Report);
        if matches!(self.top(), Screen::Title | Screen::Guests { .. }) {
            if self.cam_key.0 != 99 {
                self.title_camera(sim);
                if let Some(p) = sim.state.player {
                    sim.set_position(p, at(0, 0.0, 0.3, 4.0));
                }
            }
        } else if island_like && self.play.is_none() && self.check.is_none() && self.cam_key.0 != 100 && !matches!(self.top(), Screen::Wardrobe) {
            self.apply_camera(sim, [52.0, 0.0, 17.0, 40.0], 100);
        }
        // check-in and the wardrobe: the figure on a turntable
        if matches!(self.top(), Screen::CheckIn | Screen::Wardrobe) {
            if self.cam_key.0 != 101 {
                self.apply_camera(sim, [10.0, 0.0, 5.4, 36.0], 101);
            }
            sim.set_position(pid, at(0, 0.0, 0.3, 4.5));
            let spin = self.tick as f32 * 0.025;
            if let Some(e) = sim.state.entities.get_mut(pid) {
                if let Some(ch) = e.character.as_mut() {
                    ch.facing = spin;
                    ch.anim.facing = spin;
                }
            }
        }
        // the figure in an event or the check
        let mut sprites = vec![];
        if let Some(p) = &self.play {
            let sp = events::spec(p.kind);
            let set = SETS_INDEX(sp.set);
            let pose = p.run.pose(&self.core, &self.rules);
            let org = world::origin(set);
            let pos = self.event_pos(p, set);
            sim.set_position(pid, pos);
            self.pose_figure(sim, pid, &pose, p.run.kind);
            sprites = p.run.sprites(&self.rules);
            self.splash(sim, events, org);
            if std::mem::take(&mut self.wake_flag) {
                events.push(SimEvent::Wake { pos });
            }
            self.sync_ghosts(sim, pos, &pose);
        } else if let Some(c) = &self.check {
            let pose = c.pose(&self.core);
            sim.set_position(pid, at(1, 0.0, 0.05, 0.0));
            self.pose_figure(sim, pid, &pose, Kind::Breath);
        } else {
            self.untilt(sim, pid);
            self.clear_ghosts(sim);
            self.wave(sim, pid);
        }
        let mut org = if self.play.is_some() { world::origin(self.set) } else { world::origin(1) };
        if self.play.is_none() && self.check.is_none() && matches!(self.top(), Screen::Island | Screen::Talk | Screen::Pause | Screen::Schedule | Screen::Calendar | Screen::Wardrobe | Screen::Stamp | Screen::Report) {
            // the lost flip-flops still on the island
            org = world::origin(0);
            let flips = [(-14.0, 8.0), (22.0, -14.0), (-24.0, -6.0), (4.0, -24.0), (26.0, 12.0)];
            for (i, (x, z)) in flips.iter().enumerate() {
                if !self.guest().flips[i] {
                    sprites.push(events::Sprite { key: 700 + i as u32, shape: events::SpriteShape::Box(0.2, 0.05, 0.34), pos: Vec3::new(*x, 0.12, *z), color: "#ffd166", emissive: 0.35 });
                }
            }
        }
        self.pool.sync(sim, org, &sprites);
        let _ = dt;
    }

    /// Yesterday You and the earlier players of a Medley: tinted figures in lanes beside you.
    fn ghost_lanes(&self) -> Vec<(Vec<[i16; 2]>, &'static str)> {
        let Some(p) = &self.play else { return vec![] };
        let tints = ["#9fd8ff", "#ffb8d4", "#c9f0a8", "#ffe08a"];
        match p.source {
            Source::Island | Source::Free if !p.ghost.is_empty() => vec![(p.ghost.clone(), tints[0])],
            Source::Medley(i) => self
                .medley
                .as_ref()
                .map(|m| m.runs.iter().enumerate().filter_map(|(k, r)| r.get(i as usize).map(|g| (g.clone(), tints[(k + 1) % 4]))).collect())
                .unwrap_or_default(),
            _ => vec![],
        }
    }

    fn sync_ghosts(&mut self, sim: &mut Sim, pos: Vec3, pose: &events::Pose) {
        let lanes = self.ghost_lanes();
        while self.ghost_ids.len() > lanes.len() {
            if let Some(id) = self.ghost_ids.pop() {
                sim.despawn(id);
            }
        }
        for (i, (rec, tint)) in lanes.iter().enumerate() {
            let side = if i % 2 == 0 { 1.0 } else { -1.0 };
            let off = Vec3::new(side * 2.2 * (1 + i / 2) as f32, 0.0, 0.0);
            if self.ghost_ids.len() <= i {
                let mut d = world::look("#dff3ff", tint, "#ffffff", tint);
                d.scale = 0.95;
                let id = sim.spawn_npc("~ghost", pos + off, 0.0, d, None, None);
                self.ghost_ids.push(id);
            }
            let id = self.ghost_ids[i];
            sim.set_position(id, pos + off);
            let idx = (self.play.as_ref().map(|p| p.rec.len()).unwrap_or(0)).min(rec.len().saturating_sub(1));
            let s = rec.get(idx).copied().unwrap_or([0, 0]);
            if let Some(e) = sim.state.entities.get_mut(id) {
                if let Some(ch) = e.character.as_mut() {
                    ch.anim.tilt_side = s[0] as f32 / 100.0 * 0.24;
                    ch.anim.tilt_fwd = -(s[1] as f32) / 100.0 * 0.24;
                    if !pose.clip.is_empty() {
                        if let Some(c) = crate::clips::find(pose.clip) {
                            match pose.scrub {
                                Some(sc) => {
                                    ch.anim.play_clip(c, 0, 1e-6);
                                    let dur = crate::clips::library().get(c).map(|c| c.dur).unwrap_or(1.0);
                                    ch.anim.clip_t = sc.clamp(0.0, 1.0) * dur * 0.999;
                                }
                                None => ch.anim.play_clip(c, 0, 0.0),
                            }
                        }
                    } else {
                        ch.anim.stop_clip();
                    }
                }
            }
        }
    }

    fn clear_ghosts(&mut self, sim: &mut Sim) {
        for id in std::mem::take(&mut self.ghost_ids) {
            sim.despawn(id);
        }
    }

    /// The wave button: the figure waves for a moment.
    fn wave(&mut self, sim: &mut Sim, pid: crate::entity::EntityId) {
        let Some(e) = sim.state.entities.get_mut(pid) else { return };
        let Some(ch) = e.character.as_mut() else { return };
        if self.wave_t > 0.0 {
            self.wave_t -= 1.0 / 60.0;
            if let Some(c) = crate::clips::find("CMU/Wave_Hello") {
                ch.anim.play_clip(c, crate::clips::UPPER, 0.0);
            }
        } else if ch.anim.clip != 0 && matches!(self.top(), Screen::Island) {
            ch.anim.stop_clip();
        }
    }

    fn splash(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>, org: Vec3) {
        if self.splash_size > 0.0 {
            let pos = org + Vec3::new(0.0, 0.0, 0.0);
            if self.splash_size > 0.8 {
                events.push(SimEvent::BigSplash { pos: self.splash_pos(sim, org), size: self.splash_size });
            } else {
                events.push(SimEvent::Splash { pos });
            }
            self.splash_size = 0.0;
        }
    }

    fn splash_pos(&self, sim: &Sim, org: Vec3) -> Vec3 {
        sim.state.player.and_then(|p| sim.feet(p)).unwrap_or(org)
    }

    fn event_pos(&self, p: &Play, set: usize) -> Vec3 {
        let r = &p.run;
        match r.kind {
            Kind::Dive => {
                if r.stage == 0 {
                    let ph = (r.a / self.rules.dive.period) * std::f32::consts::TAU;
                    at(set, -3.0, 8.3 + 0.0 + 0.15 * ph.cos().abs(), 0.0)
                } else if r.stage == 1 {
                    at(set, -3.0 + r.c * 3.0, 8.3 + r.pos.x, 0.0)
                } else {
                    at(set, 3.0, -0.4, 0.0)
                }
            }
            Kind::Paddle => at(set, r.pos.x, 0.1, r.pos.y),
            Kind::Tray => at(set, 0.0, 0.0, r.pos.y),
            Kind::Lap => {
                let a = r.pos.y / 22.0;
                let rad = 22.0 - r.pos.x; // screen right is toward the centre
                at(0, rad * a.cos(), 0.1, rad * a.sin())
            }
            Kind::Tide => at(set, 0.0, 0.05, 0.0),
            _ => at(set, 0.0, 0.05, 0.0),
        }
    }

    fn untilt(&self, sim: &mut Sim, pid: crate::entity::EntityId) {
        if let Some(e) = sim.state.entities.get_mut(pid) {
            if let Some(ch) = e.character.as_mut() {
                ch.anim.tilt_side = 0.0;
                ch.anim.tilt_fwd = 0.0;
            }
        }
    }

    fn pose_figure(&self, sim: &mut Sim, pid: crate::entity::EntityId, pose: &events::Pose, kind: Kind) {
        let slump = (((self.age_today - 30) as f32) / 60.0).clamp(0.0, 1.0) * 0.08;
        let facing = match kind {
            Kind::Dive => std::f32::consts::FRAC_PI_2,
            Kind::Paddle | Kind::Tray => 0.0,
            Kind::Lap => self.lap_facing(),
            _ => 0.0,
        };
        let Some(e) = sim.state.entities.get_mut(pid) else { return };
        let Some(ch) = e.character.as_mut() else { return };
        ch.facing = facing;
        ch.anim.facing = facing;
        ch.anim.tilt_side = pose.tilt.x;
        ch.anim.tilt_fwd = pose.tilt.y + slump;
        if !pose.clip.is_empty() {
            if let Some(id) = crate::clips::find(pose.clip) {
                match pose.scrub {
                    Some(s) => {
                        ch.anim.play_clip(id, 0, 1e-6);
                        let dur = crate::clips::library().get(id).map(|c| c.dur).unwrap_or(1.0);
                        ch.anim.clip_t = s.clamp(0.0, 1.0) * dur * 0.999;
                    }
                    None => ch.anim.play_clip(id, 0, 0.0),
                }
            }
        } else {
            ch.anim.stop_clip();
        }
    }

    fn lap_facing(&self) -> f32 {
        if let Some(p) = &self.play {
            let a = p.run.pos.y / 22.0;
            // facing is the tangent of the ring
            return (-a.sin()).atan2(a.cos());
        }
        0.0
    }

    // ------------------------------------------------------------------ bot

    pub fn hub_status(&self, sim: &Sim) -> serde_json::Value {
        match (&self.medley, self.session) {
            (Some(m), true) => {
                // the running event's score counts while it plays
                let live = self.play.as_ref().map(|p| p.run.score(&self.rules)).unwrap_or(0);
                let total = m.total() + if m.done { 0 } else { live };
                let feet = sim.state.player.and_then(|id| sim.feet(id)).unwrap_or(Vec3::ZERO);
                let set = super::run::SETS_INDEX(self.play.as_ref().map(|p| events::spec(p.kind).set).unwrap_or("hub"));
                let o = world::origin(set);
                let clip = self.play.as_ref().map(|p| p.run.pose(&self.core, &self.rules).clip).unwrap_or("");
                serde_json::json!({
                    "score": total,
                    "label": m.label(),
                    "done": m.done,
                    "stats": { "paddle": m.scores.first(), "tide": m.scores.get(1), "dive": m.scores.get(2) },
                    "ghost": { "area": m.area(), "x": feet.x - o.x, "y": feet.y - o.y, "z": feet.z - o.z, "facing": 0.0,
                               "clip": clip, "tx": self.core.cob.x, "ty": self.core.cob.y, "score": total },
                })
            }
            _ => serde_json::Value::Null,
        }
    }

    /// What a good player presses now: menus, dialogue, events, everything, to the credits.
    pub fn bot_input(&self, sim: &Sim) -> InputFrame {
        let mut f = InputFrame::default();
        let press = |f: &mut InputFrame, b: u32| {
            f.pressed |= b;
            f.held |= b;
        };
        // press only every few ticks, so repeated presses register as separate taps
        let beat = self.tick % 4 == 0;
        match self.top() {
            Screen::Title => {
                if beat {
                    // New Stay, or Continue when a stay exists
                    press(&mut f, B::CONFIRM);
                }
            }
            Screen::Guests { .. } => {
                if beat {
                    press(&mut f, B::CONFIRM);
                }
            }
            Screen::CheckIn => {
                if self.focus != 3 {
                    if beat {
                        press(&mut f, B::MENU_DOWN);
                    }
                } else if beat {
                    press(&mut f, B::CONFIRM);
                }
            }
            Screen::Result if self.menu_len() > 1 => {
                if beat {
                    if self.focus == 0 {
                        press(&mut f, B::MENU_DOWN);
                    } else {
                        press(&mut f, B::CONFIRM);
                    }
                }
            }
            Screen::Talk | Screen::Report | Screen::Stamp | Screen::Card | Screen::Result | Screen::Ending | Screen::Credits | Screen::MedleyCard | Screen::Pass | Screen::Podium => {
                if beat {
                    press(&mut f, B::CONFIRM);
                }
            }
            Screen::Count | Screen::CheckIntro => {
                if beat && matches!(self.top(), Screen::CheckIntro) {
                    press(&mut f, B::CONFIRM);
                }
            }
            Screen::Play | Screen::CheckTest => {
                // events run on their own bot when `autoplay` is set; this feeds the same intent in as input
                let it = if let Some(c) = &self.check {
                    c.bot(&self.core, &self.rules)
                } else if let Some(p) = &self.play {
                    p.run.bot(&self.core, &self.rules)
                } else {
                    Intent::default()
                };
                f.lean = it.lean;
                if it.act {
                    f.held |= B::ACT;
                }
                if it.act_p {
                    f.pressed |= B::ACT;
                }
                if it.l {
                    f.held |= B::STEP_L;
                }
                if it.r {
                    f.held |= B::STEP_R;
                }
                if it.l_p {
                    f.pressed |= B::STEP_L;
                    f.held |= B::STEP_L;
                }
                if it.r_p {
                    f.pressed |= B::STEP_R;
                    f.held |= B::STEP_R;
                }
            }
            Screen::Island => return self.bot_island(sim),
            Screen::Schedule => {
                if self.tab < 4 {
                    if beat {
                        press(&mut f, B::TAB_R);
                    }
                } else if self.focus < 3 {
                    if beat {
                        press(&mut f, B::MENU_DOWN);
                    }
                } else if beat {
                    press(&mut f, B::CONFIRM);
                }
            }
            _ => {
                if beat {
                    press(&mut f, B::BACK);
                }
            }
        }
        f
    }

    /// The day's plan on the island: play the next open event by the schedule, then sleep.
    fn bot_island(&self, sim: &Sim) -> InputFrame {
        let mut f = InputFrame::default();
        let g = self.guest();
        let Some(me) = sim.state.player.and_then(|id| sim.feet(id)) else { return f };
        let want_event = self.next_bot_event();
        let target = match want_event {
            Some(k) => {
                let (x, z) = MATS[events::spec(k).pavilion];
                at(0, x, 0.0, z)
            }
            None => at(0, -13.6, 0.0, 22.0),
        };
        let d = Vec2::new(target.x - me.x, target.z - me.z);
        if d.length() > 0.9 {
            f.move_dir = d.normalize();
            f.held |= B::JOG;
        } else if want_event.is_none() && self.goal() > 0 && self.tick % 4 == 0 {
            f.pressed |= B::CONFIRM;
        }
        if g.day >= 5 && !g.finished && g.checked_today && self.tick % 4 == 0 {
            f.pressed |= B::SCHEDULE;
            f.move_dir = Vec2::ZERO;
        }
        f
    }

    /// The next event the bot wants today: the open events in order until the goal is met.
    pub fn next_bot_event(&self) -> Option<Kind> {
        let g = self.guest();
        if self.goal() > 0 && g.banked_today >= self.goal() {
            return None;
        }
        if self.goal() == 0 {
            return None;
        }
        for pav in 0..4 {
            for k in self.day_events(pav) {
                let key = events::spec(k).key.to_string();
                if !g.done_today.contains(&key) {
                    return Some(k);
                }
            }
        }
        // everything played once: replay the first event (repeats bank one minute each)
        self.day_events(0).first().copied()
    }
}

#[allow(non_snake_case)]
pub fn SETS_INDEX(name: &str) -> usize {
    world::SETS.iter().position(|s| *s == name).unwrap_or(0)
}

fn speaker_id(name: &str) -> u8 {
    match name {
        "Pip" => 0,
        "Posey" => 1,
        "Kettle" | "Big Kettle" => 2,
        "Bounce" => 3,
        "Commodore Gull" | "Gull" => 4,
        "Marjorie" => 5,
        "Tom" | "Two-Towel Tom" => 6,
        "The Twins" => 7,
        _ => 8,
    }
}
