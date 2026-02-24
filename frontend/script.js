const form = document.getElementById('assessmentForm');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultModal = document.getElementById('resultModal');
const closeBtn = document.querySelector('.close-btn');

// Close Modal Logic
if (closeBtn) {
    closeBtn.onclick = () => {
        resultModal.style.display = "none";
        mainApp.classList.remove('blurred');
    };
}

window.onclick = (event) => {
    if (event.target === resultModal) {
        resultModal.style.display = "none";
        mainApp.classList.remove('blurred');
    }
};

const suitabilityValue = document.getElementById('suitabilityValue');
const stressValue = document.getElementById('stressValue');
const careValue = document.getElementById('careValue');
const statusMessage = document.getElementById('statusMessage');
const smartAdvisory = document.getElementById('smartAdvisory');
const recommendationList = document.getElementById('recommendationList');

// === SMART PRESETS & MAPPING ===
const SOIL_PRESETS = {
    sandy: { n: 60, p: 20, k: 30, ph: 5.5 },
    clay: { n: 90, p: 40, k: 50, ph: 7.5 },
    loamy: { n: 120, p: 50, k: 60, ph: 6.5 },
    red: { n: 80, p: 30, k: 40, ph: 6.0 }
};

const WATER_PRESETS = {
    low: 50,
    medium: 150,
    high: 300
};

// === LOGIN LOGIC (MOCK) ===
const loginOverlay = document.getElementById('loginOverlay');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const loginTitle = document.getElementById('loginTitle');
const toggleText = document.getElementById('toggleText');
const googleButtonWrapper = document.getElementById('googleButtonWrapper');
const API_BASE = '/api';

let isRegister = false;

function enterApp(message) {
    loginOverlay.style.opacity = '0';
    setTimeout(() => {
        loginOverlay.style.display = 'none';
        mainApp.style.display = '';
        alert(message);
    }, 400);
}

function bindToggleAuth() {
    const toggle = document.getElementById('toggleAuth');
    if (!toggle) return;

    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        isRegister = !isRegister;
        if (isRegister) {
            loginTitle.textContent = 'Create Account';
            toggleText.innerHTML = 'Already have an account? <a href="#" id="toggleAuth">Login</a>';
            loginForm.querySelector('button').textContent = 'Register & Enter';
        } else {
            loginTitle.textContent = 'Welcome Back';
            toggleText.innerHTML = 'New to Plant AI? <a href="#" id="toggleAuth">Register Account</a>';
            loginForm.querySelector('button').textContent = 'Login to Dashboard';
        }
        bindToggleAuth();
    });
}

bindToggleAuth();

async function waitForGoogleSDK(maxWaitMs = 6000) {
    const intervalMs = 100;
    const maxTicks = Math.ceil(maxWaitMs / intervalMs);

    for (let i = 0; i < maxTicks; i += 1) {
        if (window.google?.accounts?.id) return true;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    return false;
}

async function initializeGoogleSignIn() {
    if (!googleButtonWrapper) return;

    const hasGoogleSDK = await waitForGoogleSDK();
    if (!hasGoogleSDK) {
        googleButtonWrapper.innerHTML = '<small style="color:#ff8b8b;">Google SDK failed to load.</small>';
        return;
    }

    let googleClientId = '';
    try {
        const configResponse = await fetch(`${API_BASE}/google-config`);
        const configData = await configResponse.json();
        googleClientId = configData.googleClientId || '';
    } catch (err) {
        console.error(err);
    }

    if (!googleClientId) {
        googleButtonWrapper.innerHTML = '<small style="color:#ff8b8b;">Google sign-in is disabled until GOOGLE_CLIENT_ID is set in backend/.env.</small>';
        return;
    }

    window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential
    });

    window.google.accounts.id.renderButton(googleButtonWrapper, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 320
    });
}

