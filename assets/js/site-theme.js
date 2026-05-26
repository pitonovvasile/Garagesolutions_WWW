(function () {
  "use strict";

  var STORAGE_KEY = "garage-site-theme";
  var COOKIE_NAME = "garage_site_theme";
  var ONE_YEAR_SEC = 365 * 24 * 60 * 60;

  function cookieSuffix() {
    var secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
    return "; Path=/; Max-Age=" + ONE_YEAR_SEC + "; SameSite=Lax" + secure;
  }

  function readThemeCookie() {
    try {
      var esc = COOKIE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      var m = document.cookie.match(new RegExp("(?:^|; )" + esc + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) {
      return null;
    }
  }

  function writeThemeCookie(bright) {
    try {
      var v = bright ? "bright" : "dark";
      document.cookie = COOKIE_NAME + "=" + encodeURIComponent(v) + cookieSuffix();
    } catch (e) {
      /* ignore */
    }
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
    writeThemeCookie(bright);
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
    if (stored == null || stored === "") {
      stored = readThemeCookie();
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
