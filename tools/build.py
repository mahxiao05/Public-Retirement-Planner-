#!/usr/bin/env python3
"""Stamp the shared menu bar, footer and <head> parts into every page, and write sitemap.xml, robots.txt and ads.txt.

The site stays plain static HTML (no build step is needed to view it). Run this after adding a page or
changing the menu:  python3 tools/build.py

Each page marks the shared parts with comment pairs, and the text between them is replaced:
  <!-- @head --> ... <!-- /@head -->        fonts, site.css, saved reader settings, AdSense loader
  <!-- @header --> ... <!-- /@header -->    skip link, menu bar, reading-setting icons
  <!-- @crumbs --> ... <!-- /@crumbs -->    "Home > Guides > page" trail; added after <main> on every page but home
  <!-- @footer --> ... <!-- /@footer -->    footer, phone tab bar and menu sheet, site.js
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
START = ("guides/where-to-begin/", "Where to begin", "Six steps, in order, for anyone a few years from retiring")
NAV = [
    ("", "Home"),
    ("guides/where-to-begin/", "Start here"),
    ("Tools", "Free calculators that show every step of the math.", [
        PLANNER,
        ("oregon-pers/", "Oregon PERS Pension Estimator", "Your monthly pension at any age, with Money Match"),
        ("planner/?system=fers", "FERS and TSP Planner", "Annuity, supplement and TSP for federal employees"),
        ("retirement-checklist/", "Retirement Countdown Checklist", "Every deadline from 3 years out to Medicare at 65"),
    ]),
    ("Oregon PERS", "For Oregon state, school, city and county employees.", [
        ("guides/oregon-pers-explained/", "Oregon PERS explained", "The whole system in one guide: plans, pension, IAP and how to apply"),
        ("oregon-pers/", "Pension Estimator", "How much your PERS pension will be"),
        ("guides/when-can-i-retire-oregon-pers/", "When can I retire from PERS?", "Full-benefit ages for each plan, and the early cut"),
        ("guides/pers-tier-one-tier-two-opsrp/", "Tier One, Tier Two or OPSRP?", "Which plan you're in and how it changes your pension"),
    ]),
    ("Federal FERS", "For federal civilian employees.", [
        ("fers/", "FERS explained", "Retirement ages, the annuity formula, supplement, TSP and how to apply"),
        ("guides/fers-retirement-age/", "When can I retire under FERS?", "Your Minimum Retirement Age and the MRA+10 cut"),
        ("planner/?system=fers", "FERS and TSP Planner", "See your annuity, supplement and TSP by date"),
    ]),
    ("Social Security & Medicare", "How they fit with a public pension.", [
        ("guides/social-security-explained/", "Social Security explained", "Who qualifies, how much you get, and how it fits with a pension"),
        ("guides/when-to-start-social-security/", "When should I start Social Security?", "Starting at 62, at full retirement age or at 70"),
        ("guides/does-a-pension-reduce-social-security/", "Does my pension lower my Social Security?", "What the 2025 Social Security Fairness Act changed"),
        ("guides/health-insurance-before-medicare/", "Health insurance before 65", "FEHB, PERS retiree plans, COBRA and HealthCare.gov"),
    ]),
    ("guides/", "Guides"),
    ("about/", "About"),
]
FOOT_COLS = [
    ("Tools", [("planner/", "Retirement Date Planner"), ("oregon-pers/", "Oregon PERS Estimator"), ("planner/?system=fers", "FERS and TSP Planner"),
               ("retirement-checklist/", "Countdown Checklist")]),
    ("Guides", [("guides/where-to-begin/", "Where to begin"), ("guides/oregon-pers-explained/", "Oregon PERS explained"), ("fers/", "FERS explained"),
                ("guides/social-security-explained/", "Social Security explained"), ("guides/", "All guides")]),
    ("About us", [("about/", "About this site"), ("contact/", "Contact us"), ("privacy/", "Privacy policy"), ("terms/", "Terms of use")]),
]
# Phone tab bar: always on screen below 940px wide. The last tab opens the full menu.
ICONS = {
    "home": '<path d="M3.5 11 12 4l8.5 7M6 9.5V20h4.5v-5.5h3V20H18V9.5"/>',
    "start": '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    "plan": '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    "guides": '<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6.5c2.5-2 5.5-2 8-1V19c-2.5-1-5.5-1-8 1-2.5-2-5.5-2-8-1zM12 6.5V20"/>',
    "menu": '<path d="M4 7h16M4 12h16M4 17h16"/>',
}
TABS = [("", "Home", "home"), ("guides/where-to-begin/", "Start here", "start"), ("planner/", "Planner", "plan"), ("guides/", "Guides", "guides")]

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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Lexend:wght@400;600;700&family=Public+Sans:wght@600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap">
<link rel="stylesheet" href="{rel}assets/site.css">
<script>{EARLY}</script>
{adsense}
<!-- /@head -->"""


def href_of(rel, href):
    return f"{rel}{href}" if href else (rel or "./")


def icon(name):
    return f'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{ICONS[name]}</svg>'


def header(rel, page):
    marked = []   # the current page is marked once, even when it appears in several menu groups
    def link(href, inner, cls):
        here = ""
        if href == page and not marked:
            here = ' aria-current="page"'
            marked.append(href)
        return f'<a class="{cls}" href="{href_of(rel, href)}"{here}>{inner}</a>'
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
<div class="topstrip"><div class="inner"><span>Free retirement guides and calculators for public employees</span><span>Independent: not a government website</span></div></div>
<header class="site-head">
  <div class="headbar">
    <a class="brand" href="{rel or './'}"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" focusable="false"><path d="M3 18h18M6.5 18a5.5 5.5 0 0 1 11 0M12 5v3M5.6 9.1l1.8 1.5M18.4 9.1l-1.8 1.5"/></svg></span><span class="brand-name"><span>Public</span> <span>Retirement</span> <span>Planner</span></span></a>
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


