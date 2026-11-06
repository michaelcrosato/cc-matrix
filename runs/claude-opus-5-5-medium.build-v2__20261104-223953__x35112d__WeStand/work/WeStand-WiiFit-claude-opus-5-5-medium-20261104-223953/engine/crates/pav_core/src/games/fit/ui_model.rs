//! The UI as data: the sim writes a list of items in a 1920x1080 space, `pav_ui::fit_ui` draws
//! them. Tests read this list directly, so every screen can be checked with no window or GPU.

use std::sync::Arc;

use serde::{Deserialize, Serialize};

pub type Rgba = [u8; 4];

pub const INK: Rgba = [0x26, 0x3e, 0x54, 255];
pub const WHITE: Rgba = [255, 255, 255, 255];
pub const DECK: Rgba = [0xfb, 0xfa, 0xf6, 255];
pub const TEAL: Rgba = [0x46, 0xbe, 0xc8, 255];
pub const MINT: Rgba = [0x78, 0xdc, 0xaa, 255];
pub const CORAL: Rgba = [0xff, 0x78, 0x6e, 255];
pub const SUN: Rgba = [0xff, 0xd1, 0x66, 255];
pub const PALE: Rgba = [0xe8, 0xf3, 0xf5, 255];
pub const MUTED: Rgba = [0x5d, 0x75, 0x88, 255];

/// Smallest text allowed at 1080p: body and titles (the 10-foot rule).
pub const MIN_BODY: f32 = 34.0;
pub const MIN_TITLE: f32 = 64.0;

/// What a prompt asks for. `pav_ui::glyphs` turns it into a PlayStation, Xbox or keyboard glyph.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Glyph {
    Confirm,
    Back,
    Wave,
    Schedule,
    Pause,
    StepL,
    StepR,
    Brace,
    Lean,
    Camera,
    Move,
    Tabs,
    Jog,
}

#[derive(Clone, Debug)]
pub enum Ui {
    /// The whole screen washed with a colour.
    Tint { color: Rgba },
    Card { rect: [f32; 4], color: Rgba, radius: f32, shadow: bool },
    /// `align`: 0 left, 1 centre, 2 right. `title` picks the display font. `wrap` > 0 wraps.
    Text { pos: [f32; 2], size: f32, color: Rgba, align: u8, title: bool, text: String, wrap: f32 },
    /// A focusable item. `value` is shown at the right; `fill` draws a slider (0..1).
    Button { id: u16, rect: [f32; 4], label: String, sub: String, focused: bool, stars: i8, value: String, fill: Option<f32>, big: bool },
    /// A row of glyphs and a label.
    Prompt { pos: [f32; 2], align: u8, glyphs: Vec<Glyph>, label: String, size: f32 },
    /// A prompt anchored to a point in the world.
    WorldPrompt { at: [f32; 3], glyph: Glyph, label: String },
    /// A ring on the ground around what the mouse points at.
    WorldRing { at: [f32; 3], r: f32 },
    /// A name above a figure.
    WorldLabel { at: [f32; 3], text: String },
    /// The balance gauge. `dot` and `ring` are unit-disc coordinates (x right, y up).
    Puck { center: [f32; 2], r: f32, dot: [f32; 2], ring: Option<([f32; 2], f32)>, band: Option<f32>, stars: u8, trace: Vec<[f32; 2]> },
    Stars { pos: [f32; 2], size: f32, n: u8, of: u8 },
    Bar { rect: [f32; 4], frac: f32, color: Rgba, marker: Option<f32> },
    Circle { c: [f32; 2], r: f32, fill: Rgba, stroke: Rgba, width: f32 },
    Line { a: [f32; 2], b: [f32; 2], width: f32, color: Rgba },
}

/// One tick's UI, plus the settings the host applies.
#[derive(Clone, Debug, Default)]
pub struct UiFrame {
    pub items: Vec<Ui>,
    /// A short name for the screen, for tests and the page's status.
    pub screen: &'static str,
    pub xbox: bool,
    pub music: f32,
    pub sfx: f32,
    pub voice: f32,
    pub rhythm_offset: f32,
    /// Dev mode's time scale (1 = normal).
    pub time_scale: f32,
    /// Show the engine's stats overlay.
    pub stats: bool,
    /// Asks the host to toggle fullscreen when this changes.
    pub fullscreen: u32,
    /// The save to store when its serial changes (none in hub sessions).
    pub save: Option<(u64, Arc<String>)>,
    /// A hub session is open: the host adds hub ghosts.
    pub hub: bool,
    /// Asks the host to wipe nothing more than a reload would: the game is over in the hub.
    pub silent: bool,
    /// The input viewer and the dev overlay.
    pub dev_overlay: bool,
    /// How hard the pad should rumble now (0..1): Eyes Closed.
    pub rumble: f32,
    /// Input shaping the host applies: stick dead zone and curve, key rates, mouse range.
    pub shaping: [f32; 5],
}

/// Writes items, in the 1920x1080 space.
#[derive(Default)]
pub struct B {
    pub items: Vec<Ui>,
}

