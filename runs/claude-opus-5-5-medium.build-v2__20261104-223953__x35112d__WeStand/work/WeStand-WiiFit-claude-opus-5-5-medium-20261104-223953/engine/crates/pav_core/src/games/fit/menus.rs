//! Every menu, one way: a menu is a list of items with actions. The same list drives pad, keys and
//! pointer, and is what gets drawn. Layout is big rows, at most six in view.

use glam::Vec3;
use serde::{Deserialize, Serialize};

use super::events::*;
use super::island::Interact;
use super::meta::{self, Guest};
use super::run::{self, Phase, RunCtx};
use super::script::{self, PIP};
use super::*;
use crate::input::{InputFrame, UiEvent, buttons as btn};
use crate::params::{self, ParamValue};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum MenuKind {
    Title,
    Slot,
    Continue,
    Overwrite(u8),
    Name,
    Look,
    Pause,
    Settings,
    ResetConfirm,
    Schedule,
    Calendar,
    Wardrobe,
    HowTo,
    About,
    Dev,
    Result,
    Together,
    Podium,
    Hub,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct Menu {
    pub kind: MenuKind,
    pub focus: usize,
    pub tab: usize,
    pub scroll: usize,
    /// Which item the pointer last moved focus to, to tell a move from a resting pointer.
    pub hover: i32,
}

impl Menu {
    pub fn new(kind: MenuKind) -> Self {
        Self { kind, focus: 0, tab: 0, scroll: 0, hover: -1 }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub enum Act {
    None,
    Back,
    NewStay,
    ContinueMenu,
    Together,
    SettingsOpen,
    AboutOpen,
    Slot(usize),
    ConfirmOverwrite(usize),
    ContinueSlot(usize),
    Name(usize),
    Skin,
    Outfit,
    Begin,
    Resume,
    ScheduleOpen,
    CalendarOpen,
    WardrobeOpen,
    HowToOpen,
    DevOpen,
    QuitTitle,
    Setting(u8),
    ResetAsk,
    ResetYes,
    GoEvent(EvKind),
    GoStand,
    EndDay,
    Hat,
    Extra,
    Retry,
    Leave,
    TogetherN,
    TogetherGo,
    PodiumDone,
    Fullscreen,
    JumpDay(u8),
    JumpEvent(EvKind),
    JumpPhase(u32),
    JumpAttract,
    JumpMedley,
    Toggle(u8),
    GiveMinutes,
    UnlockAll,
    AllStars,
    WinNow,
    LoseNow,
    TimeScale,
    Step,
    Group,
    Param(String, f32, f32),
    ResetGroup,
    ResetAll,
    ResetGuest,
}

#[derive(Clone, Debug)]
pub struct Item {
    pub act: Act,
    pub label: String,
    pub sub: String,
    pub value: String,
    pub fill: Option<f32>,
    pub stars: i8,
}

fn item(act: Act, label: impl Into<String>) -> Item {
    Item { act, label: label.into(), sub: String::new(), value: String::new(), fill: None, stars: -1 }
}

const SETTING_NAMES: [&str; 8] = ["Music", "Sound Effects", "Voices", "Glyphs", "Lean Sensitivity", "Wobble Assist", "Rhythm Offset", "Text Speed"];

pub fn screen_name(g: &FitGame) -> &'static str {
    if g.attract.is_some() {
        return "attract";
    }
    if let Some(m) = g.menus.last() {
        return match m.kind {
            MenuKind::Title => "title",
            MenuKind::Slot | MenuKind::Continue | MenuKind::Overwrite(_) => "slots",
            MenuKind::Name => "name",
            MenuKind::Look => "look",
            MenuKind::Pause => "pause",
            MenuKind::Settings | MenuKind::ResetConfirm => "settings",
            MenuKind::Schedule => "schedule",
            MenuKind::Calendar => "calendar",
            MenuKind::Wardrobe => "wardrobe",
            MenuKind::HowTo => "howto",
            MenuKind::About => "about",
            MenuKind::Dev => "dev",
            MenuKind::Result => "result",
            MenuKind::Together => "together",
            MenuKind::Podium => "podium",
            MenuKind::Hub => "pause",
        };
    }
    if g.dialog.is_some() {
        return "dialog";
    }
    match g.mode {
        Mode::Title | Mode::Setup => "title",
        Mode::Island => "island",
        Mode::Check => "check",
        Mode::Report => "report",
        Mode::Run => match g.run.as_ref().map(|r| r.phase) {
            Some(Phase::Card) => "card",
            Some(Phase::Count) => "count",
            _ => "event",
        },
        Mode::Stamp => "stamp",
        Mode::Ending => "ending",
        Mode::Credits => "credits",
        Mode::PassPad => "passpad",
        Mode::Podium => "podium",
        Mode::HubDone => "hubdone",
    }
}

impl FitGame {
    pub fn menu_items(&self, m: &Menu) -> Vec<Item> {
        let s = &self.save.settings;
        let mut v = Vec::new();
        match m.kind {
            MenuKind::Title => {
                v.push(item(Act::NewStay, "New Stay"));
                if self.save.guests.iter().any(|g| g.is_some()) {
                    v.push(item(Act::ContinueMenu, "Continue"));
                }
                v.push(item(Act::Together, "Play Together"));
                v.push(item(Act::SettingsOpen, "Settings"));
                v.push(item(Act::AboutOpen, "About"));
            }
            MenuKind::Slot => {
                for i in 0..meta::SLOTS {
                    let mut it = item(Act::Slot(i), format!("Guest Book, Line {}", i + 1));
                    if let Some(g) = &self.save.guests[i] {
                        it.sub = guest_line(g);
                    } else {
                        it.sub = "Empty. Nobody has signed here yet.".into();
                    }
                    v.push(it);
                }
            }
            MenuKind::Continue => {
                for i in 0..meta::SLOTS {
                    if let Some(g) = &self.save.guests[i] {
                        let mut it = item(Act::ContinueSlot(i), g.name.clone());
                        it.sub = guest_line(g);
                        v.push(it);
                    }
                }
            }
            MenuKind::Overwrite(i) => {
                v.push(item(Act::ConfirmOverwrite(i as usize), "Yes. They have left."));
                v.push(item(Act::Back, "No. They are still here."));
            }
            MenuKind::Name => {
                for (i, n) in script::script().names.iter().enumerate() {
                    v.push(item(Act::Name(i), n.clone()));
                }
            }
            MenuKind::Look => {
                let mut sk = item(Act::Skin, "Skin Tone");
                sk.value = format!("{} of {}", self.look_skin + 1, meta::SKINS.len());
                v.push(sk);
                let mut ou = item(Act::Outfit, "Outfit");
                ou.value = meta::OUTFITS[self.look_outfit as usize].0.to_string();
                v.push(ou);
                v.push(item(Act::Begin, "Check In"));
            }
            MenuKind::Pause => {
                v.push(item(Act::Resume, "Resume"));
                if !self.hub {
                    if self.mode == Mode::Island {
                        v.push(item(Act::ScheduleOpen, "Schedule"));
                        v.push(item(Act::CalendarOpen, "Calendar"));
                        if self.guest().is_some_and(|g| g.day >= 2 || g.free_play) {
                            v.push(item(Act::WardrobeOpen, "Wardrobe"));
                        }
                    }
                }
                v.push(item(Act::SettingsOpen, "Settings"));
                if !self.hub {
                    v.push(item(Act::HowToOpen, "How to Play"));
                    v.push(item(Act::AboutOpen, "About"));
                    v.push(item(Act::DevOpen, "Dev Mode"));
                    v.push(item(Act::QuitTitle, "Quit to Title"));
                }
            }
            MenuKind::Hub => v.push(item(Act::Resume, "Resume")),
            MenuKind::Settings => {
                let vals = [s.music, s.sfx, s.voice, 0.0, s.lean_sensitivity / 2.0, s.wobble_assist, s.rhythm_offset / 0.3, s.text_speed / 3.0];
                let tx = [
                    pct(s.music),
                    pct(s.sfx),
                    pct(s.voice),
                    (if s.xbox { "Xbox" } else { "PlayStation" }).to_string(),
                    format!("{:.1}x", s.lean_sensitivity),
                    pct(s.wobble_assist),
                    format!("{:.0} ms", s.rhythm_offset * 1000.0),
                    format!("{:.1}x", s.text_speed),
                ];
                for i in 0..8 {
                    let mut it = item(Act::Setting(i as u8), SETTING_NAMES[i]);
                    it.value.clone_from(&tx[i]);
                    if i != 3 {
                        it.fill = Some(vals[i].clamp(0.0, 1.0));
                    }
                    v.push(it);
                }
                v.push(item(Act::Fullscreen, "Fullscreen"));
                if !self.hub {
                    v.push(item(Act::ResetAsk, "Reset Save"));
                }
                v.push(item(Act::Back, "Back"));
            }
            MenuKind::ResetConfirm => {
                v.push(item(Act::ResetYes, "Erase Everything. Pip Will Remember Anyway."));
                v.push(item(Act::Back, "Keep It"));
            }
            MenuKind::Schedule => {
                if m.tab < 4 {
                    for k in ALL_EVENTS.iter().filter(|k| k.pavilion() == m.tab) {
                        let open = self.event_open(*k);
                        let mut it = item(if open { Act::GoEvent(*k) } else { Act::None }, k.name());
                        if open {
                            let best = self.guest().and_then(|g| g.bests.get(k.key())).copied().unwrap_or_default();
                            it.stars = best.stars as i8;
                            it.sub = if best.score > 0 { format!("Best {}", best.score) } else { "Not yet attempted. It knows.".into() };
                        } else {
                            it.sub = format!("Opens on Day {}", k.day());
                        }
                        v.push(it);
                    }
                } else {
                    if self.stand_open() {
                        v.push(item(Act::GoStand, "The Big Stand"));
                    }
                    if self.goal_met() {
                        let mut it = item(Act::EndDay, "End the Day");
                        it.sub = "Your cabana has been waiting.".into();
                        v.push(it);
                    } else if let Some(goal) = self.day_goal() {
                        let mut it = item(Act::None, "End the Day");
                        it.sub = format!("{} of {goal} minutes banked", self.guest().map(|g| g.minutes).unwrap_or(0));
                        v.push(it);
                    }
                    v.push(item(Act::CalendarOpen, "Calendar"));
                }
            }
            MenuKind::Wardrobe => {
                let (hat, extra, outfit) = self.guest().map(|g| (g.wear.hat, g.wear.extra, g.outfit)).unwrap_or((0, 0, 0));
                let mut a = item(Act::Hat, "Hat");
                a.value = meta::HATS[hat as usize].0.to_string();
                a.sub = self.locked_hint(&meta::HATS);
                v.push(a);
                let mut b = item(Act::Extra, "Extras");
                b.value = meta::EXTRAS[extra as usize].0.to_string();
                b.sub = self.locked_hint(&meta::EXTRAS);
                v.push(b);
                let mut c = item(Act::Outfit, "Outfit");
                c.value = meta::OUTFITS[outfit as usize].0.to_string();
                v.push(c);
                v.push(item(Act::Back, "Back"));
            }
            MenuKind::Calendar | MenuKind::HowTo | MenuKind::About => v.push(item(Act::Back, "Back")),
            MenuKind::Result => {
                if self.run.as_ref().is_some_and(|r| r.ctx != RunCtx::Finale) {
                    v.push(item(Act::Retry, "Retry"));
                }
                v.push(item(Act::Leave, "Back to the Island"));
            }
            MenuKind::Together => {
                let mut n = item(Act::TogetherN, "Guests");
                n.value = format!("{}", self.together_n);
                v.push(n);
                v.push(item(Act::TogetherGo, "Begin the Inter-Resort Medley"));
                v.push(item(Act::Back, "Back"));
            }
            MenuKind::Podium => v.push(item(Act::PodiumDone, "Back to the Title")),
            MenuKind::Dev => self.dev_items(m, &mut v),
        }
        v
    }

    fn locked_hint(&self, list: &[(&str, u32)]) -> String {
        let total = self.guest().map(|g| g.total_minutes).unwrap_or(0);
        match list.iter().filter(|x| x.1 > total).map(|x| x.1).min() {
            Some(m) => format!("More at {m} minutes"),
            None => "All unlocked".into(),
        }
    }

    fn dev_items(&self, m: &Menu, v: &mut Vec<Item>) {
        let on = |b: bool| if b { "On" } else { "Off" }.to_string();
        let tog = |k: u8, name: &str, b: bool| {
            let mut it = item(Act::Toggle(k), name);
            it.value = on(b);
            it
        };
        let d = &self.dev;
        match m.tab {
            0 => {
                for day in 1..=5u8 {
                    v.push(item(Act::JumpDay(day), format!("Day {day}")));
                }
                for k in ALL_EVENTS {
                    v.push(item(Act::JumpEvent(k), k.name()));
                }
                for (i, p) in finale::PHASES.iter().enumerate() {
                    v.push(item(Act::JumpPhase(i as u32), format!("Big Stand: {p}")));
                }
                v.push(item(Act::JumpAttract, "Attract Mode"));
                v.push(item(Act::JumpMedley, "Medley"));
            }
            1 => {
                v.push(tog(0, "No Tips", d.no_tips));
                v.push(tog(1, "Autoplay with the Bot", d.autoplay));
                v.push(tog(2, "Skip Dialogue", d.skip_dialog));
                v.push(item(Act::GiveMinutes, "Give 5 Minutes"));
                v.push(item(Act::UnlockAll, "Unlock All"));
                v.push(item(Act::AllStars, "All Stars"));
                v.push(item(Act::WinNow, "Win This Event Now"));
                v.push(item(Act::LoseNow, "Lose This Event Now"));
            }
            2 => {
                let mut t = item(Act::TimeScale, "Time Scale");
                t.value = format!("{:.2}x", d.time_scale);
                t.fill = Some(((d.time_scale - 0.25) / 3.75).clamp(0.0, 1.0));
                v.push(t);
                v.push(tog(3, "Freeze the World", d.freeze));
                v.push(item(Act::Step, "Single Step"));
            }
            3 => {
                let mut g = item(Act::Group, "Group");
                g.value = rules::GROUPS[d.group].to_string();
                v.push(g);
                let mut copy = self.rules.clone();
                let prefix = format!("{}.", rules::GROUPS[d.group]);
                for p in params::list(&mut copy).into_iter().filter(|p| p.path.starts_with(&prefix)) {
                    if let crate::params::ParamKind::Float { min, max } = p.kind {
                        let val = p.value.as_f64().unwrap_or(0.0) as f32;
                        let short = p.path.rsplit('.').next().unwrap_or("").replace('_', " ");
                        let mut it = item(Act::Param(p.path.clone(), min, max), short);
                        it.sub = String::new();
                        it.value = format!("{val:.2}");
                        it.fill = Some(((val - min) / (max - min)).clamp(0.0, 1.0));
                        v.push(it);
                    }
                }
                v.push(item(Act::ResetGroup, "Reset This Group to Defaults"));
                v.push(item(Act::ResetAll, "Reset All to Defaults"));
            }
            4 => {
                v.push(tog(4, "Input Viewer", d.input_view));
                v.push(tog(5, "Dot Trace", d.trace));
                v.push(tog(6, "Engine Stats", d.stats));
                v.push(tog(7, "Free Camera", d.free_cam));
                v.push(tog(8, "Ghost Lanes", d.ghosts));
            }
            _ => v.push(item(Act::ResetGuest, "Reset This Guest")),
        }
        v.push(item(Act::Back, "Back"));
    }

    pub fn tabs_of(&self, m: &Menu) -> Vec<String> {
        match m.kind {
            MenuKind::Schedule => {
                let mut t: Vec<String> = PAVILIONS.iter().map(|s| s.to_string()).collect();
                t.push("Today".into());
                t
            }
            MenuKind::Dev => ["Jump", "Cheats", "Time", "Tuning", "View", "Save"].iter().map(|s| s.to_string()).collect(),
            MenuKind::HowTo => HOW_TO.iter().map(|p| p.0.to_string()).collect(),
            MenuKind::About => self.about_pages().iter().map(|p| p.0.clone()).collect(),
            _ => Vec::new(),
        }
    }

    pub fn menu_input(&mut self, sim: &mut Sim, input: &InputFrame, ev: &mut Vec<SimEvent>) {
        let Some(mut m) = self.menus.last().copied() else { return };
        let items = self.menu_items(&m);
        let tabs = self.tabs_of(&m);
        let n = items.len();
        let mut activate = None;
        let mut moved = false;
        if !tabs.is_empty() {
            let d = input.just(btn::TAB_R) as i32 - input.just(btn::TAB_L) as i32;
            if d != 0 {
                m.tab = (m.tab as i32 + d).rem_euclid(tabs.len() as i32) as usize;
                m.focus = 0;
                m.scroll = 0;
                ev.push(SimEvent::Sfx { id: sfx::MOVE, gain: 0.6, pitch: 0.9 });
            }
        }
        if n > 0 {
            let d = input.just(btn::MENU_DOWN) as i32 - input.just(btn::MENU_UP) as i32;
            if d != 0 {
                m.focus = (m.focus as i32 + d).rem_euclid(n as i32) as usize;
                moved = true;
            }
            let side = input.just(btn::MENU_RIGHT) as i32 - input.just(btn::MENU_LEFT) as i32;
            if side != 0 {
                if let Some(it) = items.get(m.focus) {
                    self.adjust(sim, &it.act.clone(), side as f32, ev);
                }
            }
            if input.just(btn::CONFIRM) {
                activate = Some(m.focus);
            }
        }
        match input.ui {
            Some(UiEvent::Hover(id)) if (id as usize) < n => {
                if m.focus != id as usize {
                    m.focus = id as usize;
                    moved = true;
                }
            }
            Some(UiEvent::Click(id)) if (id as usize) < n => {
                m.focus = id as usize;
                activate = Some(id as usize);
            }
            Some(UiEvent::Click(id)) if id >= 1000 && ((id - 1000) as usize) < tabs.len() => {
                m.tab = (id - 1000) as usize;
                m.focus = 0;
                m.scroll = 0;
                ev.push(SimEvent::Sfx { id: sfx::MOVE, gain: 0.6, pitch: 0.9 });
            }
            Some(UiEvent::Slider(id, val)) if (id as usize) < n => {
                m.focus = id as usize;
                let act = items[id as usize].act.clone();
                self.set_value(&act, val);
            }
            _ => {}
        }
        if moved {
            ev.push(SimEvent::Sfx { id: sfx::MOVE, gain: 0.6, pitch: 1.0 });
        }
        m.scroll = m.scroll.min(m.focus);
        if m.focus >= m.scroll + 6 {
            m.scroll = m.focus + 1 - 6;
        }
        if let Some(top) = self.menus.last_mut() {
            *top = m;
        }
        let back = input.just(btn::BACK) || input.just(btn::PAUSE);
        if let Some(i) = activate {
            let act = items.get(i).map(|x| x.act.clone()).unwrap_or(Act::None);
            if act != Act::None {
                ev.push(SimEvent::Sfx { id: if act == Act::Back { sfx::BACK } else { sfx::CONFIRM }, gain: 0.7, pitch: 1.0 });
            }
            self.do_act(sim, act, ev);
        } else if back && !matches!(m.kind, MenuKind::Title | MenuKind::Result | MenuKind::Podium) {
            ev.push(SimEvent::Sfx { id: sfx::BACK, gain: 0.7, pitch: 1.0 });
            self.pop_menu(sim, ev);
        }
    }

    pub fn pop_menu(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let kind = self.menus.pop().map(|m| m.kind);
        if kind == Some(MenuKind::Pause) && self.pause_t > 60.0 {
            let mins = (self.pause_t / 60.0) as u32;
            let mut d = Dialog::new(After::Nothing);
            d.push(PIP, format!("You have been paused for {mins} minute{}. Pausing is not an exercise. I checked.", if mins == 1 { "" } else { "s" }));
            self.dialog = Some(d);
        }
        if kind == Some(MenuKind::Wardrobe) {
            self.dress(sim);
        }
        if self.menus.is_empty() && matches!(self.mode, Mode::Title | Mode::Setup) {
            self.go_title(sim, ev);
        }
    }

    fn adjust(&mut self, sim: &mut Sim, act: &Act, dir: f32, ev: &mut Vec<SimEvent>) {
        ev.push(SimEvent::Sfx { id: sfx::MOVE, gain: 0.5, pitch: 1.1 });
        match act {
            Act::Setting(i) => {
                let s = &mut self.save.settings;
                let step = 0.05 * dir;
                match i {
                    0 => s.music = (s.music + step).clamp(0.0, 1.0),
                    1 => s.sfx = (s.sfx + step).clamp(0.0, 1.0),
                    2 => s.voice = (s.voice + step).clamp(0.0, 1.0),
                    3 => s.xbox = !s.xbox,
                    4 => s.lean_sensitivity = (s.lean_sensitivity + 0.1 * dir).clamp(0.3, 2.0),
                    5 => s.wobble_assist = (s.wobble_assist + 0.1 * dir).clamp(0.0, 1.0),
                    6 => s.rhythm_offset = (s.rhythm_offset + 0.01 * dir).clamp(0.0, 0.3),
                    _ => s.text_speed = (s.text_speed + 0.2 * dir).clamp(0.4, 3.0),
                }
                self.store();
            }
            Act::Skin => {
                self.look_skin = (self.look_skin as i32 + dir as i32).rem_euclid(meta::SKINS.len() as i32) as u8;
                self.preview_look(sim);
            }
            Act::Outfit => {
                if self.menus.last().is_some_and(|m| m.kind == MenuKind::Wardrobe) {
                    let g = self.guest_mut();
                    g.outfit = (g.outfit as i32 + dir as i32).rem_euclid(meta::OUTFITS.len() as i32) as u8;
                    self.dress(sim);
                    self.store();
                } else {
                    self.look_outfit = (self.look_outfit as i32 + dir as i32).rem_euclid(meta::OUTFITS.len() as i32) as u8;
                    self.preview_look(sim);
                }
            }
            Act::Hat => {
                self.cycle_wear(true, dir as i32);
                self.dress(sim);
            }
            Act::Extra => {
                self.cycle_wear(false, dir as i32);
                self.dress(sim);
            }
            Act::TogetherN => {
                self.together_n = (self.together_n as i32 + dir as i32 - 2).rem_euclid(3) as u32 + 2;
            }
            Act::TimeScale => self.dev.time_scale = (self.dev.time_scale + 0.25 * dir).clamp(0.25, 4.0),
            Act::Group => self.dev.group = (self.dev.group as i32 + dir as i32).rem_euclid(rules::GROUPS.len() as i32) as usize,
            Act::Param(path, min, max) => {
                let mut copy = self.rules.clone();
                let now = params::get(&mut copy, path).and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
                let f = ((now - min) / (max - min) + 0.025 * dir).clamp(0.0, 1.0);
                self.set_value(act, f);
            }
            _ => {}
        }
    }

    /// A slider dragged to `f` (0..1).
    fn set_value(&mut self, act: &Act, f: f32) {
        let f = f.clamp(0.0, 1.0);
        match act {
            Act::Setting(i) => {
                let s = &mut self.save.settings;
                match i {
                    0 => s.music = f,
                    1 => s.sfx = f,
                    2 => s.voice = f,
                    4 => s.lean_sensitivity = (f * 2.0).max(0.3),
                    5 => s.wobble_assist = f,
                    6 => s.rhythm_offset = f * 0.3,
                    7 => s.text_speed = (f * 3.0).max(0.4),
                    _ => {}
                }
                self.store();
            }
            Act::TimeScale => self.dev.time_scale = 0.25 + f * 3.75,
            Act::Param(path, min, max) => {
                let _ = params::set(&mut self.rules, path, ParamValue::Float((min + (max - min) * f) as f64));
            }
            _ => {}
        }
    }

    fn cycle_wear(&mut self, hat: bool, dir: i32) {
        let g = self.guest_mut();
        let total = g.total_minutes;
        let list: &[(&str, u32)] = if hat { &meta::HATS } else { &meta::EXTRAS };
        let cur = if hat { g.wear.hat } else { g.wear.extra } as i32;
        let n = list.len() as i32;
        let mut next = cur;
        for _ in 0..n {
            next = (next + dir).rem_euclid(n);
            if list[next as usize].1 <= total {
                break;
            }
        }
        if hat {
            g.wear.hat = next as u8;
        } else {
            g.wear.extra = next as u8;
        }
        self.store();
    }

    fn preview_look(&mut self, sim: &mut Sim) {
        self.dress_as(sim, meta::guest_def(self.look_skin, self.look_outfit, &meta::Wear::default()));
    }

    pub fn do_act(&mut self, sim: &mut Sim, act: Act, ev: &mut Vec<SimEvent>) {
        match act {
            Act::None => {}
            Act::Back => self.pop_menu(sim, ev),
            Act::NewStay => {
                self.set_mode(Mode::Setup);
                self.menus.push(Menu::new(MenuKind::Slot));
            }
            Act::ContinueMenu => {
                self.set_mode(Mode::Setup);
                self.menus.push(Menu::new(MenuKind::Continue));
            }
            Act::Together => {
                self.set_mode(Mode::Setup);
                self.menus.push(Menu::new(MenuKind::Together));
            }
            Act::SettingsOpen => self.menus.push(Menu::new(MenuKind::Settings)),
            Act::AboutOpen => self.menus.push(Menu::new(MenuKind::About)),
            Act::Slot(i) => {
                self.slot = i;
                if self.save.guests[i].is_some() {
                    self.menus.push(Menu::new(MenuKind::Overwrite(i as u8)));
                } else {
                    self.menus.push(Menu::new(MenuKind::Name));
                }
            }
            Act::ConfirmOverwrite(i) => {
                self.save.guests[i] = None;
                self.menus.pop();
                self.menus.push(Menu::new(MenuKind::Name));
            }
            Act::ContinueSlot(i) => {
                self.slot = i;
                self.menus.clear();
                self.continue_stay(sim, ev);
            }
            Act::Name(i) => {
                self.name_pick = i;
                let n = script::script().names.len().max(1);
                self.look_skin = (i % 6) as u8;
                self.look_outfit = (i % n % 8) as u8;
                self.preview_look(sim);
                self.menus.push(Menu::new(MenuKind::Look));
            }
            Act::Skin | Act::Outfit | Act::Hat | Act::Extra | Act::TogetherN | Act::Group | Act::TimeScale => self.adjust(sim, &act, 1.0, ev),
            Act::Begin => {
                let name = script::script().names.get(self.name_pick).cloned().unwrap_or_else(|| "Guest".into());
                self.save.guests[self.slot] = Some(Guest::new(&name, self.look_skin, self.look_outfit));
                self.menus.clear();
                self.dress(sim);
                self.intro(sim, ev);
            }
            Act::Resume => self.pop_menu(sim, ev),
            Act::ScheduleOpen => self.menus.push(Menu::new(MenuKind::Schedule)),
            Act::CalendarOpen => self.menus.push(Menu::new(MenuKind::Calendar)),
            Act::WardrobeOpen => self.menus.push(Menu::new(MenuKind::Wardrobe)),
            Act::HowToOpen => self.menus.push(Menu::new(MenuKind::HowTo)),
            Act::DevOpen => self.menus.push(Menu::new(MenuKind::Dev)),
            Act::QuitTitle => {
                self.store();
                self.paused = false;
                self.go_title(sim, ev);
            }
            Act::Setting(i) => {
                if i == 3 {
                    self.adjust(sim, &act, 1.0, ev);
                }
            }
            Act::ResetAsk => self.menus.push(Menu::new(MenuKind::ResetConfirm)),
            Act::ResetYes => {
                self.save = Save::default();
                self.store();
                self.paused = false;
                self.go_title(sim, ev);
            }
            Act::GoEvent(k) => self.start_event(sim, k, RunCtx::Stay, ev),
            Act::GoStand => self.start_finale(sim, 0, ev),
            Act::EndDay => {
                self.menus.clear();
                self.interact(sim, Interact::Cabana, ev);
            }
            Act::Retry => {
                let Some(run) = &self.run else { return };
                let (kind, ctx) = (run.kind, run.ctx);
                if let Some(k) = kind {
                    self.start_event(sim, k, ctx, ev);
                }
            }
            Act::Leave => self.leave_run(sim, ev),
            Act::TogetherGo => {
                let n = self.together_n as usize;
                let racers = (0..n)
                    .map(|i| {
                        let (name, skin, outfit) = match &self.save.guests[i] {
                            Some(g) => (g.name.clone(), g.skin, g.outfit),
                            None => (format!("Guest {}", i + 1), (i * 2) as u8, i as u8),
                        };
                        Racer { name, skin, outfit, ..Default::default() }
                    })
                    .collect();
                self.menus.clear();
                let seed = self.seed.wrapping_add(self.tick as u32);
                self.begin_medley(sim, racers, seed, ev);
            }
            Act::PodiumDone => self.go_title(sim, ev),
            Act::Fullscreen => self.fullscreen += 1,
            Act::JumpDay(d) => {
                self.paused = false;
                self.teardown_run(sim);
                if self.save.guests[self.slot].is_none() {
                    self.guest_mut();
                }
                let g = self.guest_mut();
                g.day = d;
                g.stamps = d - 1;
                g.minutes = 0;
                g.done_today.clear();
                self.menus.clear();
                self.dialog = None;
                self.begin_day(sim, ev);
            }
            Act::JumpEvent(k) => {
                self.paused = false;
                self.guest_mut();
                self.dress(sim);
                self.start_event(sim, k, RunCtx::Stay, ev);
            }
            Act::JumpPhase(p) => {
                self.paused = false;
                self.guest_mut();
                self.dress(sim);
                self.start_finale(sim, p, ev);
            }
            Act::JumpAttract => {
                self.paused = false;
                self.go_title(sim, ev);
                self.attract_start(sim, ev);
            }
            Act::JumpMedley => {
                self.paused = false;
                self.menus.clear();
                self.begin_medley(sim, vec![Racer { name: "You".into(), skin: 1, ..Default::default() }], self.seed, ev);
            }
            Act::Toggle(k) => {
                let d = &mut self.dev;
                match k {
                    0 => d.no_tips = !d.no_tips,
                    1 => d.autoplay = !d.autoplay,
                    2 => d.skip_dialog = !d.skip_dialog,
                    3 => d.freeze = !d.freeze,
                    4 => d.input_view = !d.input_view,
                    5 => {
                        d.trace = !d.trace;
                        if let Some(r) = &mut self.run {
                            r.trace.clear();
                        }
                    }
                    6 => d.stats = !d.stats,
                    7 => {
                        d.free_cam = !d.free_cam;
                        self.cam.look_yaw = 0.0;
                        self.cam.look_tilt = 0.0;
                        self.cam.look_zoom = 0.0;
                    }
                    _ => d.ghosts = !d.ghosts,
                }
            }
            Act::GiveMinutes => {
                let g = self.guest_mut();
                g.minutes += 5;
                g.total_minutes += 5;
                self.store();
            }
            Act::UnlockAll => {
                let g = self.guest_mut();
                g.day = g.day.max(5);
                g.total_minutes = g.total_minutes.max(99);
                self.store();
            }
            Act::AllStars => {
                let g = self.guest_mut();
                for k in ALL_EVENTS {
                    g.bests.insert(k.key().to_string(), meta::Best { score: 900, stars: 3 });
                }
                self.store();
            }
            Act::WinNow | Act::LoseNow => {
                let win = act == Act::WinNow;
                if let Some(run) = self.run.as_mut() {
                    if run.phase != Phase::Result {
                        run.phase = Phase::Play;
                        self.menus.clear();
                        self.paused = false;
                        self.finish_run_forced(sim, if win { 1000 } else { 0 }, ev);
                    }
                }
            }
            Act::Step => self.dev.step = true,
            Act::Param(..) => {}
            Act::ResetGroup => {
                let path = rules::GROUPS[self.dev.group];
                let mut base = self.base_rules.clone();
                for p in params::list(&mut base).into_iter().filter(|p| p.path.starts_with(&format!("{path}."))) {
                    let _ = params::set(&mut self.rules, &p.path, p.value);
                }
            }
            Act::ResetAll => self.rules = self.base_rules.clone(),
            Act::ResetGuest => {
                let (name, skin, outfit) = self.guest().map(|g| (g.name.clone(), g.skin, g.outfit)).unwrap_or_default();
                self.save.guests[self.slot] = Some(Guest::new(&name, skin, outfit));
                self.store();
                self.paused = false;
                self.go_title(sim, ev);
            }
        }
    }

    /// Ends the run now with a chosen score (Dev Mode).
    fn finish_run_forced(&mut self, sim: &mut Sim, score: u32, ev: &mut Vec<SimEvent>) {
        self.forced_score = Some(score);
        self.finish_run(sim, ev);
        self.forced_score = None;
    }

    fn intro(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let at = self.spots.get(HUB, "pip") + Vec3::new(0.0, 0.0, 2.2);
        self.goto_set(sim, HUB, at);
        self.set_mode(Mode::Island);
        self.play_song(ev, 1);
        let mut d = Dialog::new(After::Nothing);
        for line in script::lines("intro") {
            let (who, text) = script_line(line);
            d.push(who, text);
        }
        d.after = After::Nothing;
        self.dialog = Some(d);
        self.pending_begin = true;
    }

    fn continue_stay(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        self.dress(sim);
        let today = self.today;
        let free = self.guest().is_some_and(|g| g.free_play);
        if free {
            let g = self.guest_mut();
            let away = if g.last_day > 0 && today > g.last_day { (today - g.last_day) as u32 } else { 0 };
            g.real_stamps += away.min(1);
            g.last_day = today;
            self.enter_island(sim, ev);
            let n = sim.state.rng.next_u32();
            let mut d = Dialog::new(After::Nothing);
            if away > 0 {
                d.push(PIP, format!("You were away for {away} day{}. I did not count them. There were {away}.", if away == 1 { "" } else { "s" }));
            }
            d.push(PIP, script::line("pip_free", n));
            self.dialog = Some(d);
            self.store();
            return;
        }
        // Mid-stay: back to this morning, or to the island if the check is done.
        if self.guest().is_some_and(|g| g.checked_today) {
            self.enter_island(sim, ev);
            let last = self.guest().map(|g| g.last_day).unwrap_or(0);
            if today > 0 && last > 0 && today > last {
                let away = today - last;
                let mut d = Dialog::new(After::Nothing);
                d.push(PIP, format!("You were away for {away} day{}. I did not count them. There were {away}.", if away == 1 { "" } else { "s" }));
                self.dialog = Some(d);
                self.guest_mut().last_day = today;
            }
        } else {
            self.begin_day(sim, ev);
        }
    }

    pub fn about_pages(&self) -> Vec<(String, Vec<String>)> {
        let v: serde_json::Value = serde_json::from_str(&self.about).unwrap_or(serde_json::Value::Null);
        let mut pages = Vec::new();
        pages.push((TITLE.to_string(), vec![TAGLINE.to_string(), "An original game. Inspired by Wii Fit; no relation to it, and it has not asked.".to_string()]));
        if let Some(info) = v.get("sourceInformation").and_then(|i| i.as_object()) {
            let labels = [("date", "Date"), ("source", "Source"), ("plan", "Plan"), ("genre", "Genre"), ("perspective", "Perspective"), ("tech", "Tech"), ("artDirection", "Art Direction"), ("animation", "Animation"), ("audio", "Audio"), ("online", "Online"), ("testing", "Testing"), ("research", "Research"), ("environment", "Environment"), ("model", "Model"), ("usage", "Usage")];
            let mut lines: Vec<String> = Vec::new();
            for (k, l) in labels {
                if let Some(t) = info.get(k).and_then(|x| x.as_str()) {
                    lines.push(format!("{l}: {t}"));
                }
            }
            paginate("Source Information", &lines, &mut pages);
        }
        for (key, name) in [("testingFeedback", "Testing Feedback"), ("engineFeedback", "Engine Feedback"), ("promptFeedback", "Prompt Feedback")] {
            if let Some(a) = v.get(key).and_then(|x| x.as_array()) {
                let lines: Vec<String> = a.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect();
                paginate(name, &lines, &mut pages);
            }
        }
        paginate(
            "Credits",
            &[
                "Fonts: Fredoka and Nunito (SIL Open Font License).".to_string(),
                "Engine: Pavilion, from Shardfall by Michael Crosato.".to_string(),
                "Motion clips: Quaternius, CMU Graphics Lab, Mesh2Motion and Style100 libraries (CC0 and open licences; see the engine's store/CREDITS.md), and hand-keyed moves made for this game.".to_string(),
                "All music, sound and voices are written in code. There are no audio files.".to_string(),
            ],
            &mut pages,
        );
        pages
    }
}

fn paginate(title: &str, lines: &[String], pages: &mut Vec<(String, Vec<String>)>) {
    let mut cur: Vec<String> = Vec::new();
    let mut len = 0;
    let mut n = 1;
    let flush = |cur: &mut Vec<String>, n: &mut u32, pages: &mut Vec<(String, Vec<String>)>| {
        if !cur.is_empty() {
            pages.push((format!("{title} {n}"), std::mem::take(cur)));
            *n += 1;
        }
    };
    for l in lines {
        // A long answer is split so no page is a wall.
        for part in split_long(l, 460) {
            if len + part.len() > 520 {
                flush(&mut cur, &mut n, pages);
                len = 0;
            }
            len += part.len();
            cur.push(part);
        }
    }
    flush(&mut cur, &mut n, pages);
}

fn split_long(s: &str, max: usize) -> Vec<String> {
    let mut out = Vec::new();
    let mut cur = String::new();
    for w in s.split(' ') {
        if cur.len() + w.len() + 1 > max {
            out.push(std::mem::take(&mut cur));
        }
        if !cur.is_empty() {
            cur.push(' ');
        }
        cur.push_str(w);
    }
    if !cur.is_empty() {
        out.push(cur);
    }
    out
}

fn guest_line(g: &Guest) -> String {
    let age = g.age().map(|a| format!(", Balance Age {a}")).unwrap_or_default();
    if g.free_play { format!("{}, free play{age}", g.name) } else { format!("{}, Day {}{age}", g.name, g.day) }
}

fn pct(x: f32) -> String {
    format!("{}%", (x * 100.0).round() as u32)
}

pub const HOW_TO: [(&str, &[&str]); 5] = [
    ("Leaning", &["Everything here is done by leaning. The dot on the Puck is your balance.", "Left stick, W A S D, or move the mouse from the middle of the screen.", "Small movements. Smaller than that."]),
    ("Buttons", &["Action: begin, inhale, squat, bounce.", "Left and right step: the shoulder buttons, Q and E, or the mouse buttons.", "Brace: both steps at once."]),
    ("The Island", &["Walk with the left stick or W A S D, or click where you want to go.", "Step on a mat to begin an event. The Schedule goes anywhere.", "Wave at people. They will wave back. They have to."]),
    ("Each Day", &["Morning: Pip tests your balance and gives you a number.", "Bank the day's minutes in events, and the Clam keeps them.", "Sleep at your cabana. A big stamp lands. Tomorrow comes."]),
    ("Leaving", &["Checkout requires a Balance Age of 40 or better.", "Day 5 is the Big Stand. The last test is to do nothing.", "Nobody has asked to leave yet."]),
];

impl FitGame {
    /// The UI, written for this tick.
    pub fn ui_frame(&self, sim: &Sim) -> UiFrame {
        let mut b = B::default();
        self.draw_world_layer(&mut b, sim);
        if let Some(d) = &self.dialog {
            d.draw(&mut b);
        }
        if let Some(m) = self.menus.last() {
            self.draw_menu(&mut b, m, sim);
        }
        if self.dev.input_view {
            self.draw_input_view(&mut b);
        }
        let s = &self.save.settings;
        UiFrame {
            items: b.items,
            screen: screen_name(self),
            xbox: s.xbox,
            music: if self.hub_ended { 0.0 } else { s.music },
            sfx: if self.hub_ended { 0.0 } else { s.sfx },
            voice: if self.hub_ended { 0.0 } else { s.voice },
            rhythm_offset: s.rhythm_offset,
            time_scale: self.dev.time_scale,
            stats: self.dev.stats,
            fullscreen: self.fullscreen,
            save: (self.save_serial > 0).then(|| (self.save_serial, self.save_blob.clone())),
            hub: self.hub,
            silent: self.hub_ended,
            dev_overlay: self.dev.input_view,
            rumble: self.rumble,
            shaping: {
                let c = &self.rules.core;
                [c.stick_deadzone, c.stick_curve, c.key_rate, c.key_return, c.mouse_range]
            },
        }
    }

    fn draw_input_view(&self, b: &mut B) {
        b.flat([40.0, 700.0, 460.0, 1040.0], [255, 255, 255, 200], 24.0);
        b.text(60.0, 712.0, 36.0, INK, "Input");
        b.circle([250.0, 880.0], 120.0, PALE, INK, 4.0);
        b.circle([250.0 + self.lean_now.x * 120.0, 880.0 - self.lean_now.y * 120.0], 22.0, CORAL, WHITE, 3.0);
    }

    fn draw_world_layer(&self, b: &mut B, sim: &Sim) {
        if let Some(a) = &self.attract {
            if a.idx == 0 || a.idx == ATTRACT.len() + 1 {
                self.draw_logo(b);
            }
            if let Some(r) = &self.run {
                r.draw_hud(b, &self.rules);
                b.title(960.0, 60.0, 72.0, TEAL, r.name());
            }
            b.flat([0.0, 0.0, 300.0, 76.0], CORAL, 18.0);
            b.text(40.0, 14.0, 44.0, WHITE, "DEMO");
            if self.touch_only {
                self.draw_touch_card(b);
            } else {
                b.flat([660.0, 980.0, 1260.0, 1050.0], [255, 255, 255, 220], 34.0);
                b.center(960.0, 990.0, 42.0, INK, "Press any button");
            }
            return;
        }
        match self.mode {
            Mode::Title | Mode::Setup => {
                if self.menus.last().is_none_or(|m| matches!(m.kind, MenuKind::Title)) {
                    self.draw_logo(b);
                }
            }
            Mode::Island => self.draw_island_hud(b, sim),
            Mode::Check => {
                if let Some(c) = &self.check {
                    if self.menus.is_empty() {
                        c.hud(b, &self.check_core);
                    }
                }
            }
            Mode::Report => self.draw_report(b),
            Mode::Run => self.draw_run(b),
            Mode::Stamp => self.draw_calendar(b, true),
            Mode::Ending => {
                let t = if self.ended_well { "Checked Out" } else { "Extended Stay" };
                b.title(960.0, 120.0, 110.0, WHITE, t);
                let sub = if self.ended_well { "The rowboat is free. The Clam keeps your minutes." } else { "Your room has been kept. It was never let go." };
                b.center(960.0, 260.0, 48.0, WHITE, sub);
            }
            Mode::Credits => self.draw_credits(b),
            Mode::PassPad => {
                let m = self.medley.as_ref();
                let name = m.and_then(|m| m.racers.get(m.who)).map(|r| r.name.clone()).unwrap_or_default();
                b.tint([214, 238, 246, 120]);
                b.card([360.0, 300.0, 1560.0, 780.0], DECK);
                b.title(960.0, 340.0, 96.0, TEAL, "Pass the Controller");
                b.center(960.0, 490.0, 60.0, INK, &format!("{name}, it is your turn."));
                b.center(960.0, 570.0, 40.0, MUTED, "The others will watch. They have nothing else to do.");
                b.prompt_center(960.0, 680.0, &[Glyph::Confirm], "Ready");
            }
            Mode::Podium => self.draw_podium(b),
            Mode::HubDone => {
                b.tint([214, 238, 246, 120]);
                b.card([460.0, 360.0, 1460.0, 720.0], DECK);
                b.title(960.0, 400.0, 96.0, TEAL, "Finished");
                b.center(960.0, 530.0, 56.0, INK, &format!("{} points of balance", self.medley_total()));
                b.center(960.0, 610.0, 40.0, MUTED, "Please stand by. Standing is what we do.");
            }
        }
    }

    fn draw_touch_card(&self, b: &mut B) {
        b.tint([214, 238, 246, 60]);
        b.card([460.0, 330.0, 1460.0, 750.0], DECK);
        b.title(960.0, 370.0, 64.0, TEAL, "Controller or keyboard required");
        b.center(960.0, 480.0, 40.0, INK, "Please connect one, and stand by.");
        b.items.push(Ui::Button { id: 900, rect: [710.0, 580.0, 1210.0, 700.0], label: "Settings".into(), sub: String::new(), focused: true, stars: -1, value: String::new(), fill: None, big: true });
    }

    fn draw_logo(&self, b: &mut B) {
        b.title(960.0, 90.0, 170.0, WHITE, TITLE);
        b.title(956.0, 86.0, 170.0, TEAL, TITLE);
        b.flat([520.0, 272.0, 1400.0, 352.0], [255, 255, 255, 190], 40.0);
        b.center(960.0, 280.0, 50.0, INK, TAGLINE);
        if self.touch_only && self.attract.is_none() {
            self.draw_touch_card(b);
        }
    }

    fn draw_island_hud(&self, b: &mut B, sim: &Sim) {
        let Some(g) = self.guest() else { return };
        let (w, h) = (640.0, 140.0);
        b.flat([30.0, 30.0, 30.0 + w, 30.0 + h], [255, 255, 255, 225], 34.0);
        if g.free_play {
            b.title_left(60.0, 44.0, 64.0, TEAL, "Free Play");
            b.text(350.0, 62.0, 40.0, INK, &format!("{} stars", g.total_stars()));
        } else {
            b.title_left(60.0, 44.0, 64.0, TEAL, &format!("Day {}", g.day));
            if let Some(goal) = self.day_goal() {
                b.text(240.0, 48.0, 40.0, INK, &format!("{} of {goal} minutes", g.minutes));
                b.bar([240.0, 110.0, 640.0, 140.0], (g.minutes as f32 / goal.max(1) as f32).min(1.0), MINT, None);
            } else {
                b.text(240.0, 62.0, 40.0, INK, "The Big Stand");
            }
        }
        if let Some(a) = g.age() {
            b.flat([1550.0, 30.0, 1890.0, 170.0], [255, 255, 255, 225], 34.0);
            b.right(1860.0, 40.0, 36.0, MUTED, "Balance Age");
            b.items.push(Ui::Text { pos: [1860.0, 76.0], size: 78.0, color: INK, align: 2, title: true, text: a.to_string(), wrap: 0.0 });
        }
        if let Some((at, label)) = &self.pointing {
            b.items.push(Ui::WorldRing { at: at.to_array(), r: 0.9 });
            if self.near.as_ref().is_none_or(|n| n.2 != *label) {
                b.items.push(Ui::WorldPrompt { at: (*at + Vec3::Y * 2.0).to_array(), glyph: Glyph::Confirm, label: label.clone() });
            }
        }
        if let Some((_, at, label)) = &self.near {
            b.items.push(Ui::WorldPrompt { at: (*at + Vec3::Y * 2.0).to_array(), glyph: Glyph::Confirm, label: label.clone() });
        }
        if let Some((m, _)) = &self.msg {
            let two = m.len() > 56;
            b.flat([360.0, 200.0, 1560.0, if two { 320.0 } else { 280.0 }], [255, 255, 255, 225], 34.0);
            b.wrap_center(960.0, 214.0, 1140.0, 40.0, INK, m);
        }
        if self.dialog.is_none() && self.menus.is_empty() {
            b.prompt(50.0, 1000.0, &[Glyph::Move], "Walk");
            b.prompt(420.0, 1000.0, &[Glyph::Jog], "Jog");
            b.prompt(720.0, 1000.0, &[Glyph::Wave], "Wave");
            b.prompt(1000.0, 1000.0, &[Glyph::Schedule], "Schedule");
            b.prompt(1370.0, 1000.0, &[Glyph::Camera], "Camera");
            b.prompt(1640.0, 1000.0, &[Glyph::Pause], "Pause");
        }
        let _ = sim;
    }

    fn draw_report(&self, b: &mut B) {
        b.tint([214, 238, 246, 140]);
        b.card([460.0, 110.0, 1460.0, 720.0], DECK);
        b.center(960.0, 140.0, 54.0, INK, "Your Balance Age");
        let t = self.report.t;
        let shown = if t < 3.0 { 18 + ((t * 31.0) as i32 * 7) % 80 } else { self.report.age };
        b.items.push(Ui::Text { pos: [960.0, 210.0], size: 260.0, color: if t < 3.0 { MUTED } else { TEAL }, align: 1, title: true, text: shown.to_string(), wrap: 0.0 });
        if t >= 3.0 {
            let ages = self.guest().map(|g| g.ages.clone()).unwrap_or_default();
            for k in 0..5 {
                let x = 720.0 + k as f32 * 120.0;
                let got = ages.get(k).copied();
                let y = got.map(|a| 620.0 - (80 - a.clamp(20, 80)) as f32 * 1.3).unwrap_or(620.0);
                b.circle([x, y], 26.0, if got.is_some() { CORAL } else { PALE }, WHITE, 5.0);
            }
        }
    }

    fn draw_run(&self, b: &mut B) {
        let Some(r) = &self.run else { return };
        match r.phase {
            Phase::Card => {
                let coach = r.kind.map(|k| k.coach()).unwrap_or(PIP);
                let pick = (self.tick / 600) as u32;
                let line = script::line(r.kind.map(|k| ["coach_0", "coach_1", "coach_2", "coach_3"][k.pavilion()]).unwrap_or("finale_card"), pick);
                let how = run::how_to(r.kind);
                let who = script::SPEAKERS[coach as usize];
                r.draw_card(b, r.name(), run::goal(r.kind), &line, who, &how);
            }
            Phase::Count => {
                if !self.hub || self.hub_go {
                    let n = (3.0 - r.t).ceil().max(1.0) as u32;
                    b.circle([960.0, 480.0], 150.0, [255, 255, 255, 230], TEAL, 12.0);
                    b.title(960.0, 370.0, 170.0, TEAL, &n.to_string());
                } else {
                    b.center(960.0, 480.0, 60.0, INK, "Waiting for the others");
                }
                b.title(960.0, 200.0, 80.0, INK, r.name());
            }
            Phase::Play => {
                r.draw_hud(b, &self.rules);
                for g in &r.ghosts {
                    if let Some(s) = ghost::at(&g.samples, r.t) {
                        let lane = run::ghost_lane(r.kind, g.seat as usize);
                        b.items.push(Ui::WorldLabel { at: (Vec3::from(s.p) + lane + Vec3::Y * 2.2).to_array(), text: g.name.clone() });
                    }
                }
                if let Some((m, _)) = &r.msg {
                    if r.kind != Some(EvKind::Step) {
                        // Long lines take two rows inside their plate.
                        let two = m.len() > 56;
                        b.flat([360.0, if two { 780.0 } else { 820.0 }, 1560.0, 900.0], [255, 255, 255, 225], 36.0);
                        b.wrap_center(960.0, if two { 792.0 } else { 836.0 }, 1140.0, 40.0, INK, m);
                    } else {
                        b.center(960.0, 300.0, 40.0, INK, m);
                    }
                }
                if self.hub || r.ctx == RunCtx::Medley {
                    b.right(1860.0, 30.0, 40.0, INK, &format!("Total {}", self.medley_total()));
                }
                if self.dev.freeze {
                    b.center(960.0, 60.0, 44.0, CORAL, "Frozen: Dev Mode, Time");
                }
            }
            Phase::Result => {}
        }
    }

    fn draw_calendar(&self, b: &mut B, stamping: bool) {
        let Some(g) = self.guest() else { return };
        b.tint([214, 238, 246, 170]);
        b.card([200.0, 150.0, 1720.0, 800.0], DECK);
        b.title(960.0, 180.0, 96.0, TEAL, "Your Stay");
        for k in 0..5u8 {
            let x = 340.0 + k as f32 * 310.0;
            b.flat([x - 120.0, 320.0, x + 120.0, 640.0], WHITE, 24.0);
            b.flat([x - 120.0, 320.0, x + 120.0, 380.0], CORAL, 24.0);
            b.center(x, 328.0, 40.0, WHITE, &format!("Day {}", k + 1));
            if let Some(a) = g.ages.get(k as usize) {
                b.center(x, 580.0, 36.0, MUTED, &format!("Age {a}"));
            }
            if k < g.stamps {
                let fresh = stamping && k + 1 == g.stamps;
                let r = if fresh { 90.0 + 300.0 * (1.0 - (self.mode_t * 5.0).min(1.0)) } else { 90.0 };
                b.circle([x, 480.0], r, [0, 0, 0, 0], TEAL, 14.0);
                b.items.push(Ui::Text { pos: [x, 415.0], size: 64.0, color: TEAL, align: 1, title: true, text: "OK".into(), wrap: 0.0 });
            }
        }
        if g.real_stamps > 0 {
            b.center(960.0, 680.0, 40.0, INK, &format!("Real days stamped since: {}", g.real_stamps));
        }
    }

    fn draw_credits(&self, b: &mut B) {
        b.tint([20, 34, 48, 170]);
        let lines = [
            (true, TITLE),
            (false, TAGLINE),
            (false, ""),
            (false, "Pip, front desk and records"),
            (false, "Posey, stillness"),
            (false, "Big Kettle, strength"),
            (false, "Bounce, cardio"),
            (false, "Commodore Gull, lagoon and snacks"),
            (false, "Marjorie, Day 5, eleven years"),
            (false, "Two-Towel Tom, flip-flops"),
            (false, "The Twins, the twins"),
            (false, ""),
            (false, "Free Play is now open. It always was."),
        ];
        let scroll = self.mode_t * 70.0;
        for (i, (title, text)) in lines.iter().enumerate() {
            let y = 1000.0 + i as f32 * 90.0 + if i > 0 { 60.0 } else { 0.0 } - scroll;
            if !(-120.0..=1100.0).contains(&y) || text.is_empty() {
                continue;
            }
            if *title {
                b.title(960.0, y, 110.0, WHITE, text);
            } else {
                b.center(960.0, y, 50.0, WHITE, text);
            }
        }
    }

    fn draw_podium(&self, b: &mut B) {
        let Some(m) = &self.medley else { return };
        let mut rows: Vec<(String, u32, usize)> = m.racers.iter().enumerate().map(|(i, r)| (r.name.clone(), r.scores.iter().sum(), i)).collect();
        rows.sort_by(|a, b| b.1.cmp(&a.1));
        b.tint([214, 238, 246, 120]);
        b.card([360.0, 60.0, 1560.0, 760.0], DECK);
        b.title(960.0, 90.0, 96.0, TEAL, "The Podium");
        for (i, (name, score, _)) in rows.iter().enumerate() {
            let y = 240.0 + i as f32 * 110.0;
            b.text(460.0, y, 60.0, if i == 0 { CORAL } else { INK }, &format!("{}. {name}", i + 1));
            b.right(1460.0, y, 60.0, INK, &score.to_string());
        }
    }

    fn draw_menu(&self, b: &mut B, m: &Menu, sim: &Sim) {
        let items = self.menu_items(m);
        let mut top = 300.0;
        let title = match m.kind {
            MenuKind::Title => {
                top = 380.0;
                ""
            }
            MenuKind::Slot => "Sign the Guest Book",
            MenuKind::Continue => "Who Is Still Here?",
            MenuKind::Overwrite(_) => "Someone Is Staying There",
            MenuKind::Name => "What Do We Call You?",
            MenuKind::Look => "How Do You Look?",
            MenuKind::Pause => "Paused",
            MenuKind::Hub => "Paused",
            MenuKind::Settings => "Settings",
            MenuKind::ResetConfirm => "Reset Everything?",
            MenuKind::Schedule => "Schedule",
            MenuKind::Calendar => "",
            MenuKind::Wardrobe => "Wardrobe",
            MenuKind::HowTo => "How to Play",
            MenuKind::About => "About",
            MenuKind::Dev => "Dev Mode",
            MenuKind::Result => "",
            MenuKind::Together => "Play Together",
            MenuKind::Podium => "",
        };
        // A wash over the world, except where the figure shows.
        match m.kind {
            MenuKind::Title | MenuKind::Look | MenuKind::Wardrobe | MenuKind::Result | MenuKind::Podium | MenuKind::Calendar => {}
            _ => b.tint([214, 238, 246, 150]),
        }
        let (mut x0, mut x1) = (460.0, 1460.0);
        if matches!(m.kind, MenuKind::Look | MenuKind::Wardrobe) {
            x0 = 1000.0;
            x1 = 1860.0;
        }
        match m.kind {
            MenuKind::Calendar => {
                self.draw_calendar(b, false);
                top = 840.0;
                x0 = 760.0;
                x1 = 1160.0;
            }
            MenuKind::Result => {
                self.draw_result(b);
                top = 760.0;
                x0 = 560.0;
                x1 = 1360.0;
            }
            MenuKind::Podium => {
                self.draw_podium(b);
                top = 800.0;
            }
            MenuKind::HowTo | MenuKind::About => {
                b.card([120.0, 30.0, 1800.0, 1050.0], DECK);
                let pages: Vec<(String, Vec<String>)> = if m.kind == MenuKind::HowTo {
                    HOW_TO.iter().map(|p| (p.0.to_string(), p.1.iter().map(|s| s.to_string()).collect())).collect()
                } else {
                    self.about_pages()
                };
                let page = pages.get(m.tab);
                if let Some((t, lines)) = page {
                    b.title(960.0, 60.0, 80.0, TEAL, t);
                    let mut y = 200.0;
                    let size = if m.kind == MenuKind::HowTo { 50.0 } else { 38.0 };
                    for l in lines {
                        b.wrap(190.0, y, 1540.0, size, INK, l);
                        y += size * 1.45 * (l.len() as f32 * size * 0.5 / 1540.0).ceil().max(1.0) + 14.0;
                    }
                }
                b.prompt(190.0, 985.0, &[Glyph::Tabs], &format!("Page {} of {}", m.tab + 1, pages.len().max(1)));
                top = 960.0;
                x0 = 1320.0;
                x1 = 1730.0;
            }
            _ => {}
        }
        let tabbed = !self.tabs_of(m).is_empty();
        if !title.is_empty() && !matches!(m.kind, MenuKind::HowTo | MenuKind::About) {
            b.title((x0 + x1) * 0.5, top - if tabbed { 240.0 } else { 200.0 }, 88.0, TEAL, title);
        }
        // Tabs.
        let tabs = self.tabs_of(m);
        if m.kind == MenuKind::Schedule {
            // A carousel of pavilions: this one large in the middle, its neighbours either side.
            let n = tabs.len();
            for (off, x0c, x1c) in [(n - 1, 110.0, 560.0), (1, 1360.0, 1810.0), (0, 590.0, 1330.0)] {
                let i = (m.tab + off) % n;
                let centre = off == 0;
                let (y0, y1) = if centre { (top - 130.0, top - 10.0) } else { (top - 110.0, top - 30.0) };
                b.items.push(Ui::Button { id: 1000 + i as u16, rect: [x0c, y0, x1c, y1], label: tabs[i].clone(), sub: String::new(), focused: centre, stars: -1, value: String::new(), fill: None, big: centre });
            }
            top += 10.0;
        } else if !tabs.is_empty() && !matches!(m.kind, MenuKind::HowTo | MenuKind::About) {
            let w = 1760.0 / tabs.len() as f32;
            for (i, t) in tabs.iter().enumerate() {
                let x = 80.0 + i as f32 * w;
                b.items.push(Ui::Button { id: 1000 + i as u16, rect: [x + 6.0, top - 110.0, x + w - 6.0, top - 30.0], label: t.clone(), sub: String::new(), focused: i == m.tab, stars: -1, value: String::new(), fill: None, big: false });
            }
            top += 10.0;
        }
        // Rows: six in view.
        let row = if matches!(m.kind, MenuKind::Schedule) { 120.0 } else { 104.0 };
        for (i, it) in items.iter().enumerate().skip(m.scroll).take(6) {
            let y = top + (i - m.scroll) as f32 * row;
            b.items.push(Ui::Button { id: i as u16, rect: [x0, y, x1, y + row - 14.0], label: it.label.clone(), sub: it.sub.clone(), focused: i == m.focus, stars: it.stars, value: it.value.clone(), fill: it.fill, big: false });
        }
        if items.len() > 6 {
            let frac = (m.scroll as f32 / (items.len() - 6) as f32).clamp(0.0, 1.0);
            b.bar([x1 + 20.0, top, x1 + 40.0, top + row * 6.0 - 14.0], frac, TEAL, Some(frac));
        }
        // The focused dev slider's help.
        if let Some(Item { act: Act::Param(path, _, _), .. }) = items.get(m.focus) {
            let mut copy = self.rules.clone();
            if let Some(info) = params::list(&mut copy).into_iter().find(|p| p.path == *path) {
                b.flat([360.0, 910.0, 1560.0, 990.0], [255, 255, 255, 225], 30.0);
                b.center(960.0, 924.0, 38.0, INK, &info.help);
            }
        }
        // What the keys do here.
        if !matches!(m.kind, MenuKind::Title | MenuKind::HowTo | MenuKind::About) {
            b.prompt(50.0, 1010.0, &[Glyph::Confirm], "Choose");
            b.prompt(350.0, 1010.0, &[Glyph::Back], "Back");
            if !tabs.is_empty() {
                b.prompt(610.0, 1010.0, &[Glyph::Tabs], "Tabs");
            }
        }
        let _ = sim;
    }

    fn draw_result(&self, b: &mut B) {
        let Some(r) = self.run.as_ref().and_then(|r| r.result.as_ref()) else { return };
        let name = self.run.as_ref().map(|r| r.name()).unwrap_or("");
        b.card([360.0, 40.0, 1560.0, 740.0], DECK);
        b.center(960.0, 60.0, 44.0, MUTED, name);
        b.items.push(Ui::Text { pos: [960.0, 100.0], size: 150.0, color: TEAL, align: 1, title: true, text: r.score.to_string(), wrap: 0.0 });
        b.stars(960.0, 310.0, 62.0, r.stars, 3);
        b.title(960.0, 370.0, 64.0, CORAL, &r.title);
        let mut bits = vec![if r.minutes > 0 { format!("{} minutes banked", r.minutes) } else { String::new() }];
        bits.push(if r.new_best { "A new best".to_string() } else { format!("Best {}", r.best) });
        if let Some(y) = r.yesterday {
            bits.push(if y >= 0 { format!("{y} ahead of Yesterday You") } else { format!("{} behind Yesterday You", -y) });
        }
        let line: Vec<String> = bits.into_iter().filter(|s| !s.is_empty()).collect();
        b.center(960.0, 470.0, 40.0, INK, &line.join(". "));
        b.wrap_center(960.0, 560.0, 1080.0, 42.0, INK, &format!("Pip: \"{}\"", r.comment));
    }
}
