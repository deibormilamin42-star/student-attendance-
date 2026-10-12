// Loaded in <head> (not deferred) so the theme is applied before first paint: no white flash.
(function () {
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}
  root.dataset.theme = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  function setIcon() {
    document.querySelectorAll('#themeToggle').forEach(function (b) {
      b.textContent = root.dataset.theme === 'dark' ? '\u2600' : '\u263E';
    });
  }
  document.addEventListener('DOMContentLoaded', setIcon);
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#themeToggle')) return;
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (err) {}
    setIcon();
  });
})();
