//! 10-foot shell. Every screen has at most seven focusable rows. Hover moves focus. Click confirms.

use serde::{Deserialize, Serialize};

use super::world::{Screen, World};
use crate::input::buttons;
use crate::input::InputFrame;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Device {
    Gamepad,
    Keyboard,
}

#[derive(Clone, Copy, Debug)]
pub struct MenuInput {
    pub up: bool,
    pub down: bool,
    pub left: bool,
    pub right: bool,
    pub confirm: bool,
    pub back: bool,
    pub pointer: Option<(f32, f32)>,
    pub click: bool,
    pub device: Option<Device>,
}

impl Default for MenuInput {
    fn default() -> Self {
        Self { up: false, down: false, left: false, right: false, confirm: false, back: false, pointer: None, click: false, device: None }
    }
}

pub fn glyph(action: &str, device: Device, xbox: bool) -> &'static str {
    match (device, xbox, action) {
        (Device::Keyboard, _, "confirm") => "Enter",
        (Device::Keyboard, _, "back") => "Esc",
        (Device::Keyboard, _, "fire") => "LMB",
        (Device::Keyboard, _, "aim") => "RMB",
        (Device::Keyboard, _, "reload") => "R",
        (Device::Keyboard, _, "map") => "M",
        (Device::Keyboard, _, "jump") => "Space",
        (Device::Gamepad, false, "confirm") => "Cross",
        (Device::Gamepad, true, "confirm") => "A",
        (Device::Gamepad, false, "back") => "Circle",
        (Device::Gamepad, true, "back") => "B",
        (Device::Gamepad, false, "reload") => "Square",
        (Device::Gamepad, true, "reload") => "X",
        (Device::Gamepad, false, "fire") => "R2",
        (Device::Gamepad, true, "fire") => "RT",
        (Device::Gamepad, false, "aim") => "L2",
        (Device::Gamepad, true, "aim") => "LT",
        (Device::Gamepad, _, "map") => "D-pad",
        (Device::Gamepad, false, "jump") => "Cross",
        (Device::Gamepad, true, "jump") => "A",
        _ => "Button",
    }
}

fn menu_of(input: &InputFrame) -> MenuInput {
    MenuInput {
        up: input.act == 3,
        down: input.act == 4,
        left: input.act == 5,
        right: input.act == 6,
        confirm: input.act == 1 || input.just(buttons::CONFIRM) || input.just(buttons::JUMP),
        back: input.act == 2,
        pointer: None,
        click: false,
        device: None,
    }
}

impl World {
    pub fn shell_tick(&mut self, input: &InputFrame, dt: f32) {
        let typed = input.pressed != 0
            || input.act != 0
            || input.look.length_squared() > 1e-8
            || input.move_dir.length_squared() > 1e-8;
        if typed && self.device_lock == 0 {
            // A pointer-only hover does not arrive through InputFrame. Keyboard buttons do.
            if input.pressed & (buttons::CONFIRM | buttons::JUMP | buttons::MAP | buttons::RELOAD) != 0 || input.act != 0 {
                self.device = Device::Keyboard;
            }
        }
        if self.screen == Screen::Attract {
            if typed {
                self.screen = Screen::Title;
                self.focus = 0;
                self.idle = 0.0;
                self.attract_t = 0.0;
                return;
            }
            self.attract_t += dt;
            let seg = ((self.attract_t / 16.0) as u32) % 10;
            self.attract_seen |= 1u16 << seg;
            self.attract_loops = (self.attract_t / 160.0) as u32;
            return;
        }
        let shell = self.screen != Screen::Playing;
        if shell {
            if typed {
                self.idle = 0.0;
            } else if !self.hub && self.screen != Screen::Ledger {
                self.idle += dt;
            }
            if self.idle >= 10.0 && !self.hub {
                self.screen = Screen::Attract;
                return;
            }
            let mut m = menu_of(input);
            m.pointer = self.pointer.take();
            m.click = std::mem::take(&mut self.pointer_click);
            self.apply_menu(m);
            let _ = &mut m;
        }
    }

