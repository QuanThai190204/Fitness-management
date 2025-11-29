// Tab navigation
function handleTabClick(e) {
    const targetTab = e.currentTarget.dataset.tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
    
    // Show target tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${targetTab}Tab`).classList.add('active');
}

// Load equipment data
async function loadEquipmentData() {
    try {
        const adminId = getCurrentUserId();
        if (!adminId) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch('/api/admin/equipment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId: adminId })
        });

        if (!response.ok) throw new Error('Failed to load equipment');

        const result = await response.json();
        if (result.success) {
            displayEquipment(result.equipment);
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error loading equipment:', error);
        showMessage('Failed to load equipment data', 'error');
    }
}

// Display equipment in table
function displayEquipment(equipment) {
    const tbody = document.getElementById('equipmentBody');
    
    if (!equipment || equipment.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-data">No equipment found</td></tr>';
        return;
    }

    tbody.innerHTML = equipment.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.location || 'Not specified'}</td>
            <td>
                <span class="status-badge status-${item.status.toLowerCase().replace(' ', '-')}">
                    ${item.status}
                </span>
            </td>
            <td class="action-buttons">
                ${item.status.toLowerCase() === 'operational' ? 
                    `<button class="btn-warning log-maintenance-btn" data-equipment-id="${item.equipment_id}">
                        Log Maintenance
                    </button>` : 
                    `<button class="btn-success assign-repair-btn" data-equipment-id="${item.equipment_id}" disabled>
                        Assign Repair
                    </button>`
                }
            </td>
        </tr>
    `).join('');

    // Add event listeners to action buttons
    document.querySelectorAll('.log-maintenance-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const equipmentId = e.target.dataset.equipmentId;
            openLogMaintenanceModal(equipmentId);
        });
    });

    document.querySelectorAll('.assign-repair-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const equipmentId = e.target.dataset.equipmentId;
            openAssignRepairModal(equipmentId);
        });
    });
}

// Load maintenance logs
async function loadMaintenanceLogs() {
    try {
        const adminId = getCurrentUserId();
        if (!adminId) return;

        const response = await fetch('/api/admin/maintenance-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId: adminId })
        });

        if (!response.ok) throw new Error('Failed to load maintenance logs');

        const result = await response.json();
        if (result.success) {
            displayMaintenanceLogs(result.logs);
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error loading maintenance logs:', error);
    }
}

// Display maintenance logs
function displayMaintenanceLogs(logs) {
    const tbody = document.getElementById('maintenanceBody');
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No maintenance logs found</td></tr>';
        return;
    }

    tbody.innerHTML = logs.map(log => `
        <tr>
            <td>${log.equipment.name}</td>
            <td>${log.issue_description}</td>
            <td>${new Date(log.reported_date).toLocaleDateString()}</td>
            <td>
                <span class="status-badge status-${log.status.toLowerCase().replace(' ', '-')}">
                    ${log.status}
                </span>
            </td>
            <td class="action-buttons">
                ${log.status === 'Reported' ? 
                    `<button class="btn-primary assign-repair-from-log" data-log-id="${log.log_id}">
                        Assign Repair
                    </button>` : 
                    `<span class="no-data">No actions</span>`
                }
            </td>
        </tr>
    `).join('');

    // Add event listeners to assign repair buttons
    document.querySelectorAll('.assign-repair-from-log').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const logId = e.target.dataset.logId;
            openAssignRepairModal(null, logId);
        });
    });
}

// Load repair tasks
async function loadRepairTasks() {
    try {
        const adminId = getCurrentUserId();
        if (!adminId) return;

        const response = await fetch('/api/admin/repair-tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId: adminId })
        });

        if (!response.ok) throw new Error('Failed to load repair tasks');

        const result = await response.json();
        if (result.success) {
            displayRepairTasks(result.tasks);
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error loading repair tasks:', error);
    }
}

// Display repair tasks
function displayRepairTasks(tasks) {
    const tbody = document.getElementById('repairsBody');
    
    if (!tasks || tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No repair tasks found</td></tr>';
        return;
    }

    tbody.innerHTML = tasks.map(task => `
        <tr>
            <td>${task.assigned_to}</td>
            <td>${task.maintenance_log.equipment.name}</td>
            <td>${task.maintenance_log.issue_description}</td>
            <td>${task.start_time ? new Date(task.start_time).toLocaleString() : 'Not started'}</td>
            <td>${task.end_time ? new Date(task.end_time).toLocaleString() : 'Not set'}</td>
            <td>
                <span class="status-badge status-${task.status}">
                    ${task.status}
                </span>
            </td>
            <td class="action-buttons">
                ${task.status === 'working' ? 
                    `<button class="btn-success complete-repair" data-task-id="${task.task_id}">
                        Mark Complete
                    </button>` : 
                    `<span class="no-data">No actions</span>`
                }
            </td>
        </tr>
    `).join('');

    // Add event listeners to complete repair buttons
    document.querySelectorAll('.complete-repair').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.target.dataset.taskId;
            completeRepairTask(taskId);
        });
    });
}

// Modal functions
function openLogMaintenanceModal(equipmentId) {
    document.getElementById('logEquipmentId').value = equipmentId;
    document.getElementById('logMaintenanceModal').classList.remove('hidden');
}

function openAssignRepairModal(equipmentId, logId) {
    if (logId) {
        document.getElementById('repairLogId').value = logId;
    } else if (equipmentId) {
        // Find the maintenance log for this equipment
        // This would need additional logic to find the appropriate log
        document.getElementById('repairLogId').value = ''; // Placeholder
    }
    document.getElementById('assignRepairModal').classList.remove('hidden');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
    // Reset forms
    document.getElementById('logMaintenanceForm').reset();
    document.getElementById('assignRepairForm').reset();
}

// Form handlers
async function handleLogMaintenance(e) {
    e.preventDefault();
    
    const equipmentId = document.getElementById('logEquipmentId').value;
    const issueDescription = document.getElementById('issueDescription').value;

    try {
        const adminId = getCurrentUserId();
        if (!adminId) return;

        const response = await fetch('/api/admin/log-maintenance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminId: adminId,
                equipmentId: parseInt(equipmentId),
                issueDescription: issueDescription
            })
        });

        if (!response.ok) throw new Error('Failed to log maintenance');

        const result = await response.json();
        if (result.success) {
            showMessage('Maintenance issue logged successfully', 'success');
            closeAllModals();
            // Refresh all data
            await loadEquipmentData();
            await loadMaintenanceLogs();
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error logging maintenance:', error);
        showMessage('Failed to log maintenance issue', 'error');
    }
}

async function handleAssignRepair(e) {
    e.preventDefault();
    
    const logId = document.getElementById('repairLogId').value;
    const technician = document.getElementById('technician').value;
    const startTime = document.getElementById('repairStartTime').value;
    const endTime = document.getElementById('repairEndTime').value;

    try {
        const adminId = getCurrentUserId();
        if (!adminId) return;

        const response = await fetch('/api/admin/assign-repair', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminId: adminId,
                logId: parseInt(logId),
                technician: technician,
                startTime: startTime,
                endTime: endTime
            })
        });

        if (!response.ok) throw new Error('Failed to assign repair');

        const result = await response.json();
        if (result.success) {
            showMessage('Repair task assigned successfully', 'success');
            closeAllModals();
            // Refresh all data
            await loadEquipmentData();
            await loadMaintenanceLogs();
            await loadRepairTasks();
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error assigning repair:', error);
        showMessage('Failed to assign repair task', 'error');
    }
}

async function completeRepairTask(taskId) {
    if (!confirm('Mark this repair task as completed?')) {
        return;
    }

    try {
        const adminId = getCurrentUserId();
        if (!adminId) return;

        const response = await fetch('/api/admin/complete-repair', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminId: adminId,
                taskId: parseInt(taskId)
            })
        });

        if (!response.ok) throw new Error('Failed to complete repair');

        const result = await response.json();
        if (result.success) {
            showMessage('Repair task marked as completed', 'success');
            // Refresh all data
            await loadEquipmentData();
            await loadMaintenanceLogs();
            await loadRepairTasks();
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error completing repair:', error);
        showMessage('Failed to complete repair task', 'error');
    }
}

// Utility functions
function getCurrentUserId() {
    return sessionStorage.getItem('userId');
}

function showMessage(message, type) {
    const toast = document.createElement('div');
    toast.className = `admin-toast admin-toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'info' ? '#3498db' : type === 'error' ? '#e74c3c' : '#27ae60'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        max-width: 300px;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}