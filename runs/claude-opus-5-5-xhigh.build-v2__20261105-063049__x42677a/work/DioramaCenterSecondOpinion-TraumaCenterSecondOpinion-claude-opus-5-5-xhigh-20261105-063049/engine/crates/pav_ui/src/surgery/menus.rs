//! The focus-list screens: title, main menu, difficulty, case files, pause, controls, attract.

use egui::{Align2, Color32, Painter, Pos2, Rect, StrokeKind, pos2, vec2};
use glam::Mat4;
use pav_core::games::surgery::content;
use pav_core::games::surgery::cue;
use pav_core::games::surgery::frame::SurgeryFrame;
use pav_core::games::surgery::tune::{DIFFICULTIES, cheat};
use pav_core::input::SurgeryCmd;

use super::glyphs::{self, Action};
use super::style::{self, GOLD, INK, TEAL};
use super::{Screen, Shell, ShellCmd, ShellInput, TAGLINE, TITLE};
use crate::Device;

impl Shell {
    /// A focus list: nav moves the focus, hover moves the focus, a click or confirm activates.
    pub fn list(
        &mut self,
        p: &Painter,
        i: &ShellInput,
        items: &[String],
        at: Pos2,
        width: f32,
        step: f32,
        size: f32,
    ) -> Option<usize> {
        if items.is_empty() {
            return None;
        }
        let n = items.len();
        self.focus = self.focus.min(n - 1);
        if self.nav(0) {
            self.focus = (self.focus + n - 1) % n;
            self.cue(cue::NAV);
        }
        if self.nav(1) {
            self.focus = (self.focus + 1) % n;
            self.cue(cue::NAV);
        }
        let mut chosen = None;
        for k in 0..n {
            let r = Rect::from_min_size(at + vec2(0.0, step * k as f32), vec2(width, step - 8.0));
            let over = i.pointer.is_some_and(|q| r.contains(q));
            if over && i.pointer_moved && self.focus != k {
                self.focus = k;
                self.cue(cue::NAV);
            }
            if over && i.click {
                chosen = Some(k);
            }
        }
        for (k, text) in items.iter().enumerate() {
            let r = Rect::from_min_size(at + vec2(0.0, step * k as f32), vec2(width, step - 8.0));
            let f = k == self.focus;
            if f {
                let pulse = (self.time * 3.0).sin() * 0.1 + 0.9;
                p.rect_filled(r, 10.0, style::with_alpha(TEAL, 0.24 * pulse));
                p.rect_stroke(r, 10.0, egui::Stroke::new(3.0, style::with_alpha(TEAL, pulse)), StrokeKind::Inside);
                p.rect_filled(Rect::from_min_size(r.min, vec2(8.0, r.height())), 4.0, GOLD);
            }
            style::outlined(
                p,
                r.left_center() + vec2(30.0, 0.0),
                Align2::LEFT_CENTER,
                text,
                size,
                if f { Color32::WHITE } else { INK },
            );
        }
        if i.confirm {
            chosen = Some(self.focus);
        }
        if chosen.is_some() {
            self.cue(cue::CONFIRM);
        }
        chosen
    }

    /// The bottom prompt row.
    pub fn hints(&mut self, p: &Painter, rect: Rect, list: &[(Action, &str)]) {
        let g = self.glyphs();
        let mut x = rect.min.x + 60.0;
        let y = rect.max.y - 52.0;
        for (a, label) in list {
            self.prompted(g, *a);
            x = glyphs::labeled(p, pos2(x, y), 38.0, g, *a, label, INK);
        }
    }

    pub fn backdrop(&self, p: &Painter, rect: Rect, a: f32) {
        p.rect_filled(rect, 0.0, style::with_alpha(style::BG, a));
    }

