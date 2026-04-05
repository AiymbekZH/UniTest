const { execSync } = require('child_process');

try {
  console.log("== Git Add ==");
  const addParams = execSync('git add .').toString();
  console.log(addParams);

  console.log("== Git Commit ==");
  try {
    const commitParams = execSync('git commit -m "feat(ai,anti-cheat,ui): complete phase 6 overhaul"').toString();
    console.log(commitParams);
  } catch(e) {
    console.log('No changes to commit or commit failed', e.message);
  }

  console.log("== Git Push ==");
  const pushParams = execSync('git push').toString();
  console.log(pushParams);
  console.log("SUCCESS!");

  const fs = require('fs');
  fs.writeFileSync('gitcmd-output.txt', "Success push");
} catch (error) {
  console.error("GIT ERROR OCCURRED!");
  console.error(error.message);
  console.error(error.stdout ? error.stdout.toString() : '');
  console.error(error.stderr ? error.stderr.toString() : '');
  const fs = require('fs');
  fs.writeFileSync('gitcmd-output.txt', `Error: ${error.message}\n${error.stderr ? error.stderr.toString() : ''}`);
}
