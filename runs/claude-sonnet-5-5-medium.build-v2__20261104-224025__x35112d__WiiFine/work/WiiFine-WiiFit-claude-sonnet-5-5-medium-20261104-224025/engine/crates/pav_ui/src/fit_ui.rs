//! Wii Fine's UI: a pure view of the game's `UiFrame`, painted with egui. It returns what the
//! pointer did (hover, click, slider drag) for the game to read as `InputFrame.ui`, and the rects
//! of every item for browser tests.

use egui::{Align2, Color32, FontFamily, FontId, Painter, Pos2, Rect, Stroke, StrokeKind, vec2};
use glam::Mat4;
use pav_core::games::fit::ui_model::*;
use pav_core::input::UiEvent;

use crate::Device;
use crate::glyphs::{self, Glyph};

pub const INK: Color32 = Color32::from_rgb(0x26, 0x3e, 0x54);
pub const TEAL: Color32 = Color32::from_rgb(0x46, 0xbe, 0xc8);
pub const MINT: Color32 = Color32::from_rgb(0x78, 0xdc, 0xaa);
pub const CORAL: Color32 = Color32::from_rgb(0xff, 0x78, 0x6e);
pub const SUN: Color32 = Color32::from_rgb(0xff, 0xd1, 0x66);
pub const CARD: Color32 = Color32::from_rgb(0xff, 0xff, 0xff);
pub const PALE: Color32 = Color32::from_rgb(0xe8, 0xf4, 0xf6);

pub fn title_font(px: f32) -> FontId {
    FontId::new(px, FontFamily::Name("title".into()))
}
pub fn body_font(px: f32) -> FontId {
    FontId::new(px, FontFamily::Name("body".into()))
}

/// Installs Fredoka (titles) and Nunito (body). Call before the first pass of a context.
pub fn install_fonts(ctx: &egui::Context) {
    let mut fonts = egui::FontDefinitions::default();
    fonts.font_data.insert("fredoka".into(), std::sync::Arc::new(egui::FontData::from_static(include_bytes!("../fonts/Fredoka_600SemiBold.ttf"))));
    fonts.font_data.insert("nunito".into(), std::sync::Arc::new(egui::FontData::from_static(include_bytes!("../fonts/Nunito_700Bold.ttf"))));
    fonts.families.insert(FontFamily::Name("title".into()), vec!["fredoka".into()]);
    fonts.families.insert(FontFamily::Name("body".into()), vec!["nunito".into()]);
    ctx.set_fonts(fonts);
}

/// What the UI gives back each frame.
#[derive(Clone, Debug, Default)]
pub struct UiOut {
    pub event: Option<UiEvent>,
    /// Every focusable item's rect `[x0, y0, x1, y1]` in points, with its label.
    pub rects: Vec<([f32; 4], String)>,
    /// The smallest text drawn, in 1080p pixels (the 34 px rule).
    pub min_text: f32,
    pub texts: Vec<String>,
    pub glyphs: Vec<String>,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct Pointer {
    pub pos: Option<Pos2>,
    pub clicked: bool,
    pub right_clicked: bool,
    pub down: bool,
    /// True once the mouse moved (used to hide the cursor when a pad is in use).
    pub moved: bool,
}

struct Cx<'a> {
    p: Painter,
    s: f32,
    out: &'a mut UiOut,
    device: Device,
    xbox: bool,
    time: f64,
    ptr: Pointer,
}

impl Cx<'_> {
    /// Draws text; sizes below the rule are lifted to it (body 34 px, 1080p).
    fn text(&mut self, pos: Pos2, align: Align2, s: &str, px: f32, title: bool, color: Color32) -> Rect {
        let px = px.max(34.0);
        self.out.min_text = if self.out.min_text == 0.0 { px } else { self.out.min_text.min(px) };
        self.out.texts.push(s.to_string());
        let font = if title { title_font(px * self.s) } else { body_font(px * self.s) };
        if color == Color32::WHITE {
            // white text sits on the scene: a soft dark edge keeps it readable
            let d = (2.5 * self.s).max(1.0);
            self.p.text(pos + vec2(d, d), align, s, font.clone(), Color32::from_rgba_unmultiplied(38, 62, 84, 190));
        }
        self.p.text(pos, align, s, font, color)
    }

    fn glyph_row(&mut self, prompts: &[Prompt], center: Pos2) {
        let h = 54.0 * self.s;
        // measure first: glyph widths are approximate (label width + glyph)
        let mut items: Vec<(Glyph, String, f32)> = vec![];
        let mut total = 0.0;
        for pr in prompts {
            let g = glyphs::prompt(pr.act, self.device, self.xbox);
            let gw = glyph_width(&g, h);
            let tw = pr.label.chars().count() as f32 * 19.0 * self.s;
            total += gw + 14.0 * self.s + tw + 44.0 * self.s;
            items.push((g, pr.label.clone(), gw));
        }
        let mut x = center.x - total / 2.0;
        for (g, label, gw) in items {
            self.out.glyphs.push(g.label());
            let w = glyphs::draw(&self.p, &g, Pos2::new(x, center.y), h, &body_font(h));
            let _ = gw;
            let r = self.text(Pos2::new(x + w + 14.0 * self.s, center.y), Align2::LEFT_CENTER, &label, 34.0, false, INK);
            x = r.max.x + 44.0 * self.s;
        }
    }

    fn card(&mut self, r: Rect, radius: f32) {
        self.p.rect_filled(r.translate(vec2(0.0, 10.0 * self.s)).expand(2.0), radius * self.s, Color32::from_black_alpha(38));
        self.p.rect_filled(r, radius * self.s, CARD);
    }

    fn star(&mut self, c: Pos2, r: f32, on: bool) {
        let mut pts = vec![];
        for i in 0..10 {
            let a = -std::f32::consts::FRAC_PI_2 + i as f32 * std::f32::consts::PI / 5.0;
            let rr = if i % 2 == 0 { r } else { r * 0.45 };
            pts.push(c + vec2(a.cos() * rr, a.sin() * rr));
        }
        let fill = if on { SUN } else { Color32::from_rgb(222, 230, 236) };
        self.p.add(egui::Shape::convex_polygon(pts, fill, Stroke::new(3.0, if on { Color32::from_rgb(220, 160, 40) } else { Color32::from_rgb(190, 200, 208) })));
    }

    fn hit(&mut self, rect: Rect, idx: usize, label: &str, hovered: &mut Option<u16>, clicked: &mut Option<u16>) {
        self.out.rects.push(([rect.min.x, rect.min.y, rect.max.x, rect.max.y], label.to_string()));
        if let Some(pos) = self.ptr.pos {
            if rect.contains(pos) {
                *hovered = Some(idx as u16);
                if self.ptr.clicked {
                    *clicked = Some(idx as u16);
                }
            }
        }
    }
}

