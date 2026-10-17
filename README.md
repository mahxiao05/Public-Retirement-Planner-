# Public Retirement Planner

Help people plan for retirement.

Static HTML/CSS/JS, no build step. Open any `index.html` in a browser. Served by GitHub Pages from the root of `main`.

- `index.html`: home page with links to both tools, an About section and the disclaimer.

- `oregon-pers/index.html`: Oregon PERS pension and IAP estimator (Tier One, Tier Two, OPSRP). Built for members near retirement: large print with a text-size switch, plain language, one question per screen (6 steps), then a plain-English answer, an age comparison table and next steps. Math and sources fold out at the end.
- `planner/index.html`: Retirement Date Planner. Same look. 8 questions (birth date, PERS group, service, pay, IAP, Social Security, retirement age, Social Security start age), then one income timeline (PERS pension, IAP over 20 years, Social Security, Medicare at 65), a retirement-date comparison and a Social Security start-age comparison. Rules sit in separate `<script>` blocks that register on `window.RetirementRules` (`socialSecurity`, `pensions["or-pers"]`), so FERS and Washington DRS can be added as new pension entries.

## Oregon PERS rules used (verify yearly)
- Full Formula: Tier One/Two 1.67% general, 2.0% P&F; OPSRP 1.5% general, 1.8% P&F (oregon.gov PERS overview pages).
- Early retirement factors: Table 1 of the Actuarial Equivalency Factors effective 1/1/2026 (1yr .918, 2 .843, 3 .775, 4 .713, 5 .657, 6 .605, 7 .558, 8 .515, 9 .476, 10 .440). Partial years are interpolated.
- SB 1049 salary limit: $245,724/yr (as shown on PERS's salary limit page). Indexed to CPI; update each January.
- IAP redirect threshold 2026: $3,890/month. Above it, IAP gets 3.5% (Tier One/Two) or 5.25% (OPSRP) instead of 6%.
- Not modeled yet: Money Match, Formula Plus Annuity, survivor options, COLA, 911 operators, split service.

## Social Security rules used (verify each October, when SSA publishes next year's figures)
- PIA: 90% / 32% / 15% with 2027 bend points $1,340 and $8,077 (ssa.gov/oact/cola/piaformula.html). Rough estimate path assumes the same pay every year in today's dollars, capped at the 2026 taxable maximum $184,500, best 35 years.
- Full retirement age by birth year (67 for 1960+). Early: 5/9 of 1% a month for the first 36 months, 5/12 of 1% after. Delayed: 2/3 of 1% a month to age 70.
- 40 credits (about 10 years) needed. WEP/GPO ended by the Social Security Fairness Act, so PERS doesn't reduce Social Security.
- Not modeled: spouse/survivor benefits, COLAs, taxes, Medicare premiums, earnings test amounts (only a warning).
