require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { TelegramBot } = require('node-telegram-bot-api');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. FOLDER UPLOADS CHECK / CREATE
// ==========================================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("Folder 'uploads' haaraa uumameera!");
}

// ==========================================
// 2. MIDDLEWARES, SECURITY & STATIC FILES
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Static Files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Anti-Spam Rate Limiting (API Security)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Daqiiqaa 15
    max: 100, // IP tokko irraa Request 100 qofa
    message: { success: false, message: "Request baay'ee ergitaniirtu! Maaloo daqiiqaa 15 booda deebi'aa yaalaa." }
});
app.use('/api/', limiter);

// ==========================================
// 3. MULTER STORAGE SETUP (SCREENSHOTS)
// ==========================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Limit MB 10
});

// Root Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// 4. TELEGRAM BOT CONFIGURATION (SAFE LAUNCH)
// ==========================================
const TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://milki-app.onrender.com';

if (TOKEN && TOKEN !== 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
    try {
        const bot = new TelegramBot(TOKEN, { polling: true });

        bot.on('polling_error', (error) => {
            console.error(`[Telegram Bot Error]: ${error.message}`);
        });

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
    } catch (err) {
        console.error("Telegram Bot initialization error:", err.message);
    }
} else {
    console.warn("⚠️ BOT_TOKEN process.env keessa hin jiru. Bot-n hin kaane!");
}

// ==========================================
// 5. DATABASE SETUP (SQLite)
// ==========================================
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Database opening error: ', err.message);
    } else { 
        console.log('Connected to SQLite Database successfully.');
    }
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_price INTEGER DEFAULT 200,
        max_tickets INTEGER DEFAULT 50,
        prize_1st INTEGER DEFAULT 6000,
        prize_2nd INTEGER DEFAULT 2000,
        admin_name TEXT DEFAULT 'Hunde Tesfaye Jule',
        cbe_acc TEXT DEFAULT '1000512022433',
        telebirr_acc TEXT DEFAULT '0910020814',
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

    db.get("SELECT COUNT(*) as count FROM settings", (err, row) => {
        if (!err && row && row.count === 0) {
            const defaultDate = new Date(Date.now() + 86400000 * 3).toISOString();
            db.run(`INSERT INTO settings (ticket_price, max_tickets, prize_1st, prize_2nd, admin_name, cbe_acc, telebirr_acc, end_date) 
                    VALUES (200, 50, 6000, 2000, 'Hunde Tesfaye Jule', '1000512022433', '0910020814', ?)`, [defaultDate]);
        }
    });
});

// ==========================================
// 6. API ENDPOINTS (Backend Routes)
// ==========================================

// Admin Login
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
        if (err) return res.status(500).json({ success: false, error: err.message });
        return res.json(row || {});
    });
});

// Update Settings (Admin)
app.post('/api/settings', (req, res) => {
    const { ticket_price, max_tickets, prize_1st, prize_2nd, end_date } = req.body;
    db.run(`UPDATE settings SET ticket_price = ?, max_tickets = ?, prize_1st = ?, prize_2nd = ?, end_date = ? WHERE id = 1`,
        [ticket_price, max_tickets, prize_1st, prize_2nd, end_date], function(err) {
            if (err) return res.status(500).json({ success: false, error: err.message });
            return res.json({ success: true });
        });
});

// Get All Tickets
app.get('/api/tickets', (req, res) => {
    db.all("SELECT * FROM tickets ORDER BY id DESC", (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        return res.json(rows || []);
    });
});

// CREATE NEW TICKET PURCHASE
const handleTicketPurchase = (req, res) => {
    try {
        const { user_id, username, fullname, phone, ticket_numbers, payment_method } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Screenshot-n ol hin fe'amne! Maaloo screenshot itti dabalii yaali." });
        }

        const screenshotPath = req.file.path;

        db.run(`INSERT INTO tickets (user_id, username, fullname, phone, ticket_numbers, payment_method, screenshot) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [user_id || '', username || '', fullname || '', phone || '', ticket_numbers || '', payment_method || '', screenshotPath], function(err) {
                if (err) {
                    console.error("DB Insert Error:", err.message);
                    return res.status(500).json({ success: false, message: "Database Error: " + err.message });
                } else {
                    return res.json({ 
                        success: true, 
                        message: "Tikettiin keessan milkaa'inaan ergameera. Approval Admin eegaa jira!", 
                        ticketId: this.lastID 
                    });
                }
            });
    } catch (error) {
        console.error("Error upload ticket:", error);
        return res.status(500).json({ success: false, message: "Server error uumameera!" });
    }
};

app.post('/api/tickets', upload.single('screenshot'), handleTicketPurchase);
app.post('/api/buy-ticket', upload.single('screenshot'), handleTicketPurchase);

// Update Ticket Status
app.post('/api/tickets/status', (req, res) => {
    const { id, status } = req.body;
    db.run(`UPDATE tickets SET status = ? WHERE id = ?`, [status, id], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        return res.json({ success: true, message: `Ticket #${id} status ${status}-tti jijjiirameera.` });
    });
});

// Get Winners
app.get('/api/winners', (req, res) => {
    db.all("SELECT * FROM winners ORDER BY id DESC", (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        return res.json(rows || []);
    });
});

// Add Winner (Admin)
app.post('/api/winners', (req, res) => {
    const { winner_name, prize_title, photo_url } = req.body;
    db.run(`INSERT INTO winners (winner_name, prize_title, photo_url, announced_date) VALUES (?, ?, ?, datetime('now'))`,
        [winner_name, prize_title, photo_url], function(err) {
            if (err) return res.status(500).json({ success: false, error: err.message });
            return res.json({ success: true });
        });
});

// ==========================================
// 7. START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`Server and Telegram Bot are running smoothly on port ${PORT}`);
});