fn glyph_width(g: &Glyph, h: f32) -> f32 {
    match g {
        Glyph::Pill(_) => h * 1.5,
        Glyph::Options(_) => h * 3.1,
        Glyph::Pair(..) => h * 3.5,
        Glyph::Keys(k) => k.iter().map(|s| (h * 0.55 * s.chars().count() as f32 + h * 0.5).max(h) + h * 0.15).sum::<f32>(),
        Glyph::Mouse(_) => h * 0.75,
        _ => h,
    }
}

/// Draws a frame. `vp` projects world labels; `size` is the screen in points.
pub fn draw(ctx: &egui::Context, f: &UiFrame, device: Device, vp: Mat4, size: egui::Vec2, ptr: Pointer) -> UiOut {
    let mut out = UiOut::default();
    let s = (size.x / 1920.0).min(size.y / 1080.0).max(0.05);
    let layer = egui::LayerId::new(egui::Order::Foreground, egui::Id::new("fit_ui"));
    let time = ctx.input(|i| i.time);
    let mut cx = Cx { p: ctx.layer_painter(layer), s, out: &mut out, device, xbox: f.xbox, time, ptr };
    let screen = Rect::from_min_size(Pos2::ZERO, size);
    let mut hovered = None;
    let mut clicked = None;
    let mut slider = None;

    if f.dim > 0.0 {
        cx.p.rect_filled(screen, 0.0, Color32::from_black_alpha((f.dim * 245.0) as u8));
    }

    match f.layout {
        Layout::None => {}
        Layout::List | Layout::Pages | Layout::Result | Layout::Calendar | Layout::Report => {
            draw_panel(&mut cx, f, screen, &mut hovered, &mut clicked, &mut slider);
        }
        Layout::Cards => draw_cards(&mut cx, f, screen, &mut hovered, &mut clicked),
    }
    if let Some(h) = &f.hud {
        draw_hud(&mut cx, f, h, screen, vp);
    }
    for l in &f.labels {
        if let Some(p) = project(vp, size, l.pos) {
            let r = cx.text(p, Align2::CENTER_BOTTOM, &l.text, 34.0, false, INK);
            if let Some(a) = l.prompt {
                let g = glyphs::prompt(a, cx.device, cx.xbox);
                glyphs::draw(&cx.p, &g, Pos2::new(r.center().x - 27.0 * s, r.min.y - 36.0 * s), 54.0 * s, &body_font(54.0 * s));
            }
        }
    }
    if let Some(d) = &f.dialog {
        draw_dialog(&mut cx, d, screen);
    }
    if !f.big_text.is_empty() {
        let c = screen.center();
        let r = Rect::from_center_size(c, vec2(760.0, 520.0) * s);
        cx.p.rect_filled(r, 60.0 * s, Color32::from_white_alpha(235));
        cx.p.rect_stroke(r, 60.0 * s, Stroke::new(12.0 * s, CORAL), StrokeKind::Inside);
        cx.text(c, Align2::CENTER_CENTER, &f.big_text, 190.0, true, CORAL);
    }
    if !f.toast.is_empty() {
        let r = Rect::from_center_size(Pos2::new(screen.center().x, screen.max.y - 250.0 * s), vec2(1300.0, 84.0) * s);
        cx.p.rect_filled(r, 42.0 * s, Color32::from_rgba_unmultiplied(38, 62, 84, 225));
        cx.text(r.center(), Align2::CENTER_CENTER, &f.toast, 34.0, false, Color32::WHITE);
    }
    if let Some((lean, held)) = f.dev_input {
        let r = Rect::from_min_size(Pos2::new(screen.max.x - 520.0 * s, 220.0 * s), vec2(480.0, 140.0) * s);
        cx.p.rect_filled(r, 24.0 * s, Color32::from_black_alpha(150));
        cx.text(r.min + vec2(24.0 * s, 40.0 * s), Align2::LEFT_CENTER, &format!("lean {:+.2} {:+.2}", lean[0], lean[1]), 34.0, false, Color32::WHITE);
        cx.text(r.min + vec2(24.0 * s, 100.0 * s), Align2::LEFT_CENTER, &format!("held {:#x}", held), 34.0, false, Color32::WHITE);
    }
    if !f.dev_trace.is_empty() {
        let r = Rect::from_min_size(Pos2::new(40.0 * s, screen.max.y - 420.0 * s), vec2(300.0, 300.0) * s);
        cx.p.rect_filled(r, 24.0 * s, Color32::from_black_alpha(110));
        let pts: Vec<Pos2> = f.dev_trace.iter().map(|t| r.center() + vec2(t[0], -t[1]) * 130.0 * s).collect();
        cx.p.add(egui::Shape::line(pts, Stroke::new(3.0 * s, SUN)));
    }
    if !f.stats.is_empty() {
        cx.text(Pos2::new(40.0 * s, screen.max.y - 40.0 * s), Align2::LEFT_CENTER, &f.stats, 34.0, false, Color32::WHITE);
    }
    if f.demo {
        let r = Rect::from_min_size(Pos2::new(40.0 * s, 40.0 * s), vec2(260.0, 76.0) * s);
        cx.p.rect_filled(r, 38.0 * s, CORAL);
        cx.text(r.center(), Align2::CENTER_CENTER, "DEMO", 44.0, true, Color32::WHITE);
        let blink = ((cx.time * 1.6) as i64) % 2 == 0;
        if blink {
            cx.text(Pos2::new(screen.center().x, screen.max.y - 90.0 * s), Align2::CENTER_CENTER, "Press any button", 44.0, true, Color32::WHITE);
        }
    }
    if f.touch_card {
        cx.p.rect_filled(screen, 0.0, Color32::from_black_alpha(120));
        let r = Rect::from_center_size(screen.center(), vec2(1200.0, 360.0) * s);
        cx.card(r, 36.0);
        cx.text(r.center() - vec2(0.0, 50.0 * s), Align2::CENTER_CENTER, "Controller or keyboard required", 64.0, true, INK);
        cx.text(r.center() + vec2(0.0, 70.0 * s), Align2::CENTER_CENTER, "Settings", 44.0, false, TEAL);
    }
    let _ = (hovered, clicked, slider);
    let event = if let Some(c) = clicked {
        Some(UiEvent::Click(c))
    } else if let Some(sl) = slider {
        Some(UiEvent::Slider(sl.0, sl.1))
    } else if ptr.right_clicked {
        Some(UiEvent::Back)
    } else {
        hovered.filter(|_| ptr.moved).map(UiEvent::Hover)
    };
    out.event = event;
    out
}