async function handleGoogleCredential(response) {
    try {
        const apiResponse = await fetch(`${API_BASE}/google-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        });

        const data = await apiResponse.json();
        if (!apiResponse.ok) {
            alert(data.message || 'Google authentication failed');
            return;
        }

        enterApp(data.message || 'Google authentication successful');
    } catch (err) {
        console.error(err);
        alert('Server error during Google sign-in. Is backend running?');
    }
}

initializeGoogleSignIn();

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const btn = loginForm.querySelector('button');
        btn.textContent = 'Authenticating...';
        btn.disabled = true;

        const url = isRegister
            ? `${API_BASE}/register`
            : `${API_BASE}/login`;

        const payload = isRegister
            ? { username: email.split('@')[0], email, password }
            : { email, password };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || 'Authentication failed');
                btn.textContent = isRegister ? 'Register & Enter' : 'Login to Dashboard';
                btn.disabled = false;
                return;
            }

            enterApp(data.message);
        } catch (err) {
            console.error(err);
            alert('Server error. Is backend running?');
        } finally {
            btn.disabled = false;
        }
    });
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    analyzeBtn.textContent = 'Analyzing...';
    analyzeBtn.disabled = true;

    const region = document.getElementById('region').value;
    const soilType = document.querySelector('input[name="soil_type"]:checked').value;
    const watering = document.querySelector('input[name="watering"]:checked').value;
    const city = document.getElementById('city').value;
    const plantType = document.getElementById('plant_type').value.trim();

    const soilData = SOIL_PRESETS[soilType];
    const rainData = WATER_PRESETS[watering];

    let temp = 28.0;
    let humid = 80.0;
    let weatherSource = 'fallback defaults';

    if (city) {
        try {
            const wxResponse = await fetch(`/weather?city=${encodeURIComponent(city)}`);
            if (wxResponse.ok) {
                const wxData = await wxResponse.json();
                temp = wxData.temperature;
                humid = wxData.humidity;
                weatherSource = `live weather from ${city}`;
            } else {
                weatherSource = `fallback defaults (weather API unavailable for ${city})`;
            }
        } catch (wxError) {
            console.error('Weather error:', wxError);
            weatherSource = `fallback defaults (weather fetch failed for ${city})`;
        }
    }

    const payload = {
        region,
        plant_type: plantType,
        temperature: temp,
        humidity: humid,
        rainfall: rainData,
        ph: soilData.ph,
        nitrogen: soilData.n,
        phosphorus: soilData.p,
        potassium: soilData.k
    };

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        resultModal.style.display = 'flex';
        mainApp.classList.add('blurred');

        if (!response.ok) {
            suitabilityValue.textContent = 'N/A';
            stressValue.textContent = 'NOT IDENTIFIED';
            careValue.textContent = '-';
            statusMessage.textContent = result?.detail || 'plant is not identified';
            renderRecommendations({
                smart_advisory: 'Verify plant name and retry with a supported crop or known indoor plant.',
                recommendations: [
                    'Check spelling of plant name.',
                    'Use crop names from the training dataset.',
                    'If this is an indoor plant, use indoor metrics workflow.'
                ]
            });
            return;
        }

        suitabilityValue.textContent = result.suitability_percentage;
        stressValue.textContent = result.stress_level;
        careValue.textContent = result.care_priority;

        if (result.stress_level === 'High' || result.stress_level === 'MISMATCH') {
            document.documentElement.style.setProperty('--accent', '#ff4757');
        } else if (result.stress_level === 'Medium') {
            document.documentElement.style.setProperty('--accent', '#ffa502');
        } else {
            document.documentElement.style.setProperty('--accent', '#2ed573');
        }

        const wxSource = city ? weatherSource : 'regional defaults';
        if (result.message) {
            statusMessage.innerHTML = `${result.message}<br><small>(${wxSource}: ${temp} C, ${humid}%)</small>`;
        } else {
            const zInfo = typeof result.avg_z_score === 'number' ? ` | Risk score: ${result.avg_z_score}` : '';
            statusMessage.innerHTML = `${result.region_context}${zInfo}<br><small>(${wxSource}: ${temp} C, ${humid}%)</small>`;
        }

        renderRecommendations(result);
    } catch (error) {
        console.error(error);
        alert('Analysis Failed');
    } finally {
        analyzeBtn.textContent = 'Analyze';
        analyzeBtn.disabled = false;
    }
});

function renderRecommendations(result) {
    smartAdvisory.textContent = result.smart_advisory || 'No additional advisory available.';
    recommendationList.innerHTML = '';
    const items = Array.isArray(result.recommendations) ? result.recommendations : [];
    const general = items.filter((x) => !x.startsWith('['));
    const today = items.find((x) => x.startsWith('[Today]'));
    const week = items.find((x) => x.startsWith('[This Week]'));
    const dosage = items.find((x) => x.startsWith('[Dosage]'));

    const concise = [];
    if (general.length) concise.push(general[0]);
    if (general.length > 1) concise.push(general[1]);
    if (today) concise.push(today);
    else if (result.time_bound_actions?.today?.length) concise.push(`[Today] ${result.time_bound_actions.today[0]}`);
    if (week) concise.push(week);
    else if (result.time_bound_actions?.this_week?.length) concise.push(`[This Week] ${result.time_bound_actions.this_week[0]}`);
    if (dosage) concise.push(dosage);
    else if (Array.isArray(result.dosage_guidance) && result.dosage_guidance.length) concise.push(`[Dosage] ${result.dosage_guidance[0]}`);

    const finalItems = concise.filter(Boolean).slice(0, 4);

    if (!finalItems.length) {
        finalItems.push('Maintain current care routine and monitor conditions regularly.');
    }

    finalItems.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        recommendationList.appendChild(li);
    });
}
