// Public Retirement Planner: menu bar and reader settings (text size, colors, letters), shared by every page.
// The early part of this (applying saved settings before the page paints) is inlined in each page's <head> by tools/build.py.
(function () {
  var root = document.documentElement;
  var KEYS = { size: "site-size", theme: "site-theme", font: "site-font" };
  function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

  function apply(kind, value) {
    if (kind === "theme") { if (value === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", value); set(KEYS.theme, value === "auto" ? null : value); }
    if (kind === "size") { root.setAttribute("data-size", value); set(KEYS.size, value); }
    if (kind === "font") { root.setAttribute("data-font", value); set(KEYS.font, value); loadFont(value); }
    sync();
  }
  // Only the default letters load with every page. Book-style and wide-spaced letters load the first time someone picks them.
  var FONT_CSS = { book: "Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700", wide: "Lexend:wght@400;600;700" };
  function loadFont(v) {
    if (!FONT_CSS[v] || document.getElementById("font-" + v)) return;
    var l = document.createElement("link"); l.id = "font-" + v; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=" + FONT_CSS[v] + "&display=swap";
    document.head.appendChild(l);
  }
  function current(kind) {
    if (kind === "theme") return root.getAttribute("data-theme") || "auto";
    if (kind === "size") return root.getAttribute("data-size") || "1";
    return root.getAttribute("data-font") || "clear";
  }
  var NAMES = { size: { "1": "Normal text", "2": "Large text", "3": "Largest text" }, theme: { light: "Light colors", dark: "Dark colors" },
    font: { clear: "Easy-to-read letters", book: "Book-style letters", wide: "Wide-spaced letters" } };
  function effectiveTheme() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  // Screen readers hear the current choice on each icon.
  function sync() {
    document.querySelectorAll("[data-cycle]").forEach(function (b) {
      var k = b.getAttribute("data-cycle"), v = k === "theme" ? effectiveTheme() : current(k);
      b.setAttribute("aria-label", NAMES[k][v] + ". Tap to change.");
    });
  }

  function toggle(btn, target, open) {
    var isOpen = open == null ? btn.getAttribute("aria-expanded") !== "true" : open;
    btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    target.hidden = !isOpen;
    return isOpen;
  }

  function init() {
    var nav = document.getElementById("site-nav");
    // Phone menu: the Menu tab opens a full-screen list of every page; Close, Escape or the tab again shuts it.
    var menuBtn = document.getElementById("menu-btn"), sheet = document.getElementById("menu-sheet");
    function setSheet(open) {
      if (!menuBtn || !sheet) return;
      toggle(menuBtn, sheet, open);
      document.body.classList.toggle("sheet-open", open);
      menuBtn.querySelector("span").textContent = open ? "Close" : "Menu";
      if (open) { sheet.scrollTop = 0; document.getElementById("sheet-title").focus(); } else menuBtn.focus();
    }
    if (menuBtn && sheet) {
      menuBtn.addEventListener("click", function () { setSheet(sheet.hidden); });
      sheet.querySelector(".sheet-close").addEventListener("click", function () { setSheet(false); });
    }
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
      if (sheet && !sheet.hidden) { setSheet(false); return; }
      var open = document.querySelector('.nav-group > .nav-top[aria-expanded="true"]');
      if (open) { closeGroups(); open.focus(); }
    });
    // Reading-setting icons: each tap moves to the next choice and briefly says which one is on.
    var NEXT = { size: ["1", "2", "3"], font: ["clear", "book", "wide"] };
    var status = document.createElement("div");
    status.className = "quick-status"; status.setAttribute("role", "status"); status.hidden = true;
    document.body.appendChild(status);
    var timer;
    document.querySelectorAll("[data-cycle]").forEach(function (b) {
      b.addEventListener("click", function () {
        var kind = b.getAttribute("data-cycle"), v;
        if (kind === "theme") v = effectiveTheme() === "dark" ? "light" : "dark";
        else { var list = NEXT[kind]; v = list[(list.indexOf(current(kind)) + 1) % list.length]; }
        apply(kind, v);
        status.textContent = NAMES[kind][v]; status.hidden = false;
        clearTimeout(timer); timer = setTimeout(function () { status.hidden = true; }, 1800);
      });
    });
    document.querySelectorAll("[data-print]").forEach(function (b) { b.addEventListener("click", function () { window.print(); }); });
    var stamp = document.querySelectorAll(".print-date");
    stamp.forEach(function (s) { s.textContent = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); });
    loadFont(current("font"));
    // "On this page" starts open on wide screens and folded on phones.
    if (window.matchMedia && window.matchMedia("(min-width: 900px)").matches) document.querySelectorAll(".toc > details").forEach(function (d) { d.open = true; });
    sync();
    sideSpy();
  }
  // Side column: mark the section being read in its "On this page" list.
  function sideSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.side-toc a[href^="#"]'));
    var rows = links.map(function (a) { return { a: a, el: document.getElementById(a.getAttribute("href").slice(1)) }; }).filter(function (r) { return r.el; });
    if (!rows.length) return;
    var queued = false;
    function mark() {
      queued = false;
      var cur = null;
      rows.forEach(function (r) { if (r.el.getBoundingClientRect().top < window.innerHeight * 0.3) cur = r; });
      rows.forEach(function (r) { if (r === cur) r.a.setAttribute("aria-current", "true"); else r.a.removeAttribute("aria-current"); });
    }
    window.addEventListener("scroll", function () { if (!queued) { queued = true; requestAnimationFrame(mark); } }, { passive: true });
    mark();
  }
  // Show the folded-away math on paper.
  window.addEventListener("beforeprint", function () { document.querySelectorAll("details").forEach(function (d) { d.setAttribute("data-was-open", d.open ? "1" : "0"); d.open = true; }); });
  window.addEventListener("afterprint", function () { document.querySelectorAll("details[data-was-open]").forEach(function (d) { d.open = d.getAttribute("data-was-open") === "1"; }); });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  // Moving answers to another device without an account: the answers ride in a link, after the # sign, which browsers
  // never send to a website. Pages copy that link or open the reader's own email app with it (nothing goes through us).
  window.SiteShare = {
    pack: function (o) { return encodeURIComponent(btoa(JSON.stringify(o))); },
    unpack: function (key) {
      try { var m = location.hash.match(new RegExp("[#&]" + key + "=([^&]+)")); return m ? JSON.parse(atob(decodeURIComponent(m[1]))) : null; } catch (e) { return null; }
    },
    copy: function (url, note, done) {
      var ok = function () { if (note) note.textContent = done || "Link copied. Open it on your other phone or computer."; };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(ok, function () { window.prompt("Copy this link:", url); });
      else window.prompt("Copy this link:", url);
    },
    email: function (url, subject, intro) {
      location.href = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(intro + "\n\n" + url + "\n\nOpen the link on any phone or computer to see the same answers. Public Retirement Planner (publicpensionplanner.com) gives estimates, not advice.");
    }
  };
})();
