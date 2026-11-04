#!/usr/bin/env python3
"""Browser check of the dashboard: every tab at phone, tablet, laptop and ultrawide sizes in Chromium,
WebKit and Firefox (no sideways scrolling, no console errors), plus the live behaviour: a redraw never
loses focus or typed text, runs that finish elsewhere show up by themselves, the batch log follows.

Needs Playwright for Python with its browsers. It builds its own runs with the fake CLIs in
test/fake-cli (nothing real starts, nothing is spent) and its own dashboard on a free port.

  python3 test/ui_check.py                  # all engines
  python3 test/ui_check.py --engines chromium --shots /tmp/shots
"""
import argparse, json, os, shutil, socket, subprocess, sys, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAKE = os.path.join(ROOT, 'test', 'fake-cli')
SIZES = [('phone', 375, 667, True), ('tablet', 768, 1024, True), ('small laptop', 1024, 768, False), ('laptop', 1366, 768, False), ('ultrawide', 2560, 1080, False)]
TABS = ['clis', 'setup', 'advanced', 'run', 'results', 'insights', 'audit']

ap = argparse.ArgumentParser()
ap.add_argument('--engines', default='chromium,webkit,firefox')
ap.add_argument('--shots', help='save a screenshot of every tab and size here')
args = ap.parse_args()
failures, passes = [], 0
def check(name, ok, detail=''):
    global passes
    if ok: passes += 1
    else: failures.append(f'{name}: {detail}')
    print(('  ok   ' if ok else '  FAIL ') + name + (f'  ({detail})' if detail and not ok else ''), flush=True)

# --- a sandbox with realistic runs: three CLIs, two efforts, three variants, a failure, a run with no game, a /goal
# that's met and one that isn't (Codex has none)
tmp = tempfile.mkdtemp(prefix='matrix-ui-')
cfg = {'templateFile': 'prompt.md', 'agents': [
    {'id': 'opus', 'provider': 'claude', 'model': 'claude-opus-5-5', 'efforts': ['medium', 'high']},
    {'id': 'gpt-6.1-sol', 'provider': 'codex', 'model': 'gpt-6.1-sol', 'efforts': ['max']},
    {'id': 'gemini', 'provider': 'agy', 'model': 'gemini-4-argon', 'efforts': ['high']}],
  'dimensions': {'source': [{'id': 'kart', 'text': 'A kart racer'}],
                 'testing': [{'id': 'light', 'text': 'Keep testing light.'}, {'id': 'thorough', 'text': 'Test thoroughly. FAKE:todo FAKE:goal=unmet'},
                             {'id': 'broken', 'text': 'FAKE:fail=You have hit your usage limit (429)'}],
                 'goal': [{'id': 'on', 'text': 'the game file exists.'}]},
  'bins': {p: os.path.join(FAKE, p) for p in ['claude', 'codex', 'grok', 'agy', 'muse']},
  'startGap': 0}  # runs start together, not 3 s apart: the live checks expect two running at once
json.dump(cfg, open(os.path.join(tmp, 'config.json'), 'w'), indent=2)
open(os.path.join(tmp, 'prompt.md'), 'w').write('Make {{source}}.\n\nTesting: {{testing}}\n')
runs, conf = os.path.join(tmp, 'runs'), os.path.join(tmp, 'config.json')
# The fake codex and grok write their session logs under tmp, and the fake claude its transcripts, where the runner
# then looks for them.
env = {**os.environ, 'FAKE_SLEEP_MS': '10', 'CODEX_HOME': os.path.join(tmp, 'codex-home'), 'GROK_HOME': os.path.join(tmp, 'grok-home'),
       'CLAUDE_CONFIG_DIR': os.path.join(tmp, 'claude-home')}
subprocess.run(['node', os.path.join(ROOT, 'run-matrix.mjs'), '--config', conf, '--out', runs, '-j', '4'], check=True, capture_output=True, env=env)

