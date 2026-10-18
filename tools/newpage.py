#!/usr/bin/env python3
"""Start a new page with the shared markers in place:
  python3 tools/newpage.py guides/my-guide/ "Page title" "Search description" guides < body.html
The body (everything inside <main>) comes from standard input. Run tools/build.py afterwards,
and add guides to GUIDES in tools/build.py so they get "Keep reading" links and a place on the Guides page."""
import datetime
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
path, title, desc, nav = sys.argv[1:5]
today = datetime.date.today().isoformat()
body = sys.stdin.read().strip("\n")
out = ROOT / path / "index.html"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="published" content="{today}">
<meta name="updated" content="{today}">
<meta name="nav" content="{nav}">
<!-- @head --><!-- /@head -->
</head>
<body>
<!-- @header --><!-- /@header -->
<main id="main" class="page">
{body}
</main>
<!-- @footer --><!-- /@footer -->
</body>
</html>
""")
print("wrote", out.relative_to(ROOT))
