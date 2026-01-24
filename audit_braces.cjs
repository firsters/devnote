const fs = require('fs');
const content = fs.readFileSync('src/App.jsx', 'utf8');

function audit() {
  let i = 0;
  let lineNum = 1;
  let balance = 0;
  let stack = [];
  let inString = false;
  let quote = '';
  let inComment = false;
  let commentType = '';
  
  while (i < content.length) {
    const c = content[i];
    const next = content[i+1];
    
    if (inComment) {
      if (commentType === '//' && c === '\n') { inComment = false; lineNum++; }
      else if (commentType === '/*' && c === '*' && next === '/') { inComment = false; i++; }
      else if (c === '\n') lineNum++;
      i++;
      continue;
    }
    
    if (inString) {
      if (c === quote && content[i-1] !== '\\') inString = false;
      if (c === '\n') lineNum++;
      i++;
      continue;
    }
    
    if (c === '/' && next === '/') { inComment = true; commentType = '//'; i += 2; continue; }
    if (c === '/' && next === '*') { inComment = true; commentType = '/*'; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') { inString = true; quote = c; i++; continue; }
    
    // Very rough regex handle: skip if / is followed by something and not preceded by alphanumeric
    if (c === '/' && i > 0 && !/[a-zA-Z0-9_$)]/.test(content[i-1])) {
        i++;
        while (i < content.length && !(content[i] === '/' && content[i-1] !== '\\')) {
            if (content[i] === '\n') lineNum++;
            i++;
        }
        i++;
        continue;
    }

    if (c === '{') {
      balance++;
      stack.push({ line: lineNum, char: c });
    } else if (c === '}') {
      balance--;
      if (balance < 0) {
        console.log(`EXTRA } FOUND at line ${lineNum}`);
        const lines = content.split('\n');
        console.log('Line content:', lines[lineNum-1]);
        balance = 0; // Reset to find more
      } else {
        stack.pop();
      }
    } else if (c === '\n') {
      lineNum++;
    }
    i++;
  }
  
  if (stack.length > 0) {
    console.log('UNCLOSED { found at lines:', stack.map(s => s.line).join(', '));
  }
  console.log('Final stack size:', stack.length);
}

audit();
