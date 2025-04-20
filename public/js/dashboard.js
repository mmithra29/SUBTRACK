document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // Set user name
    const userName = localStorage.getItem('userName');
    if (userName) {
        document.getElementById('userName').textContent = `Welcome, ${userName}`;
    }

    // Handle logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        window.location.href = 'index.html';
    });

    // Display available services
    const subscriptionGrid = document.getElementById('subscriptionGrid');
    Object.entries(window.SERVICES_CONFIG).forEach(([serviceId, service]) => {
        const card = document.createElement('div');
        card.className = 'subscription-logo-card';
        
        // Get the cheapest plan price
        const cheapestPlan = Object.values(service.plans)
            .reduce((min, plan) => plan.price < min.price ? plan : min);

        card.innerHTML = `
            <img src="${service.logo}" alt="${service.name}" style="background-color: ${service.color}">
            <div class="hover-details">
                <h3>${service.name}</h3>
                <p class="description">${service.description}</p>
                <p class="price">Starting at ₹${cheapestPlan.price}/month</p>
                <div class="plans-list">
                    ${Object.entries(service.plans)
                        .map(([id, plan]) => `
                            <div class="plan-row">
                                <span>${plan.name}</span>
                                <span>₹${plan.price}/month</span>
                            </div>
                        `).join('')}
                </div>
                <button class="btn primary">Subscribe Now</button>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            // Only navigate if not clicking on the hover details or button
            if (!e.target.closest('.hover-details') && !e.target.closest('.btn')) {
                window.location.href = `subscription-details.html?service=${serviceId}`;
            }
        });
        
        subscriptionGrid.appendChild(card);
    });

    // Load active subscriptions
    await loadActiveSubscriptions();
    
    // Load invoices
    await loadInvoices();
});

async function loadActiveSubscriptions() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.API_BASE_URL}/api/subscriptions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const subscriptions = await response.json();
            displaySubscriptions(subscriptions);
        }
    } catch (error) {
        console.error('Error loading active subscriptions:', error);
        const cachedSubscriptions = localStorage.getItem('subscriptions');
        if (cachedSubscriptions) {
            displaySubscriptions(JSON.parse(cachedSubscriptions));
        }
    }
}

async function loadInvoices() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.API_BASE_URL}/api/invoices`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const invoices = await response.json();
            const invoicesList = document.getElementById('invoicesList');
            
            if (invoices.length === 0) {
                invoicesList.innerHTML = '<p>No invoices found.</p>';
                return;
            }

            invoicesList.innerHTML = '';
            invoices.forEach(invoice => {
                const invoiceItem = document.createElement('div');
                invoiceItem.className = 'invoice-item';
                invoiceItem.innerHTML = `
                    <div class="invoice-details">
                        <span>${invoice.service}</span>
                        <span>${invoice.plan}</span>
                        <span>₹${invoice.amount}</span>
                        <span>${new Date(invoice.paid_on).toLocaleDateString()}</span>
                    </div>
                    <button class="download-btn" onclick="downloadInvoice(${invoice.id})">
                        <i class="fas fa-download"></i> Download
                    </button>
                `;
                invoicesList.appendChild(invoiceItem);
            });
        }
    } catch (error) {
        console.error('Error loading invoices:', error);
    }
}

async function downloadInvoice(invoiceId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/download-invoice/${invoiceId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            // Create a blob from the PDF stream
            const blob = await response.blob();
            // Create a link to download it
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice_${invoiceId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to download invoice');
        }
    } catch (error) {
        console.error('Error downloading invoice:', error);
        alert('Failed to download invoice. Please try again.');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Format options for different cases
    const normalFormat = { year: 'numeric', month: 'long', day: 'numeric' };
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString(undefined, normalFormat);
    }
}

function getRenewalStatus(renewDate) {
    const now = new Date();
    const renewal = new Date(renewDate);
    const diffTime = renewal - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return {
            status: 'expired',
            class: 'expired',
            message: 'Expired'
        };
    } else if (diffDays === 0) {
        return {
            status: 'renewing',
            class: 'renewing',
            message: 'Renewing Today'
        };
    } else if (diffDays <= 3) {
        return {
            status: 'upcoming',
            class: 'upcoming',
            message: `Renews in ${diffDays} day${diffDays > 1 ? 's' : ''}`
        };
    } else {
        return {
            status: 'active',
            class: 'active',
            message: `Renews on ${formatDate(renewDate)}`
        };
    }
}

