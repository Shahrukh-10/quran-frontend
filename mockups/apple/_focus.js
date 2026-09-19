// Shared Focus Mode toggle
// Hides nav/footer/audio bar; shows only content.
// Trigger: `.` key or double-tap on the H1.
(() => {
  const html = document.documentElement;
  const KEY = "iw.focus";

  function apply() {
    const on = localStorage.getItem(KEY) === "1";
    html.classList.toggle("focus-mode", on);
    const btn = document.querySelector('[data-role="focus-toggle"]');
    if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function toggle() {
    const cur = localStorage.getItem(KEY) === "1";
    localStorage.setItem(KEY, cur ? "0" : "1");
    apply();
  }

  window.iwToggleFocus = toggle;

  // Keyboard: `.` key
  window.addEventListener("keydown", (e) => {
    if (e.key === "." && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const target = e.target;
      const isInput = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (!isInput) {
        e.preventDefault();
        toggle();
      }
    }
  });

  // Double-click on the page title (h1) also toggles focus
  document.addEventListener("DOMContentLoaded", () => {
    const h1 = document.querySelector("h1");
    if (h1) h1.addEventListener("dblclick", toggle);
    apply();
  });
})();
