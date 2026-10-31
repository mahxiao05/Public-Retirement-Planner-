// My plan: reads what the site's tools saved in this browser (never sent anywhere) and shows it in one place.
// It runs once the page has loaded, after site.js has set up SiteShare.
document.addEventListener("DOMContentLoaded", function () {
  var $ = function (id) { return document.getElementById(id); };
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var SYS = { pers: "Oregon PERS", drs: "Washington DRS", fers: "Federal FERS", calpers: "CalPERS", calstrs: "CalSTRS", persi: "Idaho PERSI", other: "another pension" };
  var KEYS = ["can-i-retire", "retirement-planner", "retirement-checklist", "retirement-checklist-dates"];
  function get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var usd = function (v) { return Math.round(+v || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); };

  // Updates that change people's numbers. Newest first; "date" is when it went live.
  var CHANGES = [
    { date: "2026-10-24", text: "Added CalPERS, CalSTRS and Idaho PERSI to the planner and Can I retire?, a Social Security calculator, and a page of common questions.", href: "../calculators/" },
    { date: "2026-10-18", text: "Added Washington DRS to Can I retire?, plus calculators for FERS sick leave, military buyback, survivor options, savings and taxes.", href: "../calculators/" },
    { date: "2026-10-17", text: "Social Security figures for 2027: bend points of $1,340 and $8,077 and an earnings limit of $25,560.", href: "../guides/social-security-explained/" }
  ];
  var last = get("my-plan-last-visit");
  var fresh = CHANGES.filter(function (c) { return last && c.date > last; });
  if (fresh.length) { $("mp-changes").hidden = false; $("mp-change-list").innerHTML = fresh.map(function (c) { return '<li><a href="' + c.href + '">' + c.text + "</a></li>"; }).join(""); }
  set("my-plan-last-visit", new Date().toISOString().slice(0, 10));

  var q = get("can-i-retire");
  $("mp-quick").innerHTML = q ? "<p>You're in <strong>" + (SYS[q.system] || "your system") + "</strong>, born in " + MONTHS[(+q["birth-m"] || 1) - 1] + " " + q["birth-y"] + ", and looking at retiring at <strong>" + q["ret-y"] + (+q["ret-m"] ? " and " + q["ret-m"] + " months" : "") + "</strong>" + (+q.need ? ", needing about " + usd(q.need) + " a month" : "") + ".</p>" +
    (q.saved ? "<p class=\"help\">Saved " + new Date(q.saved).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + ".</p>" : "") +
    '<p><a class="btn primary" href="../can-i-retire/">See my answer again</a></p>'
    : '<p>You haven\'t used it on this device yet.</p><p><a class="btn primary" href="../can-i-retire/">Get a quick answer</a></p>';

  var p = get("retirement-planner");
  $("mp-planner").innerHTML = p && p["birth-y"] ? "<p>Your planner answers are saved: <strong>" + (SYS[p.system] || "Oregon PERS") + "</strong>, retiring at " + p["ret-y"] + (+p["ret-m"] ? " and " + p["ret-m"] + " months" : "") + (p.married === "yes" ? ", with your spouse included" : "") + ".</p>" +
    '<p><a class="btn primary" href="../planner/">Open my plan in the planner</a></p>'
    : '<p>No planner answers on this device yet.</p><p><a class="btn primary" href="../planner/">Start the planner</a></p>';

  var ticks = get("retirement-checklist") || {}, n = Object.keys(ticks).length, d = get("retirement-checklist-dates");
  var dateLine = d && d.ry ? "<p>Your retirement month is <strong>" + MONTHS[(+d.rm || 1) - 1] + " " + d.ry + "</strong>. " + monthsAway(+d.ry, +d.rm) + "</p>" : "";
  $("mp-check").innerHTML = "<p>You've ticked off <strong>" + n + "</strong> step" + (n === 1 ? "" : "s") + ".</p>" + dateLine + '<p><a class="btn primary" href="../retirement-checklist/">Open my checklist</a></p>';
  function monthsAway(y, m) {
    var now = new Date(), diff = (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth());
    if (diff < 0) return "That's passed. Congratulations on retiring!";
    if (diff === 0) return "That's this month.";
    return "That's " + (diff >= 12 ? Math.floor(diff / 12) + " year" + (diff >= 24 ? "s" : "") + (diff % 12 ? " and " : "") : "") + (diff % 12 ? diff % 12 + " month" + (diff % 12 === 1 ? "" : "s") : "") + " away.";
  }

  // Moving everything to another device: one link to this page carries every saved key (see SiteShare in site.js).
  function bundle() { var o = {}; KEYS.forEach(function (k) { var v = get(k); if (v) o[k] = v; }); return o; }
  function moveUrl() { return location.href.split("#")[0] + "#all=" + window.SiteShare.pack(bundle()); }
  function hasAny() { return Object.keys(bundle()).length > 0; }
  $("mp-link").addEventListener("click", function () {
    if (!hasAny()) { $("mp-note").textContent = "There's nothing saved on this device yet."; return; }
    window.SiteShare.copy(moveUrl(), $("mp-note"));
  });
  $("mp-email").addEventListener("click", function () {
    if (!hasAny()) { $("mp-note").textContent = "There's nothing saved on this device yet."; return; }
    window.SiteShare.email(moveUrl(), "My retirement plan", "Here is a link to everything I saved on Public Pension Planner: my answers and my checklist.");
  });
  window.addEventListener("hashchange", function () { if (/[#&]all=/.test(location.hash)) location.reload(); });
  var incoming = window.SiteShare && window.SiteShare.unpack("all");
  if (incoming && Object.keys(incoming).length) {
    var names = { "can-i-retire": "Can I retire? answers", "retirement-planner": "planner answers", "retirement-checklist": "checklist ticks", "retirement-checklist-dates": "checklist dates" };
    $("mp-import").hidden = false;
    $("mp-import-what").textContent = "This link holds your " + Object.keys(incoming).filter(function (k) { return names[k]; }).map(function (k) { return names[k]; }).join(", ") + ". Putting them here replaces anything already saved on this device.";
    var clearHash = function () { history.replaceState(null, "", location.pathname); };
    $("mp-import-yes").addEventListener("click", function () { KEYS.forEach(function (k) { if (incoming[k]) set(k, incoming[k]); }); clearHash(); location.reload(); });
    $("mp-import-no").addEventListener("click", function () { $("mp-import").hidden = true; clearHash(); });
  }
  $("mp-clear").addEventListener("click", function () {
    if (!confirm("Remove your saved answers, checklist ticks and dates from this device? This can't be undone.")) return;
    ["can-i-retire", "retirement-planner", "retirement-checklist", "retirement-checklist-dates", "my-plan-last-visit"].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    location.reload();
  });
});
