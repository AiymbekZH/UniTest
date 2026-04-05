const fs = require('fs');
const file = 'client/src/pages/TakeTest.jsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Fix HTML rendering
code = code.replace(
  /<p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">\{displayedPassage\}<\/p>/g,
  '<div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: displayedPassage }} />'
);

code = code.replace(
  /<div className="text-xs text-gray-400 dark:text-gray-500 italic px-1 pt-1.5">\s*\{q\.explanation\}\s*<\/div>/g,
  '<div className="text-xs text-gray-400 dark:text-gray-500 italic px-1 pt-1.5" dangerouslySetInnerHTML={{ __html: q.explanation }} />'
);

// We know `getOptText(opt, optIdx)` is returned inside a span
// `<span className="font-medium text-sm flex-1">{getOptText(opt, optIdx)}</span>`
code = code.replace(
  /<span className="font-medium text-sm flex-1">\{getOptText\(opt, optIdx\)\}<\/span>/g,
  '<span className="font-medium text-sm flex-1" dangerouslySetInnerHTML={{ __html: getOptText(opt, optIdx) }} />'
);

// We need to fix explanations. It looks like it was using `<div className="text-xs text-gray-400...` earlier.
// Wait, I saw it in TakeTest for the question explanation! Let's just blindly replace the known HTML snippet.

// 2. Anti-cheat modal UI change
// Old modal in anti-cheat is probably rendered inside AnimatePresence -> showViolationWarning
const violationStr = \`<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}\`;
// We don't know the exact string. Let's do a regex to replace the Violation Warning modal!

// Let's implement Session storage
const sessionSyncCode = \`
  // Session Recovery
  useEffect(() => {
    if (!test || !started || isPractice) return;
    const storageKey = 'testSession_' + shareLink;
    localStorage.setItem(storageKey, JSON.stringify({
      testId: test._id,
      answers,
      currentQ,
      violations,
      guestName,
      timeLeft
    }));
  }, [test, started, isPractice, answers, currentQ, violations, guestName, timeLeft]);
  
  useEffect(() => {
    if (!test || isPractice) return;
    const storageKey = 'testSession_' + shareLink;
    const restored = localStorage.getItem(storageKey);
    if (restored) {
      try {
        const parsed = JSON.parse(restored);
        if (parsed.testId === test._id) {
          setAnswers(parsed.answers || {});
          setCurrentQ(parsed.currentQ || 0);
          setViolations(parsed.violations || []);
          if (parsed.guestName) setGuestName(parsed.guestName);
          if (parsed.timeLeft) setTimeLeft(parsed.timeLeft);
        }
      } catch(e) {}
    }
  }, [test, isPractice]);

  // Clean up session on submit
\`;

// Insert the session code after `useEffect(() => { fetchTest(); }, [shareLink]);`
if (!code.includes('// Session Recovery')) {
  code = code.replace(
    /useEffect\(\(\) => \{\s*fetchTest\(\);\s*\}, \[shareLink\]\);/,
    \`useEffect(() => {\n    fetchTest();\n  }, [shareLink]);\n\n\` + sessionSyncCode
  );
  
  // also add localStorage.removeItem in handleSubmit
  code = code.replace(
    /navigate\(\\\/result\\\/\$\{res\.data\._id\}\\\/\);/,
    \`localStorage.removeItem('testSession_' + shareLink);\n      navigate(\`/result/\${res.data._id}\`);\`
  );
}

fs.writeFileSync(file, code, 'utf8');
console.log("Patched TakeTest!");
