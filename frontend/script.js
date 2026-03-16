const form = document.getElementById('assessmentForm');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultModal = document.getElementById('resultModal');
const closeBtn = document.querySelector('.close-btn');
const modernMain = document.querySelector('.modern-main');
const resultsContent = document.getElementById('resultsContent');
const shareReportContent = document.getElementById('shareReportContent');

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
const suitabilityMatchValue = document.getElementById('suitabilityMatchValue');
const suitabilityFill = document.getElementById('suitabilityFill');
const stressValue = document.getElementById('stressValue');
const careValue = document.getElementById('careValue');
const riskValue = document.getElementById('riskValue');
const analysisPlantTitle = document.getElementById('analysisPlantTitle');
const recalculateBtn = document.getElementById('recalculateBtn');
const shareReportBtn = document.getElementById('shareReportBtn');
const statusMessage = document.getElementById('statusMessage');
const smartAdvisory = document.getElementById('smartAdvisory');
const recommendationList = document.getElementById('recommendationList');
const addPlantBtn = document.getElementById('addPlantBtn');
const addPlantStatus = document.getElementById('addPlantStatus');
const myPlantsLink = document.getElementById('myPlantsLink');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeToggleIcon = document.getElementById('themeToggleIcon');
const themeToggleText = document.getElementById('themeToggleText');
const logoutBtn = document.getElementById('logoutBtn');
const myPlantsSection = document.getElementById('myPlantsSection');
const myPlantsList = document.getElementById('myPlantsList');
const myPlantsEmpty = document.getElementById('myPlantsEmpty');
const myPlantsActiveName = document.getElementById('myPlantsActiveName');
const myPlantsActiveMeta = document.getElementById('myPlantsActiveMeta');
const myPlantsHealthBadge = document.getElementById('myPlantsHealthBadge');
const myPlantsSuitability = document.getElementById('myPlantsSuitability');
const myPlantsStress = document.getElementById('myPlantsStress');
const myPlantsRisk = document.getElementById('myPlantsRisk');
const myPlantsPriority = document.getElementById('myPlantsPriority');
const myPlantsInsight = document.getElementById('myPlantsInsight');
const myPlantsHistoryBody = document.getElementById('myPlantsHistoryBody');
const fertilizerRecommendation = document.getElementById('fertilizerRecommendation');
const fertilizerName = document.getElementById('fertilizerName');
const fertilizerApplication = document.getElementById('fertilizerApplication');
const fertilizerReason = document.getElementById('fertilizerReason');
const fertilizerBuyLink = document.getElementById('fertilizerBuyLink');
const ANALYZE_DEFAULT_LABEL = 'Diagonose';
const ANALYZE_LOADING_LABEL = 'Diagonosing...';
let latestAnalysisContext = null;
let myPlantsCache = [];
let activeMyPlantId = '';

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
const confirmPasswordField = document.getElementById('confirmPasswordField');
const confirmPasswordInput = document.getElementById('confirmPassword');
const forgotPasswordLink = document.querySelector('.sproutx-forgot');
const API_BASE = '/api';
const USER_STORAGE_KEY = 'plant_ai_user';
const THEME_STORAGE_KEY = 'plant_ai_theme';
const FORGOT_PASSWORD_DEFAULT_LABEL = 'Forgot password?';

let isRegister = false;
let landingHeaderWasInView = false;

