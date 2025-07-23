require('dotenv').config({ path: './config.env' });
const express = require('express');
const bodyParser = require('body-parser');

// Fix for CommonJS: dynamic import of fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.use(bodyParser.json());

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

// ✅ Messenger Message Handler (user sends message to bot)
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    body.entry.forEach(entry => {
      const event = entry.messaging[0];
      const senderId = event.sender.id;

      if (event.message && event.message.text) {
        console.log(`📨 Message from ${senderId}: ${event.message.text}`);
        sendTextMessage(senderId, `✅ Your PSID is: ${senderId}`);
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

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Webhook server running on port ${PORT}`));
