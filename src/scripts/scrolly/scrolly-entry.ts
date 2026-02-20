import initScrolly from "./scrolly-runtime";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initScrolly, { once: true });
} else {
  initScrolly();
}
