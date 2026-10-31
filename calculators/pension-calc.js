// Shared parts of the one-system pension calculators (FERS, Washington DRS, CalPERS, CalSTRS, Idaho PERSI).
// Each page reads its own fields and passes a compute(ageMonths, years) function that calls the official rules in
// assets/rules/. This draws the answer sentence, the "if you keep working" table and the math steps.
(function () {
  var C = window.Calc;
  function link(url, label) { return url ? '<a href="' + url + '" target="_blank" rel="noopener">' + label + "</a>" : null; }
  function yrs(v) { var r = Math.round(v * 10) / 10; return r + (r === 1 ? " year" : " years"); }
  window.PensionCalc = {
    // opt: { name, prefix, read() -> {age, svc}, compute(ageMonths, svc) -> {eligible, monthly, steps, cutText, earliestText}, maxAge }
    setup: function (opt) {
      var p = opt.prefix;
      function run() {
        var s = opt.read(), age = Math.round(s.age), svc = s.svc;
        var r = opt.compute(age * 12, svc);
        var lead = C.$(p + "-lead");
        if (!svc || !age) { lead.innerHTML = "Enter your age and years of service to see your estimate."; }
        else if (r.eligible) {
          lead.innerHTML = "Retiring at " + age + " with " + yrs(svc) + ", " + opt.name + " would pay you about<big>" + C.usd(r.monthly) + " a month</big>(" + C.usd(r.monthly * 12) +
            " a year) before taxes, for the rest of your life." + (r.cutText ? " " + r.cutText : "");
        } else {
          lead.innerHTML = "At " + age + " with " + yrs(svc) + ", you couldn't start your " + opt.name + " pension yet. " + (r.earliestText || "") +
            " The table below shows when you could, if you keep working.";
        }
        // This age, then (skipping years you couldn't retire yet) five more years of working
        var rows = [], top = opt.maxAge || 70, start = age + 1;
        while (start < top && !opt.compute(start * 12, svc + start - age).eligible) start++;
        if (start >= top) start = age + 1;
        var ages = [age];
        for (var b = start; b <= Math.min(start + 4, top); b++) ages.push(b);
        for (var i = 0; i < ages.length; i++) {
          var a = ages[i];
          var y = svc + (a - age), t = opt.compute(a * 12, y);
          rows.push("<tr" + (a === age ? ' class="now"' : "") + "><td>" + a + "</td><td>" + Math.round(y * 10) / 10 + '</td><td class="amt">' + (t.eligible ? C.usd(t.monthly) : "Not yet") + "</td></tr>");
        }
        C.$(p + "-rows").innerHTML = rows.join("");
        C.$(p + "-steps").innerHTML = (r.steps || []).map(function (st) { return C.step(st[0], st[1], link(st[2], st[3])); }).join("");
      }
      C.watch(run);
    }
  };
})();
