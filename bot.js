const TelegramBot = require('node-telegram-bot-api');

// Token Bot kee asitti galchi (BotFather irraa kan argattu)
const TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN_HERE';
const bot = new TelegramBot(TOKEN, { polling: true });

// Yeroo user-i /start jedhu
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || "Hiriyyaa";

    const welcomeMessage = `
Baga gara bot kenya dhuftan, ${userName}! 🎟️
Welcome to Hunde Lottery System.
እንኳን ወደ ሁንዴ ሎተሪ በደህና መጡ!

Carraa gaarii! Tikitii murachuuf liinkii armaan gadii tuqaa:
    `;

    const webAppUrl = 'https://thin-planes-drop.loca.it'; // Web App URL kee asitti galchi

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
});

console.log('Telegram Bot is running...');