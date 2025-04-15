const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const pdf = require("html-pdf");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const db = require("./database");

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("../public"));

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

// Signup endpoint
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

// Login endpoint
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: "Database error" });
            }
            if (!user) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                token,
                name: user.name,
                message: "Login successful"
            });
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Simulated subscription + payment
app.post("/subscribe", verifyToken, (req, res) => {
    console.log("Subscription request received:", req.body);
    const { plan, amount } = req.body;
    const user_id = req.user.id;
    
    console.log("User ID:", user_id);
    console.log("Plan:", plan);
    console.log("Amount:", amount);
    
    if (!plan || !amount) {
        console.log("Missing plan or amount");
        return res.status(400).json({ error: "Plan and amount are required" });
    }

    const now = new Date();
    const start_date = now.toISOString();
    const renew_date = new Date(now.setMonth(now.getMonth() + 1)).toISOString();

    console.log("Creating subscription...");
    db.run(
        `INSERT INTO subscriptions (user_id, plan, amount, start_date, renew_date)
         VALUES (?, ?, ?, ?, ?)`,
        [user_id, plan, amount, start_date, renew_date],
        function (err) {
            if (err) {
                console.error("Subscription error:", err);
                return res.status(500).json({ error: "Subscription failed" });
            }

            console.log("Subscription created, creating payment...");
            db.run(
                `INSERT INTO payments (user_id, plan, amount, paid_on)
                 VALUES (?, ?, ?, ?)`,
                [user_id, plan, amount, start_date],
                function (err2) {
                    if (err2) {
                        console.error("Payment error:", err2);
                        return res.status(500).json({ error: "Payment failed" });
                    }

                    console.log("Payment created, generating invoice...");
                    generateInvoice(this.lastID, res);
                }
            );
        }
    );
});

// Generate invoice
function generateInvoice(paymentId, res) {
  db.get("SELECT * FROM payments WHERE id = ?", [paymentId], (err, payment) => {
    if (err || !payment) return res.status(500).send({ error: "Payment not found" });

    db.get("SELECT name, email FROM users WHERE id = ?", [payment.user_id], (err, user) => {
      const user_name = user?.name || "Demo User";
      const email = user?.email || "demo@example.com";

      ejs.renderFile(
        path.join(__dirname, "templates/invoiceTemplate.html"),
        {
          user_name,
          email,
          plan: payment.plan,
          amount: payment.amount,
          payment_date: payment.paid_on,
          status: "Paid"
        },
        (err, html) => {
          if (err) return res.status(500).send({ error: "Template failed" });

          const filePath = path.join(__dirname, `invoice_${paymentId}.pdf`);
          pdf.create(html).toFile(filePath, (err) => {
            if (err) return res.status(500).send({ error: "PDF generation failed" });

            // Optional: Send via email
            //sendEmail(email, filePath);

            res.send({
              message: "Invoice created successfully!",
              invoice_id: paymentId
            });
          });
        }
      );
    });
  });
}

// List past invoices
app.get("/invoices", verifyToken, (req, res) => {
    const user_id = req.user.id;
    db.all("SELECT * FROM payments WHERE user_id = ?", [user_id], (err, rows) => {
        if (err) {
            console.error("Invoices error:", err);
            return res.status(500).json({ error: "Could not fetch invoices" });
        }
        res.json(rows);
    });
});

// Download invoice PDF
app.get("/download-invoice/:id", (req, res) => {
  const filePath = path.join(__dirname, `invoice_${req.params.id}.pdf`);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send("Invoice not found.");
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