    pub fn title(&mut self, p: &Painter, rect: Rect, i: &ShellInput, f: Option<&SurgeryFrame>) {
        let c = rect.center();
        p.rect_filled(rect, 0.0, style::with_alpha(style::BG, 0.28));
        let y = rect.min.y + 330.0;
        let t = style::outlined(p, pos2(c.x, y), Align2::CENTER_CENTER, TITLE, 104.0, Color32::WHITE);
        style::outlined(p, pos2(c.x, y + 78.0), Align2::CENTER_CENTER, TAGLINE, 44.0, TEAL);
        // The ECG line draws the title's underline.
        let (x0, x1) = (t.min.x, t.max.x);
        let yy = y + 44.0;
        let beat = f.map(|f| f.beat).unwrap_or(0.0);
        let beats = f.map(|f| f.beats).unwrap_or(0) as f32 + beat;
        let n = 180;
        let pts: Vec<Pos2> = (0..=n)
            .map(|k| {
                let t = k as f32 / n as f32;
                let x = x0 + (x1 - x0) * t;
                let ph = (beats * 0.4 + t * 2.0).fract();
                pos2(x, yy - super::hud::ecg_wave(ph) * 22.0)
            })
            .collect();
        p.add(egui::Shape::line(pts, egui::Stroke::new(3.0, style::GREEN)));
        if self.touch_only {
            // A phone held upright has a tall canvas: the words grow to stay readable.
            let k = (rect.height() / 1080.0).clamp(1.0, 2.4);
            style::outlined(
                p,
                pos2(c.x, c.y + 150.0 * k),
                Align2::CENTER_CENTER,
                "Controller or keyboard required",
                54.0 * k,
                GOLD,
            );
            // Touch-only: one button a tap can use.
            let r = Rect::from_center_size(pos2(c.x, c.y + 260.0 * k), vec2(360.0, 90.0) * k);
            p.rect_filled(r, 12.0, style::with_alpha(TEAL, 0.3));
            p.rect_stroke(r, 12.0, egui::Stroke::new(3.0, TEAL), StrokeKind::Inside);
            style::outlined(p, r.center(), Align2::CENTER_CENTER, "Settings", 48.0 * k, Color32::WHITE);
            if i.tap.is_some_and(|q| r.contains(q)) {
                self.came_from = Screen::Title;
                self.go(Screen::Settings);
            }
            return;
        }
        let pulse = ((self.time * 2.4).sin() * 0.5 + 0.5) * 0.5 + 0.5;
        let g = self.glyphs();
        self.prompted(g, Action::Confirm);
        let w = glyphs::draw(p, pos2(c.x - 170.0, c.y + 190.0), 54.0, g, Action::Confirm);
        style::outlined(
            p,
            pos2(c.x - 170.0 + w + 14.0, c.y + 190.0),
            Align2::LEFT_CENTER,
            "Press to scrub in",
            50.0,
            style::with_alpha(INK, pulse),
        );
        if self.sound_note {
            style::outlined(
                p,
                pos2(c.x, rect.max.y - 70.0),
                Align2::CENTER_CENTER,
                "Press a key or click for sound",
                32.0,
                style::DIM,
            );
        }
        if i.confirm || i.click {
            self.cue(cue::CONFIRM);
            self.go(Screen::Menu);
        }
    }

    pub fn main_menu(&mut self, p: &Painter, rect: Rect, i: &ShellInput) {
        p.rect_filled(rect, 0.0, style::with_alpha(style::BG, 0.5));
        style::outlined(p, rect.min + vec2(120.0, 96.0), Align2::LEFT_CENTER, TITLE, 62.0, Color32::WHITE);
        let can_continue = self.save.started;
        let mut items = Vec::new();
        if can_continue {
            items.push("Continue".to_string());
        }
        items.extend(["New Game", "Case Files", "Code Blue", "Settings", "About"].map(String::from));
        let chosen = self.list(p, i, &items, rect.min + vec2(120.0, 240.0), 620.0, 104.0, 60.0);
        self.hints(p, rect, &[(Action::Nav, "Choose"), (Action::Confirm, "Select"), (Action::Back, "Title")]);
        if let Some(k) = chosen {
            let name = items[k].as_str();
            match name {
                "Continue" => {
                    self.sim_diff();
                    let scene = format!("surgery/campaign/{}", self.save.last_case);
                    self.load(&scene);
                    self.go(Screen::Playing);
                    self.case_files_mode = false;
                }
                "New Game" => self.go(Screen::Difficulty),
                "Case Files" => self.go(Screen::CaseFiles),
                "Code Blue" => {
                    self.sim_diff();
                    self.load("surgery/codeblue");
                    self.go(Screen::Playing);
                    self.case_files_mode = true;
                }
                "Settings" => {
                    self.came_from = Screen::Menu;
                    self.go(Screen::Settings);
                }
                _ => {
                    self.came_from = Screen::Menu;
                    self.go(Screen::About);
                }
            }
        } else if i.back {
            self.cue(cue::BACK);
            self.go(Screen::Title);
        }
    }

