// The new and complete call-listener.js
document.addEventListener('DOMContentLoaded', () => {
    const socket = io("https://192.168.199.154:5000");
    const callBtn = document.getElementById('incoming-call-btn');
    const modalBackdrop = document.getElementById('call-notification-backdrop');
    const callerNamePlaceholder = document.getElementById('caller-name-placeholder');
    const acceptBtn = document.getElementById('accept-call-btn');
    const declineBtn = document.getElementById('decline-call-btn');
    
    let currentCallData = null;

    socket.on('incoming_call_alert', (data) => {
        currentCallData = data;
        if (callBtn) callBtn.classList.add('glowing-green');
    });

    if (callBtn) callBtn.addEventListener('click', () => {
        if (currentCallData) {
            callerNamePlaceholder.textContent = currentCallData.caller_info.name;
            modalBackdrop.classList.remove('hidden');
        } else {
            alert("There are no incoming calls.");
        }
    });

    if (acceptBtn) acceptBtn.addEventListener('click', () => {
        if (currentCallData) {
            // Open the doctor's call window. It knows its own identity from the server session.
            window.open('/call?mode=callee', 'CallWindow', 'width=900,height=700');
            resetCallUI();
        }
    });
    
    // ... (Add decline logic here if needed) ...

    function resetCallUI() {
        if (modalBackdrop) modalBackdrop.classList.add('hidden');
        if (callBtn) callBtn.classList.remove('glowing-green');
        currentCallData = null;
    }
});