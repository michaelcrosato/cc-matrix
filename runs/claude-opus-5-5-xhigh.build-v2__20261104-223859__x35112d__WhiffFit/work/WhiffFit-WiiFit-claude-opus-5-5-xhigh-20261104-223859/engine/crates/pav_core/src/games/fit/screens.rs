//! What's on screen: every menu as data (`FitGame::menu`), and the whole UI as a list of nodes.

use super::events::EventKind;
use super::island::{PAVILIONS, Spot};
use super::medley::MPhase;
use super::menus::{Layout, MAct, MItem, Menu};
use super::meta;
use super::run::RunPhase;
use super::script;
use super::ui_model::*;
use super::{FitGame, Flow, Overlay};
use crate::sim::Sim;

/// How To Play, as pages: a title and short lines.
pub const HOW_TO: [(&str, &str); 6] = [
    ("Your Dot", "Everything here is played through one dot. Lean with the left stick, W A S D, or the mouse's distance from the middle of the screen. Small movements matter. Mastery means doing less."),
    ("Action and Steps", "Action breathes, squats and bounces. The two step buttons are your left and right feet. Hold both to brace."),
    ("A Day at Tippy Cay", "Each morning Pip checks your wobble and gives you a Balance Age. Then walk the island, step on a mat, and bank minutes in the giant clam. Meet the day's goal and you may sleep."),
    ("Leaving", "Checkout needs a Balance Age of 40 or better on Day 5, after the Big Stand. Nobody has asked to leave yet."),
    ("The Schedule", "The Schedule lists everything open today and takes you straight there. Find five lost flip-flops for Two-Towel Tom. Wave at people. It costs nothing."),
    ("Play Together", "On the title screen, two to four guests can pass one pad through the Inter-Resort Medley. Earlier guests show up as ghosts in the next lane. Your own best runs return from Day 3. I am not comparing you."),
];

/// The Tuning tab's groups, from `impl Tunable for Rules`.
pub fn dev_groups(r: &super::rules::Rules) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for p in crate::params::list(&mut r.clone()) {
        let g = p.path.split('.').next().unwrap_or("").to_string();
        if !out.contains(&g) {
            out.push(g);
        }
    }
    out
}

const CAROUSEL: Layout = Layout::Carousel { y: 330.0, w: 520.0, h: 400.0, visible: 3 };
const LIST: Layout = Layout::List { x: 460.0, y: 300.0, w: 1000.0, row: 104.0, visible: 6 };

fn pct(v: f32) -> String {
    format!("{:.0}%", v * 100.0)
}

impl FitGame {
    /// The menu on top now, if any.
    pub fn menu(&self) -> Option<Menu> {
        if self.dialog.is_some() && self.overlays.is_empty() {
            return None;
        }
        if let Some(o) = self.overlays.last() {
            return Some(self.overlay_menu(*o));
        }
        if self.boot.touch_only {
            return Some(Menu {
                key: "touch",
                title: String::new(),
                sub: String::new(),
                items: vec![MItem::button(MAct::Settings, "Settings")],
                layout: Layout::List { x: 760.0, y: 650.0, w: 400.0, row: 110.0, visible: 1 },
                tabs: None,
                back: false,
                card: false,
                dim: false,
            });
        }
        match &self.flow {
            Flow::Title => {
                let has = self.save.slots.iter().any(|s| s.is_some());
                let items = vec![
                    MItem::button(MAct::Stay, if has { "Continue" } else { "New Stay" }),
                    MItem::button(MAct::Together, "Play Together"),
                    MItem::button(MAct::Settings, "Settings"),
                    MItem::button(MAct::About, "About"),
                ];
                Some(Menu {
                    key: "title",
                    title: String::new(),
                    sub: String::new(),
                    items,
                    layout: Layout::List { x: 660.0, y: 470.0, w: 600.0, row: 106.0, visible: 4 },
                    tabs: None,
                    back: false,
                    card: false,
                    dim: false,
                })
            }
            Flow::Slots => {
                let items = self
                    .save
                    .slots
                    .iter()
                    .enumerate()
                    .map(|(i, s)| match s {
                        Some(g) => {
                            let mut it = MItem::button(MAct::Slot(i as u8), g.name.clone()).sub(if g.free_play() {
                                "Free Play".to_string()
                            } else {
                                format!("Day {}", g.day)
                            });
                            it.stars = None;
                            it
                        }
                        None => MItem::button(MAct::Slot(i as u8), format!("Guest {}", i + 1)).sub("New Stay"),
                    })
                    .collect();
                Some(Menu {
                    key: "slots",
                    title: "Who is staying?".into(),
                    sub: String::new(),
                    items,
                    layout: Layout::Row { y: 340.0, w: 400.0, h: 360.0 },
                    tabs: None,
                    back: true,
                    card: false,
                    dim: true,
                })
            }
            Flow::Names(_) => {
                let items = script::list("names").iter().enumerate().map(|(i, n)| MItem::button(MAct::Name(i as u16), n.clone())).collect();
                Some(Menu {
                    key: "names",
                    title: "What shall we call you?".into(),
                    sub: "Pip has already written it down.".into(),
                    items,
                    layout: LIST,
                    tabs: None,
                    back: true,
                    card: true,
                    dim: true,
                })
            }
            Flow::Look(_, name) => {
                let items = vec![
                    MItem::choice(MAct::Skin, "Skin", format!("Tone {}", self.look_skin + 1)),
                    MItem::choice(MAct::Outfit, "Outfit", meta::OUTFITS[self.look_outfit as usize % 8].0),
                    MItem::button(MAct::Begin, "Begin Your Stay"),
                ];
                Some(Menu {
                    key: "look",
                    title: name.clone(),
                    sub: "This is you. Pip has seen worse.".into(),
                    items,
                    layout: Layout::List { x: 70.0, y: 300.0, w: 700.0, row: 110.0, visible: 3 },
                    tabs: None,
                    back: true,
                    card: true,
                    dim: false,
                })
            }
            Flow::Event(r) if r.phase == RunPhase::Result && r.pt > 0.9 => {
                let mut items = Vec::new();
                if self.direct.is_some() || r.kind != EventKind::BigStand {
                    items.push(MItem::button(MAct::Retry, "Retry"));
                }
                items.push(MItem::button(MAct::Done, if r.kind == EventKind::BigStand { "Continue" } else { "Back" }));
                Some(Menu {
                    key: "result",
                    title: String::new(),
                    sub: String::new(),
                    items,
                    layout: Layout::Row { y: 870.0, w: 340.0, h: 110.0 },
                    tabs: None,
                    back: false,
                    card: false,
                    dim: false,
                })
            }
            Flow::Together(n) => {
                let items = vec![
                    MItem::button(MAct::Players(2), "2 Guests").sub(if *n == 2 { "Chosen" } else { "" }),
                    MItem::button(MAct::Players(3), "3 Guests").sub(if *n == 3 { "Chosen" } else { "" }),
                    MItem::button(MAct::Players(4), "4 Guests").sub(if *n == 4 { "Chosen" } else { "" }),
                    MItem::button(MAct::Go, "Begin the Medley"),
                ];
                Some(Menu {
                    key: "together",
                    title: "The Inter-Resort Medley".into(),
                    sub: "One pad. Paddle Slalom, Tide Table, Cannonball Cup. Pass it round.".into(),
                    items,
                    layout: Layout::List { x: 560.0, y: 340.0, w: 800.0, row: 110.0, visible: 4 },
                    tabs: None,
                    back: true,
                    card: true,
                    dim: true,
                })
            }
            Flow::Medley(m) if !m.hub && m.phase == MPhase::Pass => Some(Menu {
                key: "pass",
                title: String::new(),
                sub: String::new(),
                items: vec![MItem::button(MAct::Ready, "I have the pad")],
                layout: Layout::Row { y: 730.0, w: 520.0, h: 110.0 },
                tabs: None,
                back: false,
                card: false,
                dim: false,
            }),
            Flow::Medley(m) if !m.hub && m.phase == MPhase::Podium => Some(Menu {
                key: "podium",
                title: String::new(),
                sub: String::new(),
                items: vec![MItem::button(MAct::Ready, "Back to the title")],
                layout: Layout::Row { y: 880.0, w: 520.0, h: 110.0 },
                tabs: None,
                back: false,
                card: false,
                dim: false,
            }),
            _ => None,
        }
    }

