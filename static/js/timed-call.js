// static/js/timed-call.js
document.addEventListener('DOMContentLoaded', () => {
    const callButtons = document.querySelectorAll('.btn-join-call');
    
    function checkCallAvailability() {
        const now = new Date();
        callButtons.forEach(button => {
            const appointmentTime = new Date(button.dataset.appointmentTime);
            const activationTime = new Date(appointmentTime.getTime() - 5 * 60000); // 5 mins before

            if (now >= activationTime) {
                button.disabled = false;
                button.textContent = 'Join Call';
                button.style.backgroundColor = '#28a745';
                button.style.cursor = 'pointer';
            } else {
                button.disabled = true;
                button.textContent = 'Scheduled';
                button.style.backgroundColor = '#6c757d';
            }
        });
    }

    callButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!button.disabled) {
                const appointmentId = button.dataset.appointmentId;
                window.open(`/call?appointmentId=${appointmentId}`, 'CallWindow', 'width=900,height=700');
            }
        });
    });

    checkCallAvailability();
    setInterval(checkCallAvailability, 10000);
});