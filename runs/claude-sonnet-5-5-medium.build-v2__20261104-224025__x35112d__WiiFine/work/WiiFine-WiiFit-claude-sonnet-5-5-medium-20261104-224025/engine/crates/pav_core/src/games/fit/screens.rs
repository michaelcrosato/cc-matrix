//! Menus: what each screen shows (`menu`) and what its items do (`activate`, `adjust`), plus the
//! UI frame the app draws.

use super::events::{self, Kind, Run, sfx};
use super::meta::{self, GEAR, NAMES, OUTFITS, SKINS, fill};
use super::ui_model::*;
use super::{FitGame, Screen, Source};
use crate::frame::SimEvent;
use crate::sim::Sim;

pub struct Menu {
    pub layout: Layout,
    pub title: String,
    pub subtitle: String,
    pub lines: Vec<String>,
    pub items: Vec<Item>,
    pub tabs: Vec<String>,
    pub prompts: Vec<Prompt>,
}

fn pr(a: Act, l: &str) -> Prompt {
    Prompt { act: a, label: l.to_string() }
}

fn menu(layout: Layout, title: &str, items: Vec<Item>) -> Menu {
    Menu { layout, title: title.into(), subtitle: String::new(), lines: vec![], items, tabs: vec![], prompts: vec![pr(Act::Confirm, "Select"), pr(Act::Back, "Back")] }
}

pub const PAVILIONS: [&str; 4] = ["Stillness Studio", "Iron Gazebo", "Boardwalk", "Lagoon"];
pub const ABOUT_PAGES: usize = 19;
pub const HOWTO_PAGES: usize = 3;

impl FitGame {
    pub fn day_events(&self, pavilion: usize) -> Vec<Kind> {
        let day = self.guest().day;
        let free = self.guest().free_play;
        events::ALL_KINDS
            .iter()
            .copied()
            .filter(|k| {
                let s = events::spec(*k);
                s.pavilion == pavilion && (free || s.day <= day)
            })
            .collect()
    }

    pub fn goal(&self) -> i32 {
        [3, 5, 7, 9, 0][(self.guest().day - 1).clamp(0, 4) as usize]
    }

