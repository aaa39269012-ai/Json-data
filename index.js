const express = require('express');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Telegram Drama Bot is Active 24/7!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const BOT_TOKEN = '8761680491:AAF0AJ3VVnsgVKMXMVJH3FikBK_VCEd2xTg';
const CHAT_ID = '8471422703';
const JSON_URL = 'https://long-dream-ac6b.aaa39269012.workers.dev/?url=https://storytvulimate.ixadrama.in/feedservice/v1/shows/516?page=0&size=10';

let knownDramaIds = new Set();

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

async function checkNewDrama() {
  try {
    const response = await axios.get(JSON_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    // Aapke JSON Format ke according direct data.content target kiya gaya hai
    const items = response.data && response.data.data && response.data.data.content 
      ? response.data.data.content 
      : (response.data && response.data.content ? response.data.content : []);

    if (!Array.isArray(items) || items.length === 0) {
      console.log('⚠️ Data Format Match Nahi Hua ya Array Khali Hai.');
      return;
    }

    // Baseline Set (First Run)
    if (knownDramaIds.size === 0) {
      items.forEach(item => {
        if (item.id) knownDramaIds.add(String(item.id));
      });
      console.log(`[${new Date().toLocaleTimeString()}] Monitoring Started. Total Initial Dramas: ${knownDramaIds.size}`);
      return;
    }

    // New Drama Check
    const newDramas = items.filter(item => item.id && !knownDramaIds.has(String(item.id)));

    if (newDramas.length > 0) {
      for (const drama of newDramas) {
        const dramaTitle = drama.title || 'Naya Drama';
        const dramaId = drama.id;

        const message = `🎬 *Naya Drama Add Hua!*\n\n📌 *Title:* ${dramaTitle}\n🆔 *ID:* ${dramaId}\n⏰ *Time:* ${new Date().toLocaleString('en-IN')}`;
        
        await sendTelegramNotification(message);
        knownDramaIds.add(String(dramaId));
      }
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Checked: No new drama.`);
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] Fetch Error:`, error.message);
  }
}

// Every 1 minute check
cron.schedule('*/1 * * * *', () => {
  checkNewDrama();
});

checkNewDrama();
