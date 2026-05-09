// Default Configuration
const DEFAULT_TRAINING_GOAL = 300; // miles
const DEFAULT_MARATHON_GOAL_TIME = "04:00"; // HH:MM
const MARATHON_DISTANCE = 26.2188; // miles

// State
let appState = {
    runs: [],
    trainingGoal: DEFAULT_TRAINING_GOAL,
    marathonGoalTime: DEFAULT_MARATHON_GOAL_TIME
};

// DOM Elements
const elements = {
    // Modal
    settingsBtn: document.getElementById('settingsBtn'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    settingsForm: document.getElementById('settingsForm'),
    goalDistanceInput: document.getElementById('goalDistance'),
    marathonGoalTimeInput: document.getElementById('marathonGoalTime'),

    // Dashboard
    totalMiles: document.getElementById('totalMiles'),
    targetMiles: document.getElementById('targetMiles'),
    totalRuns: document.getElementById('totalRuns'),
    trainingProgressBar: document.getElementById('trainingProgressBar'),
    progressPercentage: document.getElementById('progressPercentage'),
    progressTargetLabel: document.getElementById('progressTargetLabel'),

    // Add Run Form
    addRunForm: document.getElementById('addRunForm'),
    runDate: document.getElementById('runDate'),
    runDistance: document.getElementById('runDistance'),
    runHours: document.getElementById('runHours'),
    runMinutes: document.getElementById('runMinutes'),
    runSeconds: document.getElementById('runSeconds'),

    // History
    runList: document.getElementById('runList'),

    // Predictions
    avgPace: document.getElementById('avgPace'),
    predictedTime: document.getElementById('predictedTime'),
    goalTimeDisplay: document.getElementById('goalTimeDisplay'),
    suggestionText: document.getElementById('suggestionText'),
    suggestionBox: document.getElementById('suggestionBox')
};

// Initialize App
function init() {
    loadState();
    setupEventListeners();
    
    // Set default date to today
    elements.runDate.valueAsDate = new Date();
    
    updateUI();
}

// Local Storage
function loadState() {
    const saved = localStorage.getItem('marathonTallyState');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            appState = { ...appState, ...parsed };
        } catch (e) {
            console.error('Failed to parse saved state', e);
        }
    }
}

function saveState() {
    localStorage.setItem('marathonTallyState', JSON.stringify(appState));
}

// Event Listeners
function setupEventListeners() {
    // Settings Modal
    elements.settingsBtn.addEventListener('click', openSettings);
    elements.closeSettingsBtn.addEventListener('click', closeSettings);
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) closeSettings();
    });

    elements.settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        appState.trainingGoal = parseFloat(elements.goalDistanceInput.value) || DEFAULT_TRAINING_GOAL;
        appState.marathonGoalTime = elements.marathonGoalTimeInput.value || DEFAULT_MARATHON_GOAL_TIME;
        saveState();
        updateUI();
        closeSettings();
    });

    // Add Run
    elements.addRunForm.addEventListener('submit', handleAddRun);
}

// Modals
function openSettings() {
    elements.goalDistanceInput.value = appState.trainingGoal;
    elements.marathonGoalTimeInput.value = appState.marathonGoalTime;
    elements.settingsModal.classList.remove('hidden');
}

function closeSettings() {
    elements.settingsModal.classList.add('hidden');
}

// Add Run Logic
function handleAddRun(e) {
    e.preventDefault();
    
    const distance = parseFloat(elements.runDistance.value);
    const hours = parseInt(elements.runHours.value) || 0;
    const minutes = parseInt(elements.runMinutes.value) || 0;
    const seconds = parseInt(elements.runSeconds.value) || 0;
    
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    
    if (distance <= 0) {
        alert("Please enter a valid distance");
        return;
    }
    
    if (totalSeconds <= 0) {
        alert("Please enter a valid duration");
        return;
    }

    const run = {
        id: Date.now().toString(),
        date: elements.runDate.value,
        distance: distance,
        durationSeconds: totalSeconds,
        timestamp: new Date().getTime()
    };

    appState.runs.unshift(run);
    
    // Sort runs by date descending
    appState.runs.sort((a, b) => new Date(b.date) - new Date(a.date));

    saveState();
    updateUI();
    
    // Reset inputs
    elements.runDistance.value = '';
    elements.runHours.value = '';
    elements.runMinutes.value = '';
    elements.runSeconds.value = '';
}

// Delete Run
window.deleteRun = function(id) {
    appState.runs = appState.runs.filter(r => r.id !== id);
    saveState();
    updateUI();
};

// UI Updates
function updateUI() {
    // Compute Totals
    const totalMiles = appState.runs.reduce((sum, run) => sum + run.distance, 0);
    
    // Update Dashboard
    elements.totalMiles.textContent = totalMiles.toFixed(1);
    elements.targetMiles.textContent = appState.trainingGoal;
    elements.totalRuns.textContent = appState.runs.length;
    
    // Progress Bar
    const progress = Math.min((totalMiles / appState.trainingGoal) * 100, 100);
    elements.trainingProgressBar.style.width = `${progress}%`;
    elements.progressPercentage.textContent = `${progress.toFixed(1)}%`;
    elements.progressTargetLabel.textContent = `${appState.trainingGoal} mi`;

    // Update Runs List
    renderRunsList();
    
    // Update Predictions
    updatePredictions(totalMiles);
}

