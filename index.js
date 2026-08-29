const express = require('express');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Render ke health check ke liye web server
app.get('/', (req, res) => {
  res.send('Telegram Bot is running 24/7!');
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

// Bot Configuration
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
    console.log('✅ Telegram Notification Bhej Di!');
  } catch (error) {
    console.error('❌ Notification Error:', error.message);
  }
}

async function checkNewDrama() {
  try {
    const response = await axios.get(JSON_URL);
    const items = response.data.content || response.data.data || response.data || [];

    if (!Array.isArray(items)) {
      console.log('⚠️ Data Format Match Nahi Hua.');
      return;
    }

    // Baseline IDs (First Run)
    if (knownDramaIds.size === 0) {
      items.forEach(item => {
        if (item.id) knownDramaIds.add(item.id);
      });
      console.log(`[${new Date().toLocaleTimeString()}] Monitoring Started. Initial Count: ${knownDramaIds.size}`);
      return;
    }

    // New Drama Detection
    const newDramas = items.filter(item => item.id && !knownDramaIds.has(item.id));

    if (newDramas.length > 0) {
      for (const drama of newDramas) {
        const dramaTitle = drama.title || drama.name || drama.showName || 'Naya Drama';
        const dramaId = drama.id;

        const message = `🎬 *Naya Drama Add Hua!*\n\n📌 *Title:* ${dramaTitle}\n🆔 *ID:* ${dramaId}\n⏰ *Time:* ${new Date().toLocaleString('en-IN')}`;
        
        await sendTelegramNotification(message);
        knownDramaIds.add(dramaId);
      }
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Checked: No new drama.`);
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] Fetch Error:`, error.message);
  }
}

// Har 1 minute me Automatically Check Karega
cron.schedule('*/1 * * * *', () => {
  checkNewDrama();
});

// App Start hote hi first run
checkNewDrama();
