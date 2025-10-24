const { cmd } = require('../command');
const os = require("os");
const moment = require("moment-timezone");
const { runtime } = require('../lib/functions');
const config = require('../config');

cmd({
    pattern: "alive",
    alias: ["mega", "live"],
    desc: "Check bot is alive or not",
    category: "main",
    react: ["🤍", "🌟", "🗿", "🥋", "💫", "☠", "🤍"][Math.floor(Math.random() * 7)],
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        const time = moment().tz("Asia/Karachi").format("HH:mm:ss");
        const date = moment().tz("Asia/Karachi").format("DD/MM/YYYY");

        // 🔥 Direct link image instead of local file
        const imageUrl = "https://files.catbox.moe/6ovtv3.jpg";

        const caption = 
`╭──────〔 *ALIVE STATUS* 〕─◉
│ *Online & Running!*
│👤 *Dev: Qadeer_Khan*
│📦 *Version:* 4.0.0
│📍 *Prefix:* [${config.PREFIX}]
│🖥️ *Host:* ${os.hostname()}
│🕐 *Uptime:* ${runtime(process.uptime())}
│📅 *Date:* ${date}
│⏰ *Time:* ${time}
╰────────────────────◉
> *𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 𝚀𝙰𝙳𝙴𝙴𝚁 𝙺𝙷𝙰𝙽*`;

        await conn.sendMessage(from, {
            image: { url: imageUrl }, // ✅ Using direct link here
            caption,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363345872435489@newsletter',
                    newsletterName: '𝐐𝐀𝐃𝐄𝐄𝐑-𝐀𝐈',
                    serverMessageId: 143
                },
                externalAdReply: {
                    showAdAttribution: true,
                    title: "𝐐𝐀𝐃𝐄𝐄𝐑-𝐀𝐈",
                    body: "𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 𝚀𝙰𝙳𝙴𝙴𝚁 𝙺𝙷𝙰𝙽",
                    mediaType: 1,
                    previewType: "PHOTO",
                    thumbnailUrl: "https://files.catbox.moe/6ovtv3.jpg", // optional thumbnail
                    sourceUrl: "https://wa.me/" + config.OWNER_NUMBER
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.error("❌ Alive Error:", e);
        reply(`❌ Une erreur est survenue : ${e.message}`);
    }
});