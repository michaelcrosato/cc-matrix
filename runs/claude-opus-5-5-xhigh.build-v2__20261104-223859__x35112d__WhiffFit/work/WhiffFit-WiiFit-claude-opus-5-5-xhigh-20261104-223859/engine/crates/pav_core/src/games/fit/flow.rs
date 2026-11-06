//! The game's flow: what a tick does on each screen, and how screens lead to each other.

use glam::{Quat, Vec2, Vec3};
use serde::{Deserialize, Serialize};

use super::check::Check;
use super::dialog::{Dialog, Who};
use super::events::{EventKind, Intent};
use super::island::{self, PAVILIONS, Spot};
use super::menus::MAct;
use super::meta::{self, Guest};
use super::run::{EventRun, RunPhase};
use super::script;
use super::world::*;
use super::{After, FitGame, Flow, Overlay};
use crate::entity::EntityId;
use crate::frame::SimEvent;
use crate::input::{InputFrame, UiEvent, buttons as b};
use crate::sim::Sim;

/// The Balance Age reveal.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Report {
    pub age: u8,
    pub prev: Option<u8>,
    pub t: f32,
    pub last_shown: i32,
    pub done_roll: bool,
    pub comment: Vec<String>,
    pub line: usize,
    pub metrics: [f32; 4],
}

/// A gull in flight: three no-physics entities, the wings rotated in code.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct GullRig {
    pub body: Option<EntityId>,
    pub wings: Vec<EntityId>,
    pub center: Vec3,
    pub radius: f32,
    pub speed: f32,
    pub angle: f32,
    pub height: f32,
    pub phase: f32,
}

pub fn spawn_gulls(sim: &mut Sim, stage: Vec3) -> Vec<GullRig> {
    let mut out = Vec::new();
    for i in 0..3 {
        let f = i as f32;
        let center = stage + Vec3::new(-8.0 + f * 7.0, 0.0, -2.0 + f * 3.0);
        let body = spawn_prop(sim, "LIB/core/gull", center, 0.0, 1.0);
        let wing_l = spawn_prop(sim, "LIB/core/gull_wing", center, 0.0, 1.0);
        let wing_r = spawn_prop(sim, "LIB/core/gull_wing", center, std::f32::consts::PI, 1.0);
        out.push(GullRig {
            body: Some(body),
            wings: vec![wing_l, wing_r],
            center,
            radius: 15.0 + f * 5.0,
            speed: 0.3 - f * 0.05,
            angle: f * 2.0,
            height: 9.0 + f * 1.5,
            phase: f,
        });
    }
    out
}

fn tick_gulls(gulls: &mut [GullRig], sim: &mut Sim, t: f32, dt: f32) {
    for g in gulls.iter_mut() {
        g.angle += g.speed * dt;
        let dir = Vec3::new(g.angle.cos(), 0.0, g.angle.sin());
        let at = g.center + dir * g.radius + Vec3::Y * (g.height + (t * 0.6 + g.phase).sin() * 0.8);
        let yaw = (-dir.z).atan2(dir.x) + std::f32::consts::FRAC_PI_2 + std::f32::consts::PI;
        let rot = Quat::from_rotation_y(yaw);
        if let Some(body) = g.body {
            pose(sim, body, at, rot);
        }
        let flap = (t * 7.0 + g.phase * 3.0).sin() * 0.55;
        for (i, w) in g.wings.clone().into_iter().enumerate() {
            let side = if i == 0 { 1.0 } else { -1.0 };
            let q = rot * Quat::from_rotation_z(side * flap) * if i == 1 { Quat::from_rotation_y(std::f32::consts::PI) } else { Quat::IDENTITY };
            pose(sim, w, at + Vec3::Y * 0.06, q);
        }
    }
}

/// Commodore Gull on his post: the body and two wings, three entities with no physics.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct CommodoreRig {
    pub wings: Vec<EntityId>,
    pub shoulder: Vec3,
    pub rot: Quat,
    pub phase: f32,
}

/// Rigs every `commodore` a set has placed.
pub fn spawn_commodores(sim: &mut Sim) -> Vec<CommodoreRig> {
    let found: Vec<(Vec3, Quat)> = sim.state.entities.iter().filter(|e| e.name == "commodore").map(|e| (e.pos, e.rot)).collect();
    let mut out = Vec::new();
    for (i, (pos, rot)) in found.into_iter().enumerate() {
        let shoulder = pos + Vec3::Y * 1.32 + rot * Vec3::new(0.0, 0.0, -0.05);
        let wing_l = spawn_prop(sim, "LIB/core/gull_wing", shoulder, 0.0, 0.85);
        let wing_r = spawn_prop(sim, "LIB/core/gull_wing", shoulder, std::f32::consts::PI, 0.85);
        out.push(CommodoreRig { wings: vec![wing_l, wing_r], shoulder, rot, phase: i as f32 * 1.7 });
    }
    out
}

/// Wings folded and twitching; they make his points for him while he talks.
fn tick_commodores(rigs: &[CommodoreRig], sim: &mut Sim, t: f32, talking: bool) {
    for g in rigs {
        let lift = if talking { -0.35 + (t * 9.0 + g.phase).sin() * 0.55 } else { -1.3 + (t * 0.9 + g.phase).sin().powi(9) * 0.3 };
        for (i, w) in g.wings.iter().enumerate() {
            let side = if i == 0 { 1.0 } else { -1.0 };
            let q = g.rot * Quat::from_rotation_z(side * lift) * if i == 1 { Quat::from_rotation_y(std::f32::consts::PI) } else { Quat::IDENTITY };
            pose(sim, *w, g.shoulder, q);
        }
    }
}

/// Builds the About pages from the page's plain-text block (`about-data`), or says nothing is there.
pub fn about_pages(text: &str) -> Vec<(String, String)> {
    let Ok(v) = serde_json::from_str::<serde_json::Value>(text) else {
        return vec![(super::TITLE.to_string(), "A game about standing.".to_string())];
    };
    let mut out = Vec::new();
    let split = |title: &str, body: String, out: &mut Vec<(String, String)>| {
        // Pages, not a scrolling wall: about 13 lines of 34 px text fit a card.
        let max = 960;
        let mut page = String::new();
        let mut n = 1;
        let mut pages: Vec<String> = Vec::new();
        for line in body.lines() {
            for sentence in line.split_inclusive(". ") {
                if page.len() + sentence.len() > max {
                    pages.push(std::mem::take(&mut page));
                    n += 1;
                }
                page.push_str(sentence);
            }
            page.push('\n');
        }
        pages.push(page);
        let many = n > 1;
        for (i, p) in pages.into_iter().enumerate() {
            let t = if many { format!("{title} ({})", i + 1) } else { title.to_string() };
            out.push((t, p.trim().to_string()));
        }
    };
    if let Some(si) = v.get("sourceInformation").and_then(|s| s.as_object()) {
        let order = [
            ("date", "Date"),
            ("source", "Source"),
            ("plan", "Plan"),
            ("genre", "Genre"),
            ("perspective", "Perspective"),
            ("tech", "Tech"),
            ("artDirection", "Art Direction"),
            ("animation", "Animation"),
            ("audio", "Audio"),
            ("online", "Online"),
            ("testing", "Testing"),
            ("research", "Research"),
            ("environment", "Environment"),
            ("model", "Model"),
            ("usage", "Usage"),
        ];
        let body: Vec<String> =
            order.iter().filter_map(|(k, l)| si.get(*k).and_then(|x| x.as_str()).map(|x| format!("{l}: {x}"))).collect();
        split("Source Information", body.join("\n"), &mut out);
    }
    for (key, title, qs) in [
        (
            "testingFeedback",
            "Testing Feedback",
            &["How many issues did testing catch?", "How many were critical?", "Most helpful test?", "Least helpful test?"][..],
        ),
        (
            "engineFeedback",
            "Engine Feedback",
            &["Liked most?", "Stuck or guessed wrong?", "Most important thing built?", "Hardest part?", "Changed in the engine?", "One change?"][..],
        ),
        ("promptFeedback", "Prompt Feedback", &["Liked most?", "Confusing?", "Hardest?", "Would change?"][..]),
    ] {
        if let Some(list) = v.get(key).and_then(|x| x.as_array()) {
            let body: Vec<String> = list
                .iter()
                .enumerate()
                .filter_map(|(i, a)| a.as_str().map(|a| format!("{} {a}", qs.get(i).copied().unwrap_or(""))))
                .collect();
            split(title, body.join("\n"), &mut out);
        }
    }
    if let Some(c) = v.get("credits").and_then(|c| c.as_str()) {
        split("Credits", c.to_string(), &mut out);
    }
    if out.is_empty() {
        out.push((super::TITLE.to_string(), "A game about standing.".to_string()));
    }
    out
}

impl FitGame {
    // ------------------------------------------------------------------ transitions

    pub fn to_title(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        self.flow = Flow::Title;
        self.overlays.clear();
        self.dialog = None;
        self.focus = 0;
        self.scroll = 0;
        self.idle = 0.0;
        self.slot = None;
        show_set(sim, Set::Hub);
        let at = self.stages[0];
        place(sim, self.pid, at + Vec3::new(0.0, 0.0, 3.5), 0.0);
        stop_clip(sim, self.pid);
        clear_lean(sim, self.pid);
        cam_orbit(sim, 26.0, 44.0, 40.0, 2.0, -60.0, 60.0, 70.0);
        self.music(ev, song::LOBBY);
        self.set_look(sim, None);
    }

