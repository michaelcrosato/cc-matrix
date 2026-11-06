//! One `prompt(action)` helper draws the glyph for the device used last: PlayStation shapes in their
//! colours, or Xbox letters if Settings says so, or keycaps and mouse buttons. It flips the moment
//! the player touches another device.

use egui::{Align2, Color32, FontId, Painter, Pos2, Rect, Stroke, StrokeKind, pos2, vec2};

use crate::Device;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Action {
    Confirm,
    Back,
    Use,
    Gift,
    Chart,
    Precision,
    Cancel,
    Pause,
    Defib,
    Aim,
    Pick,
    Rotate,
    Nav,
    Tabs,
    Skip,
    Ready,
    More,
    Join,
    Auto,
    /// A ring direction or digit.
    Ring(u8),
}

/// What it draws: an identifier for tests (`ps:cross`, `xb:a`, `key:enter`, `mouse:left`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Glyph {
    Cross,
    Circle,
    Square,
    Triangle,
    Pill(&'static str),
    Stick(&'static str),
    Letter(&'static str, Color32),
    Key(&'static str),
    Mouse(&'static str),
    Dir(u8),
}

pub fn glyphs_for(action: Action, device: Device, xbox: bool) -> Vec<Glyph> {
    use Action as A;
    use Glyph as G;
    let (a, b, x, y) = (
        G::Letter("A", Color32::from_rgb(90, 190, 80)),
        G::Letter("B", Color32::from_rgb(220, 70, 60)),
        G::Letter("X", Color32::from_rgb(70, 130, 230)),
        G::Letter("Y", Color32::from_rgb(235, 190, 60)),
    );
    match device {
        Device::Gamepad | Device::Touch => {
            let face = |ps: Glyph, xb: Glyph| if xbox { xb } else { ps };
            let shoulder = |ps: &'static str, xb: &'static str| G::Pill(if xbox { xb } else { ps });
            match action {
                A::Confirm | A::Ready | A::Join => vec![face(G::Cross, a)],
                A::Back | A::Cancel => vec![face(G::Circle, b)],
                A::Use => vec![shoulder("R2", "RT")],
                A::Gift | A::More | A::Auto => vec![face(G::Triangle, y)],
                A::Chart => vec![face(G::Square, x)],
                A::Precision => vec![shoulder("L2", "LT")],
                A::Pause => vec![G::Pill(if xbox { "MENU" } else { "OPTIONS" })],
                A::Defib => vec![shoulder("L2", "LT"), shoulder("R2", "RT")],
                A::Aim => vec![G::Stick("R")],
                A::Pick => vec![G::Stick("L")],
                A::Rotate => vec![shoulder("L1", "LB"), shoulder("R1", "RB")],
                A::Nav => vec![G::Stick("D")],
                A::Tabs => vec![shoulder("L1", "LB"), shoulder("R1", "RB")],
                A::Skip => vec![face(G::Cross, a)],
                A::Ring(k) => vec![G::Dir(k)],
            }
        }
        Device::KeyboardMouse => match action {
            A::Confirm | A::Skip => vec![G::Key("Enter")],
            A::Ready => vec![G::Key("Enter")],
            A::Join => vec![G::Key("Enter")],
            A::Back => vec![G::Key("Esc")],
            A::Cancel => vec![G::Mouse("right"), G::Key("Q")],
            A::Use => vec![G::Mouse("left")],
            A::Gift => vec![G::Key("Space")],
            A::More => vec![G::Key("M")],
            A::Auto => vec![G::Key("F")],
            A::Chart => vec![G::Key("Tab")],
            A::Precision => vec![G::Key("Shift")],
            A::Pause => vec![G::Key("Esc")],
            A::Defib => vec![G::Mouse("both")],
            A::Aim => vec![G::Mouse("move")],
            A::Pick => vec![G::Key("1-8"), G::Mouse("wheel")],
            A::Rotate => vec![G::Mouse("wheel")],
            A::Nav => vec![G::Key("Arrows")],
            A::Tabs => vec![G::Key("Q"), G::Key("E")],
            A::Ring(k) => vec![G::Key(["1", "2", "3", "4", "5", "6", "7", "8"][(k as usize).min(7)])],
        },
    }
}

impl Glyph {
    pub fn id(&self, xbox: bool) -> String {
        match self {
            Glyph::Cross => "ps:cross".into(),
            Glyph::Circle => "ps:circle".into(),
            Glyph::Square => "ps:square".into(),
            Glyph::Triangle => "ps:triangle".into(),
            Glyph::Pill(s) => format!("{}:{}", if xbox { "xb" } else { "ps" }, s.to_lowercase()),
            Glyph::Stick(s) => format!("stick:{}", s.to_lowercase()),
            Glyph::Letter(s, _) => format!("xb:{}", s.to_lowercase()),
            Glyph::Key(s) => format!("key:{}", s.to_lowercase()),
            Glyph::Mouse(s) => format!("mouse:{s}"),
            Glyph::Dir(k) => format!("dir:{k}"),
        }
    }

    pub fn width(&self, h: f32) -> f32 {
        match self {
            Glyph::Pill(s) => h * 0.55 * (s.len() as f32).max(1.6) + h * 0.3,
            Glyph::Key(s) => (h * 0.5 * s.len() as f32 + h * 0.4).max(h),
            _ => h,
        }
    }

    /// Draws the glyph with its left edge at `at`, centred vertically on `at.y`.
    pub fn draw(&self, p: &Painter, at: Pos2, h: f32) {
        let r = h * 0.5;
        let c = at + vec2(r, 0.0);
        let font = FontId::proportional(h * 0.62);
        match self {
            Glyph::Cross | Glyph::Circle | Glyph::Square | Glyph::Triangle => {
                p.circle_filled(c, r, Color32::from_rgb(20, 24, 30));
                p.circle_stroke(c, r, Stroke::new(2.0, Color32::from_rgb(120, 130, 140)));
                let s = r * 0.52;
                match self {
                    Glyph::Cross => {
                        let col = Stroke::new(h * 0.1, Color32::from_rgb(120, 170, 240));
                        p.line_segment([c + vec2(-s, -s), c + vec2(s, s)], col);
                        p.line_segment([c + vec2(-s, s), c + vec2(s, -s)], col);
                    }
                    Glyph::Circle => {
                        p.circle_stroke(c, s, Stroke::new(h * 0.09, Color32::from_rgb(240, 100, 110)));
                    }
                    Glyph::Square => {
                        p.rect_stroke(Rect::from_center_size(c, vec2(s * 1.7, s * 1.7)), 1.0, Stroke::new(h * 0.08, Color32::from_rgb(230, 130, 200)), StrokeKind::Middle);
                    }
                    _ => {
                        let col = Stroke::new(h * 0.08, Color32::from_rgb(90, 220, 170));
                        let (a, b, d) = (c + vec2(0.0, -s), c + vec2(s, s * 0.8), c + vec2(-s, s * 0.8));
                        p.line_segment([a, b], col);
                        p.line_segment([b, d], col);
                        p.line_segment([d, a], col);
                    }
                }
            }
            Glyph::Letter(s, col) => {
                p.circle_filled(c, r, *col);
                p.text(c, Align2::CENTER_CENTER, *s, font, Color32::from_rgb(10, 12, 14));
            }
            Glyph::Pill(s) => {
                let w = self.width(h);
                let rect = Rect::from_min_size(at + vec2(0.0, -h * 0.42), vec2(w, h * 0.84));
                p.rect_filled(rect, h * 0.3, Color32::from_rgb(22, 26, 32));
                p.rect_stroke(rect, h * 0.3, Stroke::new(2.0, Color32::from_rgb(170, 180, 190)), StrokeKind::Inside);
                p.text(rect.center(), Align2::CENTER_CENTER, *s, FontId::proportional(h * 0.5), Color32::WHITE);
            }
            Glyph::Stick(s) => {
                p.circle_filled(c, r, Color32::from_rgb(24, 28, 34));
                p.circle_stroke(c, r * 0.72, Stroke::new(2.0, Color32::from_rgb(170, 180, 190)));
                let tag = if *s == "D" { "✛" } else { s };
                p.text(c, Align2::CENTER_CENTER, tag, FontId::proportional(h * 0.5), Color32::WHITE);
            }
            Glyph::Key(s) => {
                let w = self.width(h);
                let rect = Rect::from_min_size(at + vec2(0.0, -h * 0.45), vec2(w, h * 0.9));
                p.rect_filled(rect.translate(vec2(0.0, 3.0)), 6.0, Color32::from_rgb(90, 96, 104));
                p.rect_filled(rect, 6.0, Color32::from_rgb(236, 238, 240));
                p.text(rect.center(), Align2::CENTER_CENTER, *s, FontId::proportional(h * 0.52), Color32::from_rgb(18, 22, 26));
            }
            Glyph::Mouse(which) => {
                let body = Rect::from_center_size(c, vec2(h * 0.66, h * 0.96));
                p.rect_filled(body, h * 0.3, Color32::from_rgb(232, 234, 238));
                let top = |left: bool| Rect::from_min_max(pos2(if left { body.left() } else { body.center().x }, body.top()), pos2(if left { body.center().x } else { body.right() }, body.top() + body.height() * 0.42));
                let hi = Color32::from_rgb(232, 68, 58);
                match *which {
                    "left" => {
                        p.rect_filled(top(true), h * 0.12, hi);
                    }
                    "right" => {
                        p.rect_filled(top(false), h * 0.12, hi);
                    }
                    "both" => {
                        p.rect_filled(top(true), h * 0.12, hi);
                        p.rect_filled(top(false), h * 0.12, hi);
                    }
                    "wheel" => {
                        p.rect_filled(Rect::from_center_size(body.center() - vec2(0.0, h * 0.22), vec2(h * 0.1, h * 0.24)), 2.0, hi);
                    }
                    _ => {
                        p.circle_stroke(body.center(), h * 0.18, Stroke::new(2.0, hi));
                    }
                }
                p.line_segment([pos2(body.center().x, body.top()), pos2(body.center().x, body.top() + body.height() * 0.42)], Stroke::new(1.5, Color32::from_rgb(60, 66, 72)));
            }
            Glyph::Dir(k) => {
                // A compass of eight with this direction lit.
                p.circle_filled(c, r, Color32::from_rgb(24, 28, 34));
                let a = (*k as f32) * std::f32::consts::FRAC_PI_4 - std::f32::consts::FRAC_PI_2;
                let d = egui::Vec2::angled(a);
                p.line_segment([c, c + d * r * 0.85], Stroke::new(h * 0.14, Color32::from_rgb(120, 226, 214)));
                p.circle_stroke(c, r, Stroke::new(1.5, Color32::from_rgb(140, 150, 160)));
            }
        }
    }
}

/// Draws an action's glyphs at `at`; returns the width used. Records their ids.
pub fn prompt(p: &Painter, at: Pos2, action: Action, device: Device, xbox: bool, h: f32, seen: &mut Vec<String>) -> f32 {
    let mut x = 0.0;
    for g in glyphs_for(action, device, xbox) {
        g.draw(p, at + vec2(x, 0.0), h);
        x += g.width(h) + h * 0.14;
        let id = g.id(xbox);
        if !seen.contains(&id) {
            seen.push(id);
        }
    }
    x
}
