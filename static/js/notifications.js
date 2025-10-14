// static/js/notifications.js
document.addEventListener('DOMContentLoaded', () => {
    const bellBtn = document.getElementById('notification-bell-btn');
    const countBadge = document.getElementById('notification-count');
    const dropdown = document.getElementById('notification-dropdown');

    const fetchNotifications = async () => {
        try {
            const response = await fetch('/notifications');
            if (!response.ok) return;

            const data = await response.json();

            if (data.count > 0) {
                countBadge.textContent = data.count;
                countBadge.classList.remove('hidden');
                
                dropdown.innerHTML = ''; // Clear previous notifications
                data.notifications.forEach(notif => {
                    const item = document.createElement('div');
                    item.className = 'notification-item';
                    item.textContent = notif.message;
                    dropdown.appendChild(item);
                });
            } else {
                countBadge.classList.add('hidden');
                dropdown.innerHTML = '<div class="notification-item">No new notifications.</div>';
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const markNotificationsAsRead = async () => {
        try {
            await fetch('/notifications/read', {
                method: 'POST'
            });
            countBadge.classList.add('hidden');
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    };

    if (bellBtn) {
        bellBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            dropdown.classList.toggle('hidden');
            
            // If dropdown is now visible and there were notifications, mark them as read
            if (!dropdown.classList.contains('hidden') && !countBadge.classList.contains('hidden')) {
                markNotificationsAsRead();
            }
        });
    }

    // Close dropdown if clicking outside
    document.addEventListener('click', (event) => {
        if (dropdown && !dropdown.classList.contains('hidden') && !bellBtn.contains(event.target)) {
            dropdown.classList.add('hidden');
        }
    });

    // Fetch notifications on page load
    fetchNotifications();
    // And fetch periodically (e.g., every 60 seconds)
    setInterval(fetchNotifications, 60000);
});