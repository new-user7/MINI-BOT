const { getContentType, jidNormalizedUser } = require('@whiskeysockets/baileys');
const config = require('./config');
// const { sms } = require('./lib'); // --- FIX: Iski zaroorat nahi hai ---
const { saveMessage } = require('./data');
const { getGroupAdmins } = require('./lib/functions');
const util = require('util');
const commandModule = require('./command');

module.exports = async (sock, messages) => {
    try {
        const m = messages.messages[0];
        if (!m.message) return;

        m.message = getContentType(m.message) === 'ephemeralMessage' ? m.message.ephemeralMessage.message : m.message;
        
        // Anti-View Once (ANTI_VV) Logic
        if (m.message.viewOnceMessageV2 && config.ANTI_VV === 'true') {
             m.message = m.message.viewOnceMessageV2.message;
             console.log("Anti-View Once message captured.");
        }

        await Promise.all([saveMessage(m)]);
        // const message = sms(sock, m); // --- FIX: Yeh line hata di ---
        
        // if (!message) return; // --- FIX: Yeh "Silent Fail" wali line hata di ---

        const mtype = getContentType(m.message);
        const from = m.key.remoteJid;
        const quoted = mtype === 'extendedTextMessage' && m.message.extendedTextMessage.contextInfo != null ? m.message.extendedTextMessage.contextInfo.quotedMessage || [] : [];
        
        // --- FIX: 'body' ko 'text' ki jagah bhi istemal karein gay ---
        const body = (mtype === 'conversation') ? m.message.conversation : (mtype === 'extendedTextMessage') ? m.message.extendedTextMessage.text : (mtype == 'imageMessage' && m.message.imageMessage.caption) ? m.message.imageMessage.caption : (mtype == 'videoMessage' && m.message.videoMessage.caption) ? m.message.videoMessage.caption : '';
        
        const prefix = config.PREFIX;
        const isCmd = body.startsWith(prefix);
        // var text = typeof message.text == 'string' ? message.text : ''; // --- FIX: Iski jagah 'body' use karein gay ---
        const command = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const q = args.join(' ');
        const textArgs = args.join(' '); // 'text' ki jagah yeh use hoga commands mein
        const isGroup = from.endsWith('@g.us');
        const sender = m.key.fromMe ? (sock.user.id.split(':')[0] + '@s.whatsapp.net' || sock.user.id) : (m.key.participant || m.key.remoteJid);
        const senderNumber = sender.split('@')[0];
        const botNumber = sock.user.id.split(':')[0];
        const pushname = m.pushName || 'Sin Nombre';
        const isMe = botNumber.includes(senderNumber);
        const isOwner = config.OWNER_NUMBER.split(',').includes(senderNumber) || isMe;
        const isPrivateOwner = sender.startsWith(config.DEV); // Private Owner Check
        const botJid = await jidNormalizedUser(sock.user.id);
        const groupMetadata = isGroup ? await sock.groupMetadata(from).catch(e => {}) : '';
        const groupName = isGroup ? groupMetadata.subject : '';
        const participants = isGroup ? await groupMetadata.participants : '';
        const groupAdmins = isGroup ? await getGroupAdmins(participants) : '';
        const isBotAdmins = isGroup ? groupAdmins.includes(botJid) : false;
        const isAdmins = isGroup ? groupAdmins.includes(sender) : false;
        const isReaction = m.message && m.message.reactionMessage ? true : false; // m.message check add kiya
        
        const reply = (text) => {
            sock.sendMessage(from, { text: text }, { quoted: m });
        };
        
        let botCreator = [botNumber.split('@')[0], config.DEV].map(v => v.replace(/[^0-9]/g) + '@s.whatsapp.net').includes(m.sender);

        // --- Owner Commands ($ and %) ---
        // --- FIX: 'text' ki jagah 'body' istemal kiya ---
        if (botCreator && body.startsWith('%')) {
            let code = body.slice(2); // text.slice(2) ki jagah
            if (!code) return reply('Provide me with a query to run Master!');
            try {
                let result = eval(code);
                if (typeof result === 'object') reply(util.inspect(result));
                else reply(util.inspect(result));
            } catch (e) {
                reply(util.inspect(e));
            }
            return;
        }

        // --- FIX: 'text' ki jagah 'body' istemal kiya ---
        if (botCreator && body.startsWith('$')) {
            let code = body.slice(2); // text.slice(2) ki jagah
            if (!code) return reply('Provide me with a query to run Master!');
            try {
                let result = await eval('const a = async()=>{\n' + code + '\n}\na()');
                let formattedResult = util.format(result);
                if (formattedResult === undefined) return console.log(formattedResult);
                else reply(formattedResult);
            } catch (e) {
                if (e === undefined) return console.log(e);
                else reply(util.inspect(e));
            }
            return;
        }
        
        // --- Command Handling ---
        const cmd = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : false;

        if (isCmd) {
            const commandHandler = commandModule.commands.find(c => c.pattern === cmd) || commandModule.commands.find(c => c.alias && c.alias.includes(cmd));
            if (commandHandler) {
                if (commandHandler.react) sock.sendMessage(from, { react: { text: commandHandler.react, key: m.key } });
                try {
                    commandHandler.function(sock, m, m, { // 'message' ki jagah 'm' pass kiya
                        from, quoted, body, isCmd, command, args, q, text: textArgs, isGroup, sender, senderNumber,
                        botNumber2: botJid, botNumber, pushname, isMe, isOwner, isPrivateOwner, 
                        isCreator: botCreator, groupMetadata,
                        groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply
                    });
                } catch (e) {
                    console.error('[PLUGIN ERROR] ' + e);
                }
            }
        }
        
        // --- 'on' Event Handling (e.g., on: 'text') ---
        commandModule.commands.map(async (command) => {
            if (isReaction) return; 
            
            const context = { from, quoted, body, isCmd, command, args, q, text: textArgs, isGroup, sender, senderNumber,
                              botNumber2: botJid, botNumber, pushname, isMe, isOwner, isPrivateOwner, isCreator: botCreator, groupMetadata,
                              groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply };
            
            try {
                // m.mtype ko check karein
                const mType = Object.keys(m.message)[0]; 

                if (body && command.on === 'text') {
                    command.function(sock, m, m, context);
                } else if ((command.on === 'image' || command.on === 'photo') && mType === 'imageMessage') {
                    command.function(sock, m, m, context);
                } else if (command.on === 'sticker' && mType === 'stickerMessage') {
                    command.function(sock, m, m, context);
                }
            } catch (e) {
                 console.error('[EVENT PLUGIN ERROR] ' + e);
            }
        });

    } catch (e) {
        console.error("Error in messages.upsert handler: ", e);
    }
};