    pub fn menu(&self) -> Menu {
        let g = self.guest();
        let s = &self.save.settings;
        match self.top() {
            Screen::Title => {
                let any = self.save.guests.iter().any(|g| g.used);
                let mut m = menu(
                    Layout::List,
                    super::TITLE,
                    vec![
                        Item::button("New Stay"),
                        if any { Item::button("Continue") } else { Item::button("Continue").disabled() },
                        Item::button("Play Together"),
                        Item::button("Settings"),
                        Item::button("About"),
                    ],
                );
                m.subtitle = "A stay at Tippy Cay. Mind the wobble.".into();
                m
            }
            Screen::Guests { new } => {
                let items = (0..4)
                    .map(|i| {
                        let gu = &self.save.guests[i];
                        if gu.used {
                            Item::card(NAMES[gu.name], format!("Day {} \u{b7} {} min", gu.day.min(5), gu.minutes))
                                .stars((gu.total_stars().min(33) / 11) as i8)
                                .colored(OUTFITS[gu.outfit].1)
                        } else if *new {
                            Item::card("Empty slot", "Start a new stay")
                        } else {
                            Item::card("Empty slot", "Nobody here").disabled()
                        }
                    })
                    .collect();
                menu(Layout::Cards, if *new { "Who is staying?" } else { "Welcome back" }, items)
            }
            Screen::CheckIn => {
                let gu = self.save.guest();
                let mut m = menu(
                    Layout::List,
                    "Check in",
                    vec![
                        Item::choice("Name", NAMES[gu.name]),
                        Item::choice("Skin", SKINS[gu.skin].0),
                        Item::choice("Outfit", OUTFITS[gu.outfit].0),
                        Item::button("Begin my stay"),
                    ],
                );
                m.prompts = vec![pr(Act::Navigate, "Choose"), pr(Act::Confirm, "Select"), pr(Act::Back, "Back")];
                m
            }
            Screen::Pause => {
                let mut items = vec![Item::button("Resume")];
                if !self.session {
                    items.extend([
                        Item::button("Schedule"),
                        Item::button("Calendar"),
                        Item::button("Wardrobe"),
                    ]);
                }
                items.push(Item::button("Settings"));
                if !self.session {
                    items.extend([Item::button("How to Play"), Item::button("About"), Item::button("Dev Mode"), Item::button("Quit to Title")]);
                }
                menu(Layout::List, "Paused", items)
            }
            Screen::Settings => {
                let pct = |v: f32| format!("{}%", (v * 100.0).round() as i32);
                let mut m = menu(
                    Layout::List,
                    "Settings",
                    vec![
                        Item::slider("Music", s.music, pct(s.music)),
                        Item::slider("Sound effects", s.sfx, pct(s.sfx)),
                        Item::slider("Voices", s.voice, pct(s.voice)),
                        Item::choice("Button glyphs", if s.xbox { "Xbox" } else { "PlayStation" }),
                        Item::slider("Lean sensitivity", (s.lean_sens - 0.5) / 1.5, format!("{:.1}x", s.lean_sens)),
                        Item::slider("Wobble assist", s.assist, pct(s.assist)),
                        Item::slider("Rhythm offset", (s.rhythm_offset + 0.2) / 0.5, format!("{} ms", (s.rhythm_offset * 1000.0).round() as i32)),
                        Item::slider("Text speed", (s.text_speed - 0.5) / 2.5, format!("{:.1}x", s.text_speed)),
                        Item::choice("Fullscreen", if s.fullscreen { "On" } else { "Off" }),
                        Item::button("Reset save"),
                    ],
                );
                if self.session {
                    m.items.truncate(5);
                }
                m.prompts = vec![pr(Act::Navigate, "Adjust"), pr(Act::Back, "Back")];
                m
            }
            Screen::ConfirmReset => {
                let mut m = menu(Layout::List, "Reset the save?", vec![Item::button("Keep everything"), Item::button("Erase all four guests")]);
                m.lines = vec!["This removes every guest, star and stamp.".into()];
                m
            }
            Screen::Schedule => {
                let mut m = menu(Layout::List, "Schedule", vec![]);
                m.tabs = PAVILIONS.iter().map(|s| s.to_string()).chain(["Resort".to_string()]).collect();
                if self.tab < 4 {
                    let evs = self.day_events(self.tab);
                    if evs.is_empty() {
                        m.items.push(Item::button("Opens on a later day").disabled());
                    }
                    for k in evs {
                        let sp = events::spec(k);
                        let (st, best) = match g.best(k) {
                            Some(b) => (b.stars as i8, format!("Best {}", b.score)),
                            None => (0, "New".to_string()),
                        };
                        m.items.push(Item::card(sp.name, best).stars(st));
                    }
                    if self.tab == 3 {
                        // none
                    }
                } else {
                    m.items = vec![Item::button("Go to reception"), Item::button("Go to my cabana"), Item::button("End the day")];
                    if g.day >= 5 && g.checked_today {
                        m.items.push(Item::button("The Big Stand"));
                    }
                }
                m.prompts = vec![pr(Act::TabL, "Pavilion"), pr(Act::TabR, "Pavilion"), pr(Act::Confirm, "Go"), pr(Act::Back, "Back")];
                m
            }
            Screen::Calendar => {
                let mut m = menu(Layout::Calendar, "Calendar", vec![]);
                let free = g.free_play;
                m.lines = (1..=5)
                    .map(|d| {
                        let st = if d <= g.stamps { "STAMPED" } else if d == g.day && !g.finished { "TODAY" } else { "" };
                        format!("Day {d}|{st}")
                    })
                    .collect();
                if free {
                    m.lines.push(format!("Free play: {} real days stamped", g.real_stamps.len()));
                }
                m.prompts = vec![pr(Act::Back, "Back")];
                m
            }
            Screen::Wardrobe => {
                let mut items = vec![];
                for (i, (_, name)) in GEAR.iter().enumerate() {
                    let unlocked = g.gear_unlocked(i);
                    let mut it = Item::choice(*name, if !unlocked { "Locked".to_string() } else if g.gear_on[i] { "Worn".into() } else { "Off".into() });
                    it.enabled = unlocked;
                    items.push(it);
                }
                items.push(Item::choice("Skin", SKINS[g.skin].0));
                items.push(Item::choice("Outfit", OUTFITS[g.outfit].0));
                let mut m = menu(Layout::List, "Wardrobe", items);
                m.subtitle = if g.day < 2 && !g.free_play { "Opens on day 2. Big Kettle insists.".into() } else { format!("{} minutes in the clam", g.minutes) };
                m
            }
            Screen::HowTo => {
                let mut m = menu(Layout::Pages, "How to Play", vec![]);
                m.lines = howto_page(self.page);
                m.subtitle = format!("{} / {}", self.page + 1, HOWTO_PAGES);
                m.prompts = vec![pr(Act::Navigate, "Page"), pr(Act::Back, "Back")];
                m
            }
            Screen::About => {
                let mut m = menu(Layout::Pages, "About", vec![]);
                m.lines = about_fallback(self.page);
                m.subtitle = format!("{} / {}", self.page + 1, ABOUT_PAGES);
                m.prompts = vec![pr(Act::Navigate, "Page"), pr(Act::Back, "Back")];
                m
            }
            Screen::Result => {
                let p = self.play.as_ref();
                let mut m = menu(Layout::Result, "Result", vec![Item::button("Try again"), Item::button("Back")]);
                if let Some(p) = p {
                    m.title = events::spec(p.kind).name.to_string();
                    m.subtitle = p.title.clone();
                    m.lines = vec![
                        format!("{}", p.score),
                        format!("{}", p.stars),
                        if p.banked > 0 { format!("+{} minutes banked", p.banked) } else { "Minutes already banked today".to_string() },
                        match p.diff {
                            Some(d) if d > 0 => format!("{} points above Yesterday You", d),
                            Some(d) if d < 0 => format!("{} points below Yesterday You", -d),
                            Some(_) => "Level with Yesterday You".to_string(),
                            None => String::new(),
                        },
                        if p.new_best { "A new personal best".to_string() } else { format!("Personal best {}", p.best) },
                        p.pip_line.clone(),
                    ];
                    if matches!(p.source, Source::Medley(_) | Source::Finale(_) | Source::Attract) {
                        m.items = vec![Item::button("Continue")];
                    }
                }
                m
            }
            Screen::Card => {
                let mut m = menu(Layout::None, "", vec![]);
                if let Some(p) = &self.play {
                    let sp = events::spec(p.kind);
                    m.title = sp.name.into();
                    m.subtitle = sp.goal.into();
                    let tips = self.script.pick(&format!("tips.{}.a", sp.key), self.talk_n);
                    m.lines = vec![self.script.pick(&format!("coach.{}.intro", sp.coach), self.talk_n), tips];
                    m.prompts = p.run.prompts();
                    m.prompts.push(pr(Act::Confirm, "Begin"));
                    m.prompts.push(pr(Act::Back, "Back"));
                }
                m
            }
            Screen::Podium => {
                let mut m = menu(Layout::List, "Podium", vec![Item::button("Back to the title")]);
                m.lines = if self.session { vec![format!("Your total: {}", self.medley.as_ref().map(|m| m.total()).unwrap_or(0))] } else { self.podium_lines() };
                m
            }
            Screen::Pass => {
                let mut m = menu(Layout::List, "Pass the pad", vec![Item::button("Ready")]);
                if let Some(md) = &self.medley {
                    let who = md.players.get(md.player).cloned().unwrap_or_default();
                    m.subtitle = format!("{who}, you are up.");
                    m.lines = vec!["Paddle Slalom, Tide Table, Cannonball Cup. Earlier runs wobble in the other lanes.".into()];
                }
                m
            }
            Screen::MedleyCard => {
                let mut m = menu(Layout::List, "Inter-Resort Medley", vec![Item::button("Begin")]);
                m.lines = vec!["Three events. One total. The same course for everyone.".into()];
                m
            }
            Screen::Together => {
                let mut m = menu(Layout::List, "Play Together", vec![Item::choice("Guests", format!("{}", self.players)), Item::button("Begin the Medley")]);
                m.lines = vec!["Take turns on one pad. Earlier runs wobble in the other lanes.".into()];
                m
            }
            Screen::Dev => self.dev_menu(),
            Screen::Ending => {
                let mut m = menu(Layout::Pages, if self.story_pass { "Checkout" } else { "Extended Stay" }, vec![Item::button("Continue")]);
                m.lines = self.story.clone();
                m
            }
            Screen::Credits => {
                let mut m = menu(Layout::Pages, "Thank you for staying", vec![Item::button("To the island")]);
                m.lines = vec!["Wii Fine. Made on the Pavilion engine.".into(), "Pip, Posey, Big Kettle, Bounce and Commodore Gull would like to thank the sea.".into(), "Free play is open. Every event. Every day. Real days get stamped.".into()];
                m
            }
            _ => menu(Layout::None, "", vec![]),
        }
    }

