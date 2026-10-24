#!/usr/bin/env python3
"""Stamp the shared menu bar, footer and <head> parts into every page, and write sitemap.xml, robots.txt and ads.txt.

The site stays plain static HTML (no build step is needed to view it). Run this after adding a page or
changing the menu:  python3 tools/build.py

Each page marks the shared parts with comment pairs, and the text between them is replaced:
  <!-- @head --> ... <!-- /@head -->        default fonts (site.js loads the other two on demand), site.css, saved reader settings, AdSense loader
  <!-- @header --> ... <!-- /@header -->    skip link, menu bar, reading-setting icons
  <!-- @crumbs --> ... <!-- /@crumbs -->    "Home > Guides > page" trail; added after <main> on every page but home
  <!-- @footer --> ... <!-- /@footer -->    footer, phone tab bar and menu sheet, site.js
  <!-- @related --> ... <!-- /@related -->  "Keep reading" links on a guide; added before </article> on every page in GUIDES
  <!-- @guidelist --> ... <!-- /@guidelist -->  every guide, grouped by topic (the Guides page)
A page names its menu item with <meta name="nav" content="planner">, and its dates with
<meta name="published" content="2026-10-17"> and <meta name="updated" content="2026-10-18"> (used for Google's
article dates and the sitemap). 404.html is stamped too, with links that start at the site root.
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE_URL = "https://publicpensionplanner.com/"
ADSENSE_ID = "pub-7867146450299069"        # e.g. "pub-1234567890123456" from AdSense > Account > Account information
LAST_UPDATED = "October 24, 2026"
SITE_NAME = "Public Retirement Planner"
EDITOR = {"@type": "Person", "name": "Max Ma", "url": SITE_URL + "about/#editor"}
# Guides and calculators get "Reviewed by Max Ma" at the end of their byline (the "Rules checked" line).
REVIEWED_PAGES = {"fers/", "oregon-pers/", "can-i-retire/", "retirement-checklist/", "glossary/"}
REVIEWED = ' <span class="reviewer">· Reviewed by <a href="{rel}about/#editor">Max Ma</a></span>'

# Top menu. A group is (label, intro, [(href, title, description)]); a plain link is (href, label).
PLANNER = ("planner/", "Retirement Date Planner", "Pension, savings and Social Security on one timeline, with dates compared")
START = ("guides/where-to-begin/", "Where to begin", "Six steps, in order, for anyone a few years from retiring")
NAV = [
    ("", "Home"),
    ("guides/where-to-begin/", "Start here"),
    ("Calculators", "Free calculators that show every step of the math.", [
        ("can-i-retire/", "Can I retire?", "A quick yes or not yet, with Social Security at 62, 67 or 70"),
        PLANNER,
        ("oregon-pers/", "Oregon PERS Pension Estimator", "Your monthly pension at any age, with Money Match"),
        ("planner/?system=fers", "FERS and TSP Planner", "Annuity, supplement and TSP for federal employees"),
        ("calculators/survivor-option-comparison/", "Single life or survivor option", "What a survivor option costs, and when it pays off"),
        ("calculators/retirement-income-after-tax/", "Take-home pay in retirement", "Federal tax on your pension and Social Security"),
        ("retirement-checklist/", "Retirement Countdown Checklist", "Every deadline, with calendar reminders"),
        ("calculators/", "All calculators", "Sick leave, military buyback, savings and more"),
    ]),
    ("Pensions", "Complete guides to each retirement system.", [
        ("guides/oregon-pers-explained/", "Oregon PERS explained", "Tier One, Tier Two, OPSRP, the IAP and how to apply"),
        ("guides/when-can-i-retire-oregon-pers/", "When can I retire from PERS?", "Full-benefit ages for each plan, and the early cut"),
        ("guides/washington-drs-explained/", "Washington DRS explained", "PERS, TRS and SERS, Plans 1, 2 and 3"),
        ("guides/when-can-i-retire-washington-drs/", "When can I retire from DRS?", "Ages by plan, and the early retirement cuts"),
        ("fers/", "FERS explained", "Retirement ages, the annuity formula, supplement and TSP"),
        ("guides/fers-retirement-age/", "When can I retire under FERS?", "Your Minimum Retirement Age and the MRA+10 cut"),
        ("guides/calpers-explained/", "CalPERS explained", "Classic and PEPRA formulas, age factors and options"),
        ("guides/calstrs-explained/", "CalSTRS explained", "2% at 60 and 2% at 62 for California teachers"),
        ("guides/idaho-persi-explained/", "Idaho PERSI explained", "The formula, Rule of 90 and early retirement"),
    ]),
    ("Social Security & Medicare", "How they fit with a public pension.", [
        ("guides/social-security-explained/", "Social Security explained", "Who qualifies, how much you get, and how it fits with a pension"),
        ("guides/when-to-start-social-security/", "When should I start Social Security?", "Starting at 62, at full retirement age or at 70"),
        ("guides/does-a-pension-reduce-social-security/", "Does my pension lower my Social Security?", "What the 2025 Social Security Fairness Act changed"),
        ("guides/social-security-spousal-benefits/", "Spousal benefits", "Up to half of your spouse's full benefit"),
        ("guides/social-security-survivor-benefits/", "Survivor benefits", "What a widow or widower gets"),
        ("guides/when-to-sign-up-for-medicare/", "When to sign up for Medicare", "The 7-month window and the penalties to avoid"),
        ("guides/health-insurance-before-medicare/", "Health insurance before 65", "FEHB, PERS retiree plans, COBRA and HealthCare.gov"),
        ("guides/retirement-numbers-2027/", "Retirement numbers for 2027", "This year's raises, limits and premiums"),
    ]),
    ("guides/", "All guides"),
    ("glossary/", "Glossary"),
]
FOOT_COLS = [
    ("Calculators", [("can-i-retire/", "Can I retire?"), ("planner/", "Retirement Date Planner"), ("oregon-pers/", "Oregon PERS Estimator"), ("planner/?system=fers", "FERS and TSP Planner"),
                     ("retirement-checklist/", "Countdown Checklist"), ("calculators/", "All calculators"), ("my-plan/", "My plan")]),
    ("Guides", [("guides/where-to-begin/", "Where to begin"), ("guides/oregon-pers-explained/", "Oregon PERS"), ("guides/washington-drs-explained/", "Washington DRS"), ("fers/", "Federal FERS"),
                ("guides/calpers-explained/", "CalPERS"), ("guides/social-security-explained/", "Social Security"), ("guides/", "All guides"), ("glossary/", "Glossary")]),
    ("About us", [("about/", "About this site"), ("how-we-check/", "How we check our numbers"), ("changes/", "What changed"), ("contact/", "Contact us"), ("privacy/", "Privacy policy"), ("terms/", "Terms of use")]),
]
# Every guide, in the order the Guides page lists them. (path, section, title, summary)
# Each one gets "Keep reading" links to the others in its section, and Google article dates.
SECTIONS = ['Start here', 'Oregon PERS', 'Washington DRS', 'Federal FERS', 'California CalPERS and CalSTRS', 'Idaho PERSI', 'Social Security', 'Medicare and health care', 'Pension decisions', 'Money, taxes and savings']
GUIDES = [
    ('guides/where-to-begin/', 'Start here', 'Where to begin with retirement planning', 'Six steps, in order: find your system, get your records, compare dates, plan health insurance and apply on time.'),
    ('guides/retirement-numbers-2027/', 'Start here', 'Retirement numbers for 2027', 'The 2027 Social Security raise of 3.6%, FERS and CSRS raises, earnings limits, the wage cap, and figures still to come.'),
    ('guides/oregon-pers-explained/', 'Oregon PERS', 'Oregon PERS explained', 'Plans, the pension formula, Money Match, the IAP, raises and how to apply, in one place.'),
    ('guides/when-can-i-retire-oregon-pers/', 'Oregon PERS', 'When can I retire from Oregon PERS?', 'Earliest and full-benefit ages for every group, and what retiring early costs.'),
    ('guides/pers-tier-one-tier-two-opsrp/', 'Oregon PERS', "Tier One, Tier Two and OPSRP: what's the difference?", 'Formulas, retirement ages, Money Match and the IAP, side by side.'),
    ('guides/oregon-pers-iap-payout-options/', 'Oregon PERS', 'Oregon PERS IAP payout options', 'Lump sum, installments or rollover: how the PERS IAP pays out, minimum balances, taxes, the 10% early tax and death rules.'),
    ('guides/oregon-pers-survivor-options/', 'Oregon PERS', 'Oregon PERS survivor options', "Option 1, Refund Annuity, Options 2, 2A, 3, 3A and OPSRP survivorship choices: what each costs and why it's nearly permanent."),
    ('guides/oregon-pers-unused-sick-leave/', 'Oregon PERS', 'Unused sick leave and your PERS pension', 'Tier One and Tier Two members at participating employers get half their unused sick leave counted in final average salary. OPSRP gets none.'),
    ('guides/working-after-retiring-oregon-pers/', 'Oregon PERS', 'Working after retiring from Oregon PERS', 'Most PERS retirees can work unlimited hours for PERS employers through 2034. Early retirees face 1,039 or 600 hour limits.'),
    ('guides/oregon-pers-retiree-health-insurance/', 'Oregon PERS', 'Oregon PERS retiree health insurance', 'PHIP is open to all PERS retirees; Tier One and Tier Two get a $60 RHIA Medicare subsidy or, for state retirees, RHIPA.'),
    ('guides/oregon-savings-growth-plan-457b/', 'Oregon PERS', 'Oregon Savings Growth Plan 457(b)', '2026 OSGP limits, catch-ups for 50+ and ages 60 to 63, the special 457 catch-up, Roth rules and penalty-free withdrawals.'),
    ('guides/oregon-pers-divorce/', 'Oregon PERS', 'Oregon PERS and divorce', 'How PERS splits a pension and IAP in divorce: award forms, alternate payee rights, survivor effects and what to send PERS.'),
    ('guides/washington-drs-explained/', 'Washington DRS', 'Washington DRS explained', 'How Washington DRS pensions work: the systems, Plans 1 to 3, the formula, retirement ages, COLA, survivors, PEBB and how to apply.'),
    ('guides/washington-drs-plan-1-2-3/', 'Washington DRS', 'DRS Plan 1, Plan 2 and Plan 3 compared', 'Plans 1, 2 and 3 side by side: 2% vs 1% formulas, 24 vs 60 month AFC, early retirement cuts, COLA and Plan 3 options A to F.'),
    ('guides/when-can-i-retire-washington-drs/', 'Washington DRS', 'When can I retire from Washington DRS?', 'Earliest and full-pension ages for DRS Plans 1, 2 and 3, PSERS and LEOFF 2, with the early retirement cuts and worked examples.'),
    ('guides/washington-drs-survivor-options/', 'Washington DRS', 'Washington DRS survivor options', 'DRS survivor Options 1 to 4, what each costs, spousal consent, the pop-up, the Plan 1 optional COLA and death before retiring.'),
    ('fers/', 'Federal FERS', 'FERS explained', 'Retirement ages, the annuity formula, the supplement, the TSP, raises and how to apply.'),
    ('guides/fers-retirement-age/', 'Federal FERS', 'When can I retire under FERS?', 'Minimum Retirement Age, MRA+30, 60 with 20, 62 with 5, and MRA+10.'),
    ('guides/fers-military-buyback/', 'Federal FERS', 'FERS military buyback', 'How to buy back post-1956 military service for FERS: the 3% deposit, interest timing, retired pay waivers and a worked example.'),
    ('guides/fers-sick-leave-credit/', 'Federal FERS', 'FERS unused sick leave credit', "How unused sick leave adds to a FERS annuity at 100% since 2014, with OPM's 2,087-hour conversion chart and an example."),
    ('guides/fers-deferred-and-postponed-retirement/', 'Federal FERS', 'Leaving federal service early: deferred or postponed', 'Deferred vs postponed MRA+10 annuities, keeping FEHB, what a refund costs, and part-time proration.'),
    ('guides/fers-cola/', 'Federal FERS', 'FERS cost-of-living raises', 'The FERS "diet COLA" formula, why most retirees wait until 62, who gets raises early, and the 2026 and 2027 increases.'),
    ('guides/fers-supplement-earnings-test/', 'Federal FERS', 'The FERS supplement and the earnings test', "Who gets the FERS supplement, how it's estimated, why it ends at 62, and how the 2026 and 2027 earnings limits work."),
    ('guides/fehb-fegli-in-retirement/', 'Federal FERS', 'Keeping FEHB, PSHB and FEGLI in retirement', 'The five-year rule, premiums, Medicare Part B, FEGLI reductions and FEDVIP.'),
    ('guides/tsp-withdrawal-options/', 'Federal FERS', 'TSP withdrawal options in retirement', 'Installments, partial withdrawals, annuities, the age 55 and 50 rules, Roth, required withdrawals and withholding.'),
    ('guides/fers-special-provisions/', 'Federal FERS', 'FERS special retirement for police, firefighters and ATCs', 'Law enforcement, firefighters, air traffic controllers, CBP and Capitol Police: 50 with 20, mandatory age 57 and the 1.7% formula.'),
    ('guides/fers-survivor-benefit/', 'Federal FERS', 'FERS survivor benefit: full, partial or none?', '50% for a 10% cut or 25% for 5%, spousal consent, insurable interest, FEHB and death benefits.'),
    ('guides/calpers-explained/', 'California CalPERS and CalSTRS', 'CalPERS explained', 'Classic vs PEPRA, CalPERS formulas and age factors, final compensation, the 2% COLA, survivor options and health vesting.'),
    ('guides/calstrs-explained/', 'California CalPERS and CalSTRS', 'CalSTRS explained', 'CalSTRS 2% at 60 vs 2% at 62, age factors, the career factor, the 2% raise, SBMA, options and Social Security for teachers.'),
    ('guides/idaho-persi-explained/', 'Idaho PERSI', 'Idaho PERSI explained', 'Idaho PERSI Base Plan formula, Rule of 90 and 80, early retirement cuts, the PAA COLA, options, Choice Plan and sick leave.'),
    ('guides/social-security-explained/', 'Social Security', 'Social Security explained', 'Who qualifies, how much you get, when to start, and how it fits with your pension.'),
    ('guides/when-to-start-social-security/', 'Social Security', 'When should I start Social Security?', 'What you get at 62, at full retirement age and at 70, and how it affects your spouse.'),
    ('guides/does-a-pension-reduce-social-security/', 'Social Security', 'Does my government pension lower my Social Security?', "The Social Security Fairness Act ended WEP and GPO. Here's what that means."),
    ('guides/social-security-spousal-benefits/', 'Social Security', 'Social Security spousal benefits', "Up to 50% of a spouse's full benefit: early-claim cuts, deemed filing, divorced-spouse rules and what the GPO repeal changed."),
    ('guides/social-security-survivor-benefits/', 'Social Security', 'Social Security survivor benefits', 'Widow(er) benefits from 60 (50 if disabled) at 71.5% to 100%, the 82.5% limit, switching strategies, remarriage and the $255 payment.'),
    ('guides/social-security-earnings-test/', 'Social Security', 'Working while on Social Security', "Earnings limits for 2026 and 2027, $1 for $2 and $1 for $3, the first-year monthly rule, and why pensions don't count."),
    ('guides/are-social-security-benefits-taxed/', 'Social Security', 'Are Social Security benefits taxed?', 'Combined-income thresholds, the 50% and 85% rules, how a pension pushes you over, the $6,000 senior deduction and W-4V.'),
    ('guides/health-insurance-before-medicare/', 'Medicare and health care', 'How do I get health insurance if I retire before 65?', "FEHB, PERS retiree plans, COBRA, a spouse's plan and HealthCare.gov, and the Medicare penalty to avoid."),
    ('guides/when-to-sign-up-for-medicare/', 'Medicare and health care', 'When to sign up for Medicare', 'The 7-month window, the special period for current job coverage, the retiree-coverage and COBRA trap, and late penalties.'),
    ('guides/medicare-irmaa/', 'Medicare and health care', 'Medicare IRMAA explained', '2026 IRMAA brackets for Parts B and D, the two-year lookback, how lump sums trigger it, and lowering it with form SSA-44.'),
    ('guides/single-life-or-survivor-pension/', 'Pension decisions', 'Single-life or survivor pension: how to choose', 'How single-life and joint-and-survivor pension options compare across PERS, DRS, FERS and CalPERS, and what to weigh.'),
    ('guides/pension-lump-sum-or-monthly/', 'Pension decisions', 'Pension lump sum or monthly payments?', 'Which public plans offer lump sums, the trade-offs against a lifetime pension, and the rollover and early-tax rules.'),
    ('guides/state-tax-on-public-pensions/', 'Money, taxes and savings', 'State tax on public pensions', 'How Oregon, Washington, Idaho, Arizona, Nevada and California tax pensions and Social Security, plus the source tax law and the PERS tax remedy.'),
    ('guides/retirement-budget/', 'Money, taxes and savings', 'Building your first-year retirement budget', 'Turn your gross pension into a real monthly budget, with taxes, health premiums, gap years and cost-of-living raises.'),
    ('guides/how-pensions-are-taxed/', 'Money, taxes and savings', 'How public pensions are taxed by the IRS', 'The taxable and tax-free parts of a pension, the Simplified Method, W-4P withholding and the $3,000 public safety exclusion.'),
    ('guides/457b-deferred-compensation/', 'Money, taxes and savings', '457(b) deferred compensation plans explained', '2026 457(b) limits, the catch-ups (including the special 3-year one), Roth catch-up rules and penalty-free access.'),
]
GUIDE_PATHS = {g[0] for g in GUIDES}
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


def meta(text, name):
    m = re.search(r'<meta name="' + name + r'" content="([^"]*)"', text)
    return m.group(1) if m else ""


def title_of(text):
    m = re.search(r"<title>(.*?)</title>", text, re.S)
    return m.group(1).strip() if m else SITE_NAME


def esc(v):
    return v.replace("&", "&amp;").replace('"', "&quot;")


def structured(page, url, text):
    """schema.org data: the site and its owner on the home page, article dates on guides, and FAQ data on any page with a FAQ."""
    if page == "":
        data = {"@context": "https://schema.org", "@graph": [
            {"@type": "WebSite", "@id": SITE_URL + "#site", "name": SITE_NAME, "url": SITE_URL, "publisher": {"@id": SITE_URL + "#org"}},
            {"@type": "Organization", "@id": SITE_URL + "#org", "name": "X Ventures LLC", "brand": SITE_NAME, "url": SITE_URL,
             "logo": SITE_URL + "icon-512.png", "email": "info@publicpensionplanner.com"}]}
    elif page in GUIDE_PATHS:
        h1 = re.search(r"<h1[^>]*>(.*?)</h1>", text, re.S)
        data = {"@context": "https://schema.org", "@type": "Article",
                "headline": re.sub(r"<[^>]+>", "", h1.group(1)).strip() if h1 else title_of(text),
                "description": meta(text, "description"), "mainEntityOfPage": url, "image": SITE_URL + "assets/og-default.png",
                "datePublished": meta(text, "published") or "2026-10-17", "dateModified": meta(text, "updated") or meta(text, "published") or "2026-10-17",
                "author": EDITOR, "reviewedBy": EDITOR,
                "publisher": {"@type": "Organization", "name": "X Ventures LLC", "logo": {"@type": "ImageObject", "url": SITE_URL + "icon-512.png"}}}
    else:
        data = None
    out = '\n<script type="application/ld+json">' + json.dumps(data, separators=(",", ":")) + "</script>" if data else ""
    faq = re.search(r'<section class="faq"[^>]*>(.*?)</section>', text, re.S)
    if faq:   # each <h3> question and the paragraphs after it
        pairs = re.findall(r"<h3[^>]*>(.*?)</h3>(.*?)(?=<h3|$)", faq.group(1), re.S)
        plain = lambda v: re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", v)).strip()
        qa = [{"@type": "Question", "name": plain(q), "acceptedAnswer": {"@type": "Answer", "text": plain(a)}} for q, a in pairs if plain(a)]
        if qa:
            out += '\n<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": qa}, separators=(",", ":")) + "</script>"
    return out


def head(rel, url, page="", text=""):
    title, desc = title_of(text), meta(text, "description")
    kind = "article" if page in GUIDE_PATHS else "website"
    canonical = f'<link rel="canonical" href="{url}">' if url else '<meta name="robots" content="noindex">'
    social = (f"""
