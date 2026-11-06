//! One helper for every prompt: `prompt(action)` draws the glyph of the device used last.
//! PlayStation glyphs are vector shapes in their colours; Xbox letters if Settings says so; keycaps
//! and mouse-button icons on keyboard and mouse.

use egui::{Align2, Color32, Painter, Pos2, Rect, Stroke, StrokeKind, pos2, vec2};

use super::style::{self, font};
use crate::Device;

/// Everything a prompt can ask for.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Action {
    Confirm,
    Back,
    Use,
    Aim,
    Pick,
    PickCycle,
    Precision,
    Cancel,
    Gift,
    Chart,
    Rotate,
    Defib,
    Pause,
    TabPrev,
    TabNext,
    Nav,
    Adjust,
    Skip,
    Backlog,
    Auto,
    More,
    Any,
}

/// A prompt set: the device and the glyph style.
#[derive(Clone, Copy, Debug, Default)]
pub struct Glyphs {
    pub device: Device,
    pub xbox: bool,
}

const CROSS: Color32 = Color32::from_rgb(124, 178, 232);
const CIRCLE: Color32 = Color32::from_rgb(255, 102, 102);
const SQUARE: Color32 = Color32::from_rgb(214, 148, 214);
const TRIANGLE: Color32 = Color32::from_rgb(64, 226, 160);
const XB_A: Color32 = Color32::from_rgb(120, 200, 60);
const XB_B: Color32 = Color32::from_rgb(236, 72, 72);
const XB_X: Color32 = Color32::from_rgb(70, 130, 240);
const XB_Y: Color32 = Color32::from_rgb(244, 196, 40);
const CAP: Color32 = Color32::from_rgb(232, 236, 236);
const CAP_INK: Color32 = Color32::from_rgb(24, 28, 32);
const PAD: Color32 = Color32::from_rgb(28, 32, 38);

/// The glyph id a prompt draws: what the tests read.
pub fn glyph_id(g: Glyphs, a: Action) -> &'static str {
    match g.device {
        Device::Gamepad => {
            if g.xbox {
                match a {
                    Action::Confirm | Action::Use => "A",
                    Action::Back | Action::Cancel => "B",
                    Action::Chart | Action::Backlog => "X",
                    Action::Gift | Action::More | Action::Auto => "Y",
                    Action::Aim => "RS",
                    Action::Pick => "LS",
                    Action::PickCycle | Action::Rotate => "LB RB",
                    Action::Precision => "LT",
                    Action::Defib => "LT RT",
                    Action::Pause => "Menu",
                    Action::TabPrev => "LB",
                    Action::TabNext => "RB",
                    Action::Nav | Action::Adjust => "D-pad",
                    Action::Skip => "Hold A",
                    Action::Any => "Any",
                }
            } else {
                match a {
                    Action::Confirm | Action::Use => "Cross",
                    Action::Back | Action::Cancel => "Circle",
                    Action::Chart | Action::Backlog => "Square",
                    Action::Gift | Action::More | Action::Auto => "Triangle",
                    Action::Aim => "R-stick",
                    Action::Pick => "L-stick",
                    Action::PickCycle | Action::Rotate => "L1 R1",
                    Action::Precision => "L2",
                    Action::Defib => "L2 R2",
                    Action::Pause => "Options",
                    Action::TabPrev => "L1",
                    Action::TabNext => "R1",
                    Action::Nav | Action::Adjust => "D-pad",
                    Action::Skip => "Hold Cross",
                    Action::Any => "Any",
                }
            }
        }
        _ => match a {
            Action::Confirm => "Enter",
            Action::Use => "LMB",
            Action::Back => "Esc",
            Action::Cancel => "RMB",
            Action::Chart | Action::Backlog => "Tab",
            Action::Gift => "Space",
            Action::Aim => "Mouse",
            Action::Pick => "1-8",
            Action::PickCycle | Action::Rotate => "Wheel",
            Action::Precision => "Shift",
            Action::Defib => "LMB RMB",
            Action::Pause => "Esc",
            Action::TabPrev => "Q",
            Action::TabNext => "E",
            Action::Nav | Action::Adjust => "Arrows",
            Action::Skip => "Hold Enter",
            Action::Auto => "M",
            Action::More => "M",
            Action::Any => "Any key",
        },
    }
}

