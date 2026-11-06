//! What the UI draws: a plain description built by the sim every frame. `pav_ui` is a pure
//! view of it and sends hover/click back as `InputFrame.ui`.

use glam::Vec3;
use serde::{Deserialize, Serialize};

/// A button or input the prompts name.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Act {
    Confirm,
    Back,
    Act,
    StepL,
    StepR,
    Brace,
    Wave,
    Schedule,
    Pause,
    TabL,
    TabR,
    Move,
    Lean,
    Jog,
    Camera,
    Navigate,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Prompt {
    pub act: Act,
    pub label: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum ItemKind {
    Button,
    /// value 0..1 shown as a bar; left/right changes it.
    Slider,
    /// Shows `value_text`; left/right cycles.
    Choice,
    /// A card in a row (guest slots, schedule events).
    Card,
    /// Text only (not focusable).
    Label,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Item {
    pub label: String,
    pub kind: ItemKind,
    pub value: f32,
    pub value_text: String,
    /// A line under the label (card subtitle).
    pub sub: String,
    pub enabled: bool,
    /// 0..=3 stars shown on cards; -1 for none.
    pub stars: i8,
    /// Accent colour as `#rrggbb`, empty for none.
    pub color: String,
}

impl Item {
    pub fn button(label: impl Into<String>) -> Self {
        Self {
            label: label.into(),
            kind: ItemKind::Button,
            value: 0.0,
            value_text: String::new(),
            sub: String::new(),
            enabled: true,
            stars: -1,
            color: String::new(),
        }
    }
    pub fn card(label: impl Into<String>, sub: impl Into<String>) -> Self {
        Self { kind: ItemKind::Card, sub: sub.into(), ..Self::button(label) }
    }
    pub fn slider(label: impl Into<String>, value: f32, text: impl Into<String>) -> Self {
        Self { kind: ItemKind::Slider, value, value_text: text.into(), ..Self::button(label) }
    }
    pub fn choice(label: impl Into<String>, text: impl Into<String>) -> Self {
        Self { kind: ItemKind::Choice, value_text: text.into(), ..Self::button(label) }
    }
    pub fn disabled(mut self) -> Self {
        self.enabled = false;
        self
    }
    pub fn stars(mut self, n: i8) -> Self {
        self.stars = n;
        self
    }
    pub fn colored(mut self, c: &str) -> Self {
        self.color = c.to_string();
        self
    }
}

/// The Puck: the big circular gauge.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Puck {
    pub cob: [f32; 2],
    /// Target ring centre and radius (the green ring), radius 0 for none.
    pub ring: [f32; 3],
    /// A second thin ring (guide), radius 0 for none.
    pub guide: f32,
    pub streak: u8,
    pub tipped: bool,
    /// Draw the Puck faintly or hidden (eyes closed): 0 hidden .. 1 solid.
    pub alpha: f32,
    /// Top (true) or bottom centre.
    pub top: bool,
}

/// A bar under the Puck (lungs, depth, tempo, stitch, power...).
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Meter {
    pub label: String,
    pub value: f32,
    /// A second marker (the guide), -1 for none.
    pub guide: f32,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Hud {
    pub title: String,
    pub score: i32,
    pub time: f32,
    pub meters: Vec<Meter>,
    /// One line of in-event text (a coach line, "Switch!").
    pub line: String,
    /// Big centred text (3-2-1, GO, a pose name).
    pub big: String,
    pub stars: u8,
    pub puck: Option<Puck>,
    /// Rhythm notes: (lane 0..2, distance 0..1 to the footprints, hit state).
    pub notes: Vec<[f32; 3]>,
    pub prompts: Vec<Prompt>,
    /// Island: day, goal, minutes, age.
    pub day: i32,
    pub goal: i32,
    pub minutes: i32,
    pub age: i32,
    pub fake_prompt: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Dialog {
    pub speaker: String,
    pub text: String,
    /// Letters revealed.
    pub shown: usize,
    pub color: String,
}

/// The rolling Balance Age report.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Report {
    pub age: i32,
    pub rolling: bool,
    pub spark: Vec<i32>,
    pub comment: String,
}

/// A label anchored in the world (names over ghosts, "Talk" over an interactable).
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct WorldLabel {
    pub pos: Vec3,
    pub text: String,
    pub prompt: Option<Act>,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum Layout {
    #[default]
    None,
    /// Vertical list centred in a card.
    List,
    /// A row of cards.
    Cards,
    /// Pages of text with Back/Next.
    Pages,
    /// Result card with stars.
    Result,
    /// Calendar of days.
    Calendar,
    /// Check report with big number.
    Report,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct UiFrame {
    pub layout: Layout,
    pub title: String,
    pub subtitle: String,
    pub lines: Vec<String>,
    pub items: Vec<Item>,
    pub focus: usize,
    pub tabs: Vec<String>,
    pub tab: usize,
    pub prompts: Vec<Prompt>,
    pub hud: Option<Hud>,
    pub dialog: Option<Dialog>,
    pub report: Option<Report>,
    pub labels: Vec<WorldLabel>,
    /// DEMO ribbon.
    pub demo: bool,
    /// Screen dimming 0..1 (eyes closed, stillness).
    pub dim: f32,
    /// A transient message (toast).
    pub toast: String,
    /// Show the glyphs as Xbox.
    pub xbox: bool,
    /// Mouse hint: the pointer is shown.
    pub touch_card: bool,
    /// The scale of the card for transitions 0..1.
    pub fade: f32,
    /// Which screen this is (name for tests and the page).
    pub screen: String,
    /// Big number overlay (stamp, age roll) with a caption.
    pub big_text: String,
    pub confetti: f32,
    /// Dev mode: input viewer (lean, held buttons), dot trace, and the app's stats line.
    pub dev_input: Option<([f32; 2], u32)>,
    pub dev_trace: Vec<[f32; 2]>,
    pub stats: String,
}