fn project(vp: Mat4, size: egui::Vec2, p: glam::Vec3) -> Option<Pos2> {
    let c = vp * p.extend(1.0);
    if c.w <= 0.0 {
        return None;
    }
    let n = c.truncate() / c.w;
    if n.x.abs() > 1.2 || n.y.abs() > 1.2 {
        return None;
    }
    Some(Pos2::new((n.x * 0.5 + 0.5) * size.x, (1.0 - (n.y * 0.5 + 0.5)) * size.y))
}

fn draw_panel(cx: &mut Cx, f: &UiFrame, screen: Rect, hovered: &mut Option<u16>, clicked: &mut Option<u16>, slider: &mut Option<(u16, f32)>) {
    let s = cx.s;
    let rows = f.items.len().min(6).max(1);
    let has_lines = !f.lines.is_empty();
    let big_lines = matches!(f.layout, Layout::Result | Layout::Report | Layout::Calendar);
    let page_rows = if matches!(f.layout, Layout::Pages) { f.lines.len().min(8) as f32 } else { 0.0 };
    let h = (290.0 + rows as f32 * 98.0 + page_rows * 54.0 + if has_lines && page_rows == 0.0 { 110.0 * f.lines.len().min(3) as f32 } else { 0.0 } + if big_lines { 440.0 } else { 0.0 } + if !f.tabs.is_empty() { 100.0 } else { 0.0 }).min(980.0);
    let turntable = f.screen == "CheckIn" || f.screen == "Wardrobe";
    let w = if matches!(f.layout, Layout::Pages | Layout::Calendar) { 1500.0 } else if turntable { 900.0 } else { 1100.0 };
    let shift = if turntable { 430.0 } else { 0.0 };
    let r = Rect::from_center_size(screen.center() + vec2(shift * s, 10.0 * s), vec2(w, h) * s);
    cx.card(r, 36.0);
    let top = r.min.y + 90.0 * s;
    cx.text(Pos2::new(r.center().x, top), Align2::CENTER_CENTER, &f.title, 72.0, true, INK);
    let mut y = top + 70.0 * s;
    if !f.subtitle.is_empty() {
        cx.text(Pos2::new(r.center().x, y), Align2::CENTER_CENTER, &f.subtitle, 38.0, false, TEAL);
        y += 70.0 * s;
    }
    if !f.tabs.is_empty() {
        let n = f.tabs.len();
        let tw = 1000.0 * s / n as f32;
        for (i, t) in f.tabs.iter().enumerate() {
            let rr = Rect::from_min_size(Pos2::new(r.center().x - 500.0 * s + i as f32 * tw, y - 36.0 * s), vec2(tw - 8.0 * s, 64.0 * s));
            let on = i == f.tab;
            cx.p.rect_filled(rr, 32.0 * s, if on { TEAL } else { PALE });
            let label = t.split_whitespace().next().unwrap_or(t).to_string();
            cx.text(rr.center(), Align2::CENTER_CENTER, &label, 34.0, false, if on { Color32::WHITE } else { INK });
        }
        y += 90.0 * s;
    }
    match f.layout {
        Layout::Result => {
            let score = f.lines.first().cloned().unwrap_or_default();
            cx.text(Pos2::new(r.center().x, y + 30.0 * s), Align2::CENTER_CENTER, &score, 150.0, true, CORAL);
            let stars: i32 = f.lines.get(1).and_then(|x| x.parse().ok()).unwrap_or(0);
            for i in 0..3 {
                cx.star(Pos2::new(r.center().x + (i as f32 - 1.0) * 130.0 * s, y + 150.0 * s), 56.0 * s, i < stars);
            }
            y += 230.0 * s;
            for l in f.lines.iter().skip(2).take(4) {
                if !l.is_empty() {
                    let (a, b) = split_lines(l, 66);
                    cx.text(Pos2::new(r.center().x, y), Align2::CENTER_CENTER, &a, 36.0, false, INK);
                    y += 48.0 * s;
                    if !b.is_empty() {
                        cx.text(Pos2::new(r.center().x, y), Align2::CENTER_CENTER, &b, 36.0, false, INK);
                        y += 48.0 * s;
                    }
                }
            }
            y += 20.0 * s;
        }
        Layout::Report => {
            if let Some(rep) = &f.report {
                cx.text(Pos2::new(r.center().x, y + 70.0 * s), Align2::CENTER_CENTER, &format!("{}", rep.age), 230.0, true, if rep.rolling { CORAL } else { TEAL });
                cx.text(Pos2::new(r.center().x, y + 190.0 * s), Align2::CENTER_CENTER, "Balance Age", 40.0, false, INK);
                for (i, a) in rep.spark.iter().take(5).enumerate() {
                    let x = r.center().x + (i as f32 - 2.0) * 120.0 * s;
                    let yy = y + 290.0 * s - ((*a as f32 - 20.0) / 60.0).clamp(0.0, 1.0) * 60.0 * s;
                    cx.p.circle_filled(Pos2::new(x, yy), 16.0 * s, if i + 1 == rep.spark.len() { CORAL } else { TEAL });
                }
                let (a, b) = split_lines(&rep.comment, 56);
                cx.text(Pos2::new(r.center().x, y + 370.0 * s), Align2::CENTER_CENTER, &a, 34.0, false, INK);
                if !b.is_empty() {
                    cx.text(Pos2::new(r.center().x, y + 418.0 * s), Align2::CENTER_CENTER, &b, 34.0, false, INK);
                }
                y += 450.0 * s;
            }
        }
        Layout::Calendar => {
            for (i, l) in f.lines.iter().take(5).enumerate() {
                let (d, st) = l.split_once('|').unwrap_or((l, ""));
                let rr = Rect::from_min_size(Pos2::new(r.min.x + 70.0 * s + i as f32 * 270.0 * s, y), vec2(240.0, 250.0) * s);
                cx.p.rect_filled(rr, 28.0 * s, PALE);
                cx.text(rr.center() - vec2(0.0, 60.0 * s), Align2::CENTER_CENTER, d, 44.0, true, INK);
                if st == "STAMPED" {
                    let c = rr.center() + vec2(0.0, 40.0 * s);
                    cx.p.circle_stroke(c, 70.0 * s, Stroke::new(10.0 * s, CORAL));
                    cx.text(c, Align2::CENTER_CENTER, "OK", 56.0, true, CORAL);
                } else if st == "TODAY" {
                    cx.text(rr.center() + vec2(0.0, 50.0 * s), Align2::CENTER_CENTER, "Today", 40.0, false, TEAL);
                }
            }
            y += 290.0 * s;
            if let Some(l) = f.lines.get(5) {
                cx.text(Pos2::new(r.center().x, y), Align2::CENTER_CENTER, l, 36.0, false, INK);
                y += 60.0 * s;
            }
        }
        Layout::Pages => {
            for l in f.lines.iter().take(8) {
                cx.text(Pos2::new(r.min.x + 90.0 * s, y), Align2::LEFT_CENTER, l, 36.0, false, INK);
                y += 54.0 * s;
            }
            y += 20.0 * s;
        }
        _ => {
            for l in f.lines.iter().take(4) {
                let (a, b) = split_lines(l, 48);
                cx.text(Pos2::new(r.center().x, y), Align2::CENTER_CENTER, &a, 36.0, false, INK);
                y += 56.0 * s;
                if !b.is_empty() {
                    cx.text(Pos2::new(r.center().x, y), Align2::CENTER_CENTER, &b, 36.0, false, INK);
                    y += 56.0 * s;
                }
            }
            y += 20.0 * s;
        }
    }
    // items
    let first = if f.focus >= 6 { f.focus - 5 } else { 0 };
    for (n, it) in f.items.iter().enumerate().skip(first).take(6) {
        let i = n;
        let iw = if turntable { 780.0 } else { 900.0 };
        let rr = Rect::from_min_size(Pos2::new(r.center().x - iw / 2.0 * s, y), vec2(iw, 84.0) * s);
        let focused = i == f.focus;
        draw_item(cx, it, rr, focused, i, hovered, clicked, slider);
        y += 98.0 * s;
    }
    // prompts
    cx.glyph_row(&f.prompts, Pos2::new(screen.center().x, screen.max.y - 70.0 * s));
}

