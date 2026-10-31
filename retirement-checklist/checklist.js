// Retirement countdown checklist: remembers ticked steps on this device only, dates each step from the reader's
// retirement month and 65th birthday, and builds a calendar file (.ics) with every step.
(function () {
  var KEY = "retirement-checklist", DKEY = "retirement-checklist-dates";
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var $ = function (id) { return document.getElementById(id); };
  var boxes = document.querySelectorAll('.checklist input[type="checkbox"]');
  function load(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var done = load(KEY);
  function count() {
    var n = 0; boxes.forEach(function (b) { if (b.checked) n++; });
    $("check-count").textContent = n + " of " + boxes.length + " steps done";
  }
  boxes.forEach(function (b) {
    b.checked = !!done[b.id];
    b.addEventListener("change", function () { if (b.checked) done[b.id] = 1; else delete done[b.id]; save(KEY, done); count(); });
  });
  $("check-clear").addEventListener("click", function () {
    boxes.forEach(function (b) { b.checked = false; }); done = {}; save(KEY, done); count();
  });
  count();

  // When each step is due, in months from the retirement month ("r") or from the month you turn 65 ("m").
  var WHEN = {
    "c-records": ["r", -36], "c-ssacct": ["r", -36], "c-health": ["r", -36], "c-fehb": ["r", -36], "c-drs-records": ["r", -36],
    "c-pers-est": ["r", -24], "c-fers-est": ["r", -24], "c-drs-est": ["r", -24], "c-planner": ["r", -24],
    "c-date": ["r", -12], "c-class": ["r", -12], "c-survivor": ["r", -12], "c-savings": ["r", -12],
    "c-ss-app": ["r", -4], "c-pers-app": ["r", -3], "c-fers-app": ["r", -3], "c-drs-app": ["r", -3], "c-health-switch": ["r", -3], "c-tax": ["r", -2],
    "c-medicare": ["m", -3], "c-penalty": ["m", -3],
    "c-work": ["r", 1], "c-option-check": ["r", 2], "c-first-pay": ["r", 3]
  };
  var monthOpts = MONTHS.map(function (m, i) { return '<option value="' + (i + 1) + '">' + m + "</option>"; }).join("");
  $("cl-ret-m").innerHTML = monthOpts; $("cl-b-m").innerHTML = monthOpts;
  var d = load(DKEY);
  if (d.rm) $("cl-ret-m").value = d.rm; if (d.ry) $("cl-ret-y").value = d.ry; if (d.bm) $("cl-b-m").value = d.bm; if (d.by) $("cl-b-y").value = d.by;

  function idx(y, m) { return y * 12 + (m - 1); }                  // months since year 0
  function label(i) { return MONTHS[i % 12] + " " + Math.floor(i / 12); }
  function dates() {
    var ry = +$("cl-ret-y").value, rm = +$("cl-ret-m").value, by = +$("cl-b-y").value, bm = +$("cl-b-m").value;
    if (!(ry >= 2000 && ry <= 2100)) return null;
    var r = idx(ry, rm), m65 = by >= 1900 && by <= 2100 ? idx(by + 65, bm) : null;
    var out = {};
    Object.keys(WHEN).forEach(function (id) { var w = WHEN[id]; var base = w[0] === "r" ? r : m65; if (base != null) out[id] = base + w[1]; });
    return out;
  }
  function paint() {
    var ds = dates();
    save(DKEY, { rm: $("cl-ret-m").value, ry: $("cl-ret-y").value, bm: $("cl-b-m").value, by: $("cl-b-y").value });
    boxes.forEach(function (b) {
      var title = b.parentNode.querySelector(".step-title"), tag = title.querySelector(".due");
      if (!ds || ds[b.id] == null) { if (tag) tag.remove(); return; }
      if (!tag) { tag = document.createElement("span"); tag.className = "due"; title.appendChild(tag); }
      tag.textContent = "By " + label(ds[b.id]);
    });
    $("cl-ics").disabled = !ds;
    $("cl-note").textContent = ds ? "Your retirement month is " + label(idx(+$("cl-ret-y").value, +$("cl-ret-m").value)) + ". Each step now shows its month." : "";
  }
  ["cl-ret-m", "cl-ret-y", "cl-b-m", "cl-b-y"].forEach(function (id) { $(id).addEventListener("input", paint); $(id).addEventListener("change", paint); });
  paint();

  function esc(s) { return s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n"); }
  function fold(line) { var out = []; while (line.length > 73) { out.push(line.slice(0, 73)); line = " " + line.slice(73); } out.push(line); return out.join("\r\n"); }
  $("cl-ics").addEventListener("click", function () {
    var ds = dates(); if (!ds) return;
    var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Public Pension Planner//Countdown checklist//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    boxes.forEach(function (b) {
      if (ds[b.id] == null) return;
      var y = Math.floor(ds[b.id] / 12), m = ds[b.id] % 12 + 1;
      var day = y + (m < 10 ? "0" : "") + m + "01", next = new Date(Date.UTC(y, m - 1, 2)).toISOString().slice(0, 10).replace(/-/g, "");
      var li = b.parentNode, title = li.querySelector("label").textContent.trim(), tag = li.querySelector(".tag");
      var text = (li.querySelector("p") || {}).textContent || "";
      lines.push("BEGIN:VEVENT", "UID:" + b.id + "-" + day + "@publicpensionplanner.com", "DTSTAMP:" + stamp, "DTSTART;VALUE=DATE:" + day, "DTEND;VALUE=DATE:" + next,
        fold("SUMMARY:" + esc("Retirement: " + title + (tag ? " (" + tag.textContent + ")" : ""))),
        fold("DESCRIPTION:" + esc(text.trim() + "\n\nFrom your countdown checklist: https://publicpensionplanner.com/retirement-checklist/")),
        "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc(title), "TRIGGER:PT9H", "END:VALARM", "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    var blob = new Blob([lines.join("\r\n") + "\r\n"], { type: "text/calendar" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "retirement-checklist.ics"; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    $("cl-note").textContent = "Your calendar file is downloading. Open it to add the reminders.";
  });
})();