    /// Dresses the player's figure as the guest (or a demo figure).
    pub fn set_look(&self, sim: &mut Sim, g: Option<&Guest>) {
        let look = match g {
            Some(g) => meta::guest_look(g),
            None => meta::guest_look(&Guest { outfit: 0, skin: 1, ..Default::default() }),
        };
        if let Some(ch) = sim.state.entities.get_mut(self.pid).and_then(|e| e.character.as_mut()) {
            ch.puppet = Some(std::sync::Arc::new(look));
        }
    }

    /// Opens an overlay and remembers where the focus was.
    pub fn push_overlay(&mut self, o: Overlay) {
        self.focus_stack.push(self.focus);
        self.overlays.push(o);
        self.focus = 0;
        self.scroll = 0;
    }

    pub fn pop_overlay(&mut self) {
        if self.overlays.pop().is_some() {
            self.focus = self.focus_stack.pop().unwrap_or(0);
            self.scroll = 0;
        }
    }

    pub fn close_overlays(&mut self) {
        self.overlays.clear();
        self.focus_stack.clear();
        self.focus = 0;
        self.scroll = 0;
    }

    fn say(&mut self, who: Who, lines: Vec<String>, then: After) {
        let lines = if self.dev.skip_dialog { lines.into_iter().take(1).collect() } else { lines };
        self.dialog = Some(Dialog::new(who, lines));
        self.after = then;
    }

    /// Words with the guest's numbers filled in.
    fn words(&self, text: &str, n: i64) -> String {
        let g = self.guest();
        let name = g.map(|g| g.name.clone()).unwrap_or_else(|| "Guest".into());
        let age = g.and_then(|g| g.ages.last().copied()).unwrap_or(0);
        script::fill(
            text,
            &[
                ("name", name),
                ("age", age.to_string()),
                ("n", n.to_string()),
                ("day", g.map(|g| g.day).unwrap_or(1).to_string()),
                ("minutes", g.map(|g| g.minutes).unwrap_or(0).to_string()),
                ("wobbles", g.map(|g| g.total_wobbles).unwrap_or(0).to_string()),
                ("title", super::TITLE.to_string()),
            ],
        )
    }

    fn lines(&self, key: &str, n: i64) -> Vec<String> {
        script::list(key).iter().map(|l| self.words(l, n)).collect()
    }

    /// Wakes the guest on their deck: the day starts.
    pub fn begin_day(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let today = self.boot.today;
        let (day, away) = {
            let Some(g) = self.guest_mut() else { return };
            let away = if g.last_date > 0 && today > g.last_date { today - g.last_date } else { 0 };
            g.last_date = today;
            g.today.clear();
            g.talked.clear();
            g.minutes_today = 0;
            g.checked = false;
            (g.day, away)
        };
        self.goal_said = false;
        self.mark_saved();
        let g = self.guest().cloned().unwrap_or_default();
        self.set_look(sim, Some(&g));
        self.refresh_flips(sim);
        show_set(sim, Set::Hub);
        let deck = set_markers(sim, Set::Hub, "int_cabana").first().copied().unwrap_or(self.stages[0]);
        place(sim, self.pid, deck, 0.0);
        gesture(sim, self.pid, "FIT/Wake", false);
        set_facing(sim, self.pid, std::f32::consts::PI);
        cam(sim, 15.0, 165.0, 8.0, 38.0);
        self.music(ev, song::LOBBY);
        let mut lines = Vec::new();
        if away > 0 {
            let key = if away == 1 { "pip.absence1" } else { "pip.absence" };
            lines.push(self.words(&script::line(key, away as usize), away));
        }
        lines.extend(self.lines(&format!("pip.morning{day}"), 0));
        self.flow = Flow::Morning;
        self.say(Who::Pip, lines, After::StartCheck);
    }

    fn start_check(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let dt = sim.dt();
        let check = {
            let mut cx = self.cx(sim, ev, dt);
            Check::new(&mut cx)
        };
        self.flow = Flow::Check(Box::new(check));
        self.music(ev, song::TIDE);
    }

    fn finish_check(&mut self, c: &Check, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let skill = c.skill(&self.rules);
        let r = self.rules.check.clone();
        let (age, prev, day) = {
            let Some(g) = self.guest_mut() else { return };
            let age = meta::balance_age(skill, g.stamps as u32, g.total_stars(), &r);
            let prev = g.ages.last().copied();
            if !g.checked {
                g.ages.push(age);
            }
            g.checked = true;
            g.total_wobbles += c.c.core.wobbles;
            (age, prev, g.day)
        };
        self.mark_saved();
        // Pip's comment: by the change since yesterday, and by the worst metric.
        let change_key = match prev {
            None => "pip.report_first",
            Some(p) if age + 1 < p => "pip.report_better",
            Some(p) if age > p + 1 => "pip.report_worse",
            Some(_) => "pip.report_same",
        };
        let n = age as i64;
        let mut comment = vec![self.words(&script::line(change_key, day as usize), n)];
        let left = (c.c.core.lean_left / (c.c.core.lean_left + c.c.core.lean_right).max(0.01) * 100.0) as i64;
        comment.push(self.words(&script::line(&format!("pip.worst{}", c.worst()), day as usize), left));
        let at = self.stages[Set::Studio as usize];
        let _ = at;
        cam_orbit(sim, 12.0, 8.0, 36.0, 1.0, -22.0, 22.0, 18.0);
        self.flow = Flow::Report(Box::new(Report { age, prev, comment, metrics: c.metrics, last_shown: -1, ..Default::default() }));
        sfx(ev, sound::REVEAL, 0.8, 1.0);
    }

    pub fn to_island(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        show_set(sim, Set::Hub);
        self.flow = Flow::Island;
        self.overlays.clear();
        self.focus = 0;
        // Back at the desk, unless the caller says otherwise.
        let at = self.stages[0] + Vec3::new(0.0, 0.0, 3.5);
        place(sim, self.pid, at, 0.0);
        self.walk.clear();
        self.walk_then = None;
        let g = self.guest().cloned().unwrap_or_default();
        self.set_look(sim, Some(&g));
        cam_full(sim, 40.0, 0.0, 15.0, 40.0, 0.8, 0.12, None);
        stop_clip(sim, self.pid);
        let slump = self.slump();
        if let Some(a) = anim_of(sim, self.pid) {
            a.tilt_side = 0.0;
            a.tilt_fwd = slump;
        }
        self.music(ev, song::LOBBY);
    }

    fn island_at(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>, pos: Vec3) {
        self.to_island(sim, ev);
        place(sim, self.pid, pos, 0.0);
        self.walk.clear();
        self.walk_then = None;
    }

    pub fn start_event(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>, kind: EventKind) {
        let dt = sim.dt();
        self.close_overlays();
        self.dialog = None;
        let day = self.day();
        let mut run = EventRun::new(kind, day, &self.rules);
        run.c.show_trace = self.dev.trace;
        // Yesterday You appears from Day 3.
        if let Some(g) = self.guest() {
            if g.day >= 3 || g.free_play() {
                if let Some(frames) = g.best_ghost.get(kind.key()) {
                    run.ghosts.push(frames.clone());
                    run.ghost_names.push("You, before".into());
                }
            }
        }
        {
            let mut cx = self.cx(sim, ev, dt);
            run.begin(&mut cx);
        }
        self.song = run.st.song();
        self.flow = Flow::Event(Box::new(run));
    }

    /// Banks a finished event: stars, minutes, title, personal best, ghost.
    fn bank(&mut self, run: &mut EventRun, ev: &mut Vec<SimEvent>) {
        let kind = run.kind;
        let key = kind.key().to_string();
        let score = run.out.score;
        let stars = self.rules.stars_for(kind, score);
        run.out.stars = stars;
        let titles = script::list("titles");
        let idx = ((score / 1000.0) * (titles.len().max(1) - 1) as f32).round() as usize;
        run.out.title = titles.get(idx).cloned().unwrap_or_default();
        let comment_key = format!("result.{}", stars);
        run.out.comment = self.words(&script::line(&comment_key, self.stats_played as usize), score as i64);
        self.stats_played += 1;
        let rec = std::mem::take(&mut run.rec);
        let wobbles = run.c.core.wobbles;
        let mut stamped = false;
        if let Some(g) = self.guest_mut() {
            let first_today = !g.today.contains(&key);
            let minutes = if kind == EventKind::BigStand {
                0
            } else if first_today {
                1 + stars as u32
            } else {
                1
            };
            g.minutes += minutes;
            g.minutes_today += minutes;
            if first_today {
                g.today.push(key.clone());
            }
            if !g.played.contains(&key) {
                g.played.push(key.clone());
            }
            let prior = g.bests.get(&key).copied();
            let best = prior.is_none_or(|p| score as u32 > p);
            if best {
                g.bests.insert(key.clone(), score as u32);
                g.best_ghost.insert(key.clone(), rec);
            }
            let s = g.stars.entry(key.clone()).or_insert(0);
            *s = (*s).max(stars);
            g.titles += 1;
            g.total_wobbles += wobbles;
            run.out.minutes = minutes;
            run.out.best = best;
            run.out.prior = prior;
            stamped = true;
        }
        if stamped {
            self.mark_saved();
        }
        let (id, pitch) = match stars {
            0 => (sound::SAD, 1.0),
            1 => (sound::TICK, 1.0),
            2 => (sound::STAR, 1.0),
            _ => (sound::FANFARE, 1.0),
        };
        sfx(ev, id, 0.8, pitch);
        if run.out.minutes > 0 {
            self.clam_pulse = 1.2;
            sfx(ev, sound::CLAM, 0.7, 1.0);
        }
        if stars >= 3 {
            ev.push(SimEvent::Sfx { id: sound::CONFETTI, gain: 0.7, pitch: 1.0 });
        }
    }

