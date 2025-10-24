Yeh lijiye aap ke main index.js ka complete aur clean code.
Yeh wohi code hai jisko hum ne refactor kiya tha taakay plugins pehlay load hon aur bot baad mein connect ho.
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    proto,
    generateWAMessageContent,
    generateWAMessage,
    prepareWAMessageMedia,
    downloadContentFromMessage,
    generateWAMessageFromContent,
    makeInMemoryStore,
    jidDecode,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys');

const P = require('pino');
const { getBuffer } = require('./lib'); // ./lib/index.js se import karega
const fs = require('fs-extra'); // fs-extra use karein
const config = require('./config');
const GroupEvents = require('./lib/groupevents');
const { AntiDelete } = require('./lib/antidel'); 
const path = require('path');
const os = require('os');
const axios = require('axios');
const FileType = require('file-type');
const { File } = require('megajs'); 
const prefix = config.PREFIX;

// Cache Temp Directory
const tempDir = path.join(os.tmpdir(), 'cache-temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}
const clearTempDir = () => {
    fs.readdir(tempDir, (err, files) => {
        if (err) throw err;
        for (const file of files) {
            fs.unlink(path.join(tempDir, file), err => {
                if (err) throw err;
            });
        }
    });
};
setInterval(clearTempDir, 5 * 60 * 1000); // Har 5 minute mein temp saaf karega

// --- Web Server (for Heroku/Koyeb) ---
const express = require('express');
const app = express();
const port = process.env.PORT || 9090;
app.get('/', (req, res) => {
    res.send('QADEER-AI-Mini is Running!');
});

// --- 1. Session Handling Function ---
async function initializeSession() {
    if (!fs.existsSync(__dirname + '/sessions/')) {
        fs.mkdirSync(__dirname + '/sessions/');
    }

    if (!fs.existsSync(__dirname + '/sessions/creds.json')) {
        if (!config.SESSION_ID) {
            console.error('Please add your session to SESSION_ID env !!');
            process.exit(1); // Exit if no session
        }
        console.log('Downloading session...');
        const sessdata = config.SESSION_ID.replace('Qadeer~', '');
        const filer = File.fromURL('https://mega.nz/file/' + sessdata);
        
        // Promise use karein gay taakay download ka wait kar sakein
        return new Promise((resolve, reject) => {
            filer.download((err, data) => {
                if (err) {
                    console.error("Session download failed!", err);
                    reject(err); // Error reject karein
                    process.exit(1);
                }
                fs.writeFile(__dirname + '/sessions/creds.json', data, (writeErr) => {
                    if (writeErr) {
                        console.error("Failed to write session file!", writeErr);
                        reject(writeErr); // Error reject karein
                        process.exit(1);
                    }
                    console.log('Session downloaded ✅');
                    resolve(); // Success resolve karein
                });
            });
        });
    } else {
         console.log("Session file found.");
         return Promise.resolve(); // Session pehlay se mojood hai
    }
}
// --- End Session Handling ---

// --- 2. Plugin Loader Function ---
// (Yeh function ab plugins load karega aur logs mein show karega)
function loadPlugins() {
    console.log('Loading plugins...');
    const pluginDir = './plugins/';
    
    if (!fs.existsSync(pluginDir)) {
        console.warn("Warning: 'plugins' directory not found, skipping plugin loading.");
        return 0; // 0 plugins load huay
    }
    
    const pluginFiles = fs.readdirSync(pluginDir).filter(file => path.extname(file).toLowerCase() === '.js');
    
    for (const plugin of pluginFiles) {
        try {
            const pluginPath = path.resolve(pluginDir, plugin);
            require(pluginPath);
            // --- YEH LOG AAP NE MANGA THA ---
            console.log(`- Plugin Loaded: ${plugin}`); 
        } catch (e) {
            console.error(`Error loading plugin: ${plugin}`);
            console.error(e);
        }
    }
    
    if (pluginFiles.length > 0) {
        console.log('All plugins loaded successfully ✅');
    } else {
        console.log('No plugins found to load.');
    }
    
    return pluginFiles.length; // Loaded plugins ka count return karega
}
// --- End Plugin Loader ---


// --- 3. WhatsApp Connection Function ---
async function connectToWA(pluginCount) { // pluginCount ko argument ke tor par le ga
    console.log('Connecting to WhatsApp ⏳️...');
    
    const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/sessions/');
    var { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS('Firefox'),
        auth: state,
        version: version,
        shouldIgnoreJid: jid => jid.endsWith('@broadcast'),
        getMessage: async key => {
            return { conversation: 'Bot Connected by Qadeer Khan' };
        }
    });

    // --- Event Listeners ---
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
             console.log('QR Code generated. Scan it with your phone.');
             // Optional: qrcode-terminal se display karwayein
             // require('qrcode-terminal').generate(qr, { small: true });
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect.error?.output?.statusCode;
            if (statusCode && statusCode !== DisconnectReason.loggedOut) {
                console.log('Connection closed due to an error, reconnecting...');
                startBot(); // Re-run the full startBot logic on disconnect
            } else if (statusCode === DisconnectReason.loggedOut) {
                console.log('Connection closed. Logged out. Deleting session and exiting.');
                fs.rmSync(__dirname + '/sessions/', { recursive: true, force: true });
                process.exit(1); 
            } else {
                 console.log('Connection closed, reconnecting...');
                 startBot(); // Re-run the full startBot logic
            }
        } else if (connection === 'open') {
            console.log('Bot connected to whatsapp ✅');
            
            // --- Startup Message (FIXED) ---
            let startMessage = `*✦ QADEER-AI (Mini) CONNECTED ✦*

╭─【 🛡️ *BOT DETAILS* 】
│ 👤 *Creator:* ${config.OWNER_NAME}
│ 🪀 *Prefix:* ➥ ${config.PREFIX}
│ 📦 *Plugins:* ${pluginCount}
╰─────────────╯
> *${config.DESCRIPTION}*`;

            try {
                const verifiedReply = {
                    key: { participant: `0@s.whatsapp.net`, fromMe: false, remoteJid: "status@broadcast" },
                    message: { extendedTextMessage: { text: "Qadeer-AI Official", contextInfo: { verifiedBizName: "Qadeer-AI" } } }
                };

                await sock.sendMessage(
                    sock.user.id,
                    {
                        image: { url: config.ALIVE_IMG },
                        caption: startMessage,
                        contextInfo: {
                            mentionedJid: [sock.user.id],
                            forwardingScore: 999, isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363345872435489@newsletter',
                                newsletterName: "𝚀𝙰𝙳𝙴𝙴𝚁-𝙰𝙸", serverMessageId: 143
                            }
                        }
                    }, { quoted: verifiedReply }
                );
            } catch (e) {
                console.error("Error sending startup message:", e);
            }
        }
    });

    // --- Attach Main Listeners ---
    sock.ev.on('creds.update', saveCreds);

    // Anti-Delete Listener
    sock.ev.on('messages.update', async updates => {
        if (config.ANTI_DELETE === 'true') {
             AntiDelete(sock, updates);
        }
    });

    // Welcome/Goodbye Listener
    sock.ev.on('group-participants.update', updates => {
        if (config.WELCOME === 'true') {
            GroupEvents(sock, updates);
        }
    });

    // Main Message Handler (New File)
    // Ab jab yeh call hoga, plugins pehlay se loaded hon gay
    sock.ev.on('messages.upsert', messages => {
        require('./handler')(sock, messages);
    });
        
    // --- Helper Functions (Attached to sock) ---
    
    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server && decode.user + '@' + decode.server || jid;
        } else return jid;
    };
    
    sock.copyNForward = async (jid, message, forceForward = false, options = {}) => {
        let vtype;
        if (options.readViewOnce) {
            message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined);
            vtype = Object.keys(message.message.viewOnceMessage.message)[0];
            delete(message.message && message.message.ignore ? message.message.ignore : (message.message || undefined));
            delete message.message.viewOnceMessage.message[vtype].viewOnce;
            message.message = { ...message.message.viewOnceMessage.message };
        }
        let mtype = Object.keys(message.message)[0];
        
        let content = await generateWAMessageContent(message, {}); 
        
        let ctype = Object.keys(content)[0];
        let context = {};
        if (mtype != 'conversation') context = message.message[mtype].contextInfo;
        
        content[ctype].contextInfo = { ...context, ...content[ctype].contextInfo };

        let finalOptions = options ? { ...content[ctype], ...options } : { ...content[ctype] };

        finalOptions.contextInfo = {
            ...content[ctype].contextInfo,
            ...(options.contextInfo || {}),
            isForwarded: !!forceForward
        };
        
        const waMessage = await generateWAMessageFromContent(jid, content, finalOptions);
        
        await sock.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id });
        return waMessage;
    };

    sock.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        let quoted = message.msg ? message.msg : message;
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(quoted, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        let type = await FileType.fromBuffer(buffer);
        let trueFileName = attachExtension ? (filename + '.' + type.ext) : filename;
        await fs.writeFileSync(trueFileName, buffer);
        return trueFileName;
    };

    sock.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    };
    
    sock.sendFileUrl = async (jid, url, caption = '', quoted, options = {}) => {
        let mime = '';
        let res = await axios.head(url);
        mime = res.headers['content-type'];
        if (mime.split('/')[1] === 'gif') {
            return sock.sendMessage(jid, { video: await getBuffer(url), caption: caption, gifPlayback: true, ...options }, { quoted: quoted, ...options });
        }
        let messageType = mime.split('/')[0];
        if (mime === 'application/pdf') {
            return sock.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption: caption, ...options }, { quoted: quoted, ...options });
        }
        if (messageType === 'image') {
            return sock.sendMessage(jid, { image: await getBuffer(url), caption: caption, ...options }, { quoted: quoted, ...options });
        }
        if (messageType === 'video') {
            return sock.sendMessage(jid, { video: await getBuffer(url), caption: caption, mimetype: 'video/mp4', ...options }, { quoted: quoted, ...options });
        }
        if (messageType === 'audio') {
            return sock.sendMessage(jid, { audio: await getBuffer(url), caption: caption, mimetype: 'audio/mpeg', ...options }, { quoted: quoted, ...options });
        }
    };

    sock.cMod = (jid, copy, text = '', sender = sock.user.id, options = {}) => {
        let mtype = Object.keys(copy.message)[0];
        let isEphemeral = mtype === 'ephemeralMessage';
        if (isEphemeral) {
            mtype = Object.keys(copy.message.ephemeralMessage.message)[0];
        }
        let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message;
        let content = msg[mtype];
        if (typeof content === 'string') msg[mtype] = text || content;
        else if (content.caption) content.caption = text || content.caption;
        else if (content.text) content.text = text || content.text;
        if (typeof content !== 'string') msg[mtype] = { ...content, ...options };
        if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;
        else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;
        if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid;
        else if (copy.key.remoteJid.includes('@g.us')) sender = copy.key.remoteJid;
        copy.key.remoteJid = jid;
        copy.key.fromMe = sender === sock.user.id;
        return proto.WebMessageInfo.fromObject(copy);
    };

    return sock;
}


// --- 4. Main Bot Start Function ---
// (Yeh function ab sab cheezon ko order mein chalaayega)
async function startBot() {
    // 1. Server start karein (Heroku/Koyeb ke liye)
    app.listen(port, () => console.log(`Server listening on port http://localhost:${port}`));

    try {
        // 2. Session check/download karein
        await initializeSession();
        
        // 3. Plugins load karein (aur logs mein show karein)
        const loadedPluginCount = loadPlugins(); 
        
        // 4. Database connection (agar hai)
        try {
            require('./lib/database'); // Ya jahan bhi database.js hai
        } catch (e) {
            console.error("Database connection error (if any):", e);
        }

        // 5. Jab sab load ho jaaye, tab WhatsApp connect karein
        await connectToWA(loadedPluginCount); // Plugin count pass karein

    } catch (error) {
        console.error("Failed to start bot due to critical error:", error);
        process.exit(1); // Agar session ya koi zaroori cheez fail ho
    }
}

// --- Bot Ko Start Karein ---
startBot();

