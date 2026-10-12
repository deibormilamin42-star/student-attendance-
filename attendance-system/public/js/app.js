(function () {
  // Mobile menu
  var burger = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Confirm dialogs: <form data-confirm="Are you sure?">
  document.addEventListener('submit', function (e) {
    var msg = e.target.getAttribute && e.target.getAttribute('data-confirm');
    if (msg && !window.confirm(msg)) e.preventDefault();
  });

  // Attendance page: "mark all" buttons and live counters
  var form = document.getElementById('attForm');
  if (form) {
    var update = function () {
      ['present', 'absent', 'late'].forEach(function (s) {
        var n = form.querySelectorAll('input[type=radio][value=' + s + ']:checked').length;
        var el = form.querySelector('[data-count=' + s + ']');
        if (el) el.textContent = n;
      });
    };
    form.addEventListener('change', update);
    form.querySelectorAll('[data-mark-all]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var s = btn.getAttribute('data-mark-all');
        form.querySelectorAll('input[type=radio][value=' + s + ']').forEach(function (r) { r.checked = true; });
        update();
      });
    });
    update();
  }
})();
