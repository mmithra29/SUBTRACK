const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const pdf = require("html-pdf");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require('dotenv').config();

const app = express();
const db = require("./database");

// Middleware
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Generate Invoice function without email
function generateInvoice(paymentId, userId, res) {
    db.get(
        "SELECT p.*, u.name, u.email FROM payments p JOIN users u ON p.user_id = u.id WHERE p.id = ?",
        [paymentId],
        async (err, payment) => {
            if (err || !payment) {
                return res.status(500).json({ error: "Payment not found" });
            }

            const invoiceData = {
                user_name: payment.name,
                email: payment.email,
                service: payment.service,
                plan: payment.plan,
                amount: payment.amount,
                payment_date: payment.paid_on,
                status: "Paid"
            };

            ejs.renderFile(
                path.join(__dirname, "templates/invoiceTemplate.html"),
                invoiceData,
                (err, html) => {
                    if (err) {
                        console.error("Template error:", err);
                        return res.status(500).json({ error: "Template generation failed" });
                    }

                    const filePath = path.join(__dirname, `invoice_${paymentId}.pdf`);
                    pdf.create(html).toFile(filePath, async (err) => {
                        if (err) {
                            console.error("PDF generation error:", err);
                            return res.status(500).json({ error: "PDF generation failed" });
                        }

                        res.json({
                            message: "Payment successful",
                            invoice_id: paymentId
                        });
                    });
                }
            );
        }
    );
}

