// CalPERS (calpers.ca.gov): the three most common miscellaneous formulas, PEPRA 2% at 62 and classic 2% at 55 and 2% at 60.
// Registers window.RetirementRules.pensions.calpers. Benefit factors are CalPERS's published charts, in quarter-year steps.
// Check the PEPRA pay cap each January (CalPERS circular letter on compensation limits).
(function (R) {
  var SRC = {
    charts: "https://www.calpers.ca.gov/members/retirement-benefits/benefit-factor-charts",
    f62: "https://www.calpers.ca.gov/documents/state-miscellaneous-industrial-member-2-at-62-benefit-factors-pdf/download?inline",
    f55: "https://calpers.ca.gov/documents/benefit-factors-school-2-at-55/download",
    f60: "https://www.calpers.ca.gov/documents/local-miscellaneous-member-2-at-60-benefit-factors-pdf/download?inline",
    plan: "https://www.calpers.ca.gov/documents/planning-service-retirement/download",
    limits: "https://www.calpers.ca.gov/employers/policies-and-procedures/circular-letters/200-001-26",
    pepra: "https://www.calpers.ca.gov/documents/summary-pension-act/download"
  };
  // Each row is one age: the factor (in %) at the exact year, 1/4, 1/2 and 3/4. The last row holds from then on.
  var F = {
    "2@62": { first: 52, named: 62, rows: { 52: [1.000, 1.025, 1.050, 1.075], 53: [1.100, 1.125, 1.150, 1.175], 54: [1.200, 1.225, 1.250, 1.275], 55: [1.300, 1.325, 1.350, 1.375], 56: [1.400, 1.425, 1.450, 1.475], 57: [1.500, 1.525, 1.550, 1.575], 58: [1.600, 1.625, 1.650, 1.675], 59: [1.700, 1.725, 1.750, 1.775], 60: [1.800, 1.825, 1.850, 1.875], 61: [1.900, 1.925, 1.950, 1.975], 62: [2.000, 2.025, 2.050, 2.075], 63: [2.100, 2.125, 2.150, 2.175], 64: [2.200, 2.225, 2.250, 2.275], 65: [2.300, 2.325, 2.350, 2.375], 66: [2.400, 2.425, 2.450, 2.475], 67: [2.500, 2.500, 2.500, 2.500] } },
    "2@55": { first: 50, named: 55, rows: { 50: [1.100, 1.146, 1.190, 1.236], 51: [1.280, 1.326, 1.370, 1.416], 52: [1.460, 1.506, 1.550, 1.596], 53: [1.640, 1.686, 1.730, 1.776], 54: [1.820, 1.866, 1.910, 1.956], 55: [2.000, 2.016, 2.032, 2.048], 56: [2.064, 2.080, 2.096, 2.110], 57: [2.126, 2.142, 2.158, 2.172], 58: [2.188, 2.204, 2.220, 2.236], 59: [2.250, 2.268, 2.282, 2.298], 60: [2.314, 2.330, 2.346, 2.360], 61: [2.376, 2.392, 2.406, 2.422], 62: [2.438, 2.454, 2.470, 2.486], 63: [2.500, 2.500, 2.500, 2.500] } },
    "2@60": { first: 50, named: 60, rows: { 50: [1.092, 1.108, 1.124, 1.140], 51: [1.156, 1.172, 1.190, 1.206], 52: [1.224, 1.242, 1.260, 1.278], 53: [1.296, 1.316, 1.336, 1.356], 54: [1.376, 1.396, 1.418, 1.438], 55: [1.460, 1.482, 1.506, 1.528], 56: [1.552, 1.576, 1.600, 1.626], 57: [1.650, 1.678, 1.704, 1.730], 58: [1.758, 1.786, 1.816, 1.846], 59: [1.874, 1.906, 1.938, 1.970], 60: [2.000, 2.034, 2.068, 2.100], 61: [2.134, 2.168, 2.202, 2.238], 62: [2.272, 2.308, 2.346, 2.382], 63: [2.418, 2.418, 2.418, 2.418] } }
  };
  var NAMES = { "2@62": "PEPRA 2% at 62", "2@55": "classic 2% at 55", "2@60": "classic 2% at 60" };
  var PEPRA_CAP = 191679;   // 2026 PEPRA limit for jobs not covered by Social Security ($159,733 if covered)

  // Benefit factor (a fraction, like 0.02) at an age in months, using the quarter-year step at or below that age.
  function factor(formula, ageMonths) {
    var t = F[formula], ages = Object.keys(t.rows).map(Number), top = Math.max.apply(null, ages);
    var y = Math.floor(ageMonths / 12), q = Math.floor((ageMonths % 12) / 3);
    if (y < t.first) return 0;
    if (y >= top) return t.rows[top][0] / 100;
    return t.rows[y][q] / 100;
  }
  function topAge(formula) { return Math.max.apply(null, Object.keys(F[formula].rows).map(Number)); }

  // inp: { formula: "2@62" | "2@55" | "2@60", ageMonths, svc (years), fc (yearly final compensation) }
  function calcPension(inp) {
    var t = F[inp.formula], age = inp.ageMonths, svc = inp.svc, steps = [];
    var pepra = inp.formula === "2@62";
    var fc = pepra ? Math.min(inp.fc, PEPRA_CAP) : inp.fc;
    var bf = factor(inp.formula, age), named = t.rows[t.named][0] / 100;
    var r = { known: true, bf: bf, named: t.named, top: topAge(inp.formula), capped: pepra && inp.fc > PEPRA_CAP };
    r.eligible = svc >= 5 && age >= t.first * 12;
    r.factor = bf > 0 ? Math.min(1, bf / named) : 0;
    r.cut = 1 - r.factor;
    r.monthsEarly = Math.max(0, t.named * 12 - age);
    r.full = r.eligible && r.monthsEarly === 0;
    r.base = svc * bf * fc / 12;
    r.monthly = r.base;
    r.earliestText = "CalPERS needs at least 5 years of service, and " + NAMES[inp.formula] + " members can start at " + t.first + " at the earliest.";
    r.cutText = r.monthsEarly > 0 ? "At this age your benefit factor would be " + pct3(bf) + " a year, " + Math.round(r.cut * 100) + "% lower than the " + pct3(named) + " you'd get at " + t.named + ". It keeps rising until " + r.top + "."
      : "Your benefit factor would be " + pct3(bf) + " a year" + (age >= r.top * 12 ? ", the highest this formula pays." : ". It keeps rising until " + r.top + ".");
    var src = pepra ? SRC.f62 : inp.formula === "2@55" ? SRC.f55 : SRC.f60;
    if (r.capped) steps.push(["Final compensation counted: " + money(fc) + " a year", "PEPRA members can't count pay above " + money(PEPRA_CAP) + " a year (2026 limit for jobs without Social Security; " + money(159733) + " if your job pays into Social Security).", SRC.limits, "CalPERS: 2026 compensation limits"]);
    steps.push(["Benefit factor: " + pct3(bf) + " per year of service", "From CalPERS's " + NAMES[inp.formula] + " chart at age " + Math.floor(age / 12) + (age % 12 >= 3 ? " and " + ["", "a quarter", "a half", "three quarters"][Math.floor((age % 12) / 3)] : "") + ". CalPERS counts your age in quarter years.", src, "CalPERS: " + NAMES[inp.formula] + " benefit factors"]);
    steps.push(["CalPERS pension: " + money(r.base) + " a month", round2(svc) + " years × " + pct3(bf) + " × " + money(fc) + " final compensation ÷ 12. Unmodified allowance, which pays only you.", SRC.plan, "CalPERS: Planning Your Service Retirement"]);
    r.steps = steps;
    return r;
  }

  // Survivor options. The cut depends on both ages and CalPERS's factor tables, so we explain it instead of computing it.
  var SURVIVOR_OPTIONS = [
    { id: "single", label: "Pays only me", desc: "The Unmodified allowance, the largest payment. It stops when you die." },
    { id: "opt2", label: "Keeps paying my beneficiary the full amount", desc: "Option 2. Your payment is lower, and your beneficiary gets 100% of it for life after you die." },
    { id: "opt3", label: "Keeps paying my beneficiary half", desc: "Option 3. Your payment is a little lower, and your beneficiary gets 50% of it for life after you die." }
  ];
  function survivorOption(id) {
    var how = "CalPERS lowers your payment by a factor based on your age and your beneficiary's age. Your CalPERS estimate shows the exact amount.";
    if (id === "opt2") return { id: id, name: "Option 2 (100% to your beneficiary)", factor: 1, known: false, survivorShare: 1, how: how };
    if (id === "opt3") return { id: id, name: "Option 3 (50% to your beneficiary)", factor: 1, known: false, survivorShare: 0.5, how: how };
    return { id: "single", name: "Unmodified (pays only you)", factor: 1, known: true, survivorShare: 0, how: "" };
  }
  function money(v) { return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pct3(f) { return (f * 100).toFixed(3) + "%"; }
  function round2(v) { return Math.round(v * 100) / 100; }

  R.pensions = R.pensions || {};
  R.pensions.calpers = { name: "CalPERS", NAMES: NAMES, F: F, PEPRA_CAP: PEPRA_CAP, SRC: SRC, factor: factor, calcPension: calcPension,
    SURVIVOR_OPTIONS: SURVIVOR_OPTIONS, survivorOption: survivorOption };
})(window.RetirementRules = window.RetirementRules || {});
