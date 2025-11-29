// Set up event listeners when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeBillingPage();
});

async function initializeBillingPage() {
    await loadBills();
    await loadPayments();
    await loadFinancialReports();
    setupEventListeners();
}

function setupEventListeners() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const generateBillBtn = document.getElementById('generateBillBtn');
    const generateBillForm = document.getElementById('generateBillForm');
    const recordPaymentForm = document.getElementById('recordPaymentForm');

    // Tab navigation
    tabButtons.forEach(button => {
        button.addEventListener('click', handleTabClick);
    });

    // Modal buttons
    if (generateBillBtn) {
        generateBillBtn.addEventListener('click', openGenerateBillModal);
    }

    // Modal close buttons
    closeModalButtons.forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    // Form submissions
    if (generateBillForm) {
        generateBillForm.addEventListener('submit', handleGenerateBill);
    }

    if (recordPaymentForm) {
        recordPaymentForm.addEventListener('submit', handleRecordPayment);
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

    // Set default due date to 30 days from now
    setDefaultDueDate();
}

function setDefaultDueDate() {
    const dueDateInput = document.getElementById('billDueDate');
    if (dueDateInput) {
        const today = new Date();
        const dueDate = new Date(today);
        dueDate.setDate(today.getDate() + 30);
        dueDateInput.value = dueDate.toISOString().split('T')[0];
    }
}