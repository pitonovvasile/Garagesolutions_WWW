(function () {
  "use strict";

  var STORAGE_KEY = "garage-site-theme";

  function isBright() {
    return document.documentElement.getAttribute("data-site-theme") === "bright";
  }

  function apply(bright) {
    var root = document.documentElement;
    if (bright) root.setAttribute("data-site-theme", "bright");
    else root.removeAttribute("data-site-theme");
    try {
      localStorage.setItem(STORAGE_KEY, bright ? "bright" : "dark");
    } catch (e) {
      /* ignore */
    }
    var input = document.getElementById("site-theme-toggle");
    if (input) {
      input.checked = bright;
      input.setAttribute("aria-checked", bright ? "true" : "false");
    }
  }

  function onReady() {
    var stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
    var bright =
      stored === "bright" || document.documentElement.getAttribute("data-site-theme") === "bright";
    apply(bright);
    var input = document.getElementById("site-theme-toggle");
    if (input) {
      input.addEventListener("change", function () {
        apply(input.checked);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();
