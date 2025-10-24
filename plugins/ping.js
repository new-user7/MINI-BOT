const config = require('../config');
const { cmd } = require('../command');
const { runtime } = require('../lib/functions');

const botNameStyles = [
    "𝑸𝑨𝑫𝑬𝑬𝑹-𝑨𝑰",
    "𝚀𝙰𝙳𝙴𝙴𝚁-𝙰𝙸",
    "🆀🅰🅳🅴🅴🆁-🅰🅸",
    "🅀🄰🄳🄴🄴🅁-🄰🄸",
    "ℚ𝔸𝔻𝔼𝔼ℝ-𝔸𝕀",
    "𝑄𝐴𝐷𝐸𝐸𝑅-𝐴𝐼",
    "ⓆⒶⒹⒺⒺⓇ-ⒶⒾ",
    "𝐐𝐀𝐃𝐄𝐄𝐑-𝐀𝐈",
    "ＱＡＤＥＥＲ-ＡＩ",
    "𝓠𝓐𝓓𝓔𝓔𝓡-𝓐𝓘"
];

// Track current style index
let currentStyleIndex = 0;

cmd({
    pattern: "ping2",
    alias: ["speed2", "pong2"],
    use: ".ping2",
    desc: "Check bot's latency and response speed",
    category: "main",
    react: "🌡️",
    filename: __filename
},
async (conn, mek, m, { from, quoted, sender, reply }) => {
    try {
        const start = new Date().getTime();

        const reactionEmojis = ['🔥', '⚡', '🚀', '💨', '🎯', '🎉', '🌟', '💥', '🕐', '🔹'];
        const textEmojis = ['💎', '🏆', '⚡️', '🚀', '🎶', '🌠', '🌀', '🔱', '🛡️', '✨'];

        const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
        let textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];

        // Ensure reaction and text emojis are different
        while (textEmoji === reactionEmoji) {
            textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
        }

        // Send reaction using conn.sendMessage()
        await conn.sendMessage(from, {
            react: { text: textEmoji, key: mek.key }
        });

        const end = new Date().getTime();
        const responseTime = (end - start) / 1000;

        // Get current fancy bot name and rotate for next time
        const fancyBotName = botNameStyles[currentStyleIndex];
        currentStyleIndex = (currentStyleIndex + 1) % botNameStyles.length;

        const text = `> *${fancyBotName} SPEED: ${responseTime.toFixed(2)}ms ${reactionEmoji}*`;

        await conn.sendMessage(from, {
            text,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363299692857279@newsletter',
                    newsletterName: "𝐐𝐀𝐃𝐄𝐄𝐑-𝐀𝐈",
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in ping2 command:", e);
        reply(`An error occurred: ${e.message}`);
    }
});