def tab_for(page):
    if page == "guides/where-to-begin/":
        return page
    if page.startswith("guides/"):
        return "guides/"
    if page.startswith("planner/"):
        return "planner/"
    return page


def phone_nav(rel, page):
    """The tab bar along the bottom of a phone screen, and the full-screen menu its Menu tab opens."""
    here = tab_for(page)
    tabs = "".join(f'\n    <a class="tab" href="{href_of(rel, h)}"{" aria-current=\"page\"" if h == here else ""}>{icon(i)}<span>{label}</span></a>' for h, label, i in TABS)
    sections = []
    for entry in NAV:
        if len(entry) == 2:
            continue
        label, intro, links = entry
        rows = "".join(f'\n        <li><a href="{href_of(rel, h)}"{" aria-current=\"page\"" if h == page else ""}><strong>{t}</strong><span>{d}</span></a></li>'
                       for h, t, d in links if label == "Tools" or (h, t, d) != PLANNER)
        sections.append(f'    <section>\n      <h2>{label}</h2>\n      <ul>{rows}\n      </ul>\n    </section>')
    more = "".join(f'<li><a href="{href_of(rel, h)}"><strong>{t}</strong></a></li>' for h, t in [("guides/", "All guides"), ("about/", "About this site"), ("contact/", "Contact us")])
    return f"""<nav class="tabbar" aria-label="Shortcuts">{tabs}
    <button type="button" class="tab" id="menu-btn" aria-expanded="false" aria-controls="menu-sheet">{icon("menu")}<span>Menu</span></button>
</nav>
<div class="sheet" id="menu-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" hidden>
  <div class="sheet-head"><h2 id="sheet-title" tabindex="-1">Menu</h2><button type="button" class="btn secondary sheet-close">Close</button></div>
  <div class="sheet-body">
    <a class="sheet-start" href="{href_of(rel, START[0])}"><span class="label">New here?</span><strong>Start with "Where to begin"</strong><span>{START[2]}.</span></a>
{chr(10).join(sections)}
    <section>
      <h2>More</h2>
      <ul class="sheet-more">{more}</ul>
    </section>
  </div>
</div>"""


def footer(rel, page=""):
    cols = "\n".join(f'      <div class="foot-col">\n        <h2>{title}</h2>\n        <ul>' + "".join(f'\n          <li><a href="{href_of(rel, h)}">{t}</a></li>' for h, t in links) + '\n        </ul>\n      </div>'
                     for title, links in FOOT_COLS)
    return f"""<!-- @footer -->
<footer class="site-foot">
  <div class="inner">
    <div class="foot-top">
      <div class="foot-about">
        <a class="brand" href="{rel or './'}"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" focusable="false"><path d="M3 18h18M6.5 18a5.5 5.5 0 0 1 11 0M12 5v3M5.6 9.1l1.8 1.5M18.4 9.1l-1.8 1.5"/></svg></span><span class="brand-name">Public Retirement Planner</span></a>
        <p>Plain-English retirement guides and calculators for public employees, built from the official rules and checked against the agencies that publish them.</p>
      </div>
{cols}
    </div>
    <div class="foot-legal">
      <p><strong>Estimates, not advice.</strong> The tools on this site give estimates based on your answers and on rules published by government agencies. They are not financial, legal or tax advice and do not guarantee any benefit. This site is not affiliated with Oregon PERS, the Social Security Administration, OPM, the TSP or any other government agency.</p>
      <p>Your answers stay on your device. Last updated {LAST_UPDATED}.</p>
      <p>© 2026 X Ventures LLC. Public Retirement Planner is owned and operated by X Ventures LLC.</p>
    </div>
  </div>
</footer>
{phone_nav(rel, page)}
<script src="{rel}assets/info.js"></script>
<script src="{rel}assets/site.js"></script>
<!-- /@footer -->"""


def crumbs(rel, page, text):
    """Breadcrumb trail plus its schema.org markup, so people and search engines see where a page sits."""
    m = re.search(r"<h1[^>]*>(.*?)</h1>", text, re.S)
    name = re.sub(r"<[^>]+>", "", m.group(1)).strip() if m else page.strip("/")
    trail = [("", "Home")]
    if page.startswith("guides/") and page != "guides/":
        trail.append(("guides/", "Guides"))
    items = "".join(f'<li><a href="{href_of(rel, h)}">{t}</a></li>' for h, t in trail) + f'<li aria-current="page">{name}</li>'
    ld = ",".join(f'{{"@type":"ListItem","position":{i + 1},"name":"{t}","item":"{SITE_URL}{h}"}}' for i, (h, t) in enumerate(trail + [(page, name.replace(chr(34), ""))]))
    return f"""<!-- @crumbs -->
<nav class="crumbs" aria-label="You are here"><ol>{items}</ol></nav>
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{ld}]}}</script>
<!-- /@crumbs -->"""


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
        page = path + "/" if path else ""
        text = replace(text, "header", header(rel, page))
        text = replace(text, "footer", footer(rel, page))
        if page:
            if "<!-- @crumbs -->" not in text:
                text = re.sub(r"(<main[^>]*>)", r"\1\n<!-- @crumbs --><!-- /@crumbs -->", text, count=1)
            text = replace(text, "crumbs", crumbs(rel, page, text))
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
