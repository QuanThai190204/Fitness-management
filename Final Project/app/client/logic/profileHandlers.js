import { getUserData, formatDateForInput } from './userSession.js';

// Load user data from server
async function loadUserData() {
    try {
        // This would be replaced with actual user ID from session
        const userId = getCurrentUserId(); 
        
        const response = await fetch('/api/member/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: userId })
        });
        
        if (!response.ok) {
            throw new Error('Failed to load user data');
        }
        
        const userData = await response.json();

        if (!sessionStorage.getItem('userData')) {
            sessionStorage.setItem('userData', JSON.stringify(userData));
        }    
        
        populateUserData(userData);
        
    } catch (error) {
        console.error('Error loading user data:', error);
        document.getElementById('message').innerHTML = 
            `<p style="color: red;">Error loading data: ${error.message}</p>`;
    }
}

// Get current user ID 
function getCurrentUserId() {
    const userId = sessionStorage.getItem('userId');
    if (!userId) {
        // Redirect to login if no user session
        window.location.href = 'login.html';
        return null;
    }
    return parseInt(userId);
}

// Populate forms with user data
function populateUserData(userData) {
    
    if (userData.user) {
        document.getElementById('firstName').placeholder = userData.user.first_name || '';
        document.getElementById('lastName').placeholder = userData.user.last_name || '';
        document.getElementById('email').placeholder = userData.user.email || '';
        document.getElementById('dateOfBirth').value = formatDateForInput(userData.user.date_of_birth) || '';
        document.getElementById('gender').value = userData.user.gender || '';
        document.getElementById('phone').placeholder = userData.user.phone || '';
        document.getElementById('role').placeholder = userData.user.role || 'Member';
    }
    
    
    if (userData.activeGoal) {
        document.getElementById('goalType').value = userData.activeGoal.goal_type || '';
        document.getElementById('targetValue').placeholder = userData.activeGoal.target_value || '';
        document.getElementById('startDate').value = formatDateForInput(userData.activeGoal.start_date) || '';
        document.getElementById('targetDate').value = formatDateForInput(userData.activeGoal.target_date) || '';
        
    }
}

// Handle edit button click
function handleEditClick(e) {
    const formId = e.currentTarget.getAttribute('data-form');
    const form = document.getElementById(formId);
    const formElements = form.querySelectorAll('input, select, button[type="submit"], .cancel-btn');
    
    // Enable all form elements
    formElements.forEach(element => {
        element.disabled = false;
    });
    
    // Update form state
    form.setAttribute('data-disabled', 'false');
    form.classList.add('form-editing');
    
    // Hide edit button, show action buttons
    e.currentTarget.style.display = 'none';
}