impl B {
    pub fn tint(&mut self, color: Rgba) {
        self.items.push(Ui::Tint { color });
    }
    pub fn card(&mut self, rect: [f32; 4], color: Rgba) {
        self.items.push(Ui::Card { rect, color, radius: 36.0, shadow: true });
    }
    pub fn flat(&mut self, rect: [f32; 4], color: Rgba, radius: f32) {
        self.items.push(Ui::Card { rect, color, radius, shadow: false });
    }
    fn put(&mut self, pos: [f32; 2], size: f32, color: Rgba, align: u8, title: bool, text: &str, wrap: f32) {
        // The size rule lives here: no screen can draw smaller.
        let min = if title { MIN_TITLE } else { MIN_BODY };
        self.items.push(Ui::Text { pos, size: size.max(min), color, align, title, text: text.to_string(), wrap });
    }
    /// Left-aligned body text.
    pub fn text(&mut self, x: f32, y: f32, size: f32, color: Rgba, text: &str) {
        self.put([x, y], size, color, 0, false, text, 0.0);
    }
    pub fn center(&mut self, x: f32, y: f32, size: f32, color: Rgba, text: &str) {
        self.put([x, y], size, color, 1, false, text, 0.0);
    }
    pub fn right(&mut self, x: f32, y: f32, size: f32, color: Rgba, text: &str) {
        self.put([x, y], size, color, 2, false, text, 0.0);
    }
    pub fn wrap(&mut self, x: f32, y: f32, w: f32, size: f32, color: Rgba, text: &str) {
        self.put([x, y], size, color, 0, false, text, w);
    }
    pub fn wrap_center(&mut self, x: f32, y: f32, w: f32, size: f32, color: Rgba, text: &str) {
        self.put([x, y], size, color, 1, false, text, w);
    }
    /// Display font, centred.
    pub fn title(&mut self, x: f32, y: f32, size: f32, color: Rgba, text: &str) {
        self.put([x, y], size, color, 1, true, text, 0.0);
    }
    pub fn title_left(&mut self, x: f32, y: f32, size: f32, color: Rgba, text: &str) {
        self.put([x, y], size, color, 0, true, text, 0.0);
    }
    pub fn prompt(&mut self, x: f32, y: f32, glyphs: &[Glyph], label: &str) {
        self.items.push(Ui::Prompt { pos: [x, y], align: 0, glyphs: glyphs.to_vec(), label: label.to_string(), size: 40.0 });
    }
    pub fn prompt_center(&mut self, x: f32, y: f32, glyphs: &[Glyph], label: &str) {
        self.items.push(Ui::Prompt { pos: [x, y], align: 1, glyphs: glyphs.to_vec(), label: label.to_string(), size: 40.0 });
    }
    pub fn prompt_right(&mut self, x: f32, y: f32, glyphs: &[Glyph], label: &str) {
        self.items.push(Ui::Prompt { pos: [x, y], align: 2, glyphs: glyphs.to_vec(), label: label.to_string(), size: 40.0 });
    }
    pub fn stars(&mut self, x: f32, y: f32, size: f32, n: u8, of: u8) {
        self.items.push(Ui::Stars { pos: [x, y], size, n, of });
    }
    pub fn bar(&mut self, rect: [f32; 4], frac: f32, color: Rgba, marker: Option<f32>) {
        self.items.push(Ui::Bar { rect, frac, color, marker });
    }
    pub fn circle(&mut self, c: [f32; 2], r: f32, fill: Rgba, stroke: Rgba, width: f32) {
        self.items.push(Ui::Circle { c, r, fill, stroke, width });
    }
    pub fn puck(&mut self, center: [f32; 2], r: f32, dot: [f32; 2]) {
        self.items.push(Ui::Puck { center, r, dot, ring: None, band: None, stars: 0, trace: Vec::new() });
    }
    /// Sets the last puck's ring, band or stars.
    pub fn puck_ring(&mut self, at: [f32; 2], radius: f32) {
        if let Some(Ui::Puck { ring, .. }) = self.items.iter_mut().rev().find(|i| matches!(i, Ui::Puck { .. })) {
            *ring = Some((at, radius));
        }
    }
    pub fn puck_band(&mut self, half: f32) {
        if let Some(Ui::Puck { band, .. }) = self.items.iter_mut().rev().find(|i| matches!(i, Ui::Puck { .. })) {
            *band = Some(half);
        }
    }
    pub fn puck_stars(&mut self, n: u8) {
        if let Some(Ui::Puck { stars, .. }) = self.items.iter_mut().rev().find(|i| matches!(i, Ui::Puck { .. })) {
            *stars = n;
        }
    }
    /// Every text on the frame, for tests.
    pub fn texts(items: &[Ui]) -> Vec<String> {
        let mut out = Vec::new();
        for i in items {
            match i {
                Ui::Text { text, .. } => out.push(text.clone()),
                Ui::Button { label, sub, value, .. } => {
                    out.push(label.clone());
                    if !sub.is_empty() {
                        out.push(sub.clone());
                    }
                    if !value.is_empty() {
                        out.push(value.clone());
                    }
                }
                Ui::Prompt { label, .. } | Ui::WorldPrompt { label, .. } => out.push(label.clone()),
                Ui::WorldLabel { text, .. } => out.push(text.clone()),
                _ => {}
            }
        }
        out
    }
}
