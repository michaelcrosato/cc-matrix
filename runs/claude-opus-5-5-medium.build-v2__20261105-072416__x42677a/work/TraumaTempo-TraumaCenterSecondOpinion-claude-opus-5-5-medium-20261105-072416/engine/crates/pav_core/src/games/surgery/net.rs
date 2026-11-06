//! The hub's network: one compact snapshot from the host's frame, about 15 times a second, and
//! each client's input back to the host. JSON with quantised numbers; under 1,200 bytes when it
//! can be. A client decodes a snapshot back into a `SurgeryFrame`, the single source of everything
//! drawn, so a mirror draws what a host draws.

use glam::Vec2;
use serde_json::{Value, json};

use super::field::{Callout, Code, Float, Hazard, Kind};
use super::frame::{CameraShot, SlotView, Stage, SurgeryFrame};
use crate::input::SurgeonInput;

fn q(v: f32) -> i32 {
    (v * 20.0).round() as i32
}

fn uq(v: i64) -> f32 {
    v as f32 / 20.0
}

fn stage_code(s: Stage) -> u8 {
    match s {
        Stage::Title => 0,
        Stage::Story => 1,
        Stage::Chart => 2,
        Stage::Op => 3,
        Stage::Complete => 4,
        Stage::Results => 5,
        Stage::Dead => 6,
        Stage::Done => 7,
        Stage::Card => 8,
    }
}

fn stage_from(c: u64) -> Stage {
    match c {
        1 => Stage::Story,
        2 => Stage::Chart,
        3 => Stage::Op,
        4 => Stage::Complete,
        5 => Stage::Results,
        6 => Stage::Dead,
        7 => Stage::Done,
        8 => Stage::Card,
        _ => Stage::Title,
    }
}

/// Recent sound and effect cues, with ids so a client plays each once.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct NetCue {
    pub serial: u32,
    pub id: u16,
    pub at: Vec2,
    pub gain: f32,
    pub pitch: f32,
}

/// The host's snapshot of a frame.
pub fn encode(f: &SurgeryFrame, cues: &[NetCue]) -> Value {
    let hz: Vec<Value> = f
        .hazards
        .iter()
        .take(40)
        .map(|h| {
            json!([
                h.id,
                h.kind as u8,
                q(h.a.x),
                q(h.a.y),
                q(h.b.x),
                q(h.b.y),
                q(h.c.x),
                q(h.c.y),
                q(h.r),
                (h.prog * 100.0) as i32,
                h.stage,
                h.sub,
                (h.ang * 100.0) as i32,
                if h.visible() { 1 } else { 0 },
                (h.fill * 100.0) as i32,
                h.n,
                h.need,
                u8::from(h.telegraph)
            ])
        })
        .collect();
    let slots: Vec<Value> = f
        .slots
        .iter()
        .map(|s| {
            json!([
                u8::from(s.active),
                q(s.cursor.x),
                q(s.cursor.y),
                s.tool,
                s.ring_pos,
                u8::from(s.using),
                s.eng,
                (s.meter * 100.0) as i32,
                s.score,
                s.chain,
                s.gift as i32,
                s.gift_kind,
                u8::from(s.arming),
                (s.flow * 10.0) as i32,
                (s.charge * 100.0) as i32
            ])
        })
        .collect();
    let floats: Vec<Value> = f.floats.iter().map(|x| json!([q(x.at.x), q(x.at.y), x.rating, u8::from(x.on_beat), x.slot, (x.age * 10.0) as i32])).collect();
    let cue_list: Vec<Value> =
        cues.iter().map(|c| json!([c.serial, c.id, q(c.at.x), q(c.at.y), (c.gain * 20.0) as i32, (c.pitch * 20.0) as i32])).collect();
    let mut o = json!({
        "t": "s",
        "st": stage_code(f.stage),
        "v": (f.vitals * 10.0) as i32,
        "b": (f.bpm) as i32,
        "p": (f.beat * 100.0) as i32,
        "n": f.beats,
        "m": f.meter,
        "br": f.bar,
        "tm": f.timer as i32,
        "tx": f.timer_max as i32,
        "pl": f.plate,
        "mu": f.music,
        "ph": f.phase,
        "h": hz,
        "s": slots,
        "r": f.ring,
        "c": cue_list,
        "f": floats,
    });
    let map = o.as_object_mut().unwrap();
    if let Some(v) = f.fever {
        map.insert("fv".into(), json!(v as i32));
    }
    if let Some(v) = f.heat_ring {
        map.insert("hr".into(), json!(q(v)));
    }
    if f.stopped {
        map.insert("x".into(), json!(1));
    }
    if let Some(c) = &f.code {
        map.insert("cd".into(), json!([(c.left * 10.0) as i32, (c.ghost * 100.0) as i32, c.shocks]));
    }
    if !f.banner.is_empty() && f.banner_t < 1.5 {
        map.insert("bn".into(), json!(f.banner));
    }
    if let Some(c) = &f.callout {
        map.insert("cl".into(), json!([c.who, c.text, (c.age * 10.0) as i32]));
    }
    if !f.now.is_empty() {
        map.insert("nw".into(), json!(f.now));
    }
    o
}

