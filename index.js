const express = require('express');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Render Web Service Health Check
app.get('/', (req, res) => {
  res.send('Telegram Drama Bot is Active 24/7!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Credentials & Target API
const BOT_TOKEN = '8761680491:AAF0AJ3VVnsgVKMXMVJH3FikBK_VCEd2xTg';
const CHAT_ID = '8471422703';
const JSON_URL = 'https://long-dream-ac6b.aaa39269012.workers.dev/?url=https://storytvulimate.ixadrama.in/feedservice/v1/shows/516?page=0&size=10';

// Sabhi dekhe gaye dramas ki IDs memory me store rahegi
let knownDramaIds = new Set();

// Telegram Notification Function
async function sendTelegramNotification(message) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });
    console.log('✅ Telegram Notification Sent!');
  } catch (error) {
    console.error('❌ Notification Error:', error.message);
  }
}

// Main Checker Function
async function checkNewDrama() {
  try {
    const response = await axios.get(JSON_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    // Exact path extraction matching your JSON: data.content
    const items = response.data && response.data.data && response.data.data.content 
      ? response.data.data.content 
      : (response.data && response.data.content ? response.data.content : []);

    if (!Array.isArray(items) || items.length === 0) {
      console.log('⚠️ Data Format Match Nahi Hua ya Array Khali Hai.');
      return;
    }

    // Baseline Set (First Run - Initial IDs save karega)
    if (knownDramaIds.size === 0) {
      items.forEach(item => {
        if (item.id) knownDramaIds.add(String(item.id));
      });
      console.log(`[${new Date().toLocaleTimeString()}] Monitoring Started. Total Initial Dramas: ${knownDramaIds.size}`);
      return;
    }

    // Unn sabhi dramas ko filter karein jo pehle save nahi hue hain
    const newDramas = items.filter(item => item.id && !knownDramaIds.has(String(item.id)));

    // Agar 1 ya 1 se zyada jitne bhi naye dramas add hue hain
    if (newDramas.length > 0) {
      let messageText = `🎬 *${newDramas.length} Naye Drama Add Hue!*\n\n`;

      for (const drama of newDramas) {
        const dramaTitle = drama.title || 'Naya Drama';
        const dramaId = drama.id;

        messageText += `📌 *Title:* ${dramaTitle}\n🆔 *ID:* ${dramaId}\n---------------------------\n`;
        
        // Naye drama ki ID permanent memory me save kar lein
        knownDramaIds.add(String(dramaId));
      }

      messageText += `⏰ *Time:* ${new Date().toLocaleString('en-IN')}`;
      
      // Single formatted message for all new dramas
      await sendTelegramNotification(messageText);
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Checked: No new drama.`);
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] Fetch Error:`, error.message);
  }
}

// Every 1 minute automated execution
cron.schedule('*/1 * * * *', () => {
  checkNewDrama();
});

// Immediately run on start
checkNewDrama();
