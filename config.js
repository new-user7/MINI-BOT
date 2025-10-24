const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
SESSION_ID: process.env.SESSION_ID || "Qadeer~2kRVCZwD#ZsrA7i3CbsEAQJU7ldr1-_42s8qpU4BgSRrLi0gO73s",
// Add your Session Id (Keep empty for Pairing Code)

// --- Essential Settings ---
PREFIX: process.env.PREFIX || ".",
BOT_NAME: process.env.BOT_NAME || "𝐐𝐀𝐃𝐄𝐄𝐑-𝐀𝐈 (Mini)",
OWNER_NUMBER: process.env.OWNER_NUMBER || "923151105391",
OWNER_NAME: process.env.OWNER_NAME || "Qadeer Khan",
DEV: process.env.DEV || "923151105391",
DESCRIPTION: process.env.DESCRIPTION || "*© 𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 𝚀𝙰𝙳𝙴𝙴𝚁 𝙺𝙷𝙰𝙽*",

// --- Group Features ---
WELCOME: process.env.WELCOME || "true",
ADMIN_EVENTS: process.env.ADMIN_EVENTS || "false",
ANTI_LINK: process.env.ANTI_LINK || "false",
ANTI_LINK_KICK: process.env.ANTI_LINK_KICK || "false",
DELETE_LINKS: process.env.DELETE_LINKS || "false",

// --- Bot Features ---
ANTI_DELETE: process.env.ANTI_DELETE || "true",
ANTI_DEL_PATH: process.env.ANTI_DEL_PATH || "inbox",
ANTI_VV: process.env.ANTI_VV || "true",

// --- Customization ---
MENU_IMAGE_URL: process.env.MENU_IMAGE_URL || "https://qu.ax/Pusls.jpg",
STICKER_NAME: process.env.STICKER_NAME || "Qadeer-AI",
ALIVE_IMG: process.env.ALIVE_IMG || "https://qu.ax/Pusls.jpg",
LIVE_MSG: process.env.LIVE_MSG || "> *QADEER-AI RUNNING WITH SPEED OF LIGHT*⚡",

};