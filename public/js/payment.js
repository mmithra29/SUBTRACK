document.addEventListener('DOMContentLoaded', () => {
    // Prevent any automatic form submissions
    document.querySelectorAll('form').forEach(form => {
        form.onsubmit = (e) => {
            e.preventDefault();
            return false;
        };
    });

    // Check login status
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in to continue');
        window.location.href = 'index.html';
        return;
    }
    
    // Get payment details from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const service = urlParams.get('service');
    const amount = parseFloat(urlParams.get('amount') || '0');
    const plan = urlParams.get('plan');

    console.log('Payment page initialized with:', {
        service,
        plan,
        amount,
        allParams: Object.fromEntries(urlParams.entries())
    });

    // Service configurations
    const services = {
        netflix: {
            name: 'Netflix',
            logo: 'images/netflix-logo.png',
            plans: {
                'basic': 'Basic Plan',
                'standard': 'Standard Plan',
                'premium': 'Premium Plan'
            }
        },
        disney: {
            name: 'Disney+ Hotstar',
            logo: 'images/disney-logo.png',
            plans: {
                'mobile': 'Mobile Plan',
                'super': 'Super Plan',
                'premium': 'Premium Plan'
            }
        },
        amazon: {
            name: 'Amazon Prime Video',
            logo: 'images/amazon-logo.png',
            plans: {
                'monthly': 'Monthly Plan',
                'quarterly': 'Quarterly Plan',
                'annual': 'Annual Plan'
            }
        },
        spotify: {
            name: 'Spotify',
            logo: 'images/spotify-logo.png',
            plans: {
                'individual': 'Individual Plan',
                'duo': 'Duo Plan',
                'family': 'Family Plan',
                'student': 'Student Plan'
            }
        }
    };

    // Set service details
    const serviceInfo = services[service];
    if (serviceInfo) {
        document.getElementById('serviceLogo').src = serviceInfo.logo;
        document.getElementById('serviceName').textContent = serviceInfo.name;
        document.getElementById('planDetails').textContent = serviceInfo.plans[plan] || 'Monthly Subscription';
    }

    // Calculate and display amounts
    const subAmount = amount;
    const taxAmount = subAmount * 0.18;
    const totalAmount = subAmount + taxAmount;

    document.getElementById('subAmount').textContent = `₹${subAmount.toFixed(2)}`;
    document.getElementById('taxAmount').textContent = `₹${taxAmount.toFixed(2)}`;
    document.getElementById('totalAmount').textContent = `₹${totalAmount.toFixed(2)}`;
    document.getElementById('buttonAmount').textContent = `Pay ₹${totalAmount.toFixed(2)}`;

    // Payment method switching
    const methodButtons = document.querySelectorAll('.method-btn');
    methodButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const method = button.dataset.method;
            
            // Update active button
            methodButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show selected section
            document.querySelectorAll('.payment-method-section').forEach(section => {
                section.classList.add('hidden');
            });
            document.getElementById(`${method}PaymentSection`).classList.remove('hidden');
        });
    });

    // Card number formatting
    const cardNumber = document.getElementById('cardNumber');
    cardNumber?.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(.{4})/g, '$1 ').trim();
        e.target.value = value;
    });

    // Expiry date formatting
    const expiryDate = document.getElementById('expiryDate');
    expiryDate?.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.slice(0, 2) + '/' + value.slice(2);
        }
        e.target.value = value;
    });

    // Handle payment button click
    const payButton = document.getElementById('payButton');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    payButton.addEventListener('click', async () => {
        const activeMethod = document.querySelector('.method-btn.active').dataset.method;
        
        // Validate inputs based on payment method
        if (activeMethod === 'card') {
            const cardNumber = document.getElementById('cardNumber').value.trim();
            const expiryDate = document.getElementById('expiryDate').value.trim();
            const cvv = document.getElementById('cvv').value.trim();
            const cardName = document.getElementById('cardName').value.trim();

            if (!cardNumber || !expiryDate || !cvv || !cardName) {
                alert('Please fill in all card details');
                return;
            }

            if (cardNumber.replace(/\s/g, '').length !== 16) {
                alert('Please enter a valid 16-digit card number');
                return;
            }

            if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
                alert('Please enter a valid expiry date (MM/YY)');
                return;
            }

            if (cvv.length !== 3) {
                alert('Please enter a valid 3-digit CVV');
                return;
            }
        } else if (activeMethod === 'upi') {
            const upiId = document.getElementById('upiId').value.trim();
            if (!upiId || !upiId.includes('@')) {
                alert('Please enter a valid UPI ID');
                return;
            }
        } else if (activeMethod === 'netbanking') {
            const bank = document.getElementById('bankSelect').value;
            if (!bank) {
                alert('Please select a bank');
                return;
            }
        }

        // Show loading overlay
        payButton.disabled = true;
        loadingOverlay.classList.remove('hidden');
        
        try {
            // Validate required fields
            if (!service || !plan || !amount) {
                throw new Error('Missing required payment information');
            }

            // Create payment data exactly as server expects
            const paymentData = {
                service: service,
                plan: plan,
                amount: amount
            };

            console.log('Sending payment data:', paymentData);

            const response = await fetch(`${window.API_BASE_URL}/api/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(paymentData)
            });

            console.log('Response status:', response.status);
            const responseData = await response.json();
            console.log('Response data:', responseData);

            if (!response.ok) {
                throw new Error(responseData.error || 'Payment failed');
            }

            // Store subscription data in localStorage
            const subscriptionData = {
                service: service,
                plan: plan,
                amount: amount,
                status: 'active',
                start_date: new Date().toISOString(),
                renew_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            };

            let existingSubscriptions = JSON.parse(localStorage.getItem('subscriptions') || '[]');
            existingSubscriptions = existingSubscriptions.filter(sub => sub.service !== service);
            existingSubscriptions.push(subscriptionData);
            localStorage.setItem('subscriptions', JSON.stringify(existingSubscriptions));

            // Redirect to success page
            window.location.href = `payment-success.html?invoice=${responseData.invoice_id}&service=${service}&plan=${plan}`;
        } catch (error) {
            console.error('Payment error:', error);
            alert(error.message || 'An error occurred while processing your payment');
        } finally {
            payButton.disabled = false;
            loadingOverlay.classList.add('hidden');
        }
    });
}); 