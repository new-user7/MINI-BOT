const fs = require('fs');
const axios = require('axios');
const path = './config.env'; // .env file ka path
const FormData = require("form-data");

/**
 * Image ko link mein convert karta hai empiretech server ka istemal karke.
 * @param {string} path - File ka local path.
 * @returns {Promise<object>} - Uploaded file ki maloomat.
 */
async function empiretourl(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  
  try {
    const response = await axios.post("https://cdn.empiretech.biz.id/api/upload.php", form, {
      headers: { ...form.getHeaders() },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    return response.data;
  } catch (error) {
    throw new Error(`API Error: ${error.message}`);
  }
}

/**
 * URL se data buffer ke taur par fetch karta hai.
 * @param {string} url - Fetch karne wala URL.
 * @param {object} options - Axios ke extra options.
 * @returns {Promise<Buffer|null>} - Data ka buffer ya error par null.
 */
const getBuffer = async (url, options) => {
    try {
        options = options || {};
        const res = await axios({
            method: 'get',
            url,
            headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1 },
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    } catch (e) {
        console.error("Error in getBuffer:", e);
        return null;
    }
};

/**
 * Group ke participants mein se admins ki list nikalta hai.
 * @param {Array} participants - Group ke members ki list.
 * @returns {Array} - Sirf admins ke JIDs ki list.
 */
const getGroupAdmins = (participants) => {
    const admins = [];
    for (let participant of participants) {
        // --- FIX FOR BAILEYS 6.7.x ---
        // Purana code: participant.admin !== null
        if (participant.admin === 'admin' || participant.admin === 'superadmin') {
            admins.push(participant.id);
        }
    }
    return admins;
};

/**
 * Extension ke sath ek random file name banata hai.
 * @param {string} ext - File ki extension (e.g., '.jpg').
 * @returns {string} - Random file name.
 */
const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};

/**
 * Bare numbers ko K, M, B mein format karta hai (e.g., 1500 => 1.5K).
 * @param {number} num - Format karne wala number.
 * @returns {string} - Format shuda string.
 */
const h2k = (num) => {
    const tiers = ['', 'K', 'M', 'B', 'T'];
    const tier = Math.floor(Math.log10(Math.abs(num)) / 3);
    if (tier === 0) return num.toString();
    const scale = Math.pow(10, tier * 3);
    const scaled = num / scale;
    const formatted = scaled.toFixed(1).replace(/\.0$/, '');
    return formatted + tiers[tier];
};

/**
 * Check karta hai ke di gayi string ek URL hai ya nahi.
 * @param {string} url - Check karne wali string.
 * @returns {boolean} - Agar URL hai to true, warna false.
 */
const isUrl = (url) => {
    return /https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/.test(url);
};

/**
 * JavaScript object ko saaf format mein JSON string mein convert karta hai.
 * @param {object} string - Convert karne wala object.
 * @returns {string} - JSON string.
 */
const Json = (string) => {
    return JSON.stringify(string, null, 2);
};

/**
 * Seconds ko "days, hours, minutes, seconds" format mein dikhata hai.
 * @param {number} seconds - Total seconds.
 * @returns {string} - Format shuda time string.
 */
const runtime = (seconds) => {
    seconds = Math.floor(seconds);
    const d = Math.floor(seconds / (24 * 60 * 60));
    seconds %= (24 * 60 * 60);
    const h = Math.floor(seconds / (60 * 60));
    seconds %= (60 * 60);
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);

    let result = [];
    if (d > 0) result.push(`${d}d`);
    if (h > 0) result.push(`${h}h`);
    if (m > 0) result.push(`${m}m`);
    if (s > 0 || result.length === 0) result.push(`${s}s`);
    
    return result.join(' ');
};

/**
 * Code ko kuch waqt ke liye rokta hai (delay).
 * @param {number} ms - Milliseconds mein waqt.
 */
const sleep = async (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * URL se JSON data fetch karta hai.
 * @param {string} url - Fetch karne wala URL.
 * @param {object} options - Axios ke extra options.
 * @returns {Promise<object|null>} - JSON object ya error par null.
 */
const fetchJson = async (url, options) => {
    try {
        options = options || {};
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        });
        return res.data;
    } catch (err) {
        console.error("Error in fetchJson:", err);
        return null;
    }
};

/**
 * config.env file mein setting save karta hai.
 * @param {string} key - Setting ka naam (e.g., 'PREFIX').
 * @param {string} value - Setting ki value (e.g., '.').
 */
const saveConfig = (key, value) => {
    let configData = fs.existsSync(path) ? fs.readFileSync(path, 'utf8').split('\n') : [];
    let found = false;

    configData = configData.map(line => {
        if (line.startsWith(`${key}=`)) {
            found = true;
            return `${key}=${value}`;
        }
        return line;
    });

    if (!found) {
        configData.push(`${key}=${value}`);
    }

    fs.writeFileSync(path, configData.join('\n'), 'utf8');
    require('dotenv').config({ path }); // .env ko reload karein
};

// Tamam functions ko export karein taake doosri files mein istemal ho sakein.
module.exports = { 
    getBuffer, 
    getGroupAdmins, 
    getRandom, 
    h2k, 
    isUrl, 
    Json, 
    runtime, 
    sleep, 
    fetchJson,
    saveConfig,
    empiretourl
};
