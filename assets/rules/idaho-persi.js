// Idaho PERSI (persi.idaho.gov) Base Plan: general members and police/firefighter members.
// Registers window.RetirementRules.pensions.persi. The early retirement chart is PERSI's whole-year table;
// we estimate the months in between on a straight line.
(function (R) {
  var SRC = {
    handbook: "https://www.persi.idaho.gov/docs/news/publications/PERSI-Member-Handbook.pdf",
    early: "https://www.persi.idaho.gov/docs/brochures/Early-Retirement.pdf",
    options: "https://www.persi.idaho.gov/docs/brochures/Retirement-Options.pdf"
  };
  // Reduction in % for 0 to 10 years (or points) early.
  var CUT = [0, 3, 6, 9, 12, 15, 20.75, 26.5, 32.25, 38, 43.75];
  var CLS = {
    GEN: { name: "general member", mult: 0.02, sra: 65, rule: 90, earliest: 55 },
    PF: { name: "police and firefighter member", mult: 0.023, sra: 60, rule: 80, earliest: 50 }
  };
  function cutFor(monthsEarly) {
    if (monthsEarly <= 0) return 0;
    var y = Math.floor(monthsEarly / 12), m = monthsEarly % 12;
    if (y >= 10) return CUT[10] / 100;
    return (CUT[y] + (CUT[y + 1] - CUT[y]) * m / 12) / 100;
  }
  // inp: { cls: "GEN" | "PF", ageMonths, svc (years), fc (yearly average salary, highest 42 months in a row) }
  function calcPension(inp) {
    var c = CLS[inp.cls] || CLS.GEN, age = inp.ageMonths, svcM = Math.round(inp.svc * 12), steps = [];
    var ams = inp.fc / 12;
    var base = c.mult * inp.svc * ams;
    var toSra = Math.max(0, c.sra * 12 - age), toRule = Math.max(0, c.rule * 12 - age - svcM);
    var early = Math.min(toSra, toRule);
    var cut = cutFor(early);
    var r = { known: true, base: base, cut: cut, factor: 1 - cut, monthsEarly: early, cls: c };
    r.eligible = svcM >= 60 && age >= c.earliest * 12;
    r.full = r.eligible && early === 0;
    r.monthly = base * r.factor;
    r.earliestText = "PERSI needs at least 5 years of service, and " + c.name + "s can start at " + c.earliest + " at the earliest.";
    r.cutText = early > 0 ? "PERSI would cut your pension " + (Math.round(cut * 10000) / 100) + "% for life, because you'd be " + yrs(early) + " short of " + (toSra <= toRule ? "age " + c.sra : "the Rule of " + c.rule) + "."
      : "No early-retirement cut: " + (toSra === 0 ? "you'd be " + c.sra + " or older." : "your age plus service would reach " + c.rule + " (the Rule of " + c.rule + ").");
    steps.push(["Pension before any cut: " + money(base) + " a month", (c.mult * 100).toFixed(1) + "% × " + round2(inp.svc) + " years × " + money(ams) + " average monthly salary", SRC.handbook, "PERSI: Member Handbook"]);
    if (early > 0) steps.push(["Early retirement cut: " + (Math.round(cut * 10000) / 100) + "%", "PERSI uses the smaller gap: " + yrs(toSra) + " to age " + c.sra + ", or " + yrs(toRule) + " to the Rule of " + c.rule + ". The cut is 3% a year for the first 5 years and 5.75% a year after that. We estimate partial years between PERSI's yearly figures.", SRC.early, "PERSI: Early Retirement"]);
    steps.push(["PERSI pension: " + money(r.monthly) + " a month", "Regular option, which pays only you, for life.", SRC.options, "PERSI: Retirement Options"]);
    r.steps = steps;
    return r;
  }
  var SURVIVOR_OPTIONS = [
    { id: "single", label: "Pays only me", desc: "The Regular option, the largest payment. It stops when you die." },
    { id: "opt1", label: "Keeps paying my contingent annuitant the full amount", desc: "Option 1. Your payment is lower, and the person you name gets the same amount for life." },
    { id: "opt2", label: "Keeps paying my contingent annuitant half", desc: "Option 2. Your payment is a little lower, and the person you name gets half of it for life." }
  ];
  function survivorOption(id) {
    var how = "PERSI lowers your payment by a factor based on your age and the age of the person you name. Your PERSI estimate shows the exact amount.";
    if (id === "opt1") return { id: id, name: "Option 1 (100% to your contingent annuitant)", factor: 1, known: false, survivorShare: 1, how: how };
    if (id === "opt2") return { id: id, name: "Option 2 (50% to your contingent annuitant)", factor: 1, known: false, survivorShare: 0.5, how: how };
    return { id: "single", name: "Regular (pays only you)", factor: 1, known: true, survivorShare: 0, how: "" };
  }
  function yrs(m) { var y = Math.floor(m / 12), mm = m % 12; return (y ? y + (y === 1 ? " year" : " years") : "") + (y && mm ? " and " : "") + (mm ? mm + (mm === 1 ? " month" : " months") : "") || "0 months"; }
  function money(v) { return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function round2(v) { return Math.round(v * 100) / 100; }

  R.pensions = R.pensions || {};
  R.pensions.persi = { name: "Idaho PERSI", CLS: CLS, CUT: CUT, SRC: SRC, cutFor: cutFor, calcPension: calcPension,
    SURVIVOR_OPTIONS: SURVIVOR_OPTIONS, survivorOption: survivorOption };
})(window.RetirementRules = window.RetirementRules || {});
