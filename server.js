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
    max: 200, // Limiter xiqqoo ol kaafameera akka auto-save dafee request hedduu hin blokeessine
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

const userLanguages = {};

if (TOKEN && TOKEN !== 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
    try {
        const bot = new TelegramBot(TOKEN, { polling: true });

        bot.on('polling_error', (error) => {
            console.error(`[Telegram Bot Error]: ${error.message}`);
        });

        bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const userName = msg.from.first_name || "User";

            const selectLangMsg = `
Baga nagaan dhufte ${userName}!
Maaloo afaan fayyadamuu barbaaddu filadhu:
-----------------------------
Welcome ${userName}! Please select your language:
-----------------------------
እንኳን በደህና መጡ ${userName}! እባክዎን ቋንቋ ይምረጡ:
            `;

            bot.sendMessage(chatId, selectLangMsg, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🌳 Afaan Oromoo", callback_data: 'lang_om' },
                            { text: "🇬🇧 English", callback_data: 'lang_en' },
                            { text: "🇪🇹 አማርኛ", callback_data: 'lang_am' }
                        ]
                    ]
                }
            });
        });

        bot.on('callback_query', async (query) => {
            const chatId = query.message.chat.id;
            const data = query.data;
            const queryId = query.id;

            await bot.answerCallbackQuery(queryId);

            if (data.startsWith('lang_')) {
                const selectedLang = data.split('_')[1];
                userLanguages[chatId] = selectedLang;

                let welcomeText = "";
                let btnAppText = "";
                let btnRefText = "";

                if (selectedLang === 'om') {
                    welcomeText = "Baga gara Hunde Lottery System dhuftan! 🎟️\nCarraa gaarii! Tikitii murachuuf liinkii armaan gadii tuqaa:";
                    btnAppText = "🎟️ Lottery App Banadhu";
                    btnRefText = "👥 Hiriyyaa Affeeru";
                } else if (selectedLang === 'am') {
                    welcomeText = "ወደ ሁንዴ ሎተሪ ሲስተም እንኳን በደህና መጡ! 🎟️\nመልካም እድል! ቲኬት ለመቁረጥ ከታች ያለውን ሊንክ ይጫኑ:";
                    btnAppText = "🎟️ ሎተሪ መተግበሪያ ይክፈቱ";
                    btnRefText = "👥 ጓደኛ ይጋብዙ";
                } else {
                    welcomeText = "Welcome to Hunde Lottery System! 🎟️\nGood luck! Click the button below to buy your ticket:";
                    btnAppText = "🎟️ Open Lottery App";
                    btnRefText = "👥 Invite Friends";
                }

                await bot.sendMessage(chatId, welcomeText, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: btnAppText, web_app: { url: `${WEB_APP_URL}?lang=${selectedLang}` } }],
                            [{ text: btnRefText, callback_data: 'referral' }]
                        ]
                    }
                });
            } else if (data === 'referral') {
                const userLang = userLanguages[chatId] || 'om';
                let refMsg = `🔗 Linkii affeerraa kee: https://t.me/YourBotName?start=ref_${chatId}\nHiriyoota kee afeeriitii carraa dachaaa argadhu!`;
                
                if (userLang === 'am') {
                    refMsg = `🔗 የእርስዎ መጋበዣ ሊንክ: https://t.me/YourBotName?start=ref_${chatId}\nጓደኞችዎን ይጋብዙ እና கூடுதல் እድል ያግኙ!`;
                } else if (userLang === 'en') {
                    refMsg = `🔗 Your referral link: https://t.me/YourBotName?start=ref_${chatId}\nInvite friends and double your chances!`;
                }

                await bot.sendMessage(chatId, refMsg);
            }
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
            `UPDATE settings SET ticket_price = $1, max_tickets = $2, prize_1st = $3, prize_2nd = $4, end_date = $5 
             WHERE id = (SELECT id FROM settings ORDER BY id DESC LIMIT 1)`,
            [ticket_price, max_tickets, prize_1st, prize_2nd, end_date]
        );
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// GET ALL TICKETS (FOR USER GRID & ADMIN CONTROL)
app.get('/api/tickets', async (req, res) => {
    try {
        // Tiketoota hunda (Pending, Approved, Reserved) akka dafee fetch godhuu danda'uuf
        const result = await pool.query("SELECT * FROM tickets ORDER BY id DESC");
        return res.json(result.rows || []);
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// AUTO-SAVE / CREATE NEW TICKET PURCHASE (FOOYYA'AA)
const handleTicketPurchase = async (req, res) => {
    try {
        const { user_id, username, fullname, phone, ticket_numbers, payment_method, status } = req.body;

        // Screenshot yoo hin jirre akka hin kufneef path duwwaa godha
        const screenshotPath = req.file ? req.file.path : '';

        // Status yoo ergame (eg: 'Reserved' ykn 'Pending') isa fudhata
        const ticketStatus = status || 'Pending';

        const result = await pool.query(
            `INSERT INTO tickets (user_id, username, fullname, phone, ticket_numbers, payment_method, screenshot, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [user_id || '', username || '', fullname || '', phone || '', ticket_numbers || '', payment_method || '', screenshotPath, ticketStatus]
        );

        // Auto-save milkaa'eera, DB Row guutuu deebisa
        return res.status(200).json({ 
            success: true, 
            message: "Tikettiin milkaa'inaan saavee ta'eera!", 
            ticket: result.rows[0] 
        });
    } catch (error) {
        console.error("Error saving ticket:", error);
        return res.status(500).json({ success: false, message: "Server error uumameera: " + error.message });
    }
};

app.post('/api/tickets', upload.single('screenshot'), handleTicketPurchase);
app.post('/api/buy-ticket', upload.single('screenshot'), handleTicketPurchase);

// UPDATE TICKET STATUS (ADMIN & AUTO APPROVAL)
app.post('/api/tickets/status', async (req, res) => {
    const { id, status } = req.body;
    try {
        const result = await pool.query(`UPDATE tickets SET status = $1 WHERE id = $2 RETURNING *`, [status, id]);
        return res.json({ success: true, message: `Ticket #${id} status ${status}-tti jijjiirameera.`, ticket: result.rows[0] });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Delete Ticket
app.delete('/api/tickets/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(`DELETE FROM tickets WHERE id = $1`, [id]);
        return res.json({ success: true, message: `Ticket #${id} haqameera.` });
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

// Delete Winner
app.delete('/api/winners/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(`DELETE FROM winners WHERE id = $1`, [id]);
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