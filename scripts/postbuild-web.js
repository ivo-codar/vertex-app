const fs   = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'dist', 'index.html');
if (!fs.existsSync(file)) { console.log('dist/index.html not found.'); process.exit(0); }

let html = fs.readFileSync(file, 'utf8');

// ── 1. viewport-fit=cover ─────────────────────────────────────────────────────
html = html.replace(
  /content="width=device-width, initial-scale=1, shrink-to-fit=no"/,
  'content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"'
);

// ── 2. Find ALL vector-icon font files and inject @font-face + preload ────────
const fontDir = path.join(__dirname, '..', 'dist', 'assets',
  'node_modules', '@expo', 'vector-icons', 'build', 'vendor',
  'react-native-vector-icons', 'Fonts');

let fontCSS    = '';
let preloads   = '';

if (fs.existsSync(fontDir)) {
  fs.readdirSync(fontDir).forEach(file => {
    if (!file.endsWith('.ttf')) return;
    const fontPath = `/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/${file}`;
    // derive family name from filename (strip hash)
    const family = file.replace(/\.[a-f0-9]{32}\.ttf$/, '').replace(/\.ttf$/, '');

    fontCSS  += `@font-face{font-family:'${family}';src:url('${fontPath}') format('truetype');font-display:block;}\n`;
    preloads += `<link rel="preload" href="${fontPath}" as="font" type="font/ttf" crossorigin>\n`;
  });
}

// ── 3. Google Fonts — Sora (display), Inter (UI), JetBrains Mono (data) ───────
const googleFonts = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Sora:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Sora:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap">
`;

// ── 4. Mobile CSS + background ────────────────────────────────────────────────
const BG = '#05060B';
const mobileCSS = `
<style id="vertex-mobile">
  ${fontCSS}
  html{background-color:${BG};-webkit-text-size-adjust:100%;}
  body{
    background-color:${BG};
    font-family:'Inter',system-ui,sans-serif;
    padding-top:env(safe-area-inset-top);
    padding-bottom:env(safe-area-inset-bottom);
    padding-left:env(safe-area-inset-left);
    padding-right:env(safe-area-inset-right);
    -webkit-font-smoothing:antialiased;
    -moz-osx-font-smoothing:grayscale;
  }
  #root{background-color:${BG};}
  *{-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;touch-action:manipulation;}
  *{-webkit-user-select:none;user-select:none;}
  input,textarea{-webkit-user-select:text;user-select:text;font-size:16px;}
</style>`;

html = html.replace('</head>', googleFonts + preloads + mobileCSS + '\n</head>');

// ── 4. type="module" — fixes import.meta (Zustand v5 ESM) ─────────────────────
html = html.replace(
  /<script src="([^"]+)" defer><\/script>/g,
  '<script type="module" src="$1"></script>'
);

fs.writeFileSync(file, html);
console.log(`✓ Patched index.html (${Object.keys(fontCSS).length > 0 ? 'fonts+' : ''}viewport+mobile+ESM)`);
