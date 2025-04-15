const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const pdf = require("html-pdf");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const app = express();
const db = require("./database");

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("../public"));

// Simulated subscription + payment
app.post("/subscribe", (req, res) => {
  const { user_id, plan, amount } = req.body;
  const now = new Date();
  const start_date = now.toISOString();
  const renew_date = new Date(now.setMonth(now.getMonth() + 1)).toISOString();

  db.run(
    `INSERT INTO subscriptions (user_id, plan, amount, start_date, renew_date)
     VALUES (?, ?, ?, ?, ?)`,
    [user_id, plan, amount, start_date, renew_date],
    function (err) {
      if (err) return res.status(500).json({ error: "Subscription failed" });

      db.run(
        `INSERT INTO payments (user_id, plan, amount, paid_on)
         VALUES (?, ?, ?, ?)`,
        [user_id, plan, amount, start_date],
        function (err2) {
          if (err2) return res.status(500).json({ error: "Payment failed" });

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
            // sendEmail(email, filePath);

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
app.get("/invoices", (req, res) => {
  const user_id = req.query.user_id;
  db.all("SELECT * FROM payments WHERE user_id = ?", [user_id], (err, rows) => {
    if (err) return res.status(500).send({ error: "Could not fetch invoices" });
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