    fn after_event(&mut self, run: &mut EventRun, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let dt = sim.dt();
        let kind = run.kind;
        {
            let mut cx = self.cx(sim, ev, dt);
            run.stop(&mut cx);
        }
        if kind == EventKind::BigStand {
            self.finish_stay(run.out.score, sim, ev);
            return;
        }
        // Back to the pavilion's mat.
        let pavilion = PAVILIONS.iter().position(|p| p.events.contains(&kind)).unwrap_or(0);
        let pos = self.spots.iter().find(|s| s.spot == Spot::Mat(pavilion as u8)).map(|s| s.pos).unwrap_or(self.stages[0]);
        self.island_at(sim, ev, pos + Vec3::new(0.0, 0.0, 1.2));
        // The Minute Clam, and whether that's enough for today.
        let (goal, today, day) = {
            let g = self.guest();
            (self.rules.goal(self.day()), g.map(|g| g.minutes_today).unwrap_or(0), self.day())
        };
        if day < 5 && today >= goal && !self.goal_said && !self.guest().is_some_and(|g| g.free_play()) {
            self.goal_said = true;
            let lines = self.lines("pip.goal_met", goal as i64);
            self.say(Who::Pip, lines, After::Nothing);
        }
    }

    /// Final Balance Age and the ending.
    fn finish_stay(&mut self, score: f32, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let checkout = self.rules.flow.checkout_age as u8;
        let (win, age) = {
            let Some(g) = self.guest_mut() else { return };
            let morning = g.ages.last().copied().unwrap_or(60);
            let age = (morning as f32 - score / 100.0).round().clamp(18.0, 99.0) as u8;
            g.final_age = age;
            g.ages.push(age);
            (age <= checkout, age)
        };
        self.mark_saved();
        let kind = if win { 1 } else { 2 };
        show_set(sim, Set::Hub);
        self.set_end_scene(sim, kind);
        self.flow = Flow::Ending(0.0, kind);
        let key = if win { "pip.end_win" } else { "pip.end_stay" };
        let lines = self.lines(key, age as i64);
        self.say(Who::Pip, lines, After::Credits(kind));
        self.music(ev, song::LOBBY);
    }

    fn set_end_scene(&mut self, sim: &mut Sim, kind: u8) {
        let dock = set_markers(sim, Set::Hub, "end_dock").first().copied().unwrap_or(self.stages[0]);
        if kind == 1 {
            let boat = sim.state.entities.iter().find(|e| e.name == "rowboat").map(|e| e.id);
            if let Some(b) = boat {
                move_to(sim, b, dock);
            }
            place(sim, self.pid, dock + Vec3::Y * 0.55, 1.57);
            play(sim, self.pid, "MESH2MOTION/Sitting_Idle");
            cam_orbit(sim, 14.0, 13.0, 38.0, 1.0, 30.0, 70.0, 40.0);
        } else {
            let spot = self.spots.iter().find(|s| s.spot == Spot::Talk(Who::Marjorie)).map(|s| s.pos).unwrap_or(self.stages[0]);
            place(sim, self.pid, spot + Vec3::new(1.4, 0.0, 0.4), -1.2);
            cam_orbit(sim, 16.0, 8.5, 36.0, 1.0, -10.0, 25.0, 30.0);
        }
    }

    fn finish_game(&mut self, kind: u8, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        if let Some(g) = self.guest_mut() {
            g.ending = kind;
            g.stamps = g.stamps.max(5);
        }
        self.mark_saved();
        self.outcome = crate::games::Outcome::Won;
        self.to_island(sim, ev);
    }

    /// The flip-flops still lost, as things in the world.
    pub fn refresh_flips(&mut self, sim: &mut Sim) {
        for (_, id, _) in self.flips.drain(..) {
            sim.despawn(id);
        }
        let found = self.guest().map(|g| g.flipflops).unwrap_or(0);
        for (i, at) in set_markers(sim, Set::Hub, "flipflop").into_iter().enumerate() {
            if found & (1 << i) == 0 {
                let id = spawn_prop(sim, "LIB/core/flip_flop", at + Vec3::Y * 0.02, i as f32 * 1.3, 1.0);
                self.flips.push((i as u8, id, at));
            }
        }
    }

    // ------------------------------------------------------------------ one tick

    /// Commodore Gull has the floor.
    fn gull_talking(&self) -> bool {
        let his = |d: &Dialog| d.who == Who::Gull;
        let run = match &self.flow {
            Flow::Event(r) => r.c.quip.as_ref().is_some_and(his),
            Flow::Medley(m) => m.run.as_ref().is_some_and(|r| r.c.quip.as_ref().is_some_and(his)),
            _ => false,
        };
        run || self.dialog.as_ref().is_some_and(his) || self.island_quip.as_ref().is_some_and(|(d, _)| his(d))
    }

