// Public Retirement Planner: the "i" buttons. Tapping one opens a short plain-English explanation right below it,
// with links to the official pages the rule comes from. Markup: <button type="button" class="info" data-info="KEY">.
// Explanations live in TOPICS below; keep them in step with the numbers in assets/rules/*.js.
(function () {
  var L = {
    t1t2: ["https://www.oregon.gov/pers/mem/pages/tier-one-tier-two-overview-and-benefit-calculation.aspx", "Oregon PERS: Tier One and Tier Two benefits"],
    opsrp: ["https://www.oregon.gov/pers/mem/pages/opsrp-overview.aspx", "Oregon PERS: OPSRP benefits"],
    compare: ["https://www.oregon.gov/pers/MEM/Pages/Benefit-Component-Comparisons.aspx", "Oregon PERS: Retirement ages and multipliers by plan"],
    aef: ["https://www.oregon.gov/pers/Documents/Financials/AEFs/AEFs-1-1-26.pdf", "Oregon PERS: Actuarial Equivalency Factors, January 1, 2026 (PDF)"],
    earlyOp: ["https://apps.pers.state.or.us/opsrp/Content/opsrp_age_to_retire_with_reduced_benefits.htm", "Oregon PERS: OPSRP early retirement"],
    earlyT: ["https://apps.pers.state.or.us/pers238/Content/pers_age_to_retire_with_reduced_benefits.htm", "Oregon PERS: Tier One and Tier Two early retirement"],
    limit: ["https://www.oregon.gov/pers/mem/pages/sb-1049-changes-salary-limit.aspx", "Oregon PERS: Salary limit (Senate Bill 1049)"],
    redirect: ["https://www.oregon.gov/pers/emp/pages/member-redirect.aspx", "Oregon PERS: Member Redirect"],
    iap: ["https://www.oregon.gov/pers/mem/pages/what-is-the-iap.aspx", "Oregon PERS: What is the IAP?"],
    fersElig: ["https://www.opm.gov/retirement-center/fers-information/eligibility/", "OPM: FERS eligibility and Minimum Retirement Age"],
    fersComp: ["https://www.opm.gov/retirement-center/fers-information/computation/", "OPM: How the FERS annuity is computed"],
    fersTypes: ["https://www.opm.gov/retirement-center/fers-information/types-of-retirement/", "OPM: Types of FERS retirement"],
    fersLaw: ["https://www.law.cornell.edu/uscode/text/5/8415", "5 U.S.C. 8415: FERS annuity computation"],
    fersSupp: ["https://www.law.cornell.edu/uscode/text/5/8421", "5 U.S.C. 8421: FERS annuity supplement"],
    tspContrib: ["https://www.tsp.gov/what-is-contribution/", "TSP: Agency automatic and matching contributions"],
    tspWd: ["https://www.tsp.gov/withdrawals-in-retirement/", "TSP: Withdrawals in retirement"],
    pia: ["https://www.ssa.gov/oact/cola/piaformula.html", "Social Security: Benefit formula"],
    cbb: ["https://www.ssa.gov/oact/cola/cbb.html", "Social Security: Maximum taxable earnings"],
    fra: ["https://www.ssa.gov/benefits/retirement/planner/agereduction.html", "Social Security: Full retirement age by birth year"],
    early: ["https://www.ssa.gov/oact/quickcalc/earlyretire.html", "Social Security: Starting early"],
    delay: ["https://www.ssa.gov/benefits/retirement/planner/delayret.html", "Social Security: Waiting past full retirement age"],
    credits: ["https://www.ssa.gov/benefits/retirement/planner/credits.html", "Social Security: Work credits"],
    working: ["https://www.ssa.gov/oact/cola/rtea.html", "Social Security: Earnings limits while you work"],
    fairness: ["https://www.ssa.gov/benefits/retirement/social-security-fairness-act.html", "Social Security: Social Security Fairness Act"],
    drsPlans: ["https://www.drs.wa.gov/plan/", "Washington DRS: Plans and systems"],
    drsP1: ["https://www.drs.wa.gov/plan/pers1/", "Washington DRS: PERS Plan 1"],
    drsP2: ["https://www.drs.wa.gov/plan/pers2/", "Washington DRS: PERS Plan 2"],
    drsP3: ["https://www.drs.wa.gov/plan/pers3/", "Washington DRS: PERS Plan 3"],
    drsSurv: ["https://app.leg.wa.gov/WAC/default.aspx?cite=415-02-380", "WAC 415-02-380: DRS survivor options"],
    drsDcp: ["https://www.drs.wa.gov/plan/dcp/", "Washington DRS: Deferred Compensation Program (DCP)"],
    drsErf: ["https://www.drs.wa.gov/sitemap/adminfactors/af-erf-pers-trs-and-sers-2-3/", "Washington DRS: Early retirement factors"],
    myacct: ["https://www.ssa.gov/myaccount/", "Social Security: my Social Security account (your statement)"],
    spouse: ["https://www.ssa.gov/oact/quickcalc/spouse.html", "Social Security: Benefits for a spouse"],
    survivor: ["https://www.ssa.gov/OP_Home/handbook/handbook.04/handbook-0407.html", "Social Security Handbook: Widow(er)'s benefit amount"],
    medicare: ["https://www.medicare.gov/basics/get-started-with-medicare/sign-up/when-does-medicare-coverage-start", "Medicare.gov: When to sign up"]
  };

  // t: title, b: explanation (HTML allowed), l: official links (keys of L)
  var TOPICS = {
    // ---------- Oregon PERS ----------
    "pers-tier": { t: "Tier One, Tier Two and OPSRP", l: ["t1t2", "opsrp"],
      b: "<p>PERS puts you in a plan based on when you first started in a PERS job:</p><ul><li><strong>Tier One:</strong> before January 1, 1996.</li><li><strong>Tier Two:</strong> January 1, 1996 to August 28, 2003.</li><li><strong>OPSRP:</strong> August 29, 2003 or later.</li></ul><p>Each plan has its own retirement ages and its own percentage for figuring your pension. Your PERS member statement shows your plan.</p>" },
    "pers-pf": { t: "Police and fire", l: ["compare"],
      b: "<p>Police officers and firefighters can retire earlier and get a higher percentage for each year of service: 2.0% instead of 1.67% in Tier One and Tier Two, and 1.8% instead of 1.5% in OPSRP.</p><p>Only positions PERS classifies as police and fire count. If you're not sure, ask your employer.</p>" },
    "pers-svc": { t: "Years of service", l: ["t1t2", "opsrp"],
      b: "<p>PERS gives you a year of service for each year you work at least 600 hours in a PERS-covered job. Your member statement or Online Member Services account shows your total.</p><p>We add the time between today and the age you pick, assuming you keep working full time.</p>" },
    "pers-pay": { t: "Your three best-paid years", l: ["t1t2", "opsrp", "limit"],
      b: "<p>PERS uses your <strong>final average salary</strong>: the average of your three highest-paid calendar years, or your last 36 months of pay if that's higher.</p><p>Pay above the yearly limit set by Senate Bill 1049 ($245,724 as PERS currently publishes it) doesn't count, so we cap it there.</p>" },
    "pers-formula": { t: "How we figure your PERS pension", l: ["t1t2", "opsrp", "compare"],
      b: "<p>PERS's <strong>Full Formula</strong> is:</p><p class=\"formula\">percentage × years of service × final average salary</p><p>The percentage is 1.67% for Tier One and Tier Two (2.0% for police and fire) and 1.5% for OPSRP (1.8% for police and fire). If you retire before your full-benefit age, PERS then applies an early-retirement cut.</p><p>Your own numbers are under <strong>How we worked this out</strong> further down.</p>" },
    "pers-early": { t: "Why retiring early cuts your pension", l: ["aef", "earlyT", "earlyOp"],
      b: "<p>If you start before your full-benefit age, PERS pays you a smaller amount for life, because it expects to pay you for more years. The cut comes from PERS's own table of early-retirement factors (Table 1):</p><ul><li>1 year early: about 8% less</li><li>3 years early: about 22% less</li><li>5 years early: about 34% less</li></ul><p>For part of a year, we estimate between the yearly factors. Full-benefit ages:</p><ul><li>Tier One: 58, or any age with 30 years.</li><li>Tier Two: 60, or any age with 30 years.</li><li>OPSRP: 65, or 58 with 30 years.</li><li>Police and fire retire earlier.</li></ul>" },
    "iap": { t: "Your IAP account", l: ["iap", "redirect"],
      b: "<p>The <strong>Individual Account Program (IAP)</strong> is a savings account that's separate from your pension. Since 2004, 6% of your pay has gone into it, and PERS invests it.</p><p>Since 2020, if you earn more than $3,890 a month (the 2026 amount), part of that 6% goes to a pension stability account instead. That's 2.5% of pay for Tier One and Tier Two and 0.75% for OPSRP. We count only what still goes into your IAP.</p><p>At retirement you can take the IAP as a lump sum or in installments. To show it as monthly income, we spread it evenly over 20 years.</p>" },
    "growth": { t: "Why we have to guess growth", l: ["iap", "tspWd"],
      b: "<p>Nobody knows what investments will earn, so you pick a yearly growth rate and we apply it every year until you retire, and while the account pays out.</p><p>5% is a middle-of-the-road guess. Real returns go up and down, and some years lose money (2008 did). Try a lower number to see a cautious plan.</p>" },
    "money-match": { t: "Money Match", l: ["t1t2", "aef"],
      b: "<p>Tier One and Tier Two members get whichever of two methods pays more. The Full Formula is based on your pay and years of service. <strong>Money Match</strong> is based on your PERS member account:</p><p class=\"formula\">member account × 2 × PERS's factor for your age ÷ 1,000</p><p>The account is doubled because your employer matches it. The age factor comes from PERS's Table 3a. Tier One accounts are credited PERS's assumed rate of 6.9% a year; Tier Two accounts earn actual returns, so we use your growth rate.</p><p>Your member account is on your yearly PERS member statement. It's separate from your IAP.</p>" },
    "pers-options": { t: "Pension payment options", l: ["t1t2", "opsrp", "aef"],
      b: "<p>When you retire, PERS asks how to pay your pension:</p><ul><li><strong>Pays only you</strong> (Option 1, or Single Life for OPSRP): the largest payment, which stops when you die.</li><li><strong>Option 2:</strong> a lower payment, and your spouse keeps getting 100% of it for life.</li><li><strong>Option 3:</strong> a slightly lower payment, and your spouse keeps getting 50% of it for life.</li></ul><p>PERS sets the Option 2 and 3 cuts from both your ages (its Tables 6a and 7a). We haven't been able to verify those 2026 factors yet, so we show the pays-only-you amount. Ask PERS for an estimate that shows each option.</p>" },

    // ---------- FERS and TSP ----------
    "fers-special": { t: "FERS special provisions", l: ["fersTypes", "fersComp"],
      b: "<p>Law enforcement officers, firefighters and air traffic controllers in covered positions can retire at 50 with 20 years, or at any age with 25 years.</p><p>They get 1.7% of their high-3 for each of their first 20 years and 1% for each year after. Choose this only if all your service is in a covered position.</p>" },
    "fers-svc": { t: "Federal service and sick leave", l: ["fersComp", "fersLaw"],
      b: "<p>Count your years of creditable federal civilian service. Your SF-50 or your agency's benefits office can confirm it.</p><p><strong>Unused sick leave</strong> is added to your service when OPM figures your annuity. Each 2,087 hours is one year, and only whole months count. It doesn't help you <em>qualify</em> to retire sooner.</p>" },
    "high3": { t: "High-3 average salary", l: ["fersComp"],
      b: "<p>Your <strong>high-3</strong> is your highest average basic pay over any three years in a row, usually your last three. Basic pay includes locality pay. It doesn't include overtime, bonuses or awards.</p>" },
    "fers-formula": { t: "How we figure your FERS annuity", l: ["fersComp", "fersElig"],
      b: "<p class=\"formula\">high-3 × years of service × 1%</p><p>The 1% becomes 1.1% if you retire at 62 or older with at least 20 years. Special provisions use 1.7% for the first 20 years.</p><p>If you retire at your Minimum Retirement Age with 10 to 29 years, the annuity is cut 5% for each year you're under 62. A survivor annuity lowers it a bit more.</p><p>Your own numbers are under <strong>How we worked this out</strong> further down.</p>" },
    "fers-mra": { t: "When FERS lets you retire", l: ["fersElig", "fersTypes"],
      b: "<p>You can get a <strong>full</strong> FERS annuity at:</p><ul><li>62 with 5 years</li><li>60 with 20 years</li><li>your Minimum Retirement Age (MRA) with 30 years</li></ul><p>Your MRA is between 55 and 57, depending on the year you were born; it's 57 for anyone born in 1970 or later. You can also retire at your MRA with 10 years, but then your annuity is cut 5% for each year you're under 62.</p>" },
    "supplement": { t: "The FERS supplement", l: ["fersSupp", "fersTypes"],
      b: "<p>If you retire before 62 with a full annuity (not the reduced MRA+10 kind), FERS adds a <strong>supplement</strong> until you turn 62. It stands in for the Social Security you earned in federal service.</p><p class=\"formula\">Social Security at 62 × your FERS years ÷ 40</p><p>It stops at 62 even if you wait longer to start Social Security. If you work after retiring, earnings above Social Security's limit reduce it.</p>" },
    "tsp": { t: "Your TSP", l: ["tspContrib", "tspWd"],
      b: "<p>Your agency puts in 1% of your pay automatically. It also matches what you put in: dollar for dollar on the first 3% and 50 cents on the dollar for the next 2%. So putting in 5% gets you the full 5% from your agency.</p><p>At retirement you can take money out in several ways. To show the TSP as monthly income, we spread it evenly over 20 years.</p>" },
    "fers-survivor": { t: "FERS survivor annuity", l: ["fersComp"],
      b: "<ul><li><strong>Full survivor annuity:</strong> your annuity is cut 10%, and your spouse gets 50% of your unreduced annuity for life after you die.</li><li><strong>Partial:</strong> your annuity is cut 5%, and your spouse gets 25%.</li><li><strong>None:</strong> you get the full amount, and nothing continues to your spouse. Your spouse must agree in writing.</li></ul>" },

    // ---------- Social Security ----------
    "ss-know": { t: "The best source for Social Security", l: ["myacct", "pia"],
      b: "<p>Your Social Security statement is more accurate than any estimate because it uses your real earnings record. You can get it free at ssa.gov/myaccount.</p><p>If you don't have it, we estimate from your usual pay using Social Security's formula. That's a rough number.</p>" },
    "ss-estimate": { t: "How we estimate Social Security", l: ["pia", "cbb", "credits"],
      b: "<p>Social Security averages your 35 best years of pay; years you didn't work count as zero. We use your usual pay, capped at the maximum Social Security taxes ($184,500 in 2026).</p><p>Then we apply the official formula to that monthly average: 90% of the first $1,340, plus 32% of the amount up to $8,077, plus 15% of anything above (2027 figures).</p><p>You need 40 work credits, about 10 years of work, to qualify. The real formula adjusts each year's pay for wage growth, so your statement will differ.</p>" },
    "ss-public": { t: "Public jobs and Social Security", l: ["fairness", "credits"],
      b: "<p>Some public employers don't take out Social Security tax. You can still get Social Security from other jobs where you paid it.</p><p>The <strong>Social Security Fairness Act</strong> (January 2025) ended the two rules that used to cut benefits for people with a public pension (WEP and GPO). Your pension no longer reduces your Social Security.</p>" },
    "ss-claim": { t: "When to start Social Security", l: ["fra", "early", "delay"],
      b: "<p>You can start anywhere from 62 to 70. The amount is set by your <strong>full retirement age</strong>, which is 67 for anyone born in 1960 or later and a bit younger for earlier birth years.</p><ul><li><strong>Earlier:</strong> a smaller payment for life, about 30% less at 62 if your full age is 67.</li><li><strong>Later:</strong> 8% more for each year you wait past full retirement age, up to 70.</li></ul><p>You can start Social Security at a different time than your pension.</p>" },
    "earnings-test": { t: "Working while on Social Security", l: ["working"],
      b: "<p>Before your full retirement age, Social Security holds back $1 for every $2 you earn over $25,560 a year (2027). In the year you reach full retirement age, the limit rises and it's $1 for every $3.</p><p>The money isn't lost. Your payment is raised at full retirement age to make up for it. Pension payments don't count as earnings.</p>" },
    "spouse": { t: "Your spouse's Social Security", l: ["spouse", "survivor"],
      b: "<p>A spouse can get up to <strong>half</strong> of your full-retirement-age amount if that's more than their own benefit. Social Security pays their own benefit first and tops it up. The top-up is smaller if they start early, and they can't get it until you've started yours.</p><p>We assume your spouse starts at their full retirement age.</p>" },
    "survivor-ss": { t: "If you die first", l: ["survivor", "spouse"],
      b: "<p>Your pension or annuity and your Social Security stop. What continues:</p><ul><li><strong>Social Security:</strong> your spouse keeps the larger of their own benefit and yours, if they're at full retirement age. It's less if they claim earlier.</li><li><strong>Your pension:</strong> only if you chose a survivor option.</li><li><strong>Savings:</strong> what's left in your IAP or TSP goes to your beneficiary.</li></ul>" },
    "medicare": { t: "Medicare at 65", l: ["medicare"],
      b: "<p>Medicare can start at 65, even if you haven't started Social Security. Your first chance to sign up lasts seven months: the three months before your birthday month, that month, and the three after.</p><p>Signing up late can mean a penalty that lasts for life, unless you have job-based coverage from current work.</p>" },

    // ---------- results ----------
    "timeline": { t: "How to read the timeline", l: [],
      b: "<p>Each stop is a month when an income starts or stops. The amount is your total monthly income from that point on, before taxes.</p><p>All amounts are in today's dollars. We don't add raises or cost-of-living increases, so real checks will likely be larger, and so will prices.</p>" },
    "compare-dates": { t: "How we compare retirement dates", l: [],
      b: "<p>For each age we run your same answers again. The only changes are more years of service and a smaller early-retirement cut. Your Social Security start age stays as you picked it.</p><p>The <strong>% cut</strong> tag shows how much an early start lowers your pension for life. Tap <strong>Show</strong> to make that age your plan.</p>" },
    "drs-plan": { t: "Which DRS plan am I in?", l: ["drsPlans", "drsErf"],
      b: "<p>Your DRS online account and yearly statement name your system (PERS, TRS or SERS) and plan.</p><ul><li><strong>Plan 1:</strong> 2% of your average pay in your best 24 months in a row, for each year of service, up to 60%.</li><li><strong>Plan 2:</strong> 2% of your average pay in your best 60 months in a row, for each year.</li><li><strong>Plan 3:</strong> 1% for each year, plus your own investment account.</li></ul><p>Plans 2 and 3 pay a full pension at 65. You can start from 55 with a cut that depends on your years of service and on whether you started before May 1, 2013.</p>" },
    "drs-svc": { t: "DRS service credit", l: ["drsP2", "drsP3"],
      b: "<p>Service credit is the time DRS counts toward your pension. Most full-time jobs earn one year of service for each year worked. Part-time work can earn less.</p><p>Your DRS online account and yearly statement show your total. Plan 2 and Plan 3 also use it to decide how big an early-retirement cut is: 30 years or more gets a much smaller cut.</p>" },
    "drs-afc": { t: "Average final compensation", l: ["drsP1", "drsP2"],
      b: "<p>DRS bases your pension on your <strong>average final compensation</strong>: your average pay in your highest-paid years in a row.</p><ul><li><strong>Plan 1:</strong> your best 24 months in a row.</li><li><strong>Plans 2 and 3:</strong> your best 60 months in a row.</li></ul><p>The pension is 2% of that average for each year of service in Plans 1 and 2 (Plan 1 caps at 60%), or 1% in Plan 3.</p>" },
    "drs-early": { t: "Retiring early from DRS", l: ["drsErf", "drsP2"],
      b: "<p>Plans 2 and 3 pay a full pension at 65. You can start as early as 55 (Plan 2 needs 20 years, Plan 3 needs 10), but the pension is cut for life.</p><ul><li><strong>Fewer than 30 years:</strong> DRS uses its actuarial early retirement factors, a cut of about 9% for one year early and about 60% for ten years early.</li><li><strong>30 years, started before May 1, 2013:</strong> 20% off at 55, shrinking about 3 points a year, with no cut from 62.</li><li><strong>30 years, started May 1, 2013 or later:</strong> 5% for each year before 65.</li></ul><p>Plan 1 has no early cut. It pays a full pension at any age with 30 years, at 55 with 25, or at 60 with 5.</p>" },
    "drs-options": { t: "DRS survivor options", l: ["drsSurv", "drsP2"],
      b: "<p>When you retire, DRS asks you to pick one of four options:</p><ul><li><strong>Option 1:</strong> the most for you. It stops when you die.</li><li><strong>Option 2:</strong> your survivor gets 100% of your payment for life.</li><li><strong>Option 4:</strong> your survivor gets two-thirds.</li><li><strong>Option 3:</strong> your survivor gets half.</li></ul><p>Options 2, 3 and 4 lower your payment by a factor that depends on both your ages. If you're married and choose Option 1, your spouse must sign a notarized consent.</p>" },
    "drs-acct": { t: "Plan 3 and DCP accounts", l: ["drsP3", "drsDcp"],
      b: "<p><strong>Plan 3</strong> splits your benefit in two: a pension of 1% a year that your employer pays for, and an investment account that you fill with 5% to 15% of each paycheck.</p><p>Members of any plan can also save in the <strong>Deferred Compensation Program (DCP)</strong>, a voluntary 457(b) plan. We show either account paid out evenly over 20 years so you can see it as monthly income.</p>" },
    "compare-ss": { t: "How we compare Social Security ages", l: ["early", "delay"],
      b: "<p>Each row is the same Social Security benefit, started at a different age. The percentage shows how much more or less you'd get each month, for life, than at your full retirement age.</p><p>A later start pays more each month but for fewer years. Many people decide based on their health and on what their spouse would get as a survivor.</p>" }
  };

  var counter = 0;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // Where the explanation goes: inside a list item, otherwise right after the form field or line holding the button.
  function anchorFor(btn) { return btn.closest(".field, li, label, p, h1, h2, h3, legend, .status, th") || btn.parentNode; }

  function build(key) {
    var tp = TOPICS[key];
    var box = document.createElement("div");
    box.className = "infobox";
    box.id = "info-" + key + "-" + (++counter);
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", tp.t);
    var links = tp.l.length ? '<p class="info-src"><strong>From the official source:</strong></p><ul class="info-links">' +
      tp.l.map(function (k) { return '<li><a href="' + L[k][0] + '" target="_blank" rel="noopener">' + esc(L[k][1]) + '<span class="sr"> (opens in a new tab)</span></a></li>'; }).join("") + "</ul>" : "";
    box.innerHTML = '<p class="info-title">' + esc(tp.t) + "</p>" + tp.b + links + '<button type="button" class="btn secondary info-close">Close</button>';
    return box;
  }

  function close(btn, box, refocus) {
    if (box && box.parentNode) box.parentNode.removeChild(box);
    btn.setAttribute("aria-expanded", "false");
    btn.removeAttribute("aria-controls");
    if (refocus) btn.focus();
  }

  function open(btn) {
    var key = btn.getAttribute("data-info");
    if (!TOPICS[key]) return;
    var box = build(key), a = anchorFor(btn);
    if (a.tagName === "LI" || a.tagName === "TH") a.appendChild(box); else a.parentNode.insertBefore(box, a.nextSibling);
    btn.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-controls", box.id);
    box.querySelector(".info-close").addEventListener("click", function () { close(btn, box, true); });
  }

  // Fill in labels for buttons written in the page, so each one says what it explains.
  function label() {
    document.querySelectorAll("button.info:not([aria-label])").forEach(function (b) {
      var tp = TOPICS[b.getAttribute("data-info")];
      b.setAttribute("aria-label", "Explain: " + (tp ? tp.t : "more information"));
      b.setAttribute("aria-expanded", "false");
      if (!b.textContent.trim()) b.innerHTML = '<span aria-hidden="true">i</span>';
    });
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("button.info");
    if (!btn) return;
    e.preventDefault();
    var id = btn.getAttribute("aria-controls"), box = id && document.getElementById(id);
    if (btn.getAttribute("aria-expanded") === "true" && box) close(btn, box, false); else open(btn);
  });
  // Escape closes the box from inside it or from its "i" button.
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !e.target.closest) return;
    var box = e.target.closest(".infobox"), btn;
    if (box) btn = document.querySelector('button.info[aria-controls="' + box.id + '"]');
    else if ((btn = e.target.closest('button.info[aria-expanded="true"]'))) box = document.getElementById(btn.getAttribute("aria-controls"));
    if (btn && box) close(btn, box, true);
  });

  // Remove boxes whose button was redrawn away (results pages rebuild their buttons).
  function tidy() {
    document.querySelectorAll(".infobox").forEach(function (box) {
      if (!document.querySelector('button.info[aria-controls="' + box.id + '"]')) box.parentNode.removeChild(box);
    });
  }

  // HTML for a button, for pages that draw results with JavaScript.
  window.SiteInfo = {
    TOPICS: TOPICS,
    button: function (key) {
      var tp = TOPICS[key];
      return '<button type="button" class="info" data-info="' + key + '" aria-expanded="false" aria-label="Explain: ' + esc(tp ? tp.t : "more information") + '"><span aria-hidden="true">i</span></button>';
    },
    tidy: tidy
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { label(); }); else label();
})();
