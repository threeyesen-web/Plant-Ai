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
const ANALYZE_DEFAULT_LABEL = 'Diagonose';
const ANALYZE_LOADING_LABEL = 'Diagonosing...';

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
const loginSubtitle = document.getElementById('loginSubtitle');
const toggleText = document.getElementById('toggleText');
const authMessage = document.getElementById('authMessage');
const googleButtonWrapper = document.getElementById('googleButtonWrapper');
const passwordInput = document.getElementById('password');
const passwordToggle = document.getElementById('passwordToggle');
const API_BASE = '/api';

let isRegister = false;
let landingHeaderWasInView = false;

function initHeroWordAnimation(animatedLines) {

    animatedLines.forEach(({ selector, lineDelayMs }) => {
        const el = document.querySelector(selector);
        if (!el) return;

        const words = el.textContent.trim().split(/\s+/).filter(Boolean);
        if (!words.length) return;

        el.textContent = '';

        words.forEach((word, index) => {
            const wordSpan = document.createElement('span');
            wordSpan.className = 'hero-word';
            if (word.toLowerCase().includes('sproutx')) {
                wordSpan.classList.add('brand');
            }
            wordSpan.style.setProperty('--word-index', String(index));
            wordSpan.style.setProperty('--line-delay', `${lineDelayMs}ms`);
            wordSpan.textContent = word;
            el.appendChild(wordSpan);

            if (index < words.length - 1) {
                el.appendChild(document.createTextNode(' '));
            }
        });
    });
}

initHeroWordAnimation([
    { selector: '.sproutx-hero h1', lineDelayMs: 120 },
    { selector: '.sproutx-hero p', lineDelayMs: 420 }
]);

function replayLandingHeaderAnimation() {
    initHeroWordAnimation([
        { selector: '.modern-brand p', lineDelayMs: 680 }
    ]);
}

function setupLandingHeaderReplayOnScroll() {
    const landingHeader = document.querySelector('.modern-header');
    if (!landingHeader || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const isInView = entry.isIntersecting && entry.intersectionRatio >= 0.45;

            if (isInView && !landingHeaderWasInView) {
                replayLandingHeaderAnimation();
            }

            landingHeaderWasInView = isInView;
        });
    }, {
        threshold: [0.45]
    });

    observer.observe(landingHeader);
}

setupLandingHeaderReplayOnScroll();

function enterApp(message) {
    clearAuthMessage();
    loginOverlay.style.opacity = '0';
    setTimeout(() => {
        loginOverlay.style.display = 'none';
        mainApp.style.display = '';

        // Start landing text animation only after layout is painted.
        requestAnimationFrame(() => {
            replayLandingHeaderAnimation();
        });

        // Fallback: ensure landing words are visible even if animation is skipped.
        setTimeout(() => {
            document.querySelectorAll('.modern-brand .hero-word').forEach((node) => {
                node.style.opacity = '1';
                node.style.transform = 'none';
                node.style.filter = 'none';
            });
        }, 2200);
        alert(message);
    }, 400);
}

function setAuthMessage(message, type = 'info') {
    if (!authMessage) return;
    authMessage.textContent = message || '';
    authMessage.classList.remove('is-info', 'is-error');
    if (!message) return;
    authMessage.classList.add(type === 'error' ? 'is-error' : 'is-info');
}

function clearAuthMessage() {
    setAuthMessage('');
}

function setAnalyzeButtonLoading(isLoading) {
    if (!analyzeBtn) return;

    if (isLoading) {
        analyzeBtn.disabled = true;
        analyzeBtn.classList.add('is-loading');
        analyzeBtn.innerHTML = `
            <span class="lab-loader" aria-hidden="true">
                <span class="scan-core">
                    <i class="scan-ring r1"></i>
                    <i class="scan-ring r2"></i>
                    <i class="scan-leaf"></i>
                </span>
            </span>
            <span class="btn-label">${ANALYZE_LOADING_LABEL}</span>
        `;
        return;
    }

    analyzeBtn.classList.remove('is-loading');
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = ANALYZE_DEFAULT_LABEL;
}

