const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. MIDDLEWARES & STATIC FILES
// ==========================================
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// 2. TELEGRAM BOT CONFIGURATION
// ==========================================
const TOKEN = process.env.BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN_HERE';
const bot = new TelegramBot(TOKEN, { polling: true });
const WEB_APP_URL = 'https://milki-app.onrender.com';

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || "Hiriyyaa";

    const welcomeMessage = `
Baga gara bot keenya dhuftan, ${userName}! 🎟️
Welcome to Hunde Lottery System.
እንኳን ወደ ሁንዴ ሎተሪ በደህና መጡ!

Carraa gaarii! Tikitii murachuuf liinkii armaan gadii tuqaa:
    `;

    bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🎟️ Open Lottery App", web_app: { url: WEB_APP_URL } }],
                [{ text: "👥 Hiriyyaa Affeeru (Referral)", callback_data: 'referral' }]
            ]
        }
    });
});

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    if (query.data === 'referral') {
        bot.sendMessage(chatId, `🔗 Linkii affeerraa kee: https://t.me/YourBotName?start=ref_${chatId}\nHiriyoota kee afeeriitii carraa dachaaa argadhu!`);
    }
    bot.answerCallbackQuery(query.id);
});

// ==========================================
// 3. DATABASE SETUP (SQLite)
// ==========================================
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Database opening error: ', err.message);
    } else { 
        console.log('Connected to SQLite Database successfully.');
    }
});

// Create Required Tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_price INTEGER DEFAULT 200,
        max_tickets INTEGER DEFAULT 50,
        prize_1st INTEGER DEFAULT 6000,
        prize_2nd INTEGER DEFAULT 2000,
        end_date TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        username TEXT,
        fullname TEXT,
        phone TEXT,
        ticket_numbers TEXT,
        payment_method TEXT,
        screenshot TEXT,
        status TEXT DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS winners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        winner_name TEXT,
        prize_title TEXT,
        photo_url TEXT,
        announced_date TEXT
    )`);

    // Insert default settings if empty
    db.get("SELECT COUNT(*) as count FROM settings", (err, row) => {
        if (row && row.count === 0) {
            const defaultDate = new Date(Date.now() + 86400000 * 3).toISOString();
            db.run(`INSERT INTO settings (ticket_price, max_tickets, prize_1st, prize_2nd, end_date) VALUES (200, 50, 6000, 2000, ?)`, [defaultDate]);
        }
    });
});

// ==========================================
// 4. API ENDPOINTS (Backend Routes)
// ==========================================

// Admin Login API Route
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password123";

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        return res.status(200).json({ success: true, message: "Akkamitti nagaatti seente, Admin!" });
    } else {
        return res.status(401).json({ success: false, message: "Username ykn Password dogoggoraa!" });
    }
});

// Get Settings
app.get('/api/settings', (req, res) => {
    db.get("SELECT * FROM settings ORDER BY id DESC LIMIT 1", (err, row) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(row);
    });
});

// Update Settings (Admin)
app.post('/api/settings', (req, res) => {
    const { ticket_price, max_tickets, prize_1st, prize_2nd, end_date } = req.body;
    db.run(`UPDATE settings SET ticket_price = ?, max_tickets = ?, prize_1st = ?, prize_2nd = ?, end_date = ? WHERE id = 1`,
        [ticket_price, max_tickets, prize_1st, prize_2nd, end_date], function(err) {
            if (err) res.status(500).json({ error: err.message });
            else res.json({ success: true });
        });
});

// Get All Tickets
app.get('/api/tickets', (req, res) => {
    db.all("SELECT * FROM tickets ORDER BY id DESC", (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

// Create New Ticket Purchase
app.post('/api/tickets', (req, res) => {
    const { user_id, username, fullname, phone, ticket_numbers, payment_method, screenshot } = req.body;
    db.run(`INSERT INTO tickets (user_id, username, fullname, phone, ticket_numbers, payment_method, screenshot) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user_id, username, fullname, phone, ticket_numbers, payment_method, screenshot], function(err) {
            if (err) res.status(500).json({ error: err.message });
            else res.json({ success: true, ticketId: this.lastID });
        });
});