function formatPlantTitle(plantName) {
    if (!plantName) return 'Monstera Deliciosa';
    return String(plantName)
        .trim()
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function getStoredUser() {
    try {
        const raw = localStorage.getItem(USER_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (_) {
        return null;
    }
}

function setStoredUser(user) {
    if (!user || !user.id) return;
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    myPlantsCache = [];
    activeMyPlantId = '';
}

function getStoredUserId() {
    return getStoredUser()?.id || '';
}

function clearStoredUser() {
    localStorage.removeItem(USER_STORAGE_KEY);
    myPlantsCache = [];
    activeMyPlantId = '';
}

function setAddPlantStatus(message, type = 'info') {
    if (!addPlantStatus) return;
    addPlantStatus.textContent = message || '';
    if (type === 'success') {
        addPlantStatus.className = 'mt-3 min-h-6 text-sm font-semibold text-emerald-700';
        return;
    }
    if (type === 'error') {
        addPlantStatus.className = 'mt-3 min-h-6 text-sm font-semibold text-rose-700';
        return;
    }
    addPlantStatus.className = 'mt-3 min-h-6 text-sm font-semibold text-slate-600';
}

function toggleMyPlantsView(showMyPlants) {
    if (!form || !myPlantsSection) return;
    if (modernMain) {
        modernMain.classList.remove('is-screen-flipping');
        void modernMain.offsetWidth;
        modernMain.classList.add('is-screen-flipping');
    }
    form.classList.toggle('hidden', showMyPlants);
    myPlantsSection.classList.toggle('hidden', !showMyPlants);
    if (myPlantsLink) {
        myPlantsLink.textContent = showMyPlants ? 'Analyze' : 'Garden';
        myPlantsLink.classList.toggle('is-analyze', showMyPlants);
        myPlantsLink.classList.toggle('is-my-plants', !showMyPlants);
        myPlantsLink.classList.remove('is-switching');
        void myPlantsLink.offsetWidth;
        myPlantsLink.classList.add('is-switching');
    }
}

function formatShortDate(value) {
    if (!value) return '--';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '--';
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getHealthStatusMeta(suitabilityScore) {
    const score = Number(suitabilityScore) || 0;
    if (score >= 85) return { label: 'Optimal Health', tone: 'text-emerald-700 bg-emerald-100', dot: 'bg-emerald-500' };
    if (score >= 65) return { label: 'Improving', tone: 'text-amber-700 bg-amber-100', dot: 'bg-amber-500' };
    return { label: 'Needs Attention', tone: 'text-rose-700 bg-rose-100', dot: 'bg-rose-500' };
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeFertilizerPlan(rawPlan) {
    const plan = rawPlan || {};
    const firstLink = Array.isArray(plan.buy_links) && plan.buy_links.length ? plan.buy_links[0]?.url : '';
    return {
        recommendation: plan.recommendation || '-',
        fertilizerType: plan.fertilizer_type || plan.fertilizerType || '-',
        fertilizerName: plan.fertilizer_name || plan.fertilizerName || '-',
        searchTerm: plan.search_term || plan.searchTerm || plan.fertilizer_name || plan.fertilizerName || '',
        summary: plan.summary || '-',
        applicationPlan: plan.application_plan || plan.applicationPlan || '-',
        reason: plan.reason || '-',
        buyLink: plan.buyLink || firstLink || ''
    };
}

function buildIndiaMartLink(searchTerm) {
    const term = String(searchTerm || '').trim();
    if (!term || term === '-' || term.toLowerCase() === 'unknown') {
        return 'https://dir.indiamart.com/search.mp?ss=fertilizer+for+plants';
    }
    const normalized = term.replace(/\s+/g, ' ');
    if (!normalized || normalized === '-') {
        return 'https://dir.indiamart.com/search.mp?ss=fertilizer+for+plants';
    }
    return `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(normalized)}`;
}

function renderFertilizerPlan(rawPlan) {
    const plan = normalizeFertilizerPlan(rawPlan);
    if (fertilizerRecommendation) fertilizerRecommendation.textContent = plan.recommendation;
    if (fertilizerName) fertilizerName.textContent = plan.fertilizerName;
    if (fertilizerApplication) fertilizerApplication.textContent = plan.applicationPlan;
    if (fertilizerReason) fertilizerReason.textContent = `Why: ${plan.reason}`;
    if (fertilizerBuyLink) {
        const queryTerm = plan.searchTerm || (plan.fertilizerName !== '-' ? plan.fertilizerName : '');
        fertilizerBuyLink.href = plan.buyLink || buildIndiaMartLink(queryTerm);
    }
}

function resetMyPlantsDetail(message = 'Select a plant to view insight.') {
    if (myPlantsActiveName) myPlantsActiveName.textContent = 'Select a plant';
    if (myPlantsActiveMeta) myPlantsActiveMeta.textContent = 'No plant selected';
    if (myPlantsHealthBadge) {
        myPlantsHealthBadge.className = 'inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700';
        myPlantsHealthBadge.innerHTML = '<span class="material-symbols-outlined text-base leading-none">monitor_heart</span>Waiting for selection';
    }
    if (myPlantsSuitability) myPlantsSuitability.textContent = '--';
    if (myPlantsStress) myPlantsStress.textContent = '--';
    if (myPlantsRisk) myPlantsRisk.textContent = '--';
    if (myPlantsPriority) myPlantsPriority.textContent = '--';
    if (myPlantsInsight) myPlantsInsight.textContent = message;
    if (myPlantsHistoryBody) {
        myPlantsHistoryBody.innerHTML = '<tr><td colspan="5" class="px-4 py-4 text-sm font-medium text-slate-500">No monitoring history available.</td></tr>';
    }
}

async function loadMyPlantMonitoring(plantId) {
    const userId = getStoredUserId();
    if (!userId || !plantId) return [];
    const response = await fetch(`${API_BASE}/plants/${encodeURIComponent(plantId)}/monitoring?userId=${encodeURIComponent(userId)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data?.message || 'Failed to fetch monitoring history');
    }
    return Array.isArray(data.records) ? data.records : [];
}

function renderMyPlantsList() {
    if (!myPlantsList || !myPlantsEmpty) return;
    myPlantsList.innerHTML = '';

    if (!myPlantsCache.length) {
        myPlantsEmpty.classList.remove('hidden');
        myPlantsEmpty.textContent = 'No plants added yet. Run analysis and use Add Plant to build your garden.';
        return;
    }

    myPlantsEmpty.classList.add('hidden');

    myPlantsCache.forEach((plant) => {
        const isActive = plant.id === activeMyPlantId;
        const latest = plant.latestMonitoring || {};
        const suitability = Number(latest.suitabilityScore) || 0;
        const health = getHealthStatusMeta(suitability);
        const container = document.createElement('div');
        container.className = `group relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all ${
            isActive
                ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white shadow-emerald-100/80'
                : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md'
        }`;

        const accent = document.createElement('div');
        accent.className = `pointer-events-none absolute inset-y-0 left-0 w-1.5 ${isActive ? 'bg-emerald-500' : 'bg-slate-200 group-hover:bg-emerald-300'}`;
        container.appendChild(accent);

        const top = document.createElement('div');
        top.className = 'ml-1 flex items-start justify-between gap-3';

        const selectBtn = document.createElement('button');
        selectBtn.type = 'button';
        selectBtn.className = 'flex min-w-0 flex-1 items-start gap-3 text-left';
        selectBtn.dataset.plantId = plant.id;
        selectBtn.innerHTML = `
            <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-100 text-emerald-700 shadow-sm">
                <span class="material-symbols-outlined text-lg leading-none">potted_plant</span>
            </span>
            <span class="min-w-0">
                <span class="block truncate text-base font-extrabold tracking-tight text-slate-900">${escapeHtml(plant.plantName || 'Unnamed Plant')}</span>
                <span class="mt-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">${escapeHtml(plant.city || 'Unknown city')} | ${escapeHtml(String(plant.plantLocation || 'outdoor').replace(/^./, (s) => s.toUpperCase()))}</span>
                <span class="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${health.tone}">
                    <span class="h-2 w-2 rounded-full ${health.dot}"></span>${health.label}
                </span>
                <span class="mt-2 block text-xs font-semibold text-slate-600">Suitability: ${Math.round(suitability)}%</span>
            </span>
        `;

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600';
        deleteBtn.dataset.deletePlantId = plant.id;
        deleteBtn.innerHTML = '<span class="material-symbols-outlined text-lg leading-none">delete</span>';

        top.appendChild(selectBtn);
        top.appendChild(deleteBtn);
        container.appendChild(top);
        myPlantsList.appendChild(container);
    });

    myPlantsList.querySelectorAll('[data-plant-id]').forEach((button) => {
        button.addEventListener('click', () => selectMyPlant(button.dataset.plantId || ''));
    });

    myPlantsList.querySelectorAll('[data-delete-plant-id]').forEach((button) => {
        button.addEventListener('click', async () => {
            const plantId = button.dataset.deletePlantId || '';
            if (!plantId) return;
            if (!confirm('Remove this plant from Garden?')) return;
            await deleteMyPlant(plantId);
        });
    });
}

function renderMyPlantHistory(records) {
    if (!myPlantsHistoryBody) return;
    if (!records.length) {
        myPlantsHistoryBody.innerHTML = '<tr><td colspan="5" class="px-4 py-4 text-sm font-medium text-slate-500">No monitoring history available.</td></tr>';
        return;
    }

    myPlantsHistoryBody.innerHTML = '';
    records.slice(0, 8).forEach((entry) => {
        const suitability = Number(entry.suitabilityScore) || 0;
        const status = getHealthStatusMeta(suitability);
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50';
        row.innerHTML = `
            <td class="px-4 py-3 font-semibold text-slate-700">${formatShortDate(entry.dateChecked)}</td>
            <td class="px-4 py-3 text-slate-700">${Math.round(suitability)}%</td>
            <td class="px-4 py-3 text-slate-700">${entry.stressLevel || '--'}</td>
            <td class="px-4 py-3 text-slate-700">${entry.carePriority || '--'}</td>
            <td class="px-4 py-3 text-right">
                <span class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${status.tone}">
                    <span class="h-2 w-2 rounded-full ${status.dot}"></span>${status.label}
                </span>
            </td>
        `;
        myPlantsHistoryBody.appendChild(row);
    });
}

function updateMyPlantsDetail(plant, records) {
    const latest = plant?.latestMonitoring || records[0] || {};
    const suitability = Math.round(Number(latest.suitabilityScore) || 0);
    const health = getHealthStatusMeta(suitability);

    if (myPlantsActiveName) myPlantsActiveName.textContent = plant?.plantName || 'Selected Plant';
    if (myPlantsActiveMeta) {
        myPlantsActiveMeta.textContent = `${plant?.region || 'Unknown region'} | ${plant?.city || 'Unknown city'} | ${String(plant?.plantLocation || 'outdoor').replace(/^./, (s) => s.toUpperCase())}`;
    }
    if (myPlantsHealthBadge) {
        myPlantsHealthBadge.className = `inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${health.tone}`;
        myPlantsHealthBadge.innerHTML = `<span class="material-symbols-outlined text-base leading-none">monitor_heart</span>${health.label}`;
    }

    if (myPlantsSuitability) myPlantsSuitability.textContent = `${suitability}%`;
    if (myPlantsStress) myPlantsStress.textContent = latest.stressLevel || '--';
    if (myPlantsRisk) myPlantsRisk.textContent = `${Math.round(Number(latest.riskScore) || 0)}%`;
    if (myPlantsPriority) myPlantsPriority.textContent = latest.carePriority || '--';

    const oldest = records[records.length - 1];
    const newest = records[0];
    if (myPlantsInsight) {
        if (oldest && newest) {
            const delta = Math.round((Number(newest.suitabilityScore) || 0) - (Number(oldest.suitabilityScore) || 0));
            const trendText = delta > 0 ? `improved by ${delta}%` : delta < 0 ? `dropped by ${Math.abs(delta)}%` : 'stayed stable';
            const advice = newest.advisoryText || 'Maintain consistency in watering and nutrient schedule.';
            myPlantsInsight.textContent = `Suitability has ${trendText} across recent checks. ${advice}`;
        } else if (newest?.advisoryText) {
            myPlantsInsight.textContent = newest.advisoryText;
        } else {
            myPlantsInsight.textContent = 'Add more monitoring records to unlock trend-based guidance.';
        }
    }

    renderMyPlantHistory(records);
}

async function selectMyPlant(plantId) {
    if (!plantId) return;
    activeMyPlantId = plantId;
    renderMyPlantsList();

    const target = myPlantsCache.find((plant) => String(plant.id) === String(plantId));
    if (!target) {
        resetMyPlantsDetail();
        return;
    }

    try {
        const records = await loadMyPlantMonitoring(plantId);
        updateMyPlantsDetail(target, records);
    } catch (error) {
        console.error(error);
        updateMyPlantsDetail(target, []);
    }
}

async function deleteMyPlant(plantId) {
    const userId = getStoredUserId();
    if (!userId || !plantId) return;
    const response = await fetch(`${API_BASE}/plants/${encodeURIComponent(plantId)}?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        alert(data?.message || 'Unable to delete plant.');
        return;
    }
    await loadMyPlants();
}

async function loadMyPlants(preferredPlantId = '') {
    if (!myPlantsList || !myPlantsEmpty) return;
    const userId = getStoredUserId();
    if (!userId) {
        myPlantsCache = [];
        activeMyPlantId = '';
        renderMyPlantsList();
        myPlantsEmpty.classList.remove('hidden');
        myPlantsEmpty.textContent = 'Please login to view your saved plants.';
        resetMyPlantsDetail('Login to access your plant tracking dashboard.');
        return;
    }

    myPlantsList.innerHTML = '<div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-600">Loading plants...</div>';
    try {
        const response = await fetch(`${API_BASE}/plants?userId=${encodeURIComponent(userId)}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data?.message || 'Failed to load plants');
        }

        myPlantsCache = Array.isArray(data.plants) ? data.plants : [];
        if (!myPlantsCache.length) {
            activeMyPlantId = '';
            renderMyPlantsList();
            resetMyPlantsDetail('No plant history yet. Add your first plant from analysis results.');
            return;
        }

        const resolvedId = preferredPlantId && myPlantsCache.some((p) => String(p.id) === String(preferredPlantId))
            ? preferredPlantId
            : (activeMyPlantId && myPlantsCache.some((p) => String(p.id) === String(activeMyPlantId))
                ? activeMyPlantId
                : String(myPlantsCache[0].id));

        await selectMyPlant(String(resolvedId));
    } catch (error) {
        console.error(error);
        myPlantsCache = [];
        activeMyPlantId = '';
        renderMyPlantsList();
        myPlantsEmpty.classList.remove('hidden');
        myPlantsEmpty.textContent = 'Failed to load Garden right now.';
        resetMyPlantsDetail('Unable to fetch tracking records at the moment.');
    }
}

if (recalculateBtn) {
    recalculateBtn.addEventListener('click', () => {
        resultModal.style.display = 'none';
        mainApp.classList.remove('blurred');
    });
}

if (myPlantsLink) {
    myPlantsLink.addEventListener('click', async (event) => {
        event.preventDefault();
        if (!getStoredUserId()) {
            alert('Please login to access your Garden data.');
            return;
        }
        const openingMyPlants = myPlantsSection?.classList.contains('hidden');
        if (openingMyPlants) {
            toggleMyPlantsView(true);
            await loadMyPlants();
            return;
        }
        toggleMyPlantsView(false);
    });
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        toggleTheme();
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        logoutToLogin();
    });
}

if (shareReportBtn) {
    shareReportBtn.addEventListener('click', async () => {
        const title = analysisPlantTitle?.textContent || 'Plant Analysis';
        const originalLabel = shareReportBtn.innerHTML;
        shareReportBtn.disabled = true;
        shareReportBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] leading-none">hourglass_top</span>Preparing PDF...';

        try {
            const pdfBlob = await generateReportPdfBlob(title);
            const fileName = `${title.replace(/\s+/g, '_').toLowerCase()}_report.pdf`;
            const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

            if (navigator.canShare && navigator.canShare({ files: [pdfFile] }) && navigator.share) {
                await navigator.share({ title, files: [pdfFile] });
                return;
            }

            const blobUrl = URL.createObjectURL(pdfBlob);
            const anchor = document.createElement('a');
            anchor.href = blobUrl;
            anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
            alert('Analysis report PDF downloaded.');
        } catch (error) {
            console.error(error);
            const summary = `Suitability: ${suitabilityValue.textContent}% | Stress: ${stressValue.textContent} | Care: ${careValue.textContent}`;
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(`${title}\n${summary}`);
                alert('PDF generation failed. Report summary copied instead.');
            } else {
                alert('PDF generation failed. Please try again.');
            }
        } finally {
            shareReportBtn.disabled = false;
            shareReportBtn.innerHTML = originalLabel;
        }
    });
}

async function generateReportPdfBlob(reportTitle) {
    const exportNode = shareReportContent || resultsContent;
    if (!exportNode) {
        throw new Error('Report content is unavailable.');
    }
    if (!window.html2canvas || !window.jspdf?.jsPDF) {
        throw new Error('PDF libraries are not loaded.');
    }

    const hiddenNodes = Array.from(exportNode.querySelectorAll('button, a'));
    const previousVisibility = hiddenNodes.map((node) => node.style.visibility);
    hiddenNodes.forEach((node) => {
        node.style.visibility = 'hidden';
    });

    let canvas;
    try {
        canvas = await window.html2canvas(exportNode, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        });
    } finally {
        hiddenNodes.forEach((node, index) => {
            node.style.visibility = previousVisibility[index] || '';
        });
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 18;
    const usableWidth = pageWidth - margin * 2;
    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imageData = canvas.toDataURL('image/png');

    let renderedHeight = 0;
    let pageIndex = 0;
    while (renderedHeight < imgHeight) {
        if (pageIndex > 0) pdf.addPage();
        const yOffset = margin - renderedHeight;
        pdf.addImage(imageData, 'PNG', margin, yOffset, imgWidth, imgHeight, undefined, 'FAST');
        renderedHeight += (pageHeight - margin * 2);
        pageIndex += 1;
    }

    pdf.setProperties({ title: `${reportTitle} Report` });
    return pdf.output('blob');
}

if (addPlantBtn) {
    addPlantBtn.addEventListener('click', async () => {
        if (!latestAnalysisContext) {
            setAddPlantStatus('Run an analysis first, then add the plant to Garden.', 'error');
            return;
        }

        const userId = getStoredUserId();
        if (!userId) {
            setAddPlantStatus('Login required to add plants to Garden.', 'error');
            return;
        }

        const { result, payload, formState, weatherMeta } = latestAnalysisContext;
        const riskScore = Math.max(0, Math.min(100, Math.round(Number(result?.risk_score) || 0)));

        const requestBody = {
            userId,
            plantName: formatPlantTitle(formState.plantType),
            region: formState.region,
            city: formState.city || 'Unknown',
            soilType: formState.soilType,
            waterAvailability: formState.watering,
            plantLocation: formState.location,
            initialAnalysis: {
                dateChecked: new Date().toISOString(),
                suitabilityScore: Number(result?.suitability_percentage) || 0,
                stressLevel: result?.stress_level || 'Unknown',
                carePriority: result?.care_priority || 'Unknown',
                riskScore,
                advisoryText: result?.smart_advisory || 'No additional advisory available.',
                fertilizerPlan: normalizeFertilizerPlan(result?.fertilizer_plan),
                nutrientValues: {
                    nitrogen: payload.nitrogen,
                    phosphorus: payload.phosphorus,
                    potassium: payload.potassium
                },
                inputParameters: {
                    temperature: payload.temperature,
                    humidity: payload.humidity,
                    rainfall: payload.rainfall,
                    ph: payload.ph,
                    weatherSource: weatherMeta.source || 'regional defaults'
                }
            }
        };

        const originalLabel = addPlantBtn.textContent;
        addPlantBtn.disabled = true;
        addPlantBtn.textContent = 'Adding...';
        setAddPlantStatus('Saving plant to Garden...', 'info');

        try {
            const response = await fetch(`${API_BASE}/plants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                setAddPlantStatus(data?.message || 'Unable to add plant right now.', 'error');
                return;
            }

            setAddPlantStatus(`${formatPlantTitle(formState.plantType)} added to Garden successfully.`, 'success');
            if (myPlantsSection && !myPlantsSection.classList.contains('hidden')) {
                await loadMyPlants(data?.plant?.id ? String(data.plant.id) : '');
            }
        } catch (error) {
            console.error(error);
            setAddPlantStatus('Network error while adding plant.', 'error');
        } finally {
            addPlantBtn.disabled = false;
            addPlantBtn.textContent = originalLabel || 'Add Plant';
        }
    });
}

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
        if (!getStoredUserId()) {
            clearStoredUser();
        } else {
            loadMyPlants().catch((error) => console.error('Garden preload failed:', error));
        }
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

function setForgotPasswordLoading(isLoading) {
    if (!forgotPasswordLink) return;
    forgotPasswordLink.textContent = isLoading ? 'Sending reset link...' : FORGOT_PASSWORD_DEFAULT_LABEL;
    forgotPasswordLink.style.pointerEvents = isLoading ? 'none' : '';
    forgotPasswordLink.style.opacity = isLoading ? '0.7' : '';
}

async function handleForgotPassword() {
    if (isRegister) {
        setAuthMessage('Switch to Login mode to reset your password.', 'info');
        return;
    }

    const emailInput = document.getElementById('email');
    const email = String(emailInput?.value || '').trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
        setAuthMessage('Enter your registered email first, then click Forgot password.', 'info');
        emailInput?.focus();
        return;
    }
    if (!emailPattern.test(email)) {
        setAuthMessage('Please enter a valid email address.', 'error');
        emailInput?.focus();
        return;
    }

    clearAuthMessage();
    setForgotPasswordLoading(true);
    try {
        const response = await fetch(`${API_BASE}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            setAuthMessage(data.message || 'Unable to send reset link right now.', 'error');
            return;
        }
        setAuthMessage(
            data.message || 'If the email is registered, a password reset link has been sent.',
            'info'
        );
    } catch (error) {
        console.error(error);
        setAuthMessage('Server error while sending reset link. Is backend running?', 'error');
    } finally {
        setForgotPasswordLoading(false);
    }
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

function applyTheme(theme) {
    const dark = theme === 'dark';
    document.body.classList.toggle('theme-dark', dark);
    if (themeToggleIcon) themeToggleIcon.textContent = dark ? 'light_mode' : 'dark_mode';
    if (themeToggleText) themeToggleText.textContent = dark ? 'Day' : 'Night';
}

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
}

function toggleTheme() {
    const nextTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
}

function logoutToLogin() {
    clearStoredUser();
    latestAnalysisContext = null;
    if (resultModal) resultModal.style.display = 'none';
    if (mainApp) mainApp.classList.remove('blurred');
    toggleMyPlantsView(false);
    if (form) form.reset();
    if (loginForm) loginForm.reset();
    clearAuthMessage();
    applyAuthMode(false);
    bindToggleAuth();
    if (loginOverlay) {
        loginOverlay.style.display = '';
        loginOverlay.style.opacity = '1';
    }
    if (mainApp) {
        mainApp.style.display = 'none';
    }
}

function applyAuthMode(registerMode) {
    isRegister = registerMode;
    const submitBtn = loginForm?.querySelector('.login-btn');
    if (confirmPasswordField && confirmPasswordInput) {
        confirmPasswordField.hidden = !isRegister;
        confirmPasswordInput.required = isRegister;
        if (!isRegister) {
            confirmPasswordInput.value = '';
        }
    }
    if (forgotPasswordLink) {
        forgotPasswordLink.hidden = isRegister;
        forgotPasswordLink.setAttribute('aria-hidden', isRegister ? 'true' : 'false');
        forgotPasswordLink.tabIndex = isRegister ? -1 : 0;
    }
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
}

function bindToggleAuth() {
    const toggle = document.getElementById('toggleAuth');
    if (!toggle) return;

    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        applyAuthMode(!isRegister);
        clearAuthMessage();
        bindToggleAuth();
    });
}

initTheme();
bindToggleAuth();

if (forgotPasswordLink) {
    forgotPasswordLink.textContent = FORGOT_PASSWORD_DEFAULT_LABEL;
    forgotPasswordLink.addEventListener('click', (event) => {
        event.preventDefault();
        handleForgotPassword();
    });
}

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

        if (data?.user) {
            setStoredUser(data.user);
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
        const confirmPassword = confirmPasswordInput?.value || '';
        if (isRegister && password.length < 8) {
            setAuthMessage('Password must be at least 8 characters long.', 'error');
            return;
        }
        if (isRegister && password !== confirmPassword) {
            setAuthMessage('Password and confirm password must match.', 'error');
            return;
        }

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
                if (data.requiresGoogleSignIn) {
                    triggerGoogleSignInFromManualLogin();
                    btn.textContent = isRegister ? 'Register' : 'Login';
                    btn.disabled = false;
                    return;
                }
                if (data.needsEmailVerification) {
                    setAuthMessage(data.message || 'Please verify your email before login.', 'info');
                    btn.textContent = isRegister ? 'Register' : 'Login';
                    btn.disabled = false;
                    return;
                }
                setAuthMessage(data.message || 'Authentication failed', 'error');
                btn.textContent = isRegister ? 'Register' : 'Login';
                btn.disabled = false;
                return;
            }

            if (isRegister && data?.requiresEmailVerification) {
                setAuthMessage(data.message || 'Registration successful. Verify your email, then login.', 'info');
                applyAuthMode(false);
                bindToggleAuth();
                return;
            }
            if (data?.user) {
                setStoredUser(data.user);
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
    const plantLocation = document.querySelector('input[name="location"]:checked')?.value || 'outdoor';

    const soilData = SOIL_PRESETS[soilType];
    const rainData = WATER_PRESETS[watering];

    let temp = 28.0;
    let humid = 80.0;
    let weatherSource = 'fallback defaults';

    if (city) {
        try {
            const isIndiaRegion = region === 'Kerala' || region === 'Rest of India';
            const includeCountry = isIndiaRegion && !city.includes(',');
            const countryParam = includeCountry ? '&country=IN' : '';
            const wxResponse = await fetch(`/weather?city=${encodeURIComponent(city)}${countryParam}`);
            if (wxResponse.ok) {
                const wxData = await wxResponse.json();
                temp = wxData.temperature;
                humid = wxData.humidity;
                weatherSource = `live weather from ${wxData.location || city}`;
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
        plant_location: plantLocation,
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
        analysisPlantTitle.textContent = formatPlantTitle(plantType);

        if (!response.ok) {
            latestAnalysisContext = null;
            setAddPlantStatus('Plant could not be identified. Update inputs and try again.', 'error');
            renderFertilizerPlan(null);
            suitabilityValue.textContent = 'N/A';
            suitabilityMatchValue.textContent = '0';
            suitabilityFill.style.width = '0%';
            stressValue.textContent = 'NOT IDENTIFIED';
            careValue.textContent = '-';
            riskValue.textContent = '-';
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

        const suitability = Number(result.suitability_percentage) || 0;
        suitabilityValue.textContent = suitability;
        suitabilityMatchValue.textContent = suitability;
        suitabilityFill.style.width = `${Math.max(0, Math.min(100, suitability))}%`;
        stressValue.textContent = result.stress_level;
        careValue.textContent = result.care_priority;
        riskValue.textContent = String(Math.max(0, Math.min(100, Math.round(Number(result.risk_score) || 0))));

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
            const zInfo = typeof result.avg_z_score === 'number' ? ` | Avg deviation (z): ${result.avg_z_score}` : '';
            statusMessage.innerHTML = `${result.region_context}${zInfo}<br><small>(${wxSource}: ${temp} C, ${humid}%)</small>`;
        }

        renderRecommendations(result);
        renderFertilizerPlan(result?.fertilizer_plan);
        latestAnalysisContext = {
            result,
            payload,
            weatherMeta: { source: wxSource, temperature: temp, humidity: humid },
            formState: {
                region,
                soilType,
                watering,
                city,
                plantType,
                location: plantLocation
            }
        };
        setAddPlantStatus('Analysis ready. You can now add this plant to Garden.', 'info');
    } catch (error) {
        console.error(error);
        latestAnalysisContext = null;
        setAddPlantStatus('Analysis failed. Please retry before adding plant.', 'error');
        alert('Analysis Failed');
    } finally {
        setAnalyzeButtonLoading(false);
    }
});

function renderRecommendations(result) {
    smartAdvisory.textContent = buildAssessmentSummary(result);
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
        const { tag, text } = parseRecommendationItem(item);
        const li = document.createElement('li');
        li.className = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';

        const topRow = document.createElement('div');
        topRow.className = 'mb-2 flex items-center gap-2';

        const dot = document.createElement('span');
        dot.className = `inline-block h-2.5 w-2.5 rounded-full ${getRecommendationDotClass(tag)}`;
        dot.setAttribute('aria-hidden', 'true');
        topRow.appendChild(dot);

        const badge = document.createElement('span');
        badge.className = `inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${getRecommendationBadgeClass(tag)}`;
        badge.textContent = tag || 'Action';
        topRow.appendChild(badge);

        const body = document.createElement('p');
        body.className = 'text-sm font-medium leading-6 text-slate-700';
        body.textContent = text;

        li.appendChild(topRow);
        li.appendChild(body);
        recommendationList.appendChild(li);
    });
}

function buildAssessmentSummary(result) {
    const lines = [];
    const advisory = result?.smart_advisory || 'No additional advisory available.';
    lines.push(advisory);

    const meta = [];
    if (result?.stress_level) meta.push(`Stress: ${result.stress_level}`);
    if (result?.care_priority) meta.push(`Care Priority: ${result.care_priority}`);
    if (typeof result?.suitability_percentage === 'number') {
        meta.push(`Suitability Match: ${Math.max(0, Math.min(100, Math.round(result.suitability_percentage)))}%`);
    }
    if (meta.length) {
        lines.push(`Current Snapshot: ${meta.join(' | ')}`);
    }

    if (Array.isArray(result?.top_risk_factors) && result.top_risk_factors.length) {
        const topRisks = result.top_risk_factors.slice(0, 2).map((risk) => {
            const feature = risk.feature || 'Factor';
            const direction = risk.direction || 'off-target';
            const current = typeof risk.current === 'number' ? risk.current : null;
            const target = typeof risk.target === 'number' ? risk.target : null;
            if (current !== null && target !== null) {
                return `${feature} is ${direction} (${current} vs ${target} target)`;
            }
            return `${feature} is ${direction}`;
        });
        if (topRisks.length) {
            lines.push(`Key Risk Factors: ${topRisks.join('; ')}.`);
        }
    }

    const todayAction = result?.time_bound_actions?.today?.[0];
    if (todayAction) {
        lines.push(`Immediate Step: ${todayAction}`);
    }

    const fertilizerSummary = result?.fertilizer_plan?.summary;
    if (fertilizerSummary) {
        lines.push(`Nutrition Note: ${fertilizerSummary}`);
    }

    return lines.join('\n\n');
}

function parseRecommendationItem(item) {
    const value = typeof item === 'string' ? item.trim() : '';
    const match = value.match(/^\[(.+?)\]\s*(.*)$/);
    if (!match) {
        return { tag: 'General', text: value || 'Maintain routine care and regular checks.' };
    }
    const rawTag = (match[1] || 'General').trim();
    const text = (match[2] || '').trim() || 'Maintain routine care and regular checks.';
    return { tag: rawTag, text };
}

function getRecommendationBadgeClass(tag) {
    const key = (tag || '').toLowerCase();
    if (key === 'today') return 'border-rose-200 bg-rose-50 text-rose-700';
    if (key === 'this week') return 'border-amber-200 bg-amber-50 text-amber-700';
    if (key === 'this month') return 'border-sky-200 bg-sky-50 text-sky-700';
    if (key === 'dosage') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (key === 'fertilizer') return 'border-violet-200 bg-violet-50 text-violet-700';
    return 'border-slate-200 bg-slate-50 text-slate-700';
}

function getRecommendationDotClass(tag) {
    const key = (tag || '').toLowerCase();
    if (key === 'today') return 'bg-rose-500';
    if (key === 'this week') return 'bg-amber-500';
    if (key === 'this month') return 'bg-sky-500';
    if (key === 'dosage') return 'bg-emerald-500';
    if (key === 'fertilizer') return 'bg-violet-500';
    return 'bg-slate-500';
}

