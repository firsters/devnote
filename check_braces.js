const fs = require('fs');
const content = fs.readFileSync('src/App.jsx', 'utf8');
let balance = 0;
let inString = false;
let quote = '';
let inComment = false;
let commentType = '';
let stack = [];

for (let i = 0; i < content.length; i++) {
  const c = content[i];
  const next = content[i + 1];
  
  if (inComment) {
    if (commentType === '//' && c === '\n') inComment = false;
    else if (commentType === '/*' && c === '*' && next === '/') { inComment = false; i++; }
    continue;
  }
  
  if (inString) {
    if (c === quote && content[i - 1] !== '\\') inString = false;
    continue;
  }
  
  if (c === '/' && next === '/') { inComment = true; commentType = '//'; i++; continue; }
  if (c === '/' && next === '*') { inComment = true; commentType = '/*'; i++; continue; }
  if (c === '"' || c === "'" || c === '`') { inString = true; quote = c; continue; }
  
  if (c === '{') {
    balance++;
    stack.push(content.substring(0, i).split('\n').length);
  } else if (c === '}') {
    balance--;
    stack.pop();
    if (balance < 0) {
      console.log('Extra } at line', content.substring(0, i).split('\n').length);
      console.log('Context:', content.substring(i - 20, i + 20));
      process.exit(1);
    }
  }
}

if (balance > 0) {
  console.log('Unclosed { at lines:', stack.join(', '));
} else {
  console.log('Balance correct:', balance);
}