fn split_lines(t: &str, width: usize) -> (String, String) {
    if t.chars().count() <= width {
        return (t.to_string(), String::new());
    }
    let mut cut = width;
    let chars: Vec<char> = t.chars().collect();
    while cut > 0 && chars[cut] != ' ' {
        cut -= 1;
    }
    if cut == 0 {
        cut = width;
    }
    (chars[..cut].iter().collect::<String>().trim().to_string(), chars[cut..].iter().collect::<String>().trim().to_string())
}

fn draw_item(cx: &mut Cx, it: &Item, rr: Rect, focused: bool, i: usize, hovered: &mut Option<u16>, clicked: &mut Option<u16>, slider: &mut Option<(u16, f32)>) {
    let s = cx.s;
    let bounce = if focused { ((cx.time * 6.0).sin() as f32 * 0.008) + 1.05 } else { 1.0 };
    let r = Rect::from_center_size(rr.center(), rr.size() * bounce);
    let accent = if it.color.is_empty() { None } else { Some(hex(&it.color)) };
    let fill = if !it.enabled { Color32::from_rgb(240, 244, 246) } else if focused { Color32::from_rgb(232, 250, 250) } else { PALE };
    cx.p.rect_filled(r, 28.0 * s, fill);
    if focused {
        cx.p.rect_stroke(r, 28.0 * s, Stroke::new(8.0 * s, TEAL), StrokeKind::Outside);
    }
    if let Some(a) = accent {
        cx.p.circle_filled(Pos2::new(r.min.x + 36.0 * s, r.center().y), 14.0 * s, a);
    }
    let col = if it.enabled { INK } else { Color32::from_rgb(150, 165, 175) };
    let lx = r.min.x + if accent.is_some() { 70.0 } else { 32.0 } * s;
    match it.kind {
        ItemKind::Slider => {
            cx.text(Pos2::new(lx, r.center().y), Align2::LEFT_CENTER, &it.label, 34.0, false, col);
            let bar = Rect::from_min_size(Pos2::new(r.min.x + 430.0 * s, r.center().y - 12.0 * s), vec2(300.0 * s, 24.0 * s));
            cx.p.rect_filled(bar, 12.0 * s, Color32::from_rgb(210, 226, 232));
            let fill = Rect::from_min_size(bar.min, vec2(bar.width() * it.value.clamp(0.0, 1.0), bar.height()));
            cx.p.rect_filled(fill, 12.0 * s, TEAL);
            cx.p.circle_filled(Pos2::new(fill.max.x, bar.center().y), 18.0 * s, Color32::WHITE);
            cx.p.circle_stroke(Pos2::new(fill.max.x, bar.center().y), 18.0 * s, Stroke::new(4.0 * s, TEAL));
            cx.text(Pos2::new(r.max.x - 28.0 * s, r.center().y), Align2::RIGHT_CENTER, &it.value_text, 34.0, false, col);
            // dragging
            if let Some(pos) = cx.ptr.pos {
                if cx.ptr.down && bar.expand2(vec2(20.0 * s, 24.0 * s)).contains(pos) {
                    *slider = Some((i as u16, ((pos.x - bar.min.x) / bar.width()).clamp(0.0, 1.0)));
                }
            }
        }
        ItemKind::Choice => {
            cx.text(Pos2::new(lx, r.center().y), Align2::LEFT_CENTER, &it.label, 34.0, false, col);
            let txt = format!("\u{25c0}  {}  \u{25b6}", it.value_text);
            cx.text(Pos2::new(r.max.x - 28.0 * s, r.center().y), Align2::RIGHT_CENTER, &txt, 34.0, false, if focused { TEAL } else { col });
        }
        _ => {
            if it.stars >= 0 {
                cx.text(Pos2::new(lx, r.center().y), Align2::LEFT_CENTER, &it.label, 34.0, false, col);
                for k in 0..3 {
                    cx.star(Pos2::new(r.max.x - 200.0 * s + k as f32 * 52.0 * s, r.center().y), 20.0 * s, (k as i8) < it.stars);
                }
                if !it.sub.is_empty() {
                    cx.text(Pos2::new(r.max.x - 250.0 * s, r.center().y), Align2::RIGHT_CENTER, &it.sub, 34.0, false, TEAL);
                }
            } else {
                cx.text(r.center(), Align2::CENTER_CENTER, &it.label, 38.0, false, col);
                if !it.sub.is_empty() {
                    cx.text(Pos2::new(r.max.x - 28.0 * s, r.center().y), Align2::RIGHT_CENTER, &it.sub, 34.0, false, TEAL);
                }
            }
        }
    }
    if it.enabled {
        cx.hit(r, i, &it.label, hovered, clicked);
    }
}

