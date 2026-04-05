const fs = require('fs');
const file = 'server/routes/ai.js';
let code = fs.readFileSync(file, 'utf8');

const targetA = `const { text, image, questionCount = 5, questionTypes = '["single-choice"]', language = 'ru' } = req.body;`;
const replacementA = `const { text, image, typeCounts = '{"single-choice": 5}', difficulty = 3, language = 'ru' } = req.body;`;

const targetB = `    // Parse questionTypes (could be JSON string from FormData)
    let parsedTypes;
    try {
      parsedTypes = typeof questionTypes === 'string' ? JSON.parse(questionTypes) : questionTypes;
    } catch { parsedTypes = ['single-choice']; }`;
const replacementB = `    // Parse typeCounts
    let counts;
    try {
      counts = typeof typeCounts === 'string' ? JSON.parse(typeCounts) : typeCounts;
    } catch { counts = { 'single-choice': 5 }; }
    const totalCount = Object.values(counts).reduce((a, b) => a + b, 0) || 5;`;

const targetC = `    const requestedTypes = parsedTypes
      .map(t => typeDescriptions[t] || t)
      .join('; ');

    const systemPrompt = \`You are a professional test/quiz generator for an educational platform.
Generate exactly \${questionCount} questions based on the provided content.

QUESTION TYPES to use: \${requestedTypes}
Distribute question types evenly across the requested types.`;

const replacementC = `    const requirementList = Object.entries(counts)
      .filter(([_, qty]) => qty > 0)
      .map(([type, qty]) => \`- \${qty} questions of type '\${type}': \${typeDescriptions[type] || type}\`)
      .join('\\n');

    const diffText = {
      1: "Very Easy (Basic concepts, direct recall)",
      2: "Easy (Simple comprehension, straightforward)",
      3: "Medium (Standard difficulty, mixed cognitive levels)",
      4: "Hard (Requires deep thinking, tricky plausible distractors)",
      5: "Very Hard (Complex analysis, tricky scenarios, expert level)"
    }[difficulty] || "Medium";

    const systemPrompt = \`You are a professional test/quiz generator for an educational platform.
Generate EXACTLY \${totalCount} questions based on the provided content.

QUESTION TYPE REQUIREMENTS (You must strictly follow these exact quantities):
\${requirementList}

DIFFICULTY LEVEL: \${diffText}
Adjust the complexity of the question text and the plausibility of incorrect options to match this difficulty level.`;

const targetD = `Generate \${questionCount} test questions`;
const replacementD = `Generate \${totalCount} test questions`;

code = code.replace(targetA, replacementA);
code = code.replace(targetB, replacementB);
code = code.replace(targetC, replacementC);
code = code.replaceAll(targetD, replacementD);

// Add count to the history model save (in ai.js line ~207 there's `count: generatedQuestions.length`) 
// which uses `generatedQuestions` instead of `questionCount` so it automatically scales! We are good there.

fs.writeFileSync(file, code, 'utf8');
console.log('patched ai.js');
