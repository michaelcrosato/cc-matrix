//! Free time on Tippy Cay: walking, talking, finding flip-flops, stepping on mats. And the bot that
//! plays the whole game, menus included.

use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::dialog::{After, Dialog};
use super::events::*;
use super::menus::{Act, Menu, MenuKind};
use super::run::{Phase, RunCtx};
use super::script::{self, *};
use super::*;
use crate::input::{InputFrame, UiEvent, buttons as btn};

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub enum Interact {
    Mat(EvKind),
    Stand,
    Pip,
    Clam,
    Calendar,
    Wardrobe,
    Cabana,
    Npc(u8),
}

const REACH: f32 = 1.9;

impl FitGame {
    /// Everything on the island you can use, with where it is and what the prompt says.
    pub fn island_spots(&self, sim: &Sim) -> Vec<(Interact, Vec3, String)> {
        let s = &self.spots;
        let mut v = vec![
            (Interact::Pip, s.get(HUB, "pip"), "Talk to Pip".to_string()),
            (Interact::Clam, s.get(HUB, "clam"), "Minute Clam".to_string()),
            (Interact::Calendar, s.get(HUB, "calendar"), "Calendar".to_string()),
            (Interact::Cabana, s.get(HUB, "cabana"), "Sleep".to_string()),
        ];
        if self.guest().is_some_and(|g| g.day >= 2 || g.free_play) {
            v.push((Interact::Wardrobe, s.get(HUB, "wardrobe"), "Wardrobe".to_string()));
        }
        for k in ALL_EVENTS {
            let label = if self.event_open(k) { k.name().to_string() } else { format!("Opens on Day {}", k.day()) };
            v.push((Interact::Mat(k), s.get(HUB, &format!("mat_{}", k.key())), label));
        }
        v.push((Interact::Stand, s.get(HUB, "mat_bigstand"), if self.stand_open() { "The Big Stand".to_string() } else { "Opens on Day 5".to_string() }));
        // The cast, wherever they have wandered.
        let npcs = [("posey", POSEY), ("kettle", KETTLE), ("bounce", BOUNCE), ("marjorie", MARJORIE), ("tom", TOM), ("twin", TWINS), ("guest", GUEST)];
        let (lo, hi) = (s.get(HUB, "arrive").x - 60.0, s.get(HUB, "arrive").x + 60.0);
        for e in sim.state.entities.iter() {
            if e.pos.x < lo || e.pos.x > hi {
                continue;
            }
            if let Some((_, who)) = npcs.iter().find(|(n, _)| *n == e.name) {
                if let Some(f) = sim.feet(e.id) {
                    v.push((Interact::Npc(*who), f, format!("Talk to {}", script::SPEAKERS[*who as usize])));
                }
            }
        }
        v.push((Interact::Npc(GULL), s.get(HUB, "gull"), "Talk to the Commodore".to_string()));
        v
    }

