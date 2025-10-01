require('dotenv').config();
const qrcode = require("qrcode-terminal");
const {
  makeWASocket,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");

// ========================================
// BOT CONFIGURATION
// ========================================
const BOT_CONFIG = {
  name: "Team Bot",
  prefix: "!",
  version: "1.0.0",
  author: "Your Name"
};

// ========================================
// BOT MESSAGES
// ========================================
const MESSAGES = {
  welcome: "👋 Welcome to Team Bot!\nType !help for commands",
  help: `🤖 *${BOT_CONFIG.name} Commands:*

!help - Show this help message
!ping - Check if bot is online
!info - Bot information
!time - Current time

*Bot Version:* ${BOT_CONFIG.version}`,
  ping: "🏓 Pong! Bot is online and working!",
  info: `🤖 *Bot Information:*
*Name:* ${BOT_CONFIG.name}
*Version:* ${BOT_CONFIG.version}
*Author:* ${BOT_CONFIG.author}
*Status:* Online ✅`,
  error: "❌ Sorry, something went wrong!",
  unknown: "❓ Unknown command! Type !help for available commands."
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get current time in readable format
 */
function getCurrentTime() {
  return new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Check if message is a command
 */
function isCommand(message) {
  return message.startsWith(BOT_CONFIG.prefix);
}

/**
 * Extract command from message
 */
function getCommand(message) {
  return message.slice(BOT_CONFIG.prefix.length).toLowerCase().trim();
}

/**
 * Send message to chat
 */
async function sendMessage(sock, jid, message) {
  try {
    await sock.sendMessage(jid, { text: message });
    console.log(`📤 Message sent to ${jid}: ${message.substring(0, 50)}...`);
  } catch (error) {
    console.error("❌ Error sending message:", error);
  }
}

/**
 * Process incoming messages
 */
async function processMessage(sock, message) {
  try {
    const { key, message: msg } = message;
    const jid = key.remoteJid;
    const messageText = msg.conversation || msg.extendedTextMessage?.text || "";

    // Skip if message is from bot itself
    if (key.fromMe) return;

    // Skip if message is empty
    if (!messageText) return;

    console.log(`📨 Received: "${messageText}" from ${jid}`);

    // Check if it's a command
    if (isCommand(messageText)) {
      const command = getCommand(messageText);
      
      switch (command) {
        case 'help':
          await sendMessage(sock, jid, MESSAGES.help);
          break;
          
        case 'ping':
          await sendMessage(sock, jid, MESSAGES.ping);
          break;
          
        case 'info':
          await sendMessage(sock, jid, MESSAGES.info);
          break;
          
        case 'time':
          await sendMessage(sock, jid, `🕐 Current time: ${getCurrentTime()}`);
          break;
          
        default:
          await sendMessage(sock, jid, MESSAGES.unknown);
      }
    } else {
      // Handle non-command messages
      if (messageText.toLowerCase().includes('hello') || 
          messageText.toLowerCase().includes('hi') ||
          messageText.toLowerCase().includes('hey')) {
        await sendMessage(sock, jid, MESSAGES.welcome);
      }
    }
    
  } catch (error) {
    console.error("❌ Error processing message:", error);
  }
}

// ========================================
// MAIN BOT FUNCTION
// ========================================
async function startBot() {
  try {
    console.log(`🚀 Starting ${BOT_CONFIG.name} v${BOT_CONFIG.version}...`);
    
    // Initialize auth state
    const { state, saveCreds } = await useMultiFileAuthState("auth_session");
    const { version } = await fetchLatestBaileysVersion();

    // Create WhatsApp socket
    const sock = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false, // We'll handle QR manually
    });

    // Save credentials when updated
    sock.ev.on("creds.update", saveCreds);

    // Handle connection updates
    sock.ev.on("connection.update", (update) => {
      const { connection, qr } = update;

      if (qr) {
        console.log("\n📱 Scan This QR Code Below:\n");
        qrcode.generate(qr, { small: true });
        console.log("\n⏳ Waiting for QR scan...\n");
      }

      if (connection === "open") {
        console.log("✅ WhatsApp Bot Connected Successfully!");
        console.log(`🤖 Bot Name: ${BOT_CONFIG.name}`);
        console.log(`📝 Prefix: ${BOT_CONFIG.prefix}`);
        console.log("💬 Bot is ready to receive messages!\n");
      }

      if (connection === "close") {
        console.log("⚠️  Connection Closed, Reconnecting...");
        setTimeout(() => startBot(), 3000); // Reconnect after 3 seconds
      }
    });

    // Handle incoming messages
    sock.ev.on("messages.upsert", async (m) => {
      const messages = m.messages;
      
      for (const message of messages) {
        await processMessage(sock, message);
      }
    });

    // Handle connection errors
    sock.ev.on("connection.update", (update) => {
      if (update.connection === "close") {
        console.log("❌ Connection lost, attempting to reconnect...");
      }
    });

  } catch (error) {
    console.error("❌ Error starting bot:", error);
    console.log("🔄 Retrying in 5 seconds...");
    setTimeout(() => startBot(), 5000);
  }
}

// ========================================
// START BOT
// ========================================
console.log("🎯 Initializing WhatsApp Team Bot...");
startBot();
