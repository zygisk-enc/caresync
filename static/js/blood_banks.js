document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const filterAllBtn = document.getElementById('filter-all');
    const filterNearbyBtn = document.getElementById('filter-nearby');
    const listContainer = document.getElementById('list-container');
    const detailsContainer = document.getElementById('details-container');
    const loader = document.getElementById('loader');

    let allBanksData = []; // Cache the fetched data

    const fetchBloodBanks = (searchTerm = '', lat = null, lng = null) => {
        loader.style.display = 'flex';
        listContainer.innerHTML = '';
        listContainer.appendChild(loader);
        showPlaceholder();

        let url = `/api/blood-banks?search=${encodeURIComponent(searchTerm)}`;
        if (lat && lng) {
            url += `&lat=${lat}&lng=${lng}`;
        }

        fetch(url)
            .then(response => response.json())
            .then(data => {
                allBanksData = data;
                renderList(allBanksData);
            })
            .catch(error => {
                console.error('Error fetching blood banks:', error);
                listContainer.innerHTML = '<p class="error-message">Could not load data. Please try again.</p>';
            });
    };

    const renderList = (banks) => {
        loader.style.display = 'none';
        listContainer.innerHTML = '';
        if (banks.length === 0) {
            listContainer.innerHTML = '<p class="no-results">No blood banks found.</p>';
            return;
        }

        banks.forEach(bank => {
            const distanceText = bank.distance !== null ? `<span class="distance">${bank.distance.toFixed(1)} km</span>` : '';
            const listItem = document.createElement('div');
            listItem.className = 'list-item';
            listItem.dataset.id = bank.id;
            listItem.innerHTML = `
                <div class="list-item-info">
                    <h4>${bank.name}</h4>
                    <p>${bank.city || ''}, ${bank.state || ''}</p>
                </div>
                ${distanceText}
            `;
            listContainer.appendChild(listItem);
        });
    };

    const renderDetails = (bank) => {
        const na = '<span class="not-available">N/A</span>';
        detailsContainer.innerHTML = `
            <div class="details-header">
                <h3>${bank.name}</h3>
                <p>${bank.category || na}</p>
            </div>
            <div class="details-grid">
                <div class="detail-item"><strong>Address</strong><span>${bank.address || na}, ${bank.city || ''}, ${bank.state || ''} - ${bank.pincode || ''}</span></div>
                <div class="detail-item"><strong>Service Time</strong><span>${bank.service_time || na}</span></div>
                <div class="detail-item"><strong>Contact No</strong><span>${bank.contact_no || na}</span></div>
                <div class="detail-item"><strong>Mobile</strong><span>${bank.mobile || na}</span></div>
                <div class="detail-item"><strong>Helpline</strong><span>${bank.helpline || na}</span></div>
                <div class="detail-item"><strong>Email</strong><span>${bank.email || na}</span></div>
                <div class="detail-item full-width"><strong>Website</strong><span>${bank.website ? `<a href="${bank.website}" target="_blank">${bank.website}</a>` : na}</span></div>
                <div class="detail-item"><strong>Nodal Officer</strong><span>${bank.nodal_officer || na}</span></div>
                <div class="detail-item"><strong>Officer Contact</strong><span>${bank.nodal_officer_mobile || bank.nodal_officer_contact || na}</span></div>
                <div class="detail-item"><strong>Components</strong><span>${bank.blood_components_available || na}</span></div>
                <div class="detail-item"><strong>Apheresis</strong><span>${bank.apheresis_available || na}</span></div>
                <div class="detail-item full-width"><strong>License #</strong><span>${bank.license_no || na}</span></div>
            </div>
            <div class="details-footer">
                <a href="#" class="direction-btn" data-lat="${bank.latitude}" data-lng="${bank.longitude}">
                    <i class="fas fa-directions"></i> Get Directions
                </a>
            </div>
        `;
    };
    
    const showPlaceholder = () => {
        detailsContainer.innerHTML = `
            <div class="placeholder">
                <i class="fas fa-hand-pointer"></i>
                <h3>Select a Blood Bank</h3>
                <p>Choose a blood bank from the list on the left to see its full details.</p>
            </div>
        `;
    };

    listContainer.addEventListener('click', (event) => {
        const targetItem = event.target.closest('.list-item');
        if (targetItem) {
            const bankId = parseInt(targetItem.dataset.id, 10);
            const bankData = allBanksData.find(b => b.id === bankId);

            document.querySelectorAll('.list-item.active').forEach(item => item.classList.remove('active'));
            targetItem.classList.add('active');

            if (bankData) {
                renderDetails(bankData);
            }
        }
    });

    detailsContainer.addEventListener('click', (event) => {
        const target = event.target.closest('.direction-btn');
        if (target) {
            event.preventDefault();
            const lat = target.dataset.lat;
            const lng = target.dataset.lng;
            if (lat === 'null' || lng === 'null' || !lat || !lng) {
                alert('There is no location data for this blood bank.');
            } else {
                window.open(`/directions/map?dlat=${lat}&dlng=${lng}`, '_blank');
            }
        }
    });

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value;
        const lat = (filterNearbyBtn.classList.contains('active') && userCoords) ? userCoords.latitude : null;
        const lng = (filterNearbyBtn.classList.contains('active') && userCoords) ? userCoords.longitude : null;
        fetchBloodBanks(searchTerm, lat, lng);
    });

    filterAllBtn.addEventListener('click', () => {
        filterAllBtn.classList.add('active');
        filterNearbyBtn.classList.remove('active');
        fetchBloodBanks(searchInput.value);
    });

    filterNearbyBtn.addEventListener('click', () => {
        filterNearbyBtn.classList.add('active');
        filterAllBtn.classList.remove('active');
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }
        navigator.geolocation.getCurrentPosition(position => {
            userCoords = position.coords;
            fetchBloodBanks(searchInput.value, userCoords.latitude, userCoords.longitude);
        }, () => {
            alert('Unable to retrieve your location. Reverting to all results.');
            filterAllBtn.click();
        });
    });

    fetchBloodBanks(); // Initial load
});