    pub fn island_tick(&mut self, sim: &mut Sim, input: &InputFrame, dt: f32, ev: &mut Vec<SimEvent>) {
        let Some(pid) = sim.state.player else { return };
        let Some(feet) = sim.feet(pid) else { return };
        // The first entry of a morning: the story beat is told once by `After::IslandDay`.
        let spots = self.island_spots(sim);
        let near = spots.iter().filter(|(_, p, _)| flat(*p - feet) < REACH).min_by(|a, b| flat(a.1 - feet).total_cmp(&flat(b.1 - feet))).cloned();
        self.near = near.clone();
        // What the mouse points at gets a ring, and can be clicked.
        self.pointing = input.aim.and_then(|aim| spots.iter().filter(|(_, p, _)| flat(*p - aim) < 1.2).min_by(|a, b| flat(a.1 - aim).total_cmp(&flat(b.1 - aim))).map(|s| (s.1, s.2.clone())));
        // Hand input.
        let stick = input.move_dir;
        if stick.length() > 0.05 {
            self.walk_path.clear();
            self.walk_then = None;
            let jog = input.down(btn::SPRINT);
            self.move_dir = stick.clamp_length_max(1.0) * if jog { 1.0 } else { 0.62 };
        }
        // Mouse: click a thing or the ground, and walk there.
        if input.just(btn::PRIMARY) {
            if let Some(aim) = input.aim {
                let hit = spots.iter().filter(|(_, p, _)| flat(*p - aim) < 1.2).min_by(|a, b| flat(a.1 - aim).total_cmp(&flat(b.1 - aim))).cloned();
                let goal = hit.as_ref().map(|h| h.1).unwrap_or(aim);
                if self.nav.is_none() {
                    self.nav = crate::nav::NavGrid::for_room(sim).map(Arc::new);
                }
                self.walk_path = self.nav.as_ref().and_then(|n| n.path(feet, goal)).unwrap_or_else(|| vec![goal]);
                self.walk_then = hit.map(|h| h.0);
            }
        } else if input.just(btn::CONFIRM) {
            if let Some((what, _, _)) = near.clone() {
                self.interact(sim, what, ev);
                return;
            }
        }
        if !self.walk_path.is_empty() {
            let to = self.walk_path[0];
            if flat(to - feet) < 0.5 {
                self.walk_path.remove(0);
            } else {
                let d = Vec2::new(to.x - feet.x, to.z - feet.z);
                self.move_dir = d.normalize_or_zero() * 0.8;
            }
            if let Some(what) = self.walk_then {
                let there = spots.iter().find(|s| s.0 == what).map(|s| s.1);
                if there.is_some_and(|p| flat(p - feet) < REACH * 0.8) {
                    self.walk_path.clear();
                    self.walk_then = None;
                    self.interact(sim, what, ev);
                    return;
                }
            }
        }
        // The sea goes on washing, whether or not anyone has asked it to.
        if self.tick % 420 == 1 {
            ev.push(SimEvent::Sfx { id: sfx::SEA, gain: 0.9, pitch: 1.0 });
        }
        self.wave_cool = (self.wave_cool - dt).max(0.0);
        if input.just(btn::WAVE) && self.wave_cool <= 0.0 {
            self.wave_cool = 2.0;
            let id = crate::clips::find_cached("CMU/Wave_Hello");
            if let Some(ch) = sim.state.entities.get_mut(pid).and_then(|e| e.character.as_mut()) {
                ch.anim.replay_clip(id, crate::clips::ONCE | crate::clips::UPPER, 1.0);
            }
            if let Some((Interact::Npc(who), _, _)) = spots.iter().filter(|(_, p, _)| flat(*p - feet) < 5.0).min_by(|a, b| flat(a.1 - feet).total_cmp(&flat(b.1 - feet))) {
                let n = sim.state.rng.next_u32();
                self.msg = Some((format!("{}: {}", script::SPEAKERS[*who as usize], script::line("wave_back", n)), 3.0));
                ev.push(SimEvent::Syllable { speaker: *who, vowel: 1, pitch: 1.1 });
            }
        }
        if input.just(btn::SCHEDULE) {
            self.menus.push(Menu::new(MenuKind::Schedule));
            ev.push(SimEvent::Sfx { id: sfx::CONFIRM, gain: 0.5, pitch: 1.1 });
            return;
        }
        // Lost flip-flops.
        for k in 0..5 {
            let done = self.guest().is_some_and(|g| g.flops[k]);
            if done {
                continue;
            }
            if let Some(id) = self.flop_ids[k] {
                if sim.state.entities.get(id).is_some_and(|e| flat(e.pos - feet) < 1.2) {
                    if let Some(e) = sim.state.entities.get_mut(id) {
                        e.pos.y = -9.0;
                    }
                    self.guest_mut().flops[k] = true;
                    let n = self.guest().map(|g| g.flops.iter().filter(|f| **f).count()).unwrap_or(0);
                    self.msg = Some((format!("A lost flip-flop. That makes {n} of 5."), 3.0));
                    ev.push(SimEvent::Sfx { id: sfx::POP, gain: 0.8, pitch: 1.3 });
                    self.store();
                }
            }
        }
        if let Some((_, left)) = &mut self.msg {
            *left -= dt;
        }
        self.msg = self.msg.take().filter(|m| m.1 > 0.0);
    }

    pub fn keep_on_land(&mut self, sim: &mut Sim) {
        let Some(pid) = sim.state.player else { return };
        let Some(f) = sim.feet(pid) else { return };
        let c = self.spots.get(HUB, "arrive") + Vec3::new(0.0, 0.0, 2.0);
        // Tiles are grass and sand out to about 33 m by 25 m; further, the sea politely declines.
        let (dx, dz) = ((f.x - c.x).abs(), (f.z - c.z).abs());
        let (ox, oz) = ((dx - 23.0).max(0.0), (dz - 15.0).max(0.0));
        let out = Vec2::new(ox, oz).length();
        let pier = (f.x - c.x).abs() < 2.2 && f.z > c.z;
        if out > 10.2 && !pier {
            let back = Vec2::new(c.x - f.x, c.z - f.z).normalize_or_zero();
            sim.set_position(pid, f + Vec3::new(back.x, 0.0, back.y) * 0.4);
            if self.msg.is_none() {
                self.msg = Some(("Pip: Please do not swim. The sea is not on your schedule.".into(), 2.5));
            }
        }
    }