    /// One tick of whichever screen is up. Returns the player's walking direction.
    pub fn drive(&mut self, sim: &mut Sim, input: &InputFrame, dt: f32, ev: &mut Vec<SimEvent>) -> Vec2 {
        // Sounds of the place.
        let t = self.time;
        if !self.frozen_now() {
            let mut gulls = std::mem::take(&mut self.gulls);
            tick_gulls(&mut gulls, sim, t, dt);
            self.gulls = gulls;
            let talking = self.gull_talking();
            tick_commodores(&self.commodores, sim, t, talking);
            if self.clam_pulse > 0.0 {
                self.clam_pulse -= dt;
            }
            if let Some(c) = self.clam {
                let k = 1.0 + 0.08 * (self.clam_pulse * 14.0).sin() * self.clam_pulse.min(1.0).max(0.0);
                if let Some(p) = sim.state.entities.get_mut(c).and_then(|e| e.prop.as_mut()) {
                    p.scale = k;
                }
            }
            let every = (self.time / 7.0) as i64;
            if every != ((self.time - dt) / 7.0) as i64 && self.song != song::NONE {
                sfx(ev, sound::SEA, 0.25, 1.0);
                if every % 3 == 1 && matches!(self.flow, Flow::Island | Flow::Title) {
                    sfx(ev, sound::GULL, 0.16, 0.9 + (every % 5) as f32 * 0.08);
                }
            }
        }
        // Touch-only cards drop as soon as a real device shows up.
        if self.boot.touch_only && input.any {
            self.boot.touch_only = false;
        }
        // The intro can be skipped.
        if matches!(self.flow, Flow::Intro) && self.dialog.is_some() && self.overlays.is_empty() && input.just(b::BACK | b::SECONDARY) {
            self.dialog = None;
            self.run_after(sim, ev);
            sfx(ev, sound::UI_BACK, 0.6, 1.0);
            return Vec2::ZERO;
        }
        // Dialogue first.
        if self.dialog.is_some() && self.overlays.is_empty() && !input.just(b::PAUSE) {
            let speed = self.save.settings.text_speed;
            let done = {
                let d = self.dialog.as_mut().unwrap();
                d.tick(speed, dt, ev);
                if input.just(b::CONFIRM | b::PRIMARY) { d.advance() } else { false }
            };
            if self.dev.skip_dialog {
                self.dialog = None;
                self.run_after(sim, ev);
            } else if done {
                self.dialog = None;
                self.run_after(sim, ev);
            }
            if matches!(self.flow, Flow::Morning | Flow::Intro | Flow::Island) {
                return Vec2::ZERO;
            }
        }
        // Menus next: they eat input.
        if self.menu().is_some() {
            self.menu_input(sim, input, dt, ev);
        } else {
            self.global_input(sim, input, ev);
        }
        // Settings over a pre-game menu still counts as idle (not the pages you read).
        let pregame = matches!(self.flow, Flow::Title | Flow::Slots | Flow::Names(_) | Flow::Look(..) | Flow::Together(_));
        let reading = matches!(self.overlays.last(), Some(Overlay::About(_) | Overlay::HowTo(_)));
        if pregame && !self.overlays.is_empty() && !reading && !self.boot.touch_only {
            self.idle = if input.any { 0.0 } else { self.idle + dt };
            if self.idle >= self.rules.flow.attract_idle {
                self.close_overlays();
                self.start_attract(sim, ev);
                return Vec2::ZERO;
            }
        } else if reading {
            self.idle = 0.0;
        }
        // How long the pause has lasted: Pip notices.
        if self.overlays.is_empty() {
            self.paused_t = 0.0;
        } else if self.overlays.contains(&Overlay::Pause) {
            self.paused_t += dt;
        }
        // The wardrobe's close-up, and the island's camera back after it.
        let dressing = self.overlays.last() == Some(&Overlay::Wardrobe);
        if dressing != self.dressing {
            self.dressing = dressing;
            if dressing {
                cam_full(sim, 8.0, 0.0, 6.0, 36.0, 0.75, 0.1, None);
                let g = self.guest().cloned().unwrap_or_default();
                self.set_look(sim, Some(&g));
            } else {
                cam_full(sim, 40.0, 0.0, 15.0, 40.0, 0.8, 0.12, None);
            }
        }
        if self.frozen_now() {
            // The figure on the wardrobe's turntable still turns, in its new clothes.
            if dressing {
                self.spin += dt * 0.9;
                let s = self.spin;
                set_facing(sim, self.pid, s);
                let g = self.guest().cloned().unwrap_or_default();
                self.set_look(sim, Some(&g));
            }
            return Vec2::ZERO;
        }
        let mut flow = std::mem::take(&mut self.flow);
        let mut replaced = false;
        let mut mv = Vec2::ZERO;
        match &mut flow {
            Flow::Title | Flow::Slots | Flow::Names(_) | Flow::Together(_) => {
                self.idle = if input.any { 0.0 } else { self.idle + dt };
                if self.boot.touch_only || self.idle >= self.rules.flow.attract_idle {
                    self.flow = flow;
                    self.start_attract(sim, ev);
                    return Vec2::ZERO;
                }
            }
            Flow::Look(..) => {
                self.idle = if input.any { 0.0 } else { self.idle + dt };
                self.spin += dt * 0.7;
                let s = self.spin;
                set_facing(sim, self.pid, s);
                if self.idle >= self.rules.flow.attract_idle {
                    self.flow = flow;
                    self.start_attract(sim, ev);
                    return Vec2::ZERO;
                }
            }
            Flow::Attract(a) => {
                if input.any && !self.boot.touch_only {
                    if let Some(mut run) = a.run.take() {
                        let mut cx = self.cx(sim, ev, dt);
                        run.stop(&mut cx);
                    }
                    self.flow = Flow::Title;
                    self.to_title(sim, ev);
                    return Vec2::ZERO;
                }
                self.attract_tick(a, sim, input, dt, ev);
            }
            Flow::Intro | Flow::Morning => {}
            Flow::Check(c) => {
                let it = Intent::from_input(input, self.save.settings.lean_sens);
                if let Some(q) = &mut c.c.quip {
                    q.tick(self.save.settings.text_speed, dt, ev);
                    c.c.quip_t -= dt;
                    if c.c.quip_t <= 0.0 {
                        c.c.quip = None;
                    }
                }
                let done = {
                    let mut cx = self.cx(sim, ev, dt);
                    c.tick(&mut cx, &it)
                };
                self.rumble = c.rumble;
                if done {
                    let chk = (**c).clone();
                    self.finish_check(&chk, sim, ev);
                    replaced = true;
                }
            }
            Flow::Report(r) => {
                r.t += dt;
                // The big number rolls like a slot machine.
                let shown = self.report_number(r);
                if shown != r.last_shown {
                    r.last_shown = shown;
                    sfx(ev, sound::AGE_TICK, 0.5, 0.9 + (r.t * 0.2).min(0.8));
                }
                if !r.done_roll && r.t >= 2.4 {
                    r.done_roll = true;
                    sfx(ev, sound::STAMP, 0.9, 1.0);
                    sfx(ev, sound::PIP_SQUEAK, 0.7, 1.0);
                }
                if input.just(b::CONFIRM | b::PRIMARY) && r.t > 0.4 {
                    if !r.done_roll {
                        r.t = 2.4;
                    } else if r.t > 2.8 {
                        r.line += 1;
                        if r.line >= r.comment.len() {
                            let day = self.day();
                            let lines = self.lines(&format!("pip.beat{day}"), 0);
                            self.flow = flow;
                            self.to_island(sim, ev);
                            self.say(Who::Pip, lines, After::Nothing);
                            return Vec2::ZERO;
                        }
                    }
                }
            }
            Flow::Island => mv = self.island_tick(sim, input, dt, ev),
            Flow::Event(run) => {
                // Flip-flops can be found on the lap too.
                if run.kind == EventKind::MorningLap && run.phase == RunPhase::Play {
                    self.pick_flips(sim, ev);
                }
                if self.dev.win_now || self.dev.lose_now {
                    if run.phase != RunPhase::Result {
                        run.out.score = if self.dev.win_now { 1000.0 } else { 0.0 };
                        run.c.score = run.out.score;
                        run.phase = RunPhase::Result;
                        run.pt = 0.0;
                        self.bank(run, ev);
                    }
                    self.dev.win_now = false;
                    self.dev.lose_now = false;
                }
                let it = self.event_intent(run, input);
                let finished = {
                    let mut cx = self.cx(sim, ev, dt);
                    run.tick(&mut cx, &it)
                };
                if finished {
                    self.bank(run, ev);
                    let at = sim.feet(self.pid).unwrap_or(Vec3::ZERO);
                    if run.out.stars >= 3 {
                        ev.push(SimEvent::Confetti { pos: at + Vec3::Y * 2.2 });
                    }
                    // How it went, in the figure's shoulders.
                    let (clip, upper) = match run.out.stars {
                        0 => ("FIT/Sigh", true),
                        1 | 2 => ("FIT/Bow", false),
                        _ => ("MESH2MOTION/Victory", false),
                    };
                    gesture(sim, self.pid, clip, upper);
                    cam_orbit(sim, 14.0, 8.5, 36.0, 1.0, -28.0, 28.0, 22.0);
                    self.music(ev, song::LOBBY);
                }
                // The card's Leave.
                if run.phase == RunPhase::Card && input.just(b::BACK | b::SECONDARY) && self.direct.is_none() {
                    self.after_event(run, sim, ev);
                    replaced = true;
                }
            }
            Flow::Stamp(t, day) => {
                if *t <= 0.0 {
                    // The guest turns in on the deck while the stamp lands.
                    let deck = set_markers(sim, Set::Hub, "int_cabana").first().copied().unwrap_or(self.stages[0]);
                    place(sim, self.pid, deck, std::f32::consts::PI);
                    play(sim, self.pid, "FIT/Sleep");
                }
                *t += dt;
                if *t >= 0.7 && *t - dt < 0.7 {
                    sfx(ev, sound::STAMP, 1.0, 1.0);
                    self.clam_pulse = 0.6;
                }
                if *t >= 2.8 || (input.just(b::CONFIRM | b::PRIMARY) && *t > 1.0) {
                    let d = *day;
                    if let Some(g) = self.guest_mut() {
                        g.day = (d + 1).min(5);
                    }
                    self.flow = flow;
                    self.begin_day(sim, ev);
                    return Vec2::ZERO;
                }
            }
            Flow::Ending(t, kind) => {
                *t += dt;
                if *kind == 1 {
                    // Rowing away.
                    let dock = set_markers(sim, Set::Hub, "end_dock").first().copied().unwrap_or(Vec3::ZERO);
                    let boat = sim.state.entities.iter().find(|e| e.name == "rowboat").map(|e| e.id);
                    let at = dock + Vec3::new(*t * 0.9, 0.0, *t * 0.2);
                    if let Some(b) = boat {
                        pose(sim, b, at, Quat::from_rotation_y(1.35));
                    }
                    place(sim, self.pid, at + Vec3::Y * 0.55, 1.35);
                }
            }
            Flow::Credits(t, kind) => {
                *t += dt;
                let lines = script::count("credits") as f32;
                if *t >= lines * 2.4 + 2.0 || input.just(b::CONFIRM | b::PRIMARY) && *t > 1.0 {
                    let k = *kind;
                    self.flow = flow;
                    self.finish_game(k, sim, ev);
                    return Vec2::ZERO;
                }
            }
            Flow::Medley(m) => {
                let mut mm = std::mem::take(&mut **m);
                self.medley_tick(&mut mm, sim, input, ev, dt);
                **m = mm;
            }
        }
        if !replaced {
            self.flow = flow;
        }
        mv
    }

    fn event_intent(&self, _run: &EventRun, input: &InputFrame) -> Intent {
        self.intent(input)
    }

    /// The input that isn't menus: pause and the schedule.
    fn global_input(&mut self, sim: &mut Sim, input: &InputFrame, ev: &mut Vec<SimEvent>) {
        let _ = sim;
        if input.just(b::PAUSE) {
            let pausable = !matches!(self.flow, Flow::Attract(_));
            if pausable {
                self.push_overlay(Overlay::Pause);
                sfx(ev, sound::UI_CONFIRM, 0.6, 1.1);
            }
        }
    }

    fn run_after(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        match std::mem::take(&mut self.after) {
            After::Nothing | After::Island => {}
            After::Morning => self.begin_day(sim, ev),
            After::StartCheck => self.start_check(sim, ev),
            After::Credits(k) => {
                self.flow = Flow::Credits(0.0, k);
                self.music(ev, song::LOBBY);
            }
        }
    }

    pub fn report_number(&self, r: &Report) -> i32 {
        if r.t >= 2.4 {
            return r.age as i32;
        }
        // Spins quickly, then slows onto the number.
        let u = (r.t / 2.4).min(1.0);
        let k = 1.0 - (1.0 - u).powi(3);
        let spins = (k * 42.0) as i32;
        18 + (r.age as i32 - 18 + spins * 7).rem_euclid(82)
    }

    // ------------------------------------------------------------------ the island

