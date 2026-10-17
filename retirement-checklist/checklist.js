// Retirement countdown checklist: remembers ticked steps on this device only.
(function () {
  var KEY = "retirement-checklist";
  var boxes = document.querySelectorAll('.checklist input[type="checkbox"]');
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  var done = load();
  function count() {
    var n = 0; boxes.forEach(function (b) { if (b.checked) n++; });
    document.getElementById("check-count").textContent = n + " of " + boxes.length + " steps done";
  }
  boxes.forEach(function (b) {
    b.checked = !!done[b.id];
    b.addEventListener("change", function () { if (b.checked) done[b.id] = 1; else delete done[b.id]; save(done); count(); });
  });
  document.getElementById("check-clear").addEventListener("click", function () {
    boxes.forEach(function (b) { b.checked = false; }); done = {}; save(done); count();
  });
  count();
})();
