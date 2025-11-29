// Set up event listeners when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeTrainerDashboard();
});

async function initializeTrainerDashboard() {
    await loadAllMembers();
    setupEventListeners();
    loadTrainerAvailability();
}

function setupEventListeners() {
    const searchInput = document.getElementById('memberSearch');
    const searchDropdown = document.getElementById('searchDropdown');
    const closeMemberBtn = document.querySelector('.close-member-btn');
    const logoutBtn = document.querySelector('.logout-btn');
    const availabilityForm = document.getElementById('availabilityForm');
    const actionButtons = document.querySelectorAll('.action-btn');

    // Member search
    if (searchInput) {
        searchInput.addEventListener('input', handleMemberSearch);
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.classList.add('hidden');
            }
        });
    }

    // Close member info
    if (closeMemberBtn) {
        closeMemberBtn.addEventListener('click', () => {
            document.getElementById('memberInfo').classList.add('hidden');
        });
    }


    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to logout?')) {
                e.preventDefault();
            }
        });
    }

    // Availability form
    if (availabilityForm) {
        availabilityForm.addEventListener('submit', handleAvailabilitySubmit);
    }

    // Quick actions
    actionButtons.forEach(button => {
        button.addEventListener('click', handleQuickAction);
    });

}