function displaySubscriptions(subscriptions) {
    const activeSubscriptionsContainer = document.getElementById('activeSubscriptions');
    
    if (!subscriptions || subscriptions.length === 0) {
        activeSubscriptionsContainer.innerHTML = `
            <div class="no-subscriptions">
                <i class="fas fa-info-circle"></i>
                <p>No active subscriptions found.</p>
                <p class="sub-text">Browse available subscriptions above to get started!</p>
            </div>
        `;
        return;
    }

    activeSubscriptionsContainer.innerHTML = ''; // Clear existing content
    
    subscriptions.forEach(subscription => {
        const service = window.SERVICES_CONFIG[subscription.service];
        if (service) {
            const renewalInfo = getRenewalStatus(subscription.renew_date);
            const card = document.createElement('div');
            card.className = `subscription-card ${renewalInfo.class}`;
            
            // Calculate next billing amount including tax
            const baseAmount = parseFloat(subscription.amount);
            const taxAmount = baseAmount * 0.18; // 18% GST
            const totalAmount = baseAmount + taxAmount;

            card.innerHTML = `
                <div class="card-header">
                    <img src="${service.logo}" alt="${service.name}" style="background-color: ${service.color}">
                    <div class="service-info">
                        <h3>${service.name}</h3>
                        <span class="plan-badge">${subscription.plan}</span>
                    </div>
                </div>
                <div class="subscription-details">
                    <div class="amount-info">
                        <div class="amount-row">
                            <span>Base Amount:</span>
                            <span>₹${baseAmount.toFixed(2)}</span>
                        </div>
                        <div class="amount-row">
                            <span>Tax (18% GST):</span>
                            <span>₹${taxAmount.toFixed(2)}</span>
                        </div>
                        <div class="amount-row total">
                            <span>Total:</span>
                            <span>₹${totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="renewal-status ${renewalInfo.class}">
                        <i class="fas ${getRenewalIcon(renewalInfo.status)}"></i>
                        <span>${renewalInfo.message}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn primary" onclick="window.location.href='subscription-details.html?service=${service.id}'">
                        <i class="fas fa-cog"></i> Manage Subscription
                    </button>
                </div>
            `;
            
            card.addEventListener('click', (e) => {
                // Only navigate if not clicking on the hover details or button
                if (!e.target.closest('.hover-details') && !e.target.closest('.btn')) {
                    window.location.href = `subscription-details.html?service=${service.id}`;
                }
            });
            
            activeSubscriptionsContainer.appendChild(card);
        }
    });
}

function getRenewalIcon(status) {
    switch (status) {
        case 'expired':
            return 'fa-exclamation-circle';
        case 'renewing':
            return 'fa-sync';
        case 'upcoming':
            return 'fa-clock';
        case 'active':
            return 'fa-check-circle';
        default:
            return 'fa-info-circle';
    }
}

// Add this CSS to your main.css or create a new styles/dashboard.css file
const styles = `
.subscription-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
}

.subscription-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.card-header img {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    object-fit: contain;
    padding: 8px;
}

.service-info {
    flex: 1;
}

.plan-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: var(--secondary-color);
    border-radius: 12px;
    font-size: 0.875rem;
    color: var(--text-color);
    margin-top: 0.25rem;
}

.subscription-details {
    margin: 1rem 0;
    padding: 1rem 0;
    border-top: 1px solid var(--border-color);
    border-bottom: 1px solid var(--border-color);
}

.amount-info {
    margin-bottom: 1rem;
}

.amount-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
}

.amount-row.total {
    font-weight: 600;
    font-size: 1rem;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px dashed var(--border-color);
}

.renewal-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 0.9rem;
}

.renewal-status.active {
    background: rgba(46, 204, 113, 0.1);
    color: #27ae60;
}

.renewal-status.upcoming {
    background: rgba(241, 196, 15, 0.1);
    color: #f39c12;
}

.renewal-status.renewing {
    background: rgba(52, 152, 219, 0.1);
    color: #2980b9;
}

.renewal-status.expired {
    background: rgba(231, 76, 60, 0.1);
    color: #c0392b;
}

.card-actions {
    margin-top: 1rem;
}

.no-subscriptions {
    text-align: center;
    padding: 2rem;
    background: var(--secondary-color);
    border-radius: 12px;
    color: var(--text-color);
}

.no-subscriptions i {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: var(--primary-color);
}

.no-subscriptions .sub-text {
    margin-top: 0.5rem;
    font-size: 0.9rem;
    opacity: 0.8;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.renewal-status.renewing i {
    animation: spin 2s linear infinite;
}
`;

// Add the styles to the document
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet); 