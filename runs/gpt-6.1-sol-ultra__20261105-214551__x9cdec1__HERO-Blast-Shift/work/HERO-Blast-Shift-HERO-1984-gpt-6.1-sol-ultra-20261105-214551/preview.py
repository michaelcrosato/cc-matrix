import functools
import http.server
from pathlib import Path

root = Path(__file__).resolve().parent.parent
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
Path(__file__).with_name("server-port.txt").write_text(str(server.server_port))
Path(__file__).with_name("server-pid.txt").write_text(str(__import__("os").getpid()))
print(f"http://127.0.0.1:{server.server_port}", flush=True)
server.serve_forever()
