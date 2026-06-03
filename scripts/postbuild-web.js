const fs   = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'dist', 'index.html');
if (!fs.existsSync(file)) { console.log('dist/index.html not found, skipping.'); process.exit(0); }

let html = fs.readFileSync(file, 'utf8');

// 1. viewport-fit=cover — makes safe-area-inset-* work on iPhone
html = html.replace(
  /content="width=device-width, initial-scale=1, shrink-to-fit=no"/,
  'content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"'
);

// 2. Inject mobile CSS after the expo-reset block
const mobileCSS = `
  <style id="vertex-mobile">
    html { background-color:#060D08; -webkit-text-size-adjust:100%; }
    body {
      background-color:#060D08;
      padding-top:env(safe-area-inset-top);
      padding-bottom:env(safe-area-inset-bottom);
      padding-left:env(safe-area-inset-left);
      padding-right:env(safe-area-inset-right);
      -webkit-font-smoothing:antialiased;
    }
    #root { background-color:#060D08; }
    * { -webkit-tap-highlight-color:transparent; -webkit-touch-callout:none; touch-action:manipulation; }
    * { -webkit-user-select:none; user-select:none; }
    input,textarea { -webkit-user-select:text; user-select:text; font-size:16px; }
  </style>`;

html = html.replace('</head>', mobileCSS + '\n</head>');

// 3. type="module" — fixes import.meta error (Zustand v5 ESM)
html = html.replace(
  /<script src="([^"]+)" defer><\/script>/g,
  '<script type="module" src="$1"></script>'
);

fs.writeFileSync(file, html);
console.log('✓ Patched dist/index.html (viewport-fit, safe-areas, mobile CSS, ESM)');
