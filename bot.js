// Local irratti .env file akka dubbisuuf
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');

// Token Render irraa ykn .env irraa dubbisa
const TOKEN = process.env.BOT_TOKEN;

if (!TOKEN) {
    console.error("ERROR: BOT_TOKEN hin argamne! Render ykn .env irra galchuu kee mirkaneeffadhu.");
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
const WEB_APP_URL = 'https://milki-app.onrender.com';

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || "Hiriyyaa";

    const welcomeMessage = `Baga gara bot keenya dhuftan, ${userName}! 🎟️`;

    bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🎟️ Open Lottery App", web_app: { url: WEB_APP_URL } }]
            ]
        }
    });
});

console.log('Telegram Bot is running smoothly using environment variable...');