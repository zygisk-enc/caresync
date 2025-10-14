document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  const doctorListItems = document.querySelectorAll('.doctor-list-item-final');
  const profileViewerBox = document.getElementById('profile-viewer-box');
  const searchInput = document.getElementById('doctor-search-input');
  const chips = document.querySelectorAll('.spec-filter-btn');
  const cards = document.querySelectorAll('.doctor-list-item-final');

  doctorListItems.forEach(item => {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `View profile of ${item.querySelector('h4')?.textContent || 'doctor'}`);
  });

  function getSkeletonLoaderHTML() {
    return `
      <div class="doctor-profile-content">
        <div class="profile-header">
          <div class="skeleton skeleton-avatar"></div>
          <div>
            <div class="skeleton skeleton-text" style="width: 150px;"></div>
            <div class="skeleton skeleton-text" style="width: 100px; margin-top: 8px;"></div>
          </div>
        </div>
        <div class="profile-hstrip">
          <div class="skeleton skeleton-text" style="grid-column: span 2; height: 80px;"></div>
        </div>
        <div class="profile-footer">
          <div class="secondary-actions">
             <div class="skeleton" style="width: 48px; height: 48px; border-radius: 50%;"></div>
             <div class="skeleton" style="width: 48px; height: 48px; border-radius: 50%;"></div>
             <div class="skeleton" style="width: 48px; height: 48px; border-radius: 50%;"></div>
          </div>
          <div class="primary-actions">
            <div class="skeleton skeleton-text" style="height: 48px;"></div>
          </div>
        </div>
      </div>
    `;
  }

  function getFooterButtonsHTML() {
    return `
      <div class="profile-footer">
        <div class="secondary-actions">
          <button class="action-btn icon-btn directions" title="Directions" aria-label="Get Directions">
            <i class="fas fa-map-marker-alt"></i>
          </button>
          <button class="action-btn icon-btn message" title="Message" aria-label="Send a Message">
            <i class="fas fa-comment-dots"></i>
          </button>
          <button class="action-btn icon-btn call" title="Call" aria-label="Call Doctor">
            <i class="fas fa-phone-alt"></i>
          </button>
        </div>
        <div class="primary-actions">
            <button class="action-btn book" title="Book Appointment" aria-label="Book Appointment">
              Book Appointment
            </button>
        </div>
      </div>
    `;
  }

  if (doctorListItems.length > 0 && profileViewerBox) {
    doctorListItems.forEach(card => {
      const activateCard = () => {
        const doctorId = card.dataset.id;
        doctorListItems.forEach(item => item.classList.remove('active'));
        card.classList.add('active');
        profileViewerBox.innerHTML = getSkeletonLoaderHTML();

        fetch(`/doctor/${doctorId}`)
          .then(async (res) => {
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || `HTTP error! status: ${res.status}`);
            }
            return res.json();
          })
          .then(data => {
            const photoUrl = data.photo_filename ? `/static/uploads/${data.photo_filename}` : '/static/assets/default-profile.png';
            const availabilityText = data.is_available ? 'Available' : 'Unavailable';
            const availabilityClass = data.is_available ? 'status-available' : 'status-unavailable';

            profileViewerBox.innerHTML = `
              <div class="doctor-profile-content">
                <div class="profile-header">
                  <img id="prof-photo" src="${photoUrl}" alt="${data.full_name}">
                  <div>
                    <h2 id="prof-name">${data.full_name}</h2>
                    <div class="spec">${data.specialization}</div>
                  </div>
                </div>
                <div class="profile-hstrip">
                  <div class="pill"><div class="label">Experience</div><div class="value">${data.experience_years}+ years</div></div>
                  <div class="pill">
                    <div class="label">Availability</div>
                    <div class="value ${availabilityClass}">${availabilityText}</div>
                  </div>
                  <div class="pill" style="grid-column: span 2;"><div class="label">Clinic address</div><div class="value">${data.clinic_address}</div></div>
                </div>
                ${getFooterButtonsHTML()}
              </div>
            `;
            
            wireActionButtons(profileViewerBox, data);
          })
          .catch((err) => {
            profileViewerBox.innerHTML = `<div class="doctor-profile-content" style="text-align:center; padding-top: 4rem; color: var(--text-secondary);">${err.message}</div>`;
          });
      };
      card.addEventListener('click', activateCard);
      card.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), activateCard()));
    });
  }
  
        function wireActionButtons(container, data) {
          const doctorId = data.id;

          // Unchanged: Event listener for directions button
          container.querySelector('.action-btn.directions')?.addEventListener('click', () => {
              if (data.clinic_latitude && data.clinic_longitude) {
                  window.open(`/directions/map?dlat=${data.clinic_latitude}&dlng=${data.clinic_longitude}`, '_blank');
              } else {
                  const q = encodeURIComponent(data.clinic_address || '');
                  window.open(`http://maps.google.com/maps?q=${q}`, '_blank');
              }
          });

          // Unchanged: Event listener for message button
          container.querySelector('.action-btn.message')?.addEventListener('click', () => {
              window.open(`/chat/${doctorId}`, 'ChatWindow', 'width=600,height=800,resizable=yes');
          });

          // MODIFIED: This now opens the scheduling UI for a video call
          container.querySelector('.action-btn.call')?.addEventListener('click', () => {
              initAppointmentFlow(container, data, 'video_call');
          });

          // MODIFIED: This now opens the scheduling UI for a regular appointment
          container.querySelector('.action-btn.book')?.addEventListener('click', () => {
              initAppointmentFlow(container, data, 'appointment');
          });
      }
  
    function filterDoctors() {
    const searchTerm = searchInput.value.toLowerCase();
    const activeSpec = document.querySelector('.spec-filter-btn.active')?.dataset.spec || 'All';
    cards.forEach(card => {
        const name = card.querySelector('h4')?.textContent?.toLowerCase() || '';
        const spec = card.querySelector('p')?.textContent?.toLowerCase() || '';
        const address = card.dataset.address?.toLowerCase() || '';
        const matchesSearch = `${name} ${spec} ${address}`.includes(searchTerm);
        const matchesSpec = (activeSpec === 'All' || spec.toLowerCase().includes(activeSpec.toLowerCase()));
        card.classList.toggle('hidden', !(matchesSearch && matchesSpec));
    });
  }

  searchInput?.addEventListener('input', filterDoctors);
  chips.forEach(chip => chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    filterDoctors();
  }));

    function initAppointmentFlow(rootEl, doctor, requestType = 'appointment') {
        const now = new Date();
        const state = { step: 'month', month: null, date: null, time: null, error: null, loading: false };

        const months = Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            const year = now.getFullYear();
            return {
                key: `${year}-${String(m).padStart(2, '0')}`,
                label: new Date(year, i, 1).toLocaleString('default', { month: 'long', year: 'numeric' }),
                isPast: year === now.getFullYear() && m < (now.getMonth() + 1)
            };
        });

        function getDates(monthKey) {
            const [y, m] = monthKey.split('-').map(Number);
            const total = new Date(y, m, 0).getDate();
            const today = new Date();
            const isThisMonth = y === today.getFullYear() && m === (today.getMonth() + 1);
            return Array.from({ length: total }, (_, i) => {
                const d = i + 1;
                return {
                    key: `${monthKey}-${String(d).padStart(2, '0')}`,
                    label: String(d),
                    disabled: isThisMonth && d < today.getDate()
                };
            });
        }

        function getTimes() {
            const slots = { morning: [], afternoon: [] };
            for (let h = 9; h <= 16; h++) {
                for (let mm = 0; mm <= 30; mm += 30) {
                    if (h === 16 && mm > 0) continue;
                    if (h === 12 || (h === 13 && mm === 0)) continue;
                    const timeStr = `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
                    if (h < 12) slots.morning.push(timeStr);
                    else slots.afternoon.push(timeStr);
                }
            }
            return slots;
        }

        function render() {
            let bodyHTML = '';

            if (state.step === 'month') {
                bodyHTML = `<div style="color: var(--text-secondary); margin-bottom: 1rem;">Select a month</div><div class="appt-grid" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));">${months.map(m => `<button class="appt-tile ${state.month === m.key ? 'selected' : ''} ${m.isPast ? 'disabled' : ''}" data-key="${m.key}" ${m.isPast ? 'disabled' : ''}>${m.label}</button>`).join('')}</div>`;
            } else if (state.step === 'date') {
                const dates = getDates(state.month);
                bodyHTML = `<div style="color: var(--text-secondary); margin-bottom: 1rem;">Select a date</div><div class="appt-grid" style="grid-template-columns: repeat(7, 1fr);">${dates.map(d => `<button class="appt-date ${state.date === d.key ? 'selected' : ''} ${d.disabled ? 'disabled' : ''}" data-key="${d.key}" ${d.disabled ? 'disabled' : ''}>${d.label}</button>`).join('')}</div>`;
            } else if (state.step === 'time') {
                const times = getTimes();
                // --- MODIFIED: Check if the selected time is from a fixed slot ---
                const isFixedSlot = state.time && (times.morning.includes(state.time) || times.afternoon.includes(state.time));
                const customTimeValue = !isFixedSlot && state.time ? state.time : '';

                // --- MODIFIED: Add custom time input to the HTML ---
                bodyHTML = `
                    <div><p class="time-category-header">Morning</p><div class="appt-grid" style="grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));">${times.morning.map(t => `<button class="appt-time ${state.time === t ? 'selected' : ''}" data-time="${t}">${t}</button>`).join('')}</div></div>
                    
                    <div class="custom-time-wrapper" style="margin: 1.5rem 0;">
                        <label for="custom-time-input" class="time-category-header" style="margin-bottom: 0.5rem; display: block;">Or enter a custom time</label>
                        <input type="time" id="custom-time-input" value="${customTimeValue}" min="09:00" max="17:00" step="900" style="width: 100%; padding: 0.75rem; border-radius: 8px; background-color: var(--surface-2); border: 1px solid var(--border-color); color: var(--text-main); font-family: var(--font-family); font-size: 1rem;">
                    </div>

                    <div><p class="time-category-header">Afternoon</p><div class="appt-grid" style="grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));">${times.afternoon.map(t => `<button class="appt-time ${state.time === t ? 'selected' : ''}" data-time="${t}">${t}</button>`).join('')}</div></div>
                `;
            }

            const canBook = !!(state.date && state.time) && !state.loading;
            let hintText = '';
            if (state.error) {
                hintText = `<span style="color: #ff6b6b;">${state.error}</span>`;
            } else if (canBook) {
                const dateObj = new Date(state.date);
                const requestLabel = requestType === 'video_call' ? 'Requesting video call for' : 'Requesting appointment for';
                hintText = `${requestLabel} ${dateObj.toLocaleDateString('default', { month: 'long', day: 'numeric' })} at ${state.time}`;
            }
            
            const title = requestType === 'video_call' ? 'Request a Video Call' : 'Book Appointment';

            rootEl.innerHTML = `<div class="doctor-profile-content"><div class="appt-container"><div class="profile-header" style="margin-bottom: 1rem;"><div><h2>${title}</h2><div class="spec">${doctor.full_name}</div></div></div>${bodyHTML}</div><div class="appt-footer"><div id="booking-hint" style="min-height: 1.2em; color: var(--text-secondary); font-size: 0.9rem;">${hintText}</div><div style="display:flex; justify-content:flex-end; gap:.75rem;"><button class="appt-cancel">Cancel</button><button class="appt-book-now" ${!canBook ? 'disabled' : ''}>${state.loading ? 'Sending...' : 'Send Request'}</button></div></div></div>`;
            attachBookingListeners();
        }

        function attachBookingListeners() {
            if (state.step === 'month') {
                rootEl.querySelectorAll('.appt-tile:not(.disabled)').forEach(btn => btn.addEventListener('click', () => { state.month = btn.dataset.key; state.step = 'date'; render(); }));
            } else if (state.step === 'date') {
                rootEl.querySelectorAll('.appt-date:not(.disabled)').forEach(btn => btn.addEventListener('click', () => { state.date = btn.dataset.key; state.step = 'time'; render(); }));
            } else if (state.step === 'time') {
                // --- MODIFIED: Clear custom input when a fixed slot is clicked ---
                rootEl.querySelectorAll('.appt-time').forEach(btn => btn.addEventListener('click', () => {
                    const customInput = rootEl.querySelector('#custom-time-input');
                    if (customInput) customInput.value = '';
                    state.time = btn.dataset.time;
                    render();
                }));

                // --- MODIFIED: Add event listener for the custom time input ---
                const customTimeInput = rootEl.querySelector('#custom-time-input');
                if (customTimeInput) {
                    customTimeInput.addEventListener('input', (e) => {
                        rootEl.querySelectorAll('.appt-time.selected').forEach(btn => btn.classList.remove('selected'));
                        state.time = e.target.value;
                        render();
                    });
                }
            }

            rootEl.querySelector('.appt-cancel').addEventListener('click', () => {
                document.querySelector(`.doctor-list-item-final[data-id="${doctor.id}"]`)?.click();
            });

            rootEl.querySelector('.appt-book-now').addEventListener('click', () => {
                if (state.loading || !state.date || !state.time) return;
                state.loading = true;
                state.error = null;
                let bookingSuccessful = false;
                render();

                const endpoint = requestType === 'video_call'
                    ? `/call/request/doctor/${doctor.id}`
                    : '/doctor/book-appointment';

                fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ doctorId: doctor.id, date: state.date, time: state.time })
                })
                .then(async res => {
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Request failed.');
                    return data;
                })
                .then(data => {
                    bookingSuccessful = true;
                    const requestLabel = requestType === 'video_call' ? 'video call request' : 'appointment request';
                    renderSuccess(doctor.full_name, state.date, state.time, requestLabel);
                })
                .catch(err => {
                    state.error = err.message;
                })
                .finally(() => {
                    state.loading = false;
                    if (!bookingSuccessful) {
                        render();
                    }
                });
            });
        }

        function renderSuccess(doctorName, date, time, requestLabel) {
            const dateObj = new Date(date);
            const dateTimeLabel = `${dateObj.toLocaleDateString('default', { month: 'long', day: 'numeric' })} at ${time}`;
            rootEl.innerHTML = `
                <div class="doctor-profile-content" style="text-align: center; justify-content: center; align-items: center; gap: 1.5rem;">
                    <div style="font-size: 3rem; color: var(--status-confirmed, #28a745); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background-color: var(--surface-2);">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div style="font-size: 1.5rem; font-weight: 600;">Request Submitted</div>
                    <p style="color: var(--text-secondary); max-width: 300px;">Your ${requestLabel} for ${dateTimeLabel} with ${doctorName} has been sent.</p>
                    <div class="primary-actions" style="width: 100%;">
                        <button class="action-btn book" id="booking-done-btn">Okay</button>
                    </div>
                </div>
            `;
            rootEl.querySelector('#booking-done-btn').addEventListener('click', () => {
                document.querySelector(`.doctor-list-item-final[data-id="${doctor.id}"]`)?.click();
            });
        }

        render();
    }
});