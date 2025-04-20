document.addEventListener('DOMContentLoaded', async () => {
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

    // Get service from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const service = urlParams.get('service');
    
    if (!service) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Get service info from config
    const serviceInfo = window.SERVICES_CONFIG[service];
    if (!serviceInfo) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Set service info
    document.getElementById('serviceLogo').src = serviceInfo.logo;
    document.getElementById('serviceName').textContent = serviceInfo.name;

    const subscriptionDetails = document.getElementById('subscriptionDetails');
    subscriptionDetails.innerHTML = '<div class="loading">Loading subscription details...</div>';

    try {
        // Fetch subscription details
        const response = await fetch(`${window.API_BASE_URL}/api/subscription/${service}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            // Active subscription exists
            const subscription = data;
            
            subscriptionDetails.innerHTML = `
                <div class="subscription-section">
                    <h3>Current Subscription</h3>
                    <div class="subscription-info">
                        <div class="info-row">
                            <label>Current Plan:</label>
                            <span>${subscription.plan}</span>
                        </div>
                        <div class="info-row">
                            <label>Price:</label>
                            <span>₹${subscription.amount}</span>
                        </div>
                        <div class="info-row">
                            <label>Status:</label>
                            <span class="status ${subscription.status.toLowerCase()}">${subscription.status}</span>
                        </div>
                        <div class="info-row">
                            <label>Next Renewal:</label>
                            <span>${new Date(subscription.renew_date).toLocaleDateString()}</span>
                        </div>
                    </div>
                    ${subscription.status === 'active' ? `
                        <div class="subscription-actions">
                            <button id="cancelSubscriptionBtn" class="btn danger">
                                <i class="fas fa-times-circle"></i> Cancel Subscription
                            </button>
                        </div>
                    ` : ''}
                </div>

                <div class="subscription-section">
                    <h3>Available Plans</h3>
                    <div class="plans-grid">
                        ${Object.entries(serviceInfo.plans)
                            .map(([planId, plan]) => `
                                <div class="plan-card ${planId === subscription.plan ? 'current' : ''}">
                                    <h4>${plan.name}</h4>
                                    <p class="price">₹${plan.price}/month</p>
                                    ${planId === subscription.plan ? 
                                        '<span class="current-plan-badge">Current Plan</span>' :
                                        `<button class="btn primary" onclick="window.location.href='payment.html?service=${service}&amount=${plan.price}&plan=${planId}'">
                                            Switch to this Plan
                                        </button>`
                                    }
                                </div>
                            `).join('')}
                    </div>
                </div>

                <div class="subscription-section">
                    <h3>Billing History</h3>
                    <div id="billingHistory" class="billing-history">
                        Loading billing history...
                    </div>
                </div>
            `;

            // Add cancel subscription handler
            const cancelBtn = document.getElementById('cancelSubscriptionBtn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => handleCancelSubscription(service, token));
            }

            // Load billing history
            loadBillingHistory(service, token);

        } else {
            // No active subscription - show available plans
            subscriptionDetails.innerHTML = `
                <div class="subscription-section">
                    <h3>Available Plans</h3>
                    <p class="no-subscription-message">You don't have an active subscription for ${serviceInfo.name}. Choose a plan below to subscribe:</p>
                    <div class="plans-grid">
                        ${Object.entries(serviceInfo.plans)
                            .map(([planId, plan]) => `
                                <div class="plan-card">
                                    <h4>${plan.name}</h4>
                                    <p class="price">₹${plan.price}/month</p>
                                    <button class="btn primary" onclick="window.location.href='payment.html?service=${service}&amount=${plan.price}&plan=${planId}'">
                                        Subscribe Now
                                    </button>
                                </div>
                            `).join('')}
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        subscriptionDetails.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load subscription details. Please try again later.</p>
                <button class="btn primary" onclick="window.location.reload()">Retry</button>
            </div>
        `;
    }
});

async function handleCancelSubscription(service, token) {
    if (confirm('Are you sure you want to cancel this subscription? This action cannot be undone.')) {
        try {
            const response = await fetch(`${window.API_BASE_URL}/api/subscription/${service}/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to cancel subscription');
            }

            alert('Subscription cancelled successfully');
            window.location.reload();
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            alert(error.message);
        }
    }
}

async function loadBillingHistory(service, token) {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/invoices`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch billing history');
        }

        const invoices = await response.json();
        const serviceInvoices = invoices.filter(invoice => invoice.service === service);
        const billingHistory = document.getElementById('billingHistory');

        if (serviceInvoices.length === 0) {
            billingHistory.innerHTML = '<p class="no-history">No billing history available</p>';
            return;
        }

        billingHistory.innerHTML = `
            <div class="invoice-list">
                ${serviceInvoices.map(invoice => `
                    <div class="invoice-item">
                        <div class="invoice-details">
                            <span class="date">${new Date(invoice.paid_on).toLocaleDateString()}</span>
                            <span class="plan">${invoice.plan}</span>
                            <span class="amount">₹${invoice.amount}</span>
                        </div>
                        <a href="${window.API_BASE_URL}/api/download-invoice/${invoice.id}" class="download-btn">
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading billing history:', error);
        document.getElementById('billingHistory').innerHTML = 
            '<p class="error">Error loading billing history</p>';
    }
}

// Handle logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    window.location.href = 'index.html';
}); 