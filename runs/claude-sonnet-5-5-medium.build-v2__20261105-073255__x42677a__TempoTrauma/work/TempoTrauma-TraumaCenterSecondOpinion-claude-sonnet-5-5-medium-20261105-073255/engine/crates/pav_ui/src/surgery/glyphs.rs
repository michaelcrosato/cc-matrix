//! Button prompts drawn as vector shapes: PlayStation, Xbox, or keys and mouse, following the
//! device used last.

use egui::{Align2, Color32, FontId, Painter, Pos2, Rect, Shape, Stroke, StrokeKind, Vec2};

use crate::Device;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Act {
    Confirm,
    Back,
    Square,
    Triangle,
    Use,
    Cancel,
    Gift,
    Chart,
    Pause,
    Pick,
    Defib,
    Precision,
    Rotate,
    Advance,
    Skip,
    Move,
    Tabs,
    CycleTool,
}

/// What to draw for an action on a device: glyph ids (for tests) and a label.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Prompt {
    pub glyph: String,
    pub label: &'static str,
}

pub fn prompt(act: Act, device: Device, xbox: bool) -> Prompt {
    let g = |s: &str| Prompt { glyph: s.to_string(), label: "" };
    let ps = |ps: &str, xb: &str| if xbox { xb.to_string() } else { ps.to_string() };
    let pad = device == Device::Gamepad;
    let id = if pad {
        match act {
            Act::Confirm | Act::Advance => ps("cross", "A"),
            Act::Back | Act::Cancel => ps("circle", "B"),
            Act::Square | Act::Chart => ps("square", "X"),
            Act::Triangle | Act::Gift => ps("triangle", "Y"),
            Act::Use => ps("R2", "RT"),
            Act::Pause => ps("options", "Menu"),
            Act::Pick => "stick_l".into(),
            Act::Defib => ps("L2+R2", "LT+RT"),
            Act::Precision => ps("L2", "LT"),
            Act::Rotate | Act::Tabs | Act::CycleTool => ps("L1/R1", "LB/RB"),
            Act::Skip => ps("cross-hold", "A-hold"),
            Act::Move => "stick_r".into(),
        }
    } else {
        match act {
            Act::Confirm | Act::Advance => "Enter".into(),
            Act::Back => "Esc".into(),
            Act::Cancel => "Q".into(),
            Act::Square | Act::Chart => "Tab".into(),
            Act::Triangle | Act::Gift => "Space".into(),
            Act::Use => "LMB".into(),
            Act::Pause => "Esc".into(),
            Act::Pick => "1-8".into(),
            Act::Defib => "LMB+RMB".into(),
            Act::Precision => "Shift".into(),
            Act::Rotate => "Wheel".into(),
            Act::Tabs | Act::CycleTool => "Q/E".into(),
            Act::Skip => "Ctrl".into(),
            Act::Move => "WASD".into(),
        }
    };
    let label = match act {
        Act::Confirm => "Select",
        Act::Back => "Back",
        Act::Square | Act::Chart => "Chart",
        Act::Triangle | Act::Gift => "Gift",
        Act::Use => "Operate",
        Act::Cancel => "Let go",
        Act::Pause => "Pause",
        Act::Pick => "Instrument",
        Act::Defib => "Defibrillate",
        Act::Precision => "Precision",
        Act::Rotate => "Rotate",
        Act::Advance => "Continue",
        Act::Skip => "Skip",
        Act::Move => "Move",
        Act::Tabs => "Page",
        Act::CycleTool => "Cycle",
    };
    let mut p = g(&id);
    p.label = label;
    p
}

fn ps_color(id: &str) -> Color32 {
    match id {
        "cross" => Color32::from_rgb(110, 150, 255),
        "circle" => Color32::from_rgb(255, 100, 110),
        "square" => Color32::from_rgb(240, 150, 220),
        "triangle" => Color32::from_rgb(90, 220, 170),
        _ => Color32::from_rgb(210, 214, 224),
    }
}

fn xb_color(id: &str) -> Color32 {
    match id {
        "A" => Color32::from_rgb(110, 200, 90),
        "B" => Color32::from_rgb(235, 90, 80),
        "X" => Color32::from_rgb(90, 150, 240),
        "Y" => Color32::from_rgb(240, 200, 70),
        _ => Color32::from_rgb(210, 214, 224),
    }
}

/// Draws a glyph for `id` (see `prompt`) centred at `c`, `s` points across. Returns its width.
pub fn glyph(p: &Painter, id: &str, c: Pos2, s: f32, xbox: bool) -> f32 {
    let r = s * 0.5;
    let dark = Color32::from_rgb(24, 28, 36);
    let stroke = Stroke::new((s * 0.09).max(1.5), Color32::WHITE);
    let face = |p: &Painter, col: Color32| {
        p.circle_filled(c, r, dark);
        p.circle_stroke(c, r, Stroke::new((s * 0.07).max(1.5), col));
    };
    let font = FontId::proportional(s * 0.62);
    if xbox && matches!(id, "A" | "B" | "X" | "Y") {
        face(p, xb_color(id));
        p.text(c, Align2::CENTER_CENTER, id, font, xb_color(id));
        return s;
    }
    match id {
        "cross" | "circle" | "square" | "triangle" => {
            let col = ps_color(id);
            face(p, col);
            let k = r * 0.5;
            let st = Stroke::new((s * 0.1).max(2.0), col);
            match id {
                "cross" => {
                    p.line_segment([c + Vec2::new(-k, -k), c + Vec2::new(k, k)], st);
                    p.line_segment([c + Vec2::new(-k, k), c + Vec2::new(k, -k)], st);
                }
                "circle" => {
                    p.circle_stroke(c, k * 1.05, st);
                }
                "square" => {
                    p.rect_stroke(Rect::from_center_size(c, Vec2::splat(k * 1.9)), 1.0, st, StrokeKind::Middle);
                }
                _ => {
                    let pts = vec![c + Vec2::new(0.0, -k * 1.1), c + Vec2::new(k * 1.05, k * 0.8), c + Vec2::new(-k * 1.05, k * 0.8)];
                    p.add(Shape::closed_line(pts, st));
                }
            }
            s
        }
        "stick_l" | "stick_r" => {
            face(p, Color32::from_rgb(210, 214, 224));
            p.circle_filled(c, r * 0.5, Color32::from_rgb(210, 214, 224));
            let l = if id == "stick_l" { "L" } else { "R" };
            p.text(c, Align2::CENTER_CENTER, l, FontId::proportional(s * 0.5), dark);
            s
        }
        "A" | "B" | "X" | "Y" | "cross-hold" | "A-hold" => {
            face(p, Color32::WHITE);
            s
        }
        _ => {
            // Wide key or trigger shape with a label.
            let g = p.layout_no_wrap(id.to_string(), font.clone(), Color32::WHITE);
            let w = (g.size().x + s * 0.6).max(s);
            let rect = Rect::from_center_size(c, Vec2::new(w, s * 0.86));
            let kbd = !matches!(id, "L1" | "R1" | "L2" | "R2" | "LB" | "RB" | "LT" | "RT" | "options" | "Menu" | "L2+R2" | "LT+RT" | "L1/R1" | "LB/RB" | "stick");
            p.rect_filled(rect, if kbd { 5.0 } else { s * 0.4 }, Color32::from_rgb(36, 42, 54));
            p.rect_stroke(rect, if kbd { 5.0 } else { s * 0.4 }, stroke, StrokeKind::Middle);
            p.text(c, Align2::CENTER_CENTER, id, font, Color32::WHITE);
            w
        }
    }
}
