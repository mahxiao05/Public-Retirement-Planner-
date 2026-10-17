// Retirement Date Planner. The rules live in ../assets/rules/*.js; this file asks the questions and draws the plan.
// Each retirement system is an adapter in SYSTEMS below, so a new system (Washington DRS next) means a new rules file,
// its question screens, and one more adapter.
(function () {
  var RULES = window.RetirementRules;
  var SS = RULES.socialSecurity, PERS = RULES.pensions["or-pers"], FERS = RULES.pensions.fers;
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var MEDICARE = 65 * 12;

  // ---------- formatting ----------
  var $ = function (id) { return document.getElementById(id); };
  var usd = function (v) { return Math.round(v).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); };
  var usd2 = function (v) { return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var num = function (v, d) { return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var pctTxt = function (v) { return Math.round(v * 100) + "%"; };
  var ageTxt = function (m) { var y = Math.floor(m / 12), mm = m % 12; return y + (mm ? " and " + mm + (mm === 1 ? " month" : " months") : ""); };
  var durTxt = function (m) { var y = Math.floor(m / 12), mm = m % 12, out = []; if (y) out.push(y + (y === 1 ? " year" : " years")); if (mm) out.push(mm + (mm === 1 ? " month" : " months")); return out.join(" and ") || "0 months"; };
  var yrsTxt = function (y) { return num(y, y % 1 ? 1 : 0) + (y === 1 ? " year" : " years"); };
  function val(id) { var v = parseFloat($(id).value); return isFinite(v) ? v : 0; }
  function radio(name) { var r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : null; }
  function li(t, calc, src) { return "<li><strong>" + t + "</strong><span class=\"calc\">" + calc + "</span>" + (src ? '<span class="src">Source: ' + src + "</span>" : "") + "</li>"; }
  function srcLink(id, text) { return '<a href="#src-' + id + '">' + text + "</a>"; }

  // ---------- sources ----------
  var SOURCES = {
    "t1t2": ["https://www.oregon.gov/pers/mem/pages/tier-one-tier-two-overview-and-benefit-calculation.aspx", "Oregon PERS: Tier One/Tier Two benefit calculation"],
    "opsrp": ["https://www.oregon.gov/pers/mem/pages/opsrp-overview.aspx", "Oregon PERS: OPSRP benefit calculation"],
    "compare": ["https://www.oregon.gov/pers/MEM/Pages/Benefit-Component-Comparisons.aspx", "Oregon PERS: Benefit component comparisons (retirement ages and multipliers)"],
    "mm": ["https://www.oregon.gov/pers/mem/pages/tier-one-tier-two-overview-and-benefit-calculation.aspx", "Oregon PERS: Money Match (account balance × 2 × age factor)"],
    "aef": ["https://www.oregon.gov/pers/Documents/Financials/AEFs/AEFs-1-1-26.pdf", "Oregon PERS: Actuarial Equivalency Factors, effective January 1, 2026"],
    "limit": ["https://www.oregon.gov/pers/mem/pages/sb-1049-changes-salary-limit.aspx", "Oregon PERS: Senate Bill 1049 salary limit"],
    "redirect": ["https://www.oregon.gov/pers/emp/pages/member-redirect.aspx", "Oregon PERS: Member Redirect (2026 IAP threshold)"],
    "iap": ["https://www.oregon.gov/pers/mem/pages/what-is-the-iap.aspx", "Oregon PERS: What is the IAP? (payout choices)"],
    "fers-elig": ["https://www.opm.gov/retirement-center/fers-information/eligibility/", "OPM: FERS eligibility and Minimum Retirement Age"],
    "fers-comp": ["https://www.opm.gov/retirement-center/fers-information/computation/", "OPM: FERS annuity computation (multipliers, reductions, survivor annuity)"],
    "fers-types": ["https://www.opm.gov/retirement-center/fers-information/types-of-retirement/", "OPM: Types of FERS retirement"],
    "fers-law": ["https://www.law.cornell.edu/uscode/text/5/8415", "5 U.S.C. 8415: FERS annuity computation, including unused sick leave"],
    "fers-supp": ["https://www.law.cornell.edu/uscode/text/5/8421", "5 U.S.C. 8421: FERS annuity supplement"],
    "tsp-contrib": ["https://www.tsp.gov/what-is-contribution/", "TSP: Agency automatic and matching contributions"],
    "tsp-wd": ["https://www.tsp.gov/withdrawals-in-retirement/", "TSP: Withdrawals in retirement"],
    "pia": ["https://www.ssa.gov/oact/cola/piaformula.html", "Social Security: Primary Insurance Amount formula (2027 bend points)"],
    "cbb": ["https://www.ssa.gov/oact/cola/cbb.html", "Social Security: Maximum taxable earnings by year"],
    "fra": ["https://www.ssa.gov/benefits/retirement/planner/agereduction.html", "Social Security: Full retirement age by birth year"],
    "early": ["https://www.ssa.gov/oact/quickcalc/earlyretire.html", "Social Security: Early retirement reduction"],
    "delay": ["https://www.ssa.gov/benefits/retirement/planner/delayret.html", "Social Security: Delayed retirement credits"],
    "credits": ["https://www.ssa.gov/benefits/retirement/planner/credits.html", "Social Security: Credits (40 needed)"],
    "working": ["https://www.ssa.gov/oact/cola/rtea.html", "Social Security: Earnings limits while receiving benefits"],
    "fairness": ["https://www.ssa.gov/benefits/retirement/social-security-fairness-act.html", "Social Security: Social Security Fairness Act (WEP and GPO ended)"],
    "spouse": ["https://www.ssa.gov/oact/quickcalc/spouse.html", "Social Security: Benefits for a spouse"],
    "survivor": ["https://www.ssa.gov/OP_Home/handbook/handbook.04/handbook-0407.html", "Social Security Handbook 407: Widow(er)'s benefit amount"],
    "medicare": ["https://www.medicare.gov/basics/get-started-with-medicare/sign-up/when-does-medicare-coverage-start", "Medicare.gov: When Medicare coverage starts"]
  };

  // ---------- inputs ----------
  var today = new Date();
  var claimChoice = null;
  function inputs() {
    var by = Math.round(val("birth-y")), bm = +$("birth-m").value;
    var nowMonths = (today.getFullYear() - by) * 12 + (today.getMonth() + 1 - bm);
    var spBy = Math.round(val("sp-y")), spBm = +$("sp-m").value;
    return {
      by: by, bm: bm, nowMonths: nowMonths, system: radio("system"),
      plan: radio("plan"), cls: radio("cls"), svcNow: Math.max(0, val("svc")),
      salaries: [val("sal1"), val("sal2"), val("sal3")].map(function (s) { return Math.max(0, s); }),
      iapBal: Math.max(0, val("iap-bal")), iapSal: Math.max(0, val("iap-sal")), iapRet: val("iap-ret") / 100,
      acctBal: Math.max(0, val("acct-bal")),
      special: radio("fjob") === "spec", fSvcNow: Math.max(0, val("fsvc")), sickHours: Math.max(0, val("sick")), high3: Math.max(0, val("high3")),
      tspBal: Math.max(0, val("tsp-bal")), tspPay: Math.max(0, val("tsp-pay")), tspPct: Math.max(0, val("tsp-pct")), tspRet: val("tsp-ret") / 100,
      ssMode: radio("ssmode"), ssStmt: Math.max(0, val("ss-stmt")), ssPay: Math.max(0, val("ss-pay")), ssYrs: Math.max(0, val("ss-yrs")), ssCont: radio("sscont") === "yes",
      married: radio("married") === "yes", spBy: spBy, spBm: spBm, spSS: Math.max(0, val("sp-ss")),
      // how many months older you are than your spouse (negative if younger)
      spOffset: (spBy - by) * 12 + (spBm - bm),
      survivor: radio("surv"),
      retMonths: Math.max(0, Math.round(val("ret-y"))) * 12 + Math.min(11, Math.max(0, Math.round(val("ret-m")))),
      claimMonths: claimChoice
    };
  }
  function dateAt(inp, m) { var t = inp.bm - 1 + m; return MONTHS[t % 12] + " " + (inp.by + Math.floor(t / 12)); }
  function workYears(inp, retMonths) { return Math.max(0, retMonths - inp.nowMonths) / 12; }

  // ---------- Social Security for you ----------
  function ssAt(inp, retMonths, claimMonths) {
    var fra = SS.fraMonths(inp.by);
    if (inp.ssMode === "none") return { none: true, monthly: 0, pia: 0, fra: fra, qualifies: false };
    var r = { fra: fra, claim: claimMonths, factor: SS.claimFactor(claimMonths, fra), qualifies: true };
    if (inp.ssMode === "stmt") r.pia = inp.ssStmt;
    else {
      r.extraYears = inp.ssCont ? workYears(inp, retMonths) : 0;
      r.est = SS.estimate(inp.ssPay, inp.ssYrs + r.extraYears);
      r.pia = r.est.pia; r.qualifies = r.est.qualifies;
    }
    r.monthly = r.qualifies ? r.pia * r.factor : 0;
    return r;
  }
  function claimOptions(inp) {
    var fra = SS.fraMonths(inp.by), opts = [];
    var start = Math.max(SS.EARLIEST, Math.ceil(inp.nowMonths / 12) * 12);
    for (var a = start; a <= SS.LATEST; a += 12) opts.push(a);
    if (fra % 12 && fra >= inp.nowMonths && opts.indexOf(fra) < 0) opts.push(fra);
    if (!opts.length) opts.push(Math.max(inp.nowMonths, SS.EARLIEST));
    return opts.sort(function (a, b) { return a - b; });
  }
  function defaultClaim(inp) { var o = claimOptions(inp), f = SS.fraMonths(inp.by); return o.indexOf(f) >= 0 ? f : (o.filter(function (x) { return x >= f; })[0] || o[o.length - 1]); }

  // ---------- retirement systems ----------
  var SYSTEMS = {
    pers: {
      name: "Oregon PERS", savingsName: "IAP", savingsLong: "IAP account",
      pension: function (inp, retMonths) {
        var svc = inp.svcNow + workYears(inp, retMonths);
        var p = PERS.calcPension({ plan: inp.plan, cls: inp.cls, ageMonths: retMonths, svc: svc, salaries: inp.salaries });
        p.svc = svc; p.formulaMonthly = p.monthly;
        p.mm = inp.plan !== "OPSRP" && inp.acctBal > 0 ? PERS.moneyMatch({ plan: inp.plan, balance: inp.acctBal, years: workYears(inp, retMonths), ageMonths: retMonths, growth: inp.iapRet }) : null;
        p.usesMM = !!(p.mm && p.mm.monthly > p.formulaMonthly);
        var single = p.usesMM ? p.mm.monthly : p.formulaMonthly;
        p.single = single;
        var opt = PERS.survivorOption(inp.married ? inp.survivor : "single");
        p.opt = opt;
        p.monthly = single * opt.factor;
        p.survivorMonthly = opt.known ? p.monthly * opt.survivorShare : null;
        p.optUnknown = !opt.known;
        p.full = p.monthsEarly === 0;
        return p;
      },
      savings: function (inp, retMonths) { var s = PERS.calcIAP({ plan: inp.plan, balance: inp.iapBal, monthlySalary: inp.iapSal, years: workYears(inp, retMonths), ret: inp.iapRet }); return s; },
      supplement: function () { return null; },
      tooEarly: function (inp, p) { return "PERS doesn't let " + PERS.NAMES[inp.plan] + (inp.cls === "PF" ? " police and fire" : " general service") + " members start a pension before age " + ageTxt(p.ages.earliest) + ". Enter " + Math.floor(p.ages.earliest / 12) + " or older."; },
      cutText: function (inp, p) { return p.monthsEarly > 0 ? "Your Full Formula pension would be " + pctTxt(1 - p.factor) + " lower because you'd retire " + durTxt(p.monthsEarly) + " before your full-benefit age of " + ageTxt(p.ages.normal) + ". The cut lasts for life." : null; },
      survivorChoices: function () { return PERS.SURVIVOR_OPTIONS; },
      who: function (inp) { return PERS.NAMES[inp.plan] + (inp.cls === "PF" ? " police and fire" : " general service"); },
      mathSteps: function (inp, p, years) {
        var multSrc = inp.plan === "OPSRP" ? srcLink("opsrp", "OPSRP benefit calculation") : srcLink("t1t2", "Tier One/Tier Two benefit calculation");
        var out = [
          li("Average pay: " + usd2(p.fasMonthly) + " a month", "(" + p.capped.map(usd).join(" + ") + ") ÷ 3 years ÷ 12 months", multSrc + ", " + srcLink("limit", "salary limit")),
          li("Service at retirement: " + num(p.svc, 2) + " years", num(inp.svcNow, 2) + " years today + " + num(years, 2) + " more years of work", null),
          li("Multiplier: " + num(p.mult * 100, 2) + "% per year of service", "The " + this.who(inp) + " Full Formula rate", srcLink("compare", "Benefit component comparisons")),
          li("Full Formula before any reduction: " + usd2(p.baseMonthly) + " a month", num(p.mult * 100, 2) + "% × " + num(p.svc, 2) + " years × " + usd2(p.fasMonthly), multSrc),
          li("Full-benefit age: " + (p.ages.normal === 0 ? "any age" : ageTxt(p.ages.normal)), p.ages.rule, srcLink("compare", "Benefit component comparisons")),
          li("Early retirement factor: " + num(p.factor, 3), p.monthsEarly === 0 ? "No reduction applies." : "You'd retire " + durTxt(p.monthsEarly) + " early. PERS's table gives " + num(PERS.earlyFactor(Math.floor(p.monthsEarly / 12) * 12), 3) + " for whole years" + (p.monthsEarly % 12 ? ", and we estimate the months in between" : "") + ".", srcLink("aef", "PERS Actuarial Equivalency Factors")),
          li("Full Formula pension: " + usd2(p.formulaMonthly) + " a month", usd2(p.baseMonthly) + " × " + num(p.factor, 3), null)
        ];
        if (p.mm) out = out.concat(p.mm.steps.map(function (s) { return li(s[0], s[1], s[2] ? srcLink(s[2], s[3]) : null); }));
        if (p.mm) out.push(li("PERS pays the higher amount: " + (p.usesMM ? "Money Match" : "Full Formula"), usd2(p.formulaMonthly) + " Full Formula vs. " + usd2(p.mm.monthly) + " Money Match", srcLink("t1t2", "Tier One/Tier Two benefit calculation")));
        out.push(li("Payment option: " + p.opt.name, p.optUnknown ? "We show the amount that pays only you, " + usd2(p.monthly) + " a month. " + p.opt.how : "Pays only you, for life: " + usd2(p.monthly) + " a month.", p.optUnknown ? srcLink("aef", "PERS Actuarial Equivalency Factors") : null));
        return out;
      },
      savingsSteps: function (inp, s, years) {
        return [
          li("Share of pay going into your IAP: " + num(s.rate * 100, 2) + "%", s.over ? "Your pay is above PERS's 2026 limit of " + usd(PERS.REDIRECT_THRESHOLD) + " a month, so " + (inp.plan === "OPSRP" ? "0.75%" : "2.5%") + " of the usual 6% goes to a separate PERS account instead." : "Your pay is at or below " + usd(PERS.REDIRECT_THRESHOLD) + " a month, so the full 6% goes into your IAP.", srcLink("redirect", "Member Redirect")),
          li("Added each month: " + usd2(s.contrib), usd(inp.iapSal) + " × " + num(s.rate * 100, 2) + "% for " + s.months + " months", null),
          li("IAP at retirement: " + usd(s.total), usd(inp.iapBal) + " today growing " + num(inp.iapRet * 100, 1) + "% a year, plus new deposits. Paid in equal monthly amounts over 20 years while the rest keeps growing: about " + usd(s.pay20) + " a month.", srcLink("iap", "What is the IAP?"))
        ];
      },
      sources: function (inp) { return (inp.plan === "OPSRP" ? ["opsrp"] : ["t1t2", "mm"]).concat(["compare", "aef", "limit", "redirect", "iap"]); },
      leavesOut: "raises, PERS cost-of-living increases, split Tier One/OPSRP careers, and special rules for 911 telecommunicators, judges and legislators. For partial years before your full-benefit age, we estimate between PERS's yearly factors.",
      nextSteps: function () { return ["<li><strong>Ask PERS for an official estimate.</strong> Request one through your Online Member Services account or by calling PERS at <span class=\"phone\">888-320-7377</span>. Only PERS can confirm your pension and IAP.</li>", "<li><strong>Decide how to take your IAP.</strong> We show it paid over 20 years. PERS also offers one lump sum, or payments over 5, 10 or 15 years, or over your expected lifetime. Ask a tax professional how each choice affects your taxes.</li>"]; }
    },

    fers: {
      name: "FERS", savingsName: "TSP", savingsLong: "TSP account",
      pension: function (inp, retMonths) {
        var svc = inp.fSvcNow + workYears(inp, retMonths);
        var p = FERS.calcPension({ ageMonths: retMonths, svc: svc, sickHours: inp.sickHours, high3: inp.high3, by: inp.by, special: inp.special, survivor: inp.married ? inp.survivor : "none" });
        p.svc = svc; p.monthsEarly = p.el.reduceMonths; p.full = p.eligible && p.reduce === 0;
        return p;
      },
      savings: function (inp, retMonths) { return FERS.calcTSP({ balance: inp.tspBal, monthlyPay: inp.tspPay, empPct: inp.tspPct, years: workYears(inp, retMonths), ret: inp.tspRet }); },
      supplement: function (inp, retMonths, p) {
        if (!p.el.supplement || inp.ssMode === "none") return null;
        var s62 = ssAt(inp, retMonths, 62 * 12);
        if (!s62.qualifies) return null;
        var sup = FERS.supplement(s62.monthly, inp.fSvcNow + workYears(inp, retMonths));
        sup.ssAt62 = s62.monthly; sup.ends = 62 * 12;
        return sup;
      },
      tooEarly: function (inp) {
        var mra = FERS.mraMonths(inp.by);
        return inp.special ? "Under special provisions you can retire at 50 with 20 years of covered service, or at any age with 25 years. Try a later age." :
          "You can't start a FERS annuity at that age with your service. Your Minimum Retirement Age is " + ageTxt(mra) + ", and you need at least 10 years by then. Try a later age.";
      },
      cutText: function (inp, p) { return p.reduce > 0 ? "Your annuity would be " + pctTxt(p.reduce) + " lower because you'd retire under the MRA+10 rule " + durTxt(p.el.reduceMonths) + " before 62. The cut lasts for life. You can avoid it by waiting to start your annuity." : null; },
      survivorChoices: function () { return [
        { id: "none", label: "Pays only me", desc: "The largest payment. It stops when you die." },
        { id: "partial", label: "Partial survivor annuity", desc: "Your annuity is 5% lower. Your spouse gets 25% of your unreduced annuity for life." },
        { id: "full", label: "Full survivor annuity", desc: "Your annuity is 10% lower. Your spouse gets 50% of your unreduced annuity for life." }
      ]; },
      who: function (inp) { return inp.special ? "FERS special provisions" : "FERS"; },
      mathSteps: function (inp, p, years) {
        var out = [
          li("Service at retirement: " + num(p.svc, 2) + " years", num(inp.fSvcNow, 2) + " years today + " + num(years, 2) + " more years of work" + (p.sickMonths ? ", plus " + p.sickMonths + " months of unused sick leave (" + num(inp.sickHours, 0) + " hours ÷ about 174 hours a month)" : "") + ". OPM drops partial months, so we count " + p.months + " months.", srcLink("fers-law", "5 U.S.C. 8415")),
          li("Retirement type: " + p.el.kind, p.el.rule, srcLink("fers-elig", "FERS eligibility")),
          li("Multiplier: " + p.mult, inp.special ? "Special provisions pay 1.7% of your high-3 for each of your first 20 years and 1% for each year after." : (p.mult === "1.1%" ? "You'd retire at 62 or older with at least 20 years, so the multiplier is 1.1%." : "FERS pays 1% of your high-3 for each year of service. Retiring at 62 or older with 20 years raises it to 1.1%."), srcLink("fers-comp", "FERS computation")),
          li("Annuity before any reduction: " + usd2(p.unreduced) + " a month", usd(inp.high3) + " high-3 × " + p.mult + " × " + num(p.yrs, 2) + " years ÷ 12", srcLink("fers-comp", "FERS computation"))
        ];
        if (p.reduce > 0) out.push(li("MRA+10 reduction: " + pctTxt(p.reduce), "5/12 of 1% for each of the " + p.el.reduceMonths + " full months you'd be under 62", srcLink("fers-comp", "FERS computation")));
        if (p.survCut > 0) out.push(li("Survivor annuity cost: " + pctTxt(p.survCut), "Your spouse would get " + usd2(p.survivorMonthly) + " a month for life after you die", srcLink("fers-comp", "FERS computation")));
        out.push(li("Estimated FERS annuity: " + usd2(p.monthly) + " a month", "Paid for life. FERS cost-of-living raises for regular retirees start at 62.", null));
        return out;
      },
      savingsSteps: function (inp, s) {
        return [
          li("Going into your TSP: " + num(s.rate * 100, 1) + "% of pay", num(inp.tspPct, 1) + "% from you + " + num(s.agency * 100, 1) + "% from your agency (1% automatic, plus a match on the first 5% you put in)", srcLink("tsp-contrib", "TSP contributions")),
          li("Added each month: " + usd2(s.contrib), usd(inp.tspPay) + " × " + num(s.rate * 100, 1) + "% for " + s.months + " months", null),
          li("TSP at retirement: " + usd(s.total), usd(inp.tspBal) + " today growing " + num(inp.tspRet * 100, 1) + "% a year, plus new deposits. Paid in equal monthly installments over 20 years while the rest keeps growing: about " + usd(s.pay20) + " a month.", srcLink("tsp-wd", "TSP withdrawals"))
        ];
      },
      sources: function () { return ["fers-elig", "fers-comp", "fers-types", "fers-law", "fers-supp", "tsp-contrib", "tsp-wd"]; },
      leavesOut: "raises, FERS cost-of-living increases, military service buyback, part-time service, CSRS service, deferred retirement, and the FERS supplement earnings limit if you keep working.",
      nextSteps: function () { return ["<li><strong>Ask your agency for an official estimate.</strong> Your human resources or benefits office can run a FERS annuity estimate. Questions about retirement applications go to OPM at <span class=\"phone\">888-767-6738</span>.</li>", "<li><strong>Decide how to take your TSP.</strong> We show monthly installments over 20 years. The TSP also offers single withdrawals, a life annuity, or a mix. Call the TSP at <span class=\"phone\">877-968-3778</span>.</li>"]; }
    }
  };
  function sys(inp) { return SYSTEMS[inp.system] || SYSTEMS.pers; }

  // ---------- the plan ----------
  function buildPlan(inp, retMonths, claimMonths) {
    var S = sys(inp);
    var p = S.pension(inp, retMonths);
    var plan = { ret: retMonths, pension: p, sav: S.savings(inp, retMonths), sup: p.eligible ? S.supplement(inp, retMonths, p) : null, ss: ssAt(inp, retMonths, claimMonths) };
    plan.spouse = spouseAt(inp, plan);
    return plan;
  }
  // Your spouse's Social Security, assuming they start at their full retirement age (or now, if they're past it).
  function spouseAt(inp, plan) {
    if (!inp.married) return null;
    var sFra = SS.fraMonths(inp.spBy);
    var start = Math.max(sFra + inp.spOffset, inp.nowMonths);   // in your age
    var r = { start: start, fra: sFra, own: inp.spSS, spousal: 0, spousalStart: null };
    if (!plan.ss.none && plan.ss.qualifies) {
      var half = 0.5 * plan.ss.pia;
      if (half > inp.spSS) { r.spousal = half - inp.spSS; r.spousalStart = Math.max(start, plan.ss.claim); }
    }
    // If you die first: survivor gets the larger of their own benefit and your benefit (we assume they're at full retirement age).
    r.survivorSS = Math.max(inp.spSS, plan.ss.none ? 0 : plan.ss.monthly);
    return r;
  }
  function incomeAt(inp, plan, age) {
    var S = sys(inp), parts = [];
    if (age >= plan.ret) parts.push({ k: "pension", label: S.name === "FERS" ? "FERS annuity" : "PERS pension", v: plan.pension.monthly });
    if (plan.sup && age >= plan.ret && age < plan.sup.ends) parts.push({ k: "supp", label: "FERS supplement", v: plan.sup.monthly });
    if (age >= plan.ret && age < plan.ret + plan.sav.payoutMonths && plan.sav.pay20 > 0.5) parts.push({ k: "iap", label: S.savingsName, v: plan.sav.pay20 });
    if (!plan.ss.none && plan.ss.monthly > 0 && age >= plan.ss.claim) parts.push({ k: "ss", label: "Your Social Security", v: plan.ss.monthly });
    if (plan.spouse) {
      var sv = (age >= plan.spouse.start ? plan.spouse.own : 0) + (plan.spouse.spousalStart != null && age >= plan.spouse.spousalStart ? plan.spouse.spousal : 0);
      if (sv > 0.5) parts.push({ k: "spouse", label: "Spouse's Social Security", v: sv });
    }
    return { parts: parts, total: parts.reduce(function (s, p) { return s + p.v; }, 0) };
  }
  function yoursAt(inp, plan, age) { var inc = incomeAt(inp, plan, age); return inc.parts.filter(function (p) { return p.k !== "spouse"; }).reduce(function (s, p) { return s + p.v; }, 0); }
  // Your own income once your pension and Social Security have both started.
  function fullIncome(inp, plan) {
    var age = Math.max(plan.ret, plan.ss.none || !plan.ss.monthly ? 0 : plan.ss.claim);
    return yoursAt(inp, plan, age);
  }
  function firstFullAge(inp) {
    var S = sys(inp);
    for (var m = Math.max(inp.nowMonths, 0); m <= 75 * 12; m++) { var p = S.pension(inp, m); if (p.eligible && p.full) return m; }
    return null;
  }
  function earliestAge(inp) {
    var S = sys(inp);
    for (var m = Math.max(inp.nowMonths, 0); m <= 75 * 12; m++) { if (S.pension(inp, m).eligible) return m; }
    return null;
  }

  // ---------- wizard ----------
  var step = "birth";
  function steps() {
    var s = ["birth", "system"], system = radio("system");
    if (system === "fers") s = s.concat(["fers-job", "fers-svc", "fers-pay", "fers-tsp"]);
    else { s = s.concat(["pers-group", "pers-svc", "pers-pay", "pers-iap"]); if (radio("plan") !== "OPSRP") s.push("pers-acct"); }
    s = s.concat(["ss", "spouse", "retire"]);
    if (radio("ssmode") !== "none") s.push("claim");
    return s;
  }
  function showStep(n, focus) {
    var list = steps(); if (list.indexOf(n) < 0) n = list[Math.min(list.length - 1, Math.max(0, list.indexOf(step)))] || "birth";
    step = n;
    var idx = list.indexOf(n) + 1, total = list.length;
    document.querySelectorAll(".q").forEach(function (q) { q.hidden = q.getAttribute("data-step") !== n; });
    $("prog-label").textContent = "Question " + idx + " of " + total;
    $("prog-fill").style.width = Math.round(idx / total * 100) + "%";
    $("back").style.visibility = idx === 1 ? "hidden" : "visible";
    $("next").textContent = idx === total ? "See my plan" : "Next";
    $("opsrp-pay-tip").hidden = radio("plan") !== "OPSRP";
    syncSub(); previews();
    if (n === "claim") renderClaimOpts();
    if (n === "spouse") renderSurvOpts();
    var h = document.querySelector('.q[data-step="' + n + '"] h2'); if (h && focus) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }
  function syncSub() {
    var m = radio("ssmode"); $("ss-stmt-box").hidden = m !== "stmt"; $("ss-est-box").hidden = m !== "est";
    $("spouse-box").hidden = radio("married") !== "yes";
  }
  function renderSurvOpts() {
    var inp = inputs(), choices = sys(inp).survivorChoices(inp);
    var cur = radio("surv"); if (!choices.some(function (c) { return c.id === cur; })) cur = choices[0].id;
    $("surv-opts").innerHTML = choices.map(function (c) {
      return '<label class="opt"><input type="radio" name="surv" value="' + c.id + '"' + (c.id === cur ? " checked" : "") + "><span><b>" + c.label + "</b><em>" + c.desc + "</em></span></label>";
    }).join("");
  }
  function previews() {
    var inp = inputs();
    $("age-preview").textContent = inp.nowMonths >= 18 * 12 && inp.nowMonths < 100 * 12 ? "You're " + ageTxt(inp.nowMonths) + " today." : "";
    if (inp.retMonths >= inp.nowMonths && inp.nowMonths > 0) {
      var p = sys(inp).pension(inp, inp.retMonths);
      $("ret-preview").textContent = "That's " + dateAt(inp, inp.retMonths) + ". You'd have about " + yrsTxt(Math.round(p.svc * 10) / 10) + " of service.";
    } else $("ret-preview").textContent = "";
  }
  function renderClaimOpts() {
    var inp = inputs(), opts = claimOptions(inp), fra = SS.fraMonths(inp.by);
    if (opts.indexOf(claimChoice) < 0) claimChoice = defaultClaim(inp);
    $("claim-opts").innerHTML = opts.map(function (m) {
      var s = ssAt(inp, inp.retMonths, m);
      var label = ageTxt(m) + (m === fra ? " (your full retirement age)" : m === SS.EARLIEST ? " (earliest)" : m === SS.LATEST ? " (largest payment)" : "");
      var amt = s.qualifies ? "About " + usd(s.monthly) + " a month, starting " + dateAt(inp, m) : "Starting " + dateAt(inp, m);
      return '<label class="opt"><input type="radio" name="claim" value="' + m + '"' + (m === claimChoice ? " checked" : "") + "><span><b>" + label + "</b><em>" + amt + "</em></span></label>";
    }).join("");
  }
  function setErr(n, msg) { var e = document.querySelector('[data-err="' + n + '"]'); if (!e) return !msg; e.textContent = msg || ""; e.hidden = !msg; return !msg; }
  function validate(n) {
    var inp = inputs();
    if (n === "birth") return setErr("birth", inp.by < 1940 || inp.by > today.getFullYear() - 18 ? "Enter your birth year as four digits, like 1965." : "");
    if (n === "retire") {
      if (inp.retMonths < inp.nowMonths) return setErr("retire", "That age has already passed. Enter your age today (" + ageTxt(inp.nowMonths) + ") or older.");
      var p = sys(inp).pension(inp, inp.retMonths);
      if (!p.eligible) { var e = earliestAge(inp); return setErr("retire", sys(inp).tooEarly(inp, p) + (e != null ? " The earliest age that works for you is " + ageTxt(e) + "." : "")); }
      return setErr("retire", "");
    }
    return true;
  }
  function go(dir) {
    var list = steps(), i = list.indexOf(step);
    if (dir > 0) {
      if (!validate(step)) return;
      if (i === list.length - 1) { if (!validate("retire")) { showStep("retire", true); return; } showResults(); return; }
    }
    showStep(list[Math.min(list.length - 1, Math.max(0, i + dir))], true); window.scrollTo(0, 0);
  }

  // ---------- results ----------
  function barHtml(parts, max) {
    var tot = parts.reduce(function (s, p) { return s + p.v; }, 0);
    return '<div class="bar" aria-hidden="true" style="width:' + Math.max(8, Math.round(tot / max * 100)) + '%">' +
      parts.map(function (p) { return '<i class="k-' + p.k + '" style="flex:' + p.v.toFixed(2) + ' 1 0"></i>'; }).join("") + "</div>";
  }
  function partsHtml(parts) { return '<p class="parts">' + parts.map(function (p) { return '<span><i class="sw k-' + p.k + '" aria-hidden="true"></i>' + p.label + " " + usd(p.v) + "</span>"; }).join("") + "</p>"; }

  function showResults() {
    var inp = inputs(), S = sys(inp);
    if (inp.ssMode !== "none" && claimChoice == null) claimChoice = defaultClaim(inp);
    var claim = claimChoice || SS.fraMonths(inp.by);
    var plan = buildPlan(inp, inp.retMonths, claim);
    var p = plan.pension, sav = plan.sav, ss = plan.ss, sp = plan.spouse, sup = plan.sup;
    var hasSS = !ss.none && ss.monthly > 0;
    var years = workYears(inp, inp.retMonths);
    var atRet = yoursAt(inp, plan, inp.retMonths);
    var full = fullIncome(inp, plan);

    // lead
    var lead = "If you retire in " + dateAt(inp, inp.retMonths) + " at age " + ageTxt(inp.retMonths);
    if (hasSS && ss.claim > inp.retMonths) lead += " and start Social Security at " + ageTxt(ss.claim) + ", you'd have about<big>" + usd(full) + " a month</big>once your pension and Social Security have both started, in " + dateAt(inp, ss.claim) + ". Until then, from " + dateAt(inp, inp.retMonths) + ", you'd have about <strong>" + usd(atRet) + " a month</strong>.";
    else if (hasSS) lead += (ss.claim < inp.retMonths ? " and start Social Security earlier, at " + ageTxt(ss.claim) : " and start Social Security at the same time") + ", you'd have about<big>" + usd(full) + " a month</big>from your pension, savings and Social Security together, before taxes.";
    else lead += ", you'd have about<big>" + usd(full) + " a month</big>from your pension" + (sav.pay20 > 0.5 ? " and " + S.savingsName : "") + ", before taxes.";
    $("r-lead").innerHTML = lead;

    var st = $("r-status"), stText = st.lastElementChild, ico = st.firstElementChild, cut = S.cutText(inp, p);
    if (cut) { st.className = "status early"; ico.textContent = "!"; stText.textContent = cut; }
    else { st.className = "status full"; ico.textContent = "✓"; stText.textContent = "No early-retirement cut to your " + (S.name === "FERS" ? "annuity" : "pension") + "."; }

    var more = [];
    more.push("<p>By then you'd have about " + yrsTxt(Math.round(p.svc * 10) / 10) + " of service.</p>");
    if (p.optUnknown) more.push("<p><strong>About your payment option:</strong> these amounts are for the option that pays only you. " + p.opt.name + " pays less while you're alive. " + p.opt.how + "</p>");
    if (p.usesMM) more.push("<p><strong>Money Match pays you more.</strong> Your member account would give " + usd(p.mm.monthly) + " a month, compared with " + usd(p.formulaMonthly) + " from the Full Formula, so we use Money Match.</p>");
    if (sup) more.push("<p>From retirement until age 62 you'd also get a <strong>FERS supplement</strong> of about " + usd(sup.monthly) + " a month, which bridges the gap until Social Security.</p>");
    if (sp) {
      var hh = incomeAt(inp, plan, Math.max(inp.retMonths, hasSS ? ss.claim : 0, sp.start)).total;
      more.push("<p>Counting your spouse's Social Security, your household would have about <strong>" + usd(hh) + " a month</strong> once everyone has started.</p>");
    }
    if (inp.system === "pers" && !p.vestedLikely) more.push('<p class="err">With fewer than 5 years of service you may not qualify for a PERS pension yet. Check with PERS.</p>');
    if (inp.system === "pers" && p.anyCapped) more.push("<p>Pay above PERS's limit of " + usd(PERS.SALARY_LIMIT) + " a year doesn't count, so we capped it.</p>");
    if (!ss.none && !ss.qualifies) more.push('<p class="err">With fewer than 10 years of Social Security work you may not have the 40 credits needed for a Social Security retirement benefit, so we left it out.</p>');
    if (hasSS && ss.claim < inp.retMonths && ss.claim < ss.fra) more.push("<p><strong>Heads up:</strong> if you start Social Security before your full retirement age while you're still working, Social Security holds back $1 for every $2 you earn over " + usd(SS.EARNINGS_LIMIT.under) + " a year (the " + SS.EARNINGS_LIMIT.year + " limit). " + srcLink("working", "See the rule") + ".</p>");
    if (sup && hasSS && ss.claim > 62 * 12) more.push("<p>The FERS supplement stops at 62 even if you wait longer to start Social Security.</p>");
    $("r-more").innerHTML = more.join("");

    // timeline
    var marks = [inp.retMonths];
    if (hasSS) marks.push(ss.claim);
    if (sup && sup.ends > inp.retMonths) marks.push(sup.ends);
    if (sav.pay20 > 0.5) marks.push(inp.retMonths + sav.payoutMonths);
    if (sp && sp.own > 0) marks.push(sp.start);
    if (sp && sp.spousalStart != null) marks.push(sp.spousalStart);
    marks = marks.filter(function (m, i, a) { return a.indexOf(m) === i && m >= inp.nowMonths; }).sort(function (a, b) { return a - b; });
    var stops = marks.map(function (m) {
      var ev = [];
      if (m === inp.retMonths) ev.push("You retire and your " + (S.name === "FERS" ? "FERS annuity" : "PERS pension") + " starts" + (sav.pay20 > 0.5 ? ". " + S.savingsName + " payments start too" : "") + (sup ? ". So does the FERS supplement" : ""));
      if (hasSS && m === ss.claim) ev.push("Your Social Security starts" + (m < inp.retMonths ? " while you're still working" : ""));
      if (sup && m === sup.ends && m !== inp.retMonths) ev.push("The FERS supplement ends at 62");
      if (sav.pay20 > 0.5 && m === inp.retMonths + sav.payoutMonths) ev.push("Your " + S.savingsName + " payments end (after 20 years)");
      if (sp && sp.own > 0 && m === sp.start) ev.push("Your spouse's Social Security starts (at their full retirement age)");
      if (sp && sp.spousalStart != null && m === sp.spousalStart && !(sp.own > 0 && m === sp.start)) ev.push("Your spouse's spousal benefit starts");
      else if (sp && sp.spousalStart != null && m === sp.spousalStart) ev[ev.length - 1] += ", with a spousal top-up based on your work";
      return { m: m, title: ev.join(". ") + ".", inc: incomeAt(inp, plan, m) };
    });
    var max = Math.max.apply(null, stops.map(function (s) { return s.inc.total; }).concat([1]));
    var html = stops.map(function (s) {
      var body = s.inc.total > 0 ? '<p class="total">' + usd(s.inc.total) + " <small>a month" + (sp ? " for your household" : "") + "</small></p>" + barHtml(s.inc.parts, max) + partsHtml(s.inc.parts) : '<p class="total">' + usd(0) + " <small>a month from these sources</small></p>";
      var spAge = sp ? ' · spouse ' + ageTxt(s.m - inp.spOffset) : "";
      return { m: s.m, h: '<li class="stopi"><p class="when">' + dateAt(inp, s.m) + " · age " + ageTxt(s.m) + spAge + "</p><h3>" + s.title + "</h3>" + body + "</li>" };
    });
    if (MEDICARE >= inp.nowMonths) {
      html.push({ m: MEDICARE, note: true, h: '<li class="stopi note"><p class="when">' + dateAt(inp, MEDICARE) + " · age 65</p><h3>Medicare can start.</h3><p>Sign up between " + dateAt(inp, MEDICARE - 3) + " and " + dateAt(inp, MEDICARE + 3) + ". " +
        (inp.retMonths < MEDICARE ? "Retiring before 65 means you'll need other health insurance until then. " : "") + srcLink("medicare", "Medicare sign-up rules") + "</p></li>" });
    }
    html.sort(function (a, b) { return a.m - b.m || (a.note ? 1 : -1); });
    $("timeline").innerHTML = html.map(function (x) { return x.h; }).join("");

    // if you die first
    $("surv-section").hidden = !sp;
    if (sp) {
      var survPension = p.survivorMonthly || 0;
      var sTotal = survPension + sp.survivorSS;
      var unknownLine = p.optUnknown ? "<li>" + pctTxt(p.opt.survivorShare) + " of your reduced PERS pension, for life. PERS figures the reduction from both your ages, so the exact amount comes from a PERS estimate.</li>" : null;
      $("surv-body").innerHTML = "<p>Your " + (S.name === "FERS" ? "annuity" : "pension") + " and your Social Security would stop. Your spouse would " + (unknownLine ? "get" : "have about <strong>" + usd(sTotal) + " a month</strong>") + ":</p><ul style=\"margin:0;padding-left:1.3rem;display:grid;gap:.3rem\">" +
        (unknownLine || "<li>" + (survPension > 0 ? usd(survPension) + " a month from your " + (S.name === "FERS" ? "survivor annuity" : "pension (" + p.opt.name + ")") : "Nothing from your " + (S.name === "FERS" ? "annuity" : "pension") + ", because the payment option you picked pays only you") + "</li>") +
        "<li>" + usd(sp.survivorSS) + " a month from Social Security: the larger of their own benefit and yours, if they're at full retirement age " + srcLink("survivor", "(survivor rules)") + "</li></ul>" +
        (sav.pay20 > 0.5 ? "<p>Whatever is left in your " + S.savingsLong + " would go to your beneficiary.</p>" : "") +
        "<p>Choosing a survivor option lowers your payment now but protects your spouse later. Compare options on the <button type=\"button\" class=\"linkbtn\" id=\"to-spouse\">spouse question</button>.</p>";
      var ts = $("to-spouse"); if (ts) ts.addEventListener("click", function () { editAt("spouse"); });
    }

    // compare retirement dates
    var startM = Math.max(inp.nowMonths, earliestAge(inp) || inp.nowMonths);
    var rows = [], seen = {};
    function add(m) { if (m == null || seen[m] || m < inp.nowMonths) return; seen[m] = 1; rows.push(m); }
    for (var y = Math.ceil(startM / 12); y < Math.ceil(startM / 12) + 8 && y <= 75; y++) add(y * 12);
    var fullM = firstFullAge(inp);
    add(inp.retMonths); add(fullM);
    rows.sort(function (a, b) { return a - b; });
    $("cmp-p-head").textContent = "Pension and " + S.savingsName + (S.name === "FERS" ? " (with supplement)" : "");
    $("cmp-ss-head").textContent = hasSS ? "Once your Social Security starts (at " + ageTxt(ss.claim) + ")" : "Total";
    $("cmp").innerHTML = rows.map(function (m) {
      var q = buildPlan(inp, m, claim), picked = m === inp.retMonths;
      if (!q.pension.eligible) return '<tr><td>' + ageTxt(m) + '<span class="date">' + dateAt(inp, m) + '</span></td><td colspan="3">Too early to retire</td></tr>';
      var pi = yoursAt(inp, q, m) - (hasSS && q.ss.claim <= m ? q.ss.monthly : 0);
      var tot = fullIncome(inp, q);
      var cutPct = S.name === "FERS" ? q.pension.reduce : (q.pension.usesMM ? 0 : 1 - q.pension.factor);
      var tag = cutPct > 0.0005 ? ' <span class="tag cut">' + pctTxt(cutPct) + " cut</span>" : (m === fullM ? ' <span class="tag">No cut from here</span>' : "");
      var diff = picked ? '<span class="tag">Your pick</span>' : '<button type="button" class="pick" data-m="' + m + '">Show</button>';
      var delta = picked ? "" : '<span class="date">' + (tot - full >= 0 ? "+" : "−") + usd(Math.abs(tot - full)) + " vs. your pick</span>";
      return '<tr class="' + (picked ? "picked" : "") + '"><td>' + ageTxt(m) + tag + '<span class="date">' + dateAt(inp, m) + '</span></td><td class="amt" data-label="Pension and ' + S.savingsName + '">' + usd(pi) + '</td><td class="amt" data-label="' + (hasSS ? "With Social Security" : "Total") + '">' + usd(tot) + delta + "</td><td>" + diff + "</td></tr>";
    }).join("");

    // compare Social Security start ages
    $("claim-section").hidden = !hasSS;
    if (hasSS) {
      $("claim-intro").textContent = "Your full retirement age is " + ageTxt(ss.fra) + ". Starting earlier gives you a smaller payment for life. Waiting past it adds 8% for each year, up to age 70." + (sp ? " If you die first, a larger benefit also means a larger survivor benefit for your spouse." : "");
      $("claim-cmp").innerHTML = claimOptions(inp).map(function (m) {
        var s = ssAt(inp, inp.retMonths, m), picked = m === ss.claim;
        var d = s.factor - 1, cmpTxt = Math.abs(d) < 0.0005 ? "Full amount" : (d > 0 ? "+" : "−") + pctTxt(Math.abs(d));
        return '<tr class="' + (picked ? "picked" : "") + '"><td>' + ageTxt(m) + '<span class="date">' + dateAt(inp, m) + '</span></td><td class="amt" data-label="Social Security">' + usd(s.monthly) + '</td><td data-label="Compared to full retirement age">' + cmpTxt + "</td><td>" +
          (picked ? '<span class="tag">Your pick</span>' : '<button type="button" class="pick" data-claim="' + m + '">Show</button>') + "</td></tr>";
      }).join("");
    }

    // next steps
    var nx = S.nextSteps(inp);
    if (!ss.none) nx.splice(1, 0, "<li><strong>Check your Social Security record.</strong> Your statement at <a href=\"https://www.ssa.gov/myaccount/\" target=\"_blank\" rel=\"noopener\">ssa.gov/myaccount</a> shows your exact estimates at 62, your full retirement age and 70. You can also call Social Security at <span class=\"phone\">800-772-1213</span>.</li>");
    nx.push("<li><strong>Plan for health insurance.</strong> " + (inp.retMonths < MEDICARE ? "You'd retire before Medicare starts at 65, so price out coverage for the gap. " : "") + "Sign up for Medicare in the seven months around your 65th birthday, even if you wait on Social Security.</li>");
    nx.push(sp ? "<li><strong>Talk through the survivor choice together.</strong> Your payment option is usually permanent once payments start.</li>" : "<li><strong>Choose how your pension is paid.</strong> These amounts are for the option that pays only you. If you want someone to keep receiving payments after you die, your monthly amount will be lower.</li>");
    $("next-steps").innerHTML = nx.join("");

    // what you told us (also printed)
    var ans = ["Born " + MONTHS[inp.bm - 1] + " " + inp.by + " (age " + ageTxt(inp.nowMonths) + " today)"];
    if (inp.system === "pers") {
      ans.push("Oregon PERS, " + S.who(inp) + ", " + num(inp.svcNow, 1) + " years of service so far");
      ans.push("Three best years of pay: " + inp.salaries.map(usd).join(", "));
      ans.push("IAP balance " + usd(inp.iapBal) + ", monthly pay " + usd(inp.iapSal) + ", growth " + num(inp.iapRet * 100, 1) + "% a year");
      if (inp.plan !== "OPSRP") ans.push("Member account balance " + (inp.acctBal ? usd(inp.acctBal) : "not entered"));
    } else {
      ans.push(S.who(inp) + ", " + num(inp.fSvcNow, 1) + " years of service so far" + (inp.sickHours ? ", " + num(inp.sickHours, 0) + " hours of sick leave" : ""));
      ans.push("High-3 average pay " + usd(inp.high3));
      ans.push("TSP balance " + usd(inp.tspBal) + ", monthly pay " + usd(inp.tspPay) + ", you put in " + num(inp.tspPct, 1) + "%, growth " + num(inp.tspRet * 100, 1) + "% a year");
    }
    ans.push(inp.ssMode === "none" ? "No Social Security" : inp.ssMode === "stmt" ? "Social Security at full retirement age (from statement): " + usd(inp.ssStmt) : "Social Security estimated from pay of " + usd(inp.ssPay) + " a year over " + num(inp.ssYrs, 0) + " years so far");
    if (sp) ans.push("Spouse born " + MONTHS[inp.spBm - 1] + " " + inp.spBy + ", own Social Security " + usd(inp.spSS) + " at full retirement age");
    ans.push("Retire at " + ageTxt(inp.retMonths) + (hasSS ? ", start Social Security at " + ageTxt(ss.claim) : ""));
    $("answers").innerHTML = ans.map(function (a) { return "<li>" + a + "</li>"; }).join("");

    // the math
    $("pension-h").textContent = S.name === "FERS" ? "Your FERS annuity" : "Your PERS pension";
    $("savings-h").textContent = "Your " + S.savingsLong;
    var pSteps = S.mathSteps(inp, p, years);
    if (sup) pSteps.push(li("FERS supplement: " + usd2(sup.monthly) + " a month until 62", "Your Social Security estimate at 62 (" + usd2(sup.ssAt62) + ") × " + sup.years + " years of FERS service ÷ 40. It's reduced if you earn more than Social Security's yearly limit after retiring.", srcLink("fers-supp", "5 U.S.C. 8421")));
    $("steps").innerHTML = pSteps.join("");
    $("sav-steps").innerHTML = S.savingsSteps(inp, sav, years).join("");
    var ssSteps = [];
    if (ss.none) ssSteps.push(li("Not included", "You told us you won't get Social Security.", null));
    else {
      if (inp.ssMode === "stmt") ssSteps.push(li("Amount at full retirement age: " + usd2(ss.pia) + " a month", "The number you entered from your Social Security statement. Your statement assumes you keep working until then, so retiring earlier can lower it a little.", null));
      else {
        var e = ss.est;
        ssSteps.push(li("Pay that counts: " + usd(e.capped) + " a year", inp.ssPay > SS.TAX_MAX ? "Pay above " + usd(SS.TAX_MAX) + " (2026's maximum taxable pay) doesn't count." : "Your usual yearly pay, which is under the " + usd(SS.TAX_MAX) + " limit.", srcLink("cbb", "Maximum taxable earnings")));
        ssSteps.push(li("Years counted: " + num(e.counted, 1) + " of 35", num(inp.ssYrs, 0) + " years so far" + (ss.extraYears ? " + " + num(ss.extraYears, 1) + " more until you retire" : "") + ". Social Security uses your 35 best years and counts missing years as zero.", srcLink("pia", "PIA formula")));
        ssSteps.push(li("Average monthly earnings: " + usd(e.aime), usd(e.capped) + " × " + num(e.counted, 1) + " ÷ 35 years ÷ 12 months, rounded down", srcLink("pia", "PIA formula")));
        ssSteps.push(li("Amount at full retirement age: " + usd2(e.pia) + " a month", "90% of the first " + usd(SS.BEND.b1) + ", plus 32% of the amount up to " + usd(SS.BEND.b2) + ", plus 15% of anything above, using the " + SS.BEND.year + " figures.", srcLink("pia", "PIA formula")));
      }
      var mo = ss.fra - ss.claim;
      ssSteps.push(li("Full retirement age: " + ageTxt(ss.fra), "Set by your birth year (" + inp.by + ").", srcLink("fra", "Full retirement age")));
      ssSteps.push(li("Start-age adjustment: × " + num(ss.factor, 4), mo > 0 ? "Starting " + durTxt(mo) + " early lowers it by 5/9 of 1% for each of the first 36 months" + (mo > 36 ? " and 5/12 of 1% for each month after that" : "") + "." : mo < 0 ? "Waiting " + durTxt(-mo) + " past full retirement age adds 2/3 of 1% for each month (8% a year)." : "Starting at full retirement age gives the full amount.", mo > 0 ? srcLink("early", "Early retirement reduction") : srcLink("delay", "Delayed retirement credits")));
      ssSteps.push(li("Estimated Social Security: " + usd2(ss.monthly) + " a month", ss.qualifies ? usd2(ss.pia) + " × " + num(ss.factor, 4) + ", in today's dollars" : "Fewer than 10 years of work, so you may not qualify.", ss.qualifies ? null : srcLink("credits", "Social Security credits")));
      ssSteps.push(li("Your pension doesn't lower your Social Security", "The Social Security Fairness Act ended the Windfall Elimination Provision and Government Pension Offset for benefits from January 2024 on.", srcLink("fairness", "Social Security Fairness Act")));
    }
    $("ss-steps").innerHTML = ssSteps.join("");
    $("spouse-math").hidden = !sp;
    if (sp) {
      $("sp-steps").innerHTML = [
        li("Spouse's own benefit: " + usd2(sp.own) + " a month", "The amount you entered, starting at their full retirement age of " + ageTxt(sp.fra) + " (" + dateAt(inp, sp.start) + ").", null),
        li("Spousal benefit: " + (sp.spousal > 0 ? "a top-up of " + usd2(sp.spousal) + " a month" : "none"), sp.spousal > 0 ? "A spouse can get up to 50% of your full-retirement-age amount (" + usd2(ss.pia) + " × 50% = " + usd2(ss.pia / 2) + "). Social Security pays their own benefit first, then adds the difference once you've started your own benefit." : "Half of your full-retirement-age amount (" + usd2((ss.pia || 0) / 2) + ") isn't more than their own benefit, so they'd get their own.", srcLink("spouse", "Benefits for a spouse")),
        li("Survivor benefit: " + usd2(sp.survivorSS) + " a month", "If you die first, your spouse gets the larger of their own benefit and the amount you were receiving, if they're at full retirement age.", srcLink("survivor", "Widow(er)'s benefit"))
      ].join("");
    }
    $("leaves-out").textContent = "This plan leaves out taxes, Medicare premiums, " + S.leavesOut + (sp ? " For your spouse, we assume they start Social Security at their full retirement age and don't have a pension of their own." : "") + " Because we don't add cost-of-living increases, think of every amount as roughly today's dollars.";
    var srcIds = S.sources(inp).concat(["pia", "cbb", "fra", "early", "delay", "credits", "working", "fairness"]).concat(sp ? ["spouse", "survivor"] : []).concat(["medicare"]);
    $("sources").innerHTML = srcIds.map(function (id) { return '<li id="src-' + id + '"><a href="' + SOURCES[id][0] + '" target="_blank" rel="noopener">' + SOURCES[id][1] + "</a></li>"; }).join("");

    $("intro").hidden = true; $("wizard").hidden = true; $("results").hidden = false;
    window.scrollTo(0, 0);
    save();
  }
  function editAt(n) { $("results").hidden = true; $("intro").hidden = false; $("wizard").hidden = false; showStep(n, true); window.scrollTo(0, 0); }

  // ---------- events ----------
  $("next").addEventListener("click", function () { go(1); });
  $("back").addEventListener("click", function () { go(-1); });
  $("same-pay").addEventListener("click", function () { $("sal2").value = $("sal1").value; $("sal3").value = $("sal1").value; save(); });
  $("ret-full").addEventListener("click", function () {
    var m = firstFullAge(inputs());
    if (m != null) { $("ret-y").value = Math.floor(m / 12); $("ret-m").value = m % 12; previews(); setErr("retire", ""); save(); }
  });
  $("claim-opts").addEventListener("change", function (e) { if (e.target.name === "claim") { claimChoice = +e.target.value; save(); } });
  $("cmp").addEventListener("click", function (e) {
    var b = e.target.closest(".pick"); if (!b) return;
    var m = +b.getAttribute("data-m"); $("ret-y").value = Math.floor(m / 12); $("ret-m").value = m % 12; showResults();
  });
  $("claim-cmp").addEventListener("click", function (e) {
    var b = e.target.closest(".pick"); if (!b) return;
    claimChoice = +b.getAttribute("data-claim"); showResults();
  });
  $("edit").addEventListener("click", function () { editAt("birth"); });
  $("restart").addEventListener("click", function () { try { localStorage.removeItem("retirement-planner"); } catch (e) {} location.href = location.pathname; });
  $("form").addEventListener("input", function () { previews(); save(); });
  $("form").addEventListener("change", function (e) {
    syncSub(); previews(); save(); $("opsrp-pay-tip").hidden = radio("plan") !== "OPSRP";
    if (e.target.name === "system" || e.target.name === "married") renderSurvOpts();
    showStep(step);
  });
  $("form").addEventListener("submit", function (e) { e.preventDefault(); });

  var FIELDS = ["birth-m", "birth-y", "svc", "sal1", "sal2", "sal3", "iap-bal", "iap-sal", "iap-ret", "acct-bal", "fsvc", "sick", "high3", "tsp-bal", "tsp-pay", "tsp-pct", "tsp-ret", "ss-stmt", "ss-pay", "ss-yrs", "sp-m", "sp-y", "sp-ss", "ret-y", "ret-m"];
  var RADIOS = ["system", "plan", "cls", "fjob", "ssmode", "sscont", "married", "surv"];
  function save() {
    try {
      var o = { claim: claimChoice };
      RADIOS.forEach(function (r) { o[r] = radio(r); });
      FIELDS.forEach(function (f) { o[f] = $(f).value; });
      localStorage.setItem("retirement-planner", JSON.stringify(o));
    } catch (e) {}
  }
  var savedSurv = null;
  function restore() {
    try {
      var o = JSON.parse(localStorage.getItem("retirement-planner") || "null"); if (!o) return;
      FIELDS.forEach(function (f) { if (o[f] != null) $(f).value = o[f]; });
      RADIOS.forEach(function (r) { var el = document.querySelector('input[name="' + r + '"][value="' + o[r] + '"]'); if (el) el.checked = true; });
      if (o.claim != null) claimChoice = +o.claim;
      savedSurv = o.surv;
    } catch (e) {}
  }

  restore();
  // ?system=fers (from the FERS page) picks the system.
  var qs = /[?&]system=(pers|fers)/.exec(location.search); if (qs) { var r = document.querySelector('input[name="system"][value="' + qs[1] + '"]'); if (r) r.checked = true; }
  renderSurvOpts();
  if (savedSurv) { var sv = document.querySelector('input[name="surv"][value="' + savedSurv + '"]'); if (sv) sv.checked = true; }
  showStep("birth");
  window.Planner = { inputs: inputs, buildPlan: buildPlan, incomeAt: incomeAt, fullIncome: fullIncome, ssAt: ssAt, showResults: showResults, showStep: showStep, SYSTEMS: SYSTEMS };
})();
