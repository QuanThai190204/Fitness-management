// Set up event listeners when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeEquipmentPage();
});

async function initializeEquipmentPage() {
    await loadEquipmentData();
    await loadMaintenanceLogs();
    await loadRepairTasks();
    setupEventListeners();
}

function setupEventListeners() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const logMaintenanceForm = document.getElementById('logMaintenanceForm');
    const assignRepairForm = document.getElementById('assignRepairForm');
    const logoutBtn = document.querySelector('.logout-btn');

    // Tab navigation
    tabButtons.forEach(button => {
        button.addEventListener('click', handleTabClick);
    });

    // Modal close buttons
    closeModalButtons.forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    // Form submissions
    if (logMaintenanceForm) {
        logMaintenanceForm.addEventListener('submit', handleLogMaintenance);
    }

    if (assignRepairForm) {
        assignRepairForm.addEventListener('submit', handleAssignRepair);
    }

    // Close modal when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // Logout confirmation
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to logout?')) {
                e.preventDefault();
            }
        });
    }
}