    pub fn menu_len(&self) -> usize {
        self.menu().items.len()
    }

    /// Moves the focus to a usable item in direction `d`.
    pub fn move_focus(&mut self, d: i32) {
        let m = self.menu();
        let n = m.items.len() as i32;
        if n == 0 {
            return;
        }
        let mut f = self.focus as i32;
        for _ in 0..n {
            f = (f + d).rem_euclid(n);
            if m.items[f as usize].enabled && m.items[f as usize].kind != ItemKind::Label {
                break;
            }
        }
        self.focus = f as usize;
    }

    /// An item was activated (Confirm or click).
    pub fn activate(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        let i = self.focus;
        let m = self.menu();
        if i >= m.items.len() || !m.items[i].enabled {
            return;
        }
        self.sfx(events, sfx::UI_OK, 0.6, 1.0);
        match self.top().clone() {
            Screen::Title => match i {
                0 => self.push(Screen::Guests { new: true }),
                1 => self.push(Screen::Guests { new: false }),
                2 => self.start_together(sim, events),
                3 => self.push(Screen::Settings),
                _ => self.push_page(Screen::About),
            },
            Screen::Guests { new } => {
                self.save.slot = i;
                if new {
                    self.save.guests[i] = meta::Guest { used: true, ..Default::default() };
                    self.save.serial += 1;
                    self.stack.push(Screen::CheckIn);
                    self.focus = 3;
                } else {
                    self.stack = vec![Screen::Island];
                    self.begin_day(sim, events, false);
                }
            }
            Screen::CheckIn => {
                if i == 3 {
                    self.save.guest_mut().intro_done = false;
                    self.save.serial += 1;
                    self.stack = vec![Screen::Island];
                    self.begin_intro(sim, events);
                }
            }
            Screen::Pause => {
                let session = self.session;
                let labels: Vec<String> = m.items.iter().map(|x| x.label.clone()).collect();
                let _ = session;
                match labels[i].as_str() {
                    "Resume" => {
                        self.stack.pop();
                    }
                    "Schedule" => self.push(Screen::Schedule),
                    "Calendar" => self.push(Screen::Calendar),
                    "Wardrobe" => self.push(Screen::Wardrobe),
                    "Settings" => self.push(Screen::Settings),
                    "How to Play" => self.push_page(Screen::HowTo),
                    "About" => self.push_page(Screen::About),
                    "Dev Mode" => self.push(Screen::Dev),
                    _ => self.quit_to_title(sim),
                }
            }
            Screen::Settings => {
                if i == 9 {
                    self.push(Screen::ConfirmReset);
                } else if i == 3 || i == 8 {
                    self.adjust(i, 1, events);
                }
            }
            Screen::ConfirmReset => {
                if i == 1 {
                    self.save = meta::Save { settings: self.save.settings.clone(), serial: self.save.serial + 1, ..Default::default() };
                    self.stack = vec![Screen::Title];
                    self.focus = 0;
                    self.place_title(sim);
                } else {
                    self.stack.pop();
                    self.focus = 9;
                }
            }
            Screen::Schedule => self.schedule_go(sim, events, i),
            Screen::Wardrobe => {
                let gu = self.save.guest_mut();
                if i < 8 {
                    if gu.gear_unlocked(i) {
                        gu.gear_on[i] = !gu.gear_on[i];
                    }
                } else {
                    self.adjust(i, 1, events);
                }
                self.save.serial += 1;
                self.dirty = true;
            }
            Screen::Result => self.result_choice(sim, events, i),
            Screen::Podium => {
                self.quit_to_title(sim);
            }
            Screen::Pass | Screen::MedleyCard | Screen::Ending | Screen::Credits => self.continue_story(sim, events),
            Screen::Dev => self.dev_activate(sim, events),
            Screen::Together => {
                if i == 0 {
                    self.adjust(0, 1, events);
                } else {
                    self.begin_together(sim);
                }
            }
            _ => {}
        }
    }

