const { cmd } = require("../command");  
const { sleep } = require("../lib/functions");  

cmd({  
    pattern: "restart",  
    desc: "Restart QADEER-AI",  
    category: "owner",  
    filename: __filename  
},  
async (conn, mek, m, { reply, isCreator }) => {  
    try {  
        if (!isCreator) {  
            return reply("ᴏɴʟy ᴛʜᴇ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜꜱᴇ ᴛʜɪꜱ ᴄᴏᴍᴍᴀɴᴅ.");  
        }  

        const { exec } = require("child_process");  
        reply("ǫᴀᴅᴇᴇʀ ᴀɪ ʀᴇꜱᴛᴀʀᴛɪɴɢ...");  
        await sleep(1500);  
        exec("pm2 restart all");  
    } catch (e) {  
        console.error(e);  
        reply(`${e}`);  
    }  
});
