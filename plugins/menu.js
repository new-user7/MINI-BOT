const config = require('../config')
const { cmd, commands } = require('../command')
const { runtime } = require('../lib/functions')

// Store category emojis persistently
const categoryEmojis = {}

cmd({
    pattern: "menu",
    alias: ["allmenu", "fullmenu"],
    desc: "Dynamic full menu with sorted categories and stable emojis",
    category: "main",
    react: "✅",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const verifiedReply = {
            key: {
                participant: `0@s.whatsapp.net`,
                fromMe: false,
                remoteJid: "status@broadcast"
            },
            message: {
                extendedTextMessage: {
                    text: "Qadeer-AI Official",
                    contextInfo: {
                        mentionedJid: [],
                        verifiedBizName: "Qadeer-AI"
                    }
                }
            }
        }

        // Emoji pool (20 random emojis)
        const emojiList = [
            "💠", "🔥", "⚙️", "🎭", "🎨", "🧠", "📥", "🌀", "🔎", "🤖",
            "💬", "👑", "🚀", "📂", "🕹️", "🎧", "🛠️", "🌟", "💎", "🧩"
        ]

        // Function for stable random emoji per category
        const getStableEmoji = (category) => {
            if (!categoryEmojis[category]) {
                const random = emojiList[Math.floor(Math.random() * emojiList.length)]
                categoryEmojis[category] = random
            }
            return categoryEmojis[category]
        }

        // Get unique categories from commands
        let categories = [...new Set(Object.values(commands).map(c => c.category || 'Misc'))]

        // Sort categories alphabetically
        categories = categories.sort((a, b) => a.localeCompare(b))

        // Header text
        let menuText = `┏━〔 *${config.BOT_NAME}* 〕━┓

┋ *Owner* : *${config.OWNER_NAME}*
┋ *Library* : *DJ Baileys*
┋ *Hosting* : *Heroku*
┋ *Prefix* : [ *${config.PREFIX}* ]
┋ *Version* : *4.0.0*
┋ *Runtime* : *${runtime(process.uptime())}*
┗━━━━━━━━━━━━━━┛
\n`

        // Generate each category menu block
        for (const category of categories) {
            const cmds = Object.values(commands).filter(c => c.category === category)
            if (cmds.length === 0) continue // skip if no commands in that category

            const emoji = getStableEmoji(category)

            menuText += `╭❮${emoji}${category.toUpperCase()}${emoji}❯✦\n`
            cmds.forEach(c => {
                menuText += `┃»➤  ${c.pattern}\n`
            })
            menuText += `╰─────────────✦\n\n`
        }

        // Footer branding
        menuText += `> *© 𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 𝚀𝙰𝙳𝙴𝙴𝚁 𝙰𝙸 🤖*`

        // Send styled menu
        await conn.sendMessage(
            from,
            {
                image: { url: config.MENU_IMAGE_URL || 'https://files.catbox.moe/3tihge.jpg' },
                caption: menuText,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363299692857279@newsletter',
                        newsletterName: config.BOT_NAME,
                        serverMessageId: 143
                    }
                }
            },
            { quoted: verifiedReply }
        )

    } catch (e) {
        console.error(e)
        reply(`❌ Error: ${e.message}`)
    }
})