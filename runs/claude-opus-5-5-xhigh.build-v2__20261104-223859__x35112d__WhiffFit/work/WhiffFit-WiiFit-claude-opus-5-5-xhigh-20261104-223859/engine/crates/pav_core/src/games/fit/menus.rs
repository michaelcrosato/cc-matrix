//! Menus as data: every list on every screen comes from `FitGame::menu`, so the pad, the keys,
//! the mouse, the bot and the tests all use one path.

use super::events::EventKind;
use super::ui_model::ItemKind;

/// What an item does.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum MAct {
    None,
    Stay,
    Together,
    Settings,
    About,
    Slot(u8),
    Name(u16),
    Skin,
    Outfit,
    Begin,
    Resume,
    Schedule,
    Calendar,
    Wardrobe,
    HowTo,
    Dev,
    Quit,
    Pavilion(u8),
    Event(EventKind),
    EndDay,
    Reception,
    Retry,
    Done,
    Music,
    Sfx,
    Voice,
    Glyphs,
    LeanSens,
    Assist,
    Rhythm,
    TextSpeed,
    Fullscreen,
    ResetSave,
    Yes,
    No,
    Wear(u8),
    PagePrev,
    PageNext,
    Close,
    Players(u8),
    Go,
    Ready,
    DevDay(u8),
    DevEvent(EventKind),
    DevPhase(u8),
    DevAttract,
    DevMedley,
    DevFlag(u8),
    DevGive,
    DevUnlock,
    DevAllStars,
    DevWin,
    DevLose,
    DevScale,
    DevHold,
    DevStep,
    DevGroup,
    DevParam(u16),
    DevResetGroup,
    DevResetAll,
    DevResetGuest,
}

/// How a menu lays out.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Layout {
    /// A column of rows: left edge, top, width, row height; at most `visible` at once.
    List { x: f32, y: f32, w: f32, row: f32, visible: usize },
    /// A row of big cards, centred on the screen: top, card width and height.
    Row { y: f32, w: f32, h: f32 },
    /// A carousel of big cards: `visible` at once, sliding only to keep the focus in view, so
    /// the card under a still pointer stays where it is.
    Carousel { y: f32, w: f32, h: f32, visible: usize },
}

impl Layout {
    /// Left and right move along it.
    pub fn horizontal(&self) -> bool {
        matches!(self, Layout::Row { .. } | Layout::Carousel { .. })
    }
}

/// The first card a carousel shows, given the one it showed last.
pub fn carousel_first(last: usize, focus: usize, n: usize, visible: usize) -> usize {
    let vis = visible.min(n).max(1);
    let first = if focus < last {
        focus
    } else if focus >= last + vis {
        focus + 1 - vis
    } else {
        last
    };
    first.min(n.saturating_sub(vis))
}

#[derive(Clone, Debug)]
pub struct MItem {
    pub act: MAct,
    pub label: String,
    pub sub: String,
    pub kind: ItemKind,
    pub stars: Option<u8>,
}

impl MItem {
    pub fn button(act: MAct, label: impl Into<String>) -> Self {
        Self { act, label: label.into(), sub: String::new(), kind: ItemKind::Button, stars: None }
    }
    pub fn sub(mut self, sub: impl Into<String>) -> Self {
        self.sub = sub.into();
        self
    }
    pub fn stars(mut self, n: u8) -> Self {
        self.stars = Some(n);
        self
    }
    pub fn locked(mut self) -> Self {
        self.kind = ItemKind::Locked;
        self
    }
    pub fn slider(act: MAct, label: impl Into<String>, frac: f32, value: impl Into<String>) -> Self {
        Self { act, label: label.into(), sub: String::new(), kind: ItemKind::Slider { frac, value: value.into() }, stars: None }
    }
    pub fn choice(act: MAct, label: impl Into<String>, value: impl Into<String>) -> Self {
        Self { act, label: label.into(), sub: String::new(), kind: ItemKind::Choice { value: value.into() }, stars: None }
    }
}

#[derive(Clone, Debug)]
pub struct Menu {
    /// A name for tests: `title`, `pause`...
    pub key: &'static str,
    pub title: String,
    pub sub: String,
    pub items: Vec<MItem>,
    pub layout: Layout,
    pub tabs: Option<(Vec<&'static str>, usize)>,
    pub back: bool,
    /// Draws a card behind it, and how wide.
    pub card: bool,
    pub dim: bool,
}