    pub fn apply_menu(&mut self, m: MenuInput) {
        if let Some(d) = m.device {
            self.device = d;
        }
        if self.screen == Screen::Playing || self.screen == Screen::Attract {
            if m.confirm || m.back || m.up || m.down || m.click || m.pointer.is_some() {
                if self.screen == Screen::Attract {
                    self.screen = Screen::Title;
                    self.focus = 0;
                    self.idle = 0.0;
                    self.attract_t = 0.0;
                }
            }
            if self.screen != Screen::Title {
                return;
            }
        }
        let n = self.rows().len();
        if n == 0 {
            return;
        }
        if let Some((px, py)) = m.pointer {
            for i in 0..n {
                let y0 = 220.0 + i as f32 * 80.0;
                if px >= 160.0 && px <= 900.0 && py >= y0 && py <= y0 + 64.0 {
                    self.focus = i;
                }
            }
        }
        if m.up {
            self.focus = if self.focus == 0 { n - 1 } else { self.focus - 1 };
        }
        if m.down {
            self.focus = (self.focus + 1) % n;
        }
        self.focus = self.focus.min(n - 1);
        let activate = m.confirm || m.click;
        if m.left || m.right {
            self.nudge_slider(if m.right { 1.0 } else { -1.0 });
        }
        if m.back {
            self.go_back();
        }
        if activate {
            let rows = self.rows();
            let label = rows.get(self.focus).cloned().unwrap_or_default();
            self.activate(&label);
        }
    }

    fn go_back(&mut self) {
        self.focus = 0;
        match self.screen {
            Screen::Difficulty | Screen::Settings | Screen::About | Screen::Mp => self.screen = Screen::Title,
            Screen::Merc => self.screen = Screen::Difficulty,
            Screen::Prologue => self.screen = Screen::Merc,
            Screen::Dev if self.tab != 0 => self.tab = 0,
            Screen::Dev => self.screen = Screen::Pause,
            Screen::Pause => self.screen = Screen::Playing,
            Screen::Ledger => {}
            _ => {}
        }
    }

    fn nudge_slider(&mut self, dir: f32) {
        if self.screen != Screen::Dev || self.tab != 5 {
            if self.screen == Screen::Settings && self.tab == 0 && self.focus == 1 {
                self.music = (self.music + dir * 0.05).clamp(0.0, 1.0);
            }
            return;
        }
        let count = self.tune.count();
        let page_size = 6;
        let index = self.page * page_size + self.focus;
        if self.focus == 6 || index >= count {
            if dir < 0.0 && self.page > 0 {
                self.page -= 1;
                self.focus = 0;
            }
            return;
        }
        let (lo, hi, step) = self.tune.range(index);
        let v = (self.tune.get(index) + dir * step).clamp(lo, hi);
        self.tune.set(index, v);
    }

