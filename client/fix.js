const fs = require('fs'); 
let c = fs.readFileSync('src/context/LanguageContext.jsx', 'utf8'); 
c = c.replace(/Here's the Spanish translation block ready to insert:/gi, ''); 
c = c.replace(/javascript\b/g, ''); 
fs.writeFileSync('src/context/LanguageContext.jsx', c);