    /// The difficulty rides on a command right after a scene loads.
    pub fn sim_diff(&mut self) {
        let d = self.save.difficulty;
        self.cmds.push(ShellCmd::Sim(SurgeryCmd::Difficulty(d)));
    }

    pub fn difficulty(&mut self, p: &Painter, rect: Rect, i: &ShellInput) {
        p.rect_filled(rect, 0.0, style::with_alpha(style::BG, 0.6));
        style::outlined(
            p,
            rect.min + vec2(120.0, 110.0),
            Align2::LEFT_CENTER,
            "How is your nerve, Doctor?",
            66.0,
            Color32::WHITE,
        );
        let items: Vec<String> = DIFFICULTIES.iter().map(|d| d.name.to_string()).collect();
        let chosen = self.list(p, i, &items, rect.min + vec2(120.0, 260.0), 620.0, 110.0, 62.0);
        let notes = [
            "Two Codes per case. The patient forgives a good deal.",
            "One Code per case. As it is meant to be played.",
            "No Codes. Faster strains. A tighter clock.",
        ];
        let f = self.focus.min(2);
        style::outlined(p, rect.min + vec2(120.0, 640.0), Align2::LEFT_CENTER, notes[f], 40.0, TEAL);
        self.hints(p, rect, &[(Action::Confirm, "Begin"), (Action::Back, "Back")]);
        if let Some(k) = chosen {
            self.save.difficulty = k as u8;
            self.save.started = true;
            self.save.last_case = 0;
            self.persist();
            self.sim_diff();
            self.load("surgery/campaign/0");
            self.case_files_mode = false;
            self.go(Screen::Playing);
        } else if i.back {
            self.cue(cue::BACK);
            self.go(Screen::Menu);
        }
    }

