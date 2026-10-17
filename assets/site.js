// Public Retirement Planner: menu bar and reader settings (text size, colors, letters), shared by every page.
// The early part of this (applying saved settings before the page paints) is inlined in each page's <head> by tools/build.py.
(function () {
  var root = document.documentElement;
  var KEYS = { size: "site-size", theme: "site-theme", font: "site-font" };
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

  function apply(kind, value) {
    if (kind === "theme") { if (value === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", value); set(KEYS.theme, value === "auto" ? null : value); }
    if (kind === "size") { root.setAttribute("data-size", value); set(KEYS.size, value); }
    if (kind === "font") { root.setAttribute("data-font", value); set(KEYS.font, value); }
    sync();
  }
  function current(kind) {
    if (kind === "theme") return root.getAttribute("data-theme") || "auto";
    if (kind === "size") return root.getAttribute("data-size") || "1";
    return root.getAttribute("data-font") || "clear";
  }
  function sync() {
    document.querySelectorAll("[data-set]").forEach(function (b) {
      var parts = b.getAttribute("data-set").split(":");
      b.setAttribute("aria-pressed", current(parts[0]) === parts[1] ? "true" : "false");
    });
  }

  function toggle(btn, target, open) {
    var isOpen = open == null ? btn.getAttribute("aria-expanded") !== "true" : open;
    btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (target.classList.contains("site-nav")) target.classList.toggle("open", isOpen); else target.hidden = !isOpen;
    return isOpen;
  }

  function init() {
    var menuBtn = document.getElementById("menu-btn"), nav = document.getElementById("site-nav");
    var dispBtn = document.getElementById("display-btn"), panel = document.getElementById("display-panel");
    if (menuBtn && nav) menuBtn.addEventListener("click", function () { if (!toggle(menuBtn, nav)) closeGroups(); });
    // Menu groups open on click or tap, one at a time. Escape or a click elsewhere closes them.
    var groups = document.querySelectorAll(".nav-group > .nav-top");
    function closeGroups(except) {
      groups.forEach(function (b) { if (b !== except && b.getAttribute("aria-expanded") === "true") toggle(b, document.getElementById(b.getAttribute("aria-controls")), false); });
    }
    groups.forEach(function (b) {
      b.addEventListener("click", function () { closeGroups(b); toggle(b, document.getElementById(b.getAttribute("aria-controls"))); });
    });
    document.addEventListener("click", function (e) { if (nav && !nav.contains(e.target)) closeGroups(); });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var open = document.querySelector('.nav-group > .nav-top[aria-expanded="true"]');
      if (open) { closeGroups(); open.focus(); }
    });
    if (dispBtn && panel) {
      dispBtn.addEventListener("click", function () { if (toggle(dispBtn, panel)) { var f = panel.querySelector("h2"); if (f) { f.setAttribute("tabindex", "-1"); f.focus(); } } });
      var done = document.getElementById("display-done");
      if (done) done.addEventListener("click", function () { toggle(dispBtn, panel, false); dispBtn.focus(); });
    }
    document.querySelectorAll("[data-set]").forEach(function (b) {
      b.addEventListener("click", function () { var p = b.getAttribute("data-set").split(":"); apply(p[0], p[1]); });
    });
    document.querySelectorAll("[data-print]").forEach(function (b) { b.addEventListener("click", function () { window.print(); }); });
    var stamp = document.querySelectorAll(".print-date");
    stamp.forEach(function (s) { s.textContent = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); });
    sync();
  }
  // Show the folded-away math on paper.
  window.addEventListener("beforeprint", function () { document.querySelectorAll("details").forEach(function (d) { d.setAttribute("data-was-open", d.open ? "1" : "0"); d.open = true; }); });
  window.addEventListener("afterprint", function () { document.querySelectorAll("details[data-was-open]").forEach(function (d) { d.open = d.getAttribute("data-was-open") === "1"; }); });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
