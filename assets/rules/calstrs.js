// CalSTRS (calstrs.com) Defined Benefit Program: 2% at 60 (first hired before 2013) and 2% at 62 (first hired 2013 or later).
// Registers window.RetirementRules.pensions.calstrs. Age factors are CalSTRS's whole-year table; CalSTRS also publishes
// monthly factors, which we estimate on a straight line between the yearly ones. Check the 2% at 62 pay limit each July.
(function (R) {
  var SRC = {
    age: "http://www.calstrs.com/age-factor",
    handbook: "http://www.calstrs.com/files/44f960e51/MemberHandbook2026.pdf",
    enh: "http://www.calstrs.com/benefit-enhancements",
    limits: "http://www.calstrs.com/limits",
    options: "http://www.calstrs.com/electing-an-option"
  };
  // Age factor in %, at whole ages 55 to 65 (both formulas cap at 2.4%).
  var F = {
    "2@60": [1.40, 1.52, 1.64, 1.76, 1.88, 2.00, 2.13, 2.27, 2.40, 2.40, 2.40],
    "2@62": [1.16, 1.28, 1.40, 1.52, 1.64, 1.76, 1.88, 2.00, 2.13, 2.27, 2.40]
  };
  var NAMES = { "2@60": "2% at 60", "2@62": "2% at 62" };
  var CAP_62 = 191866;   // 2026-27 creditable compensation limit for 2% at 62 members

  function ageFactor(formula, ageMonths) {
    var t = F[formula], y = Math.floor(ageMonths / 12) - 55, m = ageMonths % 12;
    if (y < 0) return 0;
    if (y >= 10) return t[10] / 100;
    return (t[y] + (t[y + 1] - t[y]) * m / 12) / 100;
  }
  // inp: { formula: "2@60" | "2@62", ageMonths, svc (years), fc (yearly final compensation) }
  function calcPension(inp) {
    var age = inp.ageMonths, svc = inp.svc, steps = [], named = inp.formula === "2@60" ? 60 : 62;
    var fc = inp.formula === "2@62" ? Math.min(inp.fc, CAP_62) : inp.fc;
    var af = ageFactor(inp.formula, age);
    var career = inp.formula === "2@60" && svc >= 30 && af > 0 ? Math.min(0.024, af + 0.002) - af : 0;
    var total = af + career;
    var r = { known: true, af: af, career: career, bf: total, named: named, capped: inp.formula === "2@62" && inp.fc > CAP_62 };
    r.eligible = svc >= 5 && age >= 55 * 12;
    r.factor = total > 0 ? Math.min(1, total / 0.02) : 0;
    r.cut = 1 - r.factor;
    r.monthsEarly = r.cut > 0.00005 ? Math.max(0, named * 12 - age) : 0;
    r.full = r.eligible && r.monthsEarly === 0;
    r.base = svc * total * fc / 12;
    r.monthly = r.base;
    r.earliestText = "CalSTRS needs at least 5 years of service and age 55." + (inp.formula === "2@60" ? " (With 30 years, 2% at 60 members can retire from 50 at lower factors. Ask CalSTRS for those.)" : "");
    r.cutText = r.monthsEarly > 0 ? "At this age your age factor would be " + pct2(total) + " a year, " + Math.round(r.cut * 100) + "% lower than the 2% you'd get at " + named + ". It keeps rising to 2.4%."
      : "Your age factor would be " + pct2(total) + " a year" + (total >= 0.024 - 1e-9 ? ", the highest CalSTRS pays." : ". It keeps rising to 2.4%.");
    if (r.capped) steps.push(["Final compensation counted: " + money(fc) + " a year", "2% at 62 members can't count pay above " + money(CAP_62) + " a year (2026-27 limit).", SRC.limits, "CalSTRS: Limits"]);
    steps.push(["Age factor: " + pct2(af) + " per year of service", "CalSTRS's " + NAMES[inp.formula] + " table at age " + Math.floor(age / 12) + (age % 12 ? " and " + age % 12 + " months. We estimate the months between CalSTRS's yearly factors." : "."), SRC.age, "CalSTRS: Age factor"]);
    if (career > 0) steps.push(["Career factor: +" + pct2(career), "2% at 60 members with 30 or more years of earned service get 0.2% more, up to a total of 2.4%.", SRC.enh, "CalSTRS: Benefit enhancements"]);
    steps.push(["CalSTRS pension: " + money(r.base) + " a month", round2(svc) + " years × " + pct2(total) + " × " + money(fc) + " final compensation ÷ 12. Member-Only Benefit, which pays only you.", SRC.handbook, "CalSTRS: Member Handbook 2026"]);
    r.steps = steps;
    return r;
  }
  var SURVIVOR_OPTIONS = [
    { id: "single", label: "Pays only me", desc: "The Member-Only Benefit, the largest payment. It stops when you die." },
    { id: "opt100", label: "Keeps paying my beneficiary the full amount", desc: "100% Beneficiary Option. Your payment is lower, and your beneficiary gets all of it for life." },
    { id: "opt75", label: "Keeps paying my beneficiary three-quarters", desc: "75% Beneficiary Option. Your payment is lower, and your beneficiary gets 75% of it for life." },
    { id: "opt50", label: "Keeps paying my beneficiary half", desc: "50% Beneficiary Option. Your payment is a little lower, and your beneficiary gets half of it for life." }
  ];
  function survivorOption(id) {
    var how = "CalSTRS lowers your payment by a factor based on your age and your beneficiary's age. Your CalSTRS estimate shows the exact amount.";
    var share = { opt100: 1, opt75: 0.75, opt50: 0.5 }[id];
    if (share) return { id: id, name: Math.round(share * 100) + "% Beneficiary Option", factor: 1, known: false, survivorShare: share, how: how };
    return { id: "single", name: "Member-Only Benefit (pays only you)", factor: 1, known: true, survivorShare: 0, how: "" };
  }
  function money(v) { return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pct2(f) { return (f * 100).toFixed(2) + "%"; }
  function round2(v) { return Math.round(v * 100) / 100; }

  R.pensions = R.pensions || {};
  R.pensions.calstrs = { name: "CalSTRS", NAMES: NAMES, F: F, CAP_62: CAP_62, SRC: SRC, ageFactor: ageFactor, calcPension: calcPension,
    SURVIVOR_OPTIONS: SURVIVOR_OPTIONS, survivorOption: survivorOption };
})(window.RetirementRules = window.RetirementRules || {});
