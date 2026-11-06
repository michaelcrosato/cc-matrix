//! The game's UI as data: a list of things to draw at a virtual 1920x1080, built in the sim, so
//! tests can read every screen with no GPU. `pav_ui::fit_ui` draws it and sends the pointer's
//! hovers and clicks back as `InputFrame.ui`.

use std::sync::Arc;

use glam::Vec3;
use serde::Serialize;

pub type Rgba = [u8; 4];
pub const INK: Rgba = [38, 62, 84, 255];
pub const INK_SOFT: Rgba = [84, 108, 128, 255];
pub const WHITE: Rgba = [255, 255, 255, 255];
pub const PAPER: Rgba = [251, 250, 246, 255];
pub const TEAL: Rgba = [70, 190, 200, 255];
pub const MINT: Rgba = [120, 220, 170, 255];
pub const CORAL: Rgba = [255, 120, 110, 255];
pub const SUN: Rgba = [255, 209, 102, 255];
pub const SKY: Rgba = [214, 238, 246, 255];
pub const SEA: Rgba = [143, 221, 224, 255];
pub const SHADE: Rgba = [20, 34, 48, 150];

/// Smallest body text and title sizes at 1080p (the 10-foot rule).
pub const MIN_TEXT: f32 = 34.0;
pub const MIN_TITLE: f32 = 64.0;

/// An action a prompt names; `pav_ui::glyphs` draws it for the device in use.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub enum Act {
    Confirm,
    Back,
    Wave,
    Schedule,
    Pause,
    StepL,
    StepR,
    Brace,
    Lean,
    Walk,
    Jog,
    TabL,
    TabR,
    Menu,
    /// Choosing along a row of cards.
    MenuSide,
    Camera,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub enum Font {
    Title,
    Body,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub enum Align {
    Left,
    Center,
    Right,
}

/// The balance gauge.
#[derive(Clone, Debug, Default, Serialize)]
pub struct Puck {
    pub c: [f32; 2],
    pub r: f32,
    /// The dot, unit disc, x right, y up.
    pub dot: [f32; 2],
    /// A target ring: centre (unit disc) and radius.
    pub ring: Option<[f32; 3]>,
    /// A vertical band's half width (Tempo Squats).
    pub band: Option<f32>,
    /// A target mark (Lean Targets).
    pub mark: Option<[f32; 2]>,
    /// A rival's dot (Yesterday You).
    pub ghost: Option<[f32; 2]>,
    /// Whether the dot is inside what it should be inside.
    pub good: bool,
    /// Stars at the edge while streaking (0-4).
    pub streak: u8,
    /// The dot's recent path (dev view).
    pub trace: Vec<[f32; 2]>,
    /// 0..1: how close to tipping (reddens the rim).
    pub danger: f32,
}

#[derive(Clone, Debug, Serialize)]
pub enum Node {
    /// A rounded panel. `r` is [x, y, w, h].
    Card { r: [f32; 4], fill: Rgba, radius: f32, shadow: bool },
    Outline { r: [f32; 4], color: Rgba, width: f32, radius: f32 },
    Text { at: [f32; 2], size: f32, font: Font, color: Rgba, align: Align, wrap: f32, text: String },
    /// A centred row of prompts on a pill, along the bottom of the screen.
    PromptRow { y: f32, items: Vec<(Act, String)> },
    /// A glyph for an action and its label.
    Prompt { at: [f32; 2], size: f32, act: Act, label: String, align: Align, color: Rgba },
    Puck(Puck),
    /// `n` of `of` stars in a row, centred at `at`.
    Stars { at: [f32; 2], n: u8, of: u8, size: f32 },
    Bar { r: [f32; 4], frac: f32, fill: Rgba, bg: Rgba },
    Circle { c: [f32; 2], r: f32, fill: Rgba, stroke: Rgba, width: f32 },
    Line { pts: Vec<[f32; 2]>, width: f32, color: Rgba },
    /// The whole screen under a colour.
    Fade { color: Rgba },
    /// Text anchored to a point in the world.
    WorldText { pos: Vec3, size: f32, color: Rgba, text: String },
    /// A prompt anchored to a point in the world.
    WorldPrompt { pos: Vec3, act: Act, label: String },
    /// A highlight ring on the ground, drawn with the projection.
    WorldRing { pos: Vec3, r: f32, color: Rgba },
}

/// What kind of row a menu item is.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub enum ItemKind {
    Button,
    /// A value changed with left and right; `frac` is its slider position when it has one.
    Slider { frac: f32, value: String },
    Choice { value: String },
    Locked,
}

