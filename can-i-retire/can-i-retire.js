// "Can I retire?": a short set of questions and a one-sentence answer, with Social Security at 62, full retirement age or 70.
// The rules live in ../assets/rules/*.js. Answers are kept on this device (localStorage "can-i-retire"), and can be
// shared as a link: they go after the # in the address, which browsers never send to a server.
(function () {
  var R = window.RetirementRules, SS = R.socialSecurity, P = R.pensions;
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var GROWTH = 0.04, PAYOUT_TO = 90 * 12, KEY = "can-i-retire";

  var $ = function (id) { return document.getElementById(id); };
  var usd = function (v) { return Math.round(v).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); };
  var usd2 = function (v) { return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var num = function (v, d) { return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var pct = function (v) { return Math.round(v * 1000) / 10 + "%"; };
  var ageTxt = function (m) { var y = Math.floor(m / 12), mm = m % 12; return y + (mm ? " and " + mm + (mm === 1 ? " month" : " months") : ""); };
  function val(id) { var v = parseFloat($(id).value); return isFinite(v) ? v : 0; }
  function radio(name) { var r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : null; }
  var info = function (key) { return window.SiteInfo ? window.SiteInfo.button(key) : ""; };
  function step(t, calc, src) { return "<li><strong>" + t + "</strong><span class=\"calc\">" + calc + "</span>" + (src ? '<span class="src">Source: ' + src + "</span>" : "") + "</li>"; }
  function link(url, text) { return '<a href="' + url + '" target="_blank" rel="noopener">' + text + "</a>"; }

  var today = new Date();
  function inputs() {
    var by = Math.round(val("birth-y")), bm = +$("birth-m").value;
    return {
      system: radio("system"), by: by, bm: bm, nowMonths: (today.getFullYear() - by) * 12 + (today.getMonth() + 1 - bm),
      retMonths: Math.max(0, Math.round(val("ret-y"))) * 12 + (+$("ret-m").value),
      plan: radio("plan"), cls: radio("cls"), dplan: radio("dplan"), dhire: radio("dhire"), special: radio("fjob") === "spec",
      svc: Math.max(0, val("svc")), pay: Math.max(0, val("pay")), otherPen: Math.max(0, val("other-pen")),
      savBal: Math.max(0, val("sav-bal")), savAdd: Math.max(0, val("sav-add")),
      ssMode: radio("ssmode"), ssStmt: Math.max(0, val("ss-stmt")), ssPay: Math.max(0, val("ss-pay")), ssYrs: Math.max(0, val("ss-yrs")),
      need: Math.max(0, val("need"))
    };
  }
  function dateAt(inp, m) { var t = inp.bm - 1 + m; return MONTHS[t % 12] + " " + (inp.by + Math.floor(t / 12)); }

  // ---------- each system's pension at the chosen age ----------
  // Returns { name, eligible, monthly, cut (0 to 1), cutText, earliestText, steps[], supplement? }
  var SYSTEMS = {
    pers: function (inp) {
      var PERS = P["or-pers"];
      var p = PERS.calcPension({ plan: inp.plan, cls: inp.cls, ageMonths: inp.retMonths, svc: inp.svc, salaries: [inp.pay, inp.pay, inp.pay] });
      var who = PERS.NAMES[inp.plan] + (inp.cls === "PF" ? " police and fire" : " general service");
      return {
        name: "PERS pension", eligible: p.eligible && inp.svc >= 5, monthly: p.monthly, cut: 1 - p.factor,
        cutText: p.monthsEarly > 0 ? "PERS would cut your pension " + pct(1 - p.factor) + " for life, because " + ageTxt(inp.retMonths) + " is before your full-benefit age of " + ageTxt(p.ages.normal) + "." : "No early-retirement cut: " + (p.ages.normal === 0 ? "with 30 years you get a full pension at any age." : "you'd be at or past your full-benefit age of " + ageTxt(p.ages.normal) + "."),
        earliestText: inp.svc < 5 ? "PERS generally needs at least 5 years of service before it pays a pension." : who + " members can't start a PERS pension before " + ageTxt(p.ages.earliest) + ".",
        note: inp.plan !== "OPSRP" ? "Tier One and Tier Two members may get more from Money Match. The full planner checks it." : null,
        steps: [
          step("Average pay: " + usd(p.fasAnnual) + " a year", p.anyCapped ? "Capped at PERS's salary limit of " + usd(PERS.SALARY_LIMIT) + "." : "The average of your best years, as you entered it.", link("https://www.oregon.gov/pers/mem/pages/tier-one-tier-two-overview-and-benefit-calculation.aspx", "Oregon PERS: benefit calculation")),
          step("Full Formula: " + usd2(p.baseMonthly) + " a month", num(p.mult * 100, 2) + "% × " + num(inp.svc, 1) + " years × " + usd2(p.fasMonthly) + " monthly pay", link("https://www.oregon.gov/pers/MEM/Pages/Benefit-Component-Comparisons.aspx", "Oregon PERS: multipliers and ages by plan")),
          step("Early retirement factor: " + num(p.factor, 3), p.ages.rule, link("https://www.oregon.gov/pers/Documents/Financials/AEFs/AEFs-1-1-26.pdf", "PERS Actuarial Equivalency Factors, 2026")),
          step("PERS pension: " + usd2(p.monthly) + " a month", "Option 1, which pays only you, for life.", null)
        ]
      };
    },
    drs: function (inp) {
      var D = P.drs;
      var p = D.calcPension({ plan: inp.dplan, hire: inp.dhire, ageMonths: inp.retMonths, svc: inp.svc, afc: inp.pay });
      return {
        name: "DRS pension", eligible: p.eligible, monthly: p.monthly, cut: p.cut, known: p.known,
        cutText: p.cutText, earliestText: p.earliestText,
        note: inp.dplan === "P3" ? "Plan 3 also has your own investment account. Include it in your savings on the savings question." : null,
        steps: p.steps.map(function (s) { return step(s[0], s[1], s[2] ? link(s[2], s[3]) : null); })
      };
    },
    fers: function (inp) {
      var F = P.fers;
      var p = F.calcPension({ ageMonths: inp.retMonths, svc: inp.svc, sickHours: 0, high3: inp.pay, by: inp.by, special: inp.special, survivor: "none" });
      var mra = F.mraMonths(inp.by);
      return {
        name: "FERS annuity", eligible: p.eligible, monthly: p.monthly, cut: p.reduce, el: p.el, yrs: p.yrs,
        cutText: p.reduce > 0 ? "Retiring under the MRA+10 rule cuts your annuity " + pct(p.reduce) + " for life, 5/12 of 1% for each month you're under 62." : "No early-retirement cut. " + p.el.rule,
        earliestText: inp.special ? "Special provisions retirement needs age 50 with 20 years, or 25 years at any age." : "Your Minimum Retirement Age is " + ageTxt(mra) + ", and you need at least 10 years of service by then (or 20 years at 60, or 5 years at 62).",
        steps: [
          step("Retirement type: " + p.el.kind, p.el.rule, link("https://www.opm.gov/retirement-center/fers-information/eligibility/", "OPM: FERS eligibility")),
          step("Multiplier: " + p.mult, "1% of your high-3 for each year, or 1.1% if you retire at 62 or older with 20 years." + (inp.special ? " Special provisions pay 1.7% for the first 20 years." : ""), link("https://www.opm.gov/retirement-center/fers-information/computation/", "OPM: FERS computation")),
          step("Annuity before any cut: " + usd2(p.unreduced) + " a month", usd(inp.pay) + " high-3 × " + p.mult + " × " + num(p.yrs, 2) + " years ÷ 12", null),
          step("FERS annuity: " + usd2(p.monthly) + " a month", p.reduce > 0 ? "After the MRA+10 cut of " + pct(p.reduce) + "." : "No reduction.", null)
        ]
      };
    },
    other: function (inp) {
      return { name: "Pension", eligible: true, monthly: inp.otherPen, cut: 0, cutText: inp.otherPen > 0 ? "We use the pension amount you entered from your own estimate." : "", earliestText: "", steps: [step("Pension: " + usd(inp.otherPen) + " a month", "The amount you entered.", null)] };
    }
  };

  // ---------- savings and Social Security ----------
  function savings(inp) {
    var r = Math.pow(1 + GROWTH, 1 / 12) - 1, n = Math.max(0, inp.retMonths - inp.nowMonths), g = Math.pow(1 + r, n);
    var atRet = inp.savBal * g + (r ? inp.savAdd * (g - 1) / r : inp.savAdd * n);
    var payMonths = Math.max(12, PAYOUT_TO - inp.retMonths);
    var monthly = atRet * r / (1 - Math.pow(1 + r, -payMonths));
    return { atRet: atRet, months: n, payMonths: payMonths, monthly: atRet > 0 ? monthly : 0 };
  }
  function pia(inp) {
    if (inp.ssMode === "none") return 0;
    if (inp.ssMode === "stmt") return inp.ssStmt;
    var e = SS.estimate(inp.ssPay, inp.ssYrs);
    return e.qualifies ? e.pia : 0;
  }
  function claimAges(inp) {
    var fra = SS.fraMonths(inp.by), first = Math.max(62 * 12, inp.nowMonths);
    var list = [first, fra, 70 * 12].filter(function (m) { return m >= first; });
    return list.filter(function (m, i) { return list.indexOf(m) === i; });
  }

  // ---------- the answer ----------
  var claim = null;
  function plan(inp, claimM) {
    var pen = SYSTEMS[inp.system](inp), sav = savings(inp), base = pia(inp);
    var ss = base * SS.claimFactor(claimM, SS.fraMonths(inp.by));
    var sup = 0;
    if (inp.system === "fers" && pen.eligible && pen.el.supplement && inp.retMonths < 62 * 12 && base > 0) sup = P.fers.supplement(base * SS.claimFactor(62 * 12, SS.fraMonths(inp.by)), pen.yrs).monthly;
    var supEnds = 62 * 12;
    function at(age) { return pen.monthly + sav.monthly + (sup && age < supEnds ? sup : 0) + (age >= claimM ? ss : 0); }
    var points = [inp.retMonths, claimM, sup ? supEnds : 0].filter(function (m) { return m >= inp.retMonths; });
    var steady = Math.max.apply(null, points);
    var before = at(inp.retMonths), after = at(steady);
    var low = Math.min.apply(null, points.map(at));
    return { pen: pen, sav: sav, pia: base, ss: ss, sup: sup, claim: claimM, before: before, after: after, low: low, at: at };
  }
  // Age (in months) when the total Social Security collected starting later catches up with starting earlier.
  function breakEven(aM, aAmt, bM, bAmt) { return bAmt > aAmt ? (bAmt * bM - aAmt * aM) / (bAmt - aAmt) : null; }

  function verdict(inp, pl) {
    if (!pl.pen.eligible) return { tag: "Not at that age", cls: "no" };
    if (!inp.need) return { tag: "Here's what you'd have", cls: "info" };
    if (pl.low >= inp.need) return { tag: "Yes, it looks like you can", cls: "yes" };
    if (pl.after >= inp.need && pl.before < inp.need) return { tag: "Yes, with a gap to cover", cls: "close" };
    if (pl.low >= inp.need * 0.9) return { tag: "Close", cls: "close" };
    return { tag: "Not yet", cls: "no" };
  }

  function render() {
    var inp = inputs(), ages = claimAges(inp), fra = SS.fraMonths(inp.by);
    if (ages.indexOf(claim) < 0) claim = ages.indexOf(fra) >= 0 ? fra : ages[0];
    var pl = plan(inp, claim), v = verdict(inp, pl), hasSS = pl.pia > 0;
    var tag = $("r-tag"); tag.textContent = v.tag; tag.className = "verdict-tag " + v.cls;
    var lead, more = [];
    if (!pl.pen.eligible) {
      lead = "Your " + pl.pen.name.replace(/^\w+ /, "") + " can't start at " + ageTxt(inp.retMonths) + ". " + pl.pen.earliestText;
      var e = earliest(inp); if (e != null) lead += " The earliest age that works with your answers is <strong>" + ageTxt(e) + "</strong>.";
    } else {
      lead = "If you retire at " + ageTxt(inp.retMonths) + " (" + dateAt(inp, inp.retMonths) + ")" + (hasSS ? " and start Social Security at " + ageTxt(claim) : "") + ", you'd have about<big>" + usd(pl.after) + " a month</big>";
      if (pl.before !== pl.after) lead += "once " + (hasSS && claim > inp.retMonths ? "Social Security starts in " + dateAt(inp, claim) : "the FERS supplement ends at 62") + ". In your first months of retirement you'd have about <strong>" + usd(pl.before) + " a month</strong>" + (pl.low < Math.min(pl.before, pl.after) ? ", dipping to " + usd(pl.low) + " between 62 and Social Security" : "") + ".";
      else lead += "before taxes.";
      if (inp.need) {
        var gap = pl.low - inp.need;
        lead += " You said you need " + usd(inp.need) + " a month, so " + (gap >= 0 ? "that leaves about <strong>" + usd(gap) + " to spare</strong>" + (pl.before !== pl.after ? " in the leanest years" : "") + "." : "you'd be about <strong>" + usd(-gap) + " a month short</strong>" + (pl.after >= inp.need ? " until Social Security starts, then " + usd(pl.after - inp.need) + " ahead" : "") + ".");
      }
      more.push("<p>" + pl.pen.cutText + "</p>");
      if (pl.pen.note) more.push("<p>" + pl.pen.note + "</p>");
      if (pl.sup) more.push("<p>Until 62 you'd also get a <strong>FERS supplement</strong> of about " + usd(pl.sup) + " a month." + info("supplement") + "</p>");
      if (pl.sav.monthly) more.push("<p>Your savings would be about " + usd(pl.sav.atRet) + " when you retire, paying about " + usd(pl.sav.monthly) + " a month until age 90.</p>");
      if (inp.system !== "other") {
        var later = {}; for (var k in inp) later[k] = inp[k]; later.retMonths += 12; later.svc += 1;
        var pl2 = plan(later, claim);
        if (pl2.pen.eligible && pl2.after > pl.after) more.push("<p><strong>One more year:</strong> working until " + ageTxt(later.retMonths) + " would raise your steady income to about " + usd(pl2.after) + " a month, " + usd(pl2.after - pl.after) + " more, from an extra year of service" + (pl.pen.cut > pl2.pen.cut ? " and a smaller early-retirement cut" : "") + ".</p>");
      }
      if (inp.retMonths < 65 * 12) more.push("<p><strong>Health insurance:</strong> Medicare starts at 65, so you'd need coverage for " + ageTxt(65 * 12 - inp.retMonths) + ". <a href=\"../guides/health-insurance-before-medicare/\">See your choices</a>.</p>");
      if (hasSS && claim < inp.retMonths && claim < fra) more.push("<p><strong>Working and collecting:</strong> starting Social Security before full retirement age while you still work can mean some of it is held back. <a href=\"../guides/social-security-earnings-test/\">How the earnings limit works</a>.</p>");
      if (inp.ssMode === "est" && !hasSS) more.push("<p>With fewer than 10 years of work paying Social Security tax, you likely don't have the 40 credits needed, so we left it out.</p>");
    }
    $("r-lead").innerHTML = lead;
    $("r-more").innerHTML = more.join("");

    // Social Security start-age buttons and comparison
    var cs = $("claim-btns").parentNode;
    cs.hidden = !hasSS || !pl.pen.eligible;
    $("claim-btns").innerHTML = ages.map(function (m) {
      var label = m === fra ? "At " + ageTxt(m) + " (full)" : "At " + ageTxt(m);
      return '<button type="button" class="btn ' + (m === claim ? "primary" : "secondary") + '" aria-pressed="' + (m === claim) + '" data-claim="' + m + '">' + label + "</button>";
    }).join("");
    var rows = ages.map(function (m) { return { m: m, p: plan(inp, m) }; });
    $("claim-cmp").innerHTML = rows.map(function (r, i) {
      var be = i ? breakEven(rows[0].m, rows[0].p.ss, r.m, r.p.ss) : null;
      return "<tr" + (r.m === claim ? ' class="picked"' : "") + '><td>' + ageTxt(r.m) + (r.m === fra ? " (full retirement age)" : "") + '</td><td data-label="Social Security">' + usd(r.p.ss) + ' a month</td><td data-label="All your income">' + usd(r.p.after) + ' a month</td><td data-label="Pays off past">' + (be ? "age " + ageTxt(Math.ceil(be)) + " (vs. " + ageTxt(rows[0].m) + ")" : "Starts soonest") + "</td></tr>";
    }).join("");
    $("breakeven-note").textContent = rows.length > 1 ? "Waiting means smaller total payments at first. The last column shows the age when the bigger payments catch up, ignoring raises and taxes. If you're married and earned more, waiting also raises what your spouse would get as a survivor." : "";

    // timeline
    var stops = [{ m: inp.retMonths, t: "You retire. Your " + (inp.system === "other" ? "pension" : pl.pen.name) + (pl.sav.monthly ? " and savings payments start" : " starts") + (pl.sup ? ", with the FERS supplement" : "") + ".", v: pl.before }];
    if (hasSS && claim > inp.retMonths) stops.push({ m: claim, t: "Social Security starts.", v: pl.at(claim) });
    if (pl.sup && inp.retMonths < 62 * 12) stops.push({ m: 62 * 12, t: "The FERS supplement ends at 62.", v: pl.at(62 * 12) });
    if (inp.retMonths < 65 * 12) stops.push({ m: 65 * 12, t: "Medicare starts. Sign up three months before.", v: null });
    stops.sort(function (a, b) { return a.m - b.m; });
    $("timeline").innerHTML = pl.pen.eligible ? stops.map(function (s) {
      return '<li class="stopi' + (s.v == null ? " note" : "") + '"><p class="when">' + dateAt(inp, s.m) + " · age " + ageTxt(s.m) + "</p><h3>" + s.t + "</h3>" + (s.v != null ? '<p class="total">' + usd(s.v) + " <small>a month before taxes</small></p>" : "") + "</li>";
    }).join("") : "<li class=\"stopi note\"><h3>Try a later age to see your timeline.</h3></li>";

    // next steps
    var nx = [];
    if (inp.system === "pers") nx.push("<li><strong>Ask PERS for an official estimate</strong> in your Online Member Services account, or call <span class=\"phone\">888-320-7377</span>.</li>");
    if (inp.system === "drs") nx.push("<li><strong>Get a DRS estimate</strong> in your online account at drs.wa.gov, or call DRS at <span class=\"phone\">800-547-6657</span>.</li>");
    if (inp.system === "fers") nx.push("<li><strong>Ask your agency's benefits office for a FERS annuity estimate.</strong> It includes service only your records show, like military time and sick leave.</li>");
    nx.push("<li><strong>Check your Social Security statement</strong> at ssa.gov/myaccount, so the amount we use matches your record.</li>");
    nx.push("<li><strong>Compare several dates</strong> in the full <a href=\"../planner/\">Retirement Date Planner</a>, which also covers your spouse.</li>");
    nx.push("<li><strong>Follow the deadlines</strong> in our <a href=\"../retirement-checklist/\">countdown checklist</a>.</li>");
    $("next-steps").innerHTML = nx.join("");

    // math
    var m = pl.pen.steps.slice();
    m.push(step("Savings: " + usd(pl.sav.monthly) + " a month", usd(inp.savBal) + " today plus " + usd(inp.savAdd) + " a month for " + pl.sav.months + " months, growing 4% a year, makes " + usd(pl.sav.atRet) + ". Paid in equal amounts for " + pl.sav.payMonths + " months, to age 90.", null));
    if (hasSS) m.push(step("Social Security at " + ageTxt(claim) + ": " + usd(pl.ss) + " a month", usd(pl.pia) + " at full retirement age (" + ageTxt(fra) + ") × " + num(SS.claimFactor(claim, fra), 3) + (claim < fra ? ". Starting early cuts it 5/9 of 1% a month for 36 months, then 5/12 of 1%." : claim > fra ? ". Waiting adds 2/3 of 1% a month." : ""), link(claim < fra ? "https://www.ssa.gov/oact/quickcalc/earlyretire.html" : "https://www.ssa.gov/benefits/retirement/planner/delayret.html", "Social Security: " + (claim < fra ? "starting early" : "waiting"))));
    if (inp.ssMode === "est" && hasSS) m.push(step("Social Security estimate: " + usd(pl.pia) + " at full retirement age", "From " + usd(inp.ssPay) + " a year for " + inp.ssYrs + " years, using SSA's benefit formula with the " + SS.BEND.year + " bend points. Your statement is more accurate.", link("https://www.ssa.gov/oact/cola/piaformula.html", "SSA: benefit formula")));
    $("math").innerHTML = m.join("");
    save(inp);
  }
  function earliest(inp) {
    for (var mm = Math.max(inp.nowMonths, 45 * 12); mm <= 75 * 12; mm++) {
      var t = {}; for (var k in inp) t[k] = inp[k]; t.retMonths = mm;
      if (SYSTEMS[inp.system](t).eligible) return mm;
    }
    return null;
  }

  // ---------- questions ----------
  var cur = "system";
  function steps() {
    var s = ["system", "birth", "when"], sys = radio("system");
    if (sys === "pers") s.push("pers"); if (sys === "drs") s.push("drs"); if (sys === "fers") s.push("fers");
    s.push(sys === "other" ? "other" : "service");
    return s.concat(["savings", "ss", "need"]);
  }
  function show(n, focus) {
    var list = steps(); if (list.indexOf(n) < 0) n = list[0];
    cur = n;
    var i = list.indexOf(n) + 1;
    document.querySelectorAll(".q").forEach(function (q) { q.hidden = q.getAttribute("data-step") !== n; });
    $("prog-label").textContent = "Question " + i + " of " + list.length;
    $("prog-fill").style.width = Math.round(i / list.length * 100) + "%";
    $("back").style.visibility = i === 1 ? "hidden" : "visible";
    $("next").textContent = i === list.length ? "See my answer" : "Next";
    var sys = radio("system");
    $("pay-label").textContent = sys === "fers" ? "Your high-3: average yearly pay in your best 3 years in a row" : sys === "drs" ? "Average yearly pay in your best " + (radio("dplan") === "P1" ? "2" : "5") + " years in a row" : "Average yearly pay in your 3 best-paid years";
    $("pay-help").textContent = sys === "fers" ? "Basic pay, before taxes. Locality pay counts; overtime and bonuses don't." : "Before taxes.";
    $("ss-stmt-box").hidden = radio("ssmode") !== "stmt"; $("ss-est-box").hidden = radio("ssmode") !== "est";
    previews();
    var h = document.querySelector('.q[data-step="' + n + '"] h2'); if (h && focus) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }
  function previews() {
    var inp = inputs();
    $("age-preview").textContent = inp.nowMonths >= 18 * 12 && inp.nowMonths < 100 * 12 ? "You're " + ageTxt(inp.nowMonths) + " today." : "";
    $("ret-preview").textContent = inp.retMonths >= inp.nowMonths && inp.nowMonths > 0 ? "That's " + dateAt(inp, inp.retMonths) + "." : "";
  }
  function err(n, msg) { var e = document.querySelector('[data-err="' + n + '"]'); if (e) { e.textContent = msg || ""; e.hidden = !msg; } return !msg; }
  function ok(n) {
    var inp = inputs();
    if (n === "birth") return err("birth", inp.by < 1940 || inp.by > today.getFullYear() - 18 ? "Enter your birth year as four digits, like 1965." : "");
    if (n === "when") return err("when", inp.retMonths < inp.nowMonths ? "That age has already passed. Enter " + ageTxt(inp.nowMonths) + " or older." : "");
    if (n === "service") return err("service", inp.pay <= 0 ? "Enter your average yearly pay." : "");
    return true;
  }
  function go(d) {
    var list = steps(), i = list.indexOf(cur);
    if (d > 0 && !ok(cur)) return;
    if (d > 0 && i === list.length - 1) { finish(); return; }
    show(list[Math.max(0, Math.min(list.length - 1, i + d))], true); window.scrollTo(0, 0);
  }
  function finish() {
    if (!ok("birth") || !ok("when")) { show(!ok("birth") ? "birth" : "when", true); return; }
    $("wizard").hidden = true; $("intro").hidden = true; $("results").hidden = false;
    render(); window.scrollTo(0, 0);
    var h = $("r-tag"); h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true });
  }

  // ---------- saving and sharing answers ----------
  var FIELDS = ["birth-m", "birth-y", "ret-y", "ret-m", "svc", "pay", "other-pen", "sav-bal", "sav-add", "ss-stmt", "ss-pay", "ss-yrs", "need"];
  var RADIOS = ["system", "plan", "cls", "dplan", "dhire", "fjob", "ssmode"];
  function snapshot() {
    var o = {}; FIELDS.forEach(function (f) { o[f] = $(f).value; }); RADIOS.forEach(function (r) { o[r] = radio(r); }); o.claim = claim; return o;
  }
  function restore(o) {
    if (!o) return false;
    FIELDS.forEach(function (f) { if (o[f] != null) $(f).value = o[f]; });
    RADIOS.forEach(function (r) { var el = o[r] && document.querySelector('input[name="' + r + '"][value="' + o[r] + '"]'); if (el) el.checked = true; });
    if (o.claim) claim = +o.claim;
    return true;
  }
  function save() { try { var o = snapshot(); o.saved = new Date().toISOString(); localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  $("next").addEventListener("click", function () { go(1); });
  $("back").addEventListener("click", function () { go(-1); });
  $("form").addEventListener("submit", function (e) { e.preventDefault(); go(1); });
  $("form").addEventListener("change", function () { show(cur); });
  $("form").addEventListener("input", previews);
  $("claim-btns").addEventListener("click", function (e) { var b = e.target.closest("[data-claim]"); if (!b) return; claim = +b.getAttribute("data-claim"); render(); });
  $("edit").addEventListener("click", function () { $("results").hidden = true; $("wizard").hidden = false; $("intro").hidden = false; show("system", true); });
  $("share").addEventListener("click", function () {
    var url = location.href.split("#")[0] + "#a=" + encodeURIComponent(btoa(JSON.stringify(snapshot())));
    var done = function () { $("share-note").textContent = "Link copied. Anyone you send it to will see these same answers."; };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt("Copy this link:", url); });
    else prompt("Copy this link:", url);
  });

  var fromLink = null;
  try { var m = location.hash.match(/a=([^&]+)/); if (m) fromLink = JSON.parse(atob(decodeURIComponent(m[1]))); } catch (e) {}
  var saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
  if (restore(fromLink)) finish();
  else { restore(saved); show("system"); }
})();
