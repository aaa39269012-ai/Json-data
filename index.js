const express = require('express');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Render Web Service Ke Liye Live Route
app.get('/', (req, res) => {
  res.send('Telegram Drama Bot is Live and Active 24/7!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Bot Aur API Credentials
const BOT_TOKEN = '8761680491:AAF0AJ3VVnsgVKMXMVJH3FikBK_VCEd2xTg';
const CHAT_ID = '8471422703';
const JSON_URL = 'https://long-dream-ac6b.aaa39269012.workers.dev/?url=https://storytvulimate.ixadrama.in/feedservice/v1/shows/516?page=0&size=10';

let knownDramaIds = new Set();

// Telegram Notification Handler
async function sendTelegramNotification(message) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });
    console.log('✅ Telegram Notification Bhej Di!');
  } catch (error) {
    console.error('❌ Notification Error:', error.message);
  }
}

// Main Logic: Check For New Dramas
async function checkNewDrama() {
  try {
    const response = await axios.get(JSON_URL);
    let resData = response.data;

    // String JSON Response Handle Karein
    if (typeof resData === 'string') {
      try { resData = JSON.parse(resData); } catch (e) {}
    }

    // Dynamic Array Detection
    let items = [];
    if (Array.isArray(resData)) {
      items = resData;
    } else if (resData && Array.isArray(resData.content)) {
      items = resData.content;
    } else if (resData && Array.isArray(resData.data)) {
      items = resData.data;
    } else if (resData && Array.isArray(resData.shows)) {
      items = resData.shows;
    } else if (resData && Array.isArray(resData.items)) {
      items = resData.items;
    } else if (resData && typeof resData === 'object') {
      items = Object.values(resData).find(val => Array.isArray(val)) || [];
    }

    if (!items || items.length === 0) {
      console.log('⚠️ Data Format Match Nahi Hua ya Array Khali Hai.');
      return;
    }

    // First Run: Baseline Set Karein
    if (knownDramaIds.size === 0) {
      items.forEach(item => {
        const id = item.id || item.showId || item._id;
        if (id) knownDramaIds.add(String(id));
      });
      console.log(`[${new Date().toLocaleTimeString()}] Monitoring Started. Initial Dramas Count: ${knownDramaIds.size}`);
      return;
    }

    // Naye Dramas Filter Karein
    const newDramas = items.filter(item => {
      const id = item.id || item.showId || item._id;
      return id && !knownDramaIds.has(String(id));
    });

    if (newDramas.length > 0) {
      for (const drama of newDramas) {
        const dramaTitle = drama.title || drama.name || drama.showName || drama.caption || 'Naya Drama';
        const dramaId = drama.id || drama.showId || drama._id;

        const message = `🎬 *Naya Drama Add Hua!*\n\n📌 *Title:* ${dramaTitle}\n🆔 *ID:* ${dramaId}\n⏰ *Time:* ${new Date().toLocaleString('en-IN')}`;
        
        await sendTelegramNotification(message);
        knownDramaIds.add(String(dramaId));
      }
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Checked: Koi Naya Drama Nahi Mila.`);
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] Fetch Error:`, error.message);
  }
}

// Har 1 minute mein automated check
cron.schedule('*/1 * * * *', () => {
  checkNewDrama();
});

// Immediate first check
checkNewDrama();