fn arr(v: &Value, k: usize) -> i64 {
    v.get(k).and_then(|x| x.as_i64()).unwrap_or(0)
}

/// A client's frame from a host's snapshot. `previous` carries what a snapshot leaves out.
pub fn decode(v: &Value) -> Option<SurgeryFrame> {
    if v.get("t")?.as_str()? != "s" {
        return None;
    }
    let num = |k: &str| v.get(k).and_then(|x| x.as_i64()).unwrap_or(0);
    let mut f = SurgeryFrame {
        stage: stage_from(num("st") as u64),
        vitals: num("v") as f32 / 10.0,
        bpm: num("b") as f32,
        beat: num("p") as f32 / 100.0,
        beats: num("n") as u32,
        meter: num("m") as u8,
        bar: num("br") as u8,
        timer: num("tm") as f32,
        timer_max: num("tx") as f32,
        plate: num("pl") as u8,
        music: num("mu") as u8,
        crisis: ((55.0 - num("v") as f32 / 10.0) / 45.0).clamp(0.0, 1.0),
        plate_prev: num("pl") as u8,
        phase: num("ph") as u16,
        reveal: 1.0,
        time_scale: 1.0,
        case: super::content::CODE_BLUE as u8,
        stopped: v.get("x").is_some(),
        camera: CameraShot::field(),
        fever: v.get("fv").and_then(|x| x.as_f64()).map(|x| x as f32),
        heat_ring: v.get("hr").and_then(|x| x.as_i64()).map(uq),
        banner: v.get("bn").and_then(|x| x.as_str()).unwrap_or("").to_string(),
        now: v.get("nw").and_then(|x| x.as_str()).unwrap_or("").to_string(),
        ..Default::default()
    };
    if let Some(list) = v.get("h").and_then(|x| x.as_array()) {
        f.hazards = list
            .iter()
            .map(|h| Hazard {
                id: arr(h, 0) as u32,
                kind: Kind::from_u8(arr(h, 1) as u8),
                a: Vec2::new(uq(arr(h, 2)), uq(arr(h, 3))),
                b: Vec2::new(uq(arr(h, 4)), uq(arr(h, 5))),
                c: Vec2::new(uq(arr(h, 6)), uq(arr(h, 7))),
                r: uq(arr(h, 8)),
                prog: arr(h, 9) as f32 / 100.0,
                stage: arr(h, 10) as u8,
                sub: arr(h, 11) as u8,
                ang: arr(h, 12) as f32 / 100.0,
                hidden: arr(h, 13) == 0,
                fill: arr(h, 14) as f32 / 100.0,
                n: arr(h, 15) as u16,
                need: arr(h, 16) as u16,
                telegraph: arr(h, 17) != 0,
                ..Default::default()
            })
            .collect();
    }
    if let Some(list) = v.get("s").and_then(|x| x.as_array()) {
        f.slots = list
            .iter()
            .map(|s| SlotView {
                active: arr(s, 0) != 0,
                cursor: Vec2::new(uq(arr(s, 1)), uq(arr(s, 2))),
                tool: arr(s, 3) as u8,
                ring_pos: arr(s, 4) as u8,
                using: arr(s, 5) != 0,
                eng: arr(s, 6) as u8,
                meter: arr(s, 7) as f32 / 100.0,
                score: arr(s, 8),
                chain: arr(s, 9) as u32,
                gift: arr(s, 10) as f32,
                gift_kind: arr(s, 11) as u8,
                arming: arr(s, 12) != 0,
                flow: arr(s, 13) as f32 / 10.0,
                charge: arr(s, 14) as f32 / 100.0,
                ..Default::default()
            })
            .collect();
    }
    if let Some(list) = v.get("r").and_then(|x| x.as_array()) {
        for (k, t) in list.iter().enumerate().take(8) {
            f.ring[k] = t.as_u64().unwrap_or(0) as u8;
        }
    }
    if let Some(c) = v.get("cd").and_then(|x| x.as_array()) {
        f.code = Some(Code {
            left: c.first().and_then(|x| x.as_i64()).unwrap_or(0) as f32 / 10.0,
            window: 5.0,
            ghost: c.get(1).and_then(|x| x.as_i64()).unwrap_or(0) as f32 / 100.0,
            shocks: c.get(2).and_then(|x| x.as_i64()).unwrap_or(0) as u8,
            ..Default::default()
        });
    }
    if let Some(c) = v.get("cl").and_then(|x| x.as_array()) {
        f.callout = Some(Callout {
            who: c.first().and_then(|x| x.as_str()).unwrap_or("").into(),
            text: c.get(1).and_then(|x| x.as_str()).unwrap_or("").into(),
            age: c.get(2).and_then(|x| x.as_i64()).unwrap_or(0) as f32 / 10.0,
        });
    }
    if let Some(list) = v.get("f").and_then(|x| x.as_array()) {
        f.floats = list
            .iter()
            .map(|x| {
                let rating = arr(x, 2) as u8;
                Float {
                    at: Vec2::new(uq(arr(x, 0)), uq(arr(x, 1))),
                    text: super::field::Rating::from_u8(rating).name().to_string(),
                    rating,
                    on_beat: arr(x, 3) != 0,
                    slot: arr(x, 4) as u8,
                    age: arr(x, 5) as f32 / 10.0,
                }
            })
            .collect();
    }
    Some(f)
}

