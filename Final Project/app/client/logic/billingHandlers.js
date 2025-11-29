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

// Load bills data
async function loadBills() {
    try {
        const adminId = getCurrentUserId();
        if (!adminId) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch('/api/admin/bills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId: adminId })
        });

        if (!response.ok) throw new Error('Failed to load bills');

        const result = await response.json();
        if (result.success) {
            displayBills(result.bills);
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error loading bills:', error);
        showMessage('Failed to load bills data', 'error');
    }
}

// Display bills in table
function displayBills(bills) {
    const tbody = document.getElementById('billsBody');
    
    if (!bills || bills.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No bills found</td></tr>';
        return;
    }

    tbody.innerHTML = bills.map(bill => {
        // Calculate total paid and remaining amount
        const totalPaid = bill.payments.reduce((total, payment) => {
            return total + parseFloat(payment.amount_paid);
        }, 0);
        
        const remainingAmount = parseFloat(bill.amount_due) - totalPaid;
        const isOverdue = bill.status === 'Pending' && new Date(bill.due_date) < new Date();
        const status = isOverdue ? 'Overdue' : bill.status;
        
        return `
            <tr>
                <td>#${bill.bill_id}</td>
                <td>${bill.member.first_name} ${bill.member.last_name}</td>
                <td class="amount amount-negative">
                    $${parseFloat(bill.amount_due).toFixed(2)}
                </td>
                <td class="amount amount-positive">
                    $${totalPaid.toFixed(2)}
                </td>
                <td class="amount amount-${remainingAmount > 0 ? 'negative' : 'positive'}">
                    $${remainingAmount.toFixed(2)}
                </td>
                <td>${new Date(bill.issue_date).toLocaleDateString()}</td>
                <td>${new Date(bill.due_date).toLocaleDateString()}</td>
                <td>
                    <span class="status-badge status-${status.toLowerCase()}">
                        ${status}
                    </span>
                </td>
                <td class="action-buttons">
                    ${remainingAmount > 0 ? 
                        `<button class="btn-success record-payment-btn" 
                                 data-bill-id="${bill.bill_id}" 
                                 data-bill-amount="${remainingAmount}">
                            Record Payment
                        </button>` : 
                        `<span class="no-data">Paid in Full</span>`
                    }
                </td>
            </tr>
        `;
    }).join('');

    // Add event listeners to record payment buttons
    document.querySelectorAll('.record-payment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const billId = e.target.dataset.billId;
            const remainingAmount = e.target.dataset.billAmount;
            openRecordPaymentModal(billId, remainingAmount);
        });
    });
}

// Load payments data
async function loadPayments() {
    try {
        const adminId = getCurrentUserId();
        if (!adminId) return;

        const response = await fetch('/api/admin/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId: adminId })
        });

        if (!response.ok) throw new Error('Failed to load payments');

        const result = await response.json();
        if (result.success) {
            displayPayments(result.payments);
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

// Display payments in table
function displayPayments(payments) {
    const tbody = document.getElementById('paymentsBody');
    
    if (!payments || payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No payments found</td></tr>';
        return;
    }

    tbody.innerHTML = payments.map(payment => `
        <tr>
            <td>#${payment.payment_id}</td>
            <td>#${payment.bill.bill_id}</td>
            <td>${payment.bill.member.first_name} ${payment.bill.member.last_name}</td>
            <td class="amount amount-positive">
                $${parseFloat(payment.amount_paid).toFixed(2)}
            </td>
            <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
            <td>
                <span class="method-badge method-${payment.payment_method}">
                    ${formatPaymentMethod(payment.payment_method)}
                </span>
            </td>
            <td class="action-buttons">
                <span class="no-data">Completed</span>
            </td>
        </tr>
    `).join('');
}

// Load financial reports
async function loadFinancialReports() {
    try {
        const adminId = getCurrentUserId();
        if (!adminId) return;

        const response = await fetch('/api/admin/financial-reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId: adminId })
        });

        if (!response.ok) throw new Error('Failed to load financial reports');

        const result = await response.json();
        if (result.success) {
            displayFinancialReports(result.reports);
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error loading financial reports:', error);
    }
}

// Display financial reports
function displayFinancialReports(reports) {
    if (!reports) return;

    if (reports.monthlyRevenue !== undefined) {
        document.getElementById('monthlyRevenue').textContent = `$${parseFloat(reports.monthlyRevenue).toFixed(2)}`;
    }
    
    if (reports.totalPending !== undefined) {
        document.getElementById('totalPending').textContent = `$${parseFloat(reports.totalPending).toFixed(2)}`;
    }
    
    if (reports.totalMembers !== undefined) {
        document.getElementById('totalMembers').textContent = reports.totalMembers;
    }
    
    if (reports.collectionRate !== undefined) {
        document.getElementById('collectionRate').textContent = `${parseFloat(reports.collectionRate).toFixed(1)}%`;
    }
}

// Modal functions
async function openGenerateBillModal() {
    await loadMembersForBilling();
    document.getElementById('generateBillModal').classList.remove('hidden');
}

function openRecordPaymentModal(billId, billAmount) {
    document.getElementById('paymentBillId').value = billId;
    document.getElementById('paymentAmount').value = parseFloat(billAmount).toFixed(2);
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('recordPaymentModal').classList.remove('hidden');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
    // Reset forms
    document.getElementById('generateBillForm').reset();
    document.getElementById('recordPaymentForm').reset();
    setDefaultDueDate();
}

// Load members for bill generation
async function loadMembersForBilling() {
    try {
        const adminId = getCurrentUserId();
        if (!adminId) return;

        const response = await fetch('/api/admin/members-for-billing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId: adminId })
        });

        if (!response.ok) throw new Error('Failed to load members');

        const result = await response.json();
        if (result.success) {
            populateMemberDropdown(result.members);
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error loading members:', error);
        showMessage('Failed to load members list', 'error');
    }
}

function populateMemberDropdown(members) {
    const dropdown = document.getElementById('billMember');
    dropdown.innerHTML = '<option value="">Select a member...</option>';
    
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.user_id;
        option.textContent = `${member.first_name} ${member.last_name} (${member.email})`;
        dropdown.appendChild(option);
    });
}

