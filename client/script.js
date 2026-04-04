const fs = require('fs');
const txtPath = 'C:/Users/aiymb/AppData/Roaming/Code/User/workspaceStorage/3f2864d208f28f70a82ef837aa99af71/GitHub.copilot-chat/chat-session-resources/80666b23-aa2f-4240-85c1-b81e0a17b836/call_MHxhbjNrWk1JUVZHVThFazJUaXU__vscode-1775255708200/content.txt';
let translated = fs.readFileSync(txtPath, 'utf8');

// Strip any markdown wrappers like \\\javascript and \\\
translated = translated.replace(/Here.*?javascript/sm, '');
translated = translated.replace(/\\\(javascript|es|js|)/gi, '');
translated = translated.replace(/\\\/g, '').trim();

let content = fs.readFileSync('src/context/LanguageContext.jsx', 'utf8');

// Add Spanish block (translated) above 'kz: {'
content = content.replace('  kz: {', translated + ',\n  kz: {');

// Update supported language arrays
content = content.replace(/\\['en',\\s*'ru',\\s*'kz'\\]/g, \"['en', 'ru', 'kz', 'es']\");

fs.writeFileSync('src/context/LanguageContext.jsx', content);
console.log('Done!');
