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

let knownDramaKeys = new Set();

async function sendTelegramNotification(message) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
      disable_web_page_preview: false
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

    const items = response.data && response.data.data && response.data.data.content 
      ? response.data.data.content 
      : (response.data && response.data.content ? response.data.content : []);

    if (!Array.isArray(items) || items.length === 0) {
      console.log('⚠️ Data Format Match Nahi Hua ya Array Khali Hai.');
      return;
    }

    // Baseline Set (First Run)
    if (knownDramaKeys.size === 0) {
      items.forEach(item => {
        if (item.id && item.title) {
          const uniqueKey = `${item.id}_${item.title.trim()}`;
          knownDramaKeys.add(uniqueKey);
        }
      });
      console.log(`[${new Date().toLocaleTimeString()}] Monitoring Started. Initial Items Tracked: ${knownDramaKeys.size}`);
      return;
    }

    // New Update Filter
    const newDramas = items.filter(item => {
      if (!item.id || !item.title) return false;
      const uniqueKey = `${item.id}_${item.title.trim()}`;
      return !knownDramaKeys.has(uniqueKey);
    });

    if (newDramas.length > 0) {
      let messageText = `🎬 *${newDramas.length} Naye Update / Drama Add Hue!*\n\n`;

      for (const drama of newDramas) {
        const dramaTitle = drama.title || 'Naya Drama';
        const dramaId = drama.id;
        
        // Total Episodes extract
        const totalEpi = drama.totalEpisodes || drama.episodeCount || drama.episodes || drama.total_episodes || 'N/A';
        
        // Episode URL extract
        const epiUrl = drama.episodeUrl || drama.playUrl || drama.url || drama.link || drama.videoUrl || 'N/A';

        const uniqueKey = `${dramaId}_${dramaTitle.trim()}`;

        messageText += `📌 *Title:* ${dramaTitle}\n`;
        messageText += `🆔 *ID:* ${dramaId}\n`;
        messageText += `🔢 *Total Episodes:* ${totalEpi}\n`;
        messageText += `🔗 *Episode Link:* ${epiUrl}\n`;
        messageText += `---------------------------\n`;
        
        knownDramaKeys.add(uniqueKey);
      }

      messageText += `⏰ *Time:* ${new Date().toLocaleString('en-IN')}`;
      
      await sendTelegramNotification(messageText);
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Checked: No new updates.`);
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] Fetch Error:`, error.message);
  }
}

// Every 1 minute automated check
cron.schedule('*/1 * * * *', () => {
  checkNewDrama();
});

checkNewDrama();