    fn island_tick(&mut self, sim: &mut Sim, input: &InputFrame, dt: f32, ev: &mut Vec<SimEvent>) -> Vec2 {
        let mut feet = sim.feet(self.pid).unwrap_or(self.stages[0]);
        if feet.y < -0.4 {
            // Should anyone manage the sea after all: back to the desk, dry.
            sfx(ev, sound::SPLASH_S, 0.8, 1.0);
            feet = self.stages[0] + Vec3::new(0.0, 0.0, 3.5);
            place(sim, self.pid, feet, 0.0);
        }
        self.wave_t = (self.wave_t - dt).max(0.0);
        // Dialog just closed this tick; nothing else.
        if let Some((q, t)) = &mut self.island_quip {
            q.tick(self.save.settings.text_speed, dt, ev);
            *t -= dt;
            if *t <= 0.0 {
                self.island_quip = None;
            }
        }
        self.pick_flips(sim, ev);
        // Nearest thing you can use.
        let mut best: Option<(usize, f32)> = None;
        for (i, s) in self.spots.iter().enumerate() {
            let p = s.id.and_then(|id| sim.feet(id)).unwrap_or(s.pos);
            let d = Vec2::new(p.x - feet.x, p.z - feet.z).length();
            if d < 2.6 && best.is_none_or(|b| d < b.1) && self.spot_open(s.spot) {
                best = Some((i, d));
            }
        }
        self.near = best.map(|b| b.0);
        // The pointer: the thing under it gets a ring; a click walks there, then uses it.
        let under = input.aim.and_then(|a| {
            self.spots
                .iter()
                .enumerate()
                .filter(|(_, s)| self.spot_open(s.spot))
                .map(|(i, s)| (i, s.id.and_then(|id| sim.feet(id)).unwrap_or(s.pos)))
                .find(|(_, p)| Vec2::new(p.x - a.x, p.z - a.z).length() < 1.2)
        });
        self.under_pointer = under.map(|(i, _)| i);
        if input.just(b::PRIMARY) {
            if let Some(a) = input.aim {
                let target = under;
                self.walk_then = target.map(|(i, _)| i);
                let goal = target.map(|(_, p)| p).unwrap_or(a);
                self.path_to(sim, feet, goal);
            }
        }
        if input.just(b::SCHEDULE) {
            self.push_overlay(Overlay::Schedule(-1));
            sfx(ev, sound::UI_CONFIRM, 0.6, 1.0);
            return Vec2::ZERO;
        }
        if input.just(b::WAVE) && self.wave_t <= 0.0 {
            self.wave_t = 1.4;
            gesture(sim, self.pid, "CMU/Wave_Hello", true);
            // Whoever is near waves back.
            for s in self.spots.clone() {
                if let (Some(id), Some(p)) = (s.id, s.id.and_then(|id| sim.feet(id))) {
                    if Vec2::new(p.x - feet.x, p.z - feet.z).length() < 8.0 {
                        gesture(sim, id, "CMU/Wave_Hello", true);
                    }
                }
            }
            self.waves += 1;
            let line = self.words(&script::line("pip.wave", self.bot_tick as usize % 8), self.waves as i64);
            if Vec2::new(self.spots_pip(sim).x - feet.x, self.spots_pip(sim).z - feet.z).length() < 12.0 {
                self.island_quip = Some((Dialog::new(Who::Pip, vec![line]), 3.2));
            }
        }
        if input.just(b::CONFIRM) {
            if let Some(i) = self.near {
                self.use_spot(i, sim, ev);
                return Vec2::ZERO;
            }
        }
        // Walking.
        let speed = if input.down(b::SPRINT) { 1.0 } else { self.rules.flow.walk_speed };
        let mut m = input.move_dir * speed;
        // Walking up to something: within arm's reach is close enough (Pip is behind a desk).
        if let Some(i) = self.walk_then {
            let spot = self.spots.get(i).map(|s| s.id.and_then(|id| sim.feet(id)).unwrap_or(s.pos));
            if spot.is_some_and(|p| Vec2::new(p.x - feet.x, p.z - feet.z).length() < 2.0) {
                self.walk.clear();
                self.walk_then = None;
                self.use_spot(i, sim, ev);
                return Vec2::ZERO;
            }
        }
        if m.length() > 0.08 {
            self.walk.clear();
            self.walk_then = None;
        } else if let Some(&next) = self.walk.first() {
            let d = Vec2::new(next.x - feet.x, next.z - feet.z);
            if d.length() < 0.45 {
                self.walk.remove(0);
                if self.walk.is_empty() {
                    if let Some(i) = self.walk_then.take() {
                        self.use_spot(i, sim, ev);
                    }
                }
            } else {
                m = d.normalize() * speed;
            }
        }
        // The sea is for looking at.
        let stage = self.stages[0];
        if m.length() > 0.0 && !island::on_land(feet + Vec3::new(m.x, 0.0, m.y) * 0.6, stage) {
            let toward = Vec2::new(stage.x - feet.x, stage.z - feet.z).normalize_or_zero();
            let along = m - toward * m.dot(toward).min(0.0);
            m = if island::on_land(feet + Vec3::new(along.x, 0.0, along.y) * 0.6, stage) { along } else { toward * 0.4 };
        }
        m
    }

    /// Flip-flops: walk over one.
    fn pick_flips(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let feet = sim.feet(self.pid).unwrap_or(self.stages[0]);
        let mut picked = None;
        for (i, (bit, _, at)) in self.flips.iter().enumerate() {
            let d = Vec2::new(at.x - feet.x, at.z - feet.z).length();
            if d < 1.3 {
                picked = Some((i, *bit));
            }
        }
        if let Some((i, bit)) = picked {
            let (_, id, _) = self.flips.remove(i);
            sim.despawn(id);
            if let Some(g) = self.guest_mut() {
                g.flipflops |= 1 << bit;
            }
            self.mark_saved();
            sfx(ev, sound::RIBBON, 0.9, 1.0);
            let n = self.guest().map(|g| g.flipflops.count_ones()).unwrap_or(0);
            let text = self.words(&script::line("pip.flipflop", n as usize), n as i64);
            self.island_quip = Some((Dialog::new(Who::Pip, vec![text]), 4.0));
        }
    }

    fn spots_pip(&self, sim: &Sim) -> Vec3 {
        self.spots.iter().find(|s| s.spot == Spot::Talk(Who::Pip)).and_then(|s| s.id).and_then(|id| sim.feet(id)).unwrap_or(self.stages[0])
    }

    fn path_to(&mut self, sim: &mut Sim, from: Vec3, to: Vec3) {
        if self.nav.is_none() {
            self.nav = crate::nav::NavGrid::for_room(sim).map(std::sync::Arc::new);
        }
        self.walk = match self.nav.as_ref().and_then(|n| n.path(from, to)) {
            Some(p) => p,
            None => vec![to],
        };
    }

    /// Is this thing open today?
    pub fn spot_open(&self, s: Spot) -> bool {
        let day = self.day();
        let free = self.guest().is_some_and(|g| g.free_play());
        match s {
            Spot::Mat(i) => free || PAVILIONS[i as usize].opens <= day,
            Spot::BigStand => free || day >= 5,
            Spot::Wardrobe => free || day >= 2,
            Spot::Talk(Who::Bounce) => free || day >= 3,
            Spot::Talk(Who::Gull) => free || day >= 4,
            Spot::Talk(Who::Kettle) => free || day >= 2,
            _ => true,
        }
    }

    pub fn use_spot(&mut self, i: usize, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let Some(s) = self.spots.get(i).copied() else { return };
        match s.spot {
            Spot::Mat(p) => {
                self.push_overlay(Overlay::Schedule(p as i8));
                sfx(ev, sound::UI_CONFIRM, 0.7, 1.0);
            }
            Spot::BigStand => {
                self.start_event(sim, ev, EventKind::BigStand);
            }
            Spot::Cabana => self.use_cabana(ev),
            Spot::Clam => {
                self.clam_pulse = 1.2;
                sfx(ev, sound::CLAM, 0.9, 1.0);
                let m = self.guest().map(|g| g.minutes).unwrap_or(0) as i64;
                let lines = self.lines("pip.clam", m);
                let n = self.stats_played as usize + self.bot_tick as usize;
                let line = lines.get(n % lines.len().max(1)).cloned().unwrap_or_default();
                self.say(Who::Pip, vec![line], After::Nothing);
            }
            Spot::Calendar => self.push_overlay(Overlay::Calendar),
            Spot::Wardrobe => self.push_overlay(Overlay::Wardrobe),
            Spot::Flip(_) | Spot::None => {}
            Spot::Talk(who) => self.talk(who, sim, ev),
        }
    }

    fn use_cabana(&mut self, ev: &mut Vec<SimEvent>) {
        let free = self.guest().is_some_and(|g| g.free_play());
        let day = self.day();
        if free || day >= 5 {
            let line = script::line("pip.nosleep", day as usize);
            self.say(Who::Pip, vec![line], After::Nothing);
            return;
        }
        let goal = self.rules.goal(day);
        let today = self.guest().map(|g| g.minutes_today).unwrap_or(0);
        if today < goal {
            let left = (goal - today) as i64;
            let line = self.words(&script::line("pip.notyet", day as usize), left);
            self.say(Who::Pip, vec![line], After::Nothing);
        } else {
            self.end_day(ev);
        }
    }

    /// A big stamp lands on the Calendar. Next day.
    pub fn end_day(&mut self, ev: &mut Vec<SimEvent>) {
        let day = self.day();
        if let Some(g) = self.guest_mut() {
            g.stamps = g.stamps.max(day);
        }
        self.mark_saved();
        self.close_overlays();
        self.flow = Flow::Stamp(0.0, day);
        sfx(ev, sound::CREAK, 0.6, 1.0);
    }

