
const form = document.getElementById('assessmentForm');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsPanel = document.getElementById('resultsPanel');
const placeholderContent = resultsPanel.querySelector('.placeholder-content');
const resultsContent = document.getElementById('resultsContent');

const suitabilityValue = document.getElementById('suitabilityValue');
const stressValue = document.getElementById('stressValue');
const careValue = document.getElementById('careValue');
const statusMessage = document.getElementById('statusMessage');
const progressCircle = document.querySelector('.progress-ring__circle');

// Plant type is now a free-text input (no dropdown)

const fetchWeatherBtn = document.getElementById('fetchWeatherBtn');
fetchWeatherBtn.addEventListener('click', async () => {
    const city = document.getElementById('city').value;
    if (!city) {
        alert("Please enter a city name.");
        return;
    }

    fetchWeatherBtn.disabled = true;
    fetchWeatherBtn.textContent = "Fetching...";

    try {
        const response = await fetch(`/weather?city=${encodeURIComponent(city)}`);
        if (!response.ok) throw new Error("Could not fetch weather");

        const data = await response.json();
        document.getElementById('temperature').value = data.temperature;
        document.getElementById('humidity').value = data.humidity;
    } catch (error) {
        console.error(error);
        alert("Failed to fetch weather data. Please check the city name or try again.");
    } finally {
        fetchWeatherBtn.disabled = false;
        fetchWeatherBtn.textContent = "Fetch Data";
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // UI Loading State
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing...";

    // Gather Data
    const formData = {
        plant_type: document.getElementById('plant_type').value.trim(),
        temperature: parseFloat(document.getElementById('temperature').value),
        humidity: parseFloat(document.getElementById('humidity').value),
        ph: parseFloat(document.getElementById('ph').value),
        nitrogen: parseFloat(document.getElementById('nitrogen').value),
        phosphorus: parseFloat(document.getElementById('phosphorus').value),
        potassium: parseFloat(document.getElementById('potassium').value),
        rainfall: parseFloat(document.getElementById('rainfall').value),
    };

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (!response.ok) {
            displayResults({
                suitability_percentage: 0,
                stress_level: "NOT IDENTIFIED",
                care_priority: "-",
                message: result?.detail || "plant is not identified",
                region_context: ""
            });
            return;
        }

        // Update UI with Results
        displayResults(result);

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to analyze data. Please try again.');
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = "Analyze Growth Conditions";
    }
});

function displayResults(data) {
    // Hide placeholder, show results
    placeholderContent.style.display = 'none';
    resultsContent.classList.remove('hidden');

    // Update Values
    const suitability = data.suitability_percentage;
    suitabilityValue.textContent = suitability;
    stressValue.textContent = data.stress_level;
    careValue.textContent = data.care_priority;

    // Color Coding
    const stressColor = getStressColor(data.stress_level);
    stressValue.style.color = stressColor;
    careValue.style.color = getCareColor(data.care_priority);

    // Progress Ring Animation
    const circumference = 326.72;
    const offset = circumference - (suitability / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
    progressCircle.style.stroke = getStressColor(data.stress_level === 'Low' ? 'Low' : data.stress_level === 'Medium' ? 'Medium' : 'High'); // Green if low stress (good)

    // Dynamic Message (prefer server-provided message)
    if (data.message) {
        statusMessage.textContent = data.message;
    } else if (data.stress_level === 'Low') {
        statusMessage.textContent = "Your plant is in excellent condition! The environment is well-suited for growth.";
    } else if (data.stress_level === 'Medium') {
        statusMessage.textContent = "Your plant is experiencing some stress. Check the care priority and adjust conditions.";
    } else if (data.stress_level === 'NOT IDENTIFIED') {
        statusMessage.textContent = "plant is not identified";
    } else {
        statusMessage.textContent = "Critical condition detected! Immediate action is required to save the plant.";
    }
}

function getStressColor(level) {
    switch (level) {
        case 'Low': return '#00d26a'; // Green
        case 'Medium': return '#f39c12'; // Orange
        case 'High': return '#ff4757'; // Red
        default: return '#fff';
    }
}

function getCareColor(level) {
    switch (level) {
        case 'Low': return '#a0a0a0';
        case 'Moderate': return '#f39c12';
        case 'Urgent': return '#ff4757';
        default: return '#fff';
    }
}
