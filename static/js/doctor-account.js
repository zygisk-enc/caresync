document.addEventListener('DOMContentLoaded', () => {
    // --- Delete Confirmation Modal Logic ---
    const deleteBtn = document.getElementById('delete-account-btn');
    const cancelBtn = document.getElementById('cancel-delete-btn');
    const deleteModalBackdrop = document.getElementById('delete-modal-backdrop');

    if (deleteBtn && deleteModalBackdrop) {
        deleteBtn.addEventListener('click', () => {
            deleteModalBackdrop.classList.remove('hidden');
        });
    }

    if (cancelBtn && deleteModalBackdrop) {
        cancelBtn.addEventListener('click', () => {
            deleteModalBackdrop.classList.add('hidden');
        });
        
        deleteModalBackdrop.addEventListener('click', (event) => {
            if (event.target === deleteModalBackdrop) {
                deleteModalBackdrop.classList.add('hidden');
            }
        });
    }

    // --- Map Modal Logic ---
    const viewLocationBtn = document.getElementById('view-location-btn');
    const mapModalBackdrop = document.getElementById('map-modal-backdrop');
    const closeMapBtn = document.getElementById('close-map-modal-btn');
    const mapIframe = document.getElementById('map-iframe');
    const coordsEl = document.getElementById('clinic-coords');

    if (viewLocationBtn && mapModalBackdrop && mapIframe && coordsEl) {
        viewLocationBtn.addEventListener('click', () => {
            const coordsText = coordsEl.textContent.trim();
            const [lat, lng] = coordsText.split(',');

            if (lat && lng) {
                // Construct the URL for the view-only map route from main_routes.py
                mapIframe.src = `/view/map?lat=${lat.trim()}&lng=${lng.trim()}`;
                mapModalBackdrop.classList.remove('hidden');
            } else {
                // This is a fallback, but the button should not appear if there are no coords.
                console.error('Location coordinates are not available.');
            }
        });
    }
    
    const closeMapModal = () => {
        if(mapModalBackdrop) {
            mapModalBackdrop.classList.add('hidden');
        }
        if(mapIframe) {
            // Clear src to stop the map from running in the background and consuming resources
            mapIframe.src = ''; 
        }
    };

    if (closeMapBtn) {
        closeMapBtn.addEventListener('click', closeMapModal);
    }
    
    if (mapModalBackdrop) {
        mapModalBackdrop.addEventListener('click', (event) => {
            // Close the modal only if the click is on the backdrop itself, not on its children (the modal box)
            if (event.target === mapModalBackdrop) {
                closeMapModal();
            }
        });
    }
});