    fn talk(&mut self, who: Who, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let key = match who {
            Who::Pip => "pip",
            Who::Posey => "posey",
            Who::Kettle => "kettle",
            Who::Bounce => "bounce",
            Who::Gull => "gull",
            Who::Marjorie => "marjorie",
            Who::Tom => "tom",
            Who::Twins => "twins",
        };
        let day = self.day();
        if who == Who::Tom {
            let (found, golden) = self.guest().map(|g| (g.flipflops, g.golden)).unwrap_or((0, false));
            if found.count_ones() >= 5 && !golden {
                if let Some(g) = self.guest_mut() {
                    g.golden = true;
                }
                self.mark_saved();
                let g = self.guest().cloned().unwrap_or_default();
                self.set_look(sim, Some(&g));
                sfx(ev, sound::FANFARE, 0.8, 1.0);
                let lines = self.lines("tom.reward", 0);
                self.say(Who::Tom, lines, After::Nothing);
                return;
            }
            if found > 0 && !golden {
                let lines = vec![self.words(&script::line("tom.progress", found.count_ones() as usize), 5 - found.count_ones() as i64)];
                self.say(Who::Tom, lines, After::Nothing);
                return;
            }
        }
        let list_key = format!("{key}.talk{day}");
        let list = script::list(&list_key);
        let times = self.guest().map(|g| g.talked.iter().filter(|t| *t == key).count()).unwrap_or(0);
        if let Some(g) = self.guest_mut() {
            g.talked.push(key.to_string());
        }
        let text = if list.is_empty() { script::line(&format!("{key}.talk"), times + day as usize) } else { list[times % list.len()].clone() };
        let line = self.words(&text, times as i64);
        self.say(who, vec![line], After::Nothing);
        // They face you, more or less.
        if let Some(id) = self.spots.iter().find(|s| s.spot == Spot::Talk(who)).and_then(|s| s.id) {
            let (a, c) = (sim.feet(id).unwrap_or(Vec3::ZERO), sim.feet(self.pid).unwrap_or(Vec3::ZERO));
            let d = c - a;
            set_facing(sim, id, d.x.atan2(d.z));
        }
    }

    // ------------------------------------------------------------------ menu input

    /// One press (or repeat) in a direction: 0 up, 1 down, 2 left, 3 right.
    fn menu_dirs(&mut self, input: &InputFrame, dt: f32) -> [bool; 4] {
        let bits = [b::MENU_UP, b::MENU_DOWN, b::MENU_LEFT, b::MENU_RIGHT];
        let mut out = [false; 4];
        for i in 0..4 {
            if input.just(bits[i]) {
                out[i] = true;
                self.repeat[i] = 0.42;
            } else if input.down(bits[i]) {
                self.repeat[i] -= dt;
                if self.repeat[i] <= 0.0 {
                    out[i] = true;
                    self.repeat[i] = 0.12;
                }
            } else {
                self.repeat[i] = 0.0;
            }
        }
        out
    }

    fn menu_input(&mut self, sim: &mut Sim, input: &InputFrame, dt: f32, ev: &mut Vec<SimEvent>) {
        let Some(menu) = self.menu() else { return };
        let n = menu.items.len();
        if n == 0 {
            self.menu_back(&menu, input, sim, ev);
            return;
        }
        self.focus = self.focus.min(n - 1);
        // The pointer.
        match input.ui {
            Some(UiEvent::Hover(id)) => {
                let i = id as usize;
                if i < n && i != self.focus {
                    self.focus = i;
                    self.bounce = 1.0;
                    sfx(ev, sound::UI_MOVE, 0.5, 1.0);
                }
            }
            Some(UiEvent::Click(id)) => {
                let i = id as usize;
                if i < n {
                    self.focus = i;
                    self.activate(menu.items[i].act, sim, ev);
                    return;
                }
            }
            Some(UiEvent::Slider(id, frac)) => {
                let i = id as usize;
                if i < n {
                    self.focus = i;
                    self.set_frac(menu.items[i].act, frac, ev);
                }
            }
            None => {}
        }
        let dirs = self.menu_dirs(input, dt);
        let horizontal = menu.layout.horizontal();
        let (prev, next) = if horizontal { (dirs[2], dirs[3]) } else { (dirs[0], dirs[1]) };
        let locked_step = |from: usize, step: i32| -> usize {
            let n = n as i32;
            let mut i = from as i32;
            for _ in 0..n {
                i = (i + step).rem_euclid(n);
                let it = &menu.items[i as usize];
                if it.kind != super::ui_model::ItemKind::Locked || horizontal {
                    break;
                }
            }
            i as usize
        };
        if prev {
            self.focus = locked_step(self.focus, -1);
            self.bounce = 1.0;
            sfx(ev, sound::UI_MOVE, 0.6, 1.0);
        }
        if next {
            self.focus = locked_step(self.focus, 1);
            self.bounce = 1.0;
            sfx(ev, sound::UI_MOVE, 0.6, 1.0);
        }
        if let super::menus::Layout::Carousel { visible, .. } = menu.layout {
            self.scroll = super::menus::carousel_first(self.scroll, self.focus, n, visible);
        }
        if !horizontal {
            let act = menu.items[self.focus].act;
            if dirs[2] {
                self.adjust(act, -1, ev);
            }
            if dirs[3] {
                self.adjust(act, 1, ev);
            }
        }
        // Tabs and pages.
        if input.just(b::TAB_L) {
            self.tab(-1, ev);
        }
        if input.just(b::TAB_R) {
            self.tab(1, ev);
        }
        if input.just(b::CONFIRM) {
            let it = &menu.items[self.focus];
            if it.kind != super::ui_model::ItemKind::Locked {
                self.activate(it.act, sim, ev);
            } else {
                sfx(ev, sound::UI_BACK, 0.5, 0.8);
            }
            return;
        }
        self.menu_back(&menu, input, sim, ev);
    }

    fn menu_back(&mut self, menu: &super::menus::Menu, input: &InputFrame, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        // Options closes the whole stack from anywhere over the game.
        if input.just(b::PAUSE) && !input.just(b::BACK) && !self.overlays.is_empty() {
            self.close_overlays();
            sfx(ev, sound::UI_BACK, 0.6, 1.0);
            return;
        }
        if input.just(b::PAUSE) && self.overlays.is_empty() && !matches!(self.flow, Flow::Title | Flow::Attract(_)) {
            if menu.back && input.just(b::BACK) {
                // Esc on a pre-game menu: back, as below.
            } else {
                self.push_overlay(Overlay::Pause);
                return;
            }
        }
        if input.just(b::BACK | b::SECONDARY) && menu.back {
            self.go_back(sim, ev);
        }
    }

    pub fn go_back(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        sfx(ev, sound::UI_BACK, 0.6, 1.0);
        if !self.overlays.is_empty() {
            if let Some(Overlay::Schedule(p)) = self.overlays.last().copied() {
                if p >= 0 {
                    // From a pavilion back to the carousel.
                    if let Some(top) = self.overlays.last_mut() {
                        *top = Overlay::Schedule(-1);
                    }
                    self.focus = p as usize;
                    return;
                }
            }
            self.pop_overlay();
            return;
        }
        match self.flow.clone() {
            Flow::Slots | Flow::Together(_) => self.to_title(sim, ev),
            Flow::Names(_) => {
                self.flow = Flow::Slots;
                self.focus = 0;
            }
            Flow::Look(slot, _) => {
                self.flow = Flow::Names(slot);
                self.focus = 0;
            }
            _ => {}
        }
    }

    fn tab(&mut self, step: i32, ev: &mut Vec<SimEvent>) {
        match self.overlays.last().copied() {
            Some(Overlay::Dev) => {
                self.dev.tab = (self.dev.tab as i32 + step).rem_euclid(6) as usize;
                self.focus = 0;
                self.scroll = 0;
                sfx(ev, sound::UI_MOVE, 0.7, 1.1);
            }
            Some(Overlay::About(p)) => {
                let n = self.about.len().max(1) as i32;
                let top = self.overlays.last_mut().unwrap();
                *top = Overlay::About((p as i32 + step).rem_euclid(n) as u8);
                sfx(ev, sound::UI_MOVE, 0.7, 1.1);
            }
            Some(Overlay::HowTo(p)) => {
                let n = super::screens::HOW_TO.len() as i32;
                let top = self.overlays.last_mut().unwrap();
                *top = Overlay::HowTo((p as i32 + step).rem_euclid(n) as u8);
                sfx(ev, sound::UI_MOVE, 0.7, 1.1);
            }
            _ => {}
        }
    }

