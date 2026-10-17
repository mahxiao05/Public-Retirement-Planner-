// Federal Employees Retirement System (FERS) and Thrift Savings Plan rules (opm.gov, tsp.gov, 5 U.S.C. chapter 84).
// Registers window.RetirementRules.pensions.fers.
(function (R) {
  var SICK_HOURS_PER_MONTH = 2087 / 12;   // OPM converts unused sick leave using a 2,087-hour work year

  // Minimum Retirement Age in months, by birth year (5 U.S.C. 8412(h)).
  function mraMonths(by) {
    if (by < 1948) return 55 * 12;
    if (by <= 1952) return 55 * 12 + (by - 1947) * 2;
    if (by <= 1964) return 56 * 12;
    if (by <= 1969) return 56 * 12 + (by - 1964) * 2;
    return 57 * 12;
  }
  // Retirement type at an age (months) with service (years). special = law enforcement, firefighter or air traffic controller.
  function eligibility(ageM, svc, by, special) {
    var mra = mraMonths(by);
    if (special && ((ageM >= 50 * 12 && svc >= 20) || svc >= 25)) return { ok: true, kind: "special", supplement: ageM < 62 * 12, reduceMonths: 0, rule: "Special provisions: age 50 with 20 years, or any age with 25 years." };
    if (ageM >= 62 * 12 && svc >= 5) return { ok: true, kind: "62+5", supplement: false, reduceMonths: 0, rule: "Age 62 with at least 5 years: full annuity." };
    if (ageM >= 60 * 12 && svc >= 20) return { ok: true, kind: "60+20", supplement: true, reduceMonths: 0, rule: "Age 60 with at least 20 years: full annuity." };
    if (ageM >= mra && svc >= 30) return { ok: true, kind: "MRA+30", supplement: true, reduceMonths: 0, rule: "Your Minimum Retirement Age with at least 30 years: full annuity." };
    if (ageM >= mra && svc >= 10) return { ok: true, kind: "MRA+10", supplement: false, reduceMonths: Math.max(0, 62 * 12 - ageM), rule: "Your Minimum Retirement Age with 10 to 29 years: the annuity is reduced 5/12 of 1% for each full month you are under 62." };
    return { ok: false, kind: "none", supplement: false, reduceMonths: 0, rule: "Not yet eligible for an immediate annuity." };
  }
  // inp: { ageMonths, svc (years at retirement, before sick leave), sickHours, high3, by, special, survivor: "none" | "partial" | "full" }
  function calcPension(inp) {
    var el = eligibility(inp.ageMonths, inp.svc, inp.by, inp.special);
    var sickMonths = Math.floor(Math.max(0, inp.sickHours || 0) / SICK_HOURS_PER_MONTH);
    var months = Math.floor(inp.svc * 12) + sickMonths;   // whole months only
    var yrs = months / 12;
    var mult, base;
    if (inp.special && el.kind === "special") {   // 1.7% only for a special-provisions retirement (5 U.S.C. 8415(d))
      base = inp.high3 * (0.017 * Math.min(yrs, 20) + 0.01 * Math.max(0, yrs - 20));
      mult = yrs > 20 ? "1.7% for the first 20 years and 1% after" : "1.7%";
    } else {
      var m = inp.ageMonths >= 62 * 12 && inp.svc >= 20 ? 0.011 : 0.01;
      base = inp.high3 * m * yrs; mult = (m * 100).toFixed(1) + "%";
    }
    var reduce = el.kind === "MRA+10" ? el.reduceMonths * 5 / 1200 : 0;
    var unreduced = base / 12, afterAge = unreduced * (1 - reduce);
    var survCut = inp.survivor === "full" ? 0.10 : inp.survivor === "partial" ? 0.05 : 0;
    var survPays = inp.survivor === "full" ? 0.5 : inp.survivor === "partial" ? 0.25 : 0;
    return {
      eligible: el.ok, el: el, sickMonths: sickMonths, months: months, yrs: yrs, mult: mult,
      annualBase: base, unreduced: unreduced, reduce: reduce, afterAge: afterAge,
      survCut: survCut, monthly: afterAge * (1 - survCut), survivorMonthly: unreduced * survPays
    };
  }
  // FERS supplement: Social Security estimate at 62 × FERS years (rounded, max 40) ÷ 40. Paid until 62.
  function supplement(ssAt62, fersYears) {
    var y = Math.min(40, Math.round(fersYears));
    return { years: y, monthly: ssAt62 * y / 40 };
  }
  // Agency contributions: 1% automatic, plus 100% of the first 3% and 50% of the next 2% you put in.
  function agencyRate(empPct) {
    var e = Math.max(0, empPct);
    return 0.01 + Math.min(e, 3) / 100 + Math.max(0, Math.min(e, 5) - 3) / 200;
  }
  // inp: { balance, monthlyPay, empPct, years, ret }. Paid out in equal monthly installments over 20 years.
  function calcTSP(inp) {
    var rate = Math.max(0, inp.empPct) / 100 + agencyRate(inp.empPct);
    var months = Math.round(inp.years * 12);
    var r = Math.pow(1 + inp.ret, 1 / 12) - 1;
    var contrib = inp.monthlyPay * rate;
    var grow = Math.pow(1 + r, months);
    var fvBal = inp.balance * grow;
    var fvContrib = r === 0 ? contrib * months : contrib * (grow - 1) / r;
    var total = fvBal + fvContrib;
    var pay20 = r === 0 ? total / 240 : total * r / (1 - Math.pow(1 + r, -240));
    return { agency: agencyRate(inp.empPct), rate: rate, months: months, contrib: contrib, fvBal: fvBal, fvContrib: fvContrib, total: total, pay20: pay20, payoutMonths: 240 };
  }
  R.pensions = R.pensions || {};
  R.pensions.fers = {
    name: "FERS", SICK_HOURS_PER_MONTH: SICK_HOURS_PER_MONTH,
    mraMonths: mraMonths, eligibility: eligibility, calcPension: calcPension, supplement: supplement, agencyRate: agencyRate, calcTSP: calcTSP
  };
})(window.RetirementRules = window.RetirementRules || {});
