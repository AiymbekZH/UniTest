const fs = require('fs');
const lines = fs.readFileSync('client/src/pages/TakeTest.jsx', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('showViolationWarning && ('));
const end = start + 30;
console.log(lines.slice(start, end).join('\n'));
