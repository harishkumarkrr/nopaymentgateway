const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Backgrounds
content = content.replace(/bg-\[#09090b\]/g, 'bg-white');
content = content.replace(/bg-\[#050505\]/g, 'bg-white');
content = content.replace(/bg-\[#0c0c0e\]/g, 'bg-zinc-50');
content = content.replace(/bg-zinc-900\/50/g, 'bg-white');
content = content.replace(/bg-zinc-900/g, 'bg-white');
content = content.replace(/bg-black\/40/g, 'bg-white');
content = content.replace(/bg-black\/20/g, 'bg-zinc-50');
content = content.replace(/bg-white\/5/g, 'bg-black/5');
content = content.replace(/bg-white\/10/g, 'bg-black/10');
content = content.replace(/bg-white\/20/g, 'bg-black/20');

// Borders
content = content.replace(/border-white\/10/g, 'border-black/10');
content = content.replace(/border-white\/5/g, 'border-black/5');
content = content.replace(/border-white\/20/g, 'border-black/20');

// Text colors
content = content.replace(/text-white/g, 'text-zinc-900');
content = content.replace(/text-zinc-200/g, 'text-zinc-800');
content = content.replace(/text-zinc-300/g, 'text-zinc-600');
content = content.replace(/text-zinc-400/g, 'text-zinc-500');

// Specific fixes for buttons that should stay white text
content = content.replace(/bg-indigo-600 text-zinc-900/g, 'bg-indigo-600 text-white');
content = content.replace(/bg-indigo-600 hover:bg-indigo-500 text-zinc-900/g, 'bg-indigo-600 hover:bg-indigo-500 text-white');
content = content.replace(/bg-emerald-500 hover:bg-emerald-600 text-zinc-900/g, 'bg-emerald-500 hover:bg-emerald-600 text-white');
content = content.replace(/text-zinc-900 px-4 py-2 rounded-lg/g, 'text-white px-4 py-2 rounded-lg');
content = content.replace(/text-zinc-900 px-6 py-2.5 rounded-xl/g, 'text-white px-6 py-2.5 rounded-xl');
content = content.replace(/bg-indigo-600 text-white px-4 py-2 rounded-lg/g, 'bg-indigo-600 text-white px-4 py-2 rounded-lg');

fs.writeFileSync('src/App.tsx', content);
console.log('Done');