/// The cue list of a snapshot.
pub fn decode_cues(v: &Value) -> Vec<NetCue> {
    v.get("c")
        .and_then(|x| x.as_array())
        .map(|list| {
            list.iter()
                .map(|c| NetCue {
                    serial: arr(c, 0) as u32,
                    id: arr(c, 1) as u16,
                    at: Vec2::new(uq(arr(c, 2)), uq(arr(c, 3))),
                    gain: arr(c, 4) as f32 / 20.0,
                    pitch: arr(c, 5) as f32 / 20.0,
                })
                .collect()
        })
        .unwrap_or_default()
}

/// A client's input message. Tool changes and button edges repeat until the host has seen them.
pub fn encode_input(inp: &SurgeonInput) -> Value {
    json!({
        "t": "i",
        "a": [q(inp.aim.x), q(inp.aim.y)],
        "r": u8::from(inp.abs),
        "h": inp.held,
        "e": inp.pressed,
        "o": inp.tool,
        "c": inp.cycle,
        "p": (inp.pressure * 20.0) as i32,
    })
}

pub fn decode_input(v: &Value) -> Option<SurgeonInput> {
    if v.get("t")?.as_str()? != "i" {
        return None;
    }
    let a = v.get("a")?.as_array()?;
    let num = |k: &str| v.get(k).and_then(|x| x.as_i64()).unwrap_or(0);
    Some(SurgeonInput {
        active: true,
        abs: num("r") != 0,
        aim: Vec2::new(uq(a.first()?.as_i64()?), uq(a.get(1)?.as_i64()?)),
        held: num("h") as u8,
        pressed: num("e") as u8,
        tool: num("o") as u8,
        cycle: num("c") as i8,
        pressure: num("p") as f32 / 20.0,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snapshots_round_trip_their_numbers() {
        let mut f = SurgeryFrame { vitals: 73.5, bpm: 96.0, music: 9, ..Default::default() };
        f.hazards.push(Hazard { id: 3, kind: Kind::Lacer, a: Vec2::new(1.0, -2.0), r: 0.5, n: 1, need: 4, ..Default::default() });
        f.slots.push(SlotView { active: true, cursor: Vec2::new(2.5, 1.0), score: 900, ..Default::default() });
        let v = encode(&f, &[NetCue { serial: 9, id: 3, at: Vec2::ZERO, gain: 1.0, pitch: 1.0 }]);
        let g = decode(&v).unwrap();
        assert!((g.vitals - 73.5).abs() < 0.11);
        assert_eq!(g.music, f.music);
        assert_eq!(g.hazards[0].kind, Kind::Lacer);
        assert_eq!(g.hazards[0].need, 4);
        assert_eq!(g.slots[0].score, 900);
        assert_eq!(decode_cues(&v)[0].serial, 9);
        let i = SurgeonInput { active: true, abs: true, aim: Vec2::new(1.0, 2.0), held: 3, pressed: 1, tool: 2, cycle: 0, pressure: 0.5 };
        assert_eq!(decode_input(&encode_input(&i)).unwrap(), i);
    }
}