    pub fn push(&mut self, s: Screen) {
        self.stack.push(s);
        self.focus = 0;
    }

    fn push_page(&mut self, s: Screen) {
        self.page = 0;
        self.push(s);
    }

    /// Left/right on an item. Returns true if something changed.
    pub fn adjust(&mut self, i: usize, dir: i32, events: &mut Vec<SimEvent>) -> bool {
        let d = dir as f32;
        match self.top().clone() {
            Screen::Settings => {
                let s = &mut self.save.settings;
                match i {
                    0 => s.music = (s.music + d * 0.05).clamp(0.0, 1.0),
                    1 => s.sfx = (s.sfx + d * 0.05).clamp(0.0, 1.0),
                    2 => s.voice = (s.voice + d * 0.05).clamp(0.0, 1.0),
                    3 => s.xbox = !s.xbox,
                    4 => s.lean_sens = (s.lean_sens + d * 0.1).clamp(0.5, 2.0),
                    5 => s.assist = (s.assist + d * 0.1).clamp(0.0, 1.0),
                    6 => s.rhythm_offset = (s.rhythm_offset + d * 0.01).clamp(-0.2, 0.3),
                    7 => s.text_speed = (s.text_speed + d * 0.25).clamp(0.5, 3.0),
                    8 => s.fullscreen = !s.fullscreen,
                    _ => return false,
                }
                self.save.serial += 1;
                self.sfx(events, sfx::UI_MOVE, 0.3, 1.0 + 0.05 * d);
                true
            }
            Screen::CheckIn => {
                let g = self.save.guest_mut();
                match i {
                    0 => g.name = (g.name as i32 + dir).rem_euclid(NAMES.len() as i32) as usize,
                    1 => g.skin = (g.skin as i32 + dir).rem_euclid(SKINS.len() as i32) as usize,
                    2 => g.outfit = (g.outfit as i32 + dir).rem_euclid(OUTFITS.len() as i32) as usize,
                    _ => return false,
                }
                self.dirty = true;
                self.sfx(events, sfx::UI_MOVE, 0.3, 1.0);
                true
            }
            Screen::Wardrobe if i >= 8 => {
                let g = self.save.guest_mut();
                if i == 8 {
                    g.skin = (g.skin as i32 + dir).rem_euclid(SKINS.len() as i32) as usize;
                } else {
                    g.outfit = (g.outfit as i32 + dir).rem_euclid(OUTFITS.len() as i32) as usize;
                }
                self.save.serial += 1;
                self.dirty = true;
                true
            }
            Screen::Wardrobe => {
                if dir != 0 {
                    let g = self.save.guest_mut();
                    if g.gear_unlocked(i) {
                        g.gear_on[i] = !g.gear_on[i];
                        self.dirty = true;
                        self.save.serial += 1;
                    }
                }
                true
            }
            Screen::Dev => {
                self.dev_adjust(i, dir);
                true
            }
            Screen::Together => {
                if i == 0 {
                    self.players = if dir > 0 { if self.players >= 4 { 2 } else { self.players + 1 } } else if self.players <= 2 { 4 } else { self.players - 1 };
                }
                true
            }
            Screen::HowTo => {
                self.page = (self.page as i32 + dir).clamp(0, HOWTO_PAGES as i32 - 1) as usize;
                true
            }
            Screen::About => {
                self.page = (self.page as i32 + dir).clamp(0, ABOUT_PAGES as i32 - 1) as usize;
                true
            }
            _ => false,
        }
    }

