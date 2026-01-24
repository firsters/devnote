const fs = require('fs');
const content = fs.readFileSync('src/App.jsx', 'utf8');

// Simplistic JS parser to remove non-structural content
function strip(js) {
  let output = '';
  let i = 0;
  while (i < js.length) {
    if (js[i] === '/' && js[i+1] === '/') { // Line comment
      while (i < js.length && js[i] !== '\n') i++;
    } else if (js[i] === '/' && js[i+1] === '*') { // Block comment
      i += 2;
      while (i < js.length && !(js[i] === '*' && js[i+1] === '/')) i++;
      i += 2;
    } else if (js[i] === '"' || js[i] === "'" || js[i] === '`') { // String
      const quote = js[i];
      output += '""';
      i++;
      while (i < js.length && !(js[i] === quote && js[i-1] !== '\\')) i++;
      i++;
    } else if (js[i] === '/' && js[i-1] !== '\\' && !/[a-zA-Z0-9_$)]/.test(js[i-1] || '')) { // Likely Regex
        // This is a rough heuristic for regex literals
        i++;
        while (i < js.length && !(js[i] === '/' && js[i-1] !== '\\')) i++;
        i++;
    } else {
      output += js[i];
      i++;
    }
  }
  return output;
}

const clean = strip(content);
let balance = 0;
let stack = [];
const lines = content.split('\n');

let cleanIdx = 0;
for (let i = 0; i < content.length; i++) {
    // Re-calculating with line numbers is hard if we only have clean
}

// Just count braces in clean
let opens = (clean.match(/\{/g) || []).length;
let closes = (clean.match(/\}/g) || []).length;

console.log('Open {:', opens);
console.log('Close }:', closes);

if (opens !== closes) {
    console.log('IMBALANCE DETECTED!');
    // Find the first mismatch
    let b = 0;
    for (let i = 0; i < clean.length; i++) {
        if (clean[i] === '{') b++;
        else if (clean[i] === '}') b--;
        if (b < 0) {
            console.log('First extra } around:', clean.substring(i-20, i+20));
            break;
        }
    }
} else {
    console.log('Balance correct.');
}