/// A thing the pointer and the focus can land on.
#[derive(Clone, Debug, Serialize)]
pub struct Item {
    pub id: u16,
    pub r: [f32; 4],
    pub label: String,
    pub sub: String,
    pub kind: ItemKind,
    pub focused: bool,
    /// 0..1 focus bounce.
    pub bounce: f32,
    /// Stars to show on it (`None` hides them).
    pub stars: Option<u8>,
}

/// One frame of UI, and the settings the host applies.
#[derive(Clone, Debug, Serialize)]
pub struct UiFrame {
    /// A name for tests: `title`, `island`, `event`, `pause`...
    pub screen: String,
    pub nodes: Vec<Node>,
    /// Above the nodes.
    pub items: Vec<Item>,
    pub top: Vec<Node>,
    pub focus: Option<u16>,
    pub xbox: bool,
    pub music: f32,
    pub sfx: f32,
    pub voice: f32,
    pub rhythm_offset: f32,
    /// The arrows are steps here, not lean.
    pub arrows_step: bool,
    /// Keys swing the lean fast (circling).
    pub lean_fast: bool,
    /// The player has the camera: right stick, right drag and the wheel.
    pub cam_free: bool,
    /// The cursor leans in this state (otherwise it points).
    pub cursor_leans: bool,
    pub time_scale: f32,
    pub show_stats: bool,
    pub fullscreen_serial: u32,
    pub rumble: f32,
    /// Stick deadzone and curve, key lean rate and return, cursor span.
    pub input: [f32; 5],
    /// The world is frozen: the music's clock holds still too.
    pub music_hold: bool,
    pub save_serial: u64,
    #[serde(skip)]
    pub save_json: Arc<String>,
    pub ended: bool,
}

impl Default for UiFrame {
    fn default() -> Self {
        Self {
            screen: String::new(),
            nodes: Vec::new(),
            items: Vec::new(),
            top: Vec::new(),
            focus: None,
            xbox: false,
            music: 0.1,
            sfx: 0.8,
            voice: 0.8,
            rhythm_offset: 0.1,
            arrows_step: false,
            lean_fast: false,
            cam_free: false,
            cursor_leans: false,
            time_scale: 1.0,
            show_stats: false,
            fullscreen_serial: 0,
            rumble: 0.0,
            input: [0.12, 1.5, 1.6, 1.2, 0.38],
            music_hold: false,
            save_serial: 0,
            save_json: Arc::new(String::new()),
            ended: false,
        }
    }
}

/// Screen builder. Every text goes through here, so the size rule can't be broken.
#[derive(Default)]
pub struct Ui {
    pub f: UiFrame,
    /// Build into `top` (over the items) instead of `nodes`.
    pub over: bool,
    /// Something covers this screen: its prompt row would only confuse.
    pub no_prompts: bool,
}