    pub fn set_slider(&mut self, i: usize, v: f32) {
        if matches!(self.top(), Screen::Dev) {
            self.dev_slider(i, v);
            return;
        }
        if let Screen::Settings = self.top() {
            let s = &mut self.save.settings;
            let v = v.clamp(0.0, 1.0);
            match i {
                0 => s.music = v,
                1 => s.sfx = v,
                2 => s.voice = v,
                4 => s.lean_sens = 0.5 + v * 1.5,
                5 => s.assist = v,
                6 => s.rhythm_offset = -0.2 + v * 0.5,
                7 => s.text_speed = 0.5 + v * 2.5,
                _ => return,
            }
            self.save.serial += 1;
        }
    }

    pub fn back(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        self.sfx(events, sfx::UI_BACK, 0.5, 1.0);
        match self.top().clone() {
            Screen::Title | Screen::Island | Screen::Talk | Screen::Count | Screen::Play | Screen::Stamp => {}
            Screen::Card => {
                self.cancel_event(sim);
            }
            Screen::Pause => {
                if self.paused_for >= 3600 {
                    let n = self.paused_for / 3600;
                    let l = fill(&self.script.pick("pip.pause", 0), &[("n", n.to_string())]);
                    self.say(l);
                }
                self.paused_for = 0;
                self.stack.pop();
                self.focus = 0;
            }
            Screen::Guests { .. } | Screen::Together | Screen::Settings | Screen::About | Screen::HowTo | Screen::Calendar | Screen::Wardrobe | Screen::Schedule | Screen::ConfirmReset | Screen::Dev => {
                self.stack.pop();
                self.focus = 0;
            }
            Screen::CheckIn => {
                self.stack.pop();
                self.focus = 0;
            }
            Screen::Result => {
                let last = self.menu().items.len().saturating_sub(1);
                self.focus = last;
                self.activate(sim, events);
            }
            _ => {}
        }
    }

