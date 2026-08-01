const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. TELEGRAM BOT CONFIGURATION
// ==========================================
// Token Bot kee BotFather irraa argatte asitti galchi
const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// <--- 2. Telegram Bot Setup Asitti Dabali --->

// Command /start yeroo tuqamu deebii kennu
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'Fayyadamaa';

  bot.sendMessage(
    chatId,
    `Baga nagaa fi gammachuun dhufte, ${firstName}!\n\nTicket bitachuuf App keenya fayyadamaa.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚀 App Banaa",
              web_app: { url: "https://milki-app.onrender.com" } // URL Render keessan isa sirrii
            }
          ]
        ]
      }
    }
  );
});
// <--- Xumura Telegram Bot Setup --->

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 2. DATABASE SETUP (SQLite)
// ==========================================
// Database Setup (Koodii keessan isa kanaan duraa...)
const db = new sqlite3.Database('.database.db', (err) => {
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
// 3. TELEGRAM BOT LOGIC
// ==========================================
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || "Hiriyyaa";

    const welcomeMessage = `
Baga gara bot kenya dhuftan, ${userName}! 🎟️
Welcome to Hunde Lottery System.
እንኳን ወደ ሁንዴ ሎተሪ በደህና መጡ!

Carraa gaarii! Tikitii murachuuf liinkii armaan gadii tuqaa:
    `;

    // Yoo Localhost irra jirtu linkii Ngrok, yoo online host goote URL server kee asitti galchi
    const webAppUrl = 'https://milki-app.onrender.com'; 

    bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🎟️ Open Lottery App", web_app: { url: webAppUrl } }],
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
// 4. API ENDPOINTS (Backend Routes)
// ==========================================
// Admin Login API Route
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  // Password Admin keessanii asitti jijjiiraa (fakkeenyaaf: "admin1234")
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234";

  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, message: "Login successful!" });
  } else {
    res.status(401).json({ success: false, message: "Password dogoggoraa ta'e!" });
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