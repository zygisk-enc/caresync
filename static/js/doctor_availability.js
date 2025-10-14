document.addEventListener('DOMContentLoaded', function () {
    const availabilityBtn = document.getElementById('availability-btn');

    if (availabilityBtn) {
        availabilityBtn.addEventListener('click', function (event) {
            // Prevent the link from trying to navigate away
            event.preventDefault();

            // Send the request to the server to toggle the status
            fetch('/doctor/availability/toggle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then(response => response.json())
            .then(data => {
                if (data.is_available !== undefined) {
                    // If successful, update the button's look and feel
                    updateAvailabilityUI(data.is_available);
                } else {
                    // Log any errors from the server
                    console.error('Error:', data.error);
                }
            })
            .catch(error => console.error('Fetch Error:', error));
        });
    }
});

/**
 * Updates the button's color, icon, and text based on the new status.
 * @param {boolean} isAvailable - The new availability status from the server.
 */
function updateAvailabilityUI(isAvailable) {
    const availabilityBtn = document.getElementById('availability-btn');
    const icon = availabilityBtn.querySelector('i');
    const text = availabilityBtn.querySelector('#availability-text');

    if (isAvailable) {
        availabilityBtn.classList.remove('unavailable');
        availabilityBtn.classList.add('available');
        icon.classList.remove('fa-toggle-off');
        icon.classList.add('fa-toggle-on');
        text.textContent = 'Available';
    } else {
        availabilityBtn.classList.remove('available');
        availabilityBtn.classList.add('unavailable');
        icon.classList.remove('fa-toggle-on');
        icon.classList.add('fa-toggle-off');
        text.textContent = 'Unavailable';
    }
}