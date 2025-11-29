import { getCurrentUserId } from './userSession.js';

// Set up event listeners when page loads
document.addEventListener('DOMContentLoaded', function() {
    const metricTypeSelect = document.getElementById('metricType');
    const navOptions = document.querySelectorAll('.nav-option');
    
    // Load metric history when selection changes
    if (metricTypeSelect) {
        metricTypeSelect.addEventListener('change', loadMetricHistory);
    }
    
    // Navigation handlers
    navOptions.forEach(option => {
        option.addEventListener('click', handleNavClick);
    });
});

// Load metric history based on selected type
async function loadMetricHistory() {
    const metricType = document.getElementById('metricType').value;
    
    if (!metricType) {
        showNoDataMessage();
        return;
    }
    
    try {
        const userId = getCurrentUserId();
        if (!userId) {
            window.location.href = 'login.html';
            return;
        }
        
        const response = await fetch('/api/member/health-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                userId: userId,
                metricType: metricType 
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to load health history');
        }
        
        const result = await response.json();
        
        if (result.success) {
            displayMetricHistory(result.history, metricType);
            updateSummaryStats(result.history, metricType);
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Error loading health history:', error);
        showErrorMessage('Failed to load health history: ' + error.message);
    }
}

// Display metric history in table
function displayMetricHistory(history, metricType) {
    const tableBody = document.querySelector('#historyTable tbody');
    tableBody.innerHTML = '';
    
    if (!history || history.length === 0) {
        showNoDataMessage();
        return;
    }
    
    // Sort history by date (newest first)
    const sortedHistory = [...history].sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
    
    sortedHistory.forEach((record, index) => {
        const row = document.createElement('tr');
        
        // Format date
        const date = new Date(record.logged_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Format value with appropriate unit
        const value = formatValue(record.current_value, metricType);
        
        // Calculate progress (difference from previous record)
        const progress = calculateProgress(record, sortedHistory, index, metricType);
        
        row.innerHTML = `
            <td>${date}</td>
            <td>${value}</td>
            <td class="${getProgressClass(progress)}">${progress}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Calculate progress from previous record
function calculateProgress(currentRecord, history, currentIndex, metricType) {
    // If it's the most recent record (first in sorted array), no previous to compare
    if (currentIndex === history.length - 1) {
        return '--';
    }
    
    const previousRecord = history[currentIndex + 1];
    const difference = currentRecord.current_value - previousRecord.current_value;
    
    // For weight and body fat, negative progress is good (losing weight/fat)
    // For max heart rate, positive progress is good (increasing cardiovascular fitness)
    let progressText;
    
    if (metricType === 'weight' || metricType === 'body_fat') {
        if (difference < 0) {
            progressText = `↓ ${Math.abs(difference).toFixed(1)}`;
        } else if (difference > 0) {
            progressText = `↑ ${difference.toFixed(1)}`;
        } else {
            progressText = 'No change';
        }
    } else { // max_hr
        if (difference > 0) {
            progressText = `↑ ${difference.toFixed(0)}`;
        } else if (difference < 0) {
            progressText = `↓ ${Math.abs(difference).toFixed(0)}`;
        } else {
            progressText = 'No change';
        }
    }
    
    return progressText;
}

// Get CSS class for progress cell based on whether it's positive/negative
function getProgressClass(progress) {
    if (progress === '--' || progress === 'No change') {
        return 'progress-neutral';
    }
    
    if (progress.includes('↑')) {
        return 'progress-positive';
    } else if (progress.includes('↓')) {
        return 'progress-negative';
    }
    
    return 'progress-neutral';
}

// Format value with appropriate unit
function formatValue(value, metricType) {
    switch(metricType) {
        case 'weight':
            return `${value} kg`;
        case 'body_fat':
            return `${value}%`;
        case 'max_hr':
            return `${value} bpm`;
        default:
            return value;
    }
}

// Update summary statistics
function updateSummaryStats(history, metricType) {
    const summaryStats = document.getElementById('summaryStats');
    const recordCount = document.getElementById('recordCount');
    const timePeriod = document.getElementById('timePeriod');
    const overallChange = document.getElementById('overallChange');
    
    if (!history || history.length === 0) {
        summaryStats.style.display = 'none';
        return;
    }
    
    summaryStats.style.display = 'flex';
    
    // Record count
    recordCount.textContent = history.length;
    
    // Time period
    const sortedHistory = [...history].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));
    const firstDate = new Date(sortedHistory[0].logged_at);
    const lastDate = new Date(sortedHistory[sortedHistory.length - 1].logged_at);
    
    const timeDiff = Math.abs(lastDate - firstDate);
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
        timePeriod.textContent = 'Single day';
    } else {
        timePeriod.textContent = `${daysDiff} days`;
    }
    
    // Overall change
    if (history.length >= 2) {
        const oldestValue = sortedHistory[0].current_value;
        const newestValue = sortedHistory[sortedHistory.length - 1].current_value;
        const totalChange = newestValue - oldestValue;
        
        let changeText;
        if (metricType === 'weight' || metricType === 'body_fat') {
            if (totalChange < 0) {
                changeText = `↓ ${Math.abs(totalChange).toFixed(1)}`;
            } else if (totalChange > 0) {
                changeText = `↑ ${totalChange.toFixed(1)}`;
            } else {
                changeText = 'No change';
            }
        } else { // max_hr
            if (totalChange > 0) {
                changeText = `↑ ${totalChange.toFixed(0)}`;
            } else if (totalChange < 0) {
                changeText = `↓ ${Math.abs(totalChange).toFixed(0)}`;
            } else {
                changeText = 'No change';
            }
        }
        
        overallChange.textContent = changeText;
        overallChange.className = getProgressClass(changeText);
    } else {
        overallChange.textContent = '--';
        overallChange.className = 'progress-neutral';
    }
}

// Show no data message
function showNoDataMessage() {
    const tableBody = document.querySelector('#historyTable tbody');
    tableBody.innerHTML = `
        <tr class="no-data">
            <td colspan="3">No history data available for selected metric</td>
        </tr>
    `;
    
    document.getElementById('summaryStats').style.display = 'none';
}

// Show error message
function showErrorMessage(message) {
    const tableBody = document.querySelector('#historyTable tbody');
    tableBody.innerHTML = `
        <tr class="no-data">
            <td colspan="3" style="color: #e74c3c;">${message}</td>
        </tr>
    `;
    
    document.getElementById('summaryStats').style.display = 'none';
}

// Handle navigation clicks
function handleNavClick(e) {
    e.preventDefault();
    const targetPage = e.currentTarget.getAttribute('data-page');
    
    switch(targetPage) {
        case 'profile':
            window.location.href = 'profile-management.html';
            break;
        // 'health' is current page, so no navigation needed
    }
}