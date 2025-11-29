let allMembers = [];

async function loadAllMembers() {
    try {
        const trainerId = getCurrentUserId();
        if (!trainerId) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch('/api/trainer/members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trainerId: trainerId })
        });

        if (!response.ok) throw new Error('Failed to load members');

        const result = await response.json();
        if (result.success) {
            allMembers = result.members; // All member data
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error loading members:', error);
        showMessage('Failed to load members list', 'error');
    }
}

function handleMemberSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    const dropdown = document.getElementById('searchDropdown');
    const template = document.getElementById('memberItemTemplate');
    const noResultsTemplate = document.getElementById('noResultsTemplate');
    
    dropdown.innerHTML = '';
    dropdown.classList.add('hidden');

    if (query.length < 2) return;

    // Filter members based on input field's input
    const matchedMembers = allMembers.filter(member => {
        const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
        return fullName.includes(query) || 
               member.first_name.toLowerCase().includes(query) || 
               member.last_name.toLowerCase().includes(query);
    });

    if (matchedMembers.length === 0) {
        const noResults = noResultsTemplate.content.cloneNode(true);
        dropdown.appendChild(noResults);
    } else {
        matchedMembers.forEach(member => {
            const memberItem = template.content.cloneNode(true);
            const itemElement = memberItem.querySelector('.member-search-item');
            const nameElement = memberItem.querySelector('.member-name');
            
            nameElement.textContent = `${member.first_name} ${member.last_name}`;
            itemElement.dataset.memberId = member.user_id;
            // Add click listener to select member
            itemElement.addEventListener('click', () => {
                selectMember(member.user_id);
                dropdown.classList.add('hidden');
                document.getElementById('memberSearch').value = `${member.first_name} ${member.last_name}`;
            });

            dropdown.appendChild(memberItem);
        });
    }

    dropdown.classList.remove('hidden');
}

async function selectMember(memberId) {
    try {
        const trainerId = getCurrentUserId();
        const response = await fetch('/api/trainer/member-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trainerId: trainerId, memberId: memberId })
        });

        if (!response.ok) throw new Error('Failed to load member details');

        const result = await response.json();
        if (result.success) {
            displayMemberDetails(result.memberData);
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error loading member details:', error);
        showMessage('Failed to load member details', 'error');
    }
}

function displayMemberDetails(memberData) {
    const memberInfoSection = document.getElementById('memberInfo');
    
    // Update personal information
    document.getElementById('memberName').textContent = 
        `${memberData.user.first_name} ${memberData.user.last_name}`;
    document.getElementById('memberEmail').textContent = memberData.user.email;
    document.getElementById('memberPhone').textContent = memberData.user.phone || 'Not provided';
    document.getElementById('memberGender').textContent = memberData.user.gender || 'Not specified';
    
    // Update activity counts
    document.getElementById('pastClassesCount').textContent = memberData.user.past_classes_count || 0;
    document.getElementById('upcomingSessionsCount').textContent = memberData.user.upcoming_sessions_count || 0;
    
    // Update health metrics
    updateHealthMetrics(memberData.latestMetrics);
    
    // Update fitness goals
    updateFitnessGoals(memberData.activeGoal);
    
    // Show the section
    memberInfoSection.classList.remove('hidden');
    memberInfoSection.scrollIntoView({ behavior: 'smooth' });
}

function updateHealthMetrics(metrics) {
    const container = document.getElementById('healthMetrics');
    container.innerHTML = '';

    if (metrics.length === 0) {
        container.innerHTML = '<div class="no-data">No health metrics recorded</div>';
        return;
    }

    metrics.forEach(metric => {
        const metricItem = document.createElement('div');
        metricItem.className = 'health-metric-item';
        metricItem.innerHTML = `
            <div class="stat-label">${formatMetricType(metric.metric_type)}</div>
            <div class="stat-value">${metric.current_value} ${getMetricUnit(metric.metric_type)}</div>
            <div class="stat-label">Last updated</div>
            <div class="stat-value">${new Date(metric.logged_at).toLocaleDateString()}</div>
        `;
        container.appendChild(metricItem);
    });
}

