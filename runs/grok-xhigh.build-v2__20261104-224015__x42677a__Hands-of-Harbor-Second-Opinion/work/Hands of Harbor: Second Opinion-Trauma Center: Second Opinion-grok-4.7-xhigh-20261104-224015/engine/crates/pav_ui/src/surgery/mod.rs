//! Ten-foot shell for Hands of Harbor. The state machine is plain Rust. egui only draws it.

use pav_core::games::surgery::frame::SurgeryFrame;
use pav_core::games::surgery::kinds::TITLE;
use pav_core::games::surgery::Tune;

pub const ABOUT_JSON: &str = include_str!("about.json");

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DeviceKind {
    KeyboardMouse,
    Gamepad,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Screen {
    Title,
    Menu,
    Difficulty,
    Files,
    Settings,
    About,
    Controls,
    Pause,
    Dev,
    Attract,
    Hud,
    Story,
    Results,
    Dead,
    Card,
    Chart,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Cmd {
    LoadCampaign,
    LoadCase(u8),
    LoadCode,
    LoadAttract,
    ToTitle,
    SetDifficulty(u8),
    Retry,
    SetTune { id: u8, value: f32 },
    ResetTune,
    SetBus { which: u8, value: f32 },
    Dev { what: u8, extra: u8 },
    ConfirmSim,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct Input {
    pub up: bool,
    pub down: bool,
    pub left: bool,
    pub right: bool,
    pub confirm: bool,
    pub back: bool,
    pub tab_l: bool,
    pub tab_r: bool,
    pub pointer: Option<[f32; 2]>,
    pub click: bool,
    pub any: bool,
    pub dt: f32,
    pub device: Option<DeviceKind>,
}

pub struct Shell {
    screen: Screen,
    focus: usize,
    pub device: DeviceKind,
    pub xbox: bool,
    pub touch_only: bool,
    pub ever_fine: bool,
    idle: f32,
    settings_page: u8,
    about_page: u8,
    dev_page: u8,
    sliders: [f32; 19],
    pub music: f32,
    pub effects: f32,
    pub voices: f32,
    pub difficulty: u8,
    best: [u8; 8],
    sim_mode: u8,
    paused: bool,
    live: bool,
    bot_plays: bool,
    pub card_lines: Vec<String>,
}

impl Default for Shell {
    fn default() -> Self {
        Self::new()
    }
}

impl Shell {
    pub fn new() -> Self {
        let mut sliders = [0.0; 19];
        for (i, (_, v, _, _)) in Tune::FIELDS.iter().enumerate() {
            sliders[i] = *v;
        }
        Self {
            screen: Screen::Title,
            focus: 0,
            device: DeviceKind::KeyboardMouse,
            xbox: false,
            touch_only: false,
            ever_fine: false,
            idle: 0.0,
            settings_page: 0,
            about_page: 0,
            dev_page: 0,
            sliders,
            music: 0.10,
            effects: 0.80,
            voices: 0.70,
            difficulty: 1,
            best: [0; 8],
            sim_mode: 0,
            paused: false,
            live: true,
            bot_plays: false,
            card_lines: Vec::new(),
        }
    }

    pub fn screen_name(&self) -> &'static str {
        match self.screen {
            Screen::Title => "title",
            Screen::Menu => "menu",
            Screen::Difficulty => "difficulty",
            Screen::Files => "files",
            Screen::Settings => "settings",
            Screen::About => "about",
            Screen::Controls => "controls",
            Screen::Pause => "pause",
            Screen::Dev => "dev",
            Screen::Attract => "attract",
            Screen::Hud => "op",
            Screen::Story => "story",
            Screen::Results => "results",
            Screen::Dead => "dead",
            Screen::Card => "card",
            Screen::Chart => "chart",
        }
    }

    pub fn focus(&self) -> usize {
        self.focus
    }

    pub fn paused(&self) -> bool {
        self.paused
    }

    pub fn note_mode(&mut self, mode: u8) {
        self.sim_mode = mode;
        // A load or a return to the title can land a frame before the sim does.
        if self.screen == Screen::Title && mode == 6 {
            return;
        }
        if matches!(self.screen, Screen::Story | Screen::Hud | Screen::Chart) && mode == 0 {
            return;
        }
        // Pause freezes the sim, so the shell keeps the overlay. Menus stay put
        // while the sim is still on the title or the attract reel.
        if self.paused {
            return;
        }
        if matches!(mode, 0 | 6)
            && matches!(
                self.screen,
                Screen::Menu
                    | Screen::Difficulty
                    | Screen::Files
                    | Screen::Settings
                    | Screen::About
                    | Screen::Controls
                    | Screen::Pause
                    | Screen::Dev
                    | Screen::Attract
            )
        {
            return;
        }
        self.screen = match mode {
            1 => Screen::Story,
            2 => Screen::Chart,
            3 | 8 => Screen::Hud,
            4 => Screen::Results,
            5 => Screen::Dead,
            6 => Screen::Attract,
            7 => Screen::Card,
            _ => Screen::Title,
        };
    }

    pub fn prompt(&self, action: &str) -> &'static str {
        let pad = self.device == DeviceKind::Gamepad;
        match action {
            "confirm" => {
                if !pad {
                    "Enter"
                } else if self.xbox {
                    "A"
                } else {
                    "Cross"
                }
            }
            "back" => {
                if !pad {
                    "Esc"
                } else if self.xbox {
                    "B"
                } else {
                    "Circle"
                }
            }
            "use" => {
                if !pad {
                    "LMB"
                } else if self.xbox {
                    "RT"
                } else {
                    "R2"
                }
            }
            "gift" => {
                if !pad {
                    "G"
                } else if self.xbox {
                    "Y"
                } else {
                    "Triangle"
                }
            }
            "chart" => {
                if !pad {
                    "Tab"
                } else if self.xbox {
                    "X"
                } else {
                    "Square"
                }
            }
            "pause" => {
                if pad {
                    "Options"
                } else {
                    "Esc"
                }
            }
            _ => " ",
        }
    }

    pub fn lines(&self) -> Vec<String> {
        let mut v = Vec::new();
        v.push(TITLE.to_string());
        match self.screen {
            Screen::Title => {
                v.push("Mercy Harbor General  ·  Night Ward".into());
                v.push(format!("Press {} ", self.prompt("confirm")));
                if self.touch_only && !self.ever_fine {
                    v.push("Controller or keyboard required".into());
                    v.push("Settings".into());
                }
            }
            Screen::Menu => {
                for (i, item) in ["Continue", "New Game", "Case Files", "Code Blue", "Settings", "About"].iter().enumerate() {
                    v.push(self.row(i, item));
                }
            }
            Screen::Difficulty => {
                for (i, item) in ["Resident", "Attending", "Chief"].iter().enumerate() {
                    v.push(self.row(i, item));
                }
            }
            Screen::Files => {
                for i in 0..8 {
                    let rank = ["", "C", "B", "A", "S", "ENCORE"][self.best[i] as usize];
                    v.push(self.row(i, &format!("Case {}  {rank}", i + 1)));
                }
            }
            Screen::Settings => {
                v.push(format!("Page {}", self.settings_page + 1));
                match self.settings_page {
                    0 => {
                        v.push(self.row(0, &format!("Music  {:.2}  default 0.10", self.music)));
                        v.push(self.row(1, &format!("Effects  {:.2}  default 0.80", self.effects)));
                        v.push(self.row(2, &format!("Voices  {:.2}  default 0.70", self.voices)));
                    }
                    1 => {
                        v.push(self.row(0, if self.xbox { "Prompts  Xbox" } else { "Prompts  PlayStation" }));
                        v.push(self.row(1, &format!("Cursor speed  {:.0}", self.sliders[8])));
                        v.push(self.row(2, "Rumble"));
                    }
                    _ => {
                        v.push(self.row(0, "Field  Anatomical"));
                        v.push(self.row(1, "Fullscreen"));
                    }
                }
            }
            Screen::About => {
                v.push(about_page_title(self.about_page).into());
                v.extend(about_lines(self.about_page));
            }
            Screen::Controls => {
                v.push(format!("Aim   right stick or mouse   {}", self.prompt("use")));
                v.push("Tools   left stick or 1-8".into());
                v.push(format!("Operate   {}", self.prompt("use")));
                v.push(format!("Gift   {}", self.prompt("gift")));
                v.push(format!("Chart   {}", self.prompt("chart")));
            }
            Screen::Pause => {
                for (i, item) in ["Resume", "Restart", "Controls", "Settings", "Dev Mode", "Quit to Title"].iter().enumerate() {
                    v.push(self.row(i, item));
                }
            }
            Screen::Dev => {
                v.push(self.row(0, if self.live { "Live  on" } else { "Live  off" }));
                v.push(self.row(1, if self.bot_plays { "Bot plays  on" } else { "Bot plays  off" }));
                let start = self.dev_page as usize * 6;
                for i in 0..6 {
                    let id = start + i;
                    if id >= Tune::FIELDS.len() {
                        break;
                    }
                    let (name, def, _, _) = Tune::FIELDS[id];
                    v.push(self.row(i + 2, &format!("{name}  {:.2}  default {def:.2}", self.sliders[id])));
                }
                v.push(self.row(8, "Reset All"));
            }
            Screen::Attract => {
                v.push("DEMO".into());
                v.push(format!("Press {}", self.prompt("confirm")));
            }
            Screen::Hud => {
                v.push("OPERATION".into());
            }
            Screen::Story => v.push("Advance".into()),
            Screen::Results => v.push("Results".into()),
            Screen::Dead => v.push(self.row(0, "Retry")),
            Screen::Card => {
                v.push("Pre-op".into());
                v.push("Keep the patient alive".into());
                v.extend(self.card_lines.clone());
                v.push(format!("{} ready", self.prompt("confirm")));
            }
            Screen::Chart => {
                v.push("Chart".into());
                v.push("Begin the operation".into());
                v.push(format!("{} begin", self.prompt("confirm")));
            }
        }
        v
    }

    fn row(&self, i: usize, label: &str) -> String {
        if i == self.focus {
            format!("> {label}")
        } else {
            label.to_string()
        }
    }

    pub fn step(&mut self, input: Input) -> Vec<Cmd> {
        if let Some(d) = input.device {
            self.device = d;
            if d == DeviceKind::KeyboardMouse || d == DeviceKind::Gamepad {
                self.ever_fine = true;
            }
        }
        let mut cmds = Vec::new();
        if self.screen == Screen::Attract {
            if input.any {
                self.screen = Screen::Title;
                self.paused = false;
                self.idle = 0.0;
                self.focus = 0;
                cmds.push(Cmd::ToTitle);
            }
            return cmds;
        }
        let menuish = matches!(
            self.screen,
            Screen::Title | Screen::Menu | Screen::Difficulty | Screen::Files | Screen::Settings | Screen::About | Screen::Controls
        );
        if menuish && !input.any {
            self.idle += input.dt;
            if self.idle >= 10.0 {
                self.screen = Screen::Attract;
                self.idle = 0.0;
                cmds.push(Cmd::LoadAttract);
                return cmds;
            }
        } else if input.any {
            self.idle = 0.0;
        }
        if self.touch_only && !self.ever_fine && self.screen == Screen::Title {
            if input.confirm || input.click {
                self.screen = Screen::Settings;
                self.focus = 0;
            }
            return cmds;
        }
        let n = self.count();
        if let Some(p) = input.pointer {
            if let Some(hit) = self.hit(p) {
                self.focus = hit;
                self.device = DeviceKind::KeyboardMouse;
            }
        }
        if input.up {
            self.focus = self.focus.saturating_sub(1);
        }
        if input.down && n > 0 {
            self.focus = (self.focus + 1).min(n - 1);
        }
        if input.tab_l {
            self.page(-1);
        }
        if input.tab_r {
            self.page(1);
        }
        if input.left || input.right {
            let dir = if input.right { 1.0 } else { -1.0 };
            self.nudge(dir, &mut cmds);
        }
        if input.back {
            self.back();
        }
        if input.confirm || input.click {
            self.activate(&mut cmds);
        }
        if self.screen == Screen::Hud && input.back {
            self.paused = true;
            self.screen = Screen::Pause;
            self.focus = 0;
        }
        cmds
    }

    fn count(&self) -> usize {
        match self.screen {
            Screen::Menu | Screen::Pause => 6,
            Screen::Difficulty => 3,
            Screen::Files => 8,
            Screen::Settings => 3,
            Screen::Dev => 9,
            Screen::Dead => 1,
            Screen::Title => {
                if self.touch_only && !self.ever_fine {
                    1
                } else {
                    1
                }
            }
            _ => 1,
        }
    }

    fn hit(&self, p: [f32; 2]) -> Option<usize> {
        let n = self.count();
        for i in 0..n {
            let y = 280.0 + i as f32 * 72.0;
            if p[0] >= 180.0 && p[0] <= 1100.0 && p[1] >= y && p[1] <= y + 60.0 {
                return Some(i);
            }
        }
        None
    }

    fn page(&mut self, d: i8) {
        match self.screen {
            Screen::Settings => self.settings_page = (self.settings_page as i8 + d).rem_euclid(3) as u8,
            Screen::About => self.about_page = (self.about_page as i8 + d).rem_euclid(5) as u8,
            Screen::Dev => self.dev_page = (self.dev_page as i8 + d).rem_euclid(4) as u8,
            _ => {}
        }
        self.focus = 0;
    }

    fn nudge(&mut self, dir: f32, cmds: &mut Vec<Cmd>) {
        if self.screen == Screen::Settings && self.settings_page == 0 {
            let slot = match self.focus {
                0 => &mut self.music,
                1 => &mut self.effects,
                2 => &mut self.voices,
                _ => return,
            };
            *slot = (*slot + dir * 0.05).clamp(0.0, 1.0);
            cmds.push(Cmd::SetBus { which: self.focus as u8, value: *slot });
        }
        if self.screen == Screen::Dev && (2..8).contains(&self.focus) {
            let id = self.dev_page as usize * 6 + (self.focus - 2);
            if id < Tune::FIELDS.len() {
                let (_, _, lo, hi) = Tune::FIELDS[id];
                let step = (hi - lo) / 20.0;
                self.sliders[id] = (self.sliders[id] + dir * step).clamp(lo, hi);
                cmds.push(Cmd::SetTune { id: id as u8, value: self.sliders[id] });
            }
        }
    }

    fn back(&mut self) {
        match self.screen {
            Screen::Menu | Screen::Attract => self.screen = Screen::Title,
            Screen::Difficulty | Screen::Files | Screen::Settings | Screen::About | Screen::Controls => {
                self.screen = if self.paused { Screen::Pause } else { Screen::Menu };
            }
            Screen::Pause => {
                self.paused = false;
                self.screen = Screen::Hud;
            }
            Screen::Dev => self.screen = Screen::Pause,
            Screen::Hud => {
                self.paused = true;
                self.screen = Screen::Pause;
                self.focus = 0;
            }
            _ => {}
        }
        self.focus = 0;
    }

    fn activate(&mut self, cmds: &mut Vec<Cmd>) {
        match self.screen {
            Screen::Title => {
                self.screen = Screen::Menu;
                self.focus = 0;
            }
            Screen::Menu => match self.focus {
                0 => {
                    self.paused = false;
                    cmds.push(Cmd::LoadCampaign);
                    self.screen = Screen::Story;
                }
                1 => {
                    self.screen = Screen::Difficulty;
                    self.focus = self.difficulty as usize;
                }
                2 => {
                    self.screen = Screen::Files;
                    self.focus = 0;
                }
                3 => {
                    self.paused = false;
                    cmds.push(Cmd::LoadCode);
                    self.screen = Screen::Hud;
                }
                4 => {
                    self.screen = Screen::Settings;
                    self.focus = 0;
                }
                _ => {
                    self.screen = Screen::About;
                    self.focus = 0;
                }
            },
            Screen::Difficulty => {
                self.difficulty = self.focus.min(2) as u8;
                cmds.push(Cmd::SetDifficulty(self.difficulty));
                cmds.push(Cmd::LoadCampaign);
                self.paused = false;
                self.screen = Screen::Story;
            }
            Screen::Files => {
                let n = self.focus.min(7) as u8;
                cmds.push(Cmd::LoadCase(n));
                self.paused = false;
                self.screen = Screen::Hud;
            }
            Screen::Pause => match self.focus {
                0 => {
                    self.paused = false;
                    self.screen = Screen::Hud;
                }
                1 => cmds.push(Cmd::Retry),
                2 => self.screen = Screen::Controls,
                3 => self.screen = Screen::Settings,
                4 => {
                    self.screen = Screen::Dev;
                    self.focus = 0;
                }
                _ => {
                    self.paused = false;
                    self.screen = Screen::Title;
                    cmds.push(Cmd::ToTitle);
                }
            },
            Screen::Dev => {
                if self.focus == 0 {
                    self.live = !self.live;
                } else if self.focus == 1 {
                    self.bot_plays = !self.bot_plays;
                    cmds.push(Cmd::Dev { what: 8, extra: u8::from(self.bot_plays) });
                } else if self.focus >= 8 {
                    cmds.push(self.reset_sliders());
                }
            }
            Screen::Settings if self.settings_page == 1 && self.focus == 0 => self.xbox = !self.xbox,
            Screen::Dead => cmds.push(Cmd::Retry),
            Screen::Story | Screen::Results | Screen::Card | Screen::Chart => cmds.push(Cmd::ConfirmSim),
            Screen::About => self.about_page = (self.about_page + 1) % 5,
            _ => {}
        }
    }

    pub fn reset_sliders(&mut self) -> Cmd {
        for (i, (_, v, _, _)) in Tune::FIELDS.iter().enumerate() {
            self.sliders[i] = *v;
        }
        self.music = 0.10;
        self.effects = 0.80;
        self.voices = 0.70;
        Cmd::ResetTune
    }

    pub fn mark_rank(&mut self, case_id: i8, rank: u8) {
        if (0..8).contains(&case_id) {
            let i = case_id as usize;
            if rank > self.best[i] {
                self.best[i] = rank;
            }
        }
    }

    pub fn open_dev_for_test(&mut self) {
        self.paused = true;
        self.screen = Screen::Dev;
        self.focus = 2;
        self.dev_page = 0;
    }
}

fn about_page_title(page: u8) -> &'static str {
    match page {
        0 => "Credits",
        1 => "Source Information",
        2 => "Testing Feedback",
        3 => "Engine Feedback",
        _ => "Prompt Feedback",
    }
}

