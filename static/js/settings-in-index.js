// static/js/main-layout.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Starfield Logic ---
    const starfield = document.getElementById('starfield-container');
    if (starfield) {
        // ... (full starfield logic: generateStars, handleMouseMove, handleMouseLeave)
    }

    // --- Settings Dropdown Logic ---
    const settingsBtn = document.getElementById('settings-btn');
    const settingsDropdown = document.getElementById('settings-dropdown');

    if (settingsBtn && settingsDropdown) {
        settingsBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            settingsDropdown.classList.toggle('visible');
        });

        document.addEventListener('click', (event) => {
            if (!settingsBtn.contains(event.target)) {
                settingsDropdown.classList.remove('visible');
            }
        });
    }
});