    fn activate(&mut self, label: &str) {
        match self.screen {
            Screen::Title => match label {
                "Continue" => self.continue_save(),
                "New contract" => {
                    self.screen = Screen::Difficulty;
                    self.focus = 1;
                }
                "Multiplayer" => {
                    self.screen = Screen::Mp;
                    self.focus = 0;
                }
                "Settings" => {
                    self.screen = Screen::Settings;
                    self.tab = 0;
                    self.focus = 0;
                }
                "About" => {
                    self.screen = Screen::About;
                    self.page = 0;
                    self.focus = 0;
                }
                _ => {}
            },
            Screen::Difficulty => {
                self.difficulty = match label {
                    "Easy" => 0,
                    "Hard" => 2,
                    _ => 1,
                };
                self.screen = Screen::Merc;
                self.focus = 0;
            }
            Screen::Merc => {
                self.merc = match label {
                    "Tomek Wrona" => 1,
                    "Rafael Quintero" => 2,
                    "Mirela Dragan" => 3,
                    _ => 0,
                };
                self.screen = Screen::Prologue;
                self.focus = 0;
            }
            Screen::Prologue => {
                if label == "Begin" {
                    self.start_playing();
                }
            }
            Screen::Pause => match label {
                "Resume" => self.screen = Screen::Playing,
                "Settings" => {
                    self.screen = Screen::Settings;
                    self.focus = 0;
                }
                "Controls" => {
                    self.screen = Screen::Settings;
                    self.tab = 1;
                    self.focus = 0;
                }
                "Dev mode" if !self.hub => {
                    self.screen = Screen::Dev;
                    self.tab = 0;
                    self.page = 0;
                    self.focus = 0;
                }
                "Quit to title" => {
                    self.screen = Screen::Title;
                    self.focus = 0;
                }
                _ => {}
            },
            Screen::Settings => {
                if label == "Xbox glyphs" {
                    self.xbox = true;
                } else if label == "PlayStation glyphs" {
                    self.xbox = false;
                } else if label.starts_with("Page") {
                    self.tab = (self.tab + 1) % 4;
                    self.focus = 0;
                }
            }
            Screen::Dev => {
                if self.tab == 0 {
                    self.tab = match label {
                        "Cheats" => 1,
                        "Teleport" => 2,
                        "Spawn" => 3,
                        "World" => 4,
                        "Balance" => 5,
                        _ => 0,
                    };
                    self.page = 0;
                    self.focus = 0;
                    return;
                }
                if label == "Reset to defaults" {
                    self.tune = self.tune0.clone();
                    return;
                }
                if label == "Next page" {
                    self.page += 1;
                    self.focus = 0;
                    return;
                }
                if self.tab == 1 {
                    self.toggle_cheat(label);
                } else if self.tab == 2 {
                    self.dev_teleport(label);
                } else if self.tab == 3 {
                    self.dev_spawn(label);
                } else if self.tab == 4 {
                    self.dev_world(label);
                }
            }
            Screen::Ledger => {
                let n = match label {
                    "Read the names" => 1,
                    "Take the chair" => 2,
                    _ => 0,
                };
                self.choose_finale(n);
            }
            Screen::About => {
                if label == "Next" {
                    self.page += 1;
                } else if label == "Back" && self.page > 0 {
                    self.page -= 1;
                } else if label == "Back" {
                    self.screen = Screen::Title;
                    self.focus = 0;
                }
            }
            Screen::Mp => {
                if label == "Back" {
                    self.screen = Screen::Title;
                }
            }
            _ => {}
        }
    }

    fn toggle_cheat(&mut self, label: &str) {
        let d = &mut self.dev;
        match label {
            "God mode" => d.god = !d.god,
            "Infinite ammo" => d.infinite = !d.infinite,
            "No jams" => d.no_jams = !d.no_jams,
            "No fever" => d.no_fever = !d.no_fever,
            "Noclip" => d.noclip = !d.noclip,
            "Invisible" => d.invisible = !d.invisible,
            "Show AI" => d.show_ai = !d.show_ai,
            "Show fire" => d.show_fire = !d.show_fire,
            "Show nav" => d.show_nav = !d.show_nav,
            "Show stats" => d.show_stats = !d.show_stats,
            _ => {}
        }
    }

