const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace indigo with emerald
content = content.replace(/indigo/g, 'emerald');

// Replace violet with teal
content = content.replace(/violet/g, 'teal');

fs.writeFileSync('src/App.tsx', content);
console.log('Done');
