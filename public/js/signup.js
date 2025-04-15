// API endpoints
const API_URL = 'http://localhost:5000';

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token && window.location.pathname.includes('index.html')) {
        window.location.href = 'dashboard.html';
    } else if (!token && window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'index.html';
    }
}

// Handle login form submission
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    console.log('Login form submitted');
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    console.log('Attempting login with:', { email });

    try {
        console.log('Making API request to:', `${API_URL}/login`);
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        console.log('Login response:', data);
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userName', data.name);
            window.location.href = 'dashboard.html';
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during login');
    }
});

// Handle signup form submission
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Signup form submitted');
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    console.log('Form data:', { name, email, password: '***' });

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    try {
        console.log('Making API request to:', `${API_URL}/signup`);
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Signup response:', data);
        
        if (response.ok) {
            alert('Signup successful! Please login.');
            window.location.href = 'index.html';
        } else {
            alert(data.error || 'Signup failed');
        }
    } catch (error) {
        console.error('Error during signup:', error);
        alert('An error occurred during signup');
    }
});

// Handle logout
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    window.location.href = 'index.html';
});

// Handle subscription form submission
document.getElementById('subscribeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Subscription form submitted');
    
    const plan = document.getElementById('plan').value;
    const token = localStorage.getItem('token');
    
    console.log('Selected plan:', plan);
    console.log('Token exists:', !!token);
    
    if (!token) {
        alert('Please login first');
        window.location.href = 'index.html';
        return;
    }

    const amount = getPlanAmount(plan);
    console.log('Calculated amount:', amount);

    try {
        console.log('Making subscription request to:', `${API_URL}/subscribe`);
        const response = await fetch(`${API_URL}/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                plan,
                amount
            })
        });

        console.log('Subscription response status:', response.status);
        const data = await response.json();
        console.log('Subscription response:', data);
        
        if (response.ok) {
            alert('Subscription successful!');
            loadInvoices(); // Refresh invoices list
        } else {
            alert(data.error || 'Subscription failed');
        }
    } catch (error) {
        console.error('Error during subscription:', error);
        alert('An error occurred during subscription');
    }
});

// Helper function to get plan amount
function getPlanAmount(plan) {
    switch (plan) {
        case 'basic': return 9.99;
        case 'premium': return 19.99;
        case 'enterprise': return 49.99;
        default: return 0;
    }
}

// Load user's invoices
async function loadInvoices() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/invoices`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const invoices = await response.json();
            displayInvoices(invoices);
        }
    } catch (error) {
        console.error('Error loading invoices:', error);
    }
}

// Display invoices in the UI
function displayInvoices(invoices) {
    const invoicesList = document.getElementById('invoicesList');
    if (!invoicesList) return;

    if (invoices.length === 0) {
        invoicesList.innerHTML = '<p>No invoices found</p>';
        return;
    }

    invoicesList.innerHTML = invoices.map(invoice => `
        <div class="invoice-item">
            <p>Plan: ${invoice.plan}</p>
            <p>Amount: $${invoice.amount}</p>
            <p>Date: ${new Date(invoice.paid_on).toLocaleDateString()}</p>
            <a href="${API_URL}/download-invoice/${invoice.id}" class="btn">Download Invoice</a>
        </div>
    `).join('');
}

// Load invoices when dashboard loads
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        const userName = localStorage.getItem('userName');
        if (userName) {
            userNameElement.textContent = `Welcome, ${userName}`;
        }
    }
    loadInvoices(); // Load invoices on dashboard load
}); 