import {getCurrentUserId} from './userSession.js';
// Set up event listeners when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminDashboard();
});

async function initializeAdminDashboard() {
    await loadSystemOverview();
    setupEventListeners();
}

function setupEventListeners() {
    const actionCards = document.querySelectorAll('.action-card');
    const logoutBtn = document.querySelector('.logout-btn');

    // Action card navigation
    actionCards.forEach(card => {
        card.addEventListener('click', handleActionCardClick);
    });

    // Logout confirmation
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to logout?')) {
                e.preventDefault();
            }
        });
    }

    // Keyboard navigation for action cards
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            const focusedCard = document.activeElement;
            if (focusedCard.classList.contains('action-card') && !focusedCard.disabled) {
                handleActionCardClick({ target: focusedCard });
            }
        }
    });
}

// Handle action card clicks
function handleActionCardClick(e) {
    const action = e.currentTarget.dataset.action;
    
    if (e.currentTarget.disabled) {
        return;
    }

    switch(action) {
        case 'equipment':
            window.location.href = '/equipment-maintenance.html';
            break;
        case 'billing':
            window.location.href = '/billing-payment.html';
            break;
        case 'classes':
            
            break;
        case 'rooms':
            
            break;
        default:
            console.log('Unknown action:', action);
    }
}

// Load system overview statistics
async function loadSystemOverview() {
    try {
        const adminId = getCurrentUserId();
        if (!adminId) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch('/api/admin/overview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ adminId: adminId })
        });

        if (!response.ok) {
            throw new Error('Failed to load system overview');
        }

        const result = await response.json();
        
        if (result.success) {
            updateSystemOverview(result.overview);
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error loading system overview:', error);
       
    }
}

// Update system overview UI
function updateSystemOverview(overview) {
    if (overview.activeMembers !== undefined) {
        document.getElementById('activeMembers').textContent = overview.activeMembers;
    }
    
    if (overview.equipmentIssues !== undefined) {
        document.getElementById('equipmentIssues').textContent = overview.equipmentIssues;
    }
    
    if (overview.pendingBills !== undefined) {
        document.getElementById('pendingBills').textContent = overview.pendingBills;
    }
    
    if (overview.activeTrainers !== undefined) {
        document.getElementById('activeTrainers').textContent = overview.activeTrainers;
    }
}



