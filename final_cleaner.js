const fs = require('fs');
const path = 'server.js';
let content = fs.readFileSync(path, 'utf8');

// ฟังก์ชันล้างภาษาต่างดาวแบบครอบคลุม
// เราจะใช้ Regex ค้นหาตัวอักษรที่มีปัญหาและแทนที่ด้วยภาษาอังกฤษ
const cleaningMap = [
    { reg: /Ã°Å¸Å’Å¸/g, rep: '🌟' },
    { reg: /Ã Â¸Ë†Ã Â¸Â±Ã Â¸â€ Ã Â¸Â Ã Â¸Â²Ã Â¸Â£Ã Â¹â€šÃ Â¸â€ºÃ Â¸Â£Ã Â¹â‚¬Ã Â¸Ë†Ã Â¸Â Ã Â¸â€¢Ã Â¹Å’/g, rep: 'Project Management' },
    { reg: /Ã Â¸Å¸Ã Â¸Â±Ã Â¸â€¡Ã Â¸Â Ã Â¹Å’Ã Â¸Å Ã Â¸Â±Ã Â¸â„¢Ã Â¸Å Ã Â¹Ë†Ã Â¸Â§Ã Â¸Â¢Ã Â¸Â£Ã Â¸Â±Ã Â¸â„¢/g, rep: 'Helper Function' },
    { reg: /Ã Â¹â‚¬Ã Â¸Å¾Ã Â¸Â´Ã Â¹Ë†Ã Â¸Â¡ buffer Ã Â¹â‚¬Ã Â¸â€ºÃ Â¹â€¡Ã Â¸â„¢ 10MB Ã Â¹Â  Ã Â¸Â¥Ã Â¸Â° timeout Ã Â¹â‚¬Ã Â¸â€ºÃ Â¹â€¡Ã Â¸â„¢ 30 Ã Â¸Â§Ã Â¸Â´Ã Â¸â„¢Ã Â¸Â²Ã Â¸â€”Ã Â¸Âµ/g, rep: 'Increase buffer and timeout' },
    { reg: /Ã Â¸Â£Ã Â¸Â±Ã Â¸â„¢ 2 Ã Â¸â€žÃ Â¸Â³Ã Â¸ÂªÃ Â¸Â±Ã Â¹Ë†Ã Â¸â€¡Ã Â¸Å¾Ã Â¸Â£Ã Â¹â€°Ã Â¸Â­Ã Â¸Â¡Ã Â¸Â Ã Â¸Â±Ã Â¸â„¢/g, rep: 'Run 2 commands simultaneously' },
    { reg: /Ã Â¸â€¢Ã Â¸Â£Ã Â¸Â§Ã Â¸Ë†Ã Â¸ÂªÃ Â¸Â­Ã Â¸Å¡Ã Â¸â€”Ã Â¸Â±Ã Â¹â€°Ã Â¸â€¡Ã Â¸Â£Ã Â¸Â¹Ã Â¸â€ºÃ Â¹Â  Ã Â¸Â¡Ã Â¸Â£Ã Â¹Â Ã Â¸Å¡Ã Â¸Å¡/g, rep: 'Check all formats' },
    { reg: /Ã Â¸Â¡Ã Â¸Â£Ã Â¹Â Ã Â¸Å¡Ã Â¸Å¡/g, rep: 'format' },
    { reg: /Ã Â¸Â Ã Â¸Â³Ã Â¸Â¥Ã Â¸Â±Ã Â¸â€¡/g, rep: 'Preparing' },
    { reg: /Ã Â¸ÂªÃ Â¹â‚¬Ã Â¸Â£Ã Â¹â€¡Ã Â¸Âˆ/g, rep: 'Success' },
    { reg: /Ã Â¸Â§Ã Â¸Â´Ã Â¸â„¢Ã Â¸Â²Ã Â¸â€”Ã Â¸Âµ/g, rep: 'seconds' }
];

cleaningMap.forEach(item => {
    content = content.replace(item.reg, item.rep);
});

// กำจัดตัวอักษรแปลกๆ ที่เหลือที่อาจจะหลงตา
// ค้นหาช่วงตัวอักษรที่ไม่ใช่ ASCII และไม่ใช่ Emoji ที่เราอนุญาต
content = content.replace(/[^\x00-\x7F\u{1F300}-\u{1F6FF}]/gu, '');

fs.writeFileSync(path, content, 'utf8');
console.log('Server.js has been thoroughly sanitized and English-fied.');