// Handle cancel button click
function handleCancelClick(e) {
    const form = e.currentTarget.closest('.profile-form');
    const formId = form.id;
    const selectElements = form.querySelector('select');
    const formElements = form.querySelectorAll('input, button[type="submit"], .cancel-btn');
    const editButton = form.previousElementSibling.querySelector('.edit-btn');
    
    // Disable all form elements
    formElements.forEach(element => {
        element.disabled = true;
    });
    
    if (formId === 'user-info' || formId === 'goal-info') {
        selectElements.disabled = true;
    }    
    // Reset form state
    form.setAttribute('data-disabled', 'true');
    form.classList.remove('form-editing');
    
    // Show edit button, hide action buttons
    if (editButton) {
        editButton.style.display = 'flex';
    }
    
    loadUserData();
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formId = form.id;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    try {
        // Filter out empty values - only update fields that were changed
        const updateData = {};
        for (const [key, value] of Object.entries(data)) {
            if (value && value.trim() !== '') {
                updateData[key] = value;
            }
        }
        
        if (Object.keys(updateData).length === 0) {
            alert('No changes detected.');
            handleCancelClick({ currentTarget: form.querySelector('.cancel-btn') });
            return;
        }
        
        // Add user ID to update data
        updateData.userId = getCurrentUserId();
        
        let endpoint;
        if (formId === 'user-info') {
            endpoint = '/api/member/update-profile';
        } else if (formId === 'health-info') {
            endpoint = '/api/member/add-metric';
        } else if (formId === 'goal-info') {
            endpoint = '/api/member/set-goal';
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update data');
        }
        
        const result = await response.json();
        

        showMessage('Data updated successfully!', 'success');
        
        // Reset form to disabled state
        handleCancelClick({ currentTarget: form.querySelector('.cancel-btn') });
        
        loadUserData();
        
    } catch (error) {
        console.error('Error updating data:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
}

// Update metric placeholder based on selected type
function updateMetricPlaceholder() {
    
    const userData =  getUserData() || {};
    const latestMetrics = userData.latestMetrics || {};
    const metricTypeSelect = document.getElementById('metricType');
    const metricValueInput = document.getElementById('metricValue');
    const metricUnit = document.getElementById('metricUnit');
    
    if (!metricTypeSelect || !metricValueInput || !metricUnit) return;
    
    switch(metricTypeSelect.value) {
        case 'weight':
            metricUnit.textContent = 'kg';
            break;
        case 'body_fat':
            metricUnit.textContent = '%';
            break;
        case 'max_hr':
            metricUnit.textContent = 'bpm';
            break;
        default:
            metricUnit.textContent = '';
    }
    // Load value based on chosen option
    if (latestMetrics) {
        const type = metricTypeSelect.value;
        if (type in latestMetrics) {
            metricValueInput.placeholder = latestMetrics[type];
        } else {
            metricValueInput.placeholder = '';
        }
    }
}

// Update goal placeholder based on selected type
function updateGoalPlaceholder() {
    const goalTypeSelect = document.getElementById('goalType');
    const targetValueInput = document.getElementById('targetValue');
    const goalUnit = document.getElementById('goalUnit');
    
    if (!goalTypeSelect || !targetValueInput || !goalUnit) return;
    
    switch(goalTypeSelect.value) {
        case 'target_weight':
            goalUnit.textContent = 'kg';
            break;
        case 'target_body_fat':
            goalUnit.textContent = '%';
            break;
        case 'target_max_hr':
            goalUnit.textContent = 'bpm';
            break;
        default:
            targetValueInput.placeholder = 'Enter target';
            goalUnit.textContent = '';
    }
}

// Handle navigation clicks
function handleNavClick(e) {
    e.preventDefault();
    const targetPage = e.currentTarget.getAttribute('data-page');
    
    switch(targetPage) {
        case 'health':
            window.location.href = 'health-history.html';
            break;
        // 'profile' is current page, so no navigation needed
    }
}

// Show message to user
function showMessage(message, type) {
  
    let messageDiv = document.getElementById('message');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'message';
        document.querySelector('.profile-main').prepend(messageDiv);
    }
    
    messageDiv.innerHTML = `<p style="color: ${type === 'success' ? 'green' : 'red'}; 
                                     padding: 1rem; 
                                     background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
                                     border-radius: 8px;
                                     margin-bottom: 1rem;">${message}</p>`;
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.innerHTML = '';
        }, 3000);
    }
}

// Set up event listeners when page loads
document.addEventListener('DOMContentLoaded', function() {
   
    loadUserData();
    
    // Get DOM elements
    const editButtons = document.querySelectorAll('.edit-btn');
    const cancelButtons = document.querySelectorAll('.cancel-btn');
    const forms = document.querySelectorAll('.profile-form');
    const metricTypeSelect = document.getElementById('metricType');
    const goalTypeSelect = document.getElementById('goalType');
    
    // Edit button listeners
    editButtons.forEach(button => {
        button.addEventListener('click', handleEditClick);
    });
    
    // Cancel button listeners
    cancelButtons.forEach(button => {
        button.addEventListener('click', handleCancelClick);
    });
    
    // Form submission listeners
    forms.forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
    
    // Dynamic placeholder updates
    if (metricTypeSelect) {
        metricTypeSelect.addEventListener('change', updateMetricPlaceholder);
    }
    
    if (goalTypeSelect) {
        goalTypeSelect.addEventListener('change', updateGoalPlaceholder);
    }
    
    // Navigation
    const navOptions = document.querySelectorAll('.nav-option');
    navOptions.forEach(option => {
        option.addEventListener('click', handleNavClick);
    });
});