    pub fn interact(&mut self, sim: &mut Sim, what: Interact, ev: &mut Vec<SimEvent>) {
        let n = sim.state.rng.next_u32();
        let (day, free) = self.guest().map(|g| (g.day, g.free_play)).unwrap_or((1, false));
        match what {
            Interact::Mat(k) => {
                if self.event_open(k) {
                    self.start_event(sim, k, RunCtx::Stay, ev);
                } else {
                    let mut d = Dialog::new(After::Nothing);
                    d.push(PIP, format!("{} opens on Day {}. It is resting. Please do not wake it.", k.name(), k.day()));
                    self.dialog = Some(d);
                }
            }
            Interact::Stand => {
                if self.stand_open() {
                    self.start_finale(sim, 0, ev);
                } else {
                    let mut d = Dialog::new(After::Nothing);
                    d.push(MARJORIE, script::line("marjorie_stand", n));
                    self.dialog = Some(d);
                }
            }
            Interact::Pip => {
                let mut d = Dialog::new(After::Nothing);
                match self.day_goal() {
                    Some(goal) if self.goal_met() => {
                        d.push(PIP, format!("You have banked your {goal} minutes. Your cabana is that way. It has been waiting."));
                    }
                    Some(goal) => {
                        let have = self.guest().map(|g| g.minutes).unwrap_or(0);
                        d.push(PIP, format!("You have {have} minutes of {goal}. {}", script::line("pip_idle", n)));
                    }
                    None if free => d.push(PIP, script::line("pip_free", n)),
                    None => d.push(PIP, "Today is the Big Stand. It is on the sand by the pier. Everyone will be there. They have rafts.".to_string()),
                }
                self.dialog = Some(d);
            }
            Interact::Clam => {
                ev.push(SimEvent::Sfx { id: sfx::GULP, gain: 0.9, pitch: 1.0 });
                ev.push(SimEvent::Sfx { id: sfx::BURP, gain: 0.8, pitch: 1.0 });
                let total = self.guest().map(|g| g.total_minutes).unwrap_or(0);
                let next = meta::HATS.iter().map(|h| h.1).chain(meta::EXTRAS.iter().map(|e| e.1)).filter(|m| *m > total).min();
                let mut d = Dialog::new(After::Nothing);
                d.push(PIP, format!("The Clam holds {total} of your minutes. Our minutes are longer. It is a wellness thing."));
                match next {
                    Some(m) => d.push(PIP, format!("At {m} it may give something back. It has not decided.")),
                    None => d.push(PIP, "It has given you everything. It looks tired. It is a clam.".to_string()),
                }
                self.dialog = Some(d);
            }
            Interact::Calendar => self.menus.push(Menu::new(MenuKind::Calendar)),
            Interact::Wardrobe => self.menus.push(Menu::new(MenuKind::Wardrobe)),
            Interact::Cabana => {
                if self.goal_met() {
                    let mut d = Dialog::new(After::EndDay);
                    d.push(PIP, script::line("pip_sleep", n));
                    self.dialog = Some(d);
                } else {
                    let mut d = Dialog::new(After::Nothing);
                    match self.day_goal() {
                        Some(goal) => {
                            let have = self.guest().map(|g| g.minutes).unwrap_or(0);
                            d.push(PIP, format!("You are not tired yet. I checked. You have {have} minutes of {goal}."));
                        }
                        None => d.push(PIP, "The bed is made. It will stay made. Enjoy the island.".to_string()),
                    }
                    self.dialog = Some(d);
                }
            }
            Interact::Npc(who) => {
                let mut d = Dialog::new(After::Nothing);
                if who == TOM {
                    self.tom_talk(&mut d, n, ev, sim);
                } else {
                    let key = match who {
                        POSEY => "coach_0".to_string(),
                        KETTLE => "coach_1".to_string(),
                        BOUNCE => "coach_2".to_string(),
                        GULL => "coach_3".to_string(),
                        MARJORIE => format!("marjorie_{}", day.min(5)),
                        TWINS => "twins".to_string(),
                        _ => "guests".to_string(),
                    };
                    d.push(who, script::line(&key, n));
                }
                self.dialog = Some(d);
            }
        }
    }

