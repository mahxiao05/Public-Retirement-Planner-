#!/usr/bin/env python3
"""Stamp the shared menu bar, footer and <head> parts into every page, and write sitemap.xml, robots.txt and ads.txt.

The site stays plain static HTML (no build step is needed to view it). Run this after adding a page or
changing the menu:  python3 tools/build.py

Each page marks the shared parts with comment pairs, and the text between them is replaced:
  <!-- @head --> ... <!-- /@head -->        fonts, site.css, saved reader settings, AdSense loader
  <!-- @header --> ... <!-- /@header -->    skip link, menu bar, reading-setting icons
  <!-- @footer --> ... <!-- /@footer -->    footer links and disclaimer, site.js
A page names its menu item with <meta name="nav" content="planner">.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE_URL = "https://publicpensionplanner.com/"
ADSENSE_ID = "pub-7867146450299069"        # e.g. "pub-1234567890123456" from AdSense > Account > Account information
LAST_UPDATED = "October 17, 2026"

# Top menu. A group is (label, intro, [(href, title, description)]); a plain link is (href, label).
PLANNER = ("planner/", "Retirement Date Planner", "Pension, savings and Social Security on one timeline, with dates compared")
NAV = [
    ("", "Home"),
    ("Tools", "Free calculators that show every step of the math.", [
        PLANNER,
        ("oregon-pers/", "Oregon PERS Pension Estimator", "Your monthly pension at any age, with Money Match"),
        ("planner/?system=fers", "FERS and TSP Planner", "Annuity, supplement and TSP for federal employees"),
        ("retirement-checklist/", "Retirement Countdown Checklist", "Every deadline from 3 years out to Medicare at 65"),
    ]),
    ("Oregon PERS", "For Oregon state, school, city and county employees.", [
        ("oregon-pers/", "Pension Estimator", "How much your PERS pension will be"),
        ("guides/when-can-i-retire-oregon-pers/", "When can I retire from PERS?", "Full-benefit ages for each plan, and the early cut"),
        ("guides/pers-tier-one-tier-two-opsrp/", "Tier One, Tier Two or OPSRP?", "Which plan you're in and how it changes your pension"),
        PLANNER,
    ]),
    ("Federal FERS", "For federal civilian employees.", [
        ("fers/", "FERS pension and TSP explained", "Retirement ages, the annuity formula, supplement and TSP"),
        ("guides/fers-retirement-age/", "When can I retire under FERS?", "Your Minimum Retirement Age and the MRA+10 cut"),
        ("planner/?system=fers", "FERS and TSP Planner", "See your annuity, supplement and TSP by date"),
    ]),
    ("Social Security & Medicare", "How they fit with a public pension.", [
        ("guides/when-to-start-social-security/", "When should I start Social Security?", "Starting at 62, at full retirement age or at 70"),
        ("guides/does-a-pension-reduce-social-security/", "Does my pension lower my Social Security?", "What the 2025 Social Security Fairness Act changed"),
        ("guides/health-insurance-before-medicare/", "Health insurance before 65", "FEHB, PERS retiree plans, COBRA and HealthCare.gov"),
        PLANNER,
    ]),
    ("guides/", "Guides"),
    ("about/", "About"),
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Lexend:wght@400;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap">
<link rel="stylesheet" href="{rel}assets/site.css">
<script>{EARLY}</script>
{adsense}
<!-- /@head -->"""


def header(rel, page):
    marked = []   # the current page is marked once, even when it appears in several menu groups
    def link(href, inner, cls):
        here = ""
        if href == page and not marked:
            here = ' aria-current="page"'
            marked.append(href)
        return f'<a class="{cls}" href="{rel}{href}"{here}>{inner}</a>' if href else f'<a class="{cls}" href="{rel or "./"}"{here}>{inner}</a>'
    items = []
    for n, entry in enumerate(NAV):
        if len(entry) == 2:
            items.append("      <li>" + link(entry[0], entry[1], "nav-top") + "</li>")
            continue
        label, intro, links = entry
        current = ""
        if any(h == page for h, _, _ in links) and not marked:   # highlight only the first group that holds this page
            current = " has-current"
        cards = "".join(f'\n            <li>{link(h, f"<strong>{t}</strong><span>{d}</span>", "nav-card")}</li>' for h, t, d in links)
        items.append(f"""      <li class="nav-group{current}">
        <button type="button" class="nav-top" aria-expanded="false" aria-controls="menu-{n}">{label}<svg class="chev" viewBox="0 0 12 8" aria-hidden="true" focusable="false"><path d="M1.5 1.5l4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <div class="nav-panel" id="menu-{n}" hidden>
          <p class="nav-intro">{intro}</p>
          <ul class="nav-cards">{cards}
          </ul>
        </div>
      </li>""")
    links = "\n".join(items)
    return f"""<!-- @header -->
<a class="skip" href="#main">Skip to main content</a>
<header class="site-head">
  <div class="headbar">
    <a class="brand" href="{rel or './'}"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" focusable="false"><path d="M3 18h18M6.5 18a5.5 5.5 0 0 1 11 0M12 5v3M5.6 9.1l1.8 1.5M18.4 9.1l-1.8 1.5"/></svg></span>Public Retirement Planner</a>
    <button type="button" class="head-btn menu-btn" id="menu-btn" aria-expanded="false" aria-controls="site-nav"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16"/></svg>Menu</button>
    <nav class="site-nav" id="site-nav" aria-label="Main">
      <ul class="nav-list">
{links}
      </ul>
    </nav>
    <div class="quick" role="group" aria-label="Reading settings">
      <button type="button" class="quick-btn" data-cycle="size" aria-label="Text size"><span class="q-ico q-size" aria-hidden="true">A<b>A</b></span><span class="q-label">Text size</span></button>
      <button type="button" class="quick-btn" data-cycle="theme" aria-label="Colors"><span class="q-ico" aria-hidden="true"><svg class="q-sun" viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/></svg><svg class="q-moon" viewBox="0 0 24 24" focusable="false"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg></span><span class="q-label">Colors</span></button>
      <button type="button" class="quick-btn" data-cycle="font" aria-label="Letter style"><span class="q-ico q-font" aria-hidden="true">Aa</span><span class="q-label">Letters</span></button>
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
    <p>© 2026 X Ventures LLC. Public Retirement Planner is owned and operated by X Ventures LLC.</p>
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
        text = replace(text, "head", head(rel, url))
        text = replace(text, "header", header(rel, path + "/" if path else ""))
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