    /// Left and right on a row.
    pub fn adjust(&mut self, act: MAct, d: i32, ev: &mut Vec<SimEvent>) {
        let s = &mut self.save.settings;
        let step = |v: &mut f32, by: f32, lo: f32, hi: f32| *v = ((*v + by * d as f32) * 100.0).round().clamp(lo * 100.0, hi * 100.0) / 100.0;
        let mut changed = true;
        match act {
            MAct::Music => step(&mut s.music, 0.05, 0.0, 1.0),
            MAct::Sfx => step(&mut s.sfx, 0.05, 0.0, 1.0),
            MAct::Voice => step(&mut s.voice, 0.05, 0.0, 1.0),
            MAct::LeanSens => step(&mut s.lean_sens, 0.05, 0.5, 2.0),
            MAct::Assist => step(&mut s.assist, 0.1, 0.0, 1.0),
            MAct::Rhythm => step(&mut s.rhythm_offset, 0.01, -0.2, 0.4),
            MAct::TextSpeed => s.text_speed = (s.text_speed as i32 + d).clamp(0, 2) as u8,
            MAct::Glyphs => s.xbox = !s.xbox,
            _ => changed = false,
        }
        if changed {
            sfx(ev, sound::UI_MOVE, 0.6, 1.2);
            self.mark_saved();
            return;
        }
        match act {
            MAct::Wear(i) => self.wear_step(i, d, ev),
            MAct::Skin => {
                self.look_skin = (self.look_skin as i32 + d).rem_euclid(meta::SKINS.len() as i32) as u8;
                sfx(ev, sound::UI_MOVE, 0.6, 1.2);
            }
            MAct::Outfit => {
                self.look_outfit = (self.look_outfit as i32 + d).rem_euclid(meta::OUTFITS.len() as i32) as u8;
                sfx(ev, sound::UI_MOVE, 0.6, 1.2);
            }
            MAct::DevScale => {
                let opts = [0.25, 0.5, 1.0, 2.0, 4.0];
                let at = opts.iter().position(|o| (*o - self.dev.time_scale).abs() < 0.01).unwrap_or(2) as i32;
                self.dev.time_scale = opts[(at + d).clamp(0, 4) as usize];
                sfx(ev, sound::UI_MOVE, 0.6, 1.2);
            }
            MAct::DevGroup => {
                let n = super::screens::dev_groups(&self.rules).len() as i32;
                self.dev.group = (self.dev.group as i32 + d).rem_euclid(n.max(1)) as usize;
                sfx(ev, sound::UI_MOVE, 0.6, 1.2);
            }
            MAct::DevParam(i) => {
                let params = crate::params::list(&mut self.rules.clone());
                if let Some(p) = params.get(i as usize) {
                    if let crate::params::ParamKind::Float { min, max } = p.kind {
                        let now = p.value.as_f64().unwrap_or(0.0) as f32;
                        let by = (max - min) / 50.0;
                        let _ = crate::params::set(&mut self.rules, &p.path, crate::params::ParamValue::Float(((now + by * d as f32).clamp(min, max)) as f64));
                        sfx(ev, sound::UI_MOVE, 0.5, 1.2);
                    }
                }
            }
            _ => {}
        }
    }

    /// A slider dragged by the pointer.
    pub fn set_frac(&mut self, act: MAct, f: f32, _ev: &mut Vec<SimEvent>) {
        let f = f.clamp(0.0, 1.0);
        let s = &mut self.save.settings;
        let mut saved = true;
        match act {
            MAct::Music => s.music = (f * 20.0).round() / 20.0,
            MAct::Sfx => s.sfx = (f * 20.0).round() / 20.0,
            MAct::Voice => s.voice = (f * 20.0).round() / 20.0,
            MAct::LeanSens => s.lean_sens = 0.5 + f * 1.5,
            MAct::Assist => s.assist = f,
            MAct::Rhythm => s.rhythm_offset = -0.2 + f * 0.6,
            MAct::DevParam(i) => {
                saved = false;
                let params = crate::params::list(&mut self.rules.clone());
                if let Some(p) = params.get(i as usize) {
                    if let crate::params::ParamKind::Float { min, max } = p.kind {
                        let _ = crate::params::set(&mut self.rules, &p.path, crate::params::ParamValue::Float((min + (max - min) * f) as f64));
                    }
                }
            }
            _ => saved = false,
        }
        if saved {
            self.mark_saved();
        }
    }

    fn wear_step(&mut self, i: u8, d: i32, ev: &mut Vec<SimEvent>) {
        let Some(g) = self.guest() else { return };
        let minutes = g.minutes;
        let w = g.wear.clone();
        let unlocked = |lists: &dyn Fn(usize) -> Option<u32>, cur: u8| -> u8 {
            let mut n = cur as i32;
            let mut len = 0;
            while lists(len).is_some() {
                len += 1;
            }
            for _ in 0..len {
                n = (n + d).rem_euclid(len as i32);
                if lists(n as usize).is_some_and(|m| m <= minutes) {
                    return n as u8;
                }
            }
            cur
        };
        let col = |k: usize| meta::COLOURS.get(k).map(|c| c.2);
        let mut nw = w.clone();
        match i {
            0 => nw.hat = unlocked(&|k| meta::HATS.get(k).map(|o| o.minutes), w.hat),
            1 => nw.bands = unlocked(&|k| meta::BANDS.get(k).map(|o| o.minutes), w.bands),
            2 => nw.belt = unlocked(&|k| meta::BELTS.get(k).map(|o| o.minutes), w.belt),
            3 => nw.floaties = unlocked(&|k| meta::FLOATIES.get(k).map(|o| o.minutes), w.floaties),
            4 => nw.shirt = unlocked(&col, w.shirt),
            5 => nw.pants = unlocked(&col, w.pants),
            _ => nw.shoes = unlocked(&col, w.shoes),
        }
        if let Some(g) = self.guest_mut() {
            g.wear = nw;
        }
        self.mark_saved();
        sfx(ev, sound::UI_MOVE, 0.6, 1.2);
    }

