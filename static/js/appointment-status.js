// static/js/appointment-status.js
// Show "View Status" ONLY in doctor profile footer (next to Book Appointment).
// Do NOT show it in the placeholder or inside the booking flow.

document.addEventListener('DOMContentLoaded', () => {
  const profileViewerBox = document.getElementById('profile-viewer-box');

  // Utility: create a neutral CTA that fits existing styling
  function createStatusBtn() {
    const btn = document.createElement('button');
    btn.className = 'action-btn status';
    btn.textContent = 'View Status';
    btn.style.background = '#333';
    btn.style.color = '#E0E0E0';
    btn.style.border = '1px solid #444';
    btn.style.borderRadius = '10px';
    btn.style.height = '44px';
    btn.style.padding = '0 1.1rem';
    btn.style.fontWeight = '700';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'opacity .3s';
    btn.addEventListener('mouseenter', () => { btn.style.opacity = '0.9'; });
    btn.addEventListener('mouseleave', () => { btn.style.opacity = '1'; });
    return btn;
  }

  // Render a simple status panel in the right container
  function renderStatusPanel(context = {}) {
    if (!profileViewerBox) return;
    const doctorName = context.full_name || null;
    const headerTitle = doctorName ? `Appointment Status ` : 'Appointment Status';

    profileViewerBox.innerHTML = `
      <div class="doctor-profile-content" style="min-height:300px;display:flex;flex-direction:column;">
        <div class="profile-header" style="border-bottom:1px solid #222;margin-bottom:.75rem;padding-bottom:.75rem;">
          <div>
            <h2 style="margin:0;font-size:1.4rem;color:#fff;">${headerTitle}</h2>
            <div class="spec" style="color:#F7971E;margin-top:.25rem;">Latest requests</div>
          </div>
        </div>

        <div id="appt-status-body" style="display:flex;flex-direction:column;gap:.5rem;">
          <div style="color:#B0B0B0;">No appointment requests found yet.</div>
        </div>

        <div style="margin-top:auto;display:flex;justify-content:flex-end;gap:.5rem;border-top:1px solid #222;padding-top:1rem;">
          <button id="status-close-btn" class="action-btn" style="background:#333;color:#E0E0E0;border:1px solid #444;border-radius:10px;height:44px;padding:0 1.1rem;font-weight:700;">Close</button>
        </div>
      </div>
    `;

    const closeBtn = document.getElementById('status-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const activeCard = document.querySelector('.doctor-list-item-final.active');
        if (activeCard) activeCard.click();
      });
    }
  }

  // Only inject into active profile footer. Never inject into placeholder or booking flow.
  function injectIntoProfileFooterIfNeeded() {
    if (!profileViewerBox) return;

    // Presence of .appointment flow container indicates "booking flow"; do not show status button then.
    const inBookingFlow = !!profileViewerBox.querySelector('.appt-container');
    if (inBookingFlow) return;

    const footer = profileViewerBox.querySelector('.profile-footer');
    const bookBtn = profileViewerBox.querySelector('.action-btn.book');
    const hasDoctorHeader = profileViewerBox.querySelector('.profile-header'); // profile context
    const placeholderContent = profileViewerBox.querySelector('.placeholder-content'); // initial state

    // Only when a profile is present and not placeholder
    if (footer && bookBtn && hasDoctorHeader && !placeholderContent) {
      if (!footer.querySelector('.action-btn.status')) {
        const statusBtn = createStatusBtn();
        // Place status button to the left of Book
        bookBtn.parentElement.insertBefore(statusBtn, bookBtn);

        // Context for header
        const nameEl = profileViewerBox.querySelector('#prof-name');
        const specEl = profileViewerBox.querySelector('#prof-spec');
        const context = {
          full_name: nameEl?.textContent?.trim(),
          specialization: specEl?.textContent?.trim()
        };

        statusBtn.addEventListener('click', () => {
          renderStatusPanel(context);
        });a
      }
    }
  }

  // Observe updates to the right panel and inject when a profile is rendered.
  const observer = new MutationObserver(() => {
    injectIntoProfileFooterIfNeeded();
  });
  if (profileViewerBox) {
    observer.observe(profileViewerBox, { childList: true, subtree: true });
  }

  // First pass in case a profile is already on screen
  injectIntoProfileFooterIfNeeded();
});