    fn tom_talk(&mut self, d: &mut Dialog, n: u32, ev: &mut Vec<SimEvent>, sim: &mut Sim) {
        let g = self.guest_mut();
        let found = g.flops.iter().filter(|f| **f).count();
        if found == 5 && !g.tom_rewarded {
            g.tom_rewarded = true;
            g.wear.gold_shoes = true;
            d.push(TOM, "All five. I only have two feet. I do not know whose the others are.");
            d.push(TOM, "Take these. They are gold. They were never comfortable.");
            ev.push(SimEvent::Sfx { id: sfx::FANFARE, gain: 0.8, pitch: 1.2 });
            self.dress(sim);
            self.store();
        } else if found == 5 {
            d.push(TOM, "I have five flip-flops now. I am the richest man on this island.");
        } else {
            d.push(TOM, format!("I have lost my flip-flops. All five. You have found {found}."));
            d.push(TOM, script::line("tom", n));
        }
    }

    /// What a good player would press now, on every screen: `Game::bot`.
    pub fn bot_input(&self, sim: &Sim) -> InputFrame {
        let mut f = InputFrame::default();
        if self.hub {
            f.held |= btn::HUB_GO;
        }
        let t = self.tick;
        let tap = |f: &mut InputFrame, b: u32| {
            f.held |= b;
            f.pressed |= b;
        };
        if self.attract.is_some() {
            f.any = true;
            return f;
        }
        if let Some(m) = self.menus.last() {
            if t % 6 != 0 {
                return f;
            }
            let items = self.menu_items(m);
            let find = |want: &dyn Fn(&Act) -> bool| items.iter().position(|i| want(&i.act));
            let choice = match m.kind {
                MenuKind::Title => find(&|a| matches!(a, Act::NewStay)),
                MenuKind::Slot | MenuKind::Name => Some(0),
                MenuKind::Look => find(&|a| matches!(a, Act::Begin)),
                MenuKind::Result => find(&|a| matches!(a, Act::Leave)),
                MenuKind::Schedule => {
                    // On the Today tab: end the day or go to the stand. Else the tab holding what's next.
                    let next = self.bot_next_event();
                    if self.goal_met() && next.is_none() || self.stand_open() {
                        if m.tab != 4 {
                            f.ui = Some(UiEvent::Click(1004));
                            return f;
                        }
                        find(&|a| matches!(a, Act::EndDay | Act::GoStand))
                    } else if let Some(k) = next {
                        if m.tab != k.pavilion() {
                            f.ui = Some(UiEvent::Click(1000 + k.pavilion() as u16));
                            return f;
                        }
                        find(&|a| matches!(a, Act::GoEvent(e) if *e == k))
                    } else {
                        None
                    }
                }
                _ => None,
            };
            match choice {
                Some(i) => f.ui = Some(UiEvent::Click(i as u16)),
                None => tap(&mut f, btn::BACK),
            }
            return f;
        }
        if self.dialog.is_some() {
            if t % 3 == 0 {
                tap(&mut f, btn::CONFIRM);
            }
            return f;
        }
        match self.mode {
            Mode::Island => {
                if t % 20 == 0 {
                    tap(&mut f, btn::SCHEDULE);
                }
            }
            Mode::Check => {
                if let Some(c) = &self.check {
                    apply_intent(&mut f, &c.bot(&self.check_core, &self.rules));
                }
            }
            Mode::Run => {
                if let Some(r) = &self.run {
                    match r.phase {
                        Phase::Card => {
                            if t % 6 == 0 {
                                tap(&mut f, btn::CONFIRM);
                            }
                        }
                        Phase::Play => apply_intent(&mut f, &r.bot(&self.rules)),
                        _ => {}
                    }
                }
            }
            Mode::Ending | Mode::Credits | Mode::PassPad => {
                if t % 6 == 0 {
                    tap(&mut f, btn::CONFIRM);
                }
            }
            _ => {}
        }
        let _ = sim;
        f
    }

    /// The next event the bot wants: today's own, not yet done.
    pub fn bot_next_event(&self) -> Option<EvKind> {
        let g = self.guest()?;
        ALL_EVENTS.iter().copied().find(|k| k.day() == g.day && !g.done_today.contains(k.key()))
    }
}

pub fn apply_intent(f: &mut InputFrame, i: &Intent) {
    f.lean = i.lean;
    let mut set = |on: bool, just: bool, b: u32| {
        if on || just {
            f.held |= b;
        }
        if just {
            f.pressed |= b;
        }
    };
    set(i.act, i.act_p, btn::CONFIRM);
    set(i.l, i.l_p, btn::STEP_L);
    set(i.r, i.r_p, btn::STEP_R);
}

fn flat(v: Vec3) -> f32 {
    Vec2::new(v.x, v.z).length()
}
