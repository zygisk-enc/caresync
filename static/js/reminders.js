document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selection ---
    const modal = document.getElementById('reminder-modal');
    if (!modal) return;

    const modalTitle = document.getElementById('modal-title');
    const medIdInput = document.getElementById('medication-id-input'); // This will be used to associate a reminder with a medication
    const cancelBtn = document.getElementById('cancel-reminder-btn');
    const reminderForm = document.getElementById('reminder-form');
    const customMessageGroup = document.getElementById('custom-message-group');
    const customMessageInput = document.getElementById('custom-message');
    const monthYearEl = document.getElementById('month-year');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const timeInput = document.getElementById('time-input');
    const addTimeBtn = document.getElementById('add-time-btn');
    const selectedDatesEl = document.getElementById('selected-dates');
    const selectedTimesEl = document.getElementById('selected-times');
    const remindersListContainer = document.getElementById('reminders-list-container');

    // --- State Variables ---
    let currentDate = new Date();
    let selectedDates = new Set();
    let selectedTimes = new Set();

    // --- Core Functions ---

    /**
     * Fetches all upcoming reminders from the server and displays them.
     */
    const fetchAndRenderReminders = () => {
        if (!remindersListContainer) return;
        remindersListContainer.innerHTML = '<p>Loading reminders...</p>';
        fetch('/api/reminders')
            .then(res => res.json())
            .then(data => {
                remindersListContainer.innerHTML = '';
                if (data.length === 0) {
                    remindersListContainer.innerHTML = '<p class="no-items" style="text-align: left; border: none; background: none;">You have no upcoming reminders set.</p>';
                    return;
                }
                data.forEach(reminder => {
                    const reminderEl = document.createElement('div');
                    reminderEl.className = 'item-card reminder-item';
                    reminderEl.innerHTML = `
                        <div class="info-group">
                            <strong>${reminder.medication_name || reminder.custom_message}</strong><br>
                            <small>${reminder.datetime}</small>
                        </div>
                        <button class="remove-med-btn delete-reminder-btn" data-reminder-id="${reminder.id}">Delete</button>
                    `;
                    remindersListContainer.appendChild(reminderEl);
                });
            })
            .catch(err => {
                remindersListContainer.innerHTML = '<p class="error-message">Could not load reminders.</p>';
            });
    };

    /**
     * Renders the calendar for the currently selected month and year.
     */
    const renderCalendar = () => {
        calendarGrid.innerHTML = '';
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        monthYearEl.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        ['S','M','T','W','T','F','S'].forEach(day => {
            const weekdayEl = document.createElement('div');
            weekdayEl.className = 'weekday';
            weekdayEl.textContent = day;
            calendarGrid.appendChild(weekdayEl);
        });

        for (let i = 0; i < firstDay; i++) {
            calendarGrid.appendChild(document.createElement('div'));
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'day';
            dayEl.textContent = i;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            
            const today = new Date();
            today.setHours(0,0,0,0);
            if (new Date(dateStr) < today) {
                dayEl.classList.add('disabled');
            } else {
                dayEl.dataset.date = dateStr;
                dayEl.addEventListener('click', () => {
                    if (selectedDates.has(dateStr)) {
                        selectedDates.delete(dateStr);
                        dayEl.classList.remove('selected');
                    } else {
                        selectedDates.add(dateStr);
                        dayEl.classList.add('selected');
                    }
                    updateTags(selectedDatesEl, selectedDates);
                });
                if (selectedDates.has(dateStr)) {
                    dayEl.classList.add('selected');
                }
            }
            calendarGrid.appendChild(dayEl);
        }
    };

    /**
     * Updates the display of selected date/time tags.
     */
    const updateTags = (container, items) => {
        container.innerHTML = '';
        const sortedItems = [...items].sort();
        sortedItems.forEach(item => {
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.textContent = item;
            container.appendChild(tag);
        });
    };

    /**
     * Opens and configures the reminder modal.
     */
    const openModal = (medicationId = null, defaultMessage = '') => {
        medIdInput.value = medicationId;
        selectedDates.clear();
        selectedTimes.clear();
        customMessageInput.value = defaultMessage;
        timeInput.value = '';
        updateTags(selectedDatesEl, selectedDates);
        updateTags(selectedTimesEl, selectedTimes);

        if (medicationId) {
            modalTitle.textContent = "Set Medication Reminder";
            customMessageGroup.style.display = 'block';
        } else {
            modalTitle.textContent = "Create Custom Reminder";
            customMessageGroup.style.display = 'block';
        }
        currentDate = new Date();
        renderCalendar();
        modal.classList.remove('hidden');
    };

    // --- Event Listeners ---

    // Note: This logic assumes setting a reminder for the *whole prescription*.
    // A more complex app would first ask which medication from the prescription to set a reminder for.
    document.querySelectorAll('.reminder-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // For this simplified version, we are not linking to a specific medication_id from the prescription.
            // We'll create a custom reminder with a pre-filled message.
            const prescriptionCard = btn.closest('.item-card');
            const doctorName = prescriptionCard.querySelector('strong').textContent;
            const defaultMsg = `Time to take medication prescribed by ${doctorName}.`;
            openModal(null, defaultMsg);
        });
    });

    document.getElementById('custom-reminder-btn')?.addEventListener('click', () => {
        openModal(null, ''); // No medication ID, no default message
    });

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    addTimeBtn.addEventListener('click', () => {
        if (timeInput.value) {
            selectedTimes.add(timeInput.value);
            updateTags(selectedTimesEl, selectedTimes);
            timeInput.value = '';
        }
    });

    cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

    reminderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (selectedDates.size === 0 || selectedTimes.size === 0) {
            alert('Please select at least one date and one time.');
            return;
        }

        const payload = {
            medication_id: medIdInput.value || null,
            dates: [...selectedDates],
            times: [...selectedTimes],
            custom_message: customMessageInput.value,
        };

        fetch('/reminders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.message) {
                alert(data.message);
                modal.classList.add('hidden');
                fetchAndRenderReminders(); // Refresh the list of reminders
            } else {
                alert('Error: ' + (data.error || 'Could not save reminder.'));
            }
        });
    });

    remindersListContainer.addEventListener('click', (event) => {
        const deleteBtn = event.target.closest('.delete-reminder-btn');
        if (deleteBtn) {
            const reminderId = deleteBtn.dataset.reminderId;
            if (confirm('Are you sure you want to delete this reminder?')) {
                fetch(`/api/reminder/delete/${reminderId}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(data => {
                    if (data.message) {
                        fetchAndRenderReminders(); // Refresh the list
                    } else {
                        alert('Error: ' + (data.error || 'Could not delete reminder.'));
                    }
                });
            }
        }
    });

    // Initial load of existing reminders
    fetchAndRenderReminders();
});