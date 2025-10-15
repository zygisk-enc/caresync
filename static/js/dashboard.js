document.addEventListener('DOMContentLoaded', () => {

    // --- 1. ELEMENT SELECTION ---
    // Select all DOM elements that will be dynamically updated.
    const kpiAppointments = document.getElementById('kpi-total-appointments');
    const kpiVideoCalls = document.getElementById('kpi-total-calls');
    const kpiPrescriptions = document.getElementById('kpi-total-prescriptions');
    const chartCanvas = document.getElementById('health-status-chart');
    const promptHistoryContainer = document.getElementById('prompt-history-container');
    const promptLoader = document.getElementById('prompt-loader');
    const noPromptsMessage = document.getElementById('no-prompts-message');
    
    // --- 2. CONFIGURATION ---
    // Maps status keys from the API to their corresponding colors for the chart.
    const statusConfig = {
        'Approved': 'var(--status-color-approved)',
        'Pending': 'var(--status-color-pending)',
        'Rejected/Cancelled': 'var(--status-color-rejected)',
        'Prescriptions Issued': 'var(--status-color-prescription)',
    };

    /**
     * Renders the health status doughnut chart using Chart.js.
     * @param {Object} chartData - The data object for the chart from the API.
     */
// In dashboard.js

const createStatusChart = (chartData) => {
    if (!chartCanvas) return;

    const labels = Object.keys(chartData);
    const data = Object.values(chartData);

    // --- CORRECTED LOGIC: Read computed CSS variables ---
    // This function gets the actual color value (e.g., '#10b981') from the CSS variable name.
    const getCssVar = (varName) => getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

    const backgroundColors = labels.map(label => {
        switch (label) {
            case 'Approved': return getCssVar('--status-color-approved');
            case 'Pending': return getCssVar('--status-color-pending');
            case 'Rejected/Cancelled': return getCssVar('--status-color-rejected');
            case 'Prescriptions Issued': return getCssVar('--status-color-prescription');
            default: return '#888'; // Fallback color
        }
    });
    // --- END CORRECTION ---

            new Chart(chartCanvas, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Count',
                        data: data,
                        backgroundColor: backgroundColors, // Now uses the real color values
                        borderColor: 'var(--surface-1)',
                        borderWidth: 5,
                        hoverOffset: 10,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#ffffffff',
                                boxWidth: 25,
                                padding: 20,
                                font: {
                                    size: 14,
                                    weight: '500'
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'var(--surface-2)',
                            titleFont: { size: 14, weight: 'bold' },
                            bodyFont: { size: 12 },
                            padding: 10,
                            cornerRadius: 6,
                        }
                    }
                }
            });
        };

    /**
     * Updates the Key Performance Indicator (KPI) cards with data.
     * @param {Object} kpis - The KPI data object from the API.
     */
    const updateKpis = (kpis) => {
        if (kpiAppointments) kpiAppointments.textContent = kpis.totalAppointments ?? '0';
        if (kpiVideoCalls) kpiVideoCalls.textContent = kpis.totalVideoCalls ?? '0';
        if (kpiPrescriptions) kpiPrescriptions.textContent = kpis.totalPrescriptions ?? '0';
    };
// In dashboard.js, modify the renderPromptHistory function

    /**
     * Renders the list of recent AI conversations, including images.
     * @param {Array} history - An array of prompt history objects.
     */
    const renderPromptHistory = (history) => {
        promptLoader.classList.add('hidden');

        if (!history || history.length === 0) {
            noPromptsMessage.classList.remove('hidden');
            return;
        }

        let historyHtml = '';
        history.forEach(item => {
            // ADDED: Conditional rendering for image
            const userImageHtml = item.image_url ? 
                `<div class="prompt-image-container"><img src="${item.image_url}" alt="User uploaded image" class="prompt-image"></div>` : '';

            historyHtml += `
                <div class="prompt-item">
                    <div class="prompt-header">
                        <i class="prompt-icon fas fa-user"></i>
                        <div class="prompt-text"><strong>You:</strong> ${item.prompt}</div>
                    </div>
                    ${userImageHtml} <div class="prompt-header">
                        <i class="prompt-icon fas fa-robot"></i>
                        <div class="prompt-text"><strong>MediBot:</strong> ${item.response}</div>
                    </div>
                </div>
            `;
        });
        promptHistoryContainer.innerHTML = historyHtml;
    };

    /**
     * Main function to fetch all dashboard data and orchestrate the rendering.
     */
    const initializeDashboard = async () => {
        try {
            const response = await fetch('/api/dashboard-data');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();

            // Populate all the widgets with the fetched data.
            updateKpis(data.kpis);
            createStatusChart(data.chartData);
            renderPromptHistory(data.promptHistory);

        } catch (error) {
            console.error("Failed to load dashboard data:", error);
            // Display an error message in the widgets if the API fails.
            if (kpiAppointments) kpiAppointments.textContent = 'Error';
            if (kpiVideoCalls) kpiVideoCalls.textContent = 'Error';
            if (kpiPrescriptions) kpiPrescriptions.textContent = 'Error';
            promptLoader.innerHTML = '<p>Could not load conversation history.</p>';
        }
    };

    // --- 3. INITIALIZATION ---
    // Run the main function when the DOM is fully loaded.
    initializeDashboard();
});