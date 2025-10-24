const axios = require("axios");
const fetch = require("node-fetch");
const { sleep } = require('../lib/functions');
const { cmd, commands } = require("../command");

cmd({
    pattern: "flirt",
    alias: ["masom", "line"],
    desc: "Get a random flirt or pickup line.",
    react: "💘",
    category: "fun",
    filename: __filename,
}, 
async (conn, mek, m, { from, reply }) => {
    try {
        // Define API key and URL
        const shizokeys = 'shizo';
        const apiUrl = `https://shizoapi.onrender.com/api/texts/flirt?apikey=${shizokeys}`;

        // Fetch data from the API
        const res = await fetch(apiUrl);
        if (!res.ok) {
            throw new Error(`API error: ${await res.text()}`);
        }
        
        const json = await res.json();
        if (!json.result) {
            throw new Error("Invalid response from API.");
        }

        // Extract and send the flirt message
        const flirtMessage = `${json.result}`;
        await conn.sendMessage(from, {
            text: flirtMessage,
            mentions: [m.sender],
        }, { quoted: m });

    } catch (error) {
        console.error("Error in flirt command:", error);
        reply("Sorry, something went wrong while fetching the flirt line. Please try again later.");
    }
});


// char (Modified Command)

cmd({
    pattern: "character",
    alias: ["char"],
    desc: "Check the character of a user.",
    react: "🔥",
    category: "fun",
    filename: __filename,
}, 
async (conn, mek, m, { from, isGroup, text, reply }) => {
    try {
        const userChar = [
            "Sigma", "Generous", "Grumpy", "Overconfident",
            "Obedient", "Good", "Simp", "Kind", "Patient",
            "Pervert", "Cool", "Helpful", "Brilliant",
            "fine", "best", "Gorgeous", "Cute",
        ];

        const userCharacterSelection = userChar[Math.floor(Math.random() * userChar.length)];
        let message;
        let mentions;

        if (isGroup) {
            // Group logic: requires a mention
            const mentionedUser = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!mentionedUser) {
                return reply("In a group, please mention a user to check their character.");
            }
            message = `Character of @${mentionedUser.split("@")[0]} is *${userCharacterSelection}* 🔥⚡`;
            mentions = [mentionedUser];
        } else {
            // DM logic: targets the user directly
            message = `Your character is *${userCharacterSelection}* 🔥⚡`;
            mentions = [from];
        }

        // Send the message with mentions
        await conn.sendMessage(from, {
            text: message,
            mentions: mentions,
        }, { quoted: m });

    } catch (e) {
        console.error("Error in character command:", e);
        reply("An error occurred while processing the command. Please try again.");
    }
});

// repeat
cmd({
  pattern: "repeat",
  alias: ["rp", "rpm"],
  desc: "Repeat a message a specified number of times.",
  category: "fun",
  filename: __filename
}, async (conn, m, store, { args, reply }) => {
  try {
    if (!args[0]) {
      return reply("✳️ Use this command like:\n*Example:* .repeat 10,I love you");
    }

    const [countStr, ...messageParts] = args.join(" ").split(",");
    const count = parseInt(countStr.trim());
    const message = messageParts.join(",").trim();

    if (isNaN(count) || count <= 0 || count > 50000) {
      return reply("❎ Please specify a valid number between 1 and 5000.");
    }

    if (!message) {
      return reply("❎ Please provide a message to repeat.");
    }

    const repeatedMessage = Array(count).fill(message).join("\n");

    reply(`🔄 Repeated ${count} times:\n\n${repeatedMessage}`);
  } catch (error) {
    console.error("❌ Error in repeat command:", error);
    reply("❎ An error occurred while processing your request.");
  }
});