    pub fn rows(&self) -> Vec<String> {
        let all: Vec<String> = match self.screen {
            Screen::Title => {
                let mut r = Vec::new();
                if self.has_save {
                    r.push("Continue".into());
                }
                r.extend(["New contract".into(), "Multiplayer".into(), "Settings".into(), "About".into()]);
                r
            }
            Screen::Difficulty => vec!["Easy".into(), "Normal".into(), "Hard".into()],
            Screen::Merc => vec!["Ada Okoro".into(), "Tomek Wrona".into(), "Rafael Quintero".into(), "Mirela Dragan".into()],
            Screen::Prologue => vec!["Begin".into()],
            Screen::Ledger => vec!["Burn the ledger".into(), "Read the names".into(), "Take the chair".into()],
            Screen::Pause => {
                let mut rows = vec!["Resume".into(), "Settings".into(), "Controls".into()];
                if !self.hub {
                    rows.push("Dev mode".into());
                }
                rows.push("Quit to title".into());
                rows
            }
            Screen::Settings => self.settings_rows(),
            Screen::About => vec!["Next".into(), "Back".into()],
            Screen::Dev => self.dev_rows(),
            Screen::Mp => vec!["This computer".into(), "Invite code".into(), "Back".into()],
            Screen::Attract => vec!["Press any button".into()],
            Screen::Playing => vec![],
        };
        all.into_iter().take(7).collect()
    }

    fn settings_rows(&self) -> Vec<String> {
        match self.tab % 4 {
            0 => vec!["Master".into(), "Music".into(), "Effects".into(), "Voices".into(), "Page".into()],
            1 => vec!["PlayStation glyphs".into(), "Xbox glyphs".into(), "Invert look".into(), "Sensitivity".into(), "Aim assist".into(), "Page".into()],
            2 => vec!["Fullscreen".into(), "Field of view".into(), "Brightness".into(), "Head bob".into(), "Page".into()],
            _ => vec!["Subtitle size".into(), "Reduce motion".into(), "Assist markers".into(), "Immersive hud".into(), "Page".into()],
        }
    }

    fn dev_rows(&self) -> Vec<String> {
        match self.tab {
            0 => vec!["Cheats".into(), "Teleport".into(), "Spawn".into(), "World".into(), "Balance".into()],
            1 => {
                let names = ["God mode", "Infinite ammo", "No jams", "No fever", "Noclip", "Invisible", "Show AI", "Show fire", "Show nav", "Show stats"];
                self.page_of(&names)
            }
            2 => {
                let names: Vec<&str> = super::geom::PLACES.iter().map(|p| p.name).collect();
                self.page_of_owned(names)
            }
            3 => vec!["Soldier".into(), "Animal".into(), "Truck".into(), "Technical".into(), "Boat".into(), "Barrel".into()],
            4 => vec![
                "Night".into(),
                "Noon".into(),
                "Rain".into(),
                "Clear sky".into(),
                "Strong wind".into(),
                "Calm".into(),
                "Ignite grass".into(),
            ],
            5 => {
                let mut rows = Vec::new();
                let start = self.page * 6;
                for i in start..(start + 6).min(self.tune.count()) {
                    rows.push(format!("{} {:.2}", self.tune.name(i), self.tune.get(i)));
                }
                rows.push("Reset to defaults".into());
                if start + 6 < self.tune.count() {
                    rows.pop();
                    rows.push("Next page".into());
                    // Keep reset reachable: the last page holds it. Mid pages use Next.
                }
                if start + 6 >= self.tune.count() && !rows.iter().any(|r| r == "Reset to defaults") {
                    rows.push("Reset to defaults".into());
                }
                rows
            }
            _ => vec!["Next page".into(), "Reset to defaults".into()],
        }
    }

    fn page_of(&self, names: &[&str]) -> Vec<String> {
        let start = self.page * 6;
        let mut rows: Vec<String> = names.iter().skip(start).take(6).map(|s| (*s).to_string()).collect();
        if start + 6 < names.len() {
            rows.push("Next page".into());
        } else {
            rows.push("Reset to defaults".into());
        }
        rows
    }

    fn page_of_owned(&self, names: Vec<&str>) -> Vec<String> {
        self.page_of(&names)
    }

    pub fn notice(&self) -> Option<&'static str> {
        if self.touch_only { Some("Controller or keyboard required") } else { None }
    }
}