fn hex(s: &str) -> Color32 {
    let t = s.trim_start_matches('#');
    if t.len() == 6 {
        let v = u32::from_str_radix(t, 16).unwrap_or(0x888888);
        return Color32::from_rgb((v >> 16) as u8, (v >> 8) as u8, v as u8);
    }
    Color32::GRAY
}

fn draw_cards(cx: &mut Cx, f: &UiFrame, screen: Rect, hovered: &mut Option<u16>, clicked: &mut Option<u16>) {
    let s = cx.s;
    cx.text(Pos2::new(screen.center().x, 130.0 * s), Align2::CENTER_CENTER, &f.title, 84.0, true, Color32::WHITE);
    let n = f.items.len().max(1);
    let w = 380.0 * s;
    let gap = 40.0 * s;
    let total = n as f32 * w + (n as f32 - 1.0) * gap;
    for (i, it) in f.items.iter().enumerate() {
        let focused = i == f.focus;
        let x = screen.center().x - total / 2.0 + i as f32 * (w + gap);
        let bounce = if focused { 1.05 + ((cx.time * 6.0).sin() as f32 * 0.008) } else { 1.0 };
        let r0 = Rect::from_min_size(Pos2::new(x, screen.center().y - 270.0 * s), vec2(w, 540.0 * s));
        let r = Rect::from_center_size(r0.center(), r0.size() * bounce);
        cx.card(r, 36.0);
        if focused {
            cx.p.rect_stroke(r, 36.0 * s, Stroke::new(9.0 * s, TEAL), StrokeKind::Outside);
        }
        let col = if it.enabled { INK } else { Color32::from_rgb(150, 165, 175) };
        let c = Pos2::new(r.center().x, r.min.y + 150.0 * s);
        cx.p.circle_filled(c, 80.0 * s, if it.color.is_empty() { PALE } else { hex(&it.color) });
        cx.text(Pos2::new(r.center().x, r.min.y + 310.0 * s), Align2::CENTER_CENTER, &it.label, 40.0, true, col);
        cx.text(Pos2::new(r.center().x, r.min.y + 380.0 * s), Align2::CENTER_CENTER, &it.sub, 34.0, false, TEAL);
        if it.stars >= 0 {
            for k in 0..3 {
                cx.star(Pos2::new(r.center().x + (k as f32 - 1.0) * 70.0 * s, r.min.y + 460.0 * s), 26.0 * s, (k as i8) < it.stars);
            }
        }
        if it.enabled {
            cx.hit(r, i, &it.label, hovered, clicked);
        }
    }
    cx.glyph_row(&f.prompts, Pos2::new(screen.center().x, screen.max.y - 70.0 * s));
}

