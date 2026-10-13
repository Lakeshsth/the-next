// split.js – splits your single HTML file into Next.js-ready pieces.
// Usage: node split.js legacy/thenext-red.html
const fs = require('fs');

const file = process.argv[2];
if (!file) { console.error('Usage: node split.js <your-file.html>'); process.exit(1); }
const src = fs.readFileSync(file, 'utf8');

// 1) CSS -> app/globals.css
const css = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1].trim()).join('\n\n');

// 2) Inline scripts (the ones without src="") -> public/js/part1.js, part2.js ...
const scripts = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1].trim());

// 3) Page markup (everything inside <body>, minus <script> tags) -> app/body.ts
const body = src.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1]
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .trim();

fs.mkdirSync('public/js', { recursive: true });
fs.writeFileSync('app/globals.css', css + '\n');
fs.writeFileSync('app/body.ts', 'const body = ' + JSON.stringify(body) + ';\nexport default body;\n');
scripts.forEach((code, i) => fs.writeFileSync(`public/js/part${i + 1}.js`, code + '\n'));

console.log(`Done. CSS ${css.length} chars, body ${body.length} chars, ${scripts.length} script files.`);