fn disc(p: &Painter, c: Pos2, r: f32, fill: Color32) {
    p.circle_filled(c, r, PAD);
    p.circle_stroke(c, r, Stroke::new(r * 0.08, fill));
}

fn ps_face(p: &Painter, c: Pos2, r: f32, id: &str) {
    disc(p, c, r, Color32::from_gray(90));
    let k = r * 0.5;
    let w = r * 0.17;
    match id {
        "Cross" => {
            p.line_segment([c + vec2(-k, -k), c + vec2(k, k)], Stroke::new(w, CROSS));
            p.line_segment([c + vec2(k, -k), c + vec2(-k, k)], Stroke::new(w, CROSS));
        }
        "Circle" => {
            p.circle_stroke(c, k * 1.05, Stroke::new(w, CIRCLE));
        }
        "Square" => {
            p.rect_stroke(Rect::from_center_size(c, vec2(k * 1.9, k * 1.9)), 1.0, Stroke::new(w, SQUARE), StrokeKind::Middle);
        }
        _ => {
            let pts =
                vec![c + vec2(0.0, -k * 1.15), c + vec2(k * 1.1, k * 0.8), c + vec2(-k * 1.1, k * 0.8), c + vec2(0.0, -k * 1.15)];
            p.add(egui::Shape::line(pts, Stroke::new(w, TRIANGLE)));
        }
    }
}

fn xb_face(p: &Painter, c: Pos2, r: f32, id: &str) {
    let col = match id {
        "A" => XB_A,
        "B" => XB_B,
        "X" => XB_X,
        _ => XB_Y,
    };
    p.circle_filled(c, r, col);
    p.text(c, Align2::CENTER_CENTER, id, font(r * 1.35), Color32::from_rgb(12, 14, 18));
}

fn pill(p: &Painter, c: Pos2, h: f32, text: &str, fill: Color32, ink: Color32) -> f32 {
    let w = (text.len() as f32 * h * 0.42 + h * 0.5).max(h);
    let r = Rect::from_center_size(c + vec2(w * 0.5, 0.0), vec2(w, h));
    p.rect_filled(r, h * 0.28, fill);
    p.text(r.center(), Align2::CENTER_CENTER, text, font(h * 0.68), ink);
    w
}

fn keycap(p: &Painter, c: Pos2, h: f32, text: &str) -> f32 {
    let w = (text.len() as f32 * h * 0.42 + h * 0.5).max(h);
    let r = Rect::from_center_size(c + vec2(w * 0.5, 0.0), vec2(w, h));
    p.rect_filled(r.translate(vec2(0.0, h * 0.08)), h * 0.18, Color32::from_gray(90));
    p.rect_filled(r, h * 0.18, CAP);
    p.text(r.center(), Align2::CENTER_CENTER, text, font(h * 0.62), CAP_INK);
    w
}

fn mouse_icon(p: &Painter, c: Pos2, h: f32, left: bool, right: bool, wheel: bool) -> f32 {
    let w = h * 0.72;
    let r = Rect::from_center_size(c + vec2(w * 0.5, 0.0), vec2(w, h));
    p.rect_filled(r, w * 0.44, CAP);
    let top = Rect::from_min_size(r.min, vec2(w, h * 0.46));
    if left {
        let l = Rect::from_min_size(top.min, vec2(w * 0.5, top.height()));
        p.rect_filled(l, w * 0.3, style::RED);
    }
    if right {
        let l = Rect::from_min_size(top.min + vec2(w * 0.5, 0.0), vec2(w * 0.5, top.height()));
        p.rect_filled(l, w * 0.3, style::RED);
    }
    p.line_segment([pos2(r.center().x, r.min.y), pos2(r.center().x, top.max.y)], Stroke::new(1.5, CAP_INK));
    p.line_segment([pos2(r.min.x, top.max.y), pos2(r.max.x, top.max.y)], Stroke::new(1.5, CAP_INK));
    if wheel {
        p.rect_filled(Rect::from_center_size(pos2(r.center().x, r.min.y + h * 0.24), vec2(w * 0.2, h * 0.28)), 2.0, style::RED);
    }
    w
}

