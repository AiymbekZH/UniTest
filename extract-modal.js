const fs = require('fs');
const file = 'client/src/pages/TakeTest.jsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');
const violationLines = [];
let recording = false;
let start = 0;
let end = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('showViolationWarning && (')) {
    recording = true;
    start = i;
  }
  if (recording) {
    violationLines.push(lines[i]);
    // find the closing of AnimatePresence for the modal
    if (lines[i].includes('</AnimatePresence>')) {
      end = i;
      recording = false;
      break; 
    }
  }
}
fs.writeFileSync('violation-modal.txt', violationLines.join('\n'));
console.log('Saved to violation-modal.txt', start, end);