    pub fn case_files(&mut self, p: &Painter, rect: Rect, i: &ShellInput) {
        p.rect_filled(rect, 0.0, style::with_alpha(style::BG, 0.72));
        style::outlined(p, rect.min + vec2(120.0, 90.0), Align2::LEFT_CENTER, "Case Files", 66.0, Color32::WHITE);
        let content = content::get();
        let n = content.cases.len();
        self.focus = self.focus.min(n - 1);
        if self.nav(2) || self.nav(0) {
            self.focus = (self.focus + n - 1) % n;
            self.cue(cue::NAV);
        }
        if self.nav(3) || self.nav(1) {
            self.focus = (self.focus + 1) % n;
            self.cue(cue::NAV);
        }
        // Three big cards, the focused in the middle. Click a side one to bring it here.
        let c = rect.center() + vec2(0.0, 30.0);
        let mut clicked = None;
        for off in [-1i32, 1, 0] {
            let k = (self.focus as i32 + off).rem_euclid(n as i32) as usize;
            let size = if off == 0 { vec2(760.0, 610.0) } else { vec2(420.0, 480.0) };
            let r = Rect::from_center_size(c + vec2(off as f32 * 660.0, 0.0), size);
            let over = i.pointer.is_some_and(|q| r.contains(q));
            if over && i.click {
                clicked = Some(k);
            }
            let unlocked = k as u8 <= self.save.furthest;
            let fill = if unlocked { style::PAPER } else { Color32::from_rgb(40, 52, 56) };
            let ink = if unlocked { style::PAPER_INK } else { Color32::from_rgb(120, 136, 140) };
            p.rect_filled(r.translate(vec2(6.0, 8.0)), 10.0, Color32::from_black_alpha(120));
            p.rect_filled(r, 10.0, fill);
            if off == 0 {
                p.rect_stroke(r, 10.0, egui::Stroke::new(4.0, GOLD), StrokeKind::Outside);
            }
            let def = &content.cases[k];
            let tx = r.left_top() + vec2(36.0, 30.0);
            let big = if off == 0 { 62.0 } else { 40.0 };
            style::plain(p, tx, Align2::LEFT_TOP, &format!("Case {k}"), if off == 0 { 40.0 } else { 32.0 }, ink);
            if unlocked {
                style::plain(p, tx + vec2(0.0, 52.0), Align2::LEFT_TOP, &def.name, big, ink);
                if off == 0 {
                    style::wrapped(
                        p,
                        tx + vec2(0.0, 140.0),
                        r.width() - 72.0,
                        &format!("{}\n{}", def.patient, def.life),
                        34.0,
                        ink,
                    );
                }
                let rank = &self.save.ranks[k];
                if !rank.is_empty() {
                    let rr = r.right_bottom() - vec2(50.0, 44.0);
                    style::plain(p, rr, Align2::RIGHT_BOTTOM, rank, if off == 0 { 92.0 } else { 56.0 }, style::RED);
                    if off == 0 {
                        style::plain(p, rr - vec2(0.0, 92.0), Align2::RIGHT_BOTTOM, "Best", 30.0, ink);
                    }
                }
            } else {
                style::plain(p, tx + vec2(0.0, 52.0), Align2::LEFT_TOP, "Sealed", big, ink);
            }
        }
        self.hints(p, rect, &[(Action::Adjust, "Choose"), (Action::Confirm, "Operate"), (Action::Back, "Back")]);
        if let Some(k) = clicked {
            if k != self.focus {
                self.focus = k;
                self.cue(cue::NAV);
                return;
            }
        }
        if i.confirm || (clicked == Some(self.focus)) {
            if (self.focus as u8) <= self.save.furthest {
                self.cue(cue::CONFIRM);
                self.sim_diff();
                let scene = format!("surgery/case/{}", self.focus);
                self.load(&scene);
                self.case_files_mode = true;
                self.go(Screen::Playing);
            } else {
                self.cue(cue::CLINK);
            }
        } else if i.back {
            self.cue(cue::BACK);
            self.go(Screen::Menu);
        }
    }

    pub fn pause_menu(&mut self, p: &Painter, rect: Rect, i: &ShellInput) {
        p.rect_filled(rect, 0.0, style::with_alpha(style::BG, 0.72));
        style::outlined(p, rect.min + vec2(120.0, 110.0), Align2::LEFT_CENTER, "Paused", 76.0, Color32::WHITE);
        let items: Vec<String> =
            ["Resume", "Restart", "Controls", "Settings", "Dev Mode", "Quit to Title"].map(String::from).to_vec();
        let chosen = self.list(p, i, &items, rect.min + vec2(120.0, 220.0), 620.0, 100.0, 58.0);
        self.hints(p, rect, &[(Action::Confirm, "Select"), (Action::Back, "Resume")]);
        if let Some(k) = chosen {
            match k {
                0 => self.resume(),
                1 => {
                    self.cmds.push(ShellCmd::Paused(false));
                    self.sim_diff();
                    let s = self.scene.clone();
                    self.load(&s);
                    self.go(Screen::Playing);
                }
                2 => {
                    self.came_from = Screen::Pause;
                    self.go(Screen::Controls);
                }
                3 => {
                    self.came_from = Screen::Pause;
                    self.go(Screen::Settings);
                }
                4 => self.go(Screen::Dev),
                _ => self.quit_to_title(),
            }
        } else if i.back || i.pause {
            self.cue(cue::BACK);
            self.resume();
        }
    }

    pub fn resume(&mut self) {
        self.cmds.push(ShellCmd::Paused(false));
        self.go(Screen::Playing);
    }

