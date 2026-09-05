#!/usr/bin/env python3
"""Static dev server for the portfolio, with caching turned off.

`python3 -m http.server` sends Last-Modified but no Cache-Control. Chrome
then applies heuristic caching and will happily serve a stylesheet it
already has without revalidating — so a CSS edit can look like it did
nothing until you hard-reload. Every response here carries no-store, so a
plain refresh always shows the current files.

    python3 serve.py [port]        # default 4173
"""

import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    print(f"serving {sys.path[0] or '.'} at http://localhost:{port}/homepage/index.html")
    HTTPServer(("127.0.0.1", port), NoCacheHandler).serve_forever()
