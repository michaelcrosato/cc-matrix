//! Button glyphs: one function says which glyph an action has, and the painter draws it.

use egui::{Color32, Pos2, Rect, Stroke, StrokeKind, vec2};
use pav_core::games::fit::ui_model::*;

use crate::Device;
use crate::fit_ui::{Input, View, c};

/// A glyph for a prompt.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Glyph {
    Cross,
    Circle,
    Square,
    Triangle,
    Letter(char, [u8; 3]),
    Pill(&'static str),
    Stick(char),
    Dpad,
    Key(&'static str),
    Mouse(MouseBit),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MouseBit {
    Left,
    Right,
    Both,
    Move,
}

/// The one function that says which glyph an action has on the device in use.
pub fn prompt(act: Act, input: Input, xbox: bool) -> Glyph {
    use Glyph as G;
    match input.device {
        Device::Gamepad | Device::Touch => match act {
            Act::Confirm => {
                if xbox {
                    G::Letter('A', [96, 200, 96])
                } else {
                    G::Cross
                }
            }
            Act::Back => {
                if xbox {
                    G::Letter('B', [230, 90, 90])
                } else {
                    G::Circle
                }
            }
            Act::Wave => {
                if xbox {
                    G::Letter('X', [90, 140, 230])
                } else {
                    G::Square
                }
            }
            Act::Schedule => {
                if xbox {
                    G::Letter('Y', [235, 200, 70])
                } else {
                    G::Triangle
                }
            }
            Act::Pause => G::Pill(if xbox { "Menu" } else { "Options" }),
            Act::StepL | Act::TabL => G::Pill(if xbox { "LB" } else { "L1" }),
            Act::StepR | Act::TabR => G::Pill(if xbox { "RB" } else { "R1" }),
            Act::Brace => G::Pill(if xbox { "LB+RB" } else { "L1+R1" }),
            Act::Lean | Act::Walk => G::Stick('L'),
            Act::Jog => G::Pill(if xbox { "RT" } else { "R2" }),
            Act::Menu | Act::MenuSide => G::Dpad,
            Act::Camera => G::Stick('R'),
        },
        Device::KeyboardMouse => {
            let m = input.mouse;
            match act {
                Act::Confirm => {
                    if m {
                        G::Mouse(MouseBit::Left)
                    } else {
                        G::Key("Space")
                    }
                }
                Act::Back => {
                    if m {
                        G::Mouse(MouseBit::Right)
                    } else {
                        G::Key("Esc")
                    }
                }
                Act::Wave => G::Key("F"),
                Act::Schedule => G::Key("Tab"),
                Act::Pause => G::Key("Esc"),
                Act::StepL => {
                    if m {
                        G::Mouse(MouseBit::Left)
                    } else {
                        G::Key("Q")
                    }
                }
                Act::StepR => {
                    if m {
                        G::Mouse(MouseBit::Right)
                    } else {
                        G::Key("E")
                    }
                }
                Act::TabL => G::Key("Q"),
                Act::TabR => G::Key("E"),
                Act::Brace => {
                    if m {
                        G::Mouse(MouseBit::Both)
                    } else {
                        G::Key("Q+E")
                    }
                }
                Act::Lean => {
                    if m {
                        G::Mouse(MouseBit::Move)
                    } else {
                        G::Key("W A S D")
                    }
                }
                Act::Walk => {
                    if m {
                        G::Mouse(MouseBit::Left)
                    } else {
                        G::Key("W A S D")
                    }
                }
                Act::Jog => G::Key("Shift"),
                Act::Menu => G::Key("W S"),
                Act::MenuSide => G::Key("A D"),
                Act::Camera => G::Mouse(MouseBit::Right),
            }
        }
    }
}

/// A glyph's name, for tests and the page's `__gameUi`.
pub fn glyph_name(g: Glyph) -> String {
    match g {
        Glyph::Cross => "Cross".into(),
        Glyph::Circle => "Circle".into(),
        Glyph::Square => "Square".into(),
        Glyph::Triangle => "Triangle".into(),
        Glyph::Letter(c, _) => c.to_string(),
        Glyph::Pill(s) | Glyph::Key(s) => s.to_string(),
        Glyph::Stick(c) => format!("{c} Stick"),
        Glyph::Dpad => "D-pad".into(),
        Glyph::Mouse(b) => format!("Mouse {b:?}"),
    }
}

impl View<'_> {
    pub(crate) fn glyph(&self, at: Pos2, g: Glyph, size: f32) -> f32 {
        // `at` is the glyph's left-middle; returns its width (points).
        let s = size * self.s;
        let r = s * 0.5;
        let center = at + vec2(r, 0.0);
        let dark = Color32::from_rgb(38, 42, 54);
        let face = |col: Color32| {
            self.p.circle_filled(center, r, dark);
            self.p.circle_stroke(center, r, Stroke::new(s * 0.05, col));
        };
        match g {
            Glyph::Cross => {
                face(Color32::from_rgb(130, 170, 240));
                let (k, st) = (r * 0.45, Stroke::new(s * 0.09, Color32::from_rgb(130, 170, 240)));
                self.p.line_segment([center + vec2(-k, -k), center + vec2(k, k)], st);
                self.p.line_segment([center + vec2(k, -k), center + vec2(-k, k)], st);
                s
            }
            Glyph::Circle => {
                face(Color32::from_rgb(240, 110, 120));
                self.p.circle_stroke(center, r * 0.5, Stroke::new(s * 0.09, Color32::from_rgb(240, 110, 120)));
                s
            }
            Glyph::Square => {
                face(Color32::from_rgb(230, 140, 200));
                let k = r * 0.42;
                self.p.rect_stroke(Rect::from_center_size(center, vec2(k * 2.0, k * 2.0)), 0.0, Stroke::new(s * 0.08, Color32::from_rgb(230, 140, 200)), StrokeKind::Middle);
                s
            }
            Glyph::Triangle => {
                face(Color32::from_rgb(110, 210, 170));
                let k = r * 0.5;
                let st = Stroke::new(s * 0.08, Color32::from_rgb(110, 210, 170));
                let (a, b, d) = (center + vec2(0.0, -k), center + vec2(-k, k * 0.75), center + vec2(k, k * 0.75));
                self.p.line_segment([a, b], st);
                self.p.line_segment([b, d], st);
                self.p.line_segment([d, a], st);
                s
            }
            Glyph::Letter(l, col) => {
                self.p.circle_filled(center, r, Color32::from_rgb(col[0], col[1], col[2]));
                self.text(center - vec2(0.0, s * 0.42), size * 0.68, Font::Title, Color32::WHITE, Align::Center, 0.0, &l.to_string());
                s
            }
            Glyph::Pill(t) => {
                let w = s * (0.34 + t.len() as f32 * 0.32);
                let rect = Rect::from_min_size(at - vec2(0.0, r * 0.82), vec2(w, s * 0.82));
                self.p.rect_filled(rect, r * 0.5, dark);
                self.text(rect.center() - vec2(0.0, s * 0.31), size * 0.5, Font::Title, Color32::WHITE, Align::Center, 0.0, t);
                w
            }
            Glyph::Stick(l) => {
                self.p.circle_filled(center, r, dark);
                self.p.circle_stroke(center, r * 0.62, Stroke::new(s * 0.05, Color32::from_rgb(160, 170, 190)));
                self.text(center - vec2(0.0, s * 0.31), size * 0.5, Font::Title, Color32::WHITE, Align::Center, 0.0, &l.to_string());
                s
            }
            Glyph::Dpad => {
                let (k, t) = (r * 0.95, r * 0.36);
                self.p.rect_filled(Rect::from_center_size(center, vec2(k * 2.0, t * 2.0)), t * 0.4, dark);
                self.p.rect_filled(Rect::from_center_size(center, vec2(t * 2.0, k * 2.0)), t * 0.4, dark);
                s
            }
            Glyph::Key(t) => {
                let w = s * (0.5 + t.len() as f32 * 0.3);
                let rect = Rect::from_min_size(at - vec2(0.0, r * 0.84), vec2(w, s * 0.84));
                self.p.rect_filled(rect.translate(vec2(0.0, s * 0.06)), s * 0.16, Color32::from_rgb(160, 170, 180));
                self.p.rect_filled(rect, s * 0.16, Color32::from_rgb(250, 250, 248));
                self.p.rect_stroke(rect, s * 0.16, Stroke::new(s * 0.03, Color32::from_rgb(120, 134, 148)), StrokeKind::Middle);
                self.text(rect.center() - vec2(0.0, s * 0.3), (size * 0.5).max(0.1), Font::Title, c(INK), Align::Center, 0.0, t);
                w
            }
            Glyph::Mouse(bit) => {
                let (w, h) = (s * 0.66, s * 0.96);
                let rect = Rect::from_center_size(at + vec2(w * 0.5, 0.0), vec2(w, h));
                self.p.rect_filled(rect, w * 0.46, Color32::from_rgb(250, 250, 248));
                let lit = Color32::from_rgb(255, 120, 110);
                let top = Rect::from_min_size(rect.min, vec2(w * 0.5, h * 0.46));
                let top_r = top.translate(vec2(w * 0.5, 0.0));
                match bit {
                    MouseBit::Left => {
                        self.p.rect_filled(top, w * 0.3, lit);
                    }
                    MouseBit::Right => {
                        self.p.rect_filled(top_r, w * 0.3, lit);
                    }
                    MouseBit::Both => {
                        self.p.rect_filled(top, w * 0.3, lit);
                        self.p.rect_filled(top_r, w * 0.3, lit);
                    }
                    MouseBit::Move => {
                        let (a, b) = (rect.center() + vec2(-w * 0.9, h * 0.1), rect.center() + vec2(w * 0.9, h * 0.1));
                        self.p.arrow(rect.center(), a - rect.center(), Stroke::new(s * 0.05, lit));
                        self.p.arrow(rect.center(), b - rect.center(), Stroke::new(s * 0.05, lit));
                    }
                }
                self.p.rect_stroke(rect, w * 0.46, Stroke::new(s * 0.04, Color32::from_rgb(90, 104, 120)), StrokeKind::Middle);
                w
            }
        }
    }

    pub(crate) fn glyph_width(&self, g: Glyph, size: f32) -> f32 {
        let s = size * self.s;
        match g {
            Glyph::Pill(t) => s * (0.34 + t.len() as f32 * 0.32),
            Glyph::Key(t) => s * (0.5 + t.len() as f32 * 0.3),
            Glyph::Mouse(_) => s * 0.66,
            _ => s,
        }
    }
}
