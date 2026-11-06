//! The surgery game's UI: the shell (menus, pause, settings, dev, about), the HUD, the glyphs.

pub mod glyphs;
pub mod hud;
pub mod shell;
pub mod style;

pub use shell::{About, CardInfo, Cmd, Input, Save, Screen, Settings, Shell, TITLE};

#[cfg(test)]
mod tests;
