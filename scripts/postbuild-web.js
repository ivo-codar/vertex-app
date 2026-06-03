const fs   = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'dist', 'index.html');
if (!fs.existsSync(file)) { console.log('dist/index.html not found, skipping.'); process.exit(0); }

let html = fs.readFileSync(file, 'utf8');

// 1. Add background color so no white flash
html = html.replace(
  /(html,?\s*\n\s*body\s*\{)/,
  'html, body {'
);
html = html.replace(
  /html,\s*body\s*\{/,
  'html, body {\n        background-color: #060D08;'
);
html = html.replace(
  /#root\s*\{/,
  '#root {\n        background-color: #060D08;'
);

// 2. Add type="module" to script tags — fixes "import.meta outside a module" error
//    (Zustand v5 uses ESM syntax; loading as a module fixes this)
html = html.replace(
  /<script src="([^"]+)" defer><\/script>/g,
  '<script type="module" src="$1"></script>'
);

fs.writeFileSync(file, html);
console.log('✓ Patched dist/index.html');
