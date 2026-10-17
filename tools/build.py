#!/usr/bin/env python3
"""Stamp the shared menu bar, footer and <head> parts into every page, and write sitemap.xml, robots.txt and ads.txt.

The site stays plain static HTML (no build step is needed to view it). Run this after adding a page or
changing the menu:  python3 tools/build.py

Each page marks the shared parts with comment pairs, and the text between them is replaced:
  <!-- @head --> ... <!-- /@head -->        fonts, site.css, saved reader settings, AdSense loader
  <!-- @header --> ... <!-- /@header -->    skip link, menu bar, Text & colors panel
  <!-- @footer --> ... <!-- /@footer -->    footer links and disclaimer, site.js
A page names its menu item with <meta name="nav" content="planner">.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE_URL = "https://mahxiao05.github.io/Public-Retirement-Planner-/"   # change when a custom domain is connected
ADSENSE_ID = "pub-7867146450299069"        # e.g. "pub-1234567890123456" from AdSense > Account > Account information
LAST_UPDATED = "October 17, 2026"

NAV = [
    ("planner", "planner/", "Plan my retirement"),
    ("pers", "oregon-pers/", "Oregon PERS"),
    ("fers", "fers/", "Federal FERS"),
    ("guides", "guides/", "Guides"),
    ("about", "about/", "About"),
]
FOOT = [("", "Home"), ("about/", "About"), ("contact/", "Contact"), ("privacy/", "Privacy policy"), ("terms/", "Terms of use")]

EARLY = ("(function(){try{var d=document.documentElement,s=localStorage,t=s.getItem('site-theme'),"
         "z=s.getItem('site-size')||(s.getItem('pers-guide-size')==='1'?'2':null),f=s.getItem('site-font');"
         "if(t)d.setAttribute('data-theme',t);if(z)d.setAttribute('data-size',z);if(f)d.setAttribute('data-font',f);}catch(e){}})();")


def head(rel, url):
    adsense = (f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-{ADSENSE_ID}" crossorigin="anonymous"></script>'
               if ADSENSE_ID else "<!-- AdSense loader goes here once ADSENSE_ID is set in tools/build.py -->")
    return f"""<!-- @head -->
<link rel="canonical" href="{url}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Lexend:wght@400;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap">
<link rel="stylesheet" href="{rel}assets/site.css">
<script>{EARLY}</script>
{adsense}
<!-- /@head -->"""


def header(rel, current):
    links = "\n".join(
        f'      <a href="{rel}{href}"{" aria-current=\"page\"" if key == current else ""}>{label}</a>' for key, href, label in NAV)
    return f"""<!-- @header -->
<a class="skip" href="#main">Skip to main content</a>
<header class="site-head">
  <div class="headbar">
    <a class="brand" href="{rel or './'}">Public Retirement Planner</a>
    <button type="button" class="head-btn menu-btn" id="menu-btn" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav class="site-nav" id="site-nav" aria-label="Main">
{links}
    </nav>
    <button type="button" class="head-btn" id="display-btn" aria-expanded="false" aria-controls="display-panel">Text &amp; colors</button>
  </div>
  <div class="display-panel" id="display-panel" hidden>
    <div class="inner">
      <h2>Make this site easier to read</h2>
      <div class="setting" role="group" aria-label="Text size">
        <span class="label">Text size</span>
        <div class="choices">
          <button type="button" class="sz1" data-set="size:1" aria-pressed="true">Normal</button>
          <button type="button" class="sz2" data-set="size:2" aria-pressed="false">Large</button>
          <button type="button" class="sz3" data-set="size:3" aria-pressed="false">Largest</button>
        </div>
      </div>
      <div class="setting" role="group" aria-label="Colors">
        <span class="label">Colors</span>
        <div class="choices">
          <button type="button" data-set="theme:light" aria-pressed="false">Light</button>
          <button type="button" data-set="theme:dark" aria-pressed="false">Dark</button>
          <button type="button" data-set="theme:auto" aria-pressed="true">Same as my device</button>
        </div>
      </div>
      <div class="setting" role="group" aria-label="Letters">
        <span class="label">Letters</span>
        <div class="choices">
          <button type="button" class="f-clear" data-set="font:clear" aria-pressed="true">Easy to read</button>
          <button type="button" class="f-book" data-set="font:book" aria-pressed="false">Book style</button>
          <button type="button" class="f-wide" data-set="font:wide" aria-pressed="false">Wide spacing</button>
        </div>
      </div>
      <button type="button" class="btn primary done" id="display-done">Done</button>
    </div>
  </div>
</header>
<!-- /@header -->"""


def footer(rel):
    links = "\n".join(f'      <a href="{rel}{href}">{label}</a>' if href else f'      <a href="{rel or "./"}">{label}</a>' for href, label in FOOT)
    return f"""<!-- @footer -->
<footer class="site-foot">
  <div class="inner">
    <nav class="foot-links" aria-label="Site">
{links}
    </nav>
    <p><strong>Estimates, not advice.</strong> The tools on this site give estimates based on your answers and on rules published by government agencies. They are not financial, legal or tax advice and do not guarantee any benefit. This site is not affiliated with Oregon PERS, the Social Security Administration, OPM, the TSP or any other government agency.</p>
    <p>Your answers stay on your device. Last updated {LAST_UPDATED}.</p>
  </div>
</footer>
<script src="{rel}assets/info.js"></script>
<script src="{rel}assets/site.js"></script>
<!-- /@footer -->"""


def replace(text, tag, block):
    pat = re.compile(r"<!-- @" + tag + r" -->.*?<!-- /@" + tag + r" -->", re.S)
    if not pat.search(text):
        raise SystemExit(f"missing <!-- @{tag} --> markers")
    return pat.sub(lambda m: block, text, count=1)


def main():
    pages = sorted(p for p in ROOT.rglob("index.html") if "tools" not in p.parts and ".git" not in p.parts)
    urls = []
    for p in pages:
        depth = len(p.relative_to(ROOT).parts) - 1
        rel = "../" * depth
        path = "/".join(p.relative_to(ROOT).parts[:-1])
        url = SITE_URL + (path + "/" if path else "")
        text = p.read_text()
        m = re.search(r'<meta name="nav" content="([^"]*)">', text)
        text = replace(text, "head", head(rel, url))
        text = replace(text, "header", header(rel, m.group(1) if m else ""))
        text = replace(text, "footer", footer(rel))
        p.write_text(text)
        urls.append(url)
        print("stamped", p.relative_to(ROOT))
    (ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                      + "".join(f"  <url><loc>{u}</loc></url>\n" for u in urls) + "</urlset>\n")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}sitemap.xml\n")
    ads = ROOT / "ads.txt"
    if ADSENSE_ID:
        ads.write_text(f"google.com, {ADSENSE_ID}, DIRECT, f08c47fec0942fa0\n")
    elif ads.exists():
        ads.unlink()


if __name__ == "__main__":
    main()
