const { getContentType, jidNormalizedUser } = require('@whiskeysockets/baileys');
const config = require('./config');
const { saveMessage } = require('./data');
const { getGroupAdmins } = require('./lib/functions');
const util = require('util');
const commandModule = require('./command');

module.exports = async (sock, messages) => {
    try {
        const m = messages.messages[0];
        if (!m.message) return; // Agar message nahi hai toh ignore karein

        m.message = getContentType(m.message) === 'ephemeralMessage' ? m.message.ephemeralMessage.message : m.message;
        
        // Anti-View Once (ANTI_VV) Logic
        if (m.message.viewOnceMessageV2 && config.ANTI_VV === 'true') {
             m.message = m.message.viewOnceMessageV2.message;
             console.log("Anti-View Once message captured.");
        }

        // Message ko database mein save karein (agar configured hai)
        await Promise.all([saveMessage(m)]);

        const mtype = getContentType(m.message);
        const from = m.key.remoteJid;
        const quoted = mtype === 'extendedTextMessage' && m.message.extendedTextMessage.contextInfo != null ? m.message.extendedTextMessage.contextInfo.quotedMessage || [] : [];
        
        const body = (mtype === 'conversation') ? m.message.conversation : 
                     (mtype === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (mtype == 'imageMessage' && m.message.imageMessage.caption) ? m.message.imageMessage.caption : 
                     (mtype == 'videoMessage' && m.message.videoMessage.caption) ? m.message.videoMessage.caption : '';
        
        const prefix = config.PREFIX;
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : false; // Yahan 'command' define kiya
        const args = body.trim().split(/ +/).slice(1);
        const q = args.join(' ');
        const textArgs = args.join(' '); 
        const isGroup = from.endsWith('@g.us');
        const sender = m.key.fromMe ? (sock.user.id.split(':')[0] + '@s.whatsapp.net' || sock.user.id) : (m.key.participant || m.key.remoteJid);
        const senderNumber = sender.split('@')[0];
        const botNumber = sock.user.id.split(':')[0];
        const pushname = m.pushName || 'Sin Nombre';
        const isMe = botNumber.includes(senderNumber);
        const isOwner = config.OWNER_NUMBER.split(',').includes(senderNumber) || isMe;
        const isPrivateOwner = sender.startsWith(config.DEV); 
        const botJid = await jidNormalizedUser(sock.user.id);
        const groupMetadata = isGroup ? await sock.groupMetadata(from).catch(e => {}) : '';
        const groupName = isGroup ? groupMetadata.subject : '';
        const participants = isGroup ? await groupMetadata.participants : '';
        const groupAdmins = isGroup ? await getGroupAdmins(participants) : '';
        const isBotAdmins = isGroup ? groupAdmins.includes(botJid) : false;
        const isAdmins = isGroup ? groupAdmins.includes(sender) : false;
        const isReaction = m.message && m.message.reactionMessage ? true : false;
        
        const reply = (text) => {
            sock.sendMessage(from, { text: text }, { quoted: m });
        };
        
        let botCreator = [botNumber.split('@')[0], config.DEV].map(v => v.replace(/[^0-9]/g) + '@s.whatsapp.net').includes(sender);

        // === BEHTAR (IMPROVED) CONTEXT OBJECT ===
        // Humne ek 'baseContext' object banaya hai jo har plugin ko pass hoga
        // Is se code saaf rehta hai aur har plugin ko consistent data milta hai
        const baseContext = {
            from,
            quoted,
            body,
            isCmd,
            command: command, // Yeh command string hai (e.g., "ping")
            args,
            q,
            text: textArgs,
            isGroup,
            sender,
            senderNumber,
            botNumber2: botJid,
            botNumber,
            pushname,
            isMe,
            isOwner,
            isPrivateOwner,
            isCreator: botCreator,
            groupMetadata,
            groupName,
            participants,
            groupAdmins,
            isBotAdmins,
            isAdmins,
            reply
        };

        // --- Owner Commands ($ and %) ---
        // Yeh 'context' istemal nahi karte, inka logic alag hai
        if (botCreator && body.startsWith('%')) {
            let code = body.slice(2); 
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

        if (botCreator && body.startsWith('$')) {
            let code = body.slice(2); 
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
        
        // --- Command Handling (e.g. .ping) ---
        if (isCmd) {
            const commandHandler = commandModule.commands.find(c => c.pattern === command) || commandModule.commands.find(c => c.alias && c.alias.includes(command));
            if (commandHandler) {
                if (commandHandler.react) sock.sendMessage(from, { react: { text: commandHandler.react, key: m.key } });
                try {
                    // Yahan hum 'baseContext' pass kar rahe hain
                    commandHandler.function(sock, m, m, baseContext);
                } catch (e) {
                    console.error(`[PLUGIN ERROR: ${command}] ` + e);
                }
            }
        }
        
        // --- 'on' Event Handling (e.g., on: 'text') ---
        commandModule.commands.map(async (plugin) => {
            if (isReaction) return; // Reaction messages par event trigger na ho
            if (!plugin.on) return; // Agar plugin 'on' event wala nahi hai toh ignore karein

            try {
                const mType = Object.keys(m.message)[0]; 

                if (body && plugin.on === 'text') {
                    // Yahan bhi 'baseContext' pass kar rahe hain
                    plugin.function(sock, m, m, baseContext);
                } else if ((plugin.on === 'image' || plugin.on === 'photo') && mType === 'imageMessage') {
                    plugin.function(sock, m, m, baseContext);
                } else if (plugin.on === 'sticker' && mType === 'stickerMessage') {
                    plugin.function(sock, m, m, baseContext);
                }
            } catch (e) {
                 console.error(`[EVENT PLUGIN ERROR - ${plugin.on}] ` + e);
            }
        });

    } catch (e) {
        console.error("Error in messages.upsert handler: ", e);
    }
};