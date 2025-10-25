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
const { getBuffer } = require('./lib');
const fs = require('fs-extra');
const config = require('./config');
const GroupEvents = require('./lib/groupevents');
const { AntiDelete } = require('./lib/antidel'); 
const path = require('path');
const os = require('os');
const axios = require('axios');
const FileType = require('file-type');
const { File } = require('megajs'); 
const prefix = config.PREFIX;
const express = require('express');
const app = express();
const port = process.env.PORT || 9090;

// Cache Temp Directory
const tempDir = path.join(os.tmpdir(), 'cache-temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}
const clearTempDir = () => {
    fs.readdir(tempDir, (err, files) => {
        if (err) return; // Agar error ho toh chup chaap ignore karein
        for (const file of files) {
            fs.unlink(path.join(tempDir, file), err => {
                if (err) console.error(`Error clearing temp file ${file}:`, err);
            });
        }
    });
};
setInterval(clearTempDir, 10 * 60 * 1000); // Har 10 minute mein temp saaf karega

// --- Session Directory Check ---
if (!fs.existsSync(__dirname + '/sessions/')) {
    fs.mkdirSync(__dirname + '/sessions/');
}

// === STEP 1: PLUGIN LOADER ===
// Yeh function bot start hone se PEHLE plugins load karega
function loadPlugins() {
    console.log('🔄 Loading plugins...');
    fs.readdirSync('./plugins/').forEach(plugin => {
        if (path.extname(plugin).toLowerCase() == '.js') {
            try {
                const pluginPath = path.resolve('./plugins/', plugin);
                if (fs.existsSync(pluginPath)) {
                    require(pluginPath);
                } else {
                    console.warn(`[WARN] Plugin file not found, skipping: ${plugin}`);
                }
            } catch (e) {
                console.error(`❌ Error loading plugin: ${plugin}`);
                console.error(e);
            }
        }
    });
    console.log(`✅ ${fs.readdirSync('./plugins/').length} Plugins loaded successfully.`);
}

// === STEP 2: SESSION DOWNLOADER (Promise Based) ===
// Yeh function session check karega aur zaroorat parne par download karega
function checkAndDownloadSession() {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(__dirname + '/sessions/creds.json')) {
            console.log('ℹ️ Session file (creds.json) already exists.');
            return resolve();
        }
        
        console.log('🔄 No session file found. Attempting to download from MEGA...');
        if (!config.SESSION_ID) {
            // SESSION_ID na hone par process exit kar dega
            return reject(new Error('❌ SESSION_ID is missing from env! Cannot download session.'));
        }

        const sessdata = config.SESSION_ID.replace('Qadeer~', ''); 
        const filer = File.fromURL('https://mega.nz/file/' + sessdata);
        
        filer.download((err, data) => {
            if (err) {
                return reject(new Error('❌ Failed to download session from MEGA: ' + err.message));
            }
            // Session file save karega
            fs.writeFile(__dirname + '/sessions/creds.json', data, (writeErr) => {
                if (writeErr) {
                    return reject(new Error('❌ Failed to write session file: ' + writeErr.message));
                }
                console.log('✅ Session downloaded and saved successfully.');
                resolve();
            });
        });
    });
}


// === STEP 3: WHATSAPP CONNECTION ===
async function connectToWA() {
    console.log('Connecting to WhatsApp ⏳️...');
    
    const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/sessions/');
    var { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false, // QR console mein nahi dikhaye ga
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
             console.log('**********************************************');
             console.log('QR Code generated. Scan it with your phone.');
             console.log('NOTE: Agar session file hai tab bhi QR aa sakta hai agar session invalid ho.');
             console.log('**********************************************');
             // Optional: qrcode-terminal se display karwayein
             // require('qrcode-terminal').generate(qr, { small: true });
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect.error?.output?.statusCode;
            if (statusCode && statusCode !== DisconnectReason.loggedOut) {
                console.log('Connection closed due to an error, reconnecting...');
                connectToWA(); // Reconnect
            } else if (statusCode === DisconnectReason.loggedOut) {
                console.log('❌ Connection closed. Logged out. Deleting session and exiting.');
                fs.rmSync(__dirname + '/sessions/', { recursive: true, force: true });
                process.exit(1); 
            } else {
                 console.log('Connection closed, reconnecting...');
                 connectToWA(); // Reconnect
            }
        } else if (connection === 'open') {
            console.log('✅ Bot connected to whatsapp!');
            
            // --- PLUGIN LOADER KO YAHAN SE HATA DIYA GAYA HAI ---
            // Plugins ab pehle hi load ho chuke hain.

            // --- Startup Message ---
            let startMessage = `*✦ QADEER-AI (Mini) CONNECTED ✦*

╭─【 🛡️ *BOT DETAILS* 】
│ 👤 *Creator:* ${config.OWNER_NAME}
│ 🪀 *Prefix:* ➥ ${config.PREFIX}
│ 📦 *Plugins:* ${fs.readdirSync('./plugins/').length}
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
    sock.ev.on('messages.upsert', messages => {
        // Handler file ko call karega, jo ab pehle se loaded plugins ko use karega
        require('./handler')(sock, messages);
    });
        
    // --- Helper Functions (Attached to sock) ---
    // In mein koi tabdili nahi ki gayi
    
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


// === STEP 4: MAIN STARTUP FLOW ===
// Yeh naya function poora startup flow control karega
async function startBot() {
    console.log('🚀 Starting QADEER-AI-Mini Bot...');
    
    try {
        // Step 1: Load Plugins (Sync operation)
        // Yeh pehle complete hoga
        loadPlugins();

        // Step 2: Handle Session
        // Yeh session download/check karega. Fail hone par bot crash ho jayega (jo zaroori hai)
        await checkAndDownloadSession();

        // Step 3: Connect to Database (if it exists)
        try {
            require('./lib/database'); 
            console.log('ℹ️ Database connection initiated (if configured).');
        } catch (e) {
            console.warn('⚠️ Warning: Database connection failed (if any):', e.message);
        }
        
        // Step 4: Start Web Server (for keep-alive on Heroku/Koyeb)
        app.get('/', (req, res) => res.send('QADEER-AI-Mini is Running!'));
        app.listen(port, () => console.log(`✅ Web server listening on port http://localhost:${port}`));

        // Step 5: Connect to WhatsApp
        // Yeh function call hoga aur bot chalta rahega
        await connectToWA();

    } catch (error) {
        // Agar session download jaisi zaroori cheez fail hoti hai
        console.error('❌ FATAL ERROR during startup:', error.message);
        process.exit(1); 
    }
}

// --- Run the Bot ---
// Purana setTimeout hata diya, ab hum naya flow istemal kar rahe hain
startBot();