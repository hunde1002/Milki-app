require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
    console.error("ERROR: BOT_TOKEN Environment Variable keessatti hin argamne!");
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://milki-app.onrender.com';

// Multi-language Auto Detection & Welcome Message
bot.onText(/\/start(.*)/, (msg, match) => {
    const chatId = msg.chat.id;
    const langCode = msg.from.language_code; // Automatic Language Detect (e.g., 'am', 'en', 'om')
    const userName = msg.from.first_name || "User";
    const refPayload = match[1] ? match[1].trim() : null;

    let welcomeMsg = "";

    // Afaan telegram user-a irraatti hundaa'ee automatic fida
    if (langCode === 'am') {
        welcomeMsg = `እንኳን ወደ ሁንዴ ሎተሪ በደህና መጡ, ${userName}! 🎟️\n\nBaga gara Hunde Lottery System dhuftan!\nWelcome to Hunde Lottery System!`;
    } else if (langCode === 'om') {
        welcomeMsg = `Baga gara Hunde Lottery System dhuftan, ${userName}! 🎟️\n\nWelcome to Hunde Lottery System!\nእንኳን ወደ ሁንዴ ሎተሪ በደህና መጡ!`;
    } else {
        welcomeMsg = `Welcome to Hunde Lottery System, ${userName}! 🎟️\n\nBaga gara bot keenya dhuftan!\nእንኳን ወደ ሁንዴ ሎተሪ በደህና መጡ!`;
    }

    if (refPayload) {
        welcomeMsg += `\n\n🎁 *Referral Bonus:* Affeerraa liinkii id: ${refPayload} irraa dhuftan!`;
    }

    bot.sendMessage(chatId, welcomeMsg, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: "🎟️ Open Lottery App / Appii Bani", web_app: { url: WEB_APP_URL } }],
                [{ text: "👥 Hiriyyaa Affeeru (Referral Link)", callback_data: `ref_${chatId}` }],
                [{ text: "💬 Support / Qunnamtii", callback_data: 'support' }]
            ]
        }
    });
});

// Callback Query Handler (Referral & Support)
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    if (query.data.startsWith('ref_')) {
        const refLink = `https://t.me/${query.message.from.username || 'Bot'}?start=${chatId}`;
        bot.sendMessage(chatId, `🔗 *Liinkii Affeerraa Kee (Referral Link):*\n${refLink}\n\nHiriyoota kee afeeruun carraa dachaatti guddifadhu!`, { parse_mode: 'Markdown' });
    } else if (query.data === 'support') {
        bot.sendMessage(chatId, `💬 Qunnamtii Deeggarsa Kallatti (Direct Support):\nAdmin: Hunde Tesfaye Jule\nPhone: 0910020814`);
    }
    bot.answerCallbackQuery(query.id);
});

console.log('Telegram Bot security, multi-lang & referral system running...');
module.exports = bot;