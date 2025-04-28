// Navigation active state
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('nav a');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (window.pageYOffset >= sectionTop - 60) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').substring(1) === current) {
            link.classList.add('active');
        }
    });
});

// WebSocket connection to ESP32
// Update WebSocket connection to use the Python server
const ws = new WebSocket('ws://localhost:8765');

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    // Handle regular gas data updates
    if (!data.type) {
        updateGasLevels(data);
        saveToHistory(data);
    }
    // Handle alerts
    else if (data.type === 'alert') {
        showAlert(data);
    }
};

// Add this new function to handle alerts
function showAlert(alert) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'gas-alert';
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${alert.message}</span>
    `;
    document.body.appendChild(alertDiv);
    
    // Remove alert after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Add this function to save data to history
function saveToHistory(data) {
    const historyData = JSON.parse(localStorage.getItem('gasHistory') || '[]');
    historyData.push(data);
    // Keep only last 100 readings
    if (historyData.length > 100) {
        historyData.shift();
    }
    localStorage.setItem('gasHistory', JSON.stringify(historyData));
}

function updateGasLevels(data) {
    const gases = ['co', 'co2', 'so2', 'ch4', 'butane', 'lpg', 'smoke'];
    
    gases.forEach(gas => {
        if (data[gas] !== undefined) {
            const gauge = document.getElementById(`${gas}-gauge`);
            const reading = document.getElementById(`${gas}-reading`);
            const status = document.getElementById(`${gas}-status`);
            
            if (gauge && reading && status) {
                // Update gauge
                const percentage = (data[gas] / getMaxValue(gas)) * 100;
                gauge.style.background = `conic-gradient(var(--secondary) ${percentage}%, var(--dark) 0%)`;
                
                // Update reading display
                reading.textContent = `${data[gas]} ppm`;
                
                // Update status
                const statusClass = getStatusClass(gas, data[gas]);
                status.className = `status ${statusClass}`;
                status.textContent = getStatus(gas, data[gas]);
            }
        }
    });
}

function updateHistoryList(data) {
    const historyItems = document.querySelector('.history-items');
    historyItems.innerHTML = '';

    data.readings.forEach(reading => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        historyItem.innerHTML = `
            <div class="history-time">${reading.timestamp}</div>
            <div class="history-details">
                <div class="gas-readings-list">
                    ${['co', 'co2', 'so2', 'ch4', 'butane', 'lpg', 'smoke'].map(gas => `
                        <div class="gas-reading-row">
                            <span class="gas-icon ${gas}"></span>
                            <span class="gas-name">${getGasName(gas)}</span>
                            <span class="gas-value">${reading[gas]} ppm</span>
                            <span class="status ${getStatusClass(gas, reading[gas])}">${getStatus(gas, reading[gas])}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        historyItems.appendChild(historyItem);
    });
}

// Add this helper function for gas names
function getGasName(gas) {
    const names = {
        co: 'CO',
        co2: 'CO₂',
        so2: 'SO₂',
        ch4: 'CH₄',
        butane: 'C₄H₁₀',
        lpg: 'LPG',
        smoke: 'Smoke'
    };
    return names[gas] || gas.toUpperCase();
}

function getMaxValue(gas) {
    const maxValues = {
        co: 50,
        co2: 5000,
        so2: 5,
        ch4: 1000,
        butane: 800,
        lpg: 1000,
        smoke: 300
    };
    return maxValues[gas];
}

function getStatus(gas, value) {
    const max = getMaxValue(gas);
    if (value < max * 0.5) return 'Safe';
    if (value < max * 0.8) return 'Warning';
    return 'Danger';
}

function getStatusClass(gas, value) {
    const max = getMaxValue(gas);
    if (value < max * 0.5) return 'safe';
    if (value < max * 0.8) return 'warning';
    return 'danger';
}

// History chart functionality
let historyChart;

apdocument.addEventListener('DOMContentLoaded', function() {
    // Initialize date picker with current date
    const historyDate = document.getElementById('historyDate');
    const today = new Date();
    historyDate.value = formatDate(today);

    // Add click handler to show date picker
    historyDate.addEventListener('click', function() {
        const temp = document.createElement('input');
        temp.type = 'date';
        temp.style.display = 'none';
        document.body.appendChild(temp);
        temp.focus();
        temp.click();

        temp.addEventListener('change', function() {
            const selectedDate = new Date(this.value);
            historyDate.value = formatDate(selectedDate);
            document.body.removeChild(temp);
        });
    });
});

function formatDate(date) {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

// Update your existing loadHistory function
function loadHistory() {
    const dateInput = document.getElementById('historyDate').value;
    const [month, day, year] = dateInput.split('/');
    const formattedDate = `${year}-${month}-${day}`; // Format for API request
    
    fetch(`/api/history?date=${formattedDate}`)
        .then(response => response.json())
        .then(data => {
            updateHistoryList(data);
        });
}

function updateHistoryList(data) {
    const historyItems = document.querySelector('.history-items');
    historyItems.innerHTML = '';

    data.readings.forEach(reading => {
        // Convert timestamp to MM/DD/YYYY HH:MM format
        const timestamp = new Date(reading.timestamp).toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        historyItem.innerHTML = `
            <div class="history-time">${reading.timestamp}</div>
            <div class="history-details">
                <div class="gas-readings-list">
                    <div class="gas-reading-row">
                        <span class="gas-icon co"></span>
                        <span class="gas-name">CO</span>
                        <span class="gas-value">${reading.co} ppm</span>
                        <span class="status ${getStatusClass('co', reading.co)}">${getStatus('co', reading.co)}</span>
                    </div>
                    <div class="gas-reading-row">
                        <span class="gas-icon co2"></span>
                        <span class="gas-name">CO₂</span>
                        <span class="gas-value">${reading.co2} ppm</span>
                        <span class="status ${getStatusClass('co2', reading.co2)}">${getStatus('co2', reading.co2)}</span>
                    </div>
                    <div class="gas-reading-row">
                        <span class="gas-icon so2"></span>
                        <span class="gas-name">SO₂</span>
                        <span class="gas-value">${reading.so2} ppm</span>
                        <span class="status ${getStatusClass('so2', reading.so2)}">${getStatus('so2', reading.so2)}</span>
                    </div>
                    <div class="gas-reading-row">
                        <span class="gas-icon ch4"></span>
                        <span class="gas-name">CH₄</span>
                        <span class="gas-value">${reading.ch4} ppm</span>
                        <span class="status ${getStatusClass('ch4', reading.ch4)}">${getStatus('ch4', reading.ch4)}</span>
                    </div>
                    <div class="gas-reading-row">
                        <span class="gas-icon butane"></span>
                        <span class="gas-name">C₄H₁₀</span>
                        <span class="gas-value">${reading.butane} ppm</span>
                        <span class="status ${getStatusClass('butane', reading.butane)}">${getStatus('butane', reading.butane)}</span>
                    </div>
                    <div class="gas-reading-row">
                        <span class="gas-icon lpg"></span>
                        <span class="gas-name">LPG</span>
                        <span class="gas-value">${reading.lpg} ppm</span>
                        <span class="status ${getStatusClass('lpg', reading.lpg)}">${getStatus('lpg', reading.lpg)}</span>
                    </div>
                    <div class="gas-reading-row">
                        <span class="gas-icon smoke"></span>
                        <span class="gas-name">Smoke</span>
                        <span class="gas-value">${reading.smoke} ppm</span>
                        <span class="status ${getStatusClass('smoke', reading.smoke)}">${getStatus('smoke', reading.smoke)}</span>
                    </div>
                </div>
            </div>
        `;
        
        historyItems.appendChild(historyItem);
    });
}

function updateHistoryChart(data) {
    const ctx = document.getElementById('historyChart').getContext('2d');
    
    if (historyChart) {
        historyChart.destroy();
    }

    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.timestamps,
            datasets: data.gases.map(gas => ({
                label: gas.name,
                data: gas.values,
                borderColor: getGasColor(gas.name),
                tension: 0.1
            }))
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function getGasColor(gas) {
    const colors = {
        co: '#ff4444',
        co2: '#00C851',
        so2: '#ffbb33',
        ch4: '#33b5e5',
        butane: '#2BBBAD',
        lpg: '#4285F4',
        smoke: '#aa66cc'
    };
    return colors[gas.toLowerCase()];
}

// Add these functions to your script.js
function downloadPDFReport() {
    const selectedDate = document.getElementById('historyDate').value;
    if (!selectedDate) {
        alert('Please select a date first');
        return;
    }

    // Create PDF using jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add custom font
    doc.addFont('fonts/OldManBookstyle.ttf', 'OldManBookstyle', 'normal');
    doc.setFont('OldManBookstyle');
    
    // Add header with custom font
    doc.setFontSize(22);
    doc.text('Gas Monitoring Report', 20, 20);
    
    // Add date
    doc.setFontSize(14);
    doc.text(`Date: ${formatDate(selectedDate)}`, 20, 30);
    
    // Add gas readings with custom font
    doc.setFontSize(12);
    let yPos = 50;
    
    // Get all gas readings for the day
    const gasReadings = getGasReadingsForDate(selectedDate);
    
    gasReadings.forEach(reading => {
        doc.text(`Time: ${reading.time}`, 20, yPos);
        yPos += 10;
        
        // Add each gas reading with custom font
        doc.text(`CO: ${reading.co} ppm - ${reading.coStatus}`, 30, yPos);
        yPos += 7;
        doc.text(`CO₂: ${reading.co2} ppm - ${reading.co2Status}`, 30, yPos);
        yPos += 7;
        doc.text(`SO₂: ${reading.so2} ppm - ${reading.so2Status}`, 30, yPos);
        yPos += 7;
        doc.text(`CH₄: ${reading.ch4} ppm - ${reading.ch4Status}`, 30, yPos);
        yPos += 7;
        doc.text(`Butane: ${reading.butane} ppm - ${reading.butaneStatus}`, 30, yPos);
        yPos += 7;
        doc.text(`LPG: ${reading.lpg} ppm - ${reading.lpgStatus}`, 30, yPos);
        yPos += 7;
        doc.text(`Smoke: ${reading.smoke} ppm - ${reading.smokeStatus}`, 30, yPos);
        yPos += 15;
    });

    // Save the PDF
    doc.save(`gas-report-${selectedDate}.pdf`);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function getGasReadingsForDate(date) {
    // This function should return the actual gas readings from your database/storage
    // This is a sample data structure
    return [
        {
            time: '09:00 AM',
            co: '25',
            coStatus: 'Safe',
            co2: '1000',
            co2Status: 'Safe',
            so2: '2',
            so2Status: 'Safe',
            ch4: '500',
            ch4Status: 'Safe',
            butane: '300',
            butaneStatus: 'Safe',
            lpg: '400',
            lpgStatus: 'Safe',
            smoke: '100',
            smokeStatus: 'Safe'
        }
        // Add more readings as needed
    ];
}

// Call button functionality
document.querySelectorAll('.call-btn').forEach(button => {
    button.addEventListener('click', function() {
        const phone = this.parentElement.querySelector('.phone').textContent;
        window.location.href = `tel:${phone}`;
    });
});


function updateGasDisplay(gasType, value) {
    // Update gauge
    const gauge = document.getElementById(`${gasType}-gauge`);
    const percentage = (value / getMaxValue(gasType)) * 100;
    gauge.style.background = `conic-gradient(var(--secondary) ${percentage}%, var(--dark) 0%)`;

    // Update reading display
    const reading = document.getElementById(`${gasType}-reading`);
    reading.textContent = `${value} ppm`;

    // Update status
    const status = document.getElementById(`${gasType}-status`);
    const statusClass = getStatusClass(gasType, value);
    status.className = `status ${statusClass}`;
    status.textContent = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);
}