require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const TelegramBot = require('node-telegram-bot-api').TelegramBot || require('node-telegram-bot-api');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Proxy for Express Rate Limit (Render Proxy Support)
app.set('trust proxy', 1);

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

// Anti-Spam Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: "Request baay'ee ergitaniirtu! Maaloo daqiiqaa 15 booda deebi'aa yaalaa." }
});
app.use('/api/', limiter);

// ==========================================
// 3. MULTER STORAGE SETUP
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
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Root Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// 4. TELEGRAM BOT CONFIGURATION
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
}

// ==========================================
// 5. POSTGRESQL DATABASE SETUP (PERSISTENT)
// ==========================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to PostgreSQL database:', err.stack);
    } else {
        console.log('Connected to PostgreSQL Database successfully!');
        release();
    }
});

// Initialize Tables
const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                ticket_price INT DEFAULT 200,
                max_tickets INT DEFAULT 50,
                prize_1st INT DEFAULT 6000,
                prize_2nd INT DEFAULT 2000,
                admin_name VARCHAR(100) DEFAULT 'Hunde Tesfaye Jule',
                cbe_acc VARCHAR(50) DEFAULT '1000512022433',
                telebirr_acc VARCHAR(50) DEFAULT '0910020814',
                end_date VARCHAR(100)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(100),
                username VARCHAR(100),
                fullname VARCHAR(100),
                phone VARCHAR(50),
                ticket_numbers TEXT,
                payment_method VARCHAR(50),
                screenshot TEXT,
                status VARCHAR(50) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS winners (
                id SERIAL PRIMARY KEY,
                winner_name VARCHAR(100),
                prize_title VARCHAR(100),
                photo_url TEXT,
                announced_date VARCHAR(100)
            );
        `);

        const res = await pool.query("SELECT COUNT(*) FROM settings");
        if (parseInt(res.rows[0].count) === 0) {
            const defaultDate = new Date(Date.now() + 86400000 * 3).toISOString();
            await pool.query(`
                INSERT INTO settings (ticket_price, max_tickets, prize_1st, prize_2nd, admin_name, cbe_acc, telebirr_acc, end_date)
                VALUES (200, 50, 6000, 2000, 'Hunde Tesfaye Jule', '1000512022433', '0910020814', $1)
            `, [defaultDate]);
        }
    } catch (err) {
        console.error("DB Initialization Error:", err);
    }
};

initDb();

// ==========================================
// 6. API ENDPOINTS
// ==========================================
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
app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM settings ORDER BY id DESC LIMIT 1");
        return res.json(result.rows[0] || {});
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Update Settings
app.post('/api/settings', async (req, res) => {
    const { ticket_price, max_tickets, prize_1st, prize_2nd, end_date } = req.body;
    try {
        await pool.query(
            `UPDATE settings SET ticket_price = $1, max_tickets = $2, prize_1st = $3, prize_2nd = $4, end_date = $5 WHERE id = 1`,
            [ticket_price, max_tickets, prize_1st, prize_2nd, end_date]
        );
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Get All Tickets
app.get('/api/tickets', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM tickets ORDER BY id DESC");
        return res.json(result.rows || []);
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// CREATE NEW TICKET PURCHASE
const handleTicketPurchase = async (req, res) => {
    try {
        const { user_id, username, fullname, phone, ticket_numbers, payment_method } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Screenshot-n ol hin fe'amne! Maaloo screenshot itti dabalii yaali." });
        }

        const screenshotPath = req.file.path;

        const result = await pool.query(
            `INSERT INTO tickets (user_id, username, fullname, phone, ticket_numbers, payment_method, screenshot) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [user_id || '', username || '', fullname || '', phone || '', ticket_numbers || '', payment_method || '', screenshotPath]
        );

        return res.json({ 
            success: true, 
            message: "Tikettiin keessan milkaa'inaan ergameera. Approval Admin eegaa jira!", 
            ticketId: result.rows[0].id 
        });
    } catch (error) {
        console.error("Error upload ticket:", error);
        return res.status(500).json({ success: false, message: "Server error uumameera: " + error.message });
    }
};

app.post('/api/tickets', upload.single('screenshot'), handleTicketPurchase);
app.post('/api/buy-ticket', upload.single('screenshot'), handleTicketPurchase);

// Update Ticket Status
app.post('/api/tickets/status', async (req, res) => {
    const { id, status } = req.body;
    try {
        await pool.query(`UPDATE tickets SET status = $1 WHERE id = $2`, [status, id]);
        return res.json({ success: true, message: `Ticket #${id} status ${status}-tti jijjiirameera.` });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Get Winners
app.get('/api/winners', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM winners ORDER BY id DESC");
        return res.json(result.rows || []);
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Add Winner
app.post('/api/winners', async (req, res) => {
    const { winner_name, prize_title, photo_url } = req.body;
    try {
        await pool.query(
            `INSERT INTO winners (winner_name, prize_title, photo_url, announced_date) VALUES ($1, $2, $3, NOW())`,
            [winner_name, prize_title, photo_url]
        );
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 7. START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`Server and Telegram Bot are running smoothly on port ${PORT}`);
});