    pub fn controls(&mut self, p: &Painter, rect: Rect, i: &ShellInput) {
        p.rect_filled(rect, 0.0, style::with_alpha(style::BG, 0.9));
        style::outlined(p, rect.min + vec2(120.0, 90.0), Align2::LEFT_CENTER, "Controls", 66.0, Color32::WHITE);
        let g = self.glyphs();
        let lines: &[(Action, &str)] = if g.device == Device::Gamepad {
            &[
                (Action::Aim, "Move the cursor"),
                (Action::Use, "Use the instrument (R2 is analog)"),
                (Action::Pick, "Flick to pick an instrument, instantly"),
                (Action::PickCycle, "Cycle instruments. Turn a held bone"),
                (Action::Precision, "Hold for precision"),
                (Action::Cancel, "Let go"),
                (Action::Gift, "Hold for your gift. Release on the beat"),
                (Action::Chart, "The chart"),
                (Action::Defib, "Hold both to charge the paddles"),
                (Action::Pause, "Pause"),
            ]
        } else {
            &[
                (Action::Aim, "Move the cursor (WASD or arrows also move it)"),
                (Action::Use, "Use the instrument (or hold E)"),
                (Action::Pick, "Pick an instrument (or click it on the tray)"),
                (Action::PickCycle, "Cycle instruments. Turn a held bone"),
                (Action::Precision, "Hold for a precise keyboard cursor"),
                (Action::Cancel, "Let go (or Q)"),
                (Action::Gift, "Hold for your gift. Release on the beat"),
                (Action::Chart, "The chart"),
                (Action::Defib, "Hold both to charge the paddles (or F)"),
                (Action::Pause, "Pause"),
            ]
        };
        if g.device == Device::Gamepad {
            // A picture of the pad, big enough to read.
            pad_picture(p, rect.max - vec2(600.0, 760.0));
        } else {
            keys_picture(p, rect.max - vec2(620.0, 760.0));
        }
        for (k, (a, text)) in lines.iter().enumerate() {
            let y = rect.min.y + 190.0 + k as f32 * 72.0;
            self.prompted(g, *a);
            glyphs::draw(p, pos2(rect.min.x + 120.0, y), 46.0, g, *a);
            style::outlined(p, pos2(rect.min.x + 300.0, y), Align2::LEFT_CENTER, text, 38.0, INK);
        }
        self.hints(p, rect, &[(Action::Back, "Back")]);
        if i.back || i.confirm || i.click {
            self.cue(cue::BACK);
            let to = self.came_from;
            self.go(to);
        }
    }

    pub fn attract(&mut self, p: &Painter, rect: Rect, i: &ShellInput, f: Option<&SurgeryFrame>, vp: Mat4) {
        if let Some(f) = f {
            match f.stage {
                pav_core::games::surgery::frame::Stage::Story => super::story::draw_attract(self, p, rect, f),
                _ => super::hud::draw(self, p, rect, f, vp, i),
            }
        }
        // The demo banner.
        let top = rect.min + vec2(rect.width() * 0.5, rect.height() - 70.0);
        let pulse = ((self.time * 2.0).sin() * 0.5 + 0.5) * 0.5 + 0.5;
        style::outlined(
            p,
            rect.min + vec2(60.0, 1020.0 - 0.0),
            Align2::LEFT_CENTER,
            "DEMO",
            66.0,
            style::with_alpha(style::RED, pulse),
        );
        let g = if self.touch_only { glyphs::Glyphs { device: Device::Touch, xbox: false } } else { self.glyphs() };
        self.prompted(g, Action::Any);
        if !self.touch_only {
            let w = glyphs::draw(p, pos2(top.x - 200.0, top.y), 46.0, g, Action::Any);
            style::outlined(
                p,
                pos2(top.x - 200.0 + w + 12.0, top.y),
                Align2::LEFT_CENTER,
                "to play",
                42.0,
                style::with_alpha(INK, pulse),
            );
        } else {
            style::outlined(p, top, Align2::CENTER_CENTER, "Controller or keyboard required", 42.0, GOLD);
        }
        // Any input returns to the title at once.
        if i.any || i.tap.is_some() {
            self.load("surgery/title");
            self.go(Screen::Title);
            self.idle = 0.0;
        }
        let _ = cheat::IMMORTAL;
    }
}