impl Ui {
    fn push(&mut self, n: Node) {
        if self.over {
            self.f.top.push(n);
        } else {
            self.f.nodes.push(n);
        }
    }
    pub fn card(&mut self, x: f32, y: f32, w: f32, h: f32) {
        self.card_c(x, y, w, h, WHITE);
    }
    pub fn card_c(&mut self, x: f32, y: f32, w: f32, h: f32, fill: Rgba) {
        self.push(Node::Card { r: [x, y, w, h], fill, radius: 36.0, shadow: true });
    }
    pub fn panel(&mut self, x: f32, y: f32, w: f32, h: f32, fill: Rgba, radius: f32) {
        self.push(Node::Card { r: [x, y, w, h], fill, radius, shadow: false });
    }
    pub fn outline(&mut self, x: f32, y: f32, w: f32, h: f32, color: Rgba, width: f32, radius: f32) {
        self.push(Node::Outline { r: [x, y, w, h], color, width, radius });
    }
    /// Body text, at least `MIN_TEXT`.
    pub fn text(&mut self, x: f32, y: f32, size: f32, color: Rgba, align: Align, text: impl Into<String>) {
        self.push(Node::Text {
            at: [x, y],
            size: size.max(MIN_TEXT),
            font: Font::Body,
            color,
            align,
            wrap: 0.0,
            text: text.into(),
        });
    }
    /// Wrapped body text.
    pub fn para(&mut self, x: f32, y: f32, w: f32, size: f32, color: Rgba, align: Align, text: impl Into<String>) {
        self.push(Node::Text { at: [x, y], size: size.max(MIN_TEXT), font: Font::Body, color, align, wrap: w, text: text.into() });
    }
    /// A title in the display font, at least `MIN_TITLE`.
    pub fn title(&mut self, x: f32, y: f32, size: f32, color: Rgba, align: Align, text: impl Into<String>) {
        self.push(Node::Text {
            at: [x, y],
            size: size.max(MIN_TITLE),
            font: Font::Title,
            color,
            align,
            wrap: 0.0,
            text: text.into(),
        });
    }
    /// A number or short label in the display font, smaller than a title allows (still body size).
    pub fn label(&mut self, x: f32, y: f32, size: f32, color: Rgba, align: Align, text: impl Into<String>) {
        self.push(Node::Text {
            at: [x, y],
            size: size.max(MIN_TEXT),
            font: Font::Title,
            color,
            align,
            wrap: 0.0,
            text: text.into(),
        });
    }
    pub fn prompt(&mut self, x: f32, y: f32, act: Act, label: impl Into<String>, align: Align) {
        self.push(Node::Prompt { at: [x, y], size: 40.0, act, label: label.into(), align, color: INK });
    }
    /// A centred row of prompts along the bottom of the screen.
    pub fn prompt_row(&mut self, prompts: &[(Act, &str)]) {
        self.prompt_row_at(1022.0, prompts);
    }
    pub fn prompt_row_at(&mut self, y: f32, prompts: &[(Act, &str)]) {
        if prompts.is_empty() || self.no_prompts {
            return;
        }
        self.push(Node::PromptRow { y, items: prompts.iter().map(|(a, l)| (*a, l.to_string())).collect() });
    }
    pub fn puck(&mut self, p: Puck) {
        self.push(Node::Puck(p));
    }
    pub fn stars(&mut self, x: f32, y: f32, n: u8, of: u8, size: f32) {
        self.push(Node::Stars { at: [x, y], n, of, size });
    }
    pub fn bar(&mut self, x: f32, y: f32, w: f32, h: f32, frac: f32, fill: Rgba) {
        self.push(Node::Bar { r: [x, y, w, h], frac, fill, bg: [230, 236, 238, 255] });
    }
    pub fn circle(&mut self, x: f32, y: f32, r: f32, fill: Rgba, stroke: Rgba, width: f32) {
        self.push(Node::Circle { c: [x, y], r, fill, stroke, width });
    }
    pub fn line(&mut self, pts: Vec<[f32; 2]>, width: f32, color: Rgba) {
        self.push(Node::Line { pts, width, color });
    }
    pub fn fade(&mut self, color: Rgba) {
        self.push(Node::Fade { color });
    }
    pub fn world_text(&mut self, pos: Vec3, size: f32, color: Rgba, text: impl Into<String>) {
        self.push(Node::WorldText { pos, size: size.max(MIN_TEXT), color, text: text.into() });
    }
    pub fn world_prompt(&mut self, pos: Vec3, act: Act, label: impl Into<String>) {
        self.push(Node::WorldPrompt { pos, act, label: label.into() });
    }
    pub fn world_ring(&mut self, pos: Vec3, r: f32, color: Rgba) {
        self.push(Node::WorldRing { pos, r, color });
    }
}

/// `color` at `alpha` (0..1).
pub fn with_alpha(c: Rgba, alpha: f32) -> Rgba {
    [c[0], c[1], c[2], (c[3] as f32 * alpha.clamp(0.0, 1.0)) as u8]
}
