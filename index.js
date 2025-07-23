require('dotenv').config({ path: './config.env' });
const express = require('express');
const bodyParser = require('body-parser');

// Fix for CommonJS: dynamic import of fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.use(bodyParser.json());

// ✅ Your Facebook PSID (replace with your actual PSID)
const myPSID = '25030317586569371'; // 👈 Replace this if needed

// 📌 GitHub repo to monitor
const repoFullName = 'Arthritisboy/3Y2AAPWD';
let lastKnownSha = null;

// ✅ Facebook Webhook Verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ✅ Messenger Message Handler
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    body.entry.forEach(entry => {
      const event = entry.messaging[0];
      const senderId = event.sender.id;

      if (event.message && event.message.text) {
        console.log(`📨 Message from ${senderId}: ${event.message.text}`);
        sendTextMessage(senderId, '✅ You are subscribed to GitHub commit updates!');
      }
    });

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// ✅ Send a message via Messenger API
function sendTextMessage(psid, messageText) {
  const body = {
    recipient: { id: psid },
    message: { text: messageText }
  };

  fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
    .then(res => res.json())
    .then(data => console.log('✅ Message sent:', data))
    .catch(err => console.error('❌ Error sending message:', err));
}

// ✅ GitHub commit polling logic with logging
setInterval(() => {
  console.log('🔄 Checking for new commits...');

  fetch(`https://api.github.com/repos/${repoFullName}/commits`)
    .then(res => res.json())
    .then(commits => {
      if (Array.isArray(commits) && commits.length > 0) {
        const latest = commits[0];
        const latestSha = latest.sha;

        console.log(`🧩 Latest SHA: ${latestSha}`);
        if (lastKnownSha) {
          console.log(`📌 Last known SHA: ${lastKnownSha}`);
        }

        if (lastKnownSha && latestSha !== lastKnownSha) {
          const commitMsg = latest.commit.message;
          const url = latest.html_url;
          const message = `🆕 New commit in ${repoFullName}:\n"${commitMsg}"\n🔗 ${url}`;

          console.log('📢 New commit detected! Sending message...');
          sendTextMessage(myPSID, message);
        } else {
          console.log('✅ No new commits.');
        }

        lastKnownSha = latestSha;
      } else {
        console.warn('⚠️ Unexpected response from GitHub API:', commits);
      }
    })
    .catch(err => {
      console.error(`❌ Failed to fetch commits from ${repoFullName}`, err);
    });
}, 60 * 1000); // every 60 seconds


// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Webhook server running on port ${PORT}`));