function updateFitnessGoals(activeGoal) {
    const container = document.getElementById('fitnessGoals');
    container.innerHTML = '';

    if (!activeGoal) {
        container.innerHTML = '<div class="no-data">No active goals set</div>';
        return;
    }

    const goalItem = document.createElement('div');
    goalItem.className = 'goal-item';
    goalItem.innerHTML = `
        <div class="stat-label">Goal Type</div>
        <div class="stat-value">${formatGoalType(activeGoal.goal_type)}</div>
        <div class="stat-label">Target</div>
        <div class="stat-value">${activeGoal.target_value} ${getGoalUnit(activeGoal.goal_type)}</div>
        <div class="stat-label">Start Date</div>
        <div class="stat-value">${new Date(activeGoal.start_date).toLocaleDateString()}</div>
        ${activeGoal.target_date ? `
            <div class="stat-label">Target Date</div>
            <div class="stat-value">${new Date(activeGoal.target_date).toLocaleDateString()}</div>
        ` : ''}
    `;
    container.appendChild(goalItem);
}

// Helper functions (keep the same)
function formatMetricType(metricType) {
    const types = { 'weight': 'Weight', 'body_fat': 'Body Fat', 'max_hr': 'Max Heart Rate' };
    return types[metricType] || metricType;
}

function getMetricUnit(metricType) {
    const units = { 'weight': 'kg', 'body_fat': '%', 'max_hr': 'bpm' };
    return units[metricType] || '';
}

function formatGoalType(goalType) {
    const types = { 'target_weight': 'Target Weight', 'target_body_fat': 'Target Body Fat', 'target_max_hr': 'Target Max Heart Rate' };
    return types[goalType] || goalType;
}

function getGoalUnit(goalType) {
    const units = { 'target_weight': 'kg', 'target_body_fat': '%', 'target_max_hr': 'bpm' };
    return units[goalType] || '';
}


function handleAvailabilitySubmit(e) {
    e.preventDefault();
    console.log('Availability form submitted');
}

function handleQuickAction(e) {
    console.log('Quick action:', e.target.dataset.action);
}

function loadTrainerAvailability() {
    console.log('Load trainer availability');
}

function showMessage(message, type) {
    console.log(`${type}: ${message}`);
}

function getCurrentUserId() {
    return sessionStorage.getItem('userId');
}



// Availability functionality
async function loadTrainerAvailability() {
    try {
        const trainerId = getCurrentUserId();
        if (!trainerId) return;

        const response = await fetch('/api/trainer/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trainerId: trainerId })
        });

        if (!response.ok) throw new Error('Failed to load availability');

        const result = await response.json();
        if (result.success) {
            displayAvailability(result.availability);
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error loading availability:', error);
        showMessage('Failed to load availability', 'error');
    }
}

function displayAvailability(availability) {
    const tbody = document.getElementById('availabilityBody');
    const template = document.getElementById('availabilityRowTemplate');
    const noDataTemplate = document.getElementById('noAvailabilityTemplate');
    
    tbody.innerHTML = '';

    if (!availability || availability.length === 0) {
        const noData = noDataTemplate.content.cloneNode(true);
        tbody.appendChild(noData);
        return;
    }

    // Sort availability by day and start time
    const sortedAvailability = availability.sort((a, b) => {
        const dayOrder = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };
        if (dayOrder[a.day_of_week] !== dayOrder[b.day_of_week]) {
            return dayOrder[a.day_of_week] - dayOrder[b.day_of_week];
        }
        return new Date(a.start_time) - new Date(b.start_time);
    });

    sortedAvailability.forEach(avail => {
        const row = template.content.cloneNode(true);
        const rowElement = row.querySelector('.availability-row');
        
        // Format day name (capitalize)
        const dayElement = row.querySelector('.availability-day');
        dayElement.textContent = avail.day_of_week.charAt(0).toUpperCase() + avail.day_of_week.slice(1);
        
        // Format times
        const startElement = row.querySelector('.availability-start');
        const endElement = row.querySelector('.availability-end');
        startElement.textContent = formatTime(avail.start_time);
        endElement.textContent = formatTime(avail.end_time);
        
        // Format frequency
        const freqElement = row.querySelector('.availability-frequency');
        freqElement.textContent = avail.frequency === 'weekly' ? 'Weekly' : 'One-time';
        
        // Remove button
        const removeBtn = row.querySelector('.remove-availability');
        removeBtn.addEventListener('click', () => {
            removeAvailability(avail.availability_id);
        });
        
        rowElement.dataset.availabilityId = avail.availability_id;
        tbody.appendChild(row);
    });
}