function bindToggleAuth() {
    const toggle = document.getElementById('toggleAuth');
    const submitBtn = loginForm?.querySelector('.login-btn');
    if (!toggle) return;

    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        isRegister = !isRegister;
        if (isRegister) {
            loginTitle.textContent = 'Create Account';
            if (loginSubtitle) loginSubtitle.textContent = 'Create an account to monitor and manage your plants.';
            toggleText.innerHTML = 'Already have an account? <a href="#" id="toggleAuth">Log in</a>';
            if (submitBtn) submitBtn.textContent = 'Register';
        } else {
            loginTitle.textContent = 'Login';
            if (loginSubtitle) loginSubtitle.textContent = 'Log in to monitor and manage your plants.';
            toggleText.innerHTML = 'New to Plant AI? <a href="#" id="toggleAuth">Create account</a>';
            if (submitBtn) submitBtn.textContent = 'Login';
        }
        clearAuthMessage();
        bindToggleAuth();
    });
}

bindToggleAuth();

if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener('click', () => {
        const isHidden = passwordInput.type === 'password';
        passwordInput.type = isHidden ? 'text' : 'password';
        passwordToggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
        passwordToggle.closest('.password-field')?.classList.toggle('is-visible', isHidden);
    });
}

function initFloatingLabels() {
    if (!loginForm) return;

    const fields = loginForm.querySelectorAll('.sproutx-field');
    fields.forEach((field) => {
        const input = field.querySelector('input');
        if (!input) return;

        const syncValueState = () => {
            field.classList.toggle('has-value', input.value.trim().length > 0);
        };

        input.addEventListener('focus', () => field.classList.add('is-focused'));
        input.addEventListener('blur', () => field.classList.remove('is-focused'));
        input.addEventListener('input', syncValueState);

        syncValueState();
    });
}

initFloatingLabels();

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
        googleButtonWrapper.innerHTML = '<small style="color:#728476;">Google sign-in is currently unavailable.</small>';
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
        googleButtonWrapper.innerHTML = '<small style="color:#728476;">Google sign-in is currently unavailable.</small>';
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
        width: 360
    });
}

async function handleGoogleCredential(response) {
    try {
        clearAuthMessage();
        const apiResponse = await fetch(`${API_BASE}/google-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        });

        const data = await apiResponse.json();
        if (!apiResponse.ok) {
            setAuthMessage(data.message || 'Google authentication failed', 'error');
            return;
        }

        enterApp(data.message || 'Google authentication successful');
    } catch (err) {
        console.error(err);
        setAuthMessage('Server error during Google sign-in. Is backend running?', 'error');
    }
}

function triggerGoogleSignInFromManualLogin() {
    if (!window.google?.accounts?.id) {
        setAuthMessage('Google sign-in is currently unavailable. Please use the Google button below.', 'error');
        return;
    }

    window.google.accounts.id.prompt();
    setAuthMessage('This email is registered with Google. Continue in the Google prompt to login.', 'info');
}

initializeGoogleSignIn();

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAuthMessage();

        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;

        const btn = loginForm.querySelector('.login-btn');
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
                if (!isRegister && data.requiresGoogleSignIn) {
                    triggerGoogleSignInFromManualLogin();
                    btn.textContent = 'Login';
                    btn.disabled = false;
                    return;
                }
                setAuthMessage(data.message || 'Authentication failed', 'error');
                btn.textContent = isRegister ? 'Register' : 'Login';
                btn.disabled = false;
                return;
            }

            enterApp(data.message);
        } catch (err) {
            console.error(err);
            setAuthMessage('Server error. Is backend running?', 'error');
        } finally {
            btn.disabled = false;
        }
    });
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setAnalyzeButtonLoading(true);

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
        setAnalyzeButtonLoading(false);
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