function renderRunsList() {
    if (appState.runs.length === 0) {
        elements.runList.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-shoe-prints"></i>
                <p>No runs logged yet. Start training!</p>
            </div>
        `;
        return;
    }

    elements.runList.innerHTML = appState.runs.map(run => {
        const paceSecs = run.durationSeconds / run.distance;
        return `
        <div class="run-card">
            <div class="run-info">
                <div class="run-icon"><i class="fa-solid fa-bolt"></i></div>
                <div class="run-details">
                    <h4>${run.distance.toFixed(2)} mi</h4>
                    <p>${formatDate(run.date)} • ${formatDuration(run.durationSeconds)}</p>
                </div>
            </div>
            <div class="run-metrics">
                <div class="run-pace">${formatDuration(paceSecs)} /mi</div>
                <button class="btn btn-danger-sm" onclick="deleteRun('${run.id}')" title="Delete Run">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');
}

function updatePredictions(totalMiles) {
    elements.goalTimeDisplay.textContent = appState.marathonGoalTime + ":00";

    if (appState.runs.length === 0) {
        elements.avgPace.textContent = "--:-- /mi";
        elements.predictedTime.textContent = "--:--:--";
        setSuggestion("Log some runs to unlock AI pacing predictions and tailored suggestions!", "neutral");
        return;
    }

    // Calculate Average Pace (weighted by distance)
    const totalSeconds = appState.runs.reduce((sum, run) => sum + run.durationSeconds, 0);
    const avgPaceSecs = totalSeconds / totalMiles;
    
    elements.avgPace.textContent = formatDuration(avgPaceSecs) + " /mi";

    // Predict Marathon Time (Riegel's formula simplified or just straight avg pace for simplicity + a slight fatigue factor)
    // Here we use a slight fatigue factor: average pace * 1.05 for marathon distance
    const marathonPaceSecs = avgPaceSecs * 1.05;
    const predictedMarathonSeconds = marathonPaceSecs * MARATHON_DISTANCE;
    
    elements.predictedTime.textContent = formatDuration(predictedMarathonSeconds);

    // Goal time comparison
    const goalParts = appState.marathonGoalTime.split(':');
    const goalSeconds = (parseInt(goalParts[0]) * 3600) + (parseInt(goalParts[1]) * 60);

    // Provide Suggestions
    generateSuggestion(predictedMarathonSeconds, goalSeconds, totalMiles, avgPaceSecs);
}

function generateSuggestion(predictedSecs, goalSecs, totalMiles, avgPaceSecs) {
    let suggestion = "";
    let type = "neutral"; // neutral, warning, success
    
    const diff = predictedSecs - goalSecs;
    const diffMins = Math.abs(Math.round(diff / 60));

    // Progress vs Plan logic
    const avgMilesPerRun = totalMiles / appState.runs.length;

    if (diff > 1800) { // Predicted is more than 30 mins slower than goal
        suggestion = `Your predicted time is ${diffMins} mins slower than your goal. Try adding one long run a week at an easy pace to build endurance.`;
        type = "warning";
    } else if (diff > 0) { // Slower by less than 30 mins
        suggestion = `You're close! You need to shave off about ${Math.round(diff / MARATHON_DISTANCE)} seconds per mile. Try incorporating interval training!`;
        type = "warning";
    } else { // Faster or equal
        suggestion = `Amazing! You are currently on track to beat your goal time by ${diffMins} minutes. Keep up the consistent mileage!`;
        type = "success";
    }

    if (appState.runs.length < 3) {
        suggestion = "Great start! Complete a few more runs so we can better dial in your marathon predictions.";
        type = "neutral";
    } else if (avgMilesPerRun < 3 && appState.runs.length >= 3) {
        suggestion += " Consider increasing your distance per run slowly (10% rule) to build marathon endurance.";
    }

    setSuggestion(suggestion, type);
}

function setSuggestion(text, type) {
    elements.suggestionText.textContent = text;
    
    const box = elements.suggestionBox;
    const icon = box.querySelector('i');
    
    box.className = 'suggestion-box'; // reset
    icon.className = 'fa-solid suggestion-icon'; // reset
    
    if (type === 'warning') {
        box.style.background = 'rgba(255, 59, 48, 0.1)';
        box.style.color = '#5D110D';
        icon.classList.add('fa-triangle-exclamation');
        icon.style.color = 'var(--danger)';
    } else if (type === 'success') {
        box.style.background = 'rgba(52, 199, 89, 0.15)';
        box.style.color = '#0F401A';
        icon.classList.add('fa-fire');
        icon.style.color = 'var(--success)';
    } else {
        box.style.background = 'rgba(255, 184, 0, 0.15)';
        box.style.color = '#5D4300';
        icon.classList.add('fa-lightbulb');
        icon.style.color = 'var(--accent)';
    }
}

// Helpers
function formatDuration(totalSeconds) {
    if (!totalSeconds || isNaN(totalSeconds)) return "00:00";
    
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.round(totalSeconds % 60);
    
    if (h > 0) {
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateString) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const date = new Date(dateString);
    // Adjust for timezone offset to prevent off-by-one day issues
    const adjustedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return adjustedDate.toLocaleDateString(undefined, options);
}

// Run the app
init();