fn stick(p: &Painter, c: Pos2, r: f32, text: &str) -> f32 {
    p.circle_filled(c + vec2(r, 0.0), r, PAD);
    p.circle_filled(c + vec2(r, 0.0), r * 0.62, Color32::from_gray(70));
    p.text(c + vec2(r, 0.0), Align2::CENTER_CENTER, text, font(r * 0.95), Color32::WHITE);
    r * 2.0
}

fn dpad(p: &Painter, c: Pos2, r: f32) -> f32 {
    let m = c + vec2(r, 0.0);
    p.rect_filled(Rect::from_center_size(m, vec2(r * 1.8, r * 0.62)), 2.0, PAD);
    p.rect_filled(Rect::from_center_size(m, vec2(r * 0.62, r * 1.8)), 2.0, PAD);
    r * 2.0
}

/// Draws the glyph at the left-middle `at`; returns its width.
pub fn draw(p: &Painter, at: Pos2, size: f32, g: Glyphs, a: Action) -> f32 {
    let id = glyph_id(g, a);
    let r = size * 0.5;
    match g.device {
        Device::Gamepad => match id {
            "Cross" | "Circle" | "Square" | "Triangle" => {
                ps_face(p, at + vec2(r, 0.0), r, id);
                size
            }
            "A" | "B" | "X" | "Y" => {
                xb_face(p, at + vec2(r, 0.0), r, id);
                size
            }
            "Hold Cross" | "Hold A" => {
                let w0 = pill(p, at, size * 0.82, "HOLD", PAD, Color32::WHITE);
                if g.xbox {
                    xb_face(p, at + vec2(w0 + 4.0 + r, 0.0), r, "A");
                } else {
                    ps_face(p, at + vec2(w0 + 4.0 + r, 0.0), r, "Cross");
                }
                w0 + 4.0 + size
            }
            "R-stick" | "RS" => stick(p, at, r, "R"),
            "L-stick" | "LS" => stick(p, at, r, "L"),
            "D-pad" => dpad(p, at, r),
            "L1 R1" | "LB RB" | "L2 R2" | "LT RT" => {
                let mut parts = id.split(' ');
                let w0 = pill(p, at, size * 0.8, parts.next().unwrap_or(""), PAD, Color32::WHITE);
                let w1 = pill(p, at + vec2(w0 + 4.0, 0.0), size * 0.8, parts.next().unwrap_or(""), PAD, Color32::WHITE);
                w0 + w1 + 4.0
            }
            "Any" => pill(p, at, size * 0.8, "ANY BUTTON", PAD, Color32::WHITE),
            other => pill(p, at, size * 0.8, other, PAD, Color32::WHITE),
        },
        _ => match id {
            "LMB" => mouse_icon(p, at, size, true, false, false),
            "RMB" => mouse_icon(p, at, size, false, true, false),
            "LMB RMB" => mouse_icon(p, at, size, true, true, false),
            "Wheel" => mouse_icon(p, at, size, false, false, true),
            "Mouse" => mouse_icon(p, at, size, false, false, false),
            "Any key" => keycap(p, at, size * 0.8, "ANY KEY"),
            "Hold Enter" => keycap(p, at, size * 0.8, "HOLD ENTER"),
            other => keycap(p, at, size * 0.8, other),
        },
    }
}

/// One prompt with its label; returns the x after it.
pub fn labeled(p: &Painter, at: Pos2, size: f32, g: Glyphs, a: Action, label: &str, color: Color32) -> f32 {
    let w = draw(p, at, size, g, a);
    let spot = at + vec2(w + 10.0, 0.0);
    // Dark ink is on paper: an outline would only smear it.
    let t = if color.r() < 110 {
        style::plain(p, spot, Align2::LEFT_CENTER, label, size * 0.72, color)
    } else {
        style::outlined(p, spot, Align2::LEFT_CENTER, label, size * 0.72, color)
    };
    t.max.x + 26.0
}
