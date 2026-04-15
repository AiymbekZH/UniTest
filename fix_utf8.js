const fs = require("fs");
const path = require("path");

const directoryPath = path.join(__dirname, "client", "src");

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

walkSync(directoryPath, function(filePath, stat) {
    if (filePath.endsWith(".jsx")) {
        let content = fs.readFileSync(filePath, "utf8");
        let newContent = content.replace(/<Toaster position="top-right" \/>/g, "");
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, "utf8");
            console.log("Updated", filePath);
        }
    }
});

let langPath = path.join(__dirname, "client", "src", "context", "LanguageContext.jsx");
let langContent = fs.readFileSync(langPath, "utf8");

// Remove the duplicates from LanguageContext
let lines = langContent.split("\n");
let finalLines = [];
let toRemove = [294, 355, 657, 718, 1020, 1081];
lines.forEach((line, index) => {
    let num = index + 1;
    if (!toRemove.includes(num)) {
        finalLines.push(line);
    }
});

fs.writeFileSync(langPath, finalLines.join("\n"), "utf8");
console.log("LanguageContext duplicates removed");