    // ------------------------------------------------------------------ the UI frame

    pub fn build_ui(&self, _sim: &Sim) -> UiFrame {
        let m = self.menu();
        let mut f = UiFrame {
            layout: m.layout,
            title: m.title,
            subtitle: m.subtitle,
            lines: m.lines,
            items: m.items,
            focus: self.focus,
            tabs: m.tabs,
            tab: self.tab,
            prompts: m.prompts,
            demo: self.demo,
            xbox: self.save.settings.xbox,
            screen: format!("{:?}", self.top()).split(|c: char| !c.is_alphanumeric()).next().unwrap_or("").to_string(),
            ..Default::default()
        };
        if !self.toast.0.is_empty() && self.toast.1 > 0 {
            f.toast = self.toast.0.clone();
        }
        let g = self.guest();
        match self.top() {
            Screen::Island | Screen::Talk => {
                f.layout = Layout::None;
                f.hud = Some(Hud {
                    day: g.day,
                    goal: self.goal(),
                    minutes: g.banked_today,
                    age: self.age_today,
                    prompts: vec![pr(Act::Confirm, "Talk / use"), pr(Act::Schedule, "Schedule"), pr(Act::Pause, "Pause")],
                    ..Default::default()
                });
                f.labels = self.island_labels();
            }
            Screen::Play | Screen::Count => {
                f.layout = Layout::None;
                if let Some(p) = &self.play {
                    let mut h = p.run.hud(&self.core, &self.rules);
                    if matches!(self.top(), Screen::Count) {
                        h.big = if p.count > 2.0 { "3".into() } else if p.count > 1.0 { "2".into() } else if p.count > 0.0 { "1".into() } else { "Go".into() };
                    }
                    if p.run.kind == Kind::Still {
                        f.dim = 0.0;
                    }
                    f.dim = match p.run.kind {
                        Kind::Still => 0.0,
                        _ => 0.0,
                    };
                    f.hud = Some(h);
                }
            }
            Screen::CheckTest | Screen::CheckIntro => {
                if let Some(c) = &self.check {
                    f.layout = Layout::None;
                    let (h, dim) = c.hud(&self.core, &self.rules);
                    f.hud = Some(h);
                    f.dim = dim;
                }
            }
            Screen::Report => {
                f.layout = Layout::Report;
                f.title = "Morning Wobble Check".into();
                f.report = Some(Report { age: self.age_roll.round() as i32, rolling: self.age_roll.round() as i32 != self.age_today, spark: g.ages.clone(), comment: self.report_comment.clone() });
                f.items = vec![Item::button("Continue")];
                f.prompts = vec![pr(Act::Confirm, "Continue")];
            }
            Screen::Attract => {
                f.layout = Layout::None;
                f.demo = true;
                if self.attract.as_ref().map(|a| a.title).unwrap_or(false) {
                    f.layout = Layout::List;
                    f.title = super::TITLE.into();
                    f.subtitle = "Press any button".into();
                    f.items = vec![];
                }
                f.prompts = vec![];
            }
            Screen::Stamp => {
                f.layout = Layout::None;
                f.big_text = format!("DAY {}", g.stamps);
                f.confetti = 1.0;
            }
            _ => {}
        }
        if let Some(d) = &self.dlg {
            let line = d.lines.get(d.idx).cloned().unwrap_or_default();
            f.dialog = Some(Dialog { speaker: d.speaker.clone(), text: line, shown: d.shown as usize, color: d.color.clone() });
        }
        if self.session {
            f.demo = false;
        }
        if self.view_input {
            f.dev_input = Some((self.last_lean, self.last_held));
        }
        if self.view_trace {
            f.dev_trace = self.trace.clone();
        }
        f
    }

