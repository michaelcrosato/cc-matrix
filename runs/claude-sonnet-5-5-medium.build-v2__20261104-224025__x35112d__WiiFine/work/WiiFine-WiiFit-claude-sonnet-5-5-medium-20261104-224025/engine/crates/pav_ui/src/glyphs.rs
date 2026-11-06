//! Button glyphs, drawn with the painter: PlayStation (default) or Xbox for a pad, keycaps for the
//! keyboard, a little mouse for the mouse. One function decides what a prompt looks like.

use egui::{Align2, Color32, FontId, Painter, Pos2, Rect, Stroke, StrokeKind, vec2};
use pav_core::games::fit::ui_model::Act;

use crate::Device;

/// What to draw for a prompt.
#[derive(Clone, Debug, PartialEq)]
pub enum Glyph {
    Cross,
    Circle,
    Square,
    Triangle,
    Pill(&'static str),
    Pair(&'static str, &'static str),
    Stick(&'static str),
    Dpad,
    XboxFace(char),
    Keys(Vec<&'static str>),
    Mouse(u8),
    Options(&'static str),
}

pub fn prompt(act: Act, device: Device, xbox: bool) -> Glyph {
    match device {
        Device::Gamepad => match (act, xbox) {
            (Act::Confirm | Act::Act, false) => Glyph::Cross,
            (Act::Confirm | Act::Act, true) => Glyph::XboxFace('A'),
            (Act::Back, false) => Glyph::Circle,
            (Act::Back, true) => Glyph::XboxFace('B'),
            (Act::Wave, false) => Glyph::Square,
            (Act::Wave, true) => Glyph::XboxFace('X'),
            (Act::Schedule, false) => Glyph::Triangle,
            (Act::Schedule, true) => Glyph::XboxFace('Y'),
            (Act::StepL | Act::TabL, false) => Glyph::Pill("L1"),
            (Act::StepL | Act::TabL, true) => Glyph::Pill("LB"),
            (Act::StepR | Act::TabR, false) => Glyph::Pill("R1"),
            (Act::StepR | Act::TabR, true) => Glyph::Pill("RB"),
            (Act::Brace, false) => Glyph::Pair("L1", "R1"),
            (Act::Brace, true) => Glyph::Pair("LB", "RB"),
            (Act::Pause, false) => Glyph::Options("OPTIONS"),
            (Act::Pause, true) => Glyph::Options("MENU"),
            (Act::Move | Act::Lean, _) => Glyph::Stick("L"),
            (Act::Jog, false) => Glyph::Pill("R2"),
            (Act::Jog, true) => Glyph::Pill("RT"),
            (Act::Camera, _) => Glyph::Stick("R"),
            (Act::Navigate, _) => Glyph::Dpad,
        },
        _ => match act {
            Act::Confirm | Act::Act => Glyph::Keys(vec!["Space"]),
            Act::Back => Glyph::Keys(vec!["Esc"]),
            Act::StepL => Glyph::Keys(vec!["Q"]),
            Act::StepR => Glyph::Keys(vec!["E"]),
            Act::TabL => Glyph::Keys(vec!["Q"]),
            Act::TabR => Glyph::Keys(vec!["E"]),
            Act::Brace => Glyph::Keys(vec!["Q", "E"]),
            Act::Wave => Glyph::Keys(vec!["F"]),
            Act::Schedule => Glyph::Keys(vec!["Tab"]),
            Act::Pause => Glyph::Keys(vec!["Esc"]),
            Act::Move | Act::Lean => Glyph::Keys(vec!["W", "A", "S", "D"]),
            Act::Jog => Glyph::Keys(vec!["Shift"]),
            Act::Camera => Glyph::Mouse(3),
            Act::Navigate => Glyph::Keys(vec!["Arrows"]),
        },
    }
    .mouse_override(act, device)
}

impl Glyph {
    fn mouse_override(self, act: Act, device: Device) -> Glyph {
        if device != Device::KeyboardMouse {
            return self;
        }
        // The mouse is native too: clicks do the same things.
        self
    }

    /// The text a screen reader or test sees.
    pub fn label(&self) -> String {
        match self {
            Glyph::Cross => "Cross".into(),
            Glyph::Circle => "Circle".into(),
            Glyph::Square => "Square".into(),
            Glyph::Triangle => "Triangle".into(),
            Glyph::Pill(s) | Glyph::Stick(s) | Glyph::Options(s) => s.to_string(),
            Glyph::Pair(a, b) => format!("{a}+{b}"),
            Glyph::Dpad => "D-pad".into(),
            Glyph::XboxFace(c) => c.to_string(),
            Glyph::Keys(k) => k.join(" "),
            Glyph::Mouse(b) => format!("Mouse {b}"),
        }
    }
}

/// Draws a glyph at `at` (its centre-left), `h` tall; returns its width.
pub fn draw(p: &Painter, g: &Glyph, at: Pos2, h: f32, font: &FontId) -> f32 {
    let ink = Color32::from_rgb(38, 62, 84);
    let white = Color32::WHITE;
    let circle = |cx: f32, fill: Color32| {
        let c = Pos2::new(at.x + cx, at.y);
        p.circle_filled(c, h * 0.5, fill);
        p.circle_stroke(c, h * 0.5, Stroke::new(2.0, ink));
        c
    };
    match g {
        Glyph::Cross | Glyph::Circle | Glyph::Square | Glyph::Triangle => {
            let c = circle(h * 0.5, Color32::from_rgb(60, 70, 90));
            let r = h * 0.22;
            match g {
                Glyph::Cross => {
                    let col = Color32::from_rgb(130, 170, 255);
                    p.line_segment([c + vec2(-r, -r), c + vec2(r, r)], Stroke::new(3.5, col));
                    p.line_segment([c + vec2(-r, r), c + vec2(r, -r)], Stroke::new(3.5, col));
                }
                Glyph::Circle => {
                    p.circle_stroke(c, r * 1.1, Stroke::new(3.5, Color32::from_rgb(255, 110, 110)));
                }
                Glyph::Square => {
                    p.rect_stroke(Rect::from_center_size(c, vec2(r * 2.0, r * 2.0)), 2.0, Stroke::new(3.5, Color32::from_rgb(255, 150, 200)), StrokeKind::Middle);
                }
                _ => {
                    let col = Color32::from_rgb(120, 220, 170);
                    let pts = vec![c + vec2(0.0, -r * 1.2), c + vec2(r * 1.15, r * 0.8), c + vec2(-r * 1.15, r * 0.8)];
                    p.add(egui::Shape::closed_line(pts, Stroke::new(3.5, col)));
                }
            }
            h
        }
        Glyph::XboxFace(ch) => {
            let col = match ch {
                'A' => Color32::from_rgb(90, 200, 110),
                'B' => Color32::from_rgb(235, 90, 90),
                'X' => Color32::from_rgb(90, 140, 235),
                _ => Color32::from_rgb(240, 200, 70),
            };
            let c = circle(h * 0.5, col);
            p.text(c, Align2::CENTER_CENTER, ch.to_string(), FontId::new(h * 0.6, font.family.clone()), white);
            h
        }
        Glyph::Pill(s) | Glyph::Options(s) => {
            let w = if matches!(g, Glyph::Options(_)) { h * 3.1 } else { h * 1.5 };
            let r = Rect::from_min_size(Pos2::new(at.x, at.y - h * 0.4), vec2(w, h * 0.8));
            p.rect_filled(r, h * 0.4, Color32::from_rgb(60, 70, 90));
            p.rect_stroke(r, h * 0.4, Stroke::new(2.0, ink), StrokeKind::Middle);
            p.text(r.center(), Align2::CENTER_CENTER, *s, FontId::new(h * 0.5, font.family.clone()), white);
            w
        }
        Glyph::Pair(a, b) => {
            let w1 = draw(p, &Glyph::Pill(a), at, h, font);
            p.text(at + vec2(w1 + h * 0.15, 0.0), Align2::LEFT_CENTER, "+", FontId::new(h * 0.6, font.family.clone()), ink);
            let w2 = draw(p, &Glyph::Pill(b), at + vec2(w1 + h * 0.5, 0.0), h, font);
            w1 + h * 0.5 + w2
        }
        Glyph::Stick(s) => {
            let c = circle(h * 0.5, Color32::from_rgb(60, 70, 90));
            p.circle_filled(c, h * 0.3, Color32::from_rgb(110, 125, 150));
            p.text(c, Align2::CENTER_CENTER, *s, FontId::new(h * 0.4, font.family.clone()), white);
            h
        }
        Glyph::Dpad => {
            let c = Pos2::new(at.x + h * 0.5, at.y);
            let a = h * 0.17;
            p.rect_filled(Rect::from_center_size(c, vec2(a * 2.0, h * 0.95)), 3.0, Color32::from_rgb(60, 70, 90));
            p.rect_filled(Rect::from_center_size(c, vec2(h * 0.95, a * 2.0)), 3.0, Color32::from_rgb(60, 70, 90));
            h
        }
        Glyph::Keys(keys) => {
            let mut x = 0.0;
            for k in keys {
                let w = (h * 0.55 * k.chars().count() as f32 + h * 0.5).max(h);
                let r = Rect::from_min_size(Pos2::new(at.x + x, at.y - h * 0.5), vec2(w, h));
                p.rect_filled(r.translate(vec2(0.0, 3.0)), 8.0, Color32::from_rgb(190, 200, 210));
                p.rect_filled(r, 8.0, Color32::from_rgb(250, 250, 252));
                p.rect_stroke(r, 8.0, Stroke::new(2.0, ink), StrokeKind::Middle);
                p.text(r.center(), Align2::CENTER_CENTER, *k, FontId::new(h * 0.5, font.family.clone()), ink);
                x += w + h * 0.15;
            }
            x - h * 0.15
        }
        Glyph::Mouse(btn) => {
            let r = Rect::from_min_size(Pos2::new(at.x, at.y - h * 0.5), vec2(h * 0.75, h));
            p.rect_filled(r, h * 0.38, Color32::from_rgb(250, 250, 252));
            p.rect_stroke(r, h * 0.38, Stroke::new(2.0, ink), StrokeKind::Middle);
            let lit = Color32::from_rgb(255, 120, 110);
            let half = r.width() / 2.0;
            if *btn & 1 != 0 {
                p.rect_filled(Rect::from_min_size(r.min + vec2(2.0, 2.0), vec2(half - 3.0, h * 0.4)), 8.0, lit);
            }
            if *btn & 2 != 0 {
                p.rect_filled(Rect::from_min_size(r.min + vec2(half + 1.0, 2.0), vec2(half - 3.0, h * 0.4)), 8.0, lit);
            }
            p.line_segment([r.center_top() + vec2(0.0, 2.0), r.center_top() + vec2(0.0, h * 0.42)], Stroke::new(2.0, ink));
            h * 0.75
        }
    }
}
