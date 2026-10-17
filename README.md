# Public Retirement Planner

Help people plan for retirement. Free, plain-language tools for public employees near retirement, built around official rules with cited sources.

Static HTML/CSS/JS. Served by GitHub Pages from the root of `main`. No build step is needed to view a page, but after adding a page or changing the menu, footer or AdSense ID, run:

```
python3 tools/build.py
```

It stamps the shared `<head>`, menu bar and footer into every `index.html` (between the `<!-- @head -->`, `<!-- @header -->` and `<!-- @footer -->` markers) and writes `sitemap.xml`, `robots.txt` and, once `ADSENSE_ID` is set, `ads.txt`.

## Pages
- `index.html`: home.
- `planner/`: Retirement Date Planner (`planner.js`). Oregon PERS or FERS, Social Security, optional spouse, income timeline, retirement-date and Social Security start-age comparisons, "If you die first", and a print view. `?system=fers` preselects FERS.
- `oregon-pers/`: Oregon PERS Pension Estimator, including Money Match for Tier One and Tier Two.
- `fers/`: FERS and TSP rules explained, with a link into the planner.
- `guides/`: plain-English articles.
- `about/`, `contact/`, `privacy/`, `terms/`: pages AdSense reviewers look for.

## Shared code
- `assets/site.css`: all shared styles. Reader settings are attributes on `<html>`: `data-theme` (light, dark, or none for the device setting), `data-size` (1 to 3) and `data-font` (clear, book, wide).
- `assets/site.js`: menu, Text & colors panel, print button.
- `assets/info.js`: the "i" buttons. Put `<button type="button" class="info" data-info="KEY"></button>` next to a term; tapping it opens the explanation for `KEY` from `TOPICS`, with official links, below that line. Scripts that draw results use `SiteInfo.button(KEY)`. Keep the explanations in step with `assets/rules/`.
- `assets/rules/*.js`: the official rules, one file per system. Each registers on `window.RetirementRules`. To add Washington DRS, add `assets/rules/wa-drs.js`, its question screens in `planner/index.html`, and an adapter in `SYSTEMS` in `planner/planner.js`.

## Before going live with ads
- `ADSENSE_ID` is set (pub-7867146450299069), so every page loads the AdSense script and `ads.txt` is written.
- Put a real address in `contact/index.html` (it says `CONTACT_EMAIL`).
- The site is served at https://publicpensionplanner.com (the `CNAME` file; DNS at Porkbun points to GitHub Pages). `SITE_URL` in `tools/build.py` matches.

## Oregon PERS rules used (verify each January)
- Full Formula: Tier One/Two 1.67% general, 2.0% P&F; OPSRP 1.5% general, 1.8% P&F.
- Early retirement factors: AEFs effective 1/1/2026, Table 1 (1yr .918, 2 .843, 3 .775, 4 .713, 5 .657, 6 .605, 7 .558, 8 .515, 9 .476, 10 .440). Partial years interpolated.
- Money Match: member account × 2 × AEF Table 3a factor per $1,000 (Option 1). Tier One accounts credited the 6.9% assumed rate; Tier Two uses the user's growth assumption. Months between whole ages interpolated.
- SB 1049 salary limit $245,724/yr. IAP redirect threshold 2026: $3,890/month.
- Not modeled: Option 2/3 survivor factors (AEF Tables 6a/7a, not yet verified, so the planner explains instead of computing), Formula Plus Annuity, 2003 look-back, COLA, 911 operators, split service.

## FERS and TSP rules used
- MRA by birth year (55 to 57). Unreduced at MRA+30, 60+20, 62+5. MRA+10 reduced 5/12 of 1% per full month under 62. Special provisions: 50+20 or any age+25, 1.7% for 20 years then 1%.
- Multiplier 1%, or 1.1% at 62+ with 20+ years. Unused sick leave added to service for computation (2,087-hour year). Whole months only.
- Supplement: SS estimate at 62 × FERS years (rounded, max 40) ÷ 40, until 62; not for MRA+10.
- Survivor: full costs 10%, pays 50%; partial costs 5%, pays 25%.
- TSP agency: 1% automatic plus match up to 4% (100% of first 3%, 50% of next 2%).

## Social Security rules used (verify each October)
- PIA 90/32/15% with 2027 bend points $1,340 and $8,077. Estimate path: same pay every year in today's dollars, capped at $184,500 (2026), best 35 years.
- Full retirement age by birth year. Early: 5/9 of 1% a month for 36 months, then 5/12 of 1%. Delayed: 2/3 of 1% a month to 70.
- Spouse: up to 50% of the worker's PIA at the spouse's FRA (planner assumes the spouse claims at FRA). Survivor: larger of own benefit and the worker's benefit.
- 2027 earnings test: $25,560. WEP/GPO ended by the Social Security Fairness Act.