s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
srv = subprocess.Popen(['node', os.path.join(ROOT, 'dashboard.mjs'), '--port', str(port), '--config', conf, '--out', runs], env=env,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
base = f'http://127.0.0.1:{port}'
for _ in range(100):
    try: urllib.request.urlopen(base + '/'); break
    except Exception: time.sleep(0.1)
has_audit = urllib.request.urlopen(base + '/api/audit').read().strip() != b'null'

OVERFLOW = """() => { const vw = document.documentElement.clientWidth, out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height || (r.right <= vw + 1 && r.left >= -1)) continue;
    let p = el.parentElement, clipped = false;
    while (p && p !== document.body) { if (/(auto|scroll|hidden)/.test(getComputedStyle(p).overflowX)) { clipped = true; break; } p = p.parentElement; }
    if (!clipped) out.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).join('.') : ''));
  }
  return { page: document.documentElement.scrollWidth - vw, items: out.slice(0, 5) }; }"""

try:
    with sync_playwright() as p:
        for engine in args.engines.split(','):
            print(f'{engine}:', flush=True)
            br = getattr(p, engine).launch()
            for label, w, hgt, mobile in SIZES:
                ctx = br.new_context(viewport={'width': w, 'height': hgt}, has_touch=mobile, is_mobile=mobile and engine != 'firefox')
                page = ctx.new_page(); errs = []
                page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
                page.on('pageerror', lambda e: errs.append(str(e)))
                for t in TABS:
                    if t == 'audit' and not has_audit: continue
                    page.goto(f'{base}/#{t}'); page.wait_for_selector(f'#tab-{t}.on > *', timeout=15000); page.wait_for_timeout(300)
                    o = page.evaluate(OVERFLOW)
                    check(f'{label} {w}px {t}: no sideways scroll', o['page'] <= 0 and not o['items'], json.dumps(o))
                    if args.shots:
                        os.makedirs(args.shots, exist_ok=True)
                        page.screenshot(path=os.path.join(args.shots, f'{engine}-{label}-{t}.png'), full_page=True)
                check(f'{label}: no console errors', not errs, '; '.join(errs[:3]))
                ctx.close()
            br.close()

        print('live behaviour (chromium):', flush=True)
        br = p.chromium.launch(); page = br.new_page(viewport={'width': 1280, 'height': 900})
        page.on('dialog', lambda d: d.accept())
        page.goto(base + '/#results'); page.wait_for_selector('table.runs')
        box = page.get_by_label('Search runs and notes')
        box.click(); box.type('opus', delay=30); page.wait_for_timeout(600); page.keyboard.type('-high', delay=30); page.wait_for_timeout(600)
        check('search keeps focus and every keystroke across redraws', page.evaluate('document.activeElement.value') == 'opus-high')
        page.get_by_role('button', name='Clear').first.click(); page.wait_for_timeout(300)
        rid = 'opus-medium__kart__light__on'  # every run has the goal's variant
        notes = page.get_by_label(f'Notes for {rid}'); notes.click(); notes.type('half a thought', delay=20)
        n0 = page.locator('table.runs tbody tr').count()
        # meanwhile, in a terminal: a new variant added to the config by hand, and run
        c = json.load(open(conf)); c['dimensions']['testing'].append({'id': 'extra', 'text': 'One more.'}); json.dump(c, open(conf, 'w'), indent=2)
        subprocess.run(['node', os.path.join(ROOT, 'run-matrix.mjs'), '--config', conf, '--out', runs, '--only', 'testing=extra'], check=True, capture_output=True, env=env)
        page.wait_for_timeout(3000)
        n1 = page.locator('table.runs tbody tr').count()
        check('runs from a terminal show up without a reload', n1 == n0 + 4, f'{n0} -> {n1}')
        st = page.evaluate("({ l: document.activeElement.getAttribute('aria-label'), v: document.activeElement.value })")
        check('a note being typed survives the live redraw', st == {'l': f'Notes for {rid}', 'v': 'half a thought'}, str(st))
        page.keyboard.press('Tab'); page.wait_for_timeout(600)
        saved = json.load(open(os.path.join(runs, 'scores.json'))).get(rid, {})
        check('the note saved, with the run attempt it belongs to', saved.get('notes') == 'half a thought' and bool(saved.get('startedAt')), str(saved))
        # a Codex run's details: its list price, requests, tools, subagent tokens and plan limits from Codex's session logs
        page.locator('table.runs tbody tr', has_text='gpt-6.1-sol').filter(has_text='light').get_by_role('button', name='details').click()
        page.wait_for_selector('#modal[open] >> text=API list price')
        txt = page.locator('#modal').inner_text()
        check('run details show list price, requests, tools, subagents and plan usage',
              all(x in txt for x in ['Model requests', 'command_execution 3', 'not in the CLI\'s own total', 'Plan usage', '5h 12%', 'week 41%', 'pro']), txt[:400])
        page.keyboard.press('Escape'); page.wait_for_timeout(200)
        # whether each run's /goal was met, read from its session: a column, a flag on the ones that weren't, and in details
        goals = sorted(set(g.strip() for g in page.locator('table.runs td.goalcell').all_inner_texts()))
        check('the goal met column shows met, not met and skipped (Codex has no /goal)', {'met', 'not met', 'skipped'} <= set(goals), str(goals))
        page.locator('table.runs tbody tr', has_text='opus').filter(has_text='thorough').filter(has_text='ok').first.get_by_role('button', name='details').click()
        page.wait_for_selector('#modal[open] >> text=Goal met')
        txt = page.locator('#modal').inner_text()
        check('a run whose goal was never met says so in details, with what its last check said',
              'Never met (9 checks; Claude Code ended the turn itself' in txt and 'does not show every feature working' in txt, txt[:600])
        page.keyboard.press('Escape'); page.wait_for_timeout(200)
        # CLIs → This computer: the sandbox's computer has no environment file yet, and the card says so (a page of its
        # own, so the CLIs tab's save bar isn't left beside Setup's for the steps below)
        cp = br.new_page(viewport={'width': 1280, 'height': 900}); cp.goto(base + '/#clis'); cp.wait_for_selector('#machinecard >> text=This computer')
        card = cp.locator('#machinecard').inner_text(); cp.close()
        check('CLIs → This computer says the computer has no environment file yet, and offers to write one',
              'has no environment file yet' in card and 'Check this computer' in card, card[:300])
        # Setup: bulk add a pasted list of games to {{source}} (numbered, a chosen short name, a duplicate, a comment)
        page.goto(base + '/#setup'); page.wait_for_selector('text=Bulk add…')
        page.locator('.card', has=page.locator('.tag', has_text='{{source}}')).get_by_role('button', name='Bulk add…').click()
        page.wait_for_selector('#bulk-text')
        games = '\n'.join(['# my list', '1. Super Mario Kart', '2) F-Zero X', '- mk8 | Mario Kart 8 Deluxe', 'A kart racer', ''] + [f'Game {i}' for i in range(100)])
        page.locator('#bulk-text').type(games[:60], delay=5); page.locator('#bulk-text').fill(games); page.wait_for_timeout(300)
        focused = page.evaluate("document.activeElement.id")
        page.get_by_role('button', name='Add 103 variants').click(); page.wait_for_timeout(200)
        page.keyboard.press('Control+s'); page.wait_for_timeout(800)
        src = [v['id'] for v in json.load(open(conf))['dimensions']['source']]
        check('bulk add: 103 games pasted at once, names made from the text, duplicates skipped, typing keeps focus',
              focused == 'bulk-text' and len(src) == 104 and src[1:4] == ['SuperMarioKart', 'FZeroX', 'mk8'] and src[-1] == 'Game99', f'{focused} {len(src)} {src[:5]}')
        c = json.load(open(conf)); c['dimensions']['source'] = c['dimensions']['source'][:1]; json.dump(c, open(conf, 'w'), indent=2); page.wait_for_timeout(2500)
        # Setup: runs are matched by short name, so editing the text of a variant that ran renames it ({{source}}'s from
        # the text) and the old text brings the old name back; a new source is named from its text; a name that ran is taken
        page.goto(base + '/#setup'); page.wait_for_selector('text=Bulk add…')
        card = page.locator('.card', has=page.locator('.tag', has_text='{{source}}'))
        name = card.get_by_label('source variant short name')
        card.get_by_label('source variant text').first.click(); page.keyboard.press('End'); page.keyboard.type(' 2')
        renamed = name.first.input_value()
        for _ in range(2): page.keyboard.press('Backspace')
        check('editing a variant that ran renames it, from its text for {{source}}; the old text brings the old name back',
              renamed == 'a-kart-racer-2' and name.first.input_value() == 'kart', f'{renamed} {name.first.input_value()}')
        card.get_by_role('button', name='+ Add variant').click(); page.wait_for_timeout(200)
        card.get_by_label('source variant text').last.fill('A golf game'); page.wait_for_timeout(200)
        new = name.last.input_value()
        card.get_by_label('Remove variant').first.click(); page.wait_for_timeout(200) # kart goes; its name is still the runs'
        name.first.fill('kart'); page.wait_for_timeout(200)
        taken = 'invalid' in (name.first.get_attribute('class') or '') and 'used "kart" for other text' in page.locator('.savebar').inner_text()
        check('a new {{source}} is named from its text; a short name finished runs used for other text is taken', new == 'a-golf-game' and taken, f'{new} {taken}')
        tcard = page.locator('.card', has=page.locator('.tag', has_text='{{testing}}'))
        tcard.locator('select[aria-label^="Add a pinned"]').select_option(label='test-full · Test thoroughly: automated tests for ev…'); page.wait_for_timeout(200)
        added = tcard.get_by_label('testing variant short name').last.input_value()
        check('"+ Add…" adds a pinned variant with its name and text', added == 'test-full' and 'automated tests' in tcard.get_by_label('testing variant text').last.input_value(), added)
        tcard.get_by_label('Pin testing variant light').click(); page.wait_for_timeout(200)
        tcard.get_by_label('Unpin testing variant test-full').click(); page.wait_for_timeout(200)
        pins = page.evaluate("pinsOf('testing').map((p) => p.id)")
        check('pin and unpin on a variant\'s row change the field\'s pins', 'light' in pins and 'test-full' not in pins, str(pins))
        page.get_by_role('button', name='Discard').click(); page.wait_for_timeout(300)
        page.goto(base + '/#run'); page.wait_for_selector('#tab-run.on > *')
        # a batch from the Run tab: the log follows its end, the pill shows progress
        many = [{'id': f'm{i}', 'text': f'FAKE:sleep=150 m{i}'} for i in range(30)]
        c = json.load(open(conf)); c['dimensions']['testing'] += many; json.dump(c, open(conf, 'w'), indent=2)
        page.goto(base + '/#run'); page.wait_for_timeout(1500)
        page.get_by_role('button', name='▶ Start').click()
        page.wait_for_function("document.querySelector('#pill').textContent.includes('Running')", timeout=10000)
        page.wait_for_function("!document.querySelector('#pill').textContent.includes('Running')", timeout=60000)
        page.wait_for_timeout(2500)
        pos = page.evaluate("(() => { const p = document.querySelector('#logpre'); return [p.scrollTop, p.scrollHeight - p.clientHeight]; })()")
        check('the batch log follows its end', pos[1] > 0 and pos[0] >= pos[1] - 8, str(pos))
        # a running batch takes changes: Options act on it, Pause holds the queue, a run can be restarted
        # long enough to still be running at the ↻ below, many steps later
        c = json.load(open(conf)); c['dimensions']['testing'] += [{'id': f's{i}', 'text': f'FAKE:sleep=12000 s{i}'} for i in range(4)]; json.dump(c, open(conf, 'w'), indent=2)
        api_state = lambda: json.load(urllib.request.urlopen(base + '/api/status'))
        page.goto(base + '/#run'); page.wait_for_timeout(1500)
        page.get_by_role('button', name='▶ Start').click()
        page.wait_for_function("status.running && status.state && status.active.length === 2", timeout=20000)
        page.wait_for_selector('text=Options · this batch')
        page.fill('#opt-concurrency', '1'); page.press('#opt-concurrency', 'Enter')
        page.get_by_role('button', name='Let them finish').click(); page.wait_for_timeout(800)
        st = api_state()
        check('lowering Parallel runs mid-batch asks, then applies without ending anything', st['state']['concurrency'] == 1 and len(st['active']) == 2, json.dumps(st['state']))
        check('Options say what a change reaches while a batch runs', page.locator('#tab-run .tag', has_text='not started yet').count() >= 4 and page.locator('#tab-run .tag', has_text='fixed').count() == 1)
        page.fill('#opt-perCli', '5'); page.press('#opt-perCli', 'Enter')
        page.wait_for_selector('#modal[open] >> text=Applies to the')
        page.get_by_role('button', name='Cancel').click(); page.wait_for_timeout(300)
        check('cancelling a change leaves the batch and the field as they were', api_state()['state']['perCli'] is None and page.input_value('#opt-perCli') == '')
        page.fill('#opt-perCli', '5'); page.press('#opt-perCli', 'Enter')
        page.get_by_role('button', name='Apply to the runs not started yet').click(); page.wait_for_timeout(800)
        check('every change asks first, then applies', api_state()['state']['perCli'] == 5)
        page.get_by_role('button', name='⏸ Pause').click()
        page.get_by_role('button', name='Let the running ones finish').click()
        page.wait_for_selector('button:has-text("▶ Resume")', timeout=5000)
        check('Pause holds the batch and offers Resume', api_state()['state']['paused'] is True)
        rid = page.evaluate('status.active[0]')
        page.get_by_label(f'Restart {rid} later').click()
        page.wait_for_function(f"logText.includes('↺ {rid} requeued')", timeout=10000)
        check('↻ ends a run and puts it back in the queue', rid not in api_state()['active'])
        page.set_viewport_size({'width': 375, 'height': 667}); page.wait_for_timeout(600)
        o = page.evaluate(OVERFLOW)
        check('phone 375px run tab with the live controls: no sideways scroll', o['page'] <= 0 and not o['items'], json.dumps(o))
        if args.shots: page.screenshot(path=os.path.join(args.shots, 'chromium-phone-run-live.png'), full_page=True)
        page.set_viewport_size({'width': 1280, 'height': 900})
        page.get_by_role('button', name='▶ Resume').click(); page.wait_for_timeout(800)
        check('Resume lets runs start again', api_state()['state']['paused'] is False)
        # + Queue: another batch beside the running one, listed on the Live card; the runs the first has are left out of it
        page.get_by_role('button', name='+ Queue').click()
        page.wait_for_function("status.batches && status.batches.length === 2", timeout=10000)
        page.wait_for_selector('#live >> text=Batch 2', timeout=5000)
        st = api_state()
        check('+ Queue adds a batch beside the running one, and it leaves out the runs that one has',
              any(l.startswith('+ Batch 2 queued') for l in st['log']) and st['running'], json.dumps(st['batches']))
        page.set_viewport_size({'width': 375, 'height': 667}); page.wait_for_timeout(400)
        o = page.evaluate(OVERFLOW)
        check('phone 375px run tab with two batches in the queue: no sideways scroll', o['page'] <= 0 and not o['items'], json.dumps(o))
        if args.shots: page.screenshot(path=os.path.join(args.shots, 'chromium-phone-run-queue.png'), full_page=True)
        page.set_viewport_size({'width': 1280, 'height': 900}); page.wait_for_timeout(300)
        if args.shots: page.screenshot(path=os.path.join(args.shots, 'chromium-laptop-run-queue.png'), full_page=True)
        if args.shots: page.screenshot(path=os.path.join(args.shots, 'chromium-laptop-run-live.png'), full_page=True)
        boot = api_state()['boot']
        page.get_by_role('button', name='⟳ Restart dashboard').click()
        page.wait_for_selector('#modal[open] >> text=The batch picks up where it left off')
        page.get_by_role('button', name='Cancel').click(); page.wait_for_timeout(500)
        st = api_state()
        check('Restart says what happens to the batch and the runs going, and Cancel leaves them be', st['boot'] == boot and st['running'] and not st['restarting'])
        page.get_by_role('button', name='■ Stop').click()
        page.wait_for_selector('#modal[open] .choices button.danger')
        check('Stop offers Pause first; ending runs is the red choice', page.locator('#modal .choices button.primary').inner_text().startswith('Pause instead'))
        page.locator('#modal .choices button.danger').click()
        page.wait_for_function("!status.running", timeout=30000)
        br.close()
finally:
    srv.terminate(); srv.wait()
    shutil.rmtree(tmp, ignore_errors=True)

print(f'\n{passes} passed, {len(failures)} failed')
for f in failures: print('  ' + f)
sys.exit(1 if failures else 0)