fn about_lines(page: u8) -> Vec<String> {
    let v: serde_json::Value = serde_json::from_str(ABOUT_JSON).unwrap_or(serde_json::json!({}));
    match page {
        0 => vec![
            "Pavilion engine".into(),
            "Barlow Condensed, OFL".into(),
            "No audio files".into(),
        ],
        1 => {
            let s = &v["sourceInformation"];
            vec![
                format!("Date: {}", s["date"].as_str().unwrap_or("")),
                format!("Source: {}", s["source"].as_str().unwrap_or("")),
                format!("Plan: {}", s["plan"].as_str().unwrap_or("")),
                format!("Genre: {}", s["genre"].as_str().unwrap_or("")),
                format!("Perspective: {}", s["perspective"].as_str().unwrap_or("")),
                format!("Tech: {}", s["tech"].as_str().unwrap_or("")),
                format!("Art Direction: {}", s["artDirection"].as_str().unwrap_or("")),
                format!("Animation: {}", s["animation"].as_str().unwrap_or("")),
                format!("Audio: {}", s["audio"].as_str().unwrap_or("")),
                format!("Online: {}", s["online"].as_str().unwrap_or("")),
                format!("Testing: {}", s["testing"].as_str().unwrap_or("")),
                format!("Research: {}", s["research"].as_str().unwrap_or("")),
                format!("Environment: {}", s["environment"].as_str().unwrap_or("")),
                format!("Model: {}", s["model"].as_str().unwrap_or("")),
                format!("Usage: {}", s["usage"].as_str().unwrap_or("")),
            ]
        }
        2 => list_answers(&v["testingFeedback"]),
        3 => list_answers(&v["engineFeedback"]),
        _ => list_answers(&v["promptFeedback"]),
    }
}

