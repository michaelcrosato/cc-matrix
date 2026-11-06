"""Run the unmodified AI Hub harness against the bundled game.

Uses one browser, one harness page at a time, and a temporary OS-assigned
loopback port. All files and the result record stay in this game folder.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from threading import Thread
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def run():
    failures = []
    total = 0
    records = []
    server = ThreadingHTTPServer(
        ('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT))
    )
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    try:
        if not (ROOT / 'index.html').is_file():
            raise FileNotFoundError('Run npm run build before the Hub checks.')
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=[
                    '--enable-unsafe-webgpu',
                    '--enable-features=Vulkan',
                    '--use-webgpu-adapter=swiftshader',
                    '--autoplay-policy=no-user-gesture-required',
                ],
            )
            try:
                for scenario in ('standard', 'host-leave', 'server'):
                    context = browser.new_context(
                        viewport={'width': 900, 'height': 560},
                        device_scale_factor=1,
                        ignore_https_errors=True,
                    )
                    try:
                        page = context.new_page()
                        query = urlencode({
                            'game': '../index.html',
                            'players': 2,
                            'auto': 1,
                            'limit': 10,
                            'play': 4000,
                            'latency': 150,
                            'jitter': 50,
                            'loss': 5,
                            'scenario': scenario,
                        })
                        page.goto(
                            f'{origin}/hub-reference/harness.html?{query}',
                            wait_until='domcontentloaded',
                        )
                        if page.title() != 'AI Hub Session Harness':
                            raise RuntimeError('Loopback page is not the AI Hub harness')
                        page.wait_for_function(
                            'document.body.dataset.complete === "true"',
                            timeout=120_000,
                        )
                        report = page.evaluate('window.__hubCheck')
                        gameplay = []
                        for frame in page.frames[1:]:
                            sample = frame.evaluate('''() => {
                              const game = window.__game;
                              if (!game?.ready) return null;
                              const s = game.state;
                              const bodies = [...s.ships, ...s.trucks, ...s.enemies, ...s.bullets];
                              return { mode: game.mode, time: s.totalTime, score: s.score,
                                ships: s.ships.length, trucks: s.trucks.length,
                                finite: bodies.every(e => Number.isFinite(e.x) && Number.isFinite(e.y)),
                                network: game.online };
                            }''')
                            if sample:
                                gameplay.append(sample)
                        for name, passed in (
                            ('actual patrol advances in every remaining copy', bool(gameplay) and all(s['time'] > .25 and s['ships'] == 2 and s['trucks'] == 6 for s in gameplay)),
                            ('world positions stay finite', bool(gameplay) and all(s['finite'] for s in gameplay)),
                            ('every remaining game stops at session end', bool(gameplay) and all(s['mode'] == 'ended' for s in gameplay)),
                        ):
                            total += 1
                            if not passed:
                                failures.append(f'FAIL Hub {scenario}: {name} — {gameplay}')
                        records.append({'scenario': scenario, 'report': report, 'gameplay': gameplay})
                        for check in report.get('checks', []):
                            total += 1
                            if not check.get('pass'):
                                detail = str(check.get('detail') or '').replace('\n', ' ')
                                failures.append(
                                    f'FAIL Hub {scenario}: {check.get("name", "unknown")} — {detail[:700]}'
                                )
                        if not report.get('checks'):
                            total += 1
                            failures.append(f'FAIL Hub {scenario}: harness returned no checks')
                    except Exception as error:
                        total += 1
                        message = str(error).splitlines()[0]
                        failures.append(f'FAIL Hub {scenario}: {message}')
                        try:
                            records.append({
                                'scenario': scenario,
                                'error': message,
                                'report': page.evaluate('window.__hubCheck || null'),
                            })
                        except Exception:
                            records.append({'scenario': scenario, 'error': message})
                    finally:
                        context.close()
            finally:
                browser.close()
    except Exception as error:
        total += 1
        failures.append(f'FAIL Hub setup: {str(error).splitlines()[0]}')
    finally:
        server.shutdown()
        server.server_close()
    (ROOT / 'tests/hub-results.json').write_text(json.dumps(records, indent=2))
    for failure in failures:
        print(failure)
    print(f'{total - len(failures)}/{total} Hub checks passed')
    return bool(failures)


if __name__ == '__main__':
    raise SystemExit(run())
