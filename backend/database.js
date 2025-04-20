const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

// Ensure the data directory exists
const dbDir = path.join(__dirname, "data");
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "data.db");

// Delete existing database if it exists
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening database:", err);
    } else {
        console.log("Connected to SQLite database");
    }
});

db.serialize(() => {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        );
    `, (err) => {
        if (err) console.error("Error creating users table:", err);
        else console.log("Users table created successfully");
    });

    // Subscriptions table
    db.run(`
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            service TEXT NOT NULL,
            plan TEXT,
            amount REAL,
            status TEXT DEFAULT 'active',
            start_date TEXT,
            renew_date TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `, (err) => {
        if (err) console.error("Error creating subscriptions table:", err);
        else console.log("Subscriptions table created successfully");
    });

    // Payments table
    db.run(`
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            service TEXT,
            plan TEXT,
            amount REAL,
            paid_on TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `, (err) => {
        if (err) console.error("Error creating payments table:", err);
        else console.log("Payments table created successfully");
    });
});

module.exports = db;