fn list_answers(v: &serde_json::Value) -> Vec<String> {
    v.as_array().map(|a| a.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect()).unwrap_or_default()
}

pub fn install_font(ctx: &egui::Context) {
    let mut fonts = egui::FontDefinitions::default();
    fonts.font_data.insert(
        "barlow".to_owned(),
        std::sync::Arc::new(egui::FontData::from_static(include_bytes!("../../fonts/BarlowCondensed-SemiBold.ttf"))),
    );
    fonts.families.entry(egui::FontFamily::Proportional).or_default().insert(0, "barlow".to_owned());
    fonts.families.entry(egui::FontFamily::Monospace).or_default().insert(0, "barlow".to_owned());
    ctx.set_fonts(fonts);
}

pub fn draw(ui: &egui::Ui, shell: &Shell, op: Option<&SurgeryFrame>) {
    let ctx = ui.ctx();
    egui::Area::new(egui::Id::new("harbor_shell")).anchor(egui::Align2::LEFT_TOP, egui::vec2(0.0, 0.0)).show(ctx, |ui| {
        ui.set_width(1920.0);
        ui.set_height(1080.0);
        let title = egui::RichText::new(TITLE).size(72.0).strong().color(egui::Color32::from_rgb(236, 228, 214));
        match shell.screen {
            Screen::Hud => draw_hud(ui, op),
            Screen::Chart => {
                ui.add_space(240.0);
                ui.vertical_centered(|ui| {
                    ui.label(egui::RichText::new(op.map(|o| o.patient.as_str()).unwrap_or("")).size(48.0));
                    ui.label(egui::RichText::new(op.map(|o| o.op_name.as_str()).unwrap_or("")).size(40.0));
                    ui.label(egui::RichText::new(format!("{}  begin", shell.prompt("confirm"))).size(32.0));
                });
            }
            Screen::Story => {
                ui.add_space(720.0);
                ui.horizontal(|ui| {
                    ui.add_space(120.0);
                    ui.label(egui::RichText::new(op.map(|o| o.story_who.as_str()).unwrap_or("")).size(36.0).color(egui::Color32::from_rgb(120, 210, 200)));
                });
                ui.horizontal(|ui| {
                    ui.add_space(120.0);
                    ui.label(egui::RichText::new(op.map(|o| o.story_line.as_str()).unwrap_or("")).size(40.0).color(egui::Color32::WHITE));
                });
                ui.label(egui::RichText::new(format!("{}  advance", shell.prompt("confirm"))).size(30.0));
            }
            Screen::Results => {
                ui.add_space(180.0);
                ui.vertical_centered(|ui| {
                    ui.label(title);
                    if let Some(op) = op {
                        ui.label(egui::RichText::new(format!("{}   {}", op.patient, op.op_name)).size(40.0));
                        ui.label(egui::RichText::new(format!("Score {}", op.score)).size(48.0));
                        let rank = ["", "C", "B", "A", "S", "ENCORE"][op.rank as usize % 6];
                        ui.label(egui::RichText::new(rank).size(96.0).strong().color(egui::Color32::from_rgb(245, 200, 80)));
                    }
                });
            }
            _ => {
                ui.add_space(80.0);
                ui.vertical_centered(|ui| {
                    if shell.screen == Screen::Title || shell.screen == Screen::Menu || shell.screen == Screen::Attract {
                        ui.label(title.clone());
                    }
                });
                ui.add_space(40.0);
                for (i, line) in shell.lines().iter().enumerate() {
                    if i == 0 && (shell.screen == Screen::Title || shell.screen == Screen::Menu) {
                        continue;
                    }
                    let y_focus = line.starts_with('>');
                    let color = if y_focus {
                        egui::Color32::from_rgb(255, 214, 120)
                    } else {
                        egui::Color32::from_rgb(220, 226, 230)
                    };
                    ui.horizontal(|ui| {
                        ui.add_space(220.0);
                        ui.label(egui::RichText::new(line).size(if y_focus { 48.0 } else { 40.0 }).color(color));
                    });
                    ui.add_space(8.0);
                }
                if shell.screen == Screen::Attract {
                    ui.label(egui::RichText::new("DEMO").size(64.0).strong().color(egui::Color32::from_rgb(255, 80, 70)));
                }
            }
        }
    });
}

