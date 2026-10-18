// Small helpers shared by the one-page calculators in /calculators/.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  window.Calc = {
    $: $,
    v: function (id) { var x = parseFloat($(id).value); return isFinite(x) ? Math.max(0, x) : 0; },
    usd: function (x) { return Math.round(x).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); },
    n: function (x, d) { return x.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); },
    step: function (t, calc, src) { return "<li><strong>" + t + "</strong><span class=\"calc\">" + calc + "</span>" + (src ? '<span class="src">Source: ' + src + "</span>" : "") + "</li>"; },
    // Re-run on every change; the first run happens right away.
    watch: function (run) { document.querySelectorAll(".calc input, .calc select").forEach(function (el) { el.addEventListener("input", run); el.addEventListener("change", run); }); run(); }
  };
})();