fn draw_dialog(cx: &mut Cx, d: &Dialog, screen: Rect) {
    let s = cx.s;
    let r = Rect::from_min_size(Pos2::new(screen.center().x - 800.0 * s, screen.max.y - 340.0 * s), vec2(1600.0, 250.0) * s);
    cx.card(r, 36.0);
    let tag = Rect::from_min_size(r.min + vec2(40.0 * s, -34.0 * s), vec2(380.0, 68.0) * s);
    let col = if d.color.is_empty() { TEAL } else { hex(&d.color) };
    cx.p.rect_filled(tag, 34.0 * s, col);
    cx.text(tag.center(), Align2::CENTER_CENTER, &d.speaker, 38.0, true, if d.color == "#ffffff" { INK } else { INK });
    let shown: String = d.text.chars().take(d.shown).collect();
    let (a, b) = split_lines(&d.text, 54);
    let shown_a: String = shown.chars().take(a.chars().count()).collect();
    let shown_b: String = shown.chars().skip(a.chars().count() + 1).collect();
    cx.text(r.min + vec2(60.0 * s, 100.0 * s), Align2::LEFT_CENTER, &shown_a, 38.0, false, INK);
    if !b.is_empty() {
        cx.text(r.min + vec2(60.0 * s, 170.0 * s), Align2::LEFT_CENTER, &shown_b, 38.0, false, INK);
    }
    if d.shown >= d.text.chars().count() {
        let g = glyphs::prompt(Act::Confirm, cx.device, cx.xbox);
        cx.out.glyphs.push(g.label());
        glyphs::draw(&cx.p, &g, Pos2::new(r.max.x - 130.0 * s, r.max.y - 50.0 * s), 54.0 * s, &body_font(54.0 * s));
    }
}