// API Routes
app.post("/api/signup", async (req, res) => {
    const { name, email, password } = req.body;
    console.log("Signup attempt with:", { name, email });

    if (!name || !email || !password) {
        console.log("Missing required fields");
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        // Check if user already exists
        db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
            if (err) {
                console.error("Database error during user check:", err);
                return res.status(500).json({ error: "Database error" });
            }
            if (user) {
                console.log("User already exists:", email);
                return res.status(400).json({ error: "User already exists" });
            }

            try {
                // Hash password
                const hashedPassword = await bcrypt.hash(password, 10);
                console.log("Password hashed successfully");

                // Insert new user
                db.run(
                    "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
                    [name, email, hashedPassword],
                    function(err) {
                        if (err) {
                            console.error("Error inserting user:", err);
                            return res.status(500).json({ error: "Error creating user" });
                        }
                        console.log("User created successfully:", email);
                        res.status(201).json({ message: "User created successfully" });
                    }
                );
            } catch (hashError) {
                console.error("Error hashing password:", hashError);
                return res.status(500).json({ error: "Error processing password" });
            }
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    console.log("Login attempt for:", email);

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
            if (err) {
                console.error("Database error during login:", err);
                return res.status(500).json({ error: "Database error" });
            }
            if (!user) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            try {
                const validPassword = await bcrypt.compare(password, user.password);
                if (!validPassword) {
                    return res.status(401).json({ error: "Invalid credentials" });
                }

                const token = jwt.sign(
                    { id: user.id, email: user.email },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                console.log("Login successful for:", email);
                res.json({
                    token,
                    name: user.name,
                    message: "Login successful"
                });
            } catch (bcryptError) {
                console.error("Password comparison error:", bcryptError);
                return res.status(500).json({ error: "Error verifying password" });
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/api/subscribe", verifyToken, (req, res) => {
    console.log("Subscription request received:", req.body);
    const { service, plan, amount } = req.body;
    const user_id = req.user.id;
    
    if (!plan || !amount || !service) {
        return res.status(400).json({ error: "Service, plan and amount are required" });
    }

    const now = new Date();
    const start_date = now.toISOString();
    const renew_date = new Date(now.setMonth(now.getMonth() + 1)).toISOString();

    db.run(
        `INSERT INTO subscriptions (user_id, service, plan, amount, status, start_date, renew_date)
         VALUES (?, ?, ?, ?, 'active', ?, ?)`,
        [user_id, service, plan, amount, start_date, renew_date],
        function (err) {
            if (err) {
                console.error("Subscription error:", err);
                return res.status(500).json({ error: "Subscription failed" });
            }

            db.run(
                `INSERT INTO payments (user_id, service, plan, amount, paid_on)
                 VALUES (?, ?, ?, ?, ?)`,
                [user_id, service, plan, amount, start_date],
                function (err2) {
                    if (err2) {
                        console.error("Payment error:", err2);
                        return res.status(500).json({ error: "Payment failed" });
                    }

                    generateInvoice(this.lastID, user_id, res);
                }
            );
        }
    );
});

app.get("/api/subscriptions", verifyToken, (req, res) => {
    const user_id = req.user.id;
    
    db.all(
        `SELECT * FROM subscriptions WHERE user_id = ?`,
        [user_id],
        (err, rows) => {
            if (err) {
                console.error("Error fetching subscriptions:", err);
                return res.status(500).json({ error: "Could not fetch subscriptions" });
            }
            res.json(rows);
        }
    );
});

app.get("/api/subscription/:service", verifyToken, (req, res) => {
    const user_id = req.user.id;
    const service = req.params.service;
    
    db.get(
        `SELECT * FROM subscriptions WHERE user_id = ? AND service = ?`,
        [user_id, service],
        (err, subscription) => {
            if (err) {
                console.error("Error fetching subscription:", err);
                return res.status(500).json({ error: "Could not fetch subscription details" });
            }
            if (!subscription) {
                return res.status(404).json({ error: "Subscription not found" });
            }
            res.json(subscription);
        }
    );
});

app.post("/api/subscription/:service/cancel", verifyToken, (req, res) => {
    const user_id = req.user.id;
    const service = req.params.service;
    
    db.run(
        `UPDATE subscriptions 
         SET status = 'cancelled', 
         renew_date = datetime('now')
         WHERE user_id = ? AND service = ? AND status = 'active'`,
        [user_id, service],
        function(err) {
            if (err) {
                console.error("Error cancelling subscription:", err);
                return res.status(500).json({ error: "Could not cancel subscription" });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: "No active subscription found" });
            }
            res.json({ message: "Subscription cancelled successfully" });
        }
    );
});

app.get("/api/invoices", verifyToken, (req, res) => {
    const user_id = req.user.id;
    db.all(
        "SELECT * FROM payments WHERE user_id = ? ORDER BY paid_on DESC",
        [user_id],
        (err, rows) => {
            if (err) {
                console.error("Error fetching invoices:", err);
                return res.status(500).json({ error: "Could not fetch invoices" });
            }
            res.json(rows);
        }
    );
});

app.get("/api/download-invoice/:id", verifyToken, (req, res) => {
    const invoiceId = req.params.id;
    const userId = req.user.id;

    console.log(`Download request for invoice ${invoiceId} by user ${userId}`);

    try {
        // First check if the payment exists and belongs to the user
        db.get(
            `SELECT p.*, u.name, u.email 
             FROM payments p 
             JOIN users u ON p.user_id = u.id 
             WHERE p.id = ? AND p.user_id = ?`,
            [invoiceId, userId],
            async (err, payment) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).json({ error: "Database error" });
                }

                if (!payment) {
                    return res.status(404).json({ error: "Invoice not found" });
                }

                const filePath = path.join(__dirname, `invoice_${invoiceId}.pdf`);

                // If the PDF doesn't exist, generate it
                if (!fs.existsSync(filePath)) {
                    console.log(`Generating new PDF for invoice ${invoiceId}`);
                    
                    const invoiceData = {
                        user_name: payment.name,
                        email: payment.email,
                        service: payment.service,
                        plan: payment.plan,
                        amount: payment.amount,
                        payment_date: payment.paid_on,
                        status: "Paid"
                    };

                    try {
                        const html = await ejs.renderFile(
                            path.join(__dirname, "templates/invoiceTemplate.html"),
                            invoiceData
                        );

                        await new Promise((resolve, reject) => {
                            pdf.create(html).toFile(filePath, (err) => {
                                if (err) {
                                    console.error("PDF generation error:", err);
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            });
                        });
                    } catch (error) {
                        console.error("Error generating PDF:", error);
                        return res.status(500).json({ error: "Failed to generate invoice" });
                    }
                }

                // Send the file
                res.download(filePath, `invoice_${invoiceId}.pdf`, (err) => {
                    if (err) {
                        console.error("Download error:", err);
                        if (!res.headersSent) {
                            res.status(500).json({ error: "Download failed" });
                        }
                    }
                });
            }
        );
    } catch (error) {
        console.error("Server error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Server error" });
        }
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Catch-all for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Simple server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('API endpoints:');
    console.log('  POST /api/signup - Register a new user');
    console.log('  POST /api/login - User login');
    console.log('  POST /api/subscribe - Create a subscription');
    console.log('  GET /api/subscriptions - Get all subscriptions');
    console.log('  GET /api/subscription/:service - Get specific subscription');
    console.log('  GET /api/invoices - Get user invoices');
    console.log('  GET /api/download-invoice/:id - Download invoice');
});