    fn overlay_menu(&self, o: Overlay) -> Menu {
        let base = |key: &'static str, title: &str, items: Vec<MItem>| Menu {
            key,
            title: title.to_string(),
            sub: String::new(),
            items,
            layout: LIST,
            tabs: None,
            back: true,
            card: true,
            dim: true,
        };
        match o {
            Overlay::Pause => {
                if self.session {
                    return base("pause", "Paused", vec![MItem::button(MAct::Resume, "Resume"), MItem::button(MAct::Settings, "Settings")]);
                }
                let in_stay = self.guest().is_some();
                let free = self.guest().is_some_and(|g| g.free_play());
                let mut items = vec![MItem::button(MAct::Resume, "Resume")];
                if in_stay && !matches!(self.flow, Flow::Medley(_)) {
                    items.push(MItem::button(MAct::Schedule, "Schedule"));
                    items.push(MItem::button(MAct::Calendar, "Calendar"));
                    let mut w = MItem::button(MAct::Wardrobe, "Wardrobe");
                    if self.day() < 2 && !free {
                        w = w.locked().sub("Opens on Day 2");
                    } else if !matches!(self.flow, Flow::Island) {
                        w = w.locked().sub("On the island");
                    }
                    items.push(w);
                }
                items.push(MItem::button(MAct::Settings, "Settings"));
                items.push(MItem::button(MAct::HowTo, "How to Play"));
                items.push(MItem::button(MAct::About, "About"));
                items.push(MItem::button(MAct::Dev, "Dev Mode"));
                items.push(MItem::button(MAct::Quit, "Quit to Title"));
                let mut m = base("pause", "Paused", items);
                let mins = self.paused_minutes();
                if mins > 0 {
                    m.sub = script::fill(&script::line("pip.paused", mins as usize), &[("n", mins.to_string())]);
                }
                m
            }
            Overlay::Schedule(-1) => {
                let day = self.day();
                let free = self.guest().is_some_and(|g| g.free_play());
                let mut items: Vec<MItem> = PAVILIONS
                    .iter()
                    .enumerate()
                    .map(|(i, p)| {
                        let open = free || p.opens <= day;
                        let it = MItem::button(MAct::Pavilion(i as u8), p.name);
                        if open {
                            let have: u32 = self.guest().map_or(0, |g| p.events.iter().map(|k| g.stars.get(k.key()).copied().unwrap_or(0) as u32).sum());
                            it.sub(format!("{}\n{} of {} stars", p.coach.name(), have, p.events.len() * 3))
                        } else {
                            it.locked().sub(format!("Opens on Day {}", p.opens))
                        }
                    })
                    .collect();
                if day >= 5 || free {
                    items.push(MItem::button(MAct::Event(EventKind::BigStand), "The Big Stand").sub("The bay, at sunset"));
                }
                if matches!(self.flow, Flow::Island) && items.len() < 6 {
                    items.push(MItem::button(MAct::Reception, "Back to the Desk"));
                }
                if day < 5 && !free {
                    items.push(MItem::button(MAct::EndDay, "End Day").sub(self.goal_text()));
                }
                let mut m = base("schedule", "Schedule", items);
                m.sub = format!("Day {day}");
                m.layout = CAROUSEL;
                m.card = false;
                m
            }
            Overlay::Schedule(p) => {
                let pav = &PAVILIONS[p as usize];
                let g = self.guest();
                let items = pav
                    .events
                    .iter()
                    .map(|k| {
                        let s = g.and_then(|g| g.stars.get(k.key()).copied()).unwrap_or(0);
                        let best = g.and_then(|g| g.bests.get(k.key()).copied());
                        MItem::button(MAct::Event(*k), k.name()).stars(s).sub(match best {
                            Some(b) => format!("Best {b}"),
                            None => "Not yet attempted".to_string(),
                        })
                    })
                    .collect();
                let mut m = base("events", pav.name, items);
                m.sub = pav.coach.name().to_string();
                m.layout = CAROUSEL;
                m.card = false;
                m
            }
            Overlay::Calendar => {
                let mut m = base("calendar", "", vec![MItem::button(MAct::Close, "Back")]);
                m.card = false;
                m.dim = false;
                m.layout = Layout::Row { y: 800.0, w: 340.0, h: 100.0 };
                m
            }
            Overlay::Wardrobe => {
                let g = self.guest().cloned().unwrap_or_default();
                let c = |i: u8| meta::COLOURS[i as usize % 8].0;
                let items = vec![
                    MItem::choice(MAct::Wear(0), "Hat", meta::HATS[g.wear.hat as usize].label),
                    MItem::choice(MAct::Wear(1), "Wrists", meta::BANDS[g.wear.bands as usize].label),
                    MItem::choice(MAct::Wear(2), "Waist", meta::BELTS[g.wear.belt as usize].label),
                    MItem::choice(MAct::Wear(3), "Arms", meta::FLOATIES[g.wear.floaties as usize].label),
                    MItem::choice(MAct::Wear(4), "Shirt", c(g.wear.shirt)),
                    MItem::choice(MAct::Wear(5), "Trousers", c(g.wear.pants)),
                    MItem::choice(MAct::Wear(6), "Shoes", if g.golden && g.wear.shoes == 0 { "Golden Flip-Flops" } else { c(g.wear.shoes) }),
                ];
                Menu {
                    key: "wardrobe",
                    title: "Wardrobe".into(),
                    sub: script::singulars(&format!("{} minutes banked", g.minutes)),
                    items,
                    layout: Layout::List { x: 70.0, y: 260.0, w: 760.0, row: 104.0, visible: 6 },
                    tabs: None,
                    back: true,
                    card: true,
                    dim: false,
                }
            }
            Overlay::Settings => {
                let s = &self.save.settings;
                let mut items = vec![
                    MItem::slider(MAct::Music, "Music", s.music, pct(s.music)),
                    MItem::slider(MAct::Sfx, "Sound Effects", s.sfx, pct(s.sfx)),
                    MItem::slider(MAct::Voice, "Voices", s.voice, pct(s.voice)),
                    MItem::choice(MAct::Glyphs, "Button Glyphs", if s.xbox { "Xbox" } else { "PlayStation" }),
                    MItem::slider(MAct::LeanSens, "Lean Sensitivity", (s.lean_sens - 0.5) / 1.5, pct(s.lean_sens)),
                    MItem::slider(MAct::Assist, "Wobble Assist", s.assist, pct(s.assist)),
                    MItem::slider(MAct::Rhythm, "Rhythm Offset", (s.rhythm_offset + 0.2) / 0.6, format!("{:.0} ms", s.rhythm_offset * 1000.0)),
                    MItem::choice(MAct::TextSpeed, "Text Speed", ["Slow", "Normal", "Fast"][s.text_speed.min(2) as usize]),
                    MItem::button(MAct::Fullscreen, "Fullscreen"),
                    MItem::button(MAct::ResetSave, "Reset Save"),
                ];
                if self.boot.touch_only {
                    // A finger has no Back button.
                    items.insert(0, MItem::button(MAct::Close, "Back"));
                }
                base("settings", "Settings", items)
            }
            Overlay::ConfirmReset => {
                let mut m = base("confirm", "Reset every guest?", vec![MItem::button(MAct::No, "No"), MItem::button(MAct::Yes, "Yes, forget everyone")]);
                m.sub = "Pip will remember anyway.".into();
                m
            }
            Overlay::HowTo(_) => {
                let items = vec![MItem::button(MAct::PagePrev, "Previous"), MItem::button(MAct::PageNext, "Next")];
                Menu {
                    key: "howto",
                    title: String::new(),
                    sub: String::new(),
                    items,
                    layout: Layout::Row { y: 880.0, w: 340.0, h: 100.0 },
                    tabs: None,
                    back: true,
                    card: false,
                    dim: true,
                }
            }
            Overlay::About(_) => {
                let items = vec![MItem::button(MAct::PagePrev, "Previous"), MItem::button(MAct::PageNext, "Next")];
                Menu {
                    key: "about",
                    title: String::new(),
                    sub: String::new(),
                    items,
                    layout: Layout::Row { y: 900.0, w: 340.0, h: 96.0 },
                    tabs: None,
                    back: true,
                    card: false,
                    dim: true,
                }
            }
            Overlay::Dev => self.dev_menu(),
        }
    }

    fn dev_menu(&self) -> Menu {
        let d = &self.dev;
        let onoff = |b: bool| if b { "On" } else { "Off" };
        let mut items: Vec<MItem> = Vec::new();
        match d.tab {
            0 => {
                for day in 1..=5u8 {
                    items.push(MItem::button(MAct::DevDay(day), format!("Day {day}")));
                }
                for k in super::events::ALL {
                    items.push(MItem::button(MAct::DevEvent(k), k.name()));
                }
                for (i, p) in super::finale::PHASES.iter().enumerate() {
                    items.push(MItem::button(MAct::DevPhase(i as u8), format!("Big Stand: {p}")));
                }
                items.push(MItem::button(MAct::DevAttract, "Attract Mode"));
                items.push(MItem::button(MAct::DevMedley, "Medley"));
            }
            1 => {
                items.push(MItem::choice(MAct::DevFlag(0), "No Tips", onoff(d.no_tips)));
                items.push(MItem::choice(MAct::DevFlag(1), "Autoplay With the Bot", onoff(d.autoplay)));
                items.push(MItem::choice(MAct::DevFlag(2), "Skip Dialogue", onoff(d.skip_dialog)));
                items.push(MItem::button(MAct::DevGive, "Give 10 Minutes"));
                items.push(MItem::button(MAct::DevUnlock, "Unlock All"));
                items.push(MItem::button(MAct::DevAllStars, "All Stars"));
                items.push(MItem::button(MAct::DevWin, "Win This Event Now"));
                items.push(MItem::button(MAct::DevLose, "Lose This Event Now"));
            }
            2 => {
                items.push(MItem::choice(MAct::DevScale, "Time Scale", format!("{}x", d.time_scale)));
                items.push(MItem::choice(MAct::DevHold, "Hold the World", onoff(d.hold)));
                items.push(MItem::button(MAct::DevStep, "Single Step"));
            }
            3 => {
                let groups = dev_groups(&self.rules);
                let g = groups.get(d.group).cloned().unwrap_or_default();
                items.push(MItem::choice(MAct::DevGroup, "Group", g.clone()));
                let mut rules = self.rules.clone();
                for (i, p) in crate::params::list(&mut rules).iter().enumerate() {
                    if !p.path.starts_with(&format!("{g}.")) {
                        continue;
                    }
                    if let crate::params::ParamKind::Float { min, max } = p.kind {
                        let v = p.value.as_f64().unwrap_or(0.0) as f32;
                        let name = p.path.rsplit('.').next().unwrap_or("").replace('_', " ");
                        items.push(MItem::slider(MAct::DevParam(i as u16), name, (v - min) / (max - min).max(1e-4), format!("{v:.2}")));
                    }
                }
                items.push(MItem::button(MAct::DevResetGroup, "Reset Group to Defaults"));
                items.push(MItem::button(MAct::DevResetAll, "Reset All to Defaults"));
            }
            4 => {
                items.push(MItem::choice(MAct::DevFlag(3), "Input Viewer", onoff(d.input_view)));
                items.push(MItem::choice(MAct::DevFlag(4), "Dot Trace", onoff(d.trace)));
                items.push(MItem::choice(MAct::DevFlag(5), "Engine Stats", onoff(d.stats)));
                items.push(MItem::choice(MAct::DevFlag(6), "Free Camera", onoff(d.free_cam)));
                items.push(MItem::choice(MAct::DevFlag(7), "Ghost Lanes", onoff(d.ghost_lanes)));
            }
            _ => {
                let mut r = MItem::button(MAct::DevResetGuest, "Reset This Guest");
                if self.guest().is_none() {
                    r = r.locked().sub("No guest yet");
                }
                items.push(r);
            }
        }
        Menu {
            key: "dev",
            title: "Dev Mode".into(),
            sub: String::new(),
            items,
            layout: Layout::List { x: 260.0, y: 330.0, w: 1400.0, row: 96.0, visible: 6 },
            tabs: Some((vec!["Jump", "Cheats", "Time", "Tuning", "View", "Save"], d.tab)),
            back: true,
            card: true,
            dim: true,
        }
    }

    fn goal_text(&self) -> String {
        let day = self.day();
        let goal = self.rules.goal(day);
        let today = self.guest().map(|g| g.minutes_today).unwrap_or(0);
        if today >= goal { "Sleep. You have earned it. Numerically.".into() } else { script::singulars(&format!("{} more minutes", goal - today)) }
    }

    fn paused_minutes(&self) -> u32 {
        (self.paused_t / 60.0) as u32
    }

    // ------------------------------------------------------------------ drawing

    pub fn build_ui(&self, sim: &Sim) -> UiFrame {
        let mut ui = Ui::default();
        let s = &self.save.settings;
        ui.f.screen = self.screen_name();
        ui.f.xbox = s.xbox;
        ui.f.music = s.music;
        ui.f.sfx = s.sfx;
        ui.f.voice = s.voice;
        ui.f.rhythm_offset = s.rhythm_offset;
        ui.f.time_scale = self.dev.time_scale;
        ui.f.show_stats = self.dev.stats;
        ui.f.fullscreen_serial = self.fullscreen_serial;
        ui.f.rumble = self.rumble;
        ui.f.save_serial = self.save_serial;
        ui.f.save_json = self.save_text.clone();
        ui.f.ended = self.hub_ended;
        ui.f.input = [self.rules.input.deadzone, self.rules.input.stick_curve, self.rules.input.key_rate, self.rules.input.key_return, self.rules.input.mouse_span];
        ui.f.music_hold = self.frozen_now();
        ui.no_prompts = !self.overlays.is_empty() || self.dialog.is_some();
        match &self.flow {
            Flow::Title => self.title_ui(&mut ui),
            Flow::Attract(a) => self.attract_ui(a, &mut ui),
            Flow::Slots | Flow::Names(_) | Flow::Look(..) | Flow::Together(_) | Flow::Morning | Flow::Intro => {}
            Flow::Check(c) => {
                c.hud(&self.rules, &mut ui);
                ui.f.arrows_step = c.test == 3;
                ui.f.cursor_leans = true;
            }
            Flow::Report(r) => self.report_ui(r, &mut ui),
            Flow::Island => {
                self.island_ui(sim, &mut ui);
                ui.f.cam_free = true;
            }
            Flow::Event(r) => {
                let about = script::line(&format!("card.{}", r.kind.key()), 0);
                r.hud(&self.rules, &mut ui, &about);
                ui.f.arrows_step = r.arrows_step();
                ui.f.lean_fast = r.st.lean_fast();
                ui.f.cursor_leans = r.phase == RunPhase::Play;
            }
            Flow::Stamp(t, d) => self.calendar_ui(&mut ui, Some((*t, *d))),
            Flow::Ending(..) => {}
            Flow::Credits(t, _) => self.credits_ui(*t, &mut ui),
            Flow::Medley(m) => {
                m.hud(self, &mut ui);
                if let Some(r) = &m.run {
                    ui.f.arrows_step = r.arrows_step();
                    ui.f.cursor_leans = r.phase == RunPhase::Play;
                }
            }
        }
        ui.no_prompts = false;
        if let Some(d) = &self.dialog {
            if self.overlays.is_empty() {
                self.dialog_ui(d, &mut ui);
            }
        }
        if let Some(Overlay::Calendar) = self.overlays.last() {
            ui.fade(SHADE);
            self.calendar_ui(&mut ui, None);
        }
        if let Some(m) = self.menu() {
            self.menu_ui(&m, &mut ui);
        }
        if self.boot.touch_only {
            ui.over = false;
            self.touch_card(&mut ui);
        }
        self.dev_overlays(sim, &mut ui);
        if self.dev.free_cam {
            ui.f.cam_free = true;
        }
        ui.f.focus = ui.f.items.iter().find(|i| i.focused).map(|i| i.id);
        ui.f
    }

    fn title_ui(&self, ui: &mut Ui) {
        ui.title(960.0, 110.0, 190.0, WHITE, Align::Center, super::TITLE);
        ui.title(958.0, 106.0, 190.0, INK, Align::Center, super::TITLE);
        ui.panel(610.0, 330.0, 700.0, 70.0, with_alpha(WHITE, 0.85), 35.0);
        ui.label(960.0, 340.0, 42.0, TEAL, Align::Center, super::TAGLINE);
        ui.prompt_row(&[(Act::Menu, "Choose"), (Act::Confirm, "Confirm")]);
    }

    fn attract_ui(&self, a: &super::attract::Attract, ui: &mut Ui) {
        ui.no_prompts = true;
        if let Some(r) = &a.run {
            let about = String::new();
            r.hud(&self.rules, ui, &about);
        }
        let n = super::attract::ATTRACT.len();
        if a.seg == 0 || a.seg > n {
            ui.title(960.0, 220.0, 170.0, WHITE, Align::Center, super::TITLE);
            ui.title(958.0, 216.0, 170.0, INK, Align::Center, super::TITLE);
            ui.panel(610.0, 430.0, 700.0, 70.0, with_alpha(WHITE, 0.85), 35.0);
            ui.label(960.0, 440.0, 42.0, TEAL, Align::Center, super::TAGLINE);
        }
        // The ribbon.
        ui.over = true;
        ui.panel(700.0, 960.0, 520.0, 96.0, with_alpha(CORAL, 0.96), 40.0);
        ui.label(960.0, 972.0, 60.0, WHITE, Align::Center, "DEMO");
        if !self.boot.touch_only {
            ui.panel(620.0, 870.0, 680.0, 76.0, with_alpha(WHITE, 0.96), 38.0);
            ui.label(960.0, 880.0, 46.0, INK, Align::Center, "Press any button");
        }
        ui.over = false;
    }

    fn report_ui(&self, r: &super::flow::Report, ui: &mut Ui) {
        ui.card(420.0, 70.0, 1080.0, 620.0);
        ui.label(960.0, 90.0, 48.0, INK_SOFT, Align::Center, "Your Balance Age today");
        let n = self.report_number(r);
        ui.title(960.0, 140.0, 240.0, if r.done_roll { TEAL } else { INK }, Align::Center, n.to_string());
        // A sparkline of five big dots: the week.
        if let Some(g) = self.guest() {
            let (x0, y) = (620.0, 530.0);
            let span = 170.0;
            let mut pts = Vec::new();
            for i in 0..5usize {
                let cx = x0 + i as f32 * span;
                let age = g.ages.get(i).copied();
                let cy = y + age.map(|a| (a as f32 - 50.0) * 1.6).unwrap_or(0.0).clamp(-60.0, 60.0);
                if age.is_some() {
                    pts.push([cx, cy]);
                }
            }
            if pts.len() > 1 {
                ui.line(pts.clone(), 8.0, SEA);
            }
            for i in 0..5usize {
                let cx = x0 + i as f32 * span;
                let age = g.ages.get(i).copied();
                let cy = y + age.map(|a| (a as f32 - 50.0) * 1.6).unwrap_or(0.0).clamp(-60.0, 60.0);
                let last = i + 1 == g.ages.len();
                ui.circle(cx, cy, if last { 30.0 } else { 22.0 }, if age.is_some() { if last { CORAL } else { TEAL } } else { with_alpha(SKY, 0.8) }, WHITE, 4.0);
            }
        }
        if r.done_roll {
            let line = r.comment.get(r.line).cloned().unwrap_or_default();
            ui.card(240.0, 730.0, 1440.0, 220.0);
            ui.label(280.0, 744.0, 40.0, TEAL, Align::Left, "Pip");
            ui.para(280.0, 796.0, 1360.0, 40.0, INK, Align::Left, line);
            ui.prompt(1500.0, 906.0, Act::Confirm, "Next", Align::Left);
        }
    }

    fn dialog_ui(&self, d: &super::dialog::Dialog, ui: &mut Ui) {
        let (x, y, w, h) = (200.0, 740.0, 1520.0, 260.0);
        ui.card(x, y, w, h);
        ui.panel(x + 36.0, y - 30.0, 30.0 + d.who.name().chars().count() as f32 * 26.0, 70.0, TEAL, 30.0);
        ui.label(x + 56.0, y - 22.0, 44.0, WHITE, Align::Left, d.who.name());
        let text: String = d.text().chars().take(d.shown as usize).collect();
        ui.para(x + 50.0, y + 62.0, w - 120.0, 44.0, INK, Align::Left, text);
        if d.complete() {
            ui.prompt(x + w - 200.0, y + h - 44.0, Act::Confirm, "Next", Align::Left);
        }
        if matches!(self.flow, Flow::Intro) {
            ui.prompt(x + 50.0, y + h - 44.0, Act::Back, "Skip", Align::Left);
        }
    }

    fn island_ui(&self, sim: &Sim, ui: &mut Ui) {
        let Some(g) = self.guest() else { return };
        let day = g.day;
        // Day and minute goal, top left.
        ui.panel(36.0, 30.0, 470.0, 130.0, with_alpha(WHITE, 0.93), 30.0);
        ui.label(60.0, 40.0, 52.0, INK, Align::Left, if g.free_play() { format!("Free Play, day {}", g.free_days + 1) } else { format!("Day {day}") });
        let goal = self.rules.goal(day);
        if goal > 0 && !g.free_play() {
            ui.bar(60.0, 112.0, 280.0, 26.0, (g.minutes_today as f32 / goal as f32).min(1.0), MINT);
            ui.text(356.0, 100.0, 36.0, INK_SOFT, Align::Left, format!("{}/{}", g.minutes_today, goal));
        } else {
            ui.text(60.0, 100.0, 36.0, INK_SOFT, Align::Left, script::singulars(&format!("{} minutes", g.minutes)));
        }
        // Balance Age, top right.
        ui.panel(1520.0, 30.0, 364.0, 130.0, with_alpha(WHITE, 0.93), 30.0);
        ui.text(1860.0, 36.0, 34.0, INK_SOFT, Align::Right, "Balance Age");
        let age = g.ages.last().copied().map(|a| a.to_string()).unwrap_or_else(|| "?".into());
        ui.label(1860.0, 72.0, 72.0, TEAL, Align::Right, age);
        // The nearest thing.
        if let Some(n) = self.near_spot() {
            let at = n.id.and_then(|id| sim.feet(id)).unwrap_or(n.pos);
            let (label, h) = match n.spot {
                Spot::Mat(i) => (PAVILIONS[i as usize].name.to_string(), 1.4),
                Spot::Talk(w) => (format!("Talk to {}", w.name()), 2.4),
                Spot::Cabana => ("Sleep".to_string(), 2.0),
                Spot::Clam => ("Minute Clam".to_string(), 2.0),
                Spot::Calendar => ("Calendar".to_string(), 2.6),
                Spot::Wardrobe => ("Wardrobe".to_string(), 2.2),
                Spot::BigStand => ("The Big Stand".to_string(), 1.6),
                _ => (String::new(), 1.0),
            };
            ui.world_prompt(at + glam::Vec3::Y * h, Act::Confirm, label);
            ui.world_ring(at + glam::Vec3::Y * 0.05, 1.0, TEAL);
        }
        if let Some(n) = self.under_pointer.and_then(|i| self.spots.get(i)) {
            let at = n.id.and_then(|id| sim.feet(id)).unwrap_or(n.pos);
            ui.world_ring(at + glam::Vec3::Y * 0.05, 1.25, SUN);
        }
        if let Some((q, _)) = &self.island_quip {
            let text: String = q.text().chars().take(q.shown as usize).collect();
            ui.card_c(300.0, 810.0, 1320.0, 160.0, with_alpha(WHITE, 0.96));
            ui.label(330.0, 816.0, 34.0, TEAL, Align::Left, q.who.name());
            ui.para(330.0, 862.0, 1260.0, 36.0, INK, Align::Left, text);
        }
        ui.prompt_row(&[(Act::Walk, "Walk"), (Act::Jog, "Jog"), (Act::Schedule, "Schedule"), (Act::Wave, "Wave")]);
        // The pointer's ring.
        if let Some(a) = self.last_input.aim {
            let target = self.spots.iter().filter(|s| self.spot_open(s.spot)).map(|s| s.id.and_then(|id| sim.feet(id)).unwrap_or(s.pos)).find(|p| (*p - a).with_y(0.0).length() < 1.2);
            if let Some(p) = target {
                ui.world_ring(p + glam::Vec3::Y * 0.05, 1.2, SUN);
            }
        }
    }

    pub fn calendar_ui(&self, ui: &mut Ui, stamping: Option<(f32, u8)>) {
        let g = self.guest();
        ui.card(200.0, 120.0, 1520.0, 640.0);
        ui.title(960.0, 140.0, 84.0, INK, Align::Center, "Calendar");
        let free = g.is_some_and(|g| g.free_play());
        for i in 0..5u8 {
            let x = 340.0 + i as f32 * 310.0;
            let done = g.is_some_and(|g| g.stamps > i);
            ui.panel(x - 130.0, 280.0, 260.0, 380.0, if done { with_alpha(MINT, 0.5) } else { SKY }, 30.0);
            ui.label(x, 300.0, 56.0, INK, Align::Center, format!("{}", i + 1));
            let age = g.and_then(|g| g.ages.get(i as usize).copied());
            if let Some(a) = age {
                ui.text(x, 380.0, 40.0, INK_SOFT, Align::Center, format!("Age {a}"));
            }
            let (show, k) = match stamping {
                Some((t, d)) if d == i + 1 => (t >= 0.7, (1.0 + (0.9 - t).max(0.0) * 8.0).min(3.0)),
                _ => (done, 1.0),
            };
            if show {
                ui.circle(x, 520.0, 90.0 * k, with_alpha(CORAL, 0.92), WHITE, 8.0);
                ui.label(x, 492.0, 54.0, WHITE, Align::Center, "OK");
            }
        }
        if free {
            let n = g.map(|g| g.free_days).unwrap_or(0);
            let line = if n == 1 { "And 1 real day since. There was 1.".to_string() } else { format!("And {n} real days since. There were {n}.") };
            ui.text(960.0, 680.0, 40.0, INK_SOFT, Align::Center, line);
        }
    }

    fn credits_ui(&self, t: f32, ui: &mut Ui) {
        ui.fade(with_alpha(INK, 0.86));
        let lines = script::list("credits");
        let scroll = t * 62.0;
        for (i, l) in lines.iter().enumerate() {
            let y = 1100.0 + i as f32 * 150.0 - scroll;
            if !(-120.0..1200.0).contains(&y) {
                continue;
            }
            if i == 0 {
                ui.title(960.0, y, 110.0, WHITE, Align::Center, l.clone());
            } else {
                ui.label(960.0, y, 46.0, WHITE, Align::Center, l.clone());
            }
        }
        ui.prompt_row_at(1030.0, &[(Act::Confirm, "On to Free Play")]);
    }

    fn touch_card(&self, ui: &mut Ui) {
        ui.card(460.0, 370.0, 1000.0, 410.0);
        ui.title(960.0, 410.0, 66.0, INK, Align::Center, "Controller or keyboard required");
        ui.para(960.0, 530.0, 860.0, 38.0, INK_SOFT, Align::Center, "This resort has no touch controls. Pip apologises, briefly.");
    }

    /// A menu, generically: card, title, tabs, rows or cards, and what the buttons do.
    fn menu_ui(&self, m: &Menu, ui: &mut Ui) {
        if m.dim {
            ui.fade(with_alpha(SHADE, 0.75));
        }
        // Whole-screen pages.
        match m.key {
            "howto" => {
                let Some(Overlay::HowTo(p)) = self.overlays.last() else { return };
                let (t, body) = HOW_TO[*p as usize % HOW_TO.len()];
                ui.card(260.0, 100.0, 1400.0, 750.0);
                ui.title(960.0, 130.0, 84.0, INK, Align::Center, t);
                ui.para(960.0, 280.0, 1200.0, 46.0, INK, Align::Center, body);
                ui.text(960.0, 780.0, 36.0, INK_SOFT, Align::Center, format!("Page {} of {}", *p + 1, HOW_TO.len()));
            }
            "about" => {
                let Some(Overlay::About(p)) = self.overlays.last() else { return };
                let empty = (String::new(), String::new());
                let (t, body) = self.about.get(*p as usize).unwrap_or(&empty);
                ui.card(120.0, 40.0, 1680.0, 840.0);
                ui.title(960.0, 50.0, 70.0, INK, Align::Center, t.clone());
                ui.para(960.0, 150.0, 1560.0, 34.0, INK, Align::Center, body.clone());
                ui.text(1760.0, 830.0, 34.0, INK_SOFT, Align::Right, format!("{} of {}", *p as usize + 1, self.about.len()));
            }
            _ => {}
        }
        match m.layout {
            Layout::List { x, y, w, row, visible } => {
                let n = m.items.len();
                let vis = visible.min(n).max(1);
                if m.card {
                    let extra = if m.tabs.is_some() { 240.0 } else { 150.0 };
                    let top = y - extra;
                    let bottom = y + vis as f32 * row + 20.0;
                    ui.card(x - 50.0, top, w + 100.0, bottom - top);
                    ui.title(x + w * 0.5, top + 18.0, 66.0, INK, Align::Center, m.title.clone());
                    if !m.sub.is_empty() {
                        ui.text(x + w * 0.5, top + 98.0, 34.0, INK_SOFT, Align::Center, m.sub.clone());
                    }
                }
                if let Some((tabs, cur)) = &m.tabs {
                    let tw = w / tabs.len() as f32;
                    for (i, t) in tabs.iter().enumerate() {
                        let tx = x + i as f32 * tw;
                        let on = i == *cur;
                        ui.panel(tx + 6.0, y - 104.0, tw - 12.0, 76.0, if on { TEAL } else { SKY }, 26.0);
                        ui.label(tx + tw * 0.5, y - 92.0, 40.0, if on { WHITE } else { INK }, Align::Center, *t);
                    }
                    ui.prompt(x - 40.0, y - 66.0, Act::TabL, "", Align::Left);
                    ui.prompt(x + w + 10.0, y - 66.0, Act::TabR, "", Align::Left);
                }
                let focus = self.focus.min(n.saturating_sub(1));
                let first = if focus + 1 > vis { focus + 1 - vis } else { 0 }.min(n.saturating_sub(vis));
                for i in first..(first + vis).min(n) {
                    let it = &m.items[i];
                    let yy = y + (i - first) as f32 * row;
                    self.push_item(ui, i, it, [x, yy, w, row - 12.0], i == focus);
                }
                if first > 0 {
                    ui.circle(x + w + 30.0, y + 20.0, 14.0, TEAL, WHITE, 0.0);
                }
                if first + vis < n {
                    ui.circle(x + w + 30.0, y + vis as f32 * row - 30.0, 14.0, TEAL, WHITE, 0.0);
                }
                let mut prompts: Vec<(Act, &str)> = vec![(Act::Menu, "Choose"), (Act::Confirm, "Confirm")];
                if m.back {
                    prompts.push((Act::Back, "Back"));
                }
                if m.key != "title" && m.key != "touch" {
                    ui.over = true;
                    ui.prompt_row_at(1040.0, &prompts);
                    ui.over = false;
                }
            }
            Layout::Carousel { y, w, h, visible } => {
                ui.title(960.0, y - 190.0, 84.0, WHITE, Align::Center, m.title.clone());
                ui.text(960.0, y - 84.0, 40.0, WHITE, Align::Center, m.sub.clone());
                let n = m.items.len().max(1);
                let vis = visible.min(n).max(1);
                let gap = 36.0;
                let x0 = 960.0 - (vis as f32 * w + (vis as f32 - 1.0) * gap) * 0.5;
                let focus = self.focus.min(n - 1);
                let first = super::menus::carousel_first(self.scroll, focus, n, vis);
                for i in first..first + vis {
                    self.push_item(ui, i, &m.items[i], [x0 + (i - first) as f32 * (w + gap), y, w, h], i == focus);
                }
                // More cards this way.
                let cy = y + h * 0.5;
                if first > 0 {
                    ui.line(vec![[x0 - 40.0, cy - 50.0], [x0 - 84.0, cy], [x0 - 40.0, cy + 50.0]], 14.0, WHITE);
                }
                if first + vis < n {
                    let xr = x0 + vis as f32 * w + (vis as f32 - 1.0) * gap;
                    ui.line(vec![[xr + 40.0, cy - 50.0], [xr + 84.0, cy], [xr + 40.0, cy + 50.0]], 14.0, WHITE);
                }
                ui.over = true;
                ui.prompt_row_at(1040.0, &[(Act::MenuSide, "Choose"), (Act::Confirm, "Confirm"), (Act::Back, "Back")]);
                ui.over = false;
            }
            Layout::Row { y, w, h } => {
                if !m.title.is_empty() {
                    ui.title(960.0, y - 160.0, 84.0, WHITE, Align::Center, m.title.clone());
                }
                let n = m.items.len().max(1);
                let gap = 30.0;
                let total = n as f32 * w + (n as f32 - 1.0) * gap;
                let x0 = 960.0 - total * 0.5;
                let focus = self.focus.min(n - 1);
                for (i, it) in m.items.iter().enumerate() {
                    self.push_item(ui, i, it, [x0 + i as f32 * (w + gap), y, w, h], i == focus);
                }
                let mut prompts: Vec<(Act, &str)> = Vec::new();
                if m.key == "howto" || m.key == "about" {
                    prompts.push((Act::TabL, "Previous"));
                    prompts.push((Act::TabR, "Next"));
                }
                if m.back {
                    prompts.push((Act::Back, "Back"));
                } else {
                    prompts.push((Act::Confirm, "Confirm"));
                }
                ui.over = true;
                ui.prompt_row_at(1040.0, &prompts);
                ui.over = false;
            }
        }
    }

    fn push_item(&self, ui: &mut Ui, i: usize, it: &MItem, r: [f32; 4], focused: bool) {
        ui.f.items.push(Item {
            id: i as u16,
            r,
            label: it.label.clone(),
            sub: it.sub.clone(),
            kind: it.kind.clone(),
            focused,
            bounce: if focused { self.bounce } else { 0.0 },
            stars: it.stars,
        });
    }

    fn dev_overlays(&self, sim: &Sim, ui: &mut Ui) {
        ui.over = true;
        if self.dev.input_view {
            let i = &self.last_input;
            let c = [240.0, 760.0];
            ui.panel(c[0] - 170.0, c[1] - 190.0, 340.0, 420.0, with_alpha(WHITE, 0.9), 24.0);
            ui.circle(c[0], c[1], 130.0, with_alpha(SKY, 0.8), INK_SOFT, 4.0);
            ui.circle(c[0] + i.lean.x * 130.0, c[1] - i.lean.y * 130.0, 22.0, CORAL, WHITE, 3.0);
            ui.text(c[0], c[1] - 180.0, 34.0, INK, Align::Center, super::lean_text(i.lean));
            ui.text(c[0], c[1] + 150.0, 34.0, INK, Align::Center, format!("{:06x}", i.held >> 15));
        }
        if self.dev.hold {
            ui.panel(620.0, 150.0, 680.0, 70.0, with_alpha(CORAL, 0.92), 30.0);
            ui.label(860.0, 158.0, 44.0, WHITE, Align::Center, "World held");
            ui.prompt(1040.0, 186.0, Act::TabR, "Step", Align::Left);
        }
        let _ = sim;
        ui.over = false;
    }
}