    fn island_labels(&self) -> Vec<WorldLabel> {
        let mut v = vec![];
        let list = super::run::interactables(self);
        if let Some(i) = self.near.filter(|i| *i < list.len()) {
            let (name, pos) = list[i].clone();
            v.push(WorldLabel { pos: pos + glam::Vec3::Y * 2.2, text: name, prompt: Some(Act::Confirm) });
        }
        if let Some(i) = self.hover_idx.filter(|i| *i < list.len() && Some(*i) != self.near) {
            let (name, pos) = list[i].clone();
            v.push(WorldLabel { pos: pos + glam::Vec3::Y * 2.2, text: name, prompt: None });
        }
        v
    }
}

pub fn howto_page(page: usize) -> Vec<String> {
    match page {
        0 => vec![
            "Lean to balance. The dot on the Puck is you.".into(),
            "Stick, W A S D or the mouse. Small movements win.".into(),
        ],
        1 => vec![
            "Action holds your breath, squats and bounces.".into(),
            "Left and right steps are the shoulder buttons or Q and E.".into(),
        ],
        _ => vec![
            "Each morning Pip checks your Balance Age. Lower is better.".into(),
            "Reach 40 or less by day five to check out. Or stay. Staying is fine.".into(),
        ],
    }
}

pub fn about_fallback(page: usize) -> Vec<String> {
    match page {
        0 => vec!["Wii Fine".into(), "Source: Wii Fit. An original game in the same genre.".into(), "Sports mini-game anthology, third person.".into()],
        1 => vec!["Tech: Pavilion engine (Rust, wgpu, egui).".into(), "Audio, music and voices are synthesised in code.".into(), "Model: Anthropic claude-sonnet-5-5.".into()],
        2 => vec!["Testing feedback is part of this page when the game is built.".into()],
        3 => vec!["Engine feedback is part of this page when the game is built.".into()],
        4 => vec!["Prompt feedback is part of this page when the game is built.".into()],
        _ => vec!["Fonts: Fredoka and Nunito (SIL OFL).".into(), "Motion clips: see the engine credits.".into()],
    }
}

pub fn _use(_: Run, _: &str) -> String {
    fill("", &[])
}