fn draw_hud(cx: &mut Cx, f: &UiFrame, h: &Hud, screen: Rect, _vp: Mat4) {
    let s = cx.s;
    let is_event = h.puck.is_some() || !h.title.is_empty();
    if !is_event {
        // island HUD: day and goal top left, age top right
        let r = Rect::from_min_size(Pos2::new(40.0 * s, 40.0 * s), vec2(520.0, 150.0) * s);
        cx.card(r, 36.0);
        cx.text(r.min + vec2(40.0 * s, 52.0 * s), Align2::LEFT_CENTER, &format!("Day {}", h.day), 48.0, true, INK);
        let goal = if h.goal > 0 { format!("{} / {} minutes", h.minutes, h.goal) } else { "No goal today".to_string() };
        cx.text(r.min + vec2(40.0 * s, 108.0 * s), Align2::LEFT_CENTER, &goal, 34.0, false, TEAL);
        let r2 = Rect::from_min_size(Pos2::new(screen.max.x - 440.0 * s, 40.0 * s), vec2(400.0, 150.0) * s);
        cx.card(r2, 36.0);
        cx.text(r2.min + vec2(40.0 * s, 52.0 * s), Align2::LEFT_CENTER, "Balance Age", 34.0, false, INK);
        cx.text(r2.min + vec2(40.0 * s, 108.0 * s), Align2::LEFT_CENTER, &format!("{}", h.age), 56.0, true, CORAL);
        if !f.prompts.is_empty() && f.dialog.is_none() {
            cx.glyph_row(&h.prompts, Pos2::new(screen.center().x, screen.max.y - 60.0 * s));
        }
        return;
    }
    // event HUD
    let dim = f.dim > 0.5;
    if !dim {
        cx.text(Pos2::new(60.0 * s, 70.0 * s), Align2::LEFT_CENTER, &h.title, 48.0, true, Color32::WHITE);
        if h.puck.as_ref().map(|p| p.alpha > 0.0).unwrap_or(true) || h.score > 0 {
            if h.score > 0 || h.stars > 0 {
                cx.text(Pos2::new(60.0 * s, 130.0 * s), Align2::LEFT_CENTER, &format!("{}", h.score), 56.0, true, SUN);
                for i in 0..3u8 {
                    cx.star(Pos2::new(60.0 * s + 170.0 * s + i as f32 * 52.0 * s, 130.0 * s), 20.0 * s, i < h.stars);
                }
            }
        }
        if h.time > 0.0 {
            cx.text(Pos2::new(screen.max.x - 60.0 * s, 70.0 * s), Align2::RIGHT_CENTER, &format!("{}", h.time.ceil() as i32), 64.0, true, Color32::WHITE);
        }
    }
    // meters
    let mut my = screen.max.y - 190.0 * s;
    for m in &h.meters {
        let r = Rect::from_min_size(Pos2::new(screen.center().x - 450.0 * s, my), vec2(900.0, 34.0) * s);
        cx.p.rect_filled(r, 17.0 * s, Color32::from_white_alpha(170));
        let fill = Rect::from_min_size(r.min, vec2(r.width() * m.value.clamp(0.0, 1.0), r.height()));
        cx.p.rect_filled(fill, 17.0 * s, TEAL);
        if m.guide >= 0.0 {
            let x = r.min.x + r.width() * m.guide.clamp(0.0, 1.0);
            cx.p.rect_filled(Rect::from_center_size(Pos2::new(x, r.center().y), vec2(10.0, 54.0) * s), 4.0 * s, CORAL);
        }
        cx.text(Pos2::new(r.min.x - 20.0 * s, r.center().y), Align2::RIGHT_CENTER, &m.label, 34.0, false, Color32::WHITE);
        my -= 60.0 * s;
    }
    // rhythm lanes
    if !h.notes.is_empty() || h.title == "Step Party" {
        draw_lanes(cx, h, screen);
    }
    if let Some(p) = &h.puck {
        if p.alpha > 0.0 {
            draw_puck(cx, p, screen);
        }
    }
    if !h.line.is_empty() && !dim {
        let (a, _) = split_lines(&h.line, 70);
        cx.text(Pos2::new(screen.center().x, screen.max.y - 250.0 * s - h.meters.len() as f32 * 60.0 * s), Align2::CENTER_CENTER, &a, 38.0, false, Color32::WHITE);
    }
    if !h.big.is_empty() {
        if h.big.chars().count() > 6 {
            // a pose or a call-out: smaller, under the Puck
            cx.text(Pos2::new(screen.center().x, 560.0 * s), Align2::CENTER_CENTER, &h.big, 84.0, true, Color32::WHITE);
        } else {
            cx.text(screen.center() - vec2(0.0, 80.0 * s), Align2::CENTER_CENTER, &h.big, 150.0, true, Color32::WHITE);
        }
    }
    if h.fake_prompt {
        let g = glyphs::prompt(Act::Confirm, cx.device, cx.xbox);
        let r = Rect::from_center_size(Pos2::new(screen.center().x, screen.max.y - 150.0 * s), vec2(560.0, 90.0) * s);
        cx.p.rect_filled(r, 45.0 * s, Color32::from_white_alpha(180));
        glyphs::draw(&cx.p, &g, r.min + vec2(40.0 * s, 45.0 * s), 54.0 * s, &body_font(54.0 * s));
        cx.text(r.center() + vec2(60.0 * s, 0.0), Align2::CENTER_CENTER, "to skip", 34.0, false, INK);
    } else if !h.prompts.is_empty() && !dim {
        cx.glyph_row(&h.prompts, Pos2::new(screen.center().x, screen.max.y - 70.0 * s));
    }
}

