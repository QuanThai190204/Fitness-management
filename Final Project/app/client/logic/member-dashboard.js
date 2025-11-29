import { getCurrentUser } from './userSession.js';

// Toggle settings panel visibility
function toggleSettingsPanel() {
    const settingsPanel = document.querySelector('.settings-panel');
    const settingButton = document.querySelector('.setting-button');
    
    settingsPanel.classList.toggle('settings-panel-active');
    
    // Update ARIA attributes for accessibility
    const isExpanded = settingsPanel.classList.contains('settings-panel-active');
    settingButton.setAttribute('aria-expanded', isExpanded);
    settingsPanel.setAttribute('aria-hidden', !isExpanded);
    
    // Add overlay when panel is open
    toggleOverlay(isExpanded);
}

// Create overlay when settings panel is open
function toggleOverlay(show) {
    let overlay = document.querySelector('.settings-overlay');
    
    if (show && !overlay) {
        overlay = document.createElement('div');
        overlay.className = 'settings-overlay';
        document.body.appendChild(overlay);
        
        // Close panel when overlay is clicked
        overlay.addEventListener('click', toggleSettingsPanel);
    } else if (!show && overlay) {
        overlay.remove();
    }
}

// Handle settings option clicks
function handleSettingsOptionClick(e) {
    const targetPage = e.currentTarget.getAttribute('data-page');
    
    switch(targetPage) {
        case 'profile':
            window.location.href = '/profile-management.html';
            break;
        case 'health':
            window.location.href = '/health-history.html';
            break;
        default:
            console.log('Unknown page:', targetPage);
    }
}

// Load dashboard data // Load dashboard data
async function loadDashboardData() {
    try {
        const userId = sessionStorage.getItem('userId');
        if (!userId) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch('/api/member/dashboard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: userId })
        });

        if (!response.ok) {
            throw new Error('Failed to load dashboard data');
        }

        const result = await response.json();
        
        if (result.success) {
            updateDashboardUI(result);
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Update dashboard UI with data 
function updateDashboardUI(data) {
    const user = getCurrentUser();
    
    document.getElementById('userName').textContent = user.name || 'Member';
    
    // TRIGGER INTERACTION: This timestamp is updated by our database trigger
    // When a new health metric is inserted, the trigger automatically updates last_metric_update
    const lastUpdate = data.user.last_metric_update 
        ? new Date(data.user.last_metric_update).toLocaleDateString() 
        : 'Never';
    document.getElementById('lastLogin').textContent = `Last updated: ${lastUpdate}`;

    // Extract metrics by type
    const weightMetric = data.metrics.find(m => m.metric_type === 'weight');
    const bodyFatMetric = data.metrics.find(m => m.metric_type === 'body_fat');
    const maxHrMetric = data.metrics.find(m => m.metric_type === 'max_hr');

    // Update metric cards
    document.getElementById('currentWeight').textContent = weightMetric ? `${weightMetric.current_value} kg` : '-- kg';
    document.getElementById('bodyFat').textContent = bodyFatMetric ? `${bodyFatMetric.current_value}%` : '--%';
    document.getElementById('maxHR').textContent = maxHrMetric ? `${maxHrMetric.current_value} bpm` : '-- bpm';

    // Update activity counts
    document.getElementById('pastClasses').textContent = data.user.past_classes_count || 0;
    document.getElementById('upcomingSessions').textContent = data.user.upcoming_sessions_count || 0;

    // Update progress to goal
    if (data.progress) {
        const progressValue = data.progress.progress;
        const percentage = data.progress.percentage;
        
        document.getElementById('progressToGoal').textContent = 
            `${progressValue > 0 ? '+' : ''}${progressValue.toFixed(1)} ${getProgressUnit(data.activeGoal?.goal_type)}`;
        document.getElementById('progressFill').style.width = `${percentage}%`;
        document.getElementById('goalText').textContent = `Target: ${data.progress.target} ${getProgressUnit(data.activeGoal?.goal_type)}`;
    } else {
        document.getElementById('progressToGoal').textContent = '--';
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('goalText').textContent = 'No active goal';
    }

    // Change indicators
    document.getElementById('weightChange').textContent = weightMetric ? 'Recent' : 'No data';
    document.getElementById('bodyFatChange').textContent = bodyFatMetric ? 'Recent' : 'No data';
    document.getElementById('hrChange').textContent = maxHrMetric ? 'Recent' : 'No data';
}

function getProgressUnit(goalType) {
    switch(goalType) {
        case 'target_weight': return 'kg';
        case 'target_body_fat': return '%';
        case 'target_max_hr': return 'bpm';
        default: return '';
    }
}




// Set up event listeners when page loads
document.addEventListener('DOMContentLoaded', function() {
    const settingButton = document.querySelector('.setting-button');
    const closeSettingsBtn = document.querySelector('.close-settings-btn');
    const settingsPanel = document.querySelector('.settings-panel');
    const logoutBtn = document.querySelector('.logout-btn');
    const settingsOptions = document.querySelectorAll('.settings-option');
    
    loadDashboardData();

    // Toggle settings panel
    if (settingButton) {
        settingButton.addEventListener('click', toggleSettingsPanel);
    }
    
    // Close settings panel
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', toggleSettingsPanel);
    }
    
    // Handle settings option clicks
    settingsOptions.forEach(option => {
        option.addEventListener('click', handleSettingsOptionClick);
    });
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to logout?')) {
                e.preventDefault(); // Prevent navigation if user cancels
            }
        });
    }
    
    // Close settings panel when clicking outside
    document.addEventListener('click', function(e) {
        if (settingsPanel.classList.contains('settings-panel-active') && 
            !settingsPanel.contains(e.target) && 
            !settingButton.contains(e.target)) {
            toggleSettingsPanel();
        }
    });
    
    // Close settings panel with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && settingsPanel.classList.contains('settings-panel-active')) {
            toggleSettingsPanel();
        }
    });
});