/// A picture of the pad.
fn pad_picture(p: &Painter, at: Pos2) {
    let body = Color32::from_rgb(226, 230, 234);
    let dark = Color32::from_rgb(30, 34, 40);
    let c = at + vec2(280.0, 150.0);
    p.rect_filled(Rect::from_center_size(c, vec2(420.0, 190.0)), 90.0, body);
    p.circle_filled(c + vec2(-170.0, 70.0), 76.0, body);
    p.circle_filled(c + vec2(170.0, 70.0), 76.0, body);
    p.rect_filled(Rect::from_center_size(c + vec2(-150.0, -96.0), vec2(90.0, 18.0)), 6.0, dark);
    p.rect_filled(Rect::from_center_size(c + vec2(150.0, -96.0), vec2(90.0, 18.0)), 6.0, dark);
    p.circle_filled(c + vec2(-70.0, 40.0), 28.0, dark);
    p.circle_filled(c + vec2(70.0, 40.0), 28.0, dark);
    p.rect_filled(Rect::from_center_size(c + vec2(-145.0, -24.0), vec2(56.0, 18.0)), 4.0, dark);
    p.rect_filled(Rect::from_center_size(c + vec2(-145.0, -24.0), vec2(18.0, 56.0)), 4.0, dark);
    for (dx, dy, col) in [
        (0.0, -30.0, Color32::from_rgb(64, 226, 160)),
        (30.0, 0.0, Color32::from_rgb(255, 102, 102)),
        (0.0, 30.0, Color32::from_rgb(124, 178, 232)),
        (-30.0, 0.0, Color32::from_rgb(214, 148, 214)),
    ] {
        p.circle_filled(c + vec2(145.0 + dx, -24.0 + dy), 13.0, col);
    }
    p.rect_filled(Rect::from_center_size(c + vec2(0.0, -24.0), vec2(120.0, 60.0)), 8.0, Color32::from_rgb(190, 196, 202));
}

/// A picture of keys and a mouse.
fn keys_picture(p: &Painter, at: Pos2) {
    let cap = Color32::from_rgb(232, 236, 236);
    let ink = Color32::from_rgb(24, 28, 32);
    let keys: &[(f32, f32, &str)] = &[
        (90.0, 40.0, "W"),
        (30.0, 100.0, "A"),
        (90.0, 100.0, "S"),
        (150.0, 100.0, "D"),
        (30.0, 40.0, "Q"),
        (150.0, 40.0, "E"),
        (210.0, 40.0, "F"),
    ];
    for (x, y, t) in keys {
        let r = Rect::from_min_size(at + vec2(*x, *y), vec2(54.0, 54.0));
        p.rect_filled(r, 8.0, cap);
        p.text(r.center(), Align2::CENTER_CENTER, *t, style::font(34.0), ink);
    }
    let sp = Rect::from_min_size(at + vec2(30.0, 170.0), vec2(240.0, 50.0));
    p.rect_filled(sp, 8.0, cap);
    p.text(sp.center(), Align2::CENTER_CENTER, "Space", style::font(32.0), ink);
    let m = Rect::from_min_size(at + vec2(360.0, 30.0), vec2(130.0, 200.0));
    p.rect_filled(m, 60.0, cap);
    p.line_segment([pos2(m.center().x, m.min.y), pos2(m.center().x, m.min.y + 80.0)], egui::Stroke::new(3.0, ink));
    p.line_segment([pos2(m.min.x, m.min.y + 80.0), pos2(m.max.x, m.min.y + 80.0)], egui::Stroke::new(3.0, ink));
    p.rect_filled(Rect::from_center_size(pos2(m.center().x, m.min.y + 40.0), vec2(16.0, 40.0)), 6.0, style::RED);
}