fn draw_hud(ui: &egui::Ui, op: Option<&SurgeryFrame>) {
    let Some(op) = op else { return };
    let ctx = ui.ctx();
    egui::Area::new(egui::Id::new("harbor_hud")).anchor(egui::Align2::LEFT_TOP, egui::vec2(36.0, 24.0)).show(ctx, |ui| {
        let beat = if op.on_beat { "♥" } else { "♡" };
        ui.label(
            egui::RichText::new(format!("{beat}  {:.0}", op.vitals)).size(64.0).strong().color(egui::Color32::from_rgb(230, 70, 70)),
        );
        ui.label(egui::RichText::new(format!("BPM {:.0}", op.bpm)).size(32.0));
    });
    egui::Area::new(egui::Id::new("harbor_time")).anchor(egui::Align2::RIGHT_TOP, egui::vec2(-36.0, 24.0)).show(ctx, |ui| {
        let t = op.timer.max(0.0) as i32;
        ui.label(egui::RichText::new(format!("{:02}:{:02}", t / 60, t % 60)).size(64.0).strong());
    });
    if !op.callout.is_empty() {
        egui::Area::new(egui::Id::new("harbor_now")).anchor(egui::Align2::CENTER_TOP, egui::vec2(0.0, 28.0)).show(ctx, |ui| {
            ui.label(egui::RichText::new(format!("NOW  {}", op.callout)).size(32.0).color(egui::Color32::from_rgb(230, 220, 180)));
        });
    }
    if !op.banner.is_empty() {
        egui::Area::new(egui::Id::new("harbor_banner")).anchor(egui::Align2::CENTER_CENTER, egui::vec2(0.0, -80.0)).show(ctx, |ui| {
            ui.label(egui::RichText::new(&op.banner).size(54.0).strong().color(egui::Color32::from_rgb(255, 230, 180)));
        });
    }
}

