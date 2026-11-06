use super::events::Note;
#[derive(serde::Deserialize)]
struct Chart {
    note: Vec<Entry>,
}
#[derive(serde::Deserialize)]
struct Entry {
    t: f32,
    lane: u8,
}
pub fn notes() -> Vec<Note> {
    let data = super::super::level_text("fit/charts", include_str!("charts.toml"));
    let chart: Chart = toml::from_str(&data).expect("authored step chart");
    chart.note.into_iter().map(|n| Note { t: n.t, lane: n.lane, judged: false, quality: 0. }).collect()
}
