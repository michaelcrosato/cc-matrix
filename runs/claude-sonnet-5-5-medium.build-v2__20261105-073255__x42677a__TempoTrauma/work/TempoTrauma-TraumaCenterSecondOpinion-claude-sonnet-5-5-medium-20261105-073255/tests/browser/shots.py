"""Screenshots at 1920x1080 of the screens a script cannot judge: ops, story, results, dev, about."""
import sys, time
from playwright.sync_api import sync_playwright
from common import Game

def main(which):
    with sync_playwright() as p:
        g = Game(p, size=(1920, 1080)).open()
        try:
            def to(screen):
                g.do({"shell": screen}); time.sleep(0.8)
            def snap(name, ticks=0):
                if ticks:
                    g.step(ticks)
                time.sleep(1.0)
                g.shot(name)
            if "story" in which:
                g.do({"sim": {"NewGame": {"step": 9, "difficulty": 1}}}); to("game")
                g.step(150); snap("story_s3.png")
                g.do({"sim": {"NewGame": {"step": 0, "difficulty": 1}}}); g.step(200); snap("story_s0.png")
            for case, ticks in ((0, 420), (1, 700), (3, 760), (4, 1100), (5, 450), (6, 800), (7, 1500), (8, 1500)):
                if f"op{case}" not in which and "ops" not in which:
                    continue
                g.do({"sim": {"JumpCase": case}}); to("game")
                g.do({"bot": True})
                g.step(ticks); snap(f"op_case{case}.png")
            if "results" in which:
                g.do({"sim": {"JumpCase": 1}}); to("game"); g.do({"bot": True}); g.step(200); g.do({"bot": False}); g.do({"sim": "WinCase"}); g.step(60 * 6); g.frames(2); g.do({"shell": "mode_t:6.0"}); g.frames(2); snap("results.png")
            if "dev" in which:
                g.do({"sim": {"JumpCase": 3}}); to("dev"); g.step(300); snap("dev.png")
            if "about" in which:
                to("about"); snap("about.png")
            if "cases" in which:
                to("cases"); snap("cases.png")
            if "dead" in which:
                g.do({"sim": {"JumpCase": 2}}); to("game"); g.do({"bot": True}); g.step(200); g.do({"bot": False}); g.do({"sim": "KillPatient"}); g.step(60 * 5); snap("dead.png")
            print("errors:", g.errors[:3])
        finally:
            g.close()

if __name__ == "__main__":
    main(sys.argv[1:] or ["ops"])
