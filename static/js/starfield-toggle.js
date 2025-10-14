// 3) Starfield toggle logic (safe, idempotent)
// Place in a new file static/js/starfield-toggle.js and include after main-layout.js
// or append to main-layout.js near settings dropdown code.

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('starfield-toggle');
  const starfield = document.getElementById('starfield-container');

  // Restore persisted preference
  try {
    const saved = localStorage.getItem('starfieldEnabled');
    if (saved === 'false') {
      document.body.classList.add('starfield-off');
    }
  } catch (_) {}

  // Apply current visibility once on load
  applyStarfieldVisibility();

  if (toggle) {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const off = document.body.classList.toggle('starfield-off');
      // Persist preference
      try { localStorage.setItem('starfieldEnabled', off ? 'false' : 'true'); } catch (_) {}
      applyStarfieldVisibility();
    });
  }

  function applyStarfieldVisibility() {
    const off = document.body.classList.contains('starfield-off');
    // Hide/show the star layer
    if (starfield) starfield.style.display = off ? 'none' : 'block';

    // Optionally detach costly mousemove listeners if present
    // These are added in several files (index.js, script.js, star.js, doctors-final.js).
    // Guarded cleanup prevents leaks while retaining behavior when re-enabled.
    if (off) {
      document.body.removeEventListener('mousemove', noop, true);
      document.body.removeEventListener('mouseleave', noop, true);
    }
  }

  // No-op placeholder to safely remove unknown listeners with capture flag
  function noop() {}
});
 
// Switch behavior: toggle aria-checked and your starfield visibility
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('starfield-toggle');
  const starfield = document.getElementById('starfield-container');

  // restore saved state
  const saved = localStorage.getItem('starfieldEnabled');
  if (saved === 'false') btn.setAttribute('aria-checked', 'false');

  apply();

  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-checked') === 'true';
    btn.setAttribute('aria-checked', on ? 'false' : 'true');
    localStorage.setItem('starfieldEnabled', (!on).toString());
    apply();
  });

  function apply() {
    const on = btn.getAttribute('aria-checked') === 'true';
    document.body.classList.toggle('starfield-off', !on);
    if (starfield) starfield.style.display = on ? 'block' : 'none';
  }
});

// Simple toggle example
document.getElementById('starfield-toggle').addEventListener('click', () => {
  document.body.classList.toggle('starfield-off');
});