    /// Choosing an item.
    pub fn activate(&mut self, act: MAct, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        sfx(ev, sound::UI_CONFIRM, 0.7, 1.0);
        self.bounce = 1.0;
        let dt = sim.dt();
        match act {
            MAct::None => {}
            MAct::Stay => {
                self.flow = Flow::Slots;
                self.focus = 0;
                self.scroll = 0;
                cam_orbit(sim, 22.0, 34.0, 40.0, 2.0, -40.0, 40.0, 60.0);
            }
            MAct::Together => {
                self.flow = Flow::Together(2);
                self.focus = 0;
            }
            MAct::Settings => self.push_overlay(Overlay::Settings),
            MAct::About => {
                self.push_overlay(Overlay::About(0));
                self.focus = 1; // Next: Cross turns the page.
            }
            MAct::Slot(i) => {
                let i = i as usize;
                if self.save.slots.get(i).is_some_and(|g| g.is_some()) {
                    self.slot = Some(i);
                    self.resume_stay(sim, ev);
                } else {
                    self.flow = Flow::Names(i as u8);
                    self.focus = 0;
                    self.scroll = 0;
                }
            }
            MAct::Name(n) => {
                if let Flow::Names(slot) = self.flow {
                    let name = script::line("names", n as usize);
                    self.look_skin = 1;
                    self.look_outfit = (n as u8) % 8;
                    self.flow = Flow::Look(slot, name);
                    self.focus = 0;
                    let at = self.stages[0] + Vec3::new(0.0, 0.0, 2.0);
                    place(sim, self.pid, at, 0.0);
                    self.apply_pick_look(sim);
                    cam_full(sim, 8.0, 0.0, 6.0, 36.0, 0.75, 0.1, None);
                    self.spin = 0.0;
                }
            }
            MAct::Skin => {
                self.look_skin = (self.look_skin + 1) % meta::SKINS.len() as u8;
                self.apply_pick_look(sim);
            }
            MAct::Outfit => {
                self.look_outfit = (self.look_outfit + 1) % meta::OUTFITS.len() as u8;
                self.apply_pick_look(sim);
            }
            MAct::Begin => {
                if let Flow::Look(slot, name) = self.flow.clone() {
                    let g = Guest {
                        name,
                        skin: self.look_skin,
                        outfit: self.look_outfit,
                        day: 1,
                        last_date: self.boot.today,
                        ..Default::default()
                    };
                    self.save.slots[slot as usize] = Some(g);
                    self.slot = Some(slot as usize);
                    self.mark_saved();
                    let lines = self.lines("pip.intro", 0);
                    self.flow = Flow::Intro;
                    let g = self.guest().cloned().unwrap_or_default();
                    self.set_look(sim, Some(&g));
                    self.refresh_flips(sim);
                    let at = self.spots_pip(sim);
                    place(sim, self.pid, at + Vec3::new(0.0, 0.0, 2.4), std::f32::consts::PI);
                    cam(sim, 14.0, 0.0, 7.5, 36.0);
                    self.say(Who::Pip, lines, After::Morning);
                }
            }
            MAct::Resume => self.close_overlays(),
            MAct::Schedule => {
                self.close_overlays();
                if matches!(self.flow, Flow::Island) {
                    self.push_overlay(Overlay::Schedule(-1));
                } else {
                    // From inside an event: leave it first.
                    self.leave_event(sim, ev);
                    self.push_overlay(Overlay::Schedule(-1));
                }
            }
            MAct::Calendar => self.push_overlay(Overlay::Calendar),
            MAct::Wardrobe => {
                self.spin = 0.0;
                self.push_overlay(Overlay::Wardrobe);
            }
            MAct::HowTo => {
                self.push_overlay(Overlay::HowTo(0));
                self.focus = 1;
            }
            MAct::Dev => {
                self.dev.tab = 0;
                self.push_overlay(Overlay::Dev);
            }
            MAct::Quit => {
                self.leave_event(sim, ev);
                self.to_title(sim, ev);
            }
            MAct::Pavilion(p) => {
                if let Some(top) = self.overlays.last_mut() {
                    *top = Overlay::Schedule(p as i8);
                }
                self.focus = 0;
            }
            MAct::Event(k) => {
                self.start_event(sim, ev, k);
            }
            MAct::EndDay => {
                let day = self.day();
                let goal = self.rules.goal(day);
                let today = self.guest().map(|g| g.minutes_today).unwrap_or(0);
                if today >= goal && day < 5 {
                    self.end_day(ev);
                } else {
                    self.close_overlays();
                    self.use_cabana(ev);
                }
            }
            MAct::Reception => {
                self.close_overlays();
                let at = self.stages[0] + Vec3::new(0.0, 0.0, 3.5);
                place(sim, self.pid, at, 0.0);
            }
            MAct::Retry => {
                if let Flow::Event(run) = &self.flow {
                    let kind = run.kind;
                    self.leave_event(sim, ev);
                    self.start_event(sim, ev, kind);
                }
            }
            MAct::Done => {
                let mut flow = std::mem::take(&mut self.flow);
                if let Flow::Event(run) = &mut flow {
                    self.after_event(run, sim, ev);
                }
                if matches!(self.flow, Flow::Title) && matches!(flow, Flow::Event(_)) {
                    // `after_event` set the next screen unless the scene is a direct route.
                }
            }
            MAct::Fullscreen => self.fullscreen_serial += 1,
            MAct::ResetSave => self.push_overlay(Overlay::ConfirmReset),
            MAct::Yes => {
                self.save = meta::SaveData { settings: self.save.settings.clone(), ..Default::default() };
                self.mark_saved();
                self.close_overlays();
                self.to_title(sim, ev);
            }
            MAct::No => self.pop_overlay(),
            MAct::Glyphs | MAct::Music | MAct::Sfx | MAct::Voice | MAct::LeanSens | MAct::Assist | MAct::Rhythm | MAct::TextSpeed => {
                self.adjust(act, 1, ev);
            }
            MAct::Wear(i) => self.wear_step(i, 1, ev),
            MAct::PagePrev => self.tab(-1, ev),
            MAct::PageNext => self.tab(1, ev),
            MAct::Close => self.go_back(sim, ev),
            MAct::Players(n) => {
                self.flow = Flow::Together(n);
                self.focus = (n as usize).saturating_sub(2);
            }
            MAct::Go => {
                if let Flow::Together(n) = self.flow {
                    self.start_together(sim, ev, n as usize);
                }
            }
            MAct::Ready => {
                let mut flow = std::mem::take(&mut self.flow);
                if let Flow::Medley(m) = &mut flow {
                    match m.phase {
                        super::medley::MPhase::Pass => {
                            let mut mm = std::mem::take(&mut **m);
                            self.medley_ready(&mut mm, sim, ev, dt);
                            **m = mm;
                        }
                        super::medley::MPhase::Podium => {
                            self.flow = Flow::Title;
                            self.to_title(sim, ev);
                            return;
                        }
                        _ => {}
                    }
                }
                self.flow = flow;
            }
            MAct::DevDay(d) => {
                self.leave_event(sim, ev);
                self.close_overlays();
                self.ensure_guest();
                if let Some(g) = self.guest_mut() {
                    g.day = d;
                    g.stamps = d - 1;
                    g.ending = 0;
                }
                self.begin_day(sim, ev);
            }
            MAct::DevEvent(k) => {
                self.leave_event(sim, ev);
                self.ensure_guest();
                self.start_event(sim, ev, k);
            }
            MAct::DevPhase(p) => {
                self.leave_event(sim, ev);
                self.ensure_guest();
                self.start_event(sim, ev, EventKind::BigStand);
                if let Flow::Event(run) = &mut self.flow {
                    if let super::events::EventState::Stand(s) = &mut run.st {
                        s.phase = p as usize;
                        s.card = 1.0;
                    }
                }
            }
            MAct::DevAttract => {
                self.leave_event(sim, ev);
                self.close_overlays();
                self.start_attract(sim, ev);
            }
            MAct::DevMedley => {
                self.leave_event(sim, ev);
                self.close_overlays();
                self.start_together(sim, ev, 2);
            }
            MAct::DevFlag(f) => {
                let d = &mut self.dev;
                let flag = match f {
                    0 => &mut d.no_tips,
                    1 => &mut d.autoplay,
                    2 => &mut d.skip_dialog,
                    3 => &mut d.input_view,
                    4 => &mut d.trace,
                    5 => &mut d.stats,
                    6 => &mut d.free_cam,
                    _ => &mut d.ghost_lanes,
                };
                *flag = !*flag;
                if f == 4 {
                    let on = self.dev.trace;
                    if let Flow::Event(r) = &mut self.flow {
                        r.c.show_trace = on;
                    }
                }
            }
            MAct::DevGive => {
                self.ensure_guest();
                if let Some(g) = self.guest_mut() {
                    g.minutes += 10;
                    g.minutes_today += 10;
                }
                self.mark_saved();
            }
            MAct::DevUnlock => {
                self.ensure_guest();
                if let Some(g) = self.guest_mut() {
                    g.minutes = g.minutes.max(99);
                    g.day = 5;
                    g.ending = g.ending.max(1);
                }
                self.mark_saved();
            }
            MAct::DevAllStars => {
                self.ensure_guest();
                if let Some(g) = self.guest_mut() {
                    for e in super::events::ALL {
                        g.stars.insert(e.key().to_string(), 3);
                    }
                }
                self.mark_saved();
            }
            MAct::DevWin => {
                self.dev.win_now = true;
                self.close_overlays();
            }
            MAct::DevLose => {
                self.dev.lose_now = true;
                self.close_overlays();
            }
            MAct::DevScale => self.adjust(act, 1, ev),
            MAct::DevHold => {
                self.dev.hold = !self.dev.hold;
                self.close_overlays();
            }
            MAct::DevStep => {
                self.dev.hold = true;
                self.dev.step = true;
                self.close_overlays();
            }
            MAct::DevGroup => self.adjust(act, 1, ev),
            MAct::DevParam(_) => {}
            MAct::DevResetGroup => {
                let groups = super::screens::dev_groups(&self.rules);
                let Some(g) = groups.get(self.dev.group).cloned() else { return };
                let fresh = super::rules::Rules::load().unwrap_or_default();
                let list = crate::params::list(&mut fresh.clone());
                for p in list.iter().filter(|p| p.path.starts_with(&format!("{g}."))) {
                    let _ = crate::params::set(&mut self.rules, &p.path, p.value.clone());
                }
            }
            MAct::DevResetAll => {
                self.rules = super::rules::Rules::load().unwrap_or_default();
            }
            MAct::DevResetGuest => {
                if let Some(i) = self.slot {
                    self.save.slots[i] = None;
                }
                self.slot = None;
                self.mark_saved();
                self.leave_event(sim, ev);
                self.to_title(sim, ev);
            }
        }
    }

    /// Dev tools work from the title too: they need someone to happen to.
    fn ensure_guest(&mut self) {
        if self.guest().is_some() {
            return;
        }
        let free = self.save.slots.iter().position(|s| s.is_none()).unwrap_or(0);
        self.save.slots[free] = Some(Guest { name: "Test Guest".into(), day: 1, ..Default::default() });
        self.slot = Some(free);
    }

    fn apply_pick_look(&self, sim: &mut Sim) {
        let g = Guest { skin: self.look_skin, outfit: self.look_outfit, ..Default::default() };
        self.set_look(sim, Some(&g));
    }

    /// Continue a stay at the right place.
    fn resume_stay(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let g = self.guest().cloned().unwrap_or_default();
        self.set_look(sim, Some(&g));
        self.refresh_flips(sim);
        let today = self.boot.today;
        if g.free_play() {
            if today > g.last_date && g.last_date > 0 {
                // A new real day in Free Play: a stamp and a check.
                if let Some(m) = self.guest_mut() {
                    m.free_days += 1;
                }
                self.begin_day(sim, ev);
            } else {
                self.to_island(sim, ev);
                let at = self.stages[0] + Vec3::new(0.0, 0.0, 3.5);
                place(sim, self.pid, at, 0.0);
            }
            return;
        }
        if !g.checked || (today > g.last_date && g.last_date > 0) {
            self.begin_day(sim, ev);
        } else {
            self.to_island(sim, ev);
            let at = self.stages[0] + Vec3::new(0.0, 0.0, 3.5);
            place(sim, self.pid, at, 0.0);
            let away = 0;
            let line = self.words(&script::line("pip.back", self.day() as usize), away);
            self.say(Who::Pip, vec![line], After::Nothing);
        }
    }

    /// Leaves whatever event is running (nothing is banked).
    pub fn leave_event(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let dt = sim.dt();
        let mut flow = std::mem::take(&mut self.flow);
        match &mut flow {
            Flow::Event(run) => {
                let mut cx = self.cx(sim, ev, dt);
                run.stop(&mut cx);
                drop(cx);
                self.flow = Flow::Island;
                self.to_island(sim, ev);
                let at = self.stages[0] + Vec3::new(0.0, 0.0, 3.5);
                place(sim, self.pid, at, 0.0);
            }
            Flow::Attract(a) => {
                if let Some(mut run) = a.run.take() {
                    let mut cx = self.cx(sim, ev, dt);
                    run.stop(&mut cx);
                }
                self.flow = Flow::Title;
            }
            Flow::Medley(m) => {
                if let Some(mut run) = m.run.take() {
                    let mut cx = self.cx(sim, ev, dt);
                    run.stop(&mut cx);
                }
                self.flow = Flow::Title;
            }
            _ => self.flow = flow,
        }
    }
}