/// Dev Reset All is a labelled row the step() path also exposes.
pub fn dev_reset(shell: &mut Shell) -> Cmd {
    shell.reset_sliders()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn press(extra: Input) -> Input {
        Input { any: true, dt: 0.016, ..extra }
    }

    #[test]
    fn keyboard_pad_and_mouse_walk_the_shell() {
        let mut s = Shell::new();
        assert_eq!(s.screen_name(), "title");
        assert_eq!(s.prompt("confirm"), "Enter");
        s.step(press(Input { confirm: true, device: Some(DeviceKind::KeyboardMouse), ..Default::default() }));
        assert_eq!(s.screen_name(), "menu");
        assert_eq!(s.prompt("confirm"), "Enter");
        s.step(press(Input { device: Some(DeviceKind::Gamepad), ..Default::default() }));
        assert_eq!(s.prompt("confirm"), "Cross");
        assert_eq!(s.prompt("use"), "R2");
        s.xbox = true;
        assert_eq!(s.prompt("confirm"), "A");
        assert_eq!(s.prompt("back"), "B");
        s.xbox = false;
        s.step(press(Input { pointer: Some([400.0, 280.0 + 2.0 * 72.0 + 8.0]), device: Some(DeviceKind::KeyboardMouse), ..Default::default() }));
        assert_eq!(s.focus(), 2);
        s.step(press(Input { click: true, ..Default::default() }));
        assert_eq!(s.screen_name(), "files");
        s.step(press(Input { back: true, ..Default::default() }));
        assert_eq!(s.screen_name(), "menu");
        s.focus = 1;
        s.step(press(Input { confirm: true, ..Default::default() }));
        assert_eq!(s.screen_name(), "difficulty");
        s.step(press(Input { down: true, ..Default::default() }));
        let cmds = s.step(press(Input { confirm: true, ..Default::default() }));
        assert!(cmds.iter().any(|c| matches!(c, Cmd::LoadCampaign)));
        assert_eq!(s.screen_name(), "story");
        s.step(press(Input { back: true, ..Default::default() }));
        s.note_mode(3);
        assert_eq!(s.screen_name(), "op");
        s.step(press(Input { back: true, ..Default::default() }));
        assert_eq!(s.screen_name(), "pause");
        assert!(s.paused());
        s.focus = 4;
        s.step(press(Input { confirm: true, ..Default::default() }));
        assert_eq!(s.screen_name(), "dev");
        s.focus = 1;
        let cmds = s.step(press(Input { confirm: true, ..Default::default() }));
        assert!(cmds.iter().any(|c| matches!(c, Cmd::Dev { what: 8, extra: 1 })));
        s.note_mode(4);
        assert_eq!(s.screen_name(), "dev");
        s.paused = false;
        s.note_mode(5);
        assert_eq!(s.screen_name(), "dead");
        s.note_mode(2);
        assert_eq!(s.screen_name(), "chart");
        s.note_mode(7);
        assert_eq!(s.screen_name(), "card");
        s.note_mode(1);
        assert_eq!(s.screen_name(), "story");
        s.note_mode(8);
        assert_eq!(s.screen_name(), "op");
    }

    #[test]
    fn attract_waits_ten_seconds_and_any_device_leaves() {
        let mut s = Shell::new();
        s.step(Input { dt: 9.9, ..Default::default() });
        assert_eq!(s.screen_name(), "title");
        let cmds = s.step(Input { dt: 0.2, ..Default::default() });
        assert_eq!(s.screen_name(), "attract");
        assert!(cmds.contains(&Cmd::LoadAttract));
        s.step(press(Input { device: Some(DeviceKind::KeyboardMouse), confirm: true, ..Default::default() }));
        assert_eq!(s.screen_name(), "title");

        let mut s = Shell::new();
        s.step(Input { dt: 10.0, ..Default::default() });
        s.step(press(Input { device: Some(DeviceKind::Gamepad), ..Default::default() }));
        assert_eq!(s.screen_name(), "title");

        let mut s = Shell::new();
        s.step(Input { dt: 10.0, ..Default::default() });
        s.step(press(Input { pointer: Some([10.0, 10.0]), device: Some(DeviceKind::KeyboardMouse), ..Default::default() }));
        assert_eq!(s.screen_name(), "title");
    }

    #[test]
    fn touch_only_asks_for_a_controller_and_opens_settings() {
        let mut s = Shell::new();
        s.touch_only = true;
        let lines = s.lines().join("\n");
        assert!(lines.contains("Controller or keyboard required"), "{lines}");
        assert!(lines.contains("Settings"), "{lines}");
        let cmds = s.step(press(Input { confirm: true, click: true, ..Default::default() }));
        assert!(cmds.is_empty());
        assert_eq!(s.screen_name(), "settings");
    }

    #[test]
    fn dev_slider_moves_and_reset_restores_defaults() {
        let mut s = Shell::new();
        s.open_dev_for_test();
        assert_eq!(s.focus(), 2);
        let before = s.sliders[0];
        let cmds = s.step(press(Input { right: true, ..Default::default() }));
        assert!(matches!(cmds[0], Cmd::SetTune { id: 0, .. }));
        assert!(s.sliders[0] > before);
        for _ in 0..6 {
            s.step(press(Input { down: true, ..Default::default() }));
        }
        assert_eq!(s.focus(), 8);
        let cmds = s.step(press(Input { confirm: true, ..Default::default() }));
        assert!(cmds.iter().any(|c| matches!(c, Cmd::ResetTune)));
        assert!((s.sliders[0] - before).abs() < 1e-4);
        assert!((s.music - 0.10).abs() < 1e-6);
        assert!((s.effects - 0.80).abs() < 1e-6);
        assert!((s.voices - 0.70).abs() < 1e-6);
        let shown = s.lines().join("\n");
        assert!(shown.contains("Reset All"));
        assert!(shown.contains("default"));
    }

    #[test]
    fn about_lists_every_section_and_the_usage_line() {
        let mut s = Shell::new();
        s.step(press(Input { confirm: true, ..Default::default() }));
        s.focus = 5;
        s.step(press(Input { confirm: true, ..Default::default() }));
        assert_eq!(s.screen_name(), "about");
        assert!(s.lines().join("\n").contains("Credits"));
        s.step(press(Input { confirm: true, ..Default::default() }));
        let source = s.lines().join("\n");
        assert!(source.contains("Source Information"), "{source}");
        assert!(source.contains("Usage: added on import"), "{source}");
        s.step(press(Input { confirm: true, ..Default::default() }));
        assert!(s.lines().join("\n").contains("Testing Feedback"));
        s.step(press(Input { confirm: true, ..Default::default() }));
        assert!(s.lines().join("\n").contains("Engine Feedback"));
        s.step(press(Input { confirm: true, ..Default::default() }));
        assert!(s.lines().join("\n").contains("Prompt Feedback"));
        assert!(ABOUT_JSON.contains("\"usage\": \"added on import\""));
    }

    #[test]
    fn shell_draws_without_a_window() {
        let s = Shell::new();
        let ctx = egui::Context::default();
        let raw = egui::RawInput {
            screen_rect: Some(egui::Rect::from_min_size(egui::Pos2::ZERO, egui::vec2(1920.0, 1080.0))),
            ..Default::default()
        };
        let mut out = ctx.run_ui(raw, |ui| draw(ui, &s, None));
        out.textures_delta.clear();
    }
}
