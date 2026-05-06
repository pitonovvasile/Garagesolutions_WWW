/** Scripturi globale — momentan doar anul in footer */
(function () {
  var el = document.getElementById("y");
  if (el) el.textContent = String(new Date().getFullYear());
})();
