//! The bot plays the whole flow, menus included, from New Stay to the credits. It is the scripted
//! playthrough and the base of attract mode.

use super::events::{EventKind, Intent};
use super::island::PAVILIONS;
use super::medley::MPhase;
use super::menus::{MAct, Menu};
use super::run::RunPhase;
use super::{FitGame, Flow, Overlay};
use crate::input::{InputFrame, buttons as b};
use crate::sim::Sim;

fn press(bit: u32) -> InputFrame {
    InputFrame { held: bit, pressed: bit, any: true, ..Default::default() }
}

impl FitGame {
    fn every(&self, n: u64) -> bool {
        self.bot_tick % n == 0
    }

    /// Presses toward the item doing `want`, then presses it.
    fn pick(&self, m: &Menu, want: MAct) -> InputFrame {
        let target = m.items.iter().position(|i| i.act == want);
        if !self.every(7) {
            return InputFrame::default();
        }
        match target {
            Some(t) if t == self.focus.min(m.items.len().saturating_sub(1)) => press(b::CONFIRM),
            Some(_) => press(if m.layout.horizontal() { b::MENU_RIGHT } else { b::MENU_DOWN }),
            None => press(b::BACK),
        }
    }

    /// The next thing a thorough guest does today.
    pub fn bot_next_event(&self) -> Option<EventKind> {
        let g = self.guest()?;
        if g.day >= 5 {
            return Some(EventKind::BigStand);
        }
        for p in &PAVILIONS {
            for k in p.events {
                if k.opens_on() <= g.day && !g.today.iter().any(|t| t == k.key()) && !g.played.iter().any(|t| t == k.key()) {
                    return Some(*k);
                }
            }
        }
        for p in &PAVILIONS {
            for k in p.events {
                if k.opens_on() <= g.day && g.minutes_today < self.rules.goal(g.day) && !g.today.iter().any(|t| t == k.key()) {
                    return Some(*k);
                }
            }
        }
        // Still short of the goal: repeats bank one.
        for p in &PAVILIONS {
            if let Some(k) = p.events.first().filter(|k| k.opens_on() <= g.day && g.minutes_today < self.rules.goal(g.day)) {
                return Some(*k);
            }
        }
        None
    }

    pub fn bot_input(&self, sim: &Sim) -> InputFrame {
        // Attract plays its event, whatever card is over it.
        if let Flow::Attract(a) = &self.flow {
            return a.run.as_ref().map(|r| self.bot_event(r)).unwrap_or_default();
        }
        // Dialogue: read at a reasonable pace.
        if self.dialog.is_some() && self.overlays.is_empty() {
            return if self.every(9) { press(b::CONFIRM) } else { InputFrame::default() };
        }
        if let Some(m) = self.menu() {
            return self.bot_menu(&m);
        }
        match &self.flow {
            Flow::Check(c) => c.bot(&self.rules).to_input(),
            Flow::Report(_) => {
                if self.every(20) {
                    press(b::CONFIRM)
                } else {
                    InputFrame::default()
                }
            }
            Flow::Event(r) => match r.phase {
                RunPhase::Card if self.every(20) => press(b::CONFIRM),
                RunPhase::Play => self.bot_event(r),
                _ => InputFrame::default(),
            },
            Flow::Island => {
                if self.every(10) {
                    press(b::SCHEDULE)
                } else {
                    InputFrame::default()
                }
            }
            Flow::Stamp(..) | Flow::Credits(..) => {
                if self.every(30) {
                    press(b::CONFIRM)
                } else {
                    InputFrame::default()
                }
            }
            Flow::Medley(m) => {
                if m.phase == MPhase::Run {
                    m.run.as_ref().filter(|r| r.phase == RunPhase::Play).map(|r| self.bot_event(r)).unwrap_or_default()
                } else {
                    let _ = sim;
                    InputFrame::default()
                }
            }
            _ => InputFrame::default(),
        }
    }

    fn bot_event(&self, r: &super::run::EventRun) -> InputFrame {
        let it: Intent = r.st.bot(&r.c, &self.rules);
        it.to_input()
    }

    fn bot_menu(&self, m: &Menu) -> InputFrame {
        let next = self.bot_next_event();
        let want = match m.key {
            "title" => MAct::Stay,
            "slots" => {
                // The first slot this run can use.
                let free = self.save.slots.iter().position(|s| s.is_none()).unwrap_or(0);
                let used = self.save.slots.iter().position(|s| s.as_ref().is_some_and(|g| !g.free_play()));
                MAct::Slot(used.unwrap_or(free) as u8)
            }
            "names" => MAct::Name((self.seed % 8) as u16),
            "look" => MAct::Begin,
            "result" => {
                if let Flow::Event(r) = &self.flow {
                    if r.pt < 2.2 {
                        return InputFrame::default();
                    }
                }
                MAct::Done
            }
            "pause" => MAct::Resume,
            "schedule" => match next {
                Some(EventKind::BigStand) => MAct::Event(EventKind::BigStand),
                Some(k) => MAct::Pavilion(PAVILIONS.iter().position(|p| p.events.contains(&k)).unwrap_or(0) as u8),
                None => MAct::EndDay,
            },
            "events" => match next {
                Some(k) if m.items.iter().any(|i| i.act == MAct::Event(k)) => MAct::Event(k),
                _ => MAct::None,
            },
            "pass" | "podium" => MAct::Ready,
            "together" => MAct::Go,
            _ => MAct::None,
        };
        self.pick(m, want)
    }

    /// Which overlay is on top (tests).
    pub fn top_overlay(&self) -> Option<Overlay> {
        self.overlays.last().copied()
    }
}
