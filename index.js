require('dotenv').config();
const qrcode = require("qrcode-terminal"); // ✅ QR terminal display
const {
  makeWASocket,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_session");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    version,
    // printQRInTerminal remove kiya kyunke deprecated hai
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;

    if (qr) {
      console.log("\n📱 Scan This QR Code Below:\n");
      qrcode.generate(qr, { small: true }); // ✅ Proper box-style QR
    }

    if (connection === "open") {
      console.log("✅ WhatsApp Bot Connected Successfully!");
    }

    if (connection === "close") {
      console.log("⚠ Connection Closed, Reconnecting...");
      startBot();
    }
  });

  sock.ev.on("messages.upsert", (m) => {
    // Future logic yahan aayega
  });
}

startBot();