async function handleAvailabilitySubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const days = formData.getAll('availabilityDays');
    const startTime = formData.get('startTime');
    const endTime = formData.get('endTime');
    const frequency = formData.get('frequency');

    // Validate form
    if (!validateAvailabilityForm(days, startTime, endTime, frequency)) {
        return;
    }

    try {
        const trainerId = getCurrentUserId();
        if (!trainerId) return;

        // Check for overlapping availability
        const hasOverlap = await checkForOverlaps(trainerId, days, startTime, endTime, frequency);
        if (hasOverlap) {
            showFormError('This time slot overlaps with existing availability');
            return;
        }

        // Add availability for each selected day
        for (const day of days) {
            await addAvailability(trainerId, day, startTime, endTime, frequency);
        }

        // Success
        showFormSuccess('Availability added successfully!');
        form.reset();
        await loadTrainerAvailability(); // Refresh the display

    } catch (error) {
        console.error('Error adding availability:', error);
        showFormError('Failed to add availability');
    }
}

async function addAvailability(trainerId, day, startTime, endTime, frequency) {
    const response = await fetch('/api/trainer/add-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            trainerId: trainerId,
            dayOfWeek: day,
            startTime: startTime, 
            endTime: endTime,     
            frequency: frequency
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add availability');
    }

    return await response.json();
}

async function removeAvailability(availabilityId) {
    if (!confirm('Are you sure you want to remove this availability?')) {
        return;
    }

    try {
        const trainerId = getCurrentUserId();
        if (!trainerId) return;

        const response = await fetch('/api/trainer/remove-availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                trainerId: trainerId,
                availabilityId: availabilityId
            })
        });

        if (!response.ok) throw new Error('Failed to remove availability');

        const result = await response.json();
        if (result.success) {
            showMessage('Availability removed successfully', 'success');
            await loadTrainerAvailability(); // Refresh the display
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error removing availability:', error);
        showMessage('Failed to remove availability', 'error');
    }
}

async function checkForOverlaps(trainerId, days, newStartTime, newEndTime, frequency) {
    const response = await fetch('/api/trainer/check-overlaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            trainerId: trainerId,
            days: days,
            startTime: newStartTime,
            endTime: newEndTime,
            frequency: frequency
        })
    });

    if (!response.ok) return false;

    const result = await response.json();
    return result.hasOverlap;
}

// Form validation
function validateAvailabilityForm(days, startTime, endTime, frequency) {
    const errorElement = document.getElementById('formError');
    const successElement = document.getElementById('formSuccess');
    
    // Clear previous messages
    if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
    }
    if (successElement) {
        successElement.style.display = 'none';
    }

    // Validate days
    if (days.length === 0) {
        showFormError('Please select at least one day');
        return false;
    }

    // Validate times
    if (!startTime || !endTime) {
        showFormError('Please select both start and end times');
        return false;
    }

    if (startTime >= endTime) {
        showFormError('End time must be after start time');
        return false;
    }

    // Validate frequency
    if (!frequency) {
        showFormError('Please select frequency');
        return false;
    }
    
    console.log('Availability form validated successfully');
    return true;
}

function showFormError(message) {
    const errorElement = document.getElementById('formError') || createFormMessageElement('formError', 'error-message');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function showFormSuccess(message) {
    const successElement = document.getElementById('formSuccess') || createFormMessageElement('formSuccess', 'success-message');
    successElement.textContent = message;
    successElement.style.display = 'block';
    
    // Auto-hide success message
    setTimeout(() => {
        successElement.style.display = 'none';
    }, 3000);
}

function createFormMessageElement(id, className) {
    const element = document.createElement('div');
    element.id = id;
    element.className = className;
    element.style.display = 'none';
    document.getElementById('availabilityForm').prepend(element);
    return element;
}

// Utility functions
function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
}




function handleQuickAction(e) {
    const action = e.target.dataset.action;
    if (action === 'set-availability') {
        document.getElementById('availabilitySection').scrollIntoView({ behavior: 'smooth' });
    } 
}