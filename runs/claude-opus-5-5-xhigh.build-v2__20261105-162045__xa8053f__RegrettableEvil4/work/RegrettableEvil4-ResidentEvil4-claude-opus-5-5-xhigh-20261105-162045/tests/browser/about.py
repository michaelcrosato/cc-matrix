# The About screen, read off the calls that draw it: all five pages at 1920x1080 and at 4:3, top to bottom,
# against exit-interview.json. What TASK.md asks to appear in both places has to be the same words in both.
import json, re, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _common import *

s = Suite()
interview = json.loads((ROOT.parent / 'exit-interview.json').read_text())
norm = lambda t: re.sub(r'\s+', ' ', t).strip().upper()
READ_ALL = """async () => {
  const app = window.__APP__; const ui = app.ui; const e = await window.__PIXEL_READY__;
  const byLine = {}; const wide = []; const orig = ui.text; const top = 50; const pitch = 9; const left = 20;
  ui.text = function (x, y, t, o) {
    const k = String(t);
    if (x + ui.width(k, o?.scale ?? 1) > ui.W - 6) wide.push(k);
    // The page's own lines are drawn at the left margin below the tabs; its position gives its place in the page.
    if (x === left && y >= top) byLine[app.top.scrolled() + Math.round((y - top) / pitch)] = k;
    return orig.call(this, x, y, t, o);
  };
  e.step(2);
  const count = app.top.lineCount();
  for (let i = 0; i <= count; i += 3) { app.top.scrollTo(i); e.step(2); }
  ui.text = orig;
  const got = Array.from({ length: count }, (_, i) => byLine[i] ?? null);
  return { page: app.top.page(), lines: got, wide, count, W: ui.W, H: ui.H };
}"""
EXPECT = [
    ('SOURCE', list(interview['sourceInformation'].values()) + ['DATE', 'SOURCE', 'PLAN', 'GENRE', 'PERSPECTIVE', 'TECH', 'ART DIRECTION', 'ANIMATION', 'AUDIO', 'ONLINE', 'TESTING', 'RESEARCH', 'ENVIRONMENT', 'MODEL', 'USAGE']),
    ('TESTING', interview['testingFeedback']),
    ('ENGINE', interview['engineFeedback']),
    ('PROMPT', interview['promptFeedback']),
    ('CREDITS', ['USAGE: ADDED ON IMPORT.', 'PIXEL ENGINE 0.46.0']),
]
with sync_playwright() as pw:
    b = launch(pw)
    for tag, vp in (('1920x1080', {'width': 1920, 'height': 1080}), ('4:3', {'width': 1024, 'height': 768})):
        page, errs = open_game(b, '?g_noattract=1', viewport=vp)
        page.evaluate("window.__SCREENS__.openAbout()"); step(page, 3)
        for i, (name, want) in enumerate(EXPECT):
            r = page.evaluate(READ_ALL)
            s.ok(r['page'] == i, f'{tag}: {name} is page {i} (got {r["page"]})')
            s.ok(not r['wide'], f'{tag} {name}: every line fits the screen: {r["wide"][:2]}')
            s.ok(r['count'] > 0 and all(l is not None for l in r['lines']), f'{tag} {name}: scrolls to every line of {r["count"]}')
            text = norm(' '.join(l for l in r['lines'] if l))
            missing = [w for w in want if norm(w) not in text]
            s.ok(not missing, f'{tag} {name}: on screen, word for word: {[m[:50] for m in missing][:2]}')
            page.keyboard.press('KeyE'); step(page, 2)
        s.ok(errs == [], f'{tag}: no console errors: {errs[:2]}')
        page.close()
    b.close()
s.ok(len(interview['testingFeedback']) == 4 and len(interview['engineFeedback']) == 6 and len(interview['promptFeedback']) == 4, 'one answer for each question')
s.ok(interview['sourceInformation']['usage'] == 'added on import', 'usage is added on import')
s.ok(all(not re.search(r'to be filled|todo|placeholder', json.dumps(interview), re.I) for _ in [0]), 'nothing left unanswered')
s.done()