// Form handlers
async function handleGenerateBill(e) {
    e.preventDefault();
    
    const memberId = document.getElementById('billMember').value;
    const description = document.getElementById('billDescription').value;
    const amount = document.getElementById('billAmount').value;
    const dueDate = document.getElementById('billDueDate').value;

    try {
        const adminId = getCurrentUserId();
        if (!adminId) return;

        const response = await fetch('/api/admin/generate-bill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminId: adminId,
                memberId: parseInt(memberId),
                description: description,
                amount: parseFloat(amount),
                dueDate: dueDate
            })
        });

        if (!response.ok) throw new Error('Failed to generate bill');

        const result = await response.json();
        if (result.success) {
            showMessage('Bill generated successfully', 'success');
            closeAllModals();
            // Refresh all data
            await loadBills();
            await loadFinancialReports();
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error generating bill:', error);
        showMessage('Failed to generate bill', 'error');
    }
}

async function handleRecordPayment(e) {
    e.preventDefault();
    
    const billId = document.getElementById('paymentBillId').value;
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const paymentMethod = document.getElementById('paymentMethod').value;
    const paymentDate = document.getElementById('paymentDate').value;

    try {
        const adminId = getCurrentUserId();
        if (!adminId) return;

        // First, get the bill details to check remaining amount
        const billResponse = await fetch('/api/admin/bill-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminId: adminId,
                billId: parseInt(billId)
            })
        });

        if (!billResponse.ok) throw new Error('Failed to get bill details');
        
        const billResult = await billResponse.json();
        if (!billResult.success) throw new Error(billResult.error);

        const bill = billResult.bill;
        const remainingAmount = parseFloat(bill.remaining_amount);

        // Validate payment amount doesn't exceed remaining amount
        if (amount > remainingAmount) {
            showMessage(`Payment amount cannot exceed remaining balance of $${remainingAmount.toFixed(2)}`, 'error');
            return;
        }

        // Validate payment amount is positive
        if (amount <= 0) {
            showMessage('Payment amount must be greater than 0', 'error');
            return;
        }

        const response = await fetch('/api/admin/record-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminId: adminId,
                billId: parseInt(billId),
                amount: amount,
                paymentMethod: paymentMethod,
                paymentDate: paymentDate
            })
        });

        if (!response.ok) throw new Error('Failed to record payment');

        const result = await response.json();
        if (result.success) {
            showMessage('Payment recorded successfully', 'success');
            closeAllModals();
            // Refresh all data
            await loadBills();
            await loadPayments();
            await loadFinancialReports();
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error recording payment:', error);
        showMessage('Failed to record payment', 'error');
    }
}

// Utility functions
function formatPaymentMethod(method) {
    const methods = {
        'credit_card': 'Credit Card',
        'debit_card': 'Debit Card',
        'cash': 'Cash',
        'bank_transfer': 'Bank Transfer'
    };
    return methods[method] || method;
}

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