// Update Ticket Status (Approve/Reject by Admin)
app.post('/api/tickets/status', (req, res) => {
    const { id, status } = req.body;
    db.run(`UPDATE tickets SET status = ? WHERE id = ?`, [status, id], function(err) {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ success: true });
    });
});

// Get Winners
app.get('/api/winners', (req, res) => {
    db.all("SELECT * FROM winners ORDER BY id DESC", (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

// Add Winner (Admin)
app.post('/api/winners', (req, res) => {
    const { winner_name, prize_title, photo_url } = req.body;
    db.run(`INSERT INTO winners (winner_name, prize_title, photo_url, announced_date) VALUES (?, ?, ?, datetime('now'))`,
        [winner_name, prize_title, photo_url], function(err) {
            if (err) res.status(500).json({ error: err.message });
            else res.json({ success: true });
        });
});

// ==========================================
// 5. START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`Server and Telegram Bot are running smoothly on port ${PORT}`);
});
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// 🛑 SECURITY & ANTI-HACKER RATE LIMITING (Spam Dhowwuuf)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Daqiiqaa 15
    max: 100, // IP tokko irraa request 100 qofa
    message: { success: false, message: "Request baay'ee ergitaniirtu! Maaloo daqiiqaa 15 booda deebi'aa yaalaa." }
});
app.use('/api/', limiter);

// Database Fake Storage (Production irratti MongoDB/PostgreSQL fayyadamta)
let tickets = [];
let settings = {
    ticket_price: 200,
    max_tickets: 50,
    prize_1st: 6000,
    prize_2nd: 2000,
    admin_name: "Hunde Tesfaye Jule",
    cbe_acc: "1000512022433",
    telebirr_acc: "0910020814",
    end_date: new Date(Date.now() + 86400000 * 3).toISOString() // Guyyaa 3 dabalata
};

let winners = [
    { name: "Abebe K.", ticket: "12", prize: "6000 ETB", date: "2026-07-20" },
    { name: "Chala T.", ticket: "05", prize: "2000 ETB", date: "2026-07-20" }
];

// --- ROUTES --- //
app.get('/api/settings', (req, res) => res.json(settings));
app.get('/api/tickets', (req, res) => res.json(tickets));
app.get('/api/winners', (req, res) => res.json(winners));

// Ticket Bituu API
app.post('/api/tickets', (req, res) => {
    const { user_id, username, fullname, phone, ticket_numbers, payment_method, screenshot } = req.body;
    
    if (!fullname || !phone || !ticket_numbers || !screenshot) {
        return res.status(400).json({ success: false, message: "Maaloo odeeffannoo guutuu galchaa!" });
    }

    const newTicket = {
        id: tickets.length + 1,
        user_id,
        username,
        fullname,
        phone,
        ticket_numbers,
        payment_method,
        screenshot,
        status: 'Pending', // Admin approval eega
        created_at: new Date()
    };

    tickets.push(newTicket);
    res.json({ success: true, message: "Tikettiin keessan milkaa'inaan ergameera. Approval Admin eegaa jira!", ticket: newTicket });
});

// Admin Approval API
app.post('/api/tickets/status', (req, res) => {
    const { id, status } = req.body;
    const ticket = tickets.find(t => t.id === id);
    if (ticket) {
        ticket.status = status;
        res.json({ success: true, message: `Ticket #${id} status ${status}-tti jijjiirameera.` });
    } else {
        res.status(404).json({ success: false, message: "Ticket hin argamne." });
    }
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'password123';

    if (username === adminUser && password === adminPass) {
        res.json({ success: true, message: "Seensii Milkaa'inaa!" });
    } else {
        res.status(401).json({ success: false, message: "Username ykn Password Dogoggoraa!" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running smoothly on port ${PORT}...`));