<meta property="og:site_name" content="{SITE_NAME}">
<meta property="og:type" content="{kind}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE_URL}assets/og-default.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">""" if url else "")
    adsense = (f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-{ADSENSE_ID}" crossorigin="anonymous"></script>'
               if ADSENSE_ID else "<!-- AdSense loader goes here once ADSENSE_ID is set in tools/build.py -->")
    return f"""<!-- @head -->
{canonical}
<link rel="icon" href="{rel}favicon.ico" sizes="48x48">
<link rel="icon" href="{rel}favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="{rel}apple-touch-icon.png">
<link rel="manifest" href="{rel}site.webmanifest">
<meta name="theme-color" content="#14325c">{social}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Public+Sans:wght@600;700;800&display=swap">
<link rel="stylesheet" href="{rel}assets/site.css">
<script>{EARLY}</script>
{adsense}{structured(page, url, text) if url else ""}
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
                       for h, t, d in links if label == "Calculators" or (h, t, d) != PLANNER)
        sections.append(f'    <section>\n      <h2>{label}</h2>\n      <ul>{rows}\n      </ul>\n    </section>')
    more = "".join(f'<li><a href="{href_of(rel, h)}"><strong>{t}</strong></a></li>' for h, t in [("guides/", "All guides"), ("glossary/", "Glossary"), ("my-plan/", "My plan"), ("how-we-check/", "How we check our numbers"), ("about/", "About this site"), ("contact/", "Contact us")])
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
    # The Calculators and Guides columns repeat the phone menu, so phones hide them (site.css) to keep the footer short.
    cols = "\n".join(f'      <div class="foot-col{"" if title == "About us" else " dup"}">\n        <h2>{title}</h2>\n        <ul>' + "".join(f'\n          <li><a href="{href_of(rel, h)}">{t}</a></li>' for h, t in links) + '\n        </ul>\n      </div>'
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
    if page.startswith("calculators/") and page != "calculators/":
        trail.append(("calculators/", "Calculators"))
    items = "".join(f'<li><a href="{href_of(rel, h)}">{t}</a></li>' for h, t in trail) + f'<li aria-current="page">{name}</li>'
    ld = ",".join(f'{{"@type":"ListItem","position":{i + 1},"name":"{t}","item":"{SITE_URL}{h}"}}' for i, (h, t) in enumerate(trail + [(page, name.replace(chr(34), ""))]))
    return f"""<!-- @crumbs -->
<nav class="crumbs" aria-label="You are here"><ol>{items}</ol></nav>
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{ld}]}}</script>
<!-- /@crumbs -->"""


def related(rel, page):
    """'Keep reading' links on a guide: the other guides in its section, then the planner and the start page."""
    section = next(g[1] for g in GUIDES if g[0] == page)
    same = [g for g in GUIDES if g[1] == section and g[0] != page]
    extra = [g for g in GUIDES if g[0] == "guides/where-to-begin/" and g[0] != page and g not in same]
    rows = "".join(f'\n    <li><a href="{href_of(rel, h)}">{t}</a></li>' for h, _, t, _ in (same + extra)[:4])
    return f"""<!-- @related -->
<section class="related keep">
  <h2>Keep reading</h2>
  <ul class="linklist">{rows}
    <li><a href="{href_of(rel, "guides/")}">See all guides</a></li>
  </ul>
</section>
<!-- /@related -->"""


def guidelist(rel):
    out = ["<!-- @guidelist -->"]
    for sec in SECTIONS:
        items = [g for g in GUIDES if g[1] == sec and g[0] != "guides/where-to-begin/"]
        if not items:
            continue
        anchor = re.sub(r"[^a-z]+", "-", sec.lower()).strip("-")
        out.append(f'<h2 id="{anchor}">{sec}</h2>\n<div class="cards two">')
        for h, _, t, d in items:
            out.append(f'  <a class="card" href="{href_of(rel, h)}"><span class="label">{sec}</span><h3>{t}</h3><p>{d}</p><span class="go">Read the guide</span></a>')
        out.append("</div>")
    out.append("<!-- /@guidelist -->")
    return "\n".join(out)


def replace(text, tag, block):
    pat = re.compile(r"<!-- @" + tag + r" -->.*?<!-- /@" + tag + r" -->", re.S)
    if not pat.search(text):
        raise SystemExit(f"missing <!-- @{tag} --> markers")
    return pat.sub(lambda m: block, text, count=1)


def main():
    pages = sorted(p for p in ROOT.rglob("index.html") if "tools" not in p.parts and ".git" not in p.parts)
    urls = []
    for h, *_ in GUIDES:
        if not (ROOT / h / "index.html").exists():
            raise SystemExit(f"GUIDES lists {h} but there is no {h}index.html")
    for p in pages:
        depth = len(p.relative_to(ROOT).parts) - 1
        rel = "../" * depth
        path = "/".join(p.relative_to(ROOT).parts[:-1])
        url = SITE_URL + (path + "/" if path else "")
        text = p.read_text()
        page = path + "/" if path else ""
        text = replace(text, "head", head(rel, url, page, text))
        text = replace(text, "header", header(rel, page))
        text = replace(text, "footer", footer(rel, page))
        if page:
            if "<!-- @crumbs -->" not in text:
                text = re.sub(r"(<main[^>]*>)", r"\1\n<!-- @crumbs --><!-- /@crumbs -->", text, count=1)
            text = replace(text, "crumbs", crumbs(rel, page, text))
        if page in GUIDE_PATHS and page != "guides/where-to-begin/":
            if "<!-- @related -->" not in text:
                text = text.replace("</article>", "<!-- @related --><!-- /@related -->\n</article>", 1)
            text = replace(text, "related", related(rel, page))
        if page in GUIDE_PATHS or page in REVIEWED_PAGES or (page.startswith("calculators/") and page != "calculators/"):
            # One text span inside the byline, so the checked date and the reviewer wrap together on a narrow phone.
            m = re.search(r'<p class="byline">(.*?)</p>', text, re.S)
            if m:
                inner = re.sub(r'\s*<span class="reviewer">.*?</a></span>', "", m.group(1))
                inner = re.sub(r'^<span class="byline-text">(.*)</span>$', r"\1", inner, flags=re.S)
                text = text[:m.start()] + f'<p class="byline"><span class="byline-text">{inner}{REVIEWED.format(rel=rel)}</span></p>' + text[m.end():]
        if "<!-- @guidelist -->" in text:
            text = replace(text, "guidelist", guidelist(rel))
        p.write_text(text)
        urls.append((url, meta(text, "updated") or meta(text, "published")))
        print("stamped", p.relative_to(ROOT))
    (ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                      + "".join(f"  <url><loc>{u}</loc>" + (f"<lastmod>{d}</lastmod>" if d else "") + "</url>\n" for u, d in urls) + "</urlset>\n")
    # The "page not found" page: GitHub Pages serves it at any address, so its links start at the site root.
    nf = ROOT / "404.html"
    if nf.exists():
        text = nf.read_text()
        text = replace(text, "head", head("/", "", "404", text))
        text = replace(text, "header", header("/", "404"))
        text = replace(text, "footer", footer("/", "404"))
        nf.write_text(text)
        print("stamped 404.html")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}sitemap.xml\n")
    ads = ROOT / "ads.txt"
    if ADSENSE_ID:
        ads.write_text(f"google.com, {ADSENSE_ID}, DIRECT, f08c47fec0942fa0\n")
    elif ads.exists():
        ads.unlink()


if __name__ == "__main__":
    main()