fn draw_puck(cx: &mut Cx, p: &Puck, screen: Rect) {
    let s = cx.s;
    let d = 340.0 * s;
    let cy = if p.top { 60.0 * s + d / 2.0 + 20.0 * s } else { screen.max.y - 190.0 * s - d / 2.0 };
    let c = Pos2::new(screen.center().x, cy);
    let a = (p.alpha.clamp(0.0, 1.0) * 255.0) as u8;
    let r = d / 2.0;
    cx.p.circle_filled(c + vec2(0.0, 8.0 * s), r, Color32::from_black_alpha(a / 6));
    cx.p.circle_filled(c, r, Color32::from_rgba_unmultiplied(238, 248, 250, (a as f32 * 0.82) as u8));
    cx.p.circle_stroke(c, r, Stroke::new(6.0 * s, Color32::from_rgba_unmultiplied(70, 190, 200, a)));
    if p.ring[2] > 0.0 {
        let rc = c + vec2(p.ring[0], -p.ring[1]) * r;
        cx.p.circle_stroke(rc, p.ring[2] * r, Stroke::new(8.0 * s, Color32::from_rgba_unmultiplied(120, 220, 170, a)));
    }
    if p.guide > 0.0 {
        cx.p.circle_stroke(c, p.guide * r, Stroke::new(3.0 * s, Color32::from_rgba_unmultiplied(70, 190, 200, a / 2)));
    }
    cx.p.line_segment([c - vec2(r * 0.9, 0.0), c + vec2(r * 0.9, 0.0)], Stroke::new(1.5 * s, Color32::from_black_alpha(a / 10)));
    cx.p.line_segment([c - vec2(0.0, r * 0.9), c + vec2(0.0, r * 0.9)], Stroke::new(1.5 * s, Color32::from_black_alpha(a / 10)));
    let dot = c + vec2(p.cob[0], -p.cob[1]) * r;
    let off = dot - c;
    let off = if off.length() > r * 1.02 { off * (r * 1.02 / off.length()) } else { off };
    let dot = c + off;
    cx.p.circle_filled(dot, 24.0 * s, if p.tipped { CORAL } else { Color32::from_rgba_unmultiplied(255, 120, 110, a) });
    cx.p.circle_stroke(dot, 24.0 * s, Stroke::new(4.0 * s, Color32::WHITE));
    if p.streak > 1 {
        for i in 0..(p.streak - 1) {
            let ang = -std::f32::consts::FRAC_PI_2 + (i as f32 - (p.streak as f32 - 2.0) / 2.0) * 0.42;
            cx.star(c + vec2(ang.cos(), ang.sin()) * (r + 28.0 * s), 18.0 * s, true);
        }
        cx.text(c + vec2(0.0, r * 0.62), Align2::CENTER_CENTER, &format!("x{}", p.streak), 44.0, true, INK);
    }
}

fn draw_lanes(cx: &mut Cx, h: &Hud, screen: Rect) {
    let s = cx.s;
    let top = 230.0 * s;
    let bottom = screen.max.y - 330.0 * s;
    for lane in 0..2 {
        let x = screen.center().x + (lane as f32 - 0.5) * 260.0 * s;
        let r = Rect::from_min_max(Pos2::new(x - 100.0 * s, top), Pos2::new(x + 100.0 * s, bottom));
        cx.p.rect_filled(r, 30.0 * s, Color32::from_white_alpha(60));
        let c = Pos2::new(x, bottom - 20.0 * s);
        cx.p.circle_stroke(c, 70.0 * s, Stroke::new(8.0 * s, Color32::WHITE));
        cx.text(c, Align2::CENTER_CENTER, if lane == 0 { "L" } else { "R" }, 44.0, true, Color32::WHITE);
    }
    for n in &h.notes {
        let lane = n[0] as i32;
        let y = bottom - 20.0 * s - (1.0 - n[1].clamp(-0.15, 1.0)) * (bottom - top - 40.0 * s) * -1.0;
        let y = (bottom - 20.0 * s) - n[1].clamp(-0.15, 1.0) * (bottom - top - 40.0 * s);
        let _ = y;
        let yy = (bottom - 20.0 * s) - n[1].clamp(-0.15, 1.0) * (bottom - top - 60.0 * s);
        let lanes: &[i32] = if lane == 2 { &[0, 1] } else if lane == 0 { &[0] } else { &[1] };
        for &l in lanes {
            let x = screen.center().x + (l as f32 - 0.5) * 260.0 * s;
            let col = if n[2] >= 3.0 { Color32::from_rgb(190, 190, 200) } else if l == 0 { CORAL } else { SUN };
            cx.p.circle_filled(Pos2::new(x, yy), 44.0 * s, col);
            cx.p.circle_stroke(Pos2::new(x, yy), 44.0 * s, Stroke::new(5.0 * s, Color32::WHITE));
        }
    }
}
