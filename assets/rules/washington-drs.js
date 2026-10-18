// Washington Department of Retirement Systems (drs.wa.gov, RCW 41.40, 41.32, 41.35): PERS, TRS and SERS, Plans 1, 2 and 3.
// Registers window.RetirementRules.pensions.drs. Update when DRS publishes new early retirement factors (each August).
(function (R) {
  var SRC = {
    p1: "https://www.drs.wa.gov/plan/pers1/", p2: "https://www.drs.wa.gov/plan/pers2/", p3: "https://www.drs.wa.gov/plan/pers3/",
    erf: "https://www.drs.wa.gov/sitemap/adminfactors/af-erf-pers-trs-and-sers-2-3/",
    rcw630: "https://app.leg.wa.gov/RCW/default.aspx?cite=41.40.630", rcw820: "https://app.leg.wa.gov/RCW/default.aspx?cite=41.40.820"
  };
  // DRS "2027 Early Retirement Factors PERS, SERS and TRS Plans 2 and 3", whole years early (before 65), month 0.
  // DRS's monthly values fall on a straight line between these, so we interpolate.
  var ACTUARIAL = [1.0000, 0.9069, 0.8239, 0.7497, 0.6833, 0.6236, 0.5698, 0.5213, 0.4775, 0.4378, 0.4018];
  // 2008 early retirement factors for members hired before May 1, 2013 with 30 or more years (RCW 41.40.630(3)(b)).
  var ERF2008 = { 55: 0.80, 56: 0.83, 57: 0.86, 58: 0.89, 59: 0.92, 60: 0.95, 61: 0.98 };
  var NAMES = { P1: "Plan 1", P2: "Plan 2", P3: "Plan 3" };

  function actuarial(monthsEarly) {
    if (monthsEarly <= 0) return 1;
    var y = Math.floor(monthsEarly / 12), m = monthsEarly % 12;
    if (y >= 10) return ACTUARIAL[10];
    return ACTUARIAL[y] + (ACTUARIAL[y + 1] - ACTUARIAL[y]) * m / 12;
  }
  // inp: { plan: "P1" | "P2" | "P3", hire: "before" | "after" (May 1, 2013), ageMonths, svc (years), afc (yearly average final compensation) }
  function calcPension(inp) {
    var age = inp.ageMonths, svc = inp.svc, monthlyAfc = inp.afc / 12, steps = [];
    var mult = inp.plan === "P3" ? 0.01 : 0.02;
    var pctOfPay = inp.plan === "P1" ? Math.min(0.6, mult * svc) : mult * svc;
    var base = pctOfPay * monthlyAfc;
    var r = { eligible: false, factor: 1, cut: 0, known: true, base: base };
    steps.push(["Pension before any cut: " + money(base) + " a month",
      (mult * 100) + "% × " + round1(svc) + " years × " + money(monthlyAfc) + " average monthly pay" + (inp.plan === "P1" && mult * svc > 0.6 ? ", capped at 60% of your pay" : ""),
      inp.plan === "P1" ? SRC.p1 : inp.plan === "P2" ? SRC.p2 : SRC.p3, "DRS: " + NAMES[inp.plan] + " benefit formula"]);

    if (inp.plan === "P1") {
      // Active members: any age with 30 years, 55 with 25, or 60 with 5. No early cut (RCW 41.40.180).
      r.eligible = svc >= 30 || (age >= 55 * 12 && svc >= 25) || (age >= 60 * 12 && svc >= 5);
      r.cutText = "No early-retirement cut: Plan 1 pays a full pension at any age with 30 years, at 55 with 25, or at 60 with 5.";
      r.earliestText = "Plan 1 needs 30 years at any age, 25 years at 55, or 5 years at 60.";
    } else {
      var full = age >= 65 * 12 && svc >= (inp.plan === "P3" ? 5 : 5);
      var monthsEarly = Math.max(0, 65 * 12 - age);
      var minEarly = inp.plan === "P3" ? 10 : 20;
      if (full) { r.eligible = true; r.cutText = "No early-retirement cut: you'd be 65 or older."; }
      else if (age >= 55 * 12 && svc >= minEarly) {
        r.eligible = true;
        var act = actuarial(monthsEarly), erf = 0, erfName = "";
        if (svc >= 30) {
          if (inp.hire === "before") { erf = age >= 62 * 12 ? 1 : ERF2008[Math.floor(age / 12)]; erfName = "the 2008 early retirement factors for 30 years of service"; }
          else { erf = 1 - 0.05 * monthsEarly / 12; erfName = "the 5% a year early retirement factor for 30 years of service"; }
        }
        r.factor = Math.max(act, erf);
        r.cut = 1 - r.factor;
        var how = erf >= act ? erfName : "DRS's actuarial early retirement factors";
        r.cutText = r.cut > 0 ? "DRS would cut your pension " + Math.round(r.cut * 1000) / 10 + "% for life, using " + how + ", because you'd retire before 65." : "No early-retirement cut: with 30 years and a start before May 1, 2013, the cut ends at 62.";
        steps.push(["Early retirement factor: " + r.factor.toFixed(4),
          erf >= act ? (inp.hire === "before" ? "With 30 years and a start before May 1, 2013: 20% off at 55, falling 3 points a year to none at 62." : "With 30 years and a start on or after May 1, 2013: 5% off for each year before 65, counted by the month.")
            : "With fewer than 30 years, DRS reduces your pension by its actuarial factor for retiring " + Math.floor(monthsEarly / 12) + " years and " + monthsEarly % 12 + " months before 65 (2027 table).",
          erf >= act ? (inp.plan === "P3" ? SRC.rcw820 : SRC.rcw630) : SRC.erf, erf >= act ? "RCW " + (inp.plan === "P3" ? "41.40.820" : "41.40.630") : "DRS: 2027 early retirement factors"]);
      }
      r.earliestText = NAMES[inp.plan] + " can start at 65 with 5 years, or from 55 with " + minEarly + " years (with a cut).";
    }
    r.monthly = base * r.factor;
    steps.push(["DRS pension: " + money(r.monthly) + " a month", "Option 1, which pays only you, for life.", null, null]);
    r.steps = steps;
    return r;
  }
  function money(v) { return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function round1(v) { return Math.round(v * 10) / 10; }

  R.pensions = R.pensions || {};
  R.pensions.drs = { name: "Washington DRS", NAMES: NAMES, ACTUARIAL: ACTUARIAL, ERF2008: ERF2008, actuarial: actuarial, calcPension: calcPension };
})(window.RetirementRules = window.RetirementRules || {});
