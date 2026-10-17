// Oregon PERS rules (oregon.gov/pers). Used by the PERS estimator and the planner. Update each January.
// Registers window.RetirementRules.pensions["or-pers"].
(function (R) {
  var EARLY_FACTORS = [1.000, 0.918, 0.843, 0.775, 0.713, 0.657, 0.605, 0.558, 0.515, 0.476, 0.440];  // AEFs 1/1/2026, Table 1
  var SALARY_LIMIT = 245724;          // SB 1049 annual limit as published by PERS
  var REDIRECT_THRESHOLD = 3890;      // 2026 monthly salary threshold
  var MULT = { T1: { GEN: 0.0167, PF: 0.02 }, T2: { GEN: 0.0167, PF: 0.02 }, OPSRP: { GEN: 0.015, PF: 0.018 } };
  var NAMES = { T1: "Tier One", T2: "Tier Two", OPSRP: "OPSRP" };

  function earlyFactor(monthsEarly) {
    if (monthsEarly <= 0) return 1;
    var y = Math.floor(monthsEarly / 12), m = monthsEarly % 12;
    if (y >= EARLY_FACTORS.length - 1) return EARLY_FACTORS[EARLY_FACTORS.length - 1];
    var a = EARLY_FACTORS[y], b = EARLY_FACTORS[y + 1];
    return a + (b - a) * (m / 12);
  }
  function retirementAges(plan, cls, svc) {
    if (plan === "OPSRP") {
      if (cls === "PF") return { normal: (svc >= 25 ? 53 : 55) * 12, earliest: 50 * 12, rule: "OPSRP police and fire: full benefit at 55, or at 53 with 25 or more years. Earliest retirement at 50." };
      return { normal: (svc >= 30 ? 58 : 65) * 12, earliest: 55 * 12, rule: "OPSRP general service: full benefit at 65, or at 58 with 30 or more years. Earliest retirement at 55." };
    }
    if (svc >= 30) return { normal: 0, earliest: 0, rule: "Tier One and Tier Two: with 30 years of service you get a full benefit at any age." };
    if (cls === "PF") return { normal: (svc >= 25 ? 50 : 55) * 12, earliest: 50 * 12, rule: "Tier One and Tier Two police and fire: full benefit at 55, or at 50 with 25 or more years. Earliest retirement at 50." };
    if (plan === "T1") return { normal: 58 * 12, earliest: 55 * 12, rule: "Tier One general service: full benefit at 58, or at any age with 30 years. Earliest retirement at 55." };
    return { normal: 60 * 12, earliest: 55 * 12, rule: "Tier Two general service: full benefit at 60, or at any age with 30 years. Earliest retirement at 55." };
  }
  // inp: { plan, cls, ageMonths (at retirement), svc (at retirement), salaries[3] }
  function calcPension(inp) {
    var capped = inp.salaries.map(function (s) { return Math.min(s, SALARY_LIMIT); });
    var fasAnnual = (capped[0] + capped[1] + capped[2]) / 3;
    var fasMonthly = fasAnnual / 12;
    var mult = MULT[inp.plan][inp.cls];
    var ages = retirementAges(inp.plan, inp.cls, inp.svc);
    var monthsEarly = Math.max(0, ages.normal - inp.ageMonths);
    var factor = earlyFactor(monthsEarly);
    var base = mult * inp.svc * fasMonthly;
    return {
      capped: capped, anyCapped: capped.some(function (c, i) { return c < inp.salaries[i]; }),
      fasAnnual: fasAnnual, fasMonthly: fasMonthly, mult: mult, ages: ages,
      monthsEarly: monthsEarly, eligible: inp.ageMonths >= ages.earliest, factor: factor,
      baseMonthly: base, monthly: base * factor, vestedLikely: inp.svc >= 5
    };
  }
  // inp: { plan, balance, monthlySalary, years (until retirement), ret (yearly growth) }. Paid out over 20 years.
  function calcIAP(inp) {
    var over = inp.monthlySalary > REDIRECT_THRESHOLD;
    var rate = inp.plan === "OPSRP" ? (over ? 0.0525 : 0.06) : (over ? 0.035 : 0.06);
    var months = Math.round(inp.years * 12);
    var r = Math.pow(1 + inp.ret, 1 / 12) - 1;
    var contrib = inp.monthlySalary * rate;
    var grow = Math.pow(1 + r, months);
    var fvBal = inp.balance * grow;
    var fvContrib = r === 0 ? contrib * months : contrib * (grow - 1) / r;
    var total = fvBal + fvContrib;
    var pay20 = r === 0 ? total / 240 : total * r / (1 - Math.pow(1 + r, -240));
    return { over: over, rate: rate, months: months, r: r, contrib: contrib, fvBal: fvBal, fvContrib: fvContrib, total: total, pay20: pay20, payoutMonths: 240 };
  }

  // ---------- Money Match (Tier One and Tier Two) ----------
  // Monthly annuity per $1,000 of account balance at each whole age, Option 1 (non-refund life), healthy members.
  // AEFs effective 1/1/2026, Table 3a, month 0 of each age. Months in between are interpolated.
  var MM_FACTORS = { 50: 6.20, 51: 6.25, 52: 6.29, 53: 6.35, 54: 6.40, 55: 6.46, 56: 6.52, 57: 6.59, 58: 6.66, 59: 6.74, 60: 6.82,
    61: 6.92, 62: 7.01, 63: 7.12, 64: 7.24, 65: 7.37, 66: 7.51, 67: 7.66, 68: 7.83, 69: 8.01, 70: 8.21, 71: 8.42, 72: 8.66,
    73: 8.92, 74: 9.21, 75: 9.52, 76: 9.86, 77: 10.23, 78: 10.65, 79: 11.10, 80: 11.60 };
  var TIER_ONE_RATE = 0.069;   // assumed earnings rate credited to Tier One member accounts (PERS Board, kept for 2026)
  function mmFactor(ageMonths) {
    var y = Math.floor(ageMonths / 12), m = ageMonths % 12;
    if (y < 50) return MM_FACTORS[50];
    if (y >= 80) return MM_FACTORS[80];
    return MM_FACTORS[y] + (MM_FACTORS[y + 1] - MM_FACTORS[y]) * m / 12;
  }
  // inp: { plan, balance (today), years (until retirement), ageMonths (at retirement), growth (Tier Two yearly return) }
  function moneyMatch(inp) {
    var rate = inp.plan === "T1" ? TIER_ONE_RATE : inp.growth;
    var bal = inp.balance * Math.pow(1 + rate, inp.years);
    var f = mmFactor(inp.ageMonths);
    var monthly = 2 * bal / 1000 * f;
    return {
      rate: rate, balanceAtRet: bal, factor: f, monthly: monthly,
      steps: [
        ["Member account at retirement: " + Math.round(bal).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
          (inp.plan === "T1" ? "Tier One accounts are credited PERS's assumed rate of 6.9% a year." : "Tier Two accounts earn actual returns; we use your growth assumption of " + (rate * 100).toFixed(1) + "% a year."),
          "mm", "Money Match"],
        ["Money Match: " + monthly.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " a month",
          "Your account × 2 (your employer matches it) × " + f.toFixed(3) + " per $1,000, PERS's factor for your age. No separate early-retirement cut applies.",
          "aef", "PERS Actuarial Equivalency Factors, Table 3a"]
      ]
    };
  }

  // ---------- payment options ----------
  // PERS reduces Option 2 and Option 3 using factors that depend on both ages (AEF Tables 6a and 7a). We haven't
  // verified those 2026 values yet, so the planner shows the single-life amount and explains what changes.
  var SURVIVOR_OPTIONS = [
    { id: "single", label: "Pays only me", desc: "The largest payment (PERS Option 1, or Single Life for OPSRP). It stops when you die." },
    { id: "opt2", label: "Keeps paying my spouse the full amount", desc: "PERS Option 2 (OPSRP Full Survivorship). Your payment is lower, and your spouse gets 100% of it for life after you die." },
    { id: "opt3", label: "Keeps paying my spouse half", desc: "PERS Option 3 (OPSRP Half Survivorship). Your payment is a little lower, and your spouse gets 50% of it for life after you die." }
  ];
  function survivorOption(id) {
    if (id === "opt2") return { id: id, name: "Option 2 (100% to your spouse)", factor: 1, known: false, survivorShare: 1, how: "PERS lowers your payment by a factor based on your age and your spouse's age (AEF Table 6a). Ask PERS for an estimate that shows it." };
    if (id === "opt3") return { id: id, name: "Option 3 (50% to your spouse)", factor: 1, known: false, survivorShare: 0.5, how: "PERS lowers your payment by a factor based on your age and your spouse's age (AEF Table 7a). Ask PERS for an estimate that shows it." };
    return { id: "single", name: "Pays only you (Option 1)", factor: 1, known: true, survivorShare: 0, how: "" };
  }

  R.pensions = R.pensions || {};
  R.pensions["or-pers"] = {
    name: "Oregon PERS", NAMES: NAMES, SALARY_LIMIT: SALARY_LIMIT, REDIRECT_THRESHOLD: REDIRECT_THRESHOLD,
    earlyFactor: earlyFactor, retirementAges: retirementAges, calcPension: calcPension, calcIAP: calcIAP,
    MM_FACTORS: MM_FACTORS, TIER_ONE_RATE: TIER_ONE_RATE, mmFactor: mmFactor, moneyMatch: moneyMatch, SURVIVOR_OPTIONS: SURVIVOR_OPTIONS, survivorOption: survivorOption
  };
})(window.RetirementRules = window.RetirementRules || {});
