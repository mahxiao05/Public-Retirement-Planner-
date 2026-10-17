// Social Security retirement, spouse and survivor rules (ssa.gov). Update each October when SSA publishes next year's figures.
// Registers window.RetirementRules.socialSecurity.
(function (R) {
  var BEND = { year: 2027, b1: 1340, b2: 8077 };   // PIA bend points for workers first eligible in 2027 (ssa.gov/oact/cola/piaformula.html)
  var TAX_MAX = 184500;                            // 2026 maximum taxable earnings (ssa.gov/oact/cola/cbb.html)
  var EARNINGS_LIMIT = { year: 2027, under: 25560, fraYear: 67920 };   // retirement earnings test (ssa.gov/oact/cola/rtea.html)

  function fraMonths(birthYear) {
    if (birthYear <= 1937) return 65 * 12;
    if (birthYear <= 1942) return 65 * 12 + (birthYear - 1937) * 2;
    if (birthYear <= 1954) return 66 * 12;
    if (birthYear <= 1959) return 66 * 12 + (birthYear - 1954) * 2;
    return 67 * 12;
  }
  // Multiplier on the worker's full-retirement-age amount (PIA) for starting at claimMonths (age in months).
  function claimFactor(claimMonths, fra) {
    if (claimMonths < fra) {
      var m = fra - claimMonths;
      return 1 - (Math.min(m, 36) * 5 / 900 + Math.max(0, m - 36) * 5 / 1200);   // 5/9 of 1%, then 5/12 of 1% a month
    }
    return 1 + (Math.min(claimMonths, 70 * 12) - fra) * 2 / 300;   // 2/3 of 1% a month (8% a year), born 1943 or later
  }
  // Spouse's benefit: up to 50% of the worker's PIA at the spouse's full retirement age; 25/36 of 1%, then 5/12 of 1% a month earlier. No increase for waiting past FRA.
  function spousalFactor(claimMonths, fra) {
    if (claimMonths >= fra) return 0.5;
    var m = fra - claimMonths;
    return 0.5 * (1 - (Math.min(m, 36) * 25 / 3600 + Math.max(0, m - 36) * 5 / 1200));
  }
  function pia(aime) {
    var p = 0.9 * Math.min(aime, BEND.b1) + 0.32 * Math.max(0, Math.min(aime, BEND.b2) - BEND.b1) + 0.15 * Math.max(0, aime - BEND.b2);
    return Math.floor(p * 10 + 1e-9) / 10;   // SSA rounds down to the dime
  }
  // Rough estimate: the same pay every covered year (today's dollars), capped at the taxable maximum; best 35 years, missing years count as zero.
  function estimate(yearlyPay, years) {
    var capped = Math.min(Math.max(0, yearlyPay), TAX_MAX);
    var counted = Math.min(35, Math.max(0, years));
    var aime = Math.floor(capped * counted / 35 / 12);
    return { capped: capped, counted: counted, aime: aime, pia: pia(aime), qualifies: years >= 10 };
  }
  R.socialSecurity = {
    BEND: BEND, TAX_MAX: TAX_MAX, EARNINGS_LIMIT: EARNINGS_LIMIT, EARLIEST: 62 * 12, LATEST: 70 * 12,
    fraMonths: fraMonths, claimFactor: claimFactor, spousalFactor: spousalFactor, pia: pia, estimate: estimate
  };
})(window.RetirementRules = window.RetirementRules || {});
