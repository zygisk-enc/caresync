document.addEventListener('DOMContentLoaded', () => {
    // --- New Navigation Logic for Redesigned Dashboard ---
    const navItems = document.querySelectorAll('.doctor-nav-item');
    const detailContents = document.querySelectorAll('.doctor-details-content');

    function activateDoctor(doctorId) {
        // Deactivate all nav items and hide all detail views
        navItems.forEach(item => item.classList.remove('active'));
        detailContents.forEach(content => content.style.display = 'none');

        // Find and activate the selected doctor's nav item and details
        const activeNavItem = document.querySelector(`.doctor-nav-item[data-doctor-id="${doctorId}"]`);
        const activeDetailContent = document.getElementById(`doctor-details-${doctorId}`);

        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        if (activeDetailContent) {
            activeDetailContent.style.display = 'block';
        }
    }

    // Add click event listeners to each nav item
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const doctorId = item.dataset.doctorId;
            activateDoctor(doctorId);
        });
    });

    // Automatically activate the first doctor in the list on page load
    if (navItems.length > 0) {
        const firstDoctorId = navItems[0].dataset.doctorId;
        activateDoctor(firstDoctorId);
    }
    
    // --- Map Modal Logic ---
    const mapModalBackdrop = document.getElementById('map-modal-backdrop');
    const closeMapBtn = document.getElementById('close-map-modal-btn');
    const mapIframe = document.getElementById('map-iframe');
    const viewMapBtns = document.querySelectorAll('.view-map-btn');

    const openMapModal = (lat, lng) => {
        if (mapIframe && mapModalBackdrop) {
            mapIframe.src = `/view/map?lat=${lat}&lng=${lng}`;
            mapModalBackdrop.classList.remove('hidden');
        }
    };

    const closeMapModal = () => {
        if (mapModalBackdrop && mapIframe) {
            mapModalBackdrop.classList.add('hidden');
            mapIframe.src = '';
        }
    };

    viewMapBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lat = btn.dataset.lat;
            const lng = btn.dataset.lng;
            if (lat && lng) {
                openMapModal(lat, lng);
            }
        });
    });

    if (closeMapBtn) {
        closeMapBtn.addEventListener('click', closeMapModal);
    }
    if (mapModalBackdrop) {
        mapModalBackdrop.addEventListener('click', (event) => {
            if (event.target === mapModalBackdrop) {
                closeMapModal();
            }
        });
    }
});

