//! The Long Stillness: thirty seconds of nothing, while the game tries to make you press something.

use super::*;
use crate::games::fit::sfx;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Stillness {
    pub t: f32,
    pub broke: bool,
    pub fake: bool,
    faded: bool,
    pub seconds: f32,
    pub spoken: bool,
}

impl Stillness {
    pub fn new(seconds: f32) -> Self {
        Self { t: 0.0, broke: false, fake: false, faded: false, seconds, spoken: false }
    }

    /// Returns true when it is over. `any` is any button at all.
    pub fn tick(&mut self, cx: &mut Cx, any: bool) -> bool {
        self.t += cx.dt;
        if !self.faded {
            self.faded = true;
            cx.ev.push(SimEvent::Music { song: 255 });
        }
        self.fake = self.t >= self.seconds * 0.5 && self.t < self.seconds * 0.5 + 8.0;
        if any && !self.broke {
            self.broke = true;
            cx.sfx(sfx::SQUEAK, 0.5, 0.6);
        }
        cx.core.wobble = 0.6;
        cx.scrub("FIT/Breath", 0.5 + 0.1 * (self.t * 0.7).sin());
        cx.lean_body(0.0);
        self.t >= self.seconds
    }

    pub fn hud(&self, b: &mut B, core: &BalanceCore) {
        b.puck([960.0, 200.0], PUCK_R, core.cob.into());
        if self.fake {
            b.card([560.0, 780.0, 1360.0, 900.0], DECK);
            b.prompt_center(960.0, 810.0, &[Glyph::Confirm], "Press to skip